import Phaser from 'phaser';
import { CHARACTER_ROSTER, PLAYABLE_CHARACTER_IDS } from '../data/roster.js';
import { STAGES } from '../data/stages.js';

const DEFAULT_SELECTION = Object.freeze({
  playerId: 'pedro',
  opponentId: 'paula',
  stageId: 'bar'
});

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelectScene');
  }

  create() {
    this.roster = CHARACTER_ROSTER;
    this.stages = Object.values(STAGES);
    const saved = this.registry.get('prototypeSelection') || DEFAULT_SELECTION;
    this.selection = {
      playerId: this.isPlayable(saved.playerId) ? saved.playerId : DEFAULT_SELECTION.playerId,
      opponentId: this.isPlayable(saved.opponentId) ? saved.opponentId : DEFAULT_SELECTION.opponentId,
      stageId: STAGES[saved.stageId] ? saved.stageId : DEFAULT_SELECTION.stageId
    };
    this.activeSlot = 0;
    this.cursorIndex = Math.max(0, this.roster.findIndex(item => item.id === this.selection.playerId));
    this.statusMessage = 'ESCOLHA LUTADORES E ARENA';
    this.onResize = () => this.renderSelection();
    this.scale.on('resize', this.onResize);
    this.onKeyDown = event => this.handleKeyDown(event);
    this.input.keyboard.on('keydown', this.onKeyDown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.renderSelection();
  }

  isPlayable(id) {
    return PLAYABLE_CHARACTER_IDS.includes(id);
  }

  renderSelection() {
    this.selectionContainer?.destroy(true);
    this.selectionContainer = this.add.container(0, 0).setDepth(100);
    this.selectionContainer.setAlpha(0);
    this.tweens.add({
      targets: this.selectionContainer,
      alpha: 1,
      duration: 220,
      ease: 'Sine.easeOut'
    });
    const width = this.scale.width;
    const height = this.scale.height;
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x171020, 0x171020, 0x35203c, 0x20182e, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(0xffc64b, 0.07);
    graphics.fillCircle(width / 2, height * 0.45, Math.min(width, height) * 0.52);
    this.selectionContainer.add(graphics);

    this.addText(width / 2, Math.max(22, height * 0.055), 'SELECT YOUR FIGHTER', {
      fontSize: Math.min(30, Math.max(19, width * 0.035)),
      color: '#fff2ca'
    }).setOrigin(0.5);
    this.addText(width / 2, Math.max(48, height * 0.105), 'PEDRO E PAULA DISPONÍVEIS · OUTROS LUTADORES EM BREVE', {
      fontSize: Math.min(13, Math.max(9, width * 0.014)),
      color: '#d3c4d9'
    }).setOrigin(0.5);

    const columns = 4;
    const gap = width < 560 ? 6 : 12;
    const gridWidth = Math.min(width - 24, 4 * 154 + 3 * gap);
    const cardWidth = (gridWidth - (columns - 1) * gap) / columns;
    const top = Math.max(60, height * 0.14);
    const cardHeight = Phaser.Math.Clamp((height - top - 160) / 2, 76, 126);
    const gridLeft = (width - gridWidth) / 2;
    const rowGap = 8;

    this.roster.forEach((character, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = gridLeft + column * (cardWidth + gap);
      const y = top + row * (cardHeight + rowGap);
      this.renderCharacterCard(character, index, x, y, cardWidth, cardHeight);
    });

    const gridBottom = top + cardHeight * 2 + rowGap;
    const slotY = gridBottom + 13;
    const slotGap = 10;
    const slotWidth = Math.min(190, (width - 40 - slotGap) / 2);
    const leftSlotX = (width - slotWidth * 2 - slotGap) / 2;
    this.renderSlotButton(0, leftSlotX, slotY, slotWidth, 'P1', this.selection.playerId);
    this.renderSlotButton(1, leftSlotX + slotWidth + slotGap, slotY, slotWidth, 'CPU', this.selection.opponentId);

    const stageY = Math.min(height - 104, slotY + 49);
    this.renderStagePicker(width / 2, stageY);

    const buttonY = Math.min(height - 31, stageY + 109);
    const buttonGap = 10;
    const backWidth = Math.min(122, width * 0.32);
    const confirmWidth = Math.min(232, width * 0.55);
    const buttonGroupWidth = backWidth + confirmWidth + buttonGap;
    const buttonLeft = (width - buttonGroupWidth) / 2;
    this.renderButton(buttonLeft, buttonY - 21, backWidth, 42, 'VOLTAR', 0x4b3b58, () => this.returnToMenu());
    this.renderButton(
      buttonLeft + backWidth + buttonGap,
      buttonY - 21,
      confirmWidth,
      42,
      'COMEÇAR LUTA',
      0xb9412d,
      () => this.confirmSelection()
    );
    const instructions = width < 560
      ? '←→ LUTADOR · ↑↓ ARENA · TAB SLOT · ENTER OK · ESPAÇO LUTA'
      : 'SETAS: LUTADOR/ARENA · TAB: SLOT · ENTER: SELECIONAR · ESPAÇO: CONFIRMAR';
    this.addText(width / 2, Math.min(height, buttonY + 45), `${this.statusMessage} · ${instructions}`, {
      fontSize: Math.min(10, Math.max(7, width * 0.011)),
      color: '#d3c4d9'
    }).setOrigin(0.5, 1);
  }

  renderCharacterCard(character, index, x, y, width, height) {
    const isPlayer = this.selection.playerId === character.id;
    const isOpponent = this.selection.opponentId === character.id;
    const isCursor = index === this.cursorIndex;
    const borderColor = isCursor ? 0xffe26f : isPlayer ? 0x68d5ff : isOpponent ? 0xff77bc : 0x776a7d;
    const card = this.add.rectangle(x + width / 2, y + height / 2, width, height, 0x211a2c, 0.93)
      .setStrokeStyle(isCursor || isPlayer || isOpponent ? 3 : 1, borderColor, 0.95)
      .setInteractive({ useHandCursor: true });
    this.selectionContainer.add(card);
    if (isCursor) {
      this.tweens.add({
        targets: card,
        scaleX: 1.035,
        scaleY: 1.035,
        duration: 190,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    }
    card.on('pointerover', () => {
      this.cursorIndex = index;
      this.statusMessage = character.playable ? `SELECIONE ${character.name}` : `${character.name}: EM BREVE`;
    });
    card.on('pointerdown', () => this.selectCharacter(character));

    const textureKey = `portrait-${character.id}`;
    if (this.textures.exists(textureKey)) {
      const texture = this.textures.get(textureKey).getSourceImage();
      const image = this.add.image(x + width / 2, y + height * 0.43, textureKey);
      const scale = Math.min((width - 12) / texture.width, (height - 43) / texture.height);
      image.setScale(scale).setAlpha(character.playable ? 1 : 0.62);
      this.selectionContainer.add(image);
    } else {
      this.addText(x + width / 2, y + height * 0.42, 'RETRATO\nINDISPONÍVEL', {
        fontSize: 10,
        color: '#d3c4d9',
        align: 'center'
      }).setOrigin(0.5);
    }

    this.addText(x + width / 2, y + height - 24, character.name.replace(' · ', '\n'), {
      fontSize: Math.min(13, Math.max(8, width * 0.11)),
      color: character.playable ? '#fff2ca' : '#aaa0b2',
      align: 'center'
    }).setOrigin(0.5);

    if (!character.playable) {
      const unavailable = this.add.rectangle(x + width / 2, y + height / 2, width - 8, 24, 0x15111c, 0.82);
      this.selectionContainer.add(unavailable);
      this.addText(x + width / 2, y + height / 2, 'EM BREVE', {
        fontSize: Math.min(11, Math.max(8, width * 0.09)),
        color: '#fff2ca'
      }).setOrigin(0.5);
    } else {
      if (isPlayer) this.addBadge(x + 4, y + 4, 'P1', 0x237799);
      if (isOpponent) this.addBadge(x + width - 4, y + 4, 'CPU', 0xa92e68, 1);
    }
  }

  renderSlotButton(slot, x, y, width, label, characterId) {
    const active = this.activeSlot === slot;
    const name = this.roster.find(item => item.id === characterId)?.name || characterId;
    this.renderButton(
      x,
      y,
      width,
      34,
      `${label}: ${name}`,
      active ? (slot === 0 ? 0x246e8d : 0x8c315d) : 0x3c3345,
      () => {
        this.activeSlot = slot;
        this.cursorIndex = this.roster.findIndex(item => item.id === characterId);
        this.statusMessage = slot === 0 ? 'ESCOLHA O LUTADOR DO JOGADOR' : 'ESCOLHA O OPONENTE';
        this.renderSelection();
      }
    );
  }

  renderStagePicker(centerX, y) {
    const stageIndex = this.stages.findIndex(stage => stage.id === this.selection.stageId);
    const stage = this.stages[stageIndex];
    this.renderButton(centerX - 157, y, 42, 38, '‹', 0x41354e, () => this.changeStage(-1));
    this.renderButton(centerX + 115, y, 42, 38, '›', 0x41354e, () => this.changeStage(1));
    const layer = stage.layers[0];
    if (this.textures.exists(layer.textureKey)) {
      const texture = this.textures.get(layer.textureKey).getSourceImage();
      const preview = this.add.image(centerX, y + 19, layer.textureKey);
      preview.setScale(Math.min(110 / texture.width, 38 / texture.height));
      this.selectionContainer.add(preview);
    }
    this.addText(centerX, y + 43, `ARENA: ${stage.name.toUpperCase()}`, {
      fontSize: Math.min(13, Math.max(9, this.scale.width * 0.014)),
      color: '#ffe28a'
    }).setOrigin(0.5);
  }

  renderButton(x, y, width, height, label, color, callback) {
    const button = this.add.rectangle(x + width / 2, y + height / 2, width, height, color, 0.96)
      .setStrokeStyle(1, 0xffedc4, 0.75)
      .setInteractive({ useHandCursor: true });
    this.selectionContainer.add(button);
    button.on('pointerdown', callback);
    this.addText(x + width / 2, y + height / 2, label, {
      fontSize: Math.min(14, Math.max(10, width * 0.105)),
      color: '#fff',
      align: 'center'
    }).setOrigin(0.5);
  }

  addBadge(x, y, text, color, right = 0) {
    const badge = this.add.rectangle(x, y, 34, 17, color, 0.96).setOrigin(right ? 1 : 0, 0);
    this.selectionContainer.add(badge);
    this.addText(x + (right ? -17 : 17), y + 8.5, text, {
      fontSize: 9,
      color: '#fff'
    }).setOrigin(0.5);
  }

  addText(x, y, text, options = {}) {
    const label = this.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fontSize: 14,
      color: '#fff',
      stroke: '#130e1a',
      strokeThickness: 3,
      ...options
    });
    this.selectionContainer.add(label);
    return label;
  }

  selectCharacter(character) {
    this.cursorIndex = this.roster.findIndex(item => item.id === character.id);
    if (!character.playable) {
      this.statusMessage = `${character.name}: EM BREVE`;
      this.renderSelection();
      return;
    }
    const key = this.activeSlot === 0 ? 'playerId' : 'opponentId';
    this.selection[key] = character.id;
    this.statusMessage = `${character.name} SELECIONADO`;
    this.renderSelection();
  }

  changeStage(direction) {
    const current = this.stages.findIndex(stage => stage.id === this.selection.stageId);
    const next = (current + direction + this.stages.length) % this.stages.length;
    this.selection.stageId = this.stages[next].id;
    this.statusMessage = `ARENA: ${this.stages[next].name.toUpperCase()}`;
    this.renderSelection();
  }

  handleKeyDown(event) {
    if (event.key === 'Escape') {
      this.returnToMenu();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      this.activeSlot = 1 - this.activeSlot;
      const activeId = this.activeSlot === 0 ? this.selection.playerId : this.selection.opponentId;
      this.cursorIndex = this.roster.findIndex(item => item.id === activeId);
      this.renderSelection();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      this.cursorIndex = (this.cursorIndex + direction + this.roster.length) % this.roster.length;
      this.statusMessage = this.roster[this.cursorIndex].playable
        ? `SELECIONE ${this.roster[this.cursorIndex].name}`
        : `${this.roster[this.cursorIndex].name}: EM BREVE`;
      this.renderSelection();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.changeStage(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.selectCharacter(this.roster[this.cursorIndex]);
    } else if (event.code === 'Space') {
      event.preventDefault();
      this.confirmSelection();
    }
  }

  confirmSelection() {
    if (!this.isPlayable(this.selection.playerId) || !this.isPlayable(this.selection.opponentId)) {
      this.statusMessage = 'SELECIONE DOIS LUTADORES DISPONÍVEIS';
      this.renderSelection();
      return;
    }
    const confirmed = { ...this.selection };
    this.registry.set('prototypeSelection', confirmed);
    this.registry.set('prototypeStageId', confirmed.stageId);
    this.game.events.emit('prototype:match-confirmed', confirmed);
    this.scene.start('FightScene');
  }

  returnToMenu() {
    this.game.events.emit('prototype:menu-returned');
    this.scene.stop();
  }

  shutdown() {
    this.scale.off('resize', this.onResize);
    this.input.keyboard.off('keydown', this.onKeyDown);
  }
}
