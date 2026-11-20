// Lancia il Gradle wrapper del progetto Android da qualsiasi sistema (usato dagli script npm).
// Uso: node deploy/android/gradle-run.js assembleDebug [altri argomenti gradle]
const { spawnSync } = require('child_process');
const path = require('path');

const dir = __dirname;
const isWin = process.platform === 'win32';
const args = process.argv.slice(2);
if (!args.length) args.push('assembleDebug');

// L'Android Gradle Plugin vuole JDK 17+. Ordine: HIL_JAVA_HOME, JAVA_HOME se già ≥ 17,
// JDK di Android Studio, poi il JDK più recente (≥ 17) trovato nelle cartelle di installazione tipiche.
const fs = require('fs');
const env = { ...process.env };

function jdkMajor(home) {
    try {
        const m = fs.readFileSync(path.join(home, 'release'), 'utf8').match(/JAVA_VERSION="(\d+)(?:\.(\d+))?/);
        if (!m) return 0;
        return m[1] === '1' ? Number(m[2]) : Number(m[1]);   // "1.8.0" → 8
    } catch (e) { return 0; }
}
function findJdk() {
    if (process.env.HIL_JAVA_HOME) return process.env.HIL_JAVA_HOME;
    if (process.env.JAVA_HOME && jdkMajor(process.env.JAVA_HOME) >= 17) return null;   // va già bene
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const home = process.env.USERPROFILE || process.env.HOME || '';
    const direct = [
        path.join(pf, 'Android', 'Android Studio', 'jbr'),
        process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Android Studio', 'jbr'),
        '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
        '/opt/android-studio/jbr'
    ];
    const roots = isWin
        ? ['Java', 'Eclipse Adoptium', 'Microsoft', 'OpenJDK', 'Zulu', 'Amazon Corretto', 'BellSoft', path.join('Android', 'openjdk'), path.join('Android', 'jdk')]
            .flatMap(r => [path.join(pf, r), path.join(pf86, r)]).concat(path.join(home, '.jdks'))
        : ['/usr/lib/jvm', '/Library/Java/JavaVirtualMachines', path.join(home, '.jdks')];
    const candidates = direct.filter(Boolean);
    roots.forEach(r => {
        try {
            fs.readdirSync(r).forEach(d => {
                candidates.push(path.join(r, d));
                candidates.push(path.join(r, d, 'Contents', 'Home'));   // macOS
            });
        } catch (e) { /* cartella assente */ }
    });
    const ok = candidates.map(p => ({ p, v: jdkMajor(p) })).filter(c => c.v >= 17).sort((a, b) => b.v - a.v);
    return ok.length ? ok[0].p : null;
}
const jdk = findJdk();
if (jdk) {
    env.JAVA_HOME = jdk;
    console.log('JDK: ' + jdk);
}

// Android SDK: se non c'è local.properties né ANDROID_HOME, prova le cartelle standard
if (!fs.existsSync(path.join(dir, 'local.properties')) && !env.ANDROID_HOME && !env.ANDROID_SDK_ROOT) {
    const home = process.env.USERPROFILE || process.env.HOME || '';
    const sdk = [
        process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
        path.join(home, 'Library', 'Android', 'sdk'),
        path.join(home, 'Android', 'Sdk')
    ].find(p => p && fs.existsSync(path.join(p, 'platforms')));
    if (sdk) {
        env.ANDROID_HOME = sdk;
        console.log('Android SDK: ' + sdk);
    } else {
        console.error('\nAndroid SDK non trovato: installa Android Studio (o i command-line tools) oppure\n' +
            'imposta ANDROID_HOME, o scrivi sdk.dir=... in deploy/android/local.properties.\n');
    }
}

const res = isWin
    ? spawnSync('cmd.exe', ['/c', path.join(dir, 'gradlew.bat'), ...args], { cwd: dir, stdio: 'inherit', env })
    : spawnSync(path.join(dir, 'gradlew'), args, { cwd: dir, stdio: 'inherit', env });

if (res.error) {
    console.error('Impossibile avviare Gradle:', res.error.message);
    process.exit(1);
}
if (res.status === 0 && args.some(a => /^assemble/.test(a))) {
    const type = args.some(a => /Release$/.test(a)) ? 'release' : 'debug';
    console.log('\nAPK in ' + path.join(dir, 'app', 'build', 'outputs', 'apk', type));
}
process.exit(res.status === null ? 1 : res.status);
