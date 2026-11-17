// --- src/scenes/GameScene.js ---
// Phaser 3 Scene che ospita il rendering Three.js.
// Funge da bridge tra il lifecycle Phaser e il loop Three.js.

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // Three.js viene inizializzato da window.gameAPI.init()
        // che viene chiamato da main.js prima di avviare Phaser.
        // Questa scena è un placeholder per eventi Phaser (input tastiera extra, ecc.)
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update() {
        // Il loop principale Three.js gira in autonomia via requestAnimationFrame.
        // Phaser gestisce qui solo l'input supplementare se necessario.
    }
}
