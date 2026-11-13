export const CHARACTERS = {
  pedro: {
    id: 'pedro',
    name: 'PEDRO · MONSTRÃO',
    scale: 0.86,
    body: { width: 46, height: 142 },
    stats: {
      maxHealth: 1000,
      moveSpeed: 255,
      runSpeed: 340,
      acceleration: 1850,
      friction: 1250,
      jumpSpeed: 570,
      hitInvulnerability: 0.1
    },
    animations: {
      idle: { frames: ['pedro/idle_0', 'pedro/idle_1'], fps: 5 },
      walk: { frames: ['pedro/walk_0', 'pedro/walk_1', 'pedro/walk_2', 'pedro/walk_3'], fps: 10 },
      run: { frames: ['pedro/run_0', 'pedro/run_1', 'pedro/run_2'], fps: 12 },
      jump: { frames: ['pedro/jump_0', 'pedro/jump_1'], fps: 7 },
      fall: { frames: ['pedro/jump_1'], fps: 1 },
      crouch: { frames: ['pedro/crouch_0', 'pedro/crouch_1'], fps: 4 },
      punch: { frames: ['pedro/light_0', 'pedro/light_1'], fps: 12 },
      kick: { frames: ['pedro/heavy_0', 'pedro/heavy_1', 'pedro/heavy_2'], fps: 12 },
      block: { frames: ['pedro/guard_0', 'pedro/guard_1'], fps: 5 },
      special: { frames: ['pedro/hulkBlast_0'], fps: 1 },
      transformation: { frames: ['pedro/hulkPower_0', 'pedro/hulkPower_1', 'pedro/hulkPower_2', 'pedro/hulkPower_3'], fps: 9 },
      hit: { frames: ['pedro/guard_1'], fps: 1 },
      ko: { frames: ['pedro/crouch_0', 'pedro/crouch_1'], fps: 2 },
      victory: { frames: ['pedro/hulk_0', 'pedro/hulk_1', 'pedro/hulk_2'], fps: 4 },
      defeat: { frames: ['pedro/crouch_0', 'pedro/crouch_1'], fps: 2 }
    },
    forms: {
      transformed: {
        duration: 0.56,
        animations: {
          idle: { frames: ['pedro/hulk_0', 'pedro/hulk_1', 'pedro/hulk_2'], fps: 5 },
          special: { frames: ['pedro/hulkBlast_0'], fps: 1 }
        }
      }
    },
    moves: {
      punch: {
        damage: 48, range: 88, height: 112, startup: 0.12, active: 0.16, recovery: 0.24,
        knockback: 185, hitStun: 0.28, blockStun: 0.16, cooldown: 0.44, priority: 1,
        sound: 'punch', hitSound: 'impact', effect: 'light',
        cancels: ['kick'], cancelWindow: { start: 0.18, end: 0.42 }
      },
      kick: {
        damage: 82, range: 112, height: 94, startup: 0.2, active: 0.16, recovery: 0.34,
        knockback: 270, hitStun: 0.38, blockStun: 0.22, cooldown: 0.64, priority: 2,
        sound: 'kick', hitSound: 'impact', effect: 'heavy'
      },
      special: {
        damage: 190, range: 206, height: 126, startup: 0.28, active: 0.2, recovery: 0.48,
        knockback: 470, hitStun: 0.52, blockStun: 0.3, cooldown: 1.15, priority: 3,
        sound: 'special', hitSound: 'impact', effect: 'special', projectile: true
      }
    }
  },
  paula: {
    id: 'paula',
    name: 'PAULA',
    scale: 0.91,
    body: { width: 44, height: 138 },
    stats: {
      maxHealth: 1000,
      moveSpeed: 205,
      runSpeed: 275,
      acceleration: 1500,
      friction: 1100,
      jumpSpeed: 520,
      hitInvulnerability: 0.1
    },
    animations: {
      idle: { frames: ['paula/idle_0', 'paula/idle_1', 'paula/idle_2', 'paula/idle_3'], fps: 5 },
      walk: { frames: ['paula/walk_0', 'paula/walk_1', 'paula/walk_2', 'paula/walk_3'], fps: 9 },
      run: { frames: ['paula/run_0', 'paula/run_1', 'paula/run_2'], fps: 11 },
      jump: { frames: ['paula/jump_0', 'paula/jump_1', 'paula/jump_2'], fps: 7 },
      fall: { frames: ['paula/jump_2'], fps: 1 },
      punch: { frames: ['paula/light_0', 'paula/light_1', 'paula/light_2'], fps: 12 },
      kick: { frames: ['paula/heavy_0', 'paula/heavy_1', 'paula/heavy_2'], fps: 12 },
      block: { frames: ['paula/guard_0', 'paula/guard_1', 'paula/guard_2'], fps: 5 },
      special: { frames: ['paula/special_0', 'paula/special_1', 'paula/special_2'], fps: 8 },
      hit: { frames: ['paula/guard_1'], fps: 1 },
      victory: { frames: ['paula/idle_0', 'paula/idle_1'], fps: 3 },
      defeat: { frames: ['paula/guard_1'], fps: 1 }
    },
    animationFallbacks: {
      crouch: 'block',
      ko: 'defeat'
    },
    moves: {
      punch: {
        damage: 38, range: 82, height: 110, startup: 0.15, active: 0.14, recovery: 0.3,
        knockback: 150, hitStun: 0.25, blockStun: 0.16, cooldown: 0.78, priority: 1,
        sound: 'punch', hitSound: 'impact', effect: 'light'
      },
      kick: {
        damage: 66, range: 104, height: 92, startup: 0.25, active: 0.14, recovery: 0.4,
        knockback: 230, hitStun: 0.34, blockStun: 0.21, cooldown: 1.05, priority: 2,
        sound: 'kick', hitSound: 'impact', effect: 'heavy'
      },
      special: {
        damage: 90, range: 116, height: 86, startup: 0.32, active: 0.14, recovery: 0.4,
        knockback: 205, hitStun: 0.4, blockStun: 0.26, cooldown: 1.6, priority: 2,
        sound: 'special', hitSound: 'impact', effect: 'special'
      }
    }
  }
};

export const SPECIAL_PROJECTILE_FRAME = 'fx/beerBlast_0';
