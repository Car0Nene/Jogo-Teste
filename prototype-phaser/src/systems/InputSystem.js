import Phaser from 'phaser';

const ACTIONS = ['left', 'right', 'jump', 'depth', 'depthBack', 'crouch', 'run', 'punch', 'kick', 'block', 'special'];

export class InputSystem {
  constructor(scene) {
    this.scene = scene;
    this.held = Object.fromEntries(ACTIONS.map(action => [action, false]));
    this.pointers = new Map();
    this.keys = scene.input.keyboard.addKeys({
      left: 'A',
      right: 'D',
      jump: 'W',
      depth: 'S',
      depthBack: 'UP',
      crouch: 'C',
      run: 'SHIFT',
      punch: 'J',
      kick: 'K',
      block: 'L',
      special: 'U',
      pause: 'ESC',
      pauseP: 'P',
      restart: 'R'
    });
    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);
    this.buttons = [...document.querySelectorAll('#touch-controls [data-action]')];
    for (const button of this.buttons) {
      button.addEventListener('pointerdown', this.onPointerDown);
      button.addEventListener('pointerup', this.onPointerUp);
      button.addEventListener('pointercancel', this.onPointerUp);
      button.addEventListener('lostpointercapture', this.onPointerUp);
      button.addEventListener('contextmenu', this.preventContextMenu);
    }
    this.onBlur = () => {
      this.held = Object.fromEntries(ACTIONS.map(action => [action, false]));
      this.pointers.clear();
    };
    window.addEventListener('blur', this.onBlur);
  }

  preventContextMenu(event) {
    event.preventDefault();
  }

  handlePointerDown(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    this.pointers.set(event.pointerId, action);
    this.held[action] = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  handlePointerUp(event) {
    const action = this.pointers.get(event.pointerId);
    if (!action) return;
    this.pointers.delete(event.pointerId);
    this.held[action] = [...this.pointers.values()].includes(action);
  }

  isDown(action) {
    return this.held[action] || this.keys[action].isDown;
  }

  poll() {
    const keys = this.keys;
    const pressed = key => Phaser.Input.Keyboard.JustDown(key);
    const input = {
      left: this.isDown('left'),
      right: this.isDown('right'),
      jump: this.isDown('jump'),
      depth: this.isDown('depth'),
      depthBack: this.isDown('depthBack'),
      crouch: this.isDown('crouch'),
      run: this.isDown('run'),
      block: this.isDown('block')
    };
    const actions = {
      punch: this.takeEdge('punch', keys.punch),
      kick: this.takeEdge('kick', keys.kick),
      special: this.takeEdge('special', keys.special),
      pause: pressed(keys.pause) || pressed(keys.pauseP),
      restart: this.takeEdge('restart', keys.restart)
    };
    this.previousHeld = { ...this.held };
    return { input, actions };
  }

  takeEdge(action, key) {
    const touchEdge = this.held[action] && !this.previousHeld?.[action];
    const keyboardEdge = Phaser.Input.Keyboard.JustDown(key);
    return touchEdge || keyboardEdge;
  }

  destroy() {
    for (const button of this.buttons) {
      button.removeEventListener('pointerdown', this.onPointerDown);
      button.removeEventListener('pointerup', this.onPointerUp);
      button.removeEventListener('pointercancel', this.onPointerUp);
      button.removeEventListener('lostpointercapture', this.onPointerUp);
      button.removeEventListener('contextmenu', this.preventContextMenu);
    }
    window.removeEventListener('blur', this.onBlur);
    this.pointers.clear();
  }
}
