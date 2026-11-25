# Lingue dell'interfaccia (italiano / inglese)

Il gioco è scritto in italiano: il testo italiano resta nel codice e fa da **chiave** del dizionario inglese.

- `src/i18n/i18n.js` — motore: lingua attiva, `_t()`, traduzione automatica della pagina, cambio lingua.
- `src/i18n/en/*.js` — dizionari inglesi, uno per area (`I18N.add('en', { 'frase italiana': 'English text' })`):
  `ui.js` (presentazione partita, livelli, lingua), `markup.js` (HTML di index.html), `game.js` (script di
  index.html), `data.js` (palazzetti, fun facts, nazioni), `competition.js`, `manager.js`, `misc.js` (il resto di src/).

Lingua al primo avvio: quella del dispositivo (`it*` → italiano, altrimenti inglese); poi quella scelta in
Opzioni › Lingua (salvata in `localStorage['hil_lang']`). Cambiando lingua dei menu cambia anche quella della
telecronaca (`src/audio/commentaryPhrases.js` è già bilingue), che resta modificabile a parte.

## Regole per chi aggiunge testi

1. **Testo fisso** (nell'HTML, oppure messo con `textContent`/`innerHTML` così com'è): basta aggiungere la voce al
   dizionario. Lo traduce da solo l'osservatore della pagina, confrontando il testo di ogni nodo (spazi compattati)
   con le chiavi; vale anche per gli attributi `title`, `aria-label`, `placeholder`, `alt`, `data-tag`.
   Se il testo contiene tag (`<b>…</b>`), ogni pezzo di testo fra i tag è una voce a sé.
2. **Testo con parti variabili**: `_t('Gol di {0} al {1}', nome, minuto)` oppure `_t('Gol di {name}', { name })`,
   e nel dizionario la stessa chiave con gli stessi segnaposto: `'Gol di {0} al {1}': 'Goal by {0} at {1}'`.
3. **Testo disegnato su canvas, letto dal codice, o passato a una libreria**: sempre `_t()` nel momento in cui si
   usa (non quando si carica lo script: la lingua può cambiare dopo).
4. **Ordinali**: `I18N.ord(n)` → `1°` / `1st`. **Date e numeri**: `toLocaleDateString(I18N.locale)`.
5. **Non tradurre**: nomi di squadre, giocatori, palazzetti, città, competizioni (`Serie A`, `Coppa Italia`,
   `Ligue Élite`, `Liga Élite`, `Hockey Manager`). Dove li si inserisce nella pagina conviene `translate="no"`.
6. Valori usati come identificativi o confrontati nel codice (`if (label === 'Casa')`) non vanno passati a `_t()`.
7. Al cambio lingua parte l'evento `hil:lang` sulla finestra: le schermate aperte con testi composti
   (`_t()` con variabili) lo ascoltano per ridisegnarsi.

## Glossario (inglese americano, tono da videogioco sportivo, frasi brevi)

| Italiano | English |
|---|---|
| Partita rapida / Amichevole / Rivincita | Quick Match / Friendly / Rematch |
| Competizione / Stagione / Carriera | Competition / Season / Career |
| Palazzetto | Arena |
| Pista | Rink |
| Balaustre | Boards |
| Casa / Ospiti | Home / Away |
| Squadra / Società | Team / Club |
| Linea (1ª, 2ª, 3ª) | Line (1st, 2nd, 3rd) |
| Portiere / Difensore / Attaccante / Giocatore di movimento | Goalie / Defenseman / Forward / Skater |
| Centro / Ala sinistra / Ala destra (C, AS/LW, AD/RW, D) | Center / Left wing / Right wing (C, LW, RW, D) |
| Allenatore / Panchina / Magazziniere | Coach / Bench / Equipment manager |
| Periodo / Supplementare / Golden goal / Rigori | Period / Overtime / Golden goal / Shootout |
| Ingaggio | Faceoff |
| Tiro / Parata / Passaggio / Carica (body check) | Shot / Save / Pass / Body check |
| Penalità / Panca puniti / Superiorità / Inferiorità numerica | Penalty / Penalty box / Power play / Shorthanded |
| Cambio linea | Line change |
| Regular season / Girone all'italiana con andata e ritorno | Regular season / Double round-robin |
| Classifica / Giornata / Calendario | Standings / Matchday / Schedule |
| Play-off / Play-out salvezza / Retrocessione / Promozione | Playoffs / Relegation play-out / Relegation / Promotion |
| Al meglio delle 3 | Best of 3 |
| Quarti / Semifinali / Finale | Quarterfinals / Semifinals / Final |
| Scudetto | Italian title (lo scudetto: "Scudetto" solo se serve il colore locale) |
| Vittoria / Sconfitta / Pareggio | Win / Loss / Draw (classifica: W / L / D) |
| Gol / Assist / Punti | Goals / Assists / Points (G / A / PTS) |
| Telecronaca / Telecronista | Commentary / Commentator |
| Opzioni / Impostazioni / Comandi | Options / Settings / Controls |
| Indietro / Avanti / Conferma / Annulla | Back / Next / Confirm / Cancel |
| Torna al menu | Back to menu |
| Scendi in pista | Hit the rink |
| Livello di difficoltà / Facile / Normale / Difficile | Difficulty / Easy / Normal / Hard |
| Grafica (Bassa / Media / Alta) | Graphics (Low / Medium / High) |
| Telecamera | Camera |
| Pubblico / Tifosi | Crowd / Fans |
| Mercato / Ingaggio (contratto) / Budget | Transfer market / Contract / Budget |
