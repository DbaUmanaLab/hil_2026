// --- src/main.js ---
// Entry point: avvia Phaser 3 HEADLESS come lifecycle manager.
// Three.js gestisce tutto il rendering via window.gameAPI (definito in index.html).
// AudioManager gestisce l'audio procedurale via window.gameAudio.
//
// Dipendenze globali (caricate via CDN in index.html):
//   - THREE  (three.min.js r128)
//   - Phaser (phaser.min.js v3)

import { TitleScene } from './scenes/TitleScene.js';
import { GameScene  } from './scenes/GameScene.js';
import { audioManager } from './audio/AudioManager.js';

window.addEventListener('load', () => {

    // 1. Esponi AudioManager globalmente (i trigger in index.html lo usano)
    window.gameAudio = audioManager;

    // 2. Avvia Phaser in modalità HEADLESS.
    //    Phaser gestisce il lifecycle e le scene; Three.js gestisce il rendering 3D.
    const phaserConfig = {
        type: Phaser.HEADLESS,
        parent: null,
        width: window.innerWidth,
        height: window.innerHeight,
        scene: [TitleScene, GameScene],
        audio: { disableWebAudio: true }   // audio gestito da AudioManager, non da Phaser
    };

    window._phaserGame = new Phaser.Game(phaserConfig);

    // 3. Inizializza AudioManager dopo il primo gesto utente
    audioManager.init(null);

    // 4. Ridimensionamento
    window.addEventListener('resize', () => {
        if (window._phaserGame) {
            window._phaserGame.scale.resize(window.innerWidth, window.innerHeight);
        }
    });
});
