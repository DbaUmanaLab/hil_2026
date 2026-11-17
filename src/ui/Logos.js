// --- LOGHI UFFICIALI SU CANVAS (draw*) E SVG INLINE PER L'INTERFACCIA HTML ---
// Le funzioni draw* vengono usate da Materials.js per dipingere le texture delle maglie e della pista.
// getClubLogoSVG() inserisce l'immagine SVG dalla cartella assets/logos/ nel DOM.

// --- DISEGNO LOGHI SU CANVAS ---

export function drawWingedCLogo(ctx, cx, cy, scale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#172554';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-12, -16);
    ctx.quadraticCurveTo(-28, -28, -42, -21);
    ctx.quadraticCurveTo(-30, -13, -20, -6);
    ctx.quadraticCurveTo(-34, -8, -44, 0);
    ctx.quadraticCurveTo(-32, 4, -22, 7);
    ctx.quadraticCurveTo(-34, 11, -38, 18);
    ctx.quadraticCurveTo(-24, 18, -14, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.rotate(-0.3);
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(6, 0, 28, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#172554';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(6, 0, 23, 17, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 900 38px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('C', 7, 2);

    ctx.restore();
}

export function drawDevilLogo(ctx, cx, cy, scale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-12, -14);
    ctx.quadraticCurveTo(-18, -22, -14, -29);
    ctx.quadraticCurveTo(-11, -22, -5, -18);
    ctx.quadraticCurveTo(4, -21, 13, -17);
    ctx.quadraticCurveTo(18, -23, 19, -29);
    ctx.quadraticCurveTo(22, -22, 17, -12);
    ctx.quadraticCurveTo(21, -5, 18, 2);
    ctx.lineTo(23, 7);
    ctx.lineTo(15, 11);
    ctx.lineTo(18, 17);
    ctx.lineTo(9, 18);
    ctx.lineTo(7, 29);
    ctx.lineTo(-5, 18);
    ctx.lineTo(-13, 17);
    ctx.lineTo(-10, 8);
    ctx.lineTo(-17, 5);
    ctx.lineTo(-13, -4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.moveTo(2, -9);
    ctx.lineTo(16, -6);
    ctx.lineTo(13, -1);
    ctx.lineTo(3, -3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(10, -5, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#09090b';
    ctx.fillRect(3, 5, 13, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(5, 5, 3, 4);
    ctx.fillRect(11, 5, 3, 4);

    ctx.restore();
}

export function drawRhinoLogo(ctx, cx, cy, scale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.save();
    ctx.rotate(-0.72);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-26, 12);
    ctx.lineTo(-12, 12);
    ctx.lineTo(-8, 4);
    ctx.lineTo(26, 4);
    ctx.lineTo(26, -3);
    ctx.lineTo(-12, -3);
    ctx.lineTo(-16, 6);
    ctx.lineTo(-26, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-4, -3, 14, 11, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(-2, -9, 11, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f2557';
    ctx.fillRect(-13, -10, 22, 4);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.quadraticCurveTo(-22, -16, -15, -24);
    ctx.quadraticCurveTo(-11, -14, -10, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.quadraticCurveTo(-13, -13, -8, -18);
    ctx.quadraticCurveTo(-5, -11, -5, -5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, -1, 9, 4);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-6, -1, 9, 4);

    ctx.fillStyle = '#0f2557';
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 1.6;
    ctx.fillRect(4, -5, 11, 10);
    ctx.strokeRect(4, -5, 11, 10);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(6, -3, 7, 6);

    ctx.restore();
}

export function drawViperLogo(ctx, cx, cy, scale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#09090b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-34, -22);
    ctx.lineTo(36, -22);
    ctx.lineTo(2, 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f97316';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 900 8px Arial, sans-serif';
    ctx.fillText('ASIAGO', 5, -16);
    ctx.font = 'italic 900 13px Arial, sans-serif';
    ctx.fillText('VIPERS', 2, -6);

    ctx.fillStyle = '#09090b';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-40, -24);
    ctx.lineTo(-35, -26);
    ctx.lineTo(-10, 12);
    ctx.lineTo(24, 12);
    ctx.quadraticCurveTo(30, 12, 28, 19);
    ctx.lineTo(-12, 19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f97316';
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-36, -26);
    ctx.quadraticCurveTo(-36, -6, -18, 4);
    ctx.quadraticCurveTo(-4, 0, 14, 1);
    ctx.lineTo(30, 1);
    ctx.lineTo(33, 7);
    ctx.lineTo(22, 9);
    ctx.lineTo(28, 13);
    ctx.lineTo(14, 14);
    ctx.quadraticCurveTo(22, 20, 26, 24);
    ctx.lineTo(-12, 24);
    ctx.quadraticCurveTo(-28, 14, -36, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(25, 7);
    ctx.lineTo(23, 14);
    ctx.lineTo(21, 7);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(26, 11);
    ctx.lineTo(36, 11);
    ctx.lineTo(40, 8);
    ctx.moveTo(36, 11);
    ctx.lineTo(40, 14);
    ctx.stroke();

    [-11, -3, 5, 13].forEach(wx => {
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(wx, 27, 4.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(wx, 27, 1.8, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
}

// --- LOGHI SVG PER INTERFACCIA HTML ---
// Usa i file SVG da assets/logos/ per ridurre il peso JS.

const LOGO_PATH = 'assets/logos/';

/**
 * Restituisce un tag <img> che punta al file SVG del club.
 * @param {string} clubId
 * @param {string} sizeClass  Classi Tailwind per dimensioni (default 'w-12 h-12')
 * @returns {string}  HTML string
 */
export function getClubLogoSVG(clubId, sizeClass = 'w-12 h-12') {
    const fileMap = {
        cittadella:      'cittadella.png',
        cittadella_pike: 'cittadella_pike.png',
        vicenza:         'vicenza.png',
        milano:          'milano.png',
        asiago:          'asiago.png'
    };
    const file = fileMap[clubId] || 'vicenza.png';
    return `<img src="${LOGO_PATH}${file}" class="${sizeClass}" alt="Logo ${clubId}" draggable="false">`;
}

export function getJerseyMiniSVG(clubId, kitId, CLUB_ROSTERS) {
    const baseClubId = (CLUB_ROSTERS[clubId] && CLUB_ROSTERS[clubId].jerseyClubId) || clubId;
    let bodyCol = '#ffffff';
    let shoulderCol = '#dc2626';
    let trimCol = '#172554';
    let stripeCol = '#dc2626';

    if (baseClubId === 'cittadella') {
        const isRed = kitId === 'red';
        bodyCol    = isRed ? '#dc2626' : '#ffffff';
        shoulderCol = isRed ? '#172554' : '#dc2626';
        trimCol    = isRed ? '#ffffff' : '#172554';
        stripeCol  = isRed ? '#172554' : '#dc2626';
    } else if (baseClubId === 'milano') {
        const isNavy = kitId === 'navy';
        bodyCol    = isNavy ? '#0f2557' : '#ffffff';
        shoulderCol = '#dc2626';
        trimCol    = isNavy ? '#ffffff' : '#0f2557';
        stripeCol  = '#dc2626';
    } else if (baseClubId === 'asiago') {
        const isWhite = kitId === 'white';
        bodyCol    = isWhite ? '#ffffff' : '#09090b';
        shoulderCol = '#f97316';
        trimCol    = isWhite ? '#09090b' : '#ffffff';
        stripeCol  = '#f97316';
    } else {
        const isBlack = kitId === 'black';
        bodyCol    = isBlack ? '#09090b' : '#dc2626';
        shoulderCol = isBlack ? '#dc2626' : '#09090b';
        trimCol    = '#ffffff';
        stripeCol  = isBlack ? '#dc2626' : '#09090b';
    }

    return `<svg viewBox="0 0 100 110" class="w-full h-full">
        <path d="M22 14 L38 8 L62 8 L78 14 L94 34 L82 46 L72 36 L72 100 L28 100 L28 36 L18 46 L6 34 Z" fill="${bodyCol}" stroke="#0f172a" stroke-width="3"/>
        <path d="M22 14 L38 8 L62 8 L78 14 L94 34 L82 46 L72 36 L72 30 L28 30 L28 36 L18 46 L6 34 Z" fill="${shoulderCol}"/>
        <rect x="28" y="30" width="44" height="4" fill="${trimCol}"/>
        <rect x="28" y="82" width="44" height="7" fill="${stripeCol}"/>
        <rect x="28" y="91" width="44" height="5" fill="${trimCol}"/>
    </svg>`;
}
