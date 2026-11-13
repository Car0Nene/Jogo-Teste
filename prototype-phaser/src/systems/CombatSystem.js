export class CombatSystem {
  update(fighters) {
    const attackers = [...fighters].sort((a, b) => (b.attack?.move.priority || 0) - (a.attack?.move.priority || 0));
    for (const attacker of attackers) {
      const attack = attacker.attack;
      if (!this.isActive(attack) || attack.hit || attacker.dead) continue;

      const defender = fighters.find(fighter => fighter !== attacker);
      if (!defender || defender.dead || defender.invulnerabilityTime > 0) continue;
      if (Math.abs(attacker.depthPosition - defender.depthPosition) > attacker.scene.stageData.depth.hitTolerance) continue;

      const defenderAttack = defender.attack;
      if (this.isActive(defenderAttack) && (defenderAttack.move.priority || 0) > (attack.move.priority || 0)) {
        continue;
      }
      if (!this.overlaps(this.attackBox(attacker, attack.move), this.hurtBox(defender))) continue;

      attack.hit = true;
      const blocked = defender.state === 'block' && defender.facing === -attacker.facing;
      if (blocked) {
        if (typeof defender.receiveBlock === 'function') {
          defender.receiveBlock(attack.move, attacker.facing);
        } else {
          attacker.scene.audio?.playEffect('block');
          defender.physicsBody.setVelocityX(attacker.facing * 95);
        }
        attacker.scene.showImpact(defender.x, defender.y - 64, true);
        continue;
      }

      const applied = defender.takeDamage(attack.move.damage, attack.move.knockback, attacker.facing, attack.move);
      if (applied && attack.kind === 'special') {
        const configured = attacker.scene.audio?.playSpecialImpact?.(attacker.characterData.id);
        if (!configured) attacker.scene.audio?.playEffect?.(attack.move.hitSound || 'impact');
      }
      attacker.registerComboHit?.();
    }
  }

  isActive(attack) {
    if (!attack) return false;
    const { move, time } = attack;
    return time >= move.startup && time <= move.startup + move.active;
  }

  attackBox(fighter, move) {
    const footY = fighter.projectedGroundY - fighter.jumpHeight;
    const scale = fighter.depthScale || 1;
    if (move.hitbox) {
      const { offsetX = 0, offsetY = 0, width, height } = move.hitbox;
      const centerX = fighter.x + fighter.facing * offsetX * scale;
      const centerY = footY - offsetY * scale;
      return {
        left: centerX - width * scale / 2,
        right: centerX + width * scale / 2,
        top: centerY - height * scale / 2,
        bottom: centerY + height * scale / 2
      };
    }

    const start = fighter.x + fighter.facing * 18 * scale;
    const end = fighter.x + fighter.facing * move.range * scale;
    return {
      left: Math.min(start, end),
      right: Math.max(start, end),
      top: footY - move.height * scale,
      bottom: footY - 18 * scale
    };
  }

  hurtBox(fighter) {
    const footY = fighter.projectedGroundY - fighter.jumpHeight;
    const scale = fighter.depthScale || 1;
    const { width, height } = fighter.characterData.body;
    return {
      left: fighter.x - width * scale * 0.44,
      right: fighter.x + width * scale * 0.44,
      top: footY - height * scale,
      bottom: footY
    };
  }

  overlaps(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }
}
