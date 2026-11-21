// --- src/audio/commentaryPhrases.js ---
// Frasi della telecronaca (script classico, espone window.COMMENTARY_PHRASES).
// Per ogni situazione c'è un elenco di varianti: il motore (src/audio/Commentary.js) ne sceglie
// una a caso evitando quelle usate di recente. Segnaposto tra graffe:
//   {p} cognome del giocatore, {pf} nome e cognome, {n} numero di maglia, {t} sua squadra, {opp} avversaria
//   {p2} secondo giocatore (es. chi ha passato il disco), {g} portiere, {home} {guest} squadre
//   {sh} {sg} punteggio di casa / ospite, {score} punteggio ("2 a 1", "1 pari"), {scoreFull} con la squadra
//   in vantaggio ("2 a 1 per Cittadella"), {lead} squadra in vantaggio, {lo} pronome italiano (lo/la)
//   {o} desinenza italiana del giocatore (o/a), {his} pronome inglese (his/her)
// Per aggiungere varietà basta aggiungere stringhe agli elenchi: niente altro da toccare.
(function () {
    'use strict';

    const it = {
        // ------------------------------------------------------------ presentazione
        'intro.welcome': [
            'Buonasera a tutti gli appassionati di hockey in-line e benvenuti al {arena}!',
            'Benvenuti, amici sportivi: siamo in diretta dal {arena} di {city}.',
            'Eccoci qui, collegati dal {arena}: buonasera da {city}!',
            'Un caloroso saluto a tutti voi, in diretta dal {arena} per una serata di grande hockey.',
            'Bentrovati! La cornice è quella del {arena}, a {city}, e l\'atmosfera è già bollente.',
            'Buonasera e benvenuti! Da {city}, {arena}, comincia la nostra telecronaca.',
            'Ciao a tutti e benvenuti in pista: siamo al {arena}, pronti per una partita tutta da vivere.',
            'Saluti dal {arena}! Luci accese, pubblico sugli spalti: si gioca!'
        ],
        'intro.capacity': [
            'Un impianto da {cap} posti, e stasera si sente il calore del pubblico.',
            '{cap} posti a sedere e una tribuna che non vede l\'ora di cominciare.',
            'Il palazzetto può ospitare {cap} spettatori: tifo assicurato.',
            'Capienza di {cap} posti, e la gente continua ad arrivare.'
        ],
        'intro.match': [
            'Di fronte {home} e {guest}.',
            'Si affrontano {home}, padrona di casa, e {guest}.',
            'La sfida è {home} contro {guest}.',
            '{home} ospita {guest}: sarà una bella battaglia.',
            'In pista {home} e {guest}, due squadre che hanno voglia di vincere.',
            'Stasera va in scena {home} contro {guest}.',
            'Questa sera il match è {home} - {guest}.'
        ],
        'intro.friendly': [
            'È un\'amichevole, ma state certi che nessuno vorrà perdere.',
            'Partita amichevole, ma in pista l\'agonismo non manca mai.',
            'Niente punti in palio stasera, ma l\'orgoglio sì.',
            'Un test amichevole, utile per vedere a che punto sono le due squadre.'
        ],
        'intro.league': [
            'Siamo alla giornata {round} di {rounds} del campionato di {comp}.',
            '{comp}, giornata numero {round}: punti pesanti in palio.',
            'Campionato di {comp}, si gioca la {round}ª giornata su {rounds}.',
            'È la giornata {round} della regular season di {comp}.'
        ],
        'intro.playoff': [
            'Siamo ai play-off di {comp}: si giocano i {stage}.',
            'Play-off di {comp}, {stage}: da qui in poi ogni partita vale doppio.',
            'Clima da play-off: {comp}, {stage}.',
            '{comp}, è tempo di {stage}: chi sbaglia rischia di tornare a casa.'
        ],
        'intro.final': [
            'È la {stage}: il momento più atteso della stagione.',
            'Signore e signori, siamo alla {stage}!',
            'Si gioca la {stage}: più di così non si può chiedere.'
        ],
        'intro.cup': [
            'Coppa Italia, {stage}: gara secca, chi vince passa.',
            'Siamo in Coppa Italia, si giocano i {stage}: dentro o fuori.',
            'Coppa Italia, turno dei {stage}: non ci sono seconde possibilità.'
        ],
        'intro.cupFinal': [
            'È la finale di Coppa Italia: in palio c\'è un trofeo!',
            'Finale di Coppa Italia: sessanta minuti, anzi quaranta, per alzare la coppa.',
            'Si assegna la Coppa Italia: emozioni garantite.'
        ],
        'intro.series': [
            'Nella serie {t} conduce {a} a {b}: siamo a gara {gn}.',
            'Gara {gn} della serie, con {t} avanti {a} a {b}.',
            'La serie dice {t} {a}, {opp} {b}: questa è gara {gn}.'
        ],
        'intro.seriesTied': [
            'La serie è in perfetta parità, {a} a {a}: gara {gn}.',
            'Gara {gn}, serie sul {a} pari: tutto da decidere.',
            'Serie in equilibrio, {a} vittorie a testa: è gara {gn}.'
        ],
        'intro.seriesStart': [
            'È gara 1 della serie: chi parte bene mette subito pressione.',
            'Si apre la serie con gara 1.',
            'Prima partita della serie: c\'è da prendere le misure.'
        ],
        'intro.leader': [
            '{t} si presenta da capolista, con {pts} punti.',
            '{t} guida la classifica con {pts} punti.',
            'In testa alla classifica c\'è proprio {t}, a quota {pts}.'
        ],
        'intro.standing': [
            '{t} è al {ord} posto con {pts} punti.',
            '{t} occupa il {ord} posto in classifica, con {pts} punti.',
            'Classifica alla mano: {t} è {ordf}, a {pts} punti.'
        ],
        'intro.last': [
            '{t} è ultima in classifica e ha un disperato bisogno di punti.',
            'Fanalino di coda per {t}: stasera serve una scossa.'
        ],
        'intro.winStreak': [
            '{t} arriva da {k} vittorie consecutive.',
            'Momento d\'oro per {t}: {k} vittorie di fila.',
            '{t} è in serie positiva: {k} successi consecutivi.',
            'Squadra in fiducia, {t}: ha vinto le ultime {k}.'
        ],
        'intro.loseStreak': [
            '{t} viene da {k} sconfitte di fila e cerca il riscatto.',
            'Periodo complicato per {t}: {k} sconfitte consecutive.',
            '{t} deve invertire la rotta dopo {k} ko consecutivi.'
        ],
        'intro.form': [
            '{t} ha vinto {w} delle ultime {k} partite.',
            'Nelle ultime {k} uscite {t} ha raccolto {w} vittorie.'
        ],
        'intro.favorite': [
            'Sulla carta parte favorita {t}, ma il disco è rotondo... o quasi.',
            'I pronostici dicono {t}, ma la pista ha sempre l\'ultima parola.',
            '{t} è più quotata, {opp} però ha tutte le carte per sorprendere.',
            'Favori del pronostico per {t}. Vedremo se {opp} riuscirà a ribaltarli.'
        ],
        'intro.balanced': [
            'Due squadre molto vicine sulla carta: partita apertissima.',
            'Equilibrio totale nei valori: difficile fare un pronostico.',
            'Valori simili, nessuna favorita: sarà una sfida aperta.',
            'Sulla carta è un testa a testa: tutto può succedere.'
        ],
        'intro.topPlayer': [
            'Occhio in casa {t} a {pf}, numero {n}: {g} gol e {pts} punti in stagione.',
            'L\'uomo da tenere d\'occhio per {t} è {pf}, il numero {n}, con {pts} punti all\'attivo.',
            'Per {t} il riferimento offensivo è {pf}: {g} reti fin qui.',
            '{t} si affida al talento di {pf}, numero {n}, miglior realizzatore della squadra.',
            'Il pericolo pubblico numero uno di {t}? {pf}, {pts} punti in stagione.'
        ],
        'intro.topPlayerNoStats': [
            'Per {t} attenzione a {pf}, numero {n}.',
            'In casa {t} il giocatore da seguire è {pf}.',
            '{t} conta molto sulle giocate di {pf}, il numero {n}.'
        ],
        'intro.goalies': [
            'Tra i pali, {gh} per {home} e {gg} per {guest}.',
            'Da una parte {gh}, dall\'altra {gg}: ecco i due portieri.',
            'Sfida tra portieri: {gh} contro {gg}.',
            'In porta {gh} per i padroni di casa, {gg} per gli ospiti.'
        ],
        'intro.coaches': [
            'In panchina {ch} per {home} e {cg} per {guest}.',
            'Sfida anche tra allenatori: {ch} contro {cg}.',
            'Le panchine sono guidate da {ch} e da {cg}.'
        ],
        'intro.referee': [
            'Dirige l\'incontro {ref}.',
            'Arbitro della partita: {ref}.',
            'Fischietto affidato a {ref}.'
        ],
        'intro.ready': [
            'Squadre in pista, tutto pronto per l\'ingaggio!',
            'Manca solo il fischio d\'inizio. Si comincia!',
            'Ci siamo: il disco sta per cadere al centro della pista.',
            'Mettetevi comodi, si parte!',
            'Tutto pronto: buon divertimento!'
        ],

        // ------------------------------------------------------------ periodi
        'period.start1': [
            'Si parte! Ingaggio al centro della pista.',
            'Comincia il primo periodo!',
            'Via al primo tempo: il disco è in gioco!',
            'Fischio d\'inizio: primo periodo in corso.',
            'Ed è subito battaglia all\'ingaggio: partiti!'
        ],
        'period.start2': [
            'Riprende il gioco: secondo periodo!',
            'Comincia il secondo tempo, punteggio di {scoreFull}.',
            'Squadre di nuovo in pista: secondo periodo, {scoreFull}.',
            'Si riparte! Secondo periodo, {scoreFull}.'
        ],
        'period.startOT': [
            'Supplementare! Golden goal: chi segna vince.',
            'Si va all\'overtime: il primo gol chiude la partita!',
            'Tempo supplementare: un errore e finisce tutto.',
            'Supplementare a golden goal: tenetevi forte!'
        ],
        'period.end1': [
            'Fine del primo periodo: {scoreFull}.',
            'Suona la sirena, si chiude il primo tempo: {scoreFull}.',
            'Primo periodo in archivio: {scoreFull}.',
            'Squadre negli spogliatoi, si va al riposo: {scoreFull}.'
        ],
        'period.endOT': [
            'Finiscono i tempi regolamentari in parità, {score}: sarà supplementare!',
            'Parità al termine del secondo periodo: si va all\'overtime!',
            'Ancora pari, {score}: servirà il supplementare.'
        ],
        'period.shots': [
            'Tiri in porta: {home} {a}, {guest} {b}.',
            'Il conto dei tiri dice {a} a {b} per {lead}.',
            'Statistica dei tiri: {a} per {home}, {b} per {guest}.'
        ],
        'period.lastMinute': [
            'Ultimo minuto di gioco!',
            'Sessanta secondi alla fine!',
            'Entriamo nell\'ultimo minuto del periodo!',
            'Manca un minuto: ora o mai più!'
        ],
        'period.lastMinuteClose': [
            'Ultimo minuto e partita ancora apertissima!',
            'Sessanta secondi, {scoreFull}: tutto ancora in bilico!',
            'Un minuto alla fine e un solo gol di differenza: che finale!'
        ],

        // ------------------------------------------------------------ fine partita
        'final.win': [
            'Finisce qui! {w} batte {l} {score}.',
            'È finita! Vittoria di {w}, {score}.',
            'Triplice fischio: {w} vince {score} contro {l}.',
            'Suona la sirena finale: festa {w}, {score}!',
            'Partita chiusa: {w} porta a casa la vittoria per {score}.'
        ],
        'final.winOT': [
            'Vince {w} al supplementare! {score}.',
            'Golden goal e vittoria per {w}, {score} dopo il supplementare.',
            'Decide l\'overtime: festa {w}!'
        ],
        'final.winSO': [
            'Ai rigori la spunta {w}!',
            'Decidono i tiri di rigore: vince {w}!',
            'Lotteria dei rigori, e a sorridere è {w}!'
        ],
        'final.draw': [
            'Finisce in parità, {score}. Un punto di equilibrio.',
            'Pareggio, {score}: nessuna delle due riesce a spuntarla.',
            'Si chiude in equilibrio: {score}.'
        ],
        'final.mvp': [
            'Migliore in pista: {pf}.',
            'Il protagonista della serata è {pf}.',
            'MVP della partita: {pf}!',
            'Menzione speciale per {pf}, il migliore stasera.'
        ],
        'final.bye': [
            'È tutto da questa telecronaca, grazie per averci seguito!',
            'Grazie per essere stati con noi, alla prossima!',
            'Dal palazzetto è tutto: buona serata a tutti!',
            'Un saluto e alla prossima partita!'
        ],

        // ------------------------------------------------------------ gioco
        'faceoff.win': [
            '{p} vince l\'ingaggio.',
            'Ingaggio vinto da {t}.',
            'Disco conquistato da {p} all\'ingaggio.',
            'Bravo {p} sull\'ingaggio, {t} in possesso.',
            '{t} si aggiudica il faceoff.',
            'Ingaggio pulito di {p}.'
        ],
        'shot.generic': [
            'Tira {p}!',
            '{p} al tiro!',
            'Conclusione di {p}!',
            'Ci prova {p}!',
            'Tiro di {p}!',
            '{p} carica e tira!',
            'Va al tiro {p}!',
            '{p} cerca la porta!'
        ],
        'shot.power': [
            'Bordata di {p}!',
            'Che botta di {p}!',
            'Sventola di {p}!',
            'Fucilata di {p}!',
            'Slap shot potentissimo di {p}!',
            '{p} carica tutto e spara!',
            'Missile di {p}!'
        ],
        'shot.onetimer': [
            'Al volo {p}!',
            'Passaggio di {p2} e tiro al volo di {p}!',
            'One-timer di {p}!',
            '{p2} serve {p}, battuta al volo!',
            'Di prima intenzione {p}!',
            'Assist di {p2}, {p} calcia al volo!'
        ],
        'shot.long': [
            'Tiro dalla distanza di {p}!',
            'Ci prova da lontano {p}!',
            '{p} dalla blu!',
            'Conclusione da fuori di {p}!',
            'Tentativo dalla lunga distanza di {p}!'
        ],
        'shot.close': [
            '{p} da distanza ravvicinata!',
            '{p} a tu per tu!',
            '{p} sotto porta!',
            'Da due passi {p}!',
            '{p} dallo slot!'
        ],
        'save.generic': [
            'Parata di {g}!',
            'Para {g}!',
            '{g} c\'è!',
            'Risponde presente {g}!',
            'Respinge {g}!',
            'Ci arriva {g}!',
            'Salva {g}!',
            'Niente da fare, para {g}.'
        ],
        'save.big': [
            'Che parata di {g}!',
            'Miracolo di {g}!',
            'Grande intervento di {g}!',
            'Super {g}! Parata strepitosa!',
            'Ma che riflessi, {g}!',
            '{g} dice di no! Parata da campion{e}!',
            'Intervento spettacolare di {g}!',
            'Para tutto {g}! Incredibile!'
        ],
        'save.freeze': [
            '{g} blocca il disco: si torna all\'ingaggio.',
            'Presa sicura di {g}, gioco fermo.',
            '{g} copre il disco, fischio dell\'arbitro.',
            'Bloccato da {g}: ingaggio in zona.',
            '{g} congela il disco, si riparte dall\'ingaggio.'
        ],
        'post': [
            'Palo!',
            'Colpisce il palo!',
            'Ferro! Che sfortuna!',
            'Palo pieno!',
            'Il palo salva {g}!',
            'Sul palo! Per un soffio!',
            'Ancora il legno! Niente da fare!'
        ],
        'breakaway': [
            '{p} tutto solo davanti al portiere!',
            'Contropiede di {p}!',
            'Fuga di {p}, nessuno riesce a prender{lo}!',
            '{p} in campo aperto!',
            'Occhio a {p}, è in contropiede!',
            '{p} si invola verso la porta!',
            'Breakaway di {p}!'
        ],
        'steal': [
            'Recupero di {p}!',
            'Disco rubato da {p}!',
            '{p} intercetta!',
            'Palla persa e {t} riparte!',
            'Gran recupero di {p}!',
            '{p} ruba il disco!',
            'Interviene {p}, cambio di fronte!'
        ],
        'hit': [
            'Carica di {p}!',
            'Bel contrasto di {p}!',
            '{p} spinge {v} contro la balaustra!',
            'Botta di {p} su {v}!',
            'Contatto duro tra {p} e {v}!',
            'Che carica di {p}!',
            '{v} finisce a terra dopo il contrasto di {p}.'
        ],
        'pass.combo': [
            'Bella circolazione di disco per {t}!',
            'Che giro palla di {t}!',
            'Tic-tac di passaggi di {t}!',
            '{t} fa girare il disco con pazienza.',
            'Manovra ragionata di {t}, passaggio dopo passaggio.',
            'Splendido fraseggio di {t}!'
        ],
        'possession.carry': [
            '{p} in possesso.',
            'Disco a {p}.',
            '{p} conduce.',
            'Lo controlla {p}.',
            'Gestisce {p}.',
            '{p} porta su il disco.',
            'Ora è {p} ad avere il disco.'
        ],
        'possession.attack': [
            '{t} in zona d\'attacco.',
            '{p} entra in zona!',
            '{t} si fa pericolosa.',
            '{p} cerca lo spazio.',
            'Attacco di {t}, {p} con il disco.',
            '{p} prova a sfondare.',
            'Pressione di {t} in zona offensiva.'
        ],
        'possession.defense': [
            '{p} riparte dalla propria zona.',
            '{t} imposta dalle retrovie.',
            '{p} esce dalla zona difensiva.',
            'Disco a {p}, che ricomincia l\'azione.',
            '{t} riorganizza la manovra.'
        ],
        'lineChange': [
            'Cambio di linea per {t}.',
            '{t} manda in pista la {line} linea.',
            'Forze fresche per {t}: entra la {line} linea.',
            'Rotazione in casa {t}, dentro la {line} linea.'
        ],

        // ------------------------------------------------------------ gol
        'goal.call': [
            'GOOOOL!',
            'GOL! GOL! GOL!',
            'È GOOOL!',
            'RETEEE!',
            'Gooool!',
            'In rete! GOL!',
            'GOL! Il disco è in fondo alla rete!',
            'L\'ha messa dentro! GOL!'
        ],
        'goal.scorer': [
            'Segna {pf}!',
            'Lo firma {pf}, numero {n}!',
            'Rete di {pf}!',
            'È di {pf} il gol!',
            '{pf} non perdona!',
            'Gol di {pf} per {t}!',
            'Ha segnato {pf}!',
            'Firma di {pf}, il numero {n}!'
        ],
        'goal.goahead': [
            '{t} passa in vantaggio, {score}!',
            '{t} avanti, {score}!',
            'Sorpasso {t}: {score}!',
            'È {t} a mettere la testa avanti: {score}.'
        ],
        'goal.first': [
            'Si sblocca la partita: {score}!',
            'Primo gol della serata, {t} avanti {score}.',
            '{t} rompe l\'equilibrio: {score}.'
        ],
        'goal.equalizer': [
            'Pareggio! {score}!',
            '{t} la riprende: {score}!',
            'Tutto da rifare, siamo {score}!',
            'Gol del pareggio! {score}!',
            'Rimette le cose in pari {t}: {score}.'
        ],
        'goal.extend': [
            '{t} allunga: {score}!',
            '{t} scappa via, {score}.',
            'Ancora {t}! Il punteggio dice {score}!',
            '{t} prende il largo: {score}.',
            'Altro gol per {t}, {score}.'
        ],
        'goal.closer': [
            '{t} accorcia le distanze: {score}!',
            '{t} riapre la partita! {score}.',
            'Gol che riaccende le speranze di {t}: {score}.',
            '{t} è ancora viva! {score}.'
        ],
        'goal.comeback': [
            'Rimonta completata! {t} avanti {score}!',
            'Clamorosa rimonta di {t}: {score}!',
            'Era sotto, ora {t} è avanti! {score}!'
        ],
        'goal.pp': [
            'Gol in superiorità numerica!',
            'Power play sfruttato alla perfezione!',
            'La superiorità numerica dà i suoi frutti!',
            'Punisce l\'inferiorità avversaria!'
        ],
        'goal.pk': [
            'E l\'hanno segnato in inferiorità numerica!',
            'Gol in inferiorità! Che beffa!',
            'Short-handed! Gol con un uomo in meno!'
        ],
        'goal.brace': [
            'Doppietta per {p}!',
            'Secondo gol personale per {p}!',
            '{p} fa doppietta!',
            'Ancora {p}! Doppietta!'
        ],
        'goal.hattrick': [
            'TRIPLETTA! Hat-trick di {p}!',
            'Tre gol per {p}! Hat-trick!',
            'Hat-trick! {p} è inarrestabile!'
        ],
        'goal.golden': [
            'GOLDEN GOAL! È finita! Vince {t}!',
            'Gol al supplementare! {t} vince la partita!',
            'Golden goal! Festa {t}!'
        ],
        'goal.late': [
            'E a pochi secondi dalla fine!',
            'Un gol pesantissimo a ridosso della sirena!',
            'Proprio sul finale!'
        ],
        'replay': [
            'Rivediamolo.',
            'Guardiamolo di nuovo.',
            'Ecco il replay.',
            'Rivediamo l\'azione del gol.',
            'Al replay: guardate che azione.',
            'Riviviamo il gol.'
        ],

        // ------------------------------------------------------------ penalità
        'penalty.minor': [
            'Fischio dell\'arbitro: {type} di {p}, due minuti.',
            'Penalità per {p}: {type}, due minuti da scontare.',
            '{p} va in panca puniti per {type}.',
            'L\'arbitro punisce {p}: {type}, due minuti.',
            'Due minuti a {p} per {type}.'
        ],
        'penalty.expulsion': [
            'Espulsione per {p}! {type} gravissima: {t} in inferiorità per cinque minuti.',
            '{p} espulso per {type}! Cinque minuti di inferiorità per {t}.',
            'Cartellino pesante: {p} lascia la partita per {type}.'
        ],
        'penalty.pp': [
            '{opp} in superiorità numerica.',
            'Power play per {opp}.',
            '{opp} con un uomo in più.',
            'Occasione d\'oro per {opp} in power play.'
        ],
        'penalty.end': [
            '{t} torna al completo.',
            'Finisce l\'inferiorità di {t}.',
            'Penalità scontata, {t} di nuovo in parità numerica.',
            'Rientra il giocatore: {t} al completo.'
        ],

        // ------------------------------------------------------------ aneddoti e statistiche
        'fact.capacity': [
            'Il {arena} può contenere {cap} spettatori.',
            'Curiosità: il {arena} ha una capienza di {cap} posti.'
        ],
        'fact.roof': [
            'Particolare del {arena}: {roof}.',
            'Date un\'occhiata alla copertura del palazzetto: {roof}.'
        ],
        'fact.surface': [
            'Si gioca su {surface}.',
            'Il fondo della pista? {surface}.'
        ],
        'fact.coach': [
            'In panchina per {t} c\'è {coach}.',
            '{t} è guidata da {coach}.',
            'L\'allenatore di {t} è {coach}, attentissimo a ogni cambio.'
        ],
        'fact.topScorer': [
            'Ricordiamo che {pf} è il miglior marcatore di {t}, con {g} gol.',
            '{pf} ha già messo a referto {pts} punti in stagione per {t}.',
            'Statistiche alla mano, {pf} è il giocatore più prolifico di {t}.'
        ],
        'fact.attack': [
            '{t} ha uno dei reparti offensivi più temibili.',
            'L\'attacco di {t} è il suo punto di forza.',
            'Quando {t} attacca, fa sempre paura.'
        ],
        'fact.defense': [
            '{t} punta molto sulla solidità difensiva.',
            'La difesa di {t} è un vero muro.',
            'Difesa ordinata per {t}: non è facile trovare spazi.'
        ],
        'fact.goalie': [
            '{g} è considerat{o} uno dei portieri più affidabili.',
            'Con {g} in porta, {t} dorme sonni tranquilli.',
            '{g} è una garanzia tra i pali.'
        ],
        'fact.league': [
            '{t} milita in {league}.',
            'Ricordiamo che {t} gioca in {league}.'
        ],
        'fact.standing': [
            'Ricordiamo: {t} è al {ord} posto in classifica con {pts} punti.',
            'In classifica {t} è {ordf}, con {pts} punti.'
        ],
        'fact.streak': [
            '{t} arrivava da {k} vittorie consecutive.',
            'Non dimentichiamo la striscia positiva di {t}: {k} vittorie di fila.'
        ],
        'fact.shots': [
            'Fin qui {t} ha tirato {a} volte, {opp} {b}.',
            'Tiri in porta: {a} per {t}, {b} per {opp}.',
            '{t} sta tirando di più: {a} conclusioni contro {b}.'
        ],
        'fact.saves': [
            '{g} ha già effettuato {k} parate.',
            'Sono {k} le parate di {g} finora.',
            'Serata di lavoro per {g}: {k} interventi.'
        ],
        'fact.faceoffs': [
            '{t} sta dominando agli ingaggi: {a} vinti contro {b}.',
            'Agli ingaggi è {a} a {b} per {t}.'
        ],
        'fact.scorer': [
            '{pf} ha già segnato {k} gol stasera.',
            'Serata da ricordare per {pf}: {k} reti.'
        ],
        'fact.score': [
            'Ricordiamo il punteggio: {scoreFull}.',
            'Punteggio: {scoreFull}.',
            'Il tabellone dice {scoreFull}.',
            'Punteggio attuale: {scoreFull}.'
        ],
        'fact.scoreless': [
            'Ancora zero a zero: le difese stanno avendo la meglio.',
            'Il risultato è ancora inchiodato sullo zero a zero.',
            'Nessun gol finora: portieri in grande serata.'
        ],
        'fact.time': [
            'Mancano {min} minuti alla fine del periodo.',
            'Ancora {min} minuti da giocare in questo periodo.',
            '{min} minuti sul cronometro.'
        ],
        'fact.funfact': [
            'Lo sapevate? {fact}',
            'Una curiosità: {fact}',
            'A proposito di storia dell\'in-line: {fact}',
            'Vi racconto una cosa: {fact}'
        ],
        'fact.inline': [
            'Nell\'hockey in-line si gioca quattro contro quattro, più i portieri: tanto spazio per le giocate individuali.',
            'Ricordiamo che nell\'hockey in-line non c\'è il fuorigioco: le azioni possono partire da ogni zona della pista.',
            'Il disco dell\'in-line è in plastica, più leggero di quello del ghiaccio: scorre veloce sulle piastrelle.',
            'Nell\'in-line i pattini hanno le ruote in linea: velocità e agilità sono tutto.',
            'Due tempi da venti minuti effettivi: ogni secondo di gioco conta.',
            'Il portiere nell\'in-line deve essere reattivissimo: il disco viaggia a velocità impressionanti.'
        ]
    };

    const en = {
        'intro.welcome': [
            'Good evening, hockey fans, and welcome to {arena}!',
            'Hello everyone, we are live from {arena} in {city}.',
            'Welcome along! We come to you live from {arena}.',
            'A warm welcome to all of you, live from {arena} for a big night of inline hockey.',
            'Good evening from {city}! The setting is {arena}, and the atmosphere is already electric.',
            'Hi everybody and welcome to the rink: we are at {arena}, ready for a cracking game.',
            'Greetings from {arena}! The lights are on, the fans are in: let\'s play some hockey!'
        ],
        'intro.capacity': [
            'A {cap}-seat venue, and you can feel the buzz tonight.',
            '{cap} seats here, and the crowd can\'t wait to get going.',
            'This building holds {cap} fans: expect plenty of noise.'
        ],
        'intro.match': [
            'It\'s {home} against {guest}.',
            '{home} host {guest} tonight.',
            'On the rink: {home} and {guest}.',
            'Tonight\'s matchup is {home} versus {guest}.',
            '{home} take on {guest}: should be a good one.',
            'This one is {home} against {guest}, two teams desperate for a win.'
        ],
        'intro.friendly': [
            'It\'s a friendly, but nobody likes to lose.',
            'No points at stake tonight, but plenty of pride.',
            'A friendly game, but don\'t expect anyone to hold back.',
            'An exhibition game, a good test for both sides.'
        ],
        'intro.league': [
            'This is round {round} of {rounds} in the {comp}.',
            '{comp}, matchday {round}: big points on the line.',
            'We\'re at round {round} of the {comp} regular season.'
        ],
        'intro.playoff': [
            'It\'s {comp} playoff time: the {stage}.',
            '{comp} playoffs, {stage}: every game counts double from here.',
            'Playoff hockey! {comp}, {stage}.'
        ],
        'intro.final': [
            'This is the {stage}: the biggest game of the season.',
            'Ladies and gentlemen, welcome to the {stage}!',
            'It\'s the {stage}: it doesn\'t get any bigger than this.'
        ],
        'intro.cup': [
            'Italian Cup, {stage}: one game, winner goes through.',
            'We\'re in the Italian Cup {stage}: win or go home.',
            'Italian Cup action, the {stage}: no second chances.'
        ],
        'intro.cupFinal': [
            'It\'s the Italian Cup final: there\'s silverware on the line!',
            'The Italian Cup final: forty minutes to lift a trophy.',
            'The Italian Cup is up for grabs tonight!'
        ],
        'intro.series': [
            '{t} lead the series {a} games to {b}: this is game {gn}.',
            'Game {gn} of the series, with {t} up {a} to {b}.',
            'The series stands at {a} to {b} for {t}: here comes game {gn}.'
        ],
        'intro.seriesTied': [
            'The series is tied at {a} apiece: game {gn}.',
            'Game {gn}, series level at {a}: everything to play for.'
        ],
        'intro.seriesStart': [
            'It\'s game one of the series: a good start means a lot.',
            'The series opens tonight with game one.'
        ],
        'intro.leader': [
            '{t} come in at the top of the table with {pts} points.',
            '{t} lead the standings on {pts} points.',
            'League leaders {t} sit on {pts} points.'
        ],
        'intro.standing': [
            '{t} are {ord} in the table with {pts} points.',
            '{t} sit {ord} in the standings, on {pts} points.'
        ],
        'intro.last': [
            '{t} are rock bottom and badly need points.',
            '{t} prop up the table: they need a reaction tonight.'
        ],
        'intro.winStreak': [
            '{t} have won {k} in a row.',
            '{t} are red hot: {k} straight wins.',
            '{t} arrive on a {k}-game winning streak.'
        ],
        'intro.loseStreak': [
            '{t} have lost {k} straight and need a response.',
            'Tough times for {t}: {k} defeats in a row.'
        ],
        'intro.form': [
            '{t} have won {w} of their last {k}.',
            '{w} wins in the last {k} games for {t}.'
        ],
        'intro.favorite': [
            'On paper {t} are the favourites, but anything can happen.',
            'The odds favour {t}, but {opp} will fancy their chances.',
            '{t} start as favourites. Can {opp} spring a surprise?'
        ],
        'intro.balanced': [
            'Two evenly matched teams: this one could go either way.',
            'Very little to choose between these two on paper.',
            'A real toss-up tonight: no clear favourite.'
        ],
        'intro.topPlayer': [
            'Keep an eye on {pf} for {t}, number {n}: {g} goals and {pts} points this season.',
            'The man to watch for {t} is {pf}, number {n}, with {pts} points so far.',
            '{t} rely on {pf} up front: {g} goals already.',
            '{pf}, number {n}, is the leading scorer for {t}.'
        ],
        'intro.topPlayerNoStats': [
            'Watch out for {pf}, number {n}, of {t}.',
            'The player to follow for {t} is {pf}.'
        ],
        'intro.goalies': [
            'In goal, {gh} for {home} and {gg} for {guest}.',
            'Between the pipes: {gh} against {gg}.',
            'A goaltending duel tonight: {gh} versus {gg}.'
        ],
        'intro.coaches': [
            'Behind the benches, {ch} for {home} and {cg} for {guest}.',
            'A coaching battle too: {ch} against {cg}.'
        ],
        'intro.referee': [
            'Tonight\'s referee is {ref}.',
            '{ref} has the whistle tonight.'
        ],
        'intro.ready': [
            'The teams are out, we\'re ready for the opening faceoff!',
            'All set: let\'s drop the puck!',
            'Here we go: the puck is about to drop at centre rink.',
            'Sit back and enjoy, we\'re under way!'
        ],

        'period.start1': [
            'And we\'re under way! Faceoff at centre rink.',
            'The first period is underway!',
            'Here we go, first period!',
            'Puck drop, and we\'re off!'
        ],
        'period.start2': [
            'We\'re back: second period!',
            'The second period gets going, {scoreFull}.',
            'Teams back out: second period, it\'s {scoreFull}.'
        ],
        'period.startOT': [
            'Overtime! Golden goal: next goal wins.',
            'We\'re going to overtime: the first goal ends it!',
            'Sudden death overtime: hold on to your seats!'
        ],
        'period.end1': [
            'That\'s the end of the first period: {scoreFull}.',
            'The horn sounds on the first period, {scoreFull}.',
            'First period done: {scoreFull}.'
        ],
        'period.endOT': [
            'Level at the end of regulation, {score}: we\'re heading to overtime!',
            'Still tied after two periods: overtime it is!'
        ],
        'period.shots': [
            'Shots on goal: {home} {a}, {guest} {b}.',
            'The shot count reads {a} to {b}.'
        ],
        'period.lastMinute': [
            'One minute to play!',
            'Sixty seconds left!',
            'We\'re into the final minute!'
        ],
        'period.lastMinuteClose': [
            'Final minute and it\'s still wide open!',
            'Sixty seconds left, {scoreFull}: anything can happen!',
            'One minute to go, one goal in it: what a finish!'
        ],

        'final.win': [
            'That\'s it! {w} beat {l}, {score}.',
            'It\'s all over! {w} win it, {score}.',
            'The final horn: {w} take it {score} over {l}.',
            'Game over: {w} win by {score}.'
        ],
        'final.winOT': [
            '{w} win it in overtime! {score}.',
            'Golden goal, and {w} take the win, {score}.'
        ],
        'final.winSO': [
            '{w} win it in the shootout!',
            'Decided by the shootout: {w} prevail!'
        ],
        'final.draw': [
            'It finishes all square, {score}.',
            'A draw, {score}: neither side could find a winner.'
        ],
        'final.mvp': [
            'Player of the game: {pf}.',
            'Tonight\'s star: {pf}.',
            'Game MVP: {pf}!'
        ],
        'final.bye': [
            'That\'s all from us, thanks for watching!',
            'Thanks for joining us, see you next time!',
            'Good night from the rink!'
        ],

        'faceoff.win': [
            '{p} wins the faceoff.',
            'Faceoff won by {t}.',
            '{p} takes the draw.',
            'Clean win on the draw for {p}.',
            '{t} win the faceoff.'
        ],
        'shot.generic': [
            '{p} shoots!',
            'Shot by {p}!',
            '{p} lets it go!',
            '{p} tries {his} luck!',
            '{p} fires!',
            'Here\'s {p}, shot!',
            '{p} looking for the net!'
        ],
        'shot.power': [
            'Big slapshot from {p}!',
            'What a blast from {p}!',
            '{p} unloads!',
            'Rocket from {p}!',
            '{p} winds up and fires!'
        ],
        'shot.onetimer': [
            'One-timer, {p}!',
            '{p2} to {p}, one-timer!',
            '{p} on the one-timer!',
            'Feed from {p2}, {p} hammers it first time!'
        ],
        'shot.long': [
            '{p} from distance!',
            'Long shot by {p}!',
            '{p} from the point!',
            '{p} tries it from way out!'
        ],
        'shot.close': [
            '{p} from close range!',
            '{p} in tight!',
            '{p} from the slot!',
            '{p} right on the doorstep!'
        ],
        'save.generic': [
            'Saved by {g}!',
            '{g} makes the save!',
            'Stopped by {g}!',
            '{g} turns it away!',
            '{g} is there!',
            'Kicked away by {g}!'
        ],
        'save.big': [
            'What a save by {g}!',
            'Huge stop from {g}!',
            'Robbery! {g} says no!',
            'Spectacular save, {g}!',
            'Brilliant reflexes from {g}!',
            '{g} stands tall!'
        ],
        'save.freeze': [
            '{g} covers up: faceoff coming.',
            '{g} holds on, whistle.',
            'Frozen by {g}, we\'ll have a faceoff.'
        ],
        'post': [
            'Off the post!',
            'Hits the post!',
            'Iron! So unlucky!',
            'Rings off the post!',
            'The post bails out {g}!'
        ],
        'breakaway': [
            '{p} in alone!',
            'Breakaway, {p}!',
            '{p} is gone, nobody can catch {him}!',
            '{p} in open ice!',
            '{p} racing towards goal!'
        ],
        'steal': [
            'Stolen by {p}!',
            '{p} picks it off!',
            'Turnover, {t} going the other way!',
            'Great takeaway by {p}!',
            '{p} intercepts!'
        ],
        'hit': [
            'Big hit by {p}!',
            '{p} lays out {v}!',
            '{p} rubs {v} into the boards!',
            'Heavy contact between {p} and {v}!',
            '{v} goes down after the hit from {p}.'
        ],
        'pass.combo': [
            'Lovely passing from {t}!',
            '{t} moving the puck around nicely.',
            'Great puck movement by {t}!',
            'Tic-tac-toe from {t}!'
        ],
        'possession.carry': [
            '{p} has it.',
            '{p} with the puck.',
            '{p} carries.',
            '{p} in possession.',
            'Here\'s {p}.'
        ],
        'possession.attack': [
            '{t} in the attacking zone.',
            '{p} gets into the zone!',
            '{t} pressing.',
            '{p} looking for space.',
            '{t} on the attack, {p} with it.'
        ],
        'possession.defense': [
            '{p} brings it out of the zone.',
            '{t} regroup in their own end.',
            '{p} starts the play from the back.'
        ],
        'lineChange': [
            'Line change for {t}.',
            '{t} send out their {line} line.',
            'Fresh legs for {t}: the {line} line comes on.'
        ],

        'goal.call': [
            'GOAL!',
            'Scores! GOAL!',
            'GOAL! GOAL! GOAL!',
            'It\'s in! GOAL!',
            'Score! It\'s in the back of the net!',
            'GOAAAL!'
        ],
        'goal.scorer': [
            '{pf} scores!',
            'It\'s {pf}, number {n}!',
            'Goal by {pf}!',
            '{pf} finds the net!',
            '{pf} puts it home for {t}!'
        ],
        'goal.goahead': [
            '{t} take the lead, {score}!',
            '{t} go ahead, {score}!',
            '{t} in front: {score}.'
        ],
        'goal.first': [
            'The deadlock is broken: {score}!',
            'First goal of the night, {t} lead {score}.'
        ],
        'goal.equalizer': [
            'Equalizer! {score}!',
            '{t} tie it up: {score}!',
            'All square again, {score}!'
        ],
        'goal.extend': [
            '{t} extend the lead: {score}!',
            '{t} pull away, {score}.',
            'Another one for {t}, {score}.'
        ],
        'goal.closer': [
            '{t} pull one back: {score}!',
            '{t} are back in it! {score}.'
        ],
        'goal.comeback': [
            'Comeback complete! {t} lead {score}!',
            'What a comeback from {t}: {score}!'
        ],
        'goal.pp': [
            'A power play goal!',
            'They make the power play count!',
            'The man advantage pays off!'
        ],
        'goal.pk': [
            'And that\'s short-handed!',
            'A short-handed goal! What a sting!'
        ],
        'goal.brace': [
            'That\'s two for {p}!',
            '{p} with {his} second of the night!',
            'Brace for {p}!'
        ],
        'goal.hattrick': [
            'HAT-TRICK! Three for {p}!',
            'Hat-trick for {p}!'
        ],
        'goal.golden': [
            'GOLDEN GOAL! It\'s over! {t} win it!',
            'Overtime winner! {t} take it!'
        ],
        'goal.late': [
            'And with seconds to go!',
            'Right at the death!',
            'A huge late goal!'
        ],
        'replay': [
            'Let\'s see that again.',
            'Here\'s the replay.',
            'Take another look at that.',
            'One more time.'
        ],

        'penalty.minor': [
            'Whistle: {type} on {p}, two minutes.',
            'Penalty to {p}: {type}, two minutes.',
            '{p} heads to the box for {type}.',
            'Two minutes for {p}, {type}.'
        ],
        'penalty.expulsion': [
            '{p} is thrown out for {type}! Five minutes short-handed for {t}.',
            'Major penalty: {p} ejected for {type}!'
        ],
        'penalty.pp': [
            '{opp} go on the power play.',
            'Power play for {opp}.',
            '{opp} with the extra skater.'
        ],
        'penalty.end': [
            '{t} back to full strength.',
            'Penalty killed, {t} back at full strength.',
            'The penalty expires: {t} are back to four.'
        ],

        'fact.capacity': [
            '{arena} holds {cap} spectators.',
            'Fun fact: {arena} has a capacity of {cap}.'
        ],
        'fact.coach': [
            '{coach} is behind the bench for {t}.',
            '{t} are coached by {coach}.'
        ],
        'fact.topScorer': [
            'Remember, {pf} is the top scorer for {t}, with {g} goals.',
            '{pf} has {pts} points this season for {t}.'
        ],
        'fact.attack': [
            '{t} boast one of the most dangerous attacks around.',
            'Offence is the big strength of {t}.'
        ],
        'fact.defense': [
            '{t} are built on a solid defence.',
            'The {t} defence is a brick wall.'
        ],
        'fact.goalie': [
            '{g} is one of the most reliable goalies around.',
            'With {g} in net, {t} can sleep easy.'
        ],
        'fact.league': [
            '{t} play in {league}.'
        ],
        'fact.standing': [
            'Remember: {t} are {ord} in the table with {pts} points.'
        ],
        'fact.streak': [
            '{t} came in on a {k}-game winning streak.'
        ],
        'fact.shots': [
            'So far {t} have {a} shots, {opp} {b}.',
            'Shots on goal: {a} for {t}, {b} for {opp}.'
        ],
        'fact.saves': [
            '{g} has made {k} saves already.',
            'A busy night for {g}: {k} saves.'
        ],
        'fact.faceoffs': [
            '{t} are dominating at the dot: {a} faceoffs won to {b}.'
        ],
        'fact.scorer': [
            '{pf} already has {k} goals tonight.'
        ],
        'fact.score': [
            'Just a reminder of the score: {scoreFull}.',
            'It\'s {scoreFull}.',
            'The scoreboard reads {scoreFull}.'
        ],
        'fact.scoreless': [
            'Still goalless: the defences are on top.',
            'Nil-nil so far: the goalies are in great form.'
        ],
        'fact.time': [
            '{min} minutes left in the period.',
            'Still {min} minutes to play in this period.'
        ],
        'fact.inline': [
            'In inline hockey it\'s four skaters a side plus the goalies: lots of space for individual skill.',
            'Remember, there\'s no offside in inline hockey: attacks can start from anywhere.',
            'The inline puck is plastic and lighter than an ice hockey puck: it flies across the tiles.',
            'Two periods of twenty minutes of stop time: every second counts.',
            'Inline goalies need lightning reflexes: the puck travels at incredible speed.'
        ]
    };

    // termini variabili per lingua (stadi dei play-off, tipi di fallo, ordinali, ...)
    const terms = {
        it: {
            score: (h, g) => `${h} a ${g}`,
            tie: h => (h === 0 ? 'zero a zero' : `${h} pari`),
            scoreNamed: (home, h, guest, g) => `${home} ${h}, ${guest} ${g}`,
            stage: { QF: 'quarti di finale', SF: 'semifinali', F: 'finale', FA: 'finale scudetto', FB: 'finale promozione', CQF: 'quarti di finale', CSF: 'semifinali', CF: 'finale' },
            penalty: { 'Colpo di bastone': 'colpo di bastone', 'Ostruzione': 'ostruzione', 'Carica': 'carica scorretta', 'Trattenuta': 'trattenuta' },
            line: ['prima', 'seconda', 'terza'],
            ord: ['primo', 'secondo', 'terzo', 'quarto', 'quinto', 'sesto', 'settimo', 'ottavo', 'nono', 'decimo', 'undicesimo', 'dodicesimo', 'tredicesimo', 'quattordicesimo', 'quindicesimo', 'sedicesimo'],
            ordf: ['prima', 'seconda', 'terza', 'quarta', 'quinta', 'sesta', 'settima', 'ottava', 'nona', 'decima', 'undicesima', 'dodicesima', 'tredicesima', 'quattordicesima', 'quindicesima', 'sedicesima'],
            league: { 'SERIE A': 'Serie A', 'SERIE B': 'Serie B', 'UISP': 'Lega UISP', 'LIGUE ELITE': 'Ligue Élite francese', 'RFEP': 'Liga Élite spagnola', 'SERIE A VINTAGE': 'Serie A Vintage' },
            comp: { 'SERIE A': 'Serie A', 'SERIE B': 'Serie B' }
        },
        en: {
            score: (h, g) => `${h} to ${g}`,
            tie: h => (h === 0 ? 'nil-nil' : `${h} all`),
            scoreNamed: (home, h, guest, g) => `${home} ${h}, ${guest} ${g}`,
            stage: { QF: 'quarter-finals', SF: 'semi-finals', F: 'final', FA: 'championship final', FB: 'promotion final', CQF: 'quarter-finals', CSF: 'semi-finals', CF: 'final' },
            penalty: { 'Colpo di bastone': 'slashing', 'Ostruzione': 'interference', 'Carica': 'charging', 'Trattenuta': 'holding' },
            line: ['first', 'second', 'third'],
            ord: ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth'],
            league: { 'SERIE A': 'the Italian Serie A', 'SERIE B': 'the Italian Serie B', 'UISP': 'the UISP league', 'LIGUE ELITE': 'the French Ligue Élite', 'RFEP': 'the Spanish Liga Élite', 'SERIE A VINTAGE': 'Serie A Vintage' },
            comp: { 'SERIE A': 'Italian Serie A', 'SERIE B': 'Italian Serie B' }
        }
    };

    window.COMMENTARY_PHRASES = { it, en, terms };
})();
