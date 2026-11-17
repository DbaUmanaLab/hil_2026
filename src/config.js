// --- CONFIGURAZIONE SQUADRE (SERIE A FISR & LEGA UISP), DIVISE E PALAZZETTI ---

export const CLUB_ROSTERS = {
    cittadella: {
        id: 'cittadella',
        league: 'SERIE A',
        jerseyClubId: 'cittadella',
        name: 'CITTADELLA HP',
        shortName: 'CITTADELLA',
        goalie: { num: '1', name: 'BORTOLI' },
        lines: [
            [
                { role: 'C', num: '21', name: 'LAGO' },
                { role: 'LW', num: '10', name: 'FRANCON' },
                { role: 'RW', num: '77', name: 'SCALZERI' },
                { role: 'D', num: '14', name: 'BERTAGNA' }
            ],
            [
                { role: 'C', num: '9', name: 'PAQUET' },
                { role: 'LW', num: '18', name: 'TOMBOLAN' },
                { role: 'RW', num: '27', name: 'TORN' },
                { role: 'D', num: '4', name: 'GRIGOLETTO' }
            ],
            [
                { role: 'C', num: '11', name: 'CAMPULLA' },
                { role: 'LW', num: '23', name: 'FRATTINI' },
                { role: 'RW', num: '88', name: 'FERRO' },
                { role: 'D', num: '5', name: 'COSTA' }
            ]
        ],
        kits: {
            white: { id: 'white', label: 'Schema Bianco', primary: 0xffffff, pants: 0xdc2626, helmet: 0xdc2626, glove: 0xdc2626 },
            red:   { id: 'red',   label: 'Schema Rosso',  primary: 0xdc2626, pants: 0x172554, helmet: 0x172554, glove: 0x172554 }
        }
    },
    vicenza: {
        id: 'vicenza',
        league: 'SERIE A',
        jerseyClubId: 'vicenza',
        name: 'DIAVOLI VICENZA',
        shortName: 'DIAVOLI',
        goalie: { num: '35', name: 'FRIGO' },
        lines: [
            [
                { role: 'C', num: '33', name: 'VENDRAME' },
                { role: 'LW', num: '71', name: 'CANTELE' },
                { role: 'RW', num: '24', name: 'DELLE' },
                { role: 'D', num: '8', name: 'OLANDO' }
            ],
            [
                { role: 'C', num: '19', name: 'CAMPULLA' },
                { role: 'LW', num: '16', name: 'SIGHEL' },
                { role: 'RW', num: '91', name: 'HODGE' },
                { role: 'D', num: '3', name: 'PACE' }
            ],
            [
                { role: 'C', num: '12', name: 'CENTO' },
                { role: 'LW', num: '44', name: 'ROSA' },
                { role: 'RW', num: '61', name: 'VALE' },
                { role: 'D', num: '22', name: 'BERNI' }
            ]
        ],
        kits: {
            red:   { id: 'red',   label: 'Schema Rosso', primary: 0xdc2626, pants: 0x09090b, helmet: 0x09090b, glove: 0x09090b },
            black: { id: 'black', label: 'Schema Nero',  primary: 0x09090b, pants: 0x09090b, helmet: 0x09090b, glove: 0xdc2626 }
        }
    },
    milano: {
        id: 'milano',
        league: 'SERIE A',
        jerseyClubId: 'milano',
        name: 'HC MILANO QUANTA',
        shortName: 'MILANO',
        goalie: { num: '55', name: 'MARIANI' },
        lines: [
            [
                { role: 'C', num: '88', name: 'BANCHERO' },
                { role: 'LW', num: '66', name: 'LETTERA' },
                { role: 'RW', num: '25', name: 'FERRARI' },
                { role: 'D', num: '4', name: 'BERNAD' }
            ],
            [
                { role: 'C', num: '90', name: 'BRIANZONI' },
                { role: 'LW', num: '5', name: 'MASIERO' },
                { role: 'RW', num: '19', name: 'CECH' },
                { role: 'D', num: '27', name: 'BELLINI' }
            ],
            [
                { role: 'C', num: '11', name: 'NOVARA' },
                { role: 'LW', num: '17', name: 'RONCO' },
                { role: 'RW', num: '71', name: 'BARSANTI' },
                { role: 'D', num: '8', name: 'GALLI' }
            ]
        ],
        kits: {
            white: { id: 'white', label: 'Schema Bianco',    primary: 0xffffff, pants: 0x0f2557, helmet: 0x1d4ed8, glove: 0xdc2626 },
            navy:  { id: 'navy',  label: 'Schema Blu Navy',  primary: 0x0f2557, pants: 0x0f2557, helmet: 0xdc2626, glove: 0xdc2626 }
        }
    },
    asiago: {
        id: 'asiago',
        league: 'SERIE A',
        jerseyClubId: 'asiago',
        name: 'ASIAGO VIPERS',
        shortName: 'ASIAGO',
        goalie: { num: '29', name: 'STEVAN' },
        lines: [
            [
                { role: 'C', num: '44', name: 'TESSARI' },
                { role: 'LW', num: '17', name: 'LIEVORE' },
                { role: 'RW', num: '9', name: 'ROSSETTO' },
                { role: 'D', num: '21', name: 'BERTHOD' }
            ],
            [
                { role: 'C', num: '11', name: 'PERTILE' },
                { role: 'LW', num: '77', name: 'DAL SASSO' },
                { role: 'RW', num: '19', name: 'RODEGHIERO' },
                { role: 'D', num: '4', name: 'RIGONI' }
            ],
            [
                { role: 'C', num: '8', name: 'BAÙ' },
                { role: 'LW', num: '24', name: 'SCHIVO' },
                { role: 'RW', num: '71', name: 'LARCHER' },
                { role: 'D', num: '5', name: 'SPAGNOL' }
            ]
        ],
        kits: {
            black: { id: 'black', label: 'Schema Nero',   primary: 0x09090b, pants: 0x09090b, helmet: 0x09090b, glove: 0x09090b },
            white: { id: 'white', label: 'Schema Bianco', primary: 0xffffff, pants: 0x09090b, helmet: 0x09090b, glove: 0xf97316 }
        }
    },
    cittadella_pike: {
        id: 'cittadella_pike',
        league: 'UISP',
        jerseyClubId: 'cittadella',
        name: 'CITTADELLA PIKE',
        shortName: 'PIKE UISP',
        goalie: { num: '31', name: 'NICEFORO' },
        lines: [
            [
                { role: 'C', num: '15', name: 'PIKE' },
                { role: 'LW', num: '22', name: 'ZANELLA' },
                { role: 'RW', num: '19', name: 'BAGGIO' },
                { role: 'D', num: '6', name: 'GUIDOLIN' }
            ],
            [
                { role: 'C', num: '28', name: 'MARCON' },
                { role: 'LW', num: '13', name: 'TONIOLO' },
                { role: 'RW', num: '34', name: 'ZANON' },
                { role: 'D', num: '2', name: 'BERTON' }
            ],
            [
                { role: 'C', num: '77', name: 'SARTORI' },
                { role: 'LW', num: '12', name: 'CECCATO' },
                { role: 'RW', num: '90', name: 'PIEROBON' },
                { role: 'D', num: '7', name: 'MENEGHETTI' }
            ]
        ],
        kits: {
            white: { id: 'white', label: 'Maglia Cittadella Bianca', primary: 0xffffff, pants: 0xdc2626, helmet: 0xdc2626, glove: 0xdc2626 },
            red:   { id: 'red',   label: 'Maglia Cittadella Rossa',  primary: 0xdc2626, pants: 0x172554, helmet: 0x172554, glove: 0x172554 }
        }
    }
};

export const CLUB_IDS = ['cittadella', 'vicenza', 'milano', 'asiago', 'cittadella_pike'];
export const LEAGUE_MODES = ['TUTTE', 'SERIE A', 'UISP'];

export const ARENA_CATALOG = {
    cittadella: {
        id: 'cittadella',
        name: 'PALAHOCKEY DI CITTADELLA',
        shortTitle: 'PalaHockey Cittadella',
        location: 'Cittadella (PD) • Veneto, Italia',
        clubBadge: 'Casa: Cittadella HP • Cittadella Pike',
        desc: "Struttura geodetica con arconi in legno lamellare, condotto centrale dell'aria, striscioni PROMEC / DIprint.it / StudioMarcon, casetta bar in legno, pista regolamentare azzurra e tribuna tifo caldo.",
        capacity: '850 Spettatori',
        surface: 'Piastrelle SportCourt Azzurre',
        roof: 'Arconi in Legno Lamellare'
    },
    vicenza: {
        id: 'vicenza',
        name: 'PALAFERRARIN',
        shortTitle: 'PalaFerrarin Vicenza',
        location: 'Vicenza (VI) • Veneto, Italia',
        clubBadge: 'Casa: Diavoli Vicenza',
        desc: 'Storico impianto dei Diavoli Vicenza con capriate metalliche reticolari bianche, condotti di aerazione sospesi, finestroni alti e stendardi tricolori.',
        capacity: '1.100 Spettatori',
        surface: 'Pista Ghiaccio-Perla Chiara',
        roof: 'Capriate Reticolari Bianche'
    },
    milano: {
        id: 'milano',
        name: 'QUANTA CLUB ARENA',
        shortTitle: 'Quanta Club Milano',
        location: 'Milano (MI) • Lombardia, Italia',
        clubBadge: 'Casa: HC Milano Quanta',
        desc: 'Tensostruttura bianca del Quanta Club con pista azzurra, panchine con tettoia curva trasparente, cabina segnapunti rosso-blu, piccola curva dietro la porta e gli stendardi degli Scudetti HCM.',
        capacity: '900 Spettatori',
        surface: 'Pista SportCourt Azzurra',
        roof: 'Tensostruttura Pressostatica Bianca'
    },
    asiago: {
        id: 'asiago',
        name: 'ARENA VIA CINQUE',
        shortTitle: 'Arena Via Cinque Asiago',
        location: 'Via Cinque • Asiago (VI), Veneto',
        clubBadge: 'Casa: Asiago Vipers',
        desc: "Impianto indoor dell'Altopiano di Asiago con soffitto a griglia luminosa, pista azzurra SportCourt con logo Asiago Vipers, stendardi trofei arancioneri e pubblico in piedi in fondo alla pista senza tribune.",
        capacity: '450 Spettatori (In piedi a bordo pista)',
        surface: 'Piastrelle SportCourt Azzurre',
        roof: 'Copertura a Griglia con Faretti Incassati'
    }
};

export const ARENA_IDS = ['cittadella', 'vicenza', 'milano', 'asiago'];

export const HOME_CLUB_ARENAS = {
    cittadella: 'cittadella',
    vicenza: 'vicenza',
    milano: 'milano',
    asiago: 'asiago',
    cittadella_pike: 'cittadella'
};

export const GOAL_CELEBRATIONS = [
    { id: 'stick_ride',  name: 'Cavalcata sul Bastone' },
    { id: 'knee_slide',  name: 'Scivolata sulle Ginocchia' },
    { id: 'sniper',      name: 'Tiro da Cecchino' },
    { id: 'canoe',       name: 'Remata in Canoa' },
    { id: 'sword',       name: 'Spada nel Fodero' },
    { id: 'fist_pump',   name: 'Pugno al Cielo' },
    { id: 'bow',         name: 'Inchino al Pubblico' },
    { id: 'spin_jump',   name: 'Pirouette Volante 360°' },
    { id: 'airplane',    name: 'Volo ad Aeroplano' },
    { id: 'belly_slide', name: 'Tuffo a Pesce' },
    { id: 'air_guitar',  name: 'Assolo di Chitarra' },
    { id: 'huddle',      name: 'Abbraccio di Squadra' }
];

// Costanti pista
export const RINK_WIDTH   = 36;
export const RINK_LENGTH  = 72;
export const CORNER_RADIUS = 7.5;
export const GOAL_OFFSET_Z = 31;

export const TOTAL_PERIODS          = 2;
export const PERIOD_DURATION_SECONDS = 1200;
export const MAX_REPLAY_FRAMES      = 330;
export const LINEUP_LOADING_DURATION = 4.2;
