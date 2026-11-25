# HIL 2026 — App iOS (iPhone e iPad)

App nativa minimale in Swift: una `WKWebView` a tutto schermo che serve il gioco dagli asset
dell'app tramite un gestore di schema (`AssetSchemeHandler`, origine `hil://app/`), quindi
`fetch`, moduli ES, `localStorage`, WebGL 2 e audio funzionano come nel browser.
È l'equivalente dell'APK Android in `deploy/android`.

Il gioco **non è duplicato** qui: a ogni build lo script `scripts/sync-web.py` copia dalla radice
del repository `index.html`, `src/` e `assets/` nella cartella `web/` dell'app (solo i file cambiati).

Gli asset non vanno nell'app così come sono: `tools/bundle_assets.py` (lanciato dalla build, serve Python
con Pillow) ne prepara in `deploy/bundle-assets/` una copia alleggerita, senza le foto originali dei
palazzetti e dei roster e coi file inutilizzati esclusi, con le texture ricompresse. Con
`pip install imagequant` riduce anche i PNG a 256 colori; con `ffmpeg` nel PATH porta la musica a 128 kbps.
Se lo script non riesce si copiano gli asset originali.

## Requisiti

- Un **Mac** con **Xcode** (15 o successivo): le app iOS si compilano solo su macOS
- **XcodeGen**, che genera il progetto Xcode da `project.yml`: `brew install xcodegen`
- Per installare su un iPhone o un iPad: un Apple ID (gratuito, l'app scade dopo 7 giorni) oppure
  l'**Apple Developer Program** (99 €/anno, necessario per TestFlight e App Store)
- iOS / iPadOS **15** o successivo (serve WebGL 2)

## Build

```bash
cd deploy/ios
xcodegen generate          # crea HIL2026.xcodeproj (oppure, dalla radice: npm run ios:project)
open HIL2026.xcodeproj
```

In Xcode: target *HIL2026* › *Signing & Capabilities* › scegli il **Team**, collega il dispositivo
(o scegli un simulatore) e premi **Run**. Per non doverlo riscegliere a ogni `xcodegen generate`,
scrivi il Team ID in `project.yml` (`DEVELOPMENT_TEAM`).

`HIL2026.xcodeproj` è generato: non va modificato a mano né messo nel repository (è nel `.gitignore`).
Per cambiare impostazioni del progetto modifica `project.yml` e rigeneralo.

### Da riga di comando (npm)

Dalla radice del repository, sul Mac (lo script `xcode-run.js` rigenera ogni volta il progetto):

```bash
npm run ios            # build di debug per il simulatore (non serve un account Apple)
npm run ios:run        # build, avvia il simulatore e ci lancia l'app
npm run ios:device     # build di debug per iPhone/iPad, firmata
npm run ios:archive    # archivio di release: build/HIL2026.xcarchive (poi Xcode › Organizer)
npm run ios:ipa        # archivio + .ipa in build/ipa
npm run ios:project    # solo genera HIL2026.xcodeproj
npm run ios:open       # genera il progetto e lo apre in Xcode
npm run ios:clean      # cancella build/
```

Variabili d'ambiente:

- `HIL_IOS_TEAM`: Team ID per la firma (`device`, `archive`, `ipa`), in alternativa a `DEVELOPMENT_TEAM`
  in `project.yml`. Es.: `HIL_IOS_TEAM=AB12CD34EF npm run ios:ipa`
- `HIL_IOS_EXPORT`: tipo di `.ipa`, `app-store-connect` (default), `release-testing` (ad hoc),
  `debugging` (sviluppo) o `enterprise`
- `HIL_IOS_SIMULATOR`: simulatore per `ios:run` (es. `"iPhone 16"`); di default quello già acceso o
  l'iPhone più recente

Su Windows e Linux gli script si fermano con un messaggio: le app iOS si compilano solo su macOS.

## Versione offline

Come per Android, la prima build scarica in `vendor/` Phaser 3.60, Tailwind (Play CDN 3.4.17) e i
font Google (Montserrat, Oswald) e nella copia di `index.html` dentro l'app i link ai CDN puntano alle
copie locali: l'app gira senza rete. Three.js è già nel repository (`src/vendor/three.min.js`).
Con `HIL_OFFLINE=0` (variabile d'ambiente della build) l'app usa i CDN. Senza rete al primo build lo
script avvisa e prosegue con i CDN. Per riscaricare le librerie basta cancellare `vendor/`.

## Pubblicazione

*Product › Archive*, poi dall'Organizer *Distribute App* (TestFlight o App Store).
Prima della prima pubblicazione:

- crea l'app su App Store Connect con il bundle ID `it.hil2026.game` (o cambialo in `project.yml`);
- versione e build in `project.yml` (`MARKETING_VERSION`, `CURRENT_PROJECT_VERSION`): la build va
  aumentata a ogni caricamento;
- il manifest della privacy (`HIL2026/PrivacyInfo.xcprivacy`) dichiara nessun tracciamento e nessun dato
  raccolto. Se aggiungi analitiche, pubblicità o login va aggiornato.

## Comportamento dell'app

- Tutto schermo (niente barra di stato, indicatore Home nascosto), schermo sempre acceso in primo piano.
- Orizzontale e verticale su iPhone (non capovolto), tutte le rotazioni su iPad, sempre a tutto schermo.
- **Comandi**: touch (comandi a schermo del gioco), tastiera fisica (anche su iPad) e controller
  MFi / Xbox / PlayStation tramite la Gamepad API di WebKit (`src/input/Gamepad.js`).
- **Audio**: categoria *ambient*, cioè rispetta l'interruttore silenzioso come la maggior parte dei giochi.
  In background (tasto Home) la partita va in pausa e l'audio si sospende.
- **Telecronaca**: usa la sintesi vocale di WebKit (`speechSynthesis`), con le voci installate in
  *Impostazioni › Accessibilità › Contenuti letti ad alta voce › Voci*.
- I link esterni si aprono in Safari.
- Le squadre (`src/data/teams.json`) arrivano alla pagina già pronte (`window.HIL_TEAMS_DATA`): la lettura
  sincrona di `teams-loader.js` non passa dal gestore degli asset della WebView.
- Se il sistema chiude la pagina per memoria, l'app la ricarica da sola.
- Nella build di debug la pagina si ispeziona da Safari sul Mac (*Sviluppo › nome del dispositivo*).

## Dimensioni

Il gioco pesa circa 140 MB, sotto i 200 MB oltre i quali iOS chiede conferma prima di scaricare
un'app con i dati cellulari. Se gli asset crescono molto, valuta gli On-Demand Resources o Background Assets.

## Apple TV

tvOS non ha WebKit né WKWebView: questa app non può girare su Apple TV.
