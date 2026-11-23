// Compila l'app iOS da riga di comando (usato dagli script npm). Funziona solo su macOS con Xcode.
// Uso: node deploy/ios/xcode-run.js <comando>
//
//   project   genera HIL2026.xcodeproj da project.yml (XcodeGen)
//   open      genera il progetto e lo apre in Xcode
//   build     build di debug per il simulatore (niente firma: va bene anche senza account Apple)   [default]
//   run       build per il simulatore, poi lo avvia e ci lancia l'app
//   device    build di debug per iPhone/iPad (firmata con il tuo Team)
//   archive   archivio di release (build/HIL2026.xcarchive), da distribuire con l'Organizer di Xcode
//   ipa       archivio + esportazione dell'.ipa in build/ipa
//   clean     cancella build/
//
// Variabili d'ambiente:
//   HIL_IOS_TEAM        Team ID Apple Developer (10 caratteri) per la firma; se manca si usa quello di project.yml
//   HIL_IOS_EXPORT      metodo di esportazione dell'.ipa: app-store-connect (default), release-testing
//                       (ad hoc), debugging (sviluppo), enterprise
//   HIL_IOS_SIMULATOR   nome del simulatore per "run" (es. "iPhone 16"); default: quello acceso o l'iPhone più recente
//   HIL_OFFLINE=0       l'app usa le librerie dai CDN invece delle copie offline (vedi scripts/sync-web.py)
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const PROJECT = path.join(dir, 'HIL2026.xcodeproj');
const SCHEME = 'HIL2026';
const BUNDLE_ID = 'it.hil2026.game';
const BUILD = path.join(dir, 'build');
const DERIVED = path.join(BUILD, 'DerivedData');
const ARCHIVE = path.join(BUILD, 'HIL2026.xcarchive');
const cmd = process.argv[2] || 'build';
const extra = process.argv.slice(3);            // argomenti in più passati a xcodebuild

function fail(msg) {
    console.error('\n' + msg + '\n');
    process.exit(1);
}
function run(bin, args, opts = {}) {
    console.log('> ' + [bin, ...args].map(a => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' '));
    const res = spawnSync(bin, args, { cwd: dir, stdio: opts.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit', encoding: 'utf8' });
    if (res.error) fail(`Impossibile avviare ${bin}: ${res.error.message}`);
    if (res.status !== 0 && !opts.allowFail) process.exit(res.status === null ? 1 : res.status);
    return res;
}
function has(bin) {
    return spawnSync('/usr/bin/which', [bin], { encoding: 'utf8' }).status === 0;
}

if (cmd === 'clean') {
    fs.rmSync(BUILD, { recursive: true, force: true });
    console.log('Cancellata ' + BUILD);
    process.exit(0);
}

if (process.platform !== 'darwin') {
    fail('L\'app iOS si compila solo su un Mac con Xcode (vedi deploy/ios/README.md).\n' +
        'Da Windows o Linux si può solo preparare il progetto: copia il repository su un Mac e lancia lì gli script npm ios:*.');
}
if (!has('xcodebuild')) fail('xcodebuild non trovato: installa Xcode dal Mac App Store e apri Xcode una volta per accettare la licenza.');

// progetto sempre rigenerato da project.yml (è veloce e tiene il .xcodeproj allineato)
if (has('xcodegen')) {
    run('xcodegen', ['generate', '--spec', path.join(dir, 'project.yml'), '--project', dir]);
} else if (!fs.existsSync(PROJECT)) {
    fail('XcodeGen non trovato: installalo con "brew install xcodegen" (genera HIL2026.xcodeproj da project.yml).');
} else {
    console.warn('Attenzione: XcodeGen non trovato, uso l\'HIL2026.xcodeproj già presente (potrebbe non essere aggiornato).');
}
if (cmd === 'project') process.exit(0);
if (cmd === 'open') { run('open', [PROJECT]); process.exit(0); }

const team = process.env.HIL_IOS_TEAM;
const signing = team ? [`DEVELOPMENT_TEAM=${team}`] : [];
// per dispositivo e App Store serve la firma: senza Team xcodebuild si fermerebbe con un errore poco chiaro
if (['device', 'archive', 'ipa'].includes(cmd) && !team &&
    /DEVELOPMENT_TEAM:\s*["']?["']?\s*$/m.test(fs.readFileSync(path.join(dir, 'project.yml'), 'utf8'))) {
    fail('Manca il Team per la firma: imposta HIL_IOS_TEAM=<Team ID> (es. HIL_IOS_TEAM=AB12CD34EF npm run ios:archive)\n' +
        'oppure scrivi DEVELOPMENT_TEAM in deploy/ios/project.yml. Il Team ID è in Xcode › Settings › Accounts\n' +
        'o su developer.apple.com › Account › Membership. Account Apple configurato in Xcode › Settings › Accounts.');
}
const base = ['-project', PROJECT, '-scheme', SCHEME, '-derivedDataPath', DERIVED];

function simulatorBuild() {
    run('xcodebuild', [...base, '-configuration', 'Debug', '-sdk', 'iphonesimulator',
        '-destination', 'generic/platform=iOS Simulator', 'CODE_SIGNING_ALLOWED=NO', ...extra, 'build']);
    return path.join(DERIVED, 'Build', 'Products', 'Debug-iphonesimulator', 'HIL2026.app');
}

// simulatore per "run": quello richiesto, altrimenti uno già acceso, altrimenti l'iPhone del runtime iOS più recente
function pickSimulator() {
    const res = run('xcrun', ['simctl', 'list', 'devices', 'available', '-j'], { capture: true });
    const all = [];
    Object.entries(JSON.parse(res.stdout).devices).forEach(([runtime, list]) => {
        const m = runtime.match(/iOS-(\d+)-(\d+)/);
        if (!m) return;
        list.forEach(d => all.push({ ...d, ver: Number(m[1]) * 100 + Number(m[2]) }));
    });
    const want = process.env.HIL_IOS_SIMULATOR;
    if (want) {
        const d = all.filter(x => x.name === want).sort((a, b) => b.ver - a.ver)[0];
        if (!d) fail(`Simulatore "${want}" non trovato. Disponibili: ${[...new Set(all.map(x => x.name))].join(', ')}`);
        return d;
    }
    return all.find(d => d.state === 'Booted')
        || all.filter(d => /^iPhone/.test(d.name)).sort((a, b) => b.ver - a.ver)[0]
        || fail('Nessun simulatore iOS installato: aggiungilo da Xcode › Settings › Platforms.');
}

switch (cmd) {
    case 'build': {
        const app = simulatorBuild();
        console.log('\nApp per il simulatore: ' + app);
        break;
    }
    case 'run': {
        const app = simulatorBuild();
        const sim = pickSimulator();
        console.log(`\nSimulatore: ${sim.name} (${sim.udid})`);
        if (sim.state !== 'Booted') run('xcrun', ['simctl', 'boot', sim.udid], { allowFail: true });
        run('open', ['-a', 'Simulator', '--args', '-CurrentDeviceUDID', sim.udid], { allowFail: true });
        run('xcrun', ['simctl', 'bootstatus', sim.udid, '-b'], { allowFail: true });
        run('xcrun', ['simctl', 'install', sim.udid, app]);
        run('xcrun', ['simctl', 'launch', sim.udid, BUNDLE_ID]);
        break;
    }
    case 'device': {
        run('xcodebuild', [...base, '-configuration', 'Debug', '-destination', 'generic/platform=iOS',
            '-allowProvisioningUpdates', ...signing, ...extra, 'build']);
        console.log('\nApp per dispositivo in ' + path.join(DERIVED, 'Build', 'Products', 'Debug-iphoneos') +
            '\nPer installarla e avviarla su un iPhone collegato usa Xcode (Run) oppure: xcrun devicectl device install app --device <id> <app>');
        break;
    }
    case 'archive':
    case 'ipa': {
        fs.rmSync(ARCHIVE, { recursive: true, force: true });
        run('xcodebuild', [...base, '-configuration', 'Release', '-destination', 'generic/platform=iOS',
            '-archivePath', ARCHIVE, '-allowProvisioningUpdates', ...signing, ...extra, 'archive']);
        console.log('\nArchivio: ' + ARCHIVE);
        if (cmd === 'archive') {
            console.log('Per distribuirlo: Xcode › Window › Organizer › Distribute App (oppure npm run ios:ipa).');
            break;
        }
        const method = process.env.HIL_IOS_EXPORT || 'app-store-connect';
        const plist = path.join(BUILD, 'ExportOptions.plist');
        fs.writeFileSync(plist, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key><string>${method}</string>
    <key>signingStyle</key><string>automatic</string>
    <key>destination</key><string>export</string>${team ? `\n    <key>teamID</key><string>${team}</string>` : ''}
</dict>
</plist>
`);
        const out = path.join(BUILD, 'ipa');
        fs.rmSync(out, { recursive: true, force: true });
        run('xcodebuild', ['-exportArchive', '-archivePath', ARCHIVE, '-exportPath', out,
            '-exportOptionsPlist', plist, '-allowProvisioningUpdates']);
        console.log(`\n.ipa (${method}) in ${out}` +
            (method === 'app-store-connect' ? '\nPer caricarla su App Store Connect: app Transporter, oppure Xcode › Organizer.' : ''));
        break;
    }
    default:
        fail(`Comando sconosciuto: ${cmd}\nComandi: project, open, build, run, device, archive, ipa, clean`);
}
