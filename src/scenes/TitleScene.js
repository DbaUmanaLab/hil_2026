// --- src/scenes/TitleScene.js ---
// Phaser 3 Scene: schermata iniziale FISR.
// Il DOM HTML della splash screen è gestito direttamente via HTML/CSS/JS.
// Questa scena è un placeholder per eventuali effetti audio/transizioni Phaser.

export class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    create() {
        // Avvia direttamente la GameScene — l'UI splash è gestita nel DOM HTML.
        this.scene.start('GameScene');
    }
}
