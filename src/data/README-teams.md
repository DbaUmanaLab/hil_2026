# Squadre e leghe: `src/data/teams.json`

Tutti i dati delle squadre stanno in **`src/data/teams.json`**. Il gioco lo legge all'avvio
(`src/data/teams-loader.js`), quindi per aggiungere o modificare una squadra basta questo file
più le immagini. Il gioco va aperto con `npm start`: aperto con doppio clic su `index.html`
il file non si può leggere.

## Aggiungere una squadra

1. Metti le immagini:
   - logo: `assets/logos/<id>.png`
   - maglie: `assets/jerseys/<id>_1.png` (prima divisa), `<id>_2.png` (seconda), 432×578 trasparenti
   - foto della schermata roster: `assets/rosters_backgrounds/strip/<id>.jpg` (circa 1350×1000)
2. Copia in `teams` il blocco di una squadra simile e cambia i campi qui sotto.
   L'ordine nell'elenco è l'ordine di scelta nel menu.

| Campo | Cosa contiene |
|---|---|
| `id` | identificativo unico, minuscolo e senza spazi (es. `asiago_newts`) |
| `league` | uno degli `id` in `leagues` (`SERIE A`, `SERIE B`, `UISP`, `LIGUE ELITE`, `RFEP`). Solo le squadre `SERIE A` entrano in campionato, Coppa Italia e Hockey Manager |
| `name`, `shortName`, `abbr` | nome completo, nome breve, sigla di 3 lettere per il tabellone |
| `jerseyClubId` | di solito uguale a `id` (diverso solo se usa le maglie di un altro club, come il Pike) |
| `homeArena` | palazzetto di casa: `cittadella`, `vicenza`, `milano`, `asiago`, `cus_verona`, `forli`, `fox_legnaro`, `edera_trieste`, `kraken_camaiore`, `villeneuve`, `roma`, `treviso`, `novi`, `empoli`, `time42`, `molina` |
| `logo` | nome del file in `assets/logos/` |
| `logoOnScoreboard` | `png` usa il logo anche sul tabellone 3D (per le squadre nuove lascia `png`) |
| `jerseys` | immagini delle maglie, una per divisa, nello stesso ordine di `kits` |
| `ratings` | `off`, `def`, `goa` da 0 a 100 (attacco, difesa, portiere) |
| `colors` | `primary`/`secondary`: colori della squadra nelle schermate. `staffJacket`/`coachJacket`: giacche di magazziniere e allenatore in panchina |
| `rosterScreen` | `photo` (file in `assets/rosters_backgrounds/strip/`) e `focus` (punto da tenere al centro, es. `"50% 30%"`) |
| `coach` | `{ "first", "last", "role", "note" }`, oppure `null` |
| `goalie`, `backupGoalies` | `{ "num", "name", "first" }`. Il cognome va in MAIUSCOLO |
| `lines` | 3 linee da 4 giocatori, nell'ordine C, LW, RW, D: `{ "role", "num", "name", "first", "g", "a", "pts" }` |
| `reserves` | riserve: `{ "num", "name", "first" }` |
| `kits` | divise: `{ "label", "primary", "pants", "helmet", "glove" }`, colori come `"#rrggbb"` |

Le linee devono essere 3 con 4 giocatori ciascuna: se mancano giocatori di movimento, uno può
comparire in due linee (come Edoardo Rigoni negli Asiago Black-Out).

## Aggiungere una lega

Aggiungi un elemento in `leagues`: `id` (es. `"SERIE C"`), `name`, `federation`, `badge`
(scritta del menu, es. `"Serie C • FISR"`) e `rosterLabel` (scritta della schermata roster).
Comparirà da sola nel filtro delle leghe delle amichevoli.

## Controllo veloce

Dopo una modifica ricarica la pagina. Se il JSON ha un errore (una virgola di troppo, una
parentesi mancante) il gioco mostra un messaggio invece del menu: la console del browser indica
la riga sbagliata.
