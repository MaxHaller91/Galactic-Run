export class UISystem {
  constructor(uiManager, entities) {
    this.ui = uiManager;
    this.entities = entities;
  }

  update() {
    if (this.ui && typeof this.ui.update === 'function') {
      this.ui.update();
    }
    // Add more UI-related logic as needed
  }
}
