/**
 * PorterDash Game Engine
 * Handles rendering, physics, collision, and game state
 */

class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bg = new BackgroundSystem(canvas, this.ctx);

    // Game constants
    this.BLOCK_SIZE = 40; // Base unit size (1 beat)
    this.GRAVITY = 1.1;
    this.JUMP_FORCE = -14;
    this.DOUBLE_JUMP_FORCE = -12;
    this.MAX_OBSTACLE_HEIGHT = 3; // blocks - max height player can reach with double jump
    this.GROUND_HEIGHT_RATIO = 0.18;

    // State
    this.state = 'idle';
    this.level = null;
    this.levelIndex = 0;
    this.scrollX = 0;
    this.speed = 0;
    this.time = 0;
    this.deathProgress = 0;
    this.rainbowHue = 0;

    // Player
    this.player = {
      x: 0, y: 0,
      vy: 0,
      width: 34,
      height: 34,
      onGround: false,
      rotation: 0,
      dead: false,
      trail: [],
      hasDoubleJumped: false,
      flightMode: false,
      flightEndScrollX: 0,
    };

    // Effects
    this.deathParticles = [];
    this.portalEffects = [];
    this.groundParticles = [];
    this.screenShake = 0;
    this.doubleJumpFlash = 0;

    // Input
    this.jumpPressed = false;
    this.jumpHeld = false;

    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.displayWidth = rect.width;
    this.displayHeight = rect.height;
    this.groundY = this.displayHeight * (1 - this.GROUND_HEIGHT_RATIO);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.state = 'playing';
    this.scrollX = 0;
    this.speed = this.level.speed;
    this.time = 0;
    this.rainbowHue = 0;
    this.deathParticles = [];
    this.portalEffects = [];
    this.groundParticles = [];
    this.screenShake = 0;
    this.doubleJumpFlash = 0;

    // Calculate lead beats: ~5 seconds before first obstacle
    this.leadBeats = Math.ceil(5 * 60 * this.speed / this.BLOCK_SIZE);

    this.player.x = this.displayWidth * 0.15;
    this.player.y = this.groundY - this.player.height;
    this.player.vy = 0;
    this.player.onGround = true;
    this.player.rotation = 0;
    this.player.dead = false;
    this.player.trail = [];
    this.player.hasDoubleJumped = false;
    this.player.flightMode = false;
    this.player.flightEndScrollX = 0;
    this.player.gravityFlipped = false;
    this.player.gravityFlipEndScrollX = 0;
    this.triggeredFlightPortals = new Set();
    this.triggeredGravityPortals = new Set();
    this.triggeredSpeedPads = new Set();
    this.speedModifier = 1;
    this.speedModifierEndScrollX = 0;
    this.collectedStars = new Set();
    this.collectiblesTotal = 0;

    this.buildObstacles();
    this.buildGroundSegments();
    this.bg.init(this.level.colors, this.level.bgCreatures, this.level.bgTheme);
  }

  buildGroundSegments() {
    const bs = this.BLOCK_SIZE;
    const totalPx = (this.level.totalBeats + this.leadBeats) * bs;
    this.groundSegments = [];
    const baseY = this.groundY;

    const def = this.level.ground;
    if (!def || !def.length) {
      this.groundSegments.push({ x: 0, endX: totalPx, type: 'flat', y0: baseY, y1: baseY });
      return;
    }

    for (const seg of def) {
      const startX = seg.x * bs;
      const lenPx = (seg.len || 1) * bs;
      const endX = startX + lenPx;
      if (seg.type === 'gap') {
        this.groundSegments.push({ x: startX, endX, type: 'gap', y0: baseY, y1: baseY });
      } else if (seg.type === 'hill_up') {
        const rise = (seg.rise || 1) * bs;
        this.groundSegments.push({ x: startX, endX, type: 'hill_up', y0: baseY, y1: baseY - rise });
      } else if (seg.type === 'hill_down') {
        const drop = (seg.drop || 1) * bs;
        this.groundSegments.push({ x: startX, endX, type: 'hill_down', y0: baseY - drop, y1: baseY });
      } else if (seg.type === 'curve' || seg.type === 'roll') {
        const rise = (seg.rise || 1) * bs;
        this.groundSegments.push({ x: startX, endX, type: 'curve', y0: baseY, y1: baseY, rise });
      } else {
        this.groundSegments.push({ x: startX, endX, type: 'flat', y0: baseY, y1: baseY });
      }
    }
  }

  getGroundY(worldX) {
    if (!this.groundSegments || !this.groundSegments.length) return this.groundY;
    for (const seg of this.groundSegments) {
      if (worldX >= seg.x && worldX < seg.endX) {
        if (seg.type === 'gap') return null;
        const t = (worldX - seg.x) / (seg.endX - seg.x);
        if (seg.type === 'curve' && seg.rise != null) {
          const rise = seg.rise;
          return seg.y0 - rise * Math.sin(t * Math.PI);
        }
        return seg.y0 + (seg.y1 - seg.y0) * t;
      }
    }
    return this.groundY;
  }

  buildObstacles() {
    this.obstacles = [];
    const bs = this.BLOCK_SIZE;
    const maxH = this.MAX_OBSTACLE_HEIGHT * bs;
    this.collectiblesTotal = 0;

    for (const ob of this.level.obstacles) {
      if (ob.type === 'collectible') {
        this.collectiblesTotal++;
      }
      const baseX = (ob.x + this.leadBeats) * bs;
      const rawW = (ob.w || 1) * bs;
      const rawH = (ob.h || 1) * bs;
      // Clamp block height to max reachable
      const w = rawW;
      const h = Math.min(rawH, maxH);

      switch (ob.type) {
        case 'spike':
          this.obstacles.push({
            type: 'spike', x: baseX,
            y: this.groundY - bs, w: bs, h: bs, deadly: true,
          });
          break;
        case 'double_spike':
          this.obstacles.push({
            type: 'spike', x: baseX, y: this.groundY - bs, w: bs, h: bs, deadly: true,
          });
          this.obstacles.push({
            type: 'spike', x: baseX + bs, y: this.groundY - bs, w: bs, h: bs, deadly: true,
          });
          break;
        case 'triple_spike':
          for (let i = 0; i < 3; i++) {
            this.obstacles.push({
              type: 'spike', x: baseX + i * bs,
              y: this.groundY - bs, w: bs, h: bs, deadly: true,
            });
          }
          break;
        case 'block':
          this.obstacles.push({
            type: 'block', x: baseX,
            y: this.groundY - h, w, h, deadly: false,
          });
          break;
        case 'pillar':
          // Capped pillar: max 3 blocks high (reachable with double jump)
          this.obstacles.push({
            type: 'block', x: baseX,
            y: this.groundY - maxH, w: bs, h: maxH, deadly: false,
          });
          break;
        case 'spike_block':
          // Block 1 high + spike on top = 2 blocks total (clearable with single jump)
          this.obstacles.push({
            type: 'block', x: baseX,
            y: this.groundY - bs, w: bs * 2, h: bs, deadly: false,
          });
          this.obstacles.push({
            type: 'spike', x: baseX + bs * 0.25,
            y: this.groundY - bs * 2, w: bs * 1.5, h: bs, deadly: true,
          });
          break;
        case 'portal':
          this.obstacles.push({
            type: 'portal', x: baseX,
            y: this.groundY - bs * 3.5, w: bs * 2, h: bs * 3.5, deadly: false,
          });
          break;
        case 'portal_fly': {
          const flightBeats = ob.flightBeats || 45;
          this.obstacles.push({
            type: 'portal_fly', x: baseX,
            y: this.groundY - bs * 3.5, w: bs * 2, h: bs * 3.5, deadly: false,
            flightBeats,
          });
          this.obstacles.push({
            type: 'portal_fly_end', x: baseX + flightBeats * bs,
            y: this.groundY - bs * 3.5, w: bs * 2, h: bs * 3.5, deadly: false,
          });
          break;
        }
        case 'flame_pit':
          this.obstacles.push({
            type: 'flame_pit', x: baseX,
            y: this.groundY - 50, w: (ob.w || 2) * bs, h: 55, deadly: true,
          });
          break;
        case 'flamethrower':
          this.obstacles.push({
            type: 'flamethrower', x: baseX,
            y: -10, w: (ob.w || 1) * bs, h: 75, deadly: true,
          });
          break;
        case 'spike_up':
          this.obstacles.push({
            type: 'spike_up', x: baseX,
            y: 0, w: bs, h: bs, deadly: true,
          });
          break;
        case 'moving_block': {
          const amp = (ob.amp || 1) * bs;
          const period = (ob.period || 60) * 2;
          const axis = ob.axis || 'y';
          const baseY = this.groundY - (ob.h || 1) * bs;
          this.obstacles.push({
            type: 'block', x: baseX, y: baseY, w: (ob.w || 1) * bs, h: (ob.h || 1) * bs, deadly: false,
            baseX, baseY, amp, period, axis, moving: true,
          });
          break;
        }
        case 'platform':
          this.obstacles.push({
            type: 'block', x: baseX,
            y: this.groundY - (ob.h || 1) * bs - (ob.gap || 1) * bs, w: (ob.w || 2) * bs, h: (ob.h || 1) * bs, deadly: false,
            isPlatform: true,
          });
          break;
        case 'collectible':
          this.obstacles.push({
            type: 'collectible', x: baseX,
            y: this.groundY - bs * 2.5, w: 24, h: 24, deadly: false,
            id: ob.x,
          });
          break;
        case 'speed_pad':
          this.obstacles.push({
            type: 'speed_pad', x: baseX,
            y: this.groundY - bs * 0.5, w: (ob.w || 1) * bs, h: bs, deadly: false,
            speedMult: ob.speedMult ?? 1.4, durationBeats: ob.durationBeats ?? 15, id: ob.x,
          });
          break;
        case 'portal_gravity':
          this.obstacles.push({
            type: 'portal_gravity', x: baseX,
            y: this.groundY - bs * 3.5, w: bs * 2, h: bs * 3.5, deadly: false,
            gravityBeats: ob.gravityBeats || 40,
          });
          break;
      }
    }
  }

  getProgress() {
    if (!this.level) return 0;
    const totalPx = (this.level.totalBeats + this.leadBeats) * this.BLOCK_SIZE;
    return Math.min(1, this.scrollX / totalPx);
  }

  getCollectiblesCount() {
    return this.collectedStars ? this.collectedStars.size : 0;
  }

  getCollectiblesTotal() {
    return this.collectiblesTotal || 0;
  }

  update() {
    if (this.state !== 'playing') return;

    this.time++;
    if (this.level.rainbow) {
      this.rainbowHue = (this.rainbowHue + 0.5) % 360;
    }

    // Update moving blocks
    for (const ob of this.obstacles) {
      if (ob.moving && ob.baseY != null) {
        const t = this.time / (ob.period || 120);
        const offset = Math.sin(t * Math.PI * 2) * (ob.amp || 40);
        if (ob.axis === 'x') {
          ob.x = ob.baseX + offset;
        } else {
          ob.y = ob.baseY + offset;
        }
      }
    }

    // Scroll (with speed pad modifier)
    const effectiveSpeed = this.speed * (this.speedModifier || 1);
    if (this.scrollX >= this.speedModifierEndScrollX && this.speedModifier !== 1) {
      this.speedModifier = 1;
    }
    this.scrollX += effectiveSpeed;

    // Check level complete
    if (this.getProgress() >= 1) {
      this.state = 'complete';
      sound.playComplete();
      sound.stopMusic();
      return;
    }

    const p = this.player;
    const bs = this.BLOCK_SIZE;
    const worldX = this.scrollX + p.x + p.width / 2;

    // Portal flight trigger: only when first passing through
    for (const ob of this.obstacles) {
      if (ob.type === 'portal_fly' && ob.flightBeats != null && !this.triggeredFlightPortals.has(ob.x)) {
        const ox = ob.x - this.scrollX;
        const cx = ox + ob.w / 2;
        if (cx >= p.x + p.width / 2 - 15 && cx <= p.x + p.width / 2 + 15 &&
            p.y + p.height / 2 >= ob.y && p.y + p.height / 2 <= ob.y + ob.h) {
          this.triggeredFlightPortals.add(ob.x);
          p.flightMode = true;
          p.flightEndScrollX = this.scrollX + ob.flightBeats * bs;
          for (let i = 0; i < 12; i++) this.spawnPortalEffect(ox + ob.w / 2, ob.y + ob.h / 2);
        }
      }
    }

    // End flight when passing through exit portal (or backup: past end scroll)
    for (const ob of this.obstacles) {
      if (ob.type === 'portal_fly_end' && p.flightMode) {
        const ox = ob.x - this.scrollX;
        const cx = ox + ob.w / 2;
        if (cx >= p.x + p.width / 2 - 20 && cx <= p.x + p.width / 2 + 20 &&
            p.y + p.height / 2 >= ob.y && p.y + p.height / 2 <= ob.y + ob.h) {
          p.flightMode = false;
          p.vy = 0;
          this.spawnPortalEffect(ox + ob.w / 2, ob.y + ob.h / 2);
          break;
        }
      }
    }
    if (p.flightMode && this.scrollX >= p.flightEndScrollX) {
      p.flightMode = false;
      p.vy = 0;
    }

    // Portal gravity trigger
    for (const ob of this.obstacles) {
      if (ob.type === 'portal_gravity' && ob.gravityBeats != null && !this.triggeredGravityPortals.has(ob.x)) {
        const ox = ob.x - this.scrollX;
        const cx = ox + ob.w / 2;
        if (cx >= p.x + p.width / 2 - 15 && cx <= p.x + p.width / 2 + 15 &&
            p.y + p.height / 2 >= ob.y && p.y + p.height / 2 <= ob.y + ob.h) {
          this.triggeredGravityPortals.add(ob.x);
          p.gravityFlipped = true;
          p.gravityFlipEndScrollX = this.scrollX + ob.gravityBeats * bs;
          this.spawnPortalEffect(ox + ob.w / 2, ob.y + ob.h / 2);
        }
      }
    }

    if (p.gravityFlipped && this.scrollX >= p.gravityFlipEndScrollX) {
      p.gravityFlipped = false;
      p.vy = 0;
    }

    const CEILING_Y = 55;

    // --- Flight mode physics (Geometry Dash style: hold to rise, release to fall) ---
    if (p.flightMode) {
      const FLIGHT_UP = -7;
      const FLIGHT_DOWN = 5;
      if (this.jumpHeld) {
        p.vy = FLIGHT_UP;
      } else {
        p.vy = FLIGHT_DOWN;
      }
      p.y += p.vy;
      const minFlightY = this.groundY - p.height;
      if (p.y > minFlightY) p.y = minFlightY;
      p.rotation = p.vy < 0 ? -0.3 : 0.3;
      p.onGround = false;
    } else if (p.gravityFlipped) {
      // --- Upside-down: gravity toward ceiling ---
      if (this.jumpPressed) {
        if (p.onGround) {
          p.vy = this.JUMP_FORCE;
          p.onGround = false;
          p.hasDoubleJumped = false;
        } else if (!p.hasDoubleJumped) {
          p.vy = this.DOUBLE_JUMP_FORCE;
          p.hasDoubleJumped = true;
          this.doubleJumpFlash = 8;
        }
      }
      this.jumpPressed = false;
      p.vy -= this.GRAVITY;
      p.y += p.vy;
      const wasOnGround = p.onGround;
      p.onGround = false;
      if (p.y <= CEILING_Y) {
        p.y = CEILING_Y;
        p.vy = 0;
        if (!wasOnGround) sound.playLand();
        p.onGround = true;
        p.hasDoubleJumped = false;
      }
      if (p.y > this.displayHeight + 80) this.die();
      if (!p.onGround) p.rotation -= 0.12;
      else p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
    } else {
      // --- Normal / jump ---
      if (this.jumpPressed) {
        if (p.onGround) {
          p.vy = this.JUMP_FORCE;
          p.onGround = false;
          p.hasDoubleJumped = false;
          this.spawnGroundParticles(p.x + p.width / 2, p.y + p.height, 5);
          sound.playJump();
        } else if (!p.hasDoubleJumped) {
          p.vy = this.DOUBLE_JUMP_FORCE;
          p.hasDoubleJumped = true;
          this.doubleJumpFlash = 8;
          this.spawnDoubleJumpParticles(p.x + p.width / 2, p.y + p.height / 2);
          sound.playDoubleJump();
        }
      }
      this.jumpPressed = false;

      p.vy += this.GRAVITY;
      p.y += p.vy;

      const wasOnGround = p.onGround;
      p.onGround = false;

      const groundYAt = this.getGroundY(worldX);
      if (groundYAt == null) {
        if (p.y > this.displayHeight + 80) this.die();
      } else {
        if (p.y + p.height >= groundYAt - 4) {
          p.y = groundYAt - p.height;
          p.vy = 0;
          if (!wasOnGround) {
            this.spawnGroundParticles(p.x + p.width / 2, groundYAt, 3);
            sound.playLand();
          }
          p.onGround = true;
          p.hasDoubleJumped = false;
        }
      }

      if (!p.onGround) {
        p.rotation += 0.12;
      } else {
        p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
      }
    }

    // Trail
    p.trail.push({ x: p.x + p.width / 2, y: p.y + p.height / 2, age: 0 });
    if (p.trail.length > 15) p.trail.shift();
    for (const t of p.trail) t.age++;

    // Collision detection
    this.checkCollisions();

    // Update effects
    this.updateEffects();
    if (this.doubleJumpFlash > 0) this.doubleJumpFlash--;
    if (this.screenShake > 0) this.screenShake *= 0.9;

    this.bg.update(this.speed, this.scrollX);
  }

  checkCollisions() {
    const p = this.player;
    const margin = 5;
    const px = p.x + margin;
    const py = p.y + margin;
    const pw = p.width - margin * 2;
    const ph = p.height - margin * 2;

    // Previous frame bottom edge
    const prevBottom = py - p.vy;

    for (const ob of this.obstacles) {
      const ox = ob.x - this.scrollX;

      if (ox + ob.w < -100 || ox > this.displayWidth + 100) continue;

      if (ob.type === 'portal' || ob.type === 'portal_fly' || ob.type === 'portal_fly_end') {
        if ((ob.type === 'portal' || ob.type === 'portal_fly') && Math.abs(ox + ob.w / 2 - (p.x + p.width / 2)) < ob.w * 0.7) {
          this.spawnPortalEffect(ox + ob.w / 2, ob.y + ob.h / 2);
        }
        continue;
      }

      if (ob.type === 'flame_pit' || ob.type === 'flamethrower') {
        if (px < ox + ob.w && px + pw > ox && py < ob.y + ob.h && py + ph > ob.y) {
          this.die();
          return;
        }
        continue;
      }

      if (ob.type === 'collectible') {
        if (!this.collectedStars.has(ob.id) && px < ox + ob.w && px + pw > ox && py < ob.y + ob.h && py + ph > ob.y) {
          this.collectedStars.add(ob.id);
          if (typeof sound !== 'undefined' && sound.playCollect) sound.playCollect();
        }
        continue;
      }

      if (ob.type === 'speed_pad') {
        if (!this.triggeredSpeedPads.has(ob.id) && px < ox + ob.w && px + pw > ox && py < ob.y + ob.h && py + ph > ob.y) {
          this.triggeredSpeedPads.add(ob.id);
          this.speedModifier = ob.speedMult;
          this.speedModifierEndScrollX = this.scrollX + (ob.durationBeats || 15) * this.BLOCK_SIZE;
        }
        continue;
      }

      if (ob.type === 'portal_gravity') continue;

      // AABB collision
      if (px < ox + ob.w && px + pw > ox && py < ob.y + ob.h && py + ph > ob.y) {
        if (ob.deadly) {
          // Tighter triangle hitbox for spikes
          const spikeMargin = ob.w * 0.22;
          if (px + pw > ox + spikeMargin && px < ox + ob.w - spikeMargin &&
              py + ph > ob.y + ob.h * 0.4) {
            this.die();
            return;
          }
        } else {
          // Block: use previous position for top-landing detection
          if (prevBottom <= ob.y + 8 && p.vy >= 0) {
            p.y = ob.y - p.height;
            p.vy = 0;
            p.onGround = true;
            p.hasDoubleJumped = false;
          } else if (p.vy < 0 && py < ob.y + ob.h && py + ph > ob.y + ob.h - 8) {
            p.vy = 0;
            p.y = ob.y + ob.h - margin;
          } else {
            this.die();
            return;
          }
        }
      }
    }
  }

  die() {
    this.player.dead = true;
    this.state = 'dead';
    this.deathProgress = this.getProgress();
    this.screenShake = 15;
    sound.playDeath();
    sound.stopMusic();

    const p = this.player;
    const colors = this.level.colors;
    for (let i = 0; i < 20; i++) {
      this.deathParticles.push({
        x: p.x + p.width / 2,
        y: p.y + p.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 3,
        size: 3 + Math.random() * 6,
        color: Math.random() > 0.5 ? colors.accent1 : colors.accent2,
        life: 1,
        decay: 0.015 + Math.random() * 0.02,
      });
    }
  }

  spawnGroundParticles(x, y, count) {
    const colors = this.level.colors;
    for (let i = 0; i < count; i++) {
      this.groundParticles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3 - 1,
        size: 2 + Math.random() * 3,
        color: colors.particle,
        life: 1,
        decay: 0.03 + Math.random() * 0.02,
      });
    }
  }

  spawnDoubleJumpParticles(x, y) {
    const colors = this.level.colors;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.groundParticles.push({
        x, y,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        size: 2 + Math.random() * 3,
        color: '#ffffff',
        life: 1,
        decay: 0.04 + Math.random() * 0.02,
      });
    }
    // Ring burst particles
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this.groundParticles.push({
        x, y,
        vx: Math.cos(angle) * 6,
        vy: Math.sin(angle) * 6 - 2,
        size: 3 + Math.random() * 2,
        color: colors.accent2,
        life: 1,
        decay: 0.035,
      });
    }
  }

  spawnPortalEffect(x, y) {
    if (Math.random() > 0.5) return;
    this.portalEffects.push({
      x, y: y + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: 2 + Math.random() * 4,
      life: 1,
      decay: 0.03,
    });
  }

  updateEffects() {
    for (let i = this.deathParticles.length - 1; i >= 0; i--) {
      const p = this.deathParticles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= p.decay;
      if (p.life <= 0) this.deathParticles.splice(i, 1);
    }
    for (let i = this.groundParticles.length - 1; i >= 0; i--) {
      const p = this.groundParticles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= p.decay;
      if (p.life <= 0) this.groundParticles.splice(i, 1);
    }
    for (let i = this.portalEffects.length - 1; i >= 0; i--) {
      const p = this.portalEffects[i];
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0) this.portalEffects.splice(i, 1);
    }
  }

  // ---- Drawing ----

  draw() {
    const ctx = this.ctx;
    ctx.save();

    if (this.screenShake > 0.5) {
      ctx.translate(
        (Math.random() - 0.5) * this.screenShake,
        (Math.random() - 0.5) * this.screenShake
      );
    }

    const rainbowHue = this.level && this.level.rainbow ? this.rainbowHue : undefined;

    if (this.level) this.bg.draw(rainbowHue);
    this.drawGround(rainbowHue);
    this.drawObstacles(rainbowHue);

    if (!this.player.dead) this.drawPlayer(rainbowHue);

    this.drawEffects();
    ctx.restore();
  }

  drawGround(rainbowHue) {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;
    const colors = this.level ? this.level.colors : { ground: '#ff1a1a', groundAccent: '#cc0000' };
    const scrollX = this.scrollX;

    if (rainbowHue !== undefined) {
      ctx.fillStyle = `hsl(${rainbowHue}, 80%, 45%)`;
    } else {
      ctx.fillStyle = colors.ground;
    }

    if (!this.groundSegments || !this.groundSegments.length) {
      ctx.fillRect(0, this.groundY, w, h - this.groundY);
    } else {
      for (const seg of this.groundSegments) {
        if (seg.endX <= scrollX || seg.x >= scrollX + w) continue;
        const x1 = Math.max(0, seg.x - scrollX);
        const x2 = Math.min(w, seg.endX - scrollX);
        if (seg.type === 'gap') {
          ctx.fillStyle = rainbowHue !== undefined ? `hsl(${rainbowHue}, 50%, 8%)` : '#0a0a0a';
          ctx.fillRect(x1, this.groundY, x2 - x1, h - this.groundY);
          ctx.fillStyle = rainbowHue !== undefined ? `hsl(${rainbowHue}, 80%, 45%)` : colors.ground;
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(x1, h);
        if (seg.type === 'curve' && seg.rise != null) {
          const segLen = seg.endX - seg.x;
          const steps = Math.max(8, Math.floor((x2 - x1) / 4));
          for (let i = 0; i <= steps; i++) {
            const sx = x1 + (i / steps) * (x2 - x1);
            const worldX = seg.x + (sx - x1);
            const t = (worldX - seg.x) / segLen;
            const sy = seg.y0 - seg.rise * Math.sin(t * Math.PI);
            ctx.lineTo(sx, sy);
          }
        } else {
          const y1 = seg.y0;
          const y2 = seg.y1;
          ctx.lineTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.lineTo(x2, h);
        ctx.closePath();
        ctx.fill();
      }
    }

    const glowColor = rainbowHue !== undefined
      ? `hsl(${rainbowHue}, 100%, 60%)` : colors.accent1;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    const hasSegments = this.groundSegments && this.groundSegments.length > 0;
    if (hasSegments) {
      for (const seg of this.groundSegments) {
        if (seg.type === 'gap' || seg.endX <= seg.x) continue;
        const x1 = Math.max(0, seg.x - scrollX);
        const x2 = Math.min(w, seg.endX - scrollX);
        if (x2 <= x1) continue;
        const segLen = seg.endX - seg.x;
        ctx.beginPath();
        if (seg.type === 'curve' && seg.rise != null) {
          const steps = Math.max(8, Math.floor((x2 - x1) / 4));
          for (let i = 0; i <= steps; i++) {
            const sx = x1 + (i / steps) * (x2 - x1);
            const worldX = seg.x + (sx - x1);
            const t = (worldX - seg.x) / segLen;
            const sy = seg.y0 - seg.rise * Math.sin(t * Math.PI);
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
        } else {
          const y1 = seg.y0 + (seg.y1 - seg.y0) * (x1 - (seg.x - scrollX)) / segLen;
          const y2 = seg.y0 + (seg.y1 - seg.y0) * (x2 - (seg.x - scrollX)) / segLen;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(0, this.groundY);
      ctx.lineTo(w, this.groundY);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    ctx.strokeStyle = rainbowHue !== undefined
      ? `hsla(${rainbowHue}, 60%, 30%, 0.3)` : colors.groundAccent + '44';
    ctx.lineWidth = 1;
    const bs = this.BLOCK_SIZE;
    if (!hasSegments) {
      const offset = scrollX % bs;
      for (let x = -offset; x < w; x += bs) {
        ctx.beginPath(); ctx.moveTo(x, this.groundY); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = this.groundY; y < h; y += bs) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }

    const spikeH = 12, spikeW = 16;
    const sOff = scrollX % (spikeW * 2);
    ctx.fillStyle = rainbowHue !== undefined ? `hsl(${rainbowHue}, 70%, 25%)` : colors.groundAccent;
    for (const seg of this.groundSegments || []) {
      if (seg.type === 'gap' || seg.endX <= seg.x) continue;
      const start = Math.max(seg.x, scrollX);
      const end = Math.min(seg.endX, scrollX + w);
      for (let gx = start - (start % (spikeW * 2)); gx < end; gx += spikeW * 2) {
        const sx = gx - scrollX;
        if (sx + spikeW * 2 < 0) continue;
        const segLen = seg.endX - seg.x;
        const t0 = (gx - seg.x) / segLen;
        const t1 = (gx + spikeW * 2 - seg.x) / segLen;
        let y0, y1;
        if (seg.type === 'curve' && seg.rise != null) {
          y0 = seg.y0 - seg.rise * Math.sin(t0 * Math.PI);
          y1 = seg.y0 - seg.rise * Math.sin(t1 * Math.PI);
        } else {
          y0 = seg.y0 + (seg.y1 - seg.y0) * t0;
          y1 = seg.y0 + (seg.y1 - seg.y0) * t1;
        }
        const yMid = (y0 + y1) / 2;
        ctx.beginPath();
        ctx.moveTo(sx, yMid);
        ctx.lineTo(sx + spikeW, yMid - spikeH);
        ctx.lineTo(sx + spikeW * 2, yMid);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (!this.groundSegments || this.groundSegments.length === 0) {
      for (let x = -sOff - spikeW; x < w + spikeW; x += spikeW * 2) {
        ctx.beginPath();
        ctx.moveTo(x, this.groundY);
        ctx.lineTo(x + spikeW, this.groundY - spikeH);
        ctx.lineTo(x + spikeW * 2, this.groundY);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  drawObstacles(rainbowHue) {
    const ctx = this.ctx;
    const colors = this.level.colors;

    for (const ob of this.obstacles) {
      const ox = ob.x - this.scrollX;
      if (ox + ob.w < -50 || ox > this.displayWidth + 50) continue;

      switch (ob.type) {
        case 'spike': this.drawSpike(ctx, ox, ob.y, ob.w, ob.h, colors, rainbowHue); break;
        case 'spike_up': this.drawSpikeUp(ctx, ox, ob.y, ob.w, ob.h, colors, rainbowHue); break;
        case 'block': this.drawBlock(ctx, ox, ob.y, ob.w, ob.h, colors, rainbowHue); break;
        case 'portal': this.drawPortal(ctx, ox, ob.y, ob.w, ob.h, colors, rainbowHue, false); break;
        case 'portal_fly': this.drawPortal(ctx, ox, ob.y, ob.w, ob.h, colors, rainbowHue, false); break;
        case 'portal_fly_end': this.drawPortal(ctx, ox, ob.y, ob.w, ob.h, colors, rainbowHue, true); break;
        case 'portal_gravity': this.drawPortal(ctx, ox, ob.y, ob.w, ob.h, colors, rainbowHue, false); break;
        case 'flame_pit': this.drawFlamePit(ctx, ox, ob.y, ob.w, ob.h, colors, rainbowHue); break;
        case 'flamethrower': this.drawFlamethrower(ctx, ox, ob.y, ob.w, ob.h, colors, rainbowHue); break;
        case 'collectible': if (!this.collectedStars.has(ob.id)) this.drawCollectible(ctx, ox, ob.y, ob.w, ob.h, colors, rainbowHue); break;
        case 'speed_pad': this.drawSpeedPad(ctx, ox, ob.y, ob.w, ob.h, colors, rainbowHue); break;
      }
    }
  }

  drawCollectible(ctx, x, y, w, h, colors, rainbowHue) {
    const cx = x + w / 2, cy = y + h / 2;
    const pulse = 0.9 + Math.sin(this.time * 0.1) * 0.1;
    const r = (Math.min(w, h) / 2) * pulse;
    const starColor = rainbowHue !== undefined ? `hsl(${rainbowHue + 45}, 100%, 60%)` : (colors.portal || colors.accent2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.time * 0.02);
    ctx.strokeStyle = starColor;
    ctx.fillStyle = starColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = starColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const ax = Math.cos(a) * r;
      const ay = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(ax, ay);
      else ctx.lineTo(ax, ay);
      const innerA = a + Math.PI / 5;
      ctx.lineTo(Math.cos(innerA) * r * 0.4, Math.sin(innerA) * r * 0.4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawSpeedPad(ctx, x, y, w, h, colors, rainbowHue) {
    const active = this.speedModifier !== 1 && this.scrollX < this.speedModifierEndScrollX;
    const padColor = rainbowHue !== undefined
      ? `hsl(${rainbowHue + 30}, 90%, 50%)` : (colors.accent2 || '#ffaa00');
    ctx.fillStyle = active ? padColor : (rainbowHue !== undefined ? `hsla(${rainbowHue}, 60%, 40%, 0.7)` : 'rgba(180, 140, 0, 0.7)');
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = padColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.speedModifier > 1 ? 'FAST' : 'SLOW', x + w / 2, y + h / 2 + 4);
  }

  drawFlamePit(ctx, x, y, w, h, colors, rainbowHue) {
    const t = this.time * 0.15;
    const flicker = 0.9 + Math.sin(t * 3) * 0.1;
    const baseY = y + h;
    const flameColor = rainbowHue !== undefined
      ? `hsla(${rainbowHue + 20}, 100%, 55%, 0.85)` : colors.accent2 || '#ff6600';
    const coreColor = rainbowHue !== undefined
      ? `hsla(${rainbowHue}, 100%, 75%, 0.95)` : '#ffaa44';

    ctx.save();
    const count = Math.max(4, Math.floor(w / 18));
    for (let i = 0; i < count; i++) {
      const ox = x + (w / (count + 1)) * (i + 1) + (Math.sin(t + i) * 3);
      const fh = (40 + Math.sin(t * 2 + i * 1.5) * 8) * flicker;
      const grad = ctx.createLinearGradient(ox, baseY, ox, baseY - fh);
      grad.addColorStop(0, 'rgba(80, 20, 0, 0.9)');
      grad.addColorStop(0.4, flameColor);
      grad.addColorStop(0.8, coreColor);
      grad.addColorStop(1, 'rgba(255, 255, 200, 0.9)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(ox - 6, baseY);
      ctx.lineTo(ox - 4, baseY - fh * 0.5);
      ctx.lineTo(ox, baseY - fh);
      ctx.lineTo(ox + 4, baseY - fh * 0.5);
      ctx.lineTo(ox + 6, baseY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawFlamethrower(ctx, x, y, w, h, colors, rainbowHue) {
    const t = this.time * 0.15;
    const flicker = 0.9 + Math.sin(t * 3) * 0.1;
    const flameColor = rainbowHue !== undefined
      ? `hsla(${rainbowHue + 20}, 100%, 55%, 0.85)` : colors.accent2 || '#ff6600';
    const coreColor = rainbowHue !== undefined
      ? `hsla(${rainbowHue}, 100%, 75%, 0.95)` : '#ffaa44';

    const cx = x + w / 2;
    const fh = (h * 0.85 + Math.sin(t * 2) * 6) * flicker;
    const grad = ctx.createLinearGradient(cx, y, cx, y + fh);
    grad.addColorStop(0, 'rgba(60, 15, 0, 0.95)');
    grad.addColorStop(0.3, flameColor);
    grad.addColorStop(0.7, coreColor);
    grad.addColorStop(1, 'rgba(255, 255, 200, 0.9)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.4, y + fh);
    ctx.lineTo(cx - w * 0.2, y + fh * 0.4);
    ctx.lineTo(cx, y);
    ctx.lineTo(cx + w * 0.2, y + fh * 0.4);
    ctx.lineTo(cx + w * 0.4, y + fh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rainbowHue !== undefined ? `hsl(${rainbowHue + 30}, 40%, 15%)` : '#222';
    ctx.fillRect(x, y + fh, w, 12);
  }

  drawSpike(ctx, x, y, w, h, colors, rainbowHue) {
    const spikeColor = rainbowHue !== undefined
      ? `hsl(${rainbowHue + 60}, 100%, 90%)` : colors.spike;
    const glowColor = rainbowHue !== undefined
      ? `hsl(${rainbowHue}, 100%, 60%)` : colors.accent1;

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = spikeColor;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = rainbowHue !== undefined
      ? `hsla(${rainbowHue}, 100%, 50%, 0.3)` : colors.accent1 + '44';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + h * 0.3);
    ctx.lineTo(x + w * 0.7, y + h);
    ctx.lineTo(x + w * 0.3, y + h);
    ctx.closePath();
    ctx.fill();
  }

  drawSpikeUp(ctx, x, y, w, h, colors, rainbowHue) {
    const spikeColor = rainbowHue !== undefined
      ? `hsl(${rainbowHue + 60}, 100%, 90%)` : colors.spike;
    ctx.fillStyle = spikeColor;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w / 2, y + h);
    ctx.closePath();
    ctx.fill();
  }

  drawBlock(ctx, x, y, w, h, colors, rainbowHue) {
    const blockColor = rainbowHue !== undefined
      ? `hsl(${rainbowHue + 30}, 70%, 20%)` : colors.block;
    const borderColor = rainbowHue !== undefined
      ? `hsl(${rainbowHue}, 100%, 55%)` : colors.blockBorder;

    ctx.fillStyle = blockColor;
    ctx.fillRect(x, y, w, h);
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = borderColor + '33';
    ctx.lineWidth = 0.5;
    const bs = this.BLOCK_SIZE;
    for (let gx = x + bs; gx < x + w; gx += bs) {
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
    }
    for (let gy = y + bs; gy < y + h; gy += bs) {
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
    }
  }

  drawPortal(ctx, x, y, w, h, colors, rainbowHue, isExit) {
    const cx = x + w / 2, cy = y + h / 2;
    const rx = w * 0.8, ry = h * 0.4;
    const pulse = Math.sin(this.time * 0.05) * 0.15 + 0.85;
    const spin = this.time * 0.02;
    const portalColor = rainbowHue !== undefined
      ? `hsl(${rainbowHue + (isExit ? 60 : 120)}, 100%, ${isExit ? 70 : 60}%)` : (isExit ? colors.accent2 || colors.portal : colors.portal);
    const innerColor = isExit ? '#0a2a0a' : '#0a0a1a';

    ctx.save();

    for (let ring = 0; ring < 4; ring++) {
      const r = (ring / 4) * 0.95 + 0.05;
      const pr = r * pulse * (1 - ring * 0.08);
      ctx.strokeStyle = portalColor;
      ctx.globalAlpha = 0.4 + (1 - ring / 4) * 0.4;
      ctx.lineWidth = 2;
      ctx.shadowColor = portalColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * pr, ry * pr, spin + ring * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * 0.6);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.4, portalColor.replace(')', ', 0.25)').replace('hsl', 'hsla').replace('rgb', 'rgba'));
    grad.addColorStop(0.8, portalColor.replace(')', ', 0.08)').replace('hsl', 'hsla').replace('rgb', 'rgba'));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.95 * pulse, ry * 0.95 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = portalColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = portalColor;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.75 * pulse, ry * 0.75 * pulse, spin * 2, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const angle = this.time * 0.04 + (i * Math.PI * 2) / 8;
      const dist = rx * (0.5 + Math.sin(this.time * 0.08 + i) * 0.15) * pulse;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * ry * dist / rx, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isExit) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 10px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('EXIT', cx, cy - 2);
      ctx.fillText('FLIGHT', cx, cy + 10);
    }

    ctx.restore();
  }

  drawPlayer(rainbowHue) {
    const ctx = this.ctx;
    const p = this.player;
    const colors = this.level.colors;

    // Trail (longer streaks in flight mode)
    const trailLen = p.flightMode ? 22 : 15;
    const trailSizeMult = p.flightMode ? 0.5 : 0.4;
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      const alpha = (1 - t.age / trailLen) * 0.4;
      if (alpha <= 0) continue;
      const size = p.width * (1 - t.age / trailLen) * trailSizeMult;
      const trailColor = rainbowHue !== undefined
        ? `hsla(${rainbowHue + i * 10}, 100%, 60%, ${alpha})` : colors.accent1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = trailColor;
      if (p.flightMode) {
        ctx.fillRect(t.x - size, t.y - size * 0.4, size * 2, size * 0.8);
      } else {
        ctx.fillRect(t.x - size / 2, t.y - size / 2, size, size);
      }
    }
    ctx.globalAlpha = 1;

    // Player body
    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
    ctx.rotate(p.rotation);
    if (p.gravityFlipped) ctx.rotate(Math.PI);

    const half = p.width / 2;

    // Double jump flash effect
    if (this.doubleJumpFlash > 0) {
      const flashAlpha = this.doubleJumpFlash / 8;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 25 * flashAlpha;
    }

    const glowColor = rainbowHue !== undefined
      ? `hsl(${rainbowHue}, 100%, 60%)` : colors.accent1;
    if (this.doubleJumpFlash <= 0) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;
    }

    if (p.flightMode) {
      // Ship / UFO: elongated body with wings
      const shipW = 26, shipH = 20;
      ctx.fillStyle = rainbowHue !== undefined
        ? `hsl(${rainbowHue + 120}, 80%, 50%)` : '#33dd33';
      ctx.beginPath();
      ctx.ellipse(0, 0, shipW, shipH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rainbowHue !== undefined
        ? `hsl(${rainbowHue + 120}, 100%, 70%)` : '#66ff66';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = rainbowHue !== undefined
        ? `hsl(${rainbowHue + 120}, 90%, 25%)` : '#0a4a0a';
      ctx.beginPath();
      ctx.ellipse(0, 0, shipW * 0.5, shipH * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(6, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(7, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rainbowHue !== undefined
        ? `hsla(${rainbowHue + 120}, 100%, 60%, 0.6)` : 'rgba(100, 255, 100, 0.6)';
      ctx.beginPath();
      ctx.moveTo(-shipW - 4, -4);
      ctx.lineTo(-shipW + 2, 0);
      ctx.lineTo(-shipW - 4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-shipW - 4, -4);
      ctx.lineTo(-shipW + 2, 0);
      ctx.lineTo(-shipW - 4, 4);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(shipW + 4, -4);
      ctx.lineTo(shipW - 2, 0);
      ctx.lineTo(shipW + 4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Normal cube
      ctx.fillStyle = rainbowHue !== undefined
        ? `hsl(${rainbowHue + 120}, 80%, 55%)` : '#44ff44';
      ctx.fillRect(-half, -half, p.width, p.height);
      ctx.strokeStyle = rainbowHue !== undefined
        ? `hsl(${rainbowHue + 120}, 100%, 75%)` : '#88ff88';
      ctx.lineWidth = 2;
      ctx.strokeRect(-half, -half, p.width, p.height);
      const innerSize = p.width * 0.5;
      ctx.fillStyle = rainbowHue !== undefined
        ? `hsl(${rainbowHue + 120}, 90%, 25%)` : '#116611';
      ctx.fillRect(-innerSize / 2, -innerSize / 2, innerSize, innerSize);
      ctx.strokeStyle = rainbowHue !== undefined
        ? `hsl(${rainbowHue + 120}, 80%, 55%)` : '#44ff44';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-innerSize / 2, -innerSize / 2, innerSize, innerSize);
      ctx.fillStyle = '#fff';
      ctx.fillRect(2, -6, 7, 7);
      ctx.fillStyle = '#000';
      ctx.fillRect(5, -4, 3, 3);
      if (!p.onGround && !p.hasDoubleJumped) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(0, half + 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawEffects() {
    const ctx = this.ctx;
    const colors = this.level ? this.level.colors : {};

    for (const p of this.deathParticles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const p of this.groundParticles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const p of this.portalEffects) {
      ctx.globalAlpha = p.life * 0.6;
      ctx.fillStyle = colors.portal || '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Demo renderer for menu
  drawDemo(scrollOffset, hueShift) {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;
    const hue = (hueShift || 0) % 360;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `hsl(${hue}, 80%, 5%)`);
    grad.addColorStop(1, `hsl(${hue + 20}, 80%, 12%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.06)`;
    ctx.lineWidth = 1;
    const spacing = 60;
    const gOff = scrollOffset % spacing;
    for (let x = -gOff; x < w; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const gy = h * 0.82;
    ctx.fillStyle = `hsl(${hue}, 80%, 45%)`;
    ctx.fillRect(0, gy, w, h - gy);
    ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    ctx.shadowBlur = 0;

    const spikeH = 12, spikeW = 16;
    const sOff = scrollOffset % (spikeW * 2);
    ctx.fillStyle = `hsl(${hue}, 70%, 25%)`;
    for (let x = -sOff - spikeW; x < w + spikeW; x += spikeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, gy); ctx.lineTo(x + spikeW, gy - spikeH); ctx.lineTo(x + spikeW * 2, gy);
      ctx.closePath(); ctx.fill();
    }

    // Demo obstacles
    const bs = 40;
    const demoObs = [
      { type: 'spike', x: 200 }, { type: 'spike', x: 350 }, { type: 'spike', x: 380 },
      { type: 'block', x: 520, w: 2, h: 2 }, { type: 'spike', x: 680 },
      { type: 'spike', x: 710 }, { type: 'spike', x: 740 },
      { type: 'block', x: 880, w: 1, h: 2 }, { type: 'spike', x: 1020 },
      { type: 'spike', x: 1050 }, { type: 'block', x: 1200, w: 3, h: 2 },
      { type: 'spike', x: 1400 }, { type: 'spike', x: 1430 }, { type: 'spike', x: 1460 },
    ];

    const repeat = 1600;
    for (const ob of demoObs) {
      let ox = ((ob.x - scrollOffset) % repeat + repeat) % repeat - 100;
      if (ox > w + 100) continue;
      if (ob.type === 'spike') {
        ctx.fillStyle = `hsl(${hue + 60}, 100%, 90%)`;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(ox + bs / 2, gy - bs); ctx.lineTo(ox + bs, gy); ctx.lineTo(ox, gy);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        const bw = (ob.w || 1) * bs, bh = (ob.h || 1) * bs;
        ctx.fillStyle = `hsl(${hue + 30}, 70%, 20%)`;
        ctx.fillRect(ox, gy - bh, bw, bh);
        ctx.strokeStyle = `hsl(${hue}, 100%, 55%)`;
        ctx.shadowColor = `hsl(${hue}, 100%, 55%)`;
        ctx.shadowBlur = 6;
        ctx.lineWidth = 2;
        ctx.strokeRect(ox, gy - bh, bw, bh);
        ctx.shadowBlur = 0;
      }
    }

    // Demo player
    const playerX = w * 0.15;
    const jumpCycle = Math.sin(scrollOffset * 0.02) * 0.5 + 0.5;
    const playerY = gy - 34 - jumpCycle * 80;
    const rot = scrollOffset * 0.02;

    ctx.save();
    ctx.translate(playerX + 17, playerY + 17);
    ctx.rotate(jumpCycle > 0.1 ? rot : Math.round(rot / (Math.PI / 2)) * (Math.PI / 2));
    ctx.shadowColor = `hsl(${hue + 120}, 100%, 60%)`;
    ctx.shadowBlur = 12;
    ctx.fillStyle = `hsl(${hue + 120}, 80%, 55%)`;
    ctx.fillRect(-17, -17, 34, 34);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `hsl(${hue + 120}, 100%, 75%)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-17, -17, 34, 34);
    const inner = 17;
    ctx.fillStyle = `hsl(${hue + 120}, 90%, 25%)`;
    ctx.fillRect(-inner / 2, -inner / 2, inner, inner);
    ctx.strokeStyle = `hsl(${hue + 120}, 80%, 55%)`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-inner / 2, -inner / 2, inner, inner);
    ctx.fillStyle = '#fff'; ctx.fillRect(2, -6, 7, 7);
    ctx.fillStyle = '#000'; ctx.fillRect(5, -4, 3, 3);
    ctx.restore();

    // Trail
    for (let i = 0; i < 8; i++) {
      const trailX = playerX + 17 - i * 12;
      const trailJump = Math.sin((scrollOffset - i * 6) * 0.02) * 0.5 + 0.5;
      const trailY = gy - 34 - trailJump * 80 + 17;
      const alpha = (1 - i / 8) * 0.3;
      const size = 34 * (1 - i / 8) * 0.35;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${hue + 120 + i * 10}, 100%, 60%)`;
      ctx.fillRect(trailX - size / 2, trailY - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  handleInput(type) {
    if (type === 'down') {
      this.jumpPressed = true;
      this.jumpHeld = true;
    } else if (type === 'up') {
      this.jumpHeld = false;
    }
  }
}
