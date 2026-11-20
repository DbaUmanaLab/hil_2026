# HIL 2026 — APK Android

App Android nativa minimale: una WebView a tutto schermo che serve il gioco dagli asset
dell'APK tramite `WebViewAssetLoader` (origine `https://appassets.androidplatform.net/`),
quindi `fetch`, `XMLHttpRequest`, `localStorage`, WebGL e audio funzionano come nel browser.

Il gioco **non è duplicato** qui: a ogni build Gradle copia dalla radice del repository
`index.html`, `src/` e `assets/` dentro `app/build/generated/hilweb/web/`.
Basta quindi rifare la build per avere nell'APK l'ultima versione del gioco.

## Versione offline

Con `hil.offline=true` (default, in `gradle.properties`) la prima build scarica in `vendor/`
Phaser 3.60, Tailwind (Play CDN 3.4.17) e i font Google (Montserrat, Oswald),
e nella copia di `index.html` dentro l'APK i link ai CDN vengono sostituiti con quelli locali.
Three.js non passa da `vendor/`: è già nel repository (`src/vendor/three.min.js`, generato con
`npm run build:three`) e finisce nell'APK insieme al resto di `src/`.
L'`index.html` del repository non viene toccato. Con `hil.offline=false` l'APK carica le librerie
dai CDN e serve la rete.

`vendor/` è nel `.gitignore`: per riscaricare le librerie basta cancellarla.

## Requisiti

- Android Studio (Ladybug o successivo): include JDK 17 e Android SDK
- oppure da riga di comando: JDK 17 e Android SDK 35, con `sdk.dir` in `local.properties`
  o la variabile `ANDROID_HOME`

## Build

**Android Studio**: *File › Open* sulla cartella `deploy/android`, attendi il Gradle sync,
poi *Build › Build App Bundle(s) / APK(s) › Build APK(s)*.

**Riga di comando** (da `deploy/android`):

```powershell
.\gradlew.bat assembleDebug      # APK di debug, installabile subito
.\gradlew.bat assembleRelease    # APK di release (firmato se c'è keystore.properties)
```

Oppure dalla radice del repository con npm (funziona su Windows, macOS e Linux):

```powershell
npm run apk            # assembleDebug
npm run apk:release    # assembleRelease
npm run apk:install    # installDebug sul telefono collegato
npm run apk:clean      # clean
```

Gli script npm usano da soli il JDK incluso in Android Studio, se è installato nel percorso
standard; altrimenti puoi indicare un JDK 17+ con la variabile `HIL_JAVA_HOME`.

Gli APK finiscono in `app/build/outputs/apk/debug/` e `app/build/outputs/apk/release/`.
Per installare su un telefono collegato via USB: `.\gradlew.bat installDebug`.

## Firma della release

1. Crea una chiave (una volta sola, e conservala: senza non puoi aggiornare l'app):
   ```powershell
   keytool -genkeypair -v -keystore hil2026.jks -alias hil2026 -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Crea `deploy/android/keystore.properties` (è nel `.gitignore`):
   ```properties
   storeFile=hil2026.jks
   storePassword=...
   keyAlias=hil2026
   keyPassword=...
   ```

## Comportamento dell'app

- Tutto schermo immersivo, schermo sempre acceso, rotazione libera (rispetta il blocco rotazione).
- **Indietro** = tasto Esc del gioco (pausa / chiudi menu); due volte entro 2 secondi per uscire.
- I link esterni si aprono nel browser di sistema.
- Icona: il badge del gioco (`assets/logos/game badge.png`) su fondo bianco.
- Nella build di debug la WebView si può ispezionare da `chrome://inspect` sul PC.

## Dimensioni

Gli asset del gioco pesano circa 125 MB, quindi l'APK sarà di quella taglia: va bene per
l'installazione diretta. Per Google Play (limite di 200 MB per l'AAB base) usa
`bundleRelease` e, se gli asset crescono, valuta Play Asset Delivery.
