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

    this.buildObstacles();
    this.bg.init(this.level.colors, this.level.bgCreatures);
  }

  buildObstacles() {
    this.obstacles = [];
    const bs = this.BLOCK_SIZE;
    const maxH = this.MAX_OBSTACLE_HEIGHT * bs;

    for (const ob of this.level.obstacles) {
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
        case 'spike_up':
          this.obstacles.push({
            type: 'spike_up', x: baseX,
            y: 0, w: bs, h: bs, deadly: true,
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

  update() {
    if (this.state !== 'playing') return;

    this.time++;
    if (this.level.rainbow) {
      this.rainbowHue = (this.rainbowHue + 0.5) % 360;
    }

    // Scroll
    this.scrollX += this.speed;

    // Check level complete
    if (this.getProgress() >= 1) {
      this.state = 'complete';
      sound.playComplete();
      sound.stopMusic();
      return;
    }

    const p = this.player;

    // Jump / Double Jump
    if (this.jumpPressed) {
      if (p.onGround) {
        // Normal jump
        p.vy = this.JUMP_FORCE;
        p.onGround = false;
        p.hasDoubleJumped = false;
        this.spawnGroundParticles(p.x + p.width / 2, p.y + p.height, 5);
        sound.playJump();
      } else if (!p.hasDoubleJumped) {
        // Double jump (available once per air time)
        p.vy = this.DOUBLE_JUMP_FORCE;
        p.hasDoubleJumped = true;
        this.doubleJumpFlash = 8;
        this.spawnDoubleJumpParticles(p.x + p.width / 2, p.y + p.height / 2);
        sound.playDoubleJump();
      }
    }
    this.jumpPressed = false;

    // Gravity
    p.vy += this.GRAVITY;
    p.y += p.vy;

    // Reset onGround each frame
    const wasOnGround = p.onGround;
    p.onGround = false;

    // Ground collision
    if (p.y + p.height >= this.groundY) {
      p.y = this.groundY - p.height;
      p.vy = 0;
      if (!wasOnGround) {
        this.spawnGroundParticles(p.x + p.width / 2, this.groundY, 3);
        sound.playLand();
      }
      p.onGround = true;
      p.hasDoubleJumped = false;
    }

    // Rotation (spins in air, ~90deg per jump)
    if (!p.onGround) {
      p.rotation += 0.12;
    } else {
      p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
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

    this.bg.update(this.speed);
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

      if (ob.type === 'portal') {
        if (Math.abs(ox + ob.w / 2 - (p.x + p.width / 2)) < ob.w * 0.7) {
          this.spawnPortalEffect(ox + ob.w / 2, ob.y + ob.h / 2);
        }
        continue;
      }

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
    if (Math.random() > 0.3) return;
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

    if (rainbowHue !== undefined) {
      ctx.fillStyle = `hsl(${rainbowHue}, 80%, 45%)`;
    } else {
      ctx.fillStyle = colors.ground;
    }
    ctx.fillRect(0, this.groundY, w, h - this.groundY);

    const glowColor = rainbowHue !== undefined
      ? `hsl(${rainbowHue}, 100%, 60%)` : colors.accent1;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(w, this.groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ground grid
    ctx.strokeStyle = rainbowHue !== undefined
      ? `hsla(${rainbowHue}, 60%, 30%, 0.3)` : colors.groundAccent + '44';
    ctx.lineWidth = 1;
    const bs = this.BLOCK_SIZE;
    const offset = this.scrollX % bs;
    for (let x = -offset; x < w; x += bs) {
      ctx.beginPath(); ctx.moveTo(x, this.groundY); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = this.groundY; y < h; y += bs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Spike decorations
    const spikeH = 12, spikeW = 16;
    const sOff = this.scrollX % (spikeW * 2);
    ctx.fillStyle = rainbowHue !== undefined
      ? `hsl(${rainbowHue}, 70%, 25%)` : colors.groundAccent;
    for (let x = -sOff - spikeW; x < w + spikeW; x += spikeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.lineTo(x + spikeW, this.groundY - spikeH);
      ctx.lineTo(x + spikeW * 2, this.groundY);
      ctx.closePath();
      ctx.fill();
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
        case 'portal': this.drawPortal(ctx, ox, ob.y, ob.w, ob.h, colors, rainbowHue); break;
      }
    }
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

  drawPortal(ctx, x, y, w, h, colors, rainbowHue) {
    const cx = x + w / 2, cy = y + h / 2;
    const rx = w * 0.8, ry = h * 0.4;
    const pulse = Math.sin(this.time * 0.05) * 0.15 + 0.85;
    const portalColor = rainbowHue !== undefined
      ? `hsl(${rainbowHue + 120}, 100%, 60%)` : colors.portal;

    ctx.strokeStyle = portalColor;
    ctx.lineWidth = 4;
    ctx.shadowColor = portalColor;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.7 * pulse, ry * 0.7 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * 0.5);
    grad.addColorStop(0, portalColor.replace(')', ', 0.3)').replace('hsl', 'hsla').replace('rgb', 'rgba'));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.5 * pulse, ry * 0.5 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 6; i++) {
      const angle = this.time * 0.03 + (i * Math.PI * 2) / 6;
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * rx * 0.65 * pulse, cy + Math.sin(angle) * ry * 0.65 * pulse, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawPlayer(rainbowHue) {
    const ctx = this.ctx;
    const p = this.player;
    const colors = this.level.colors;

    // Trail
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      const alpha = (1 - t.age / 20) * 0.4;
      if (alpha <= 0) continue;
      const size = p.width * (1 - t.age / 20) * 0.4;
      const trailColor = rainbowHue !== undefined
        ? `hsla(${rainbowHue + i * 10}, 100%, 60%, ${alpha})` : colors.accent1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = trailColor;
      ctx.fillRect(t.x - size / 2, t.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;

    // Player body
    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
    ctx.rotate(p.rotation);

    const half = p.width / 2;

    // Double jump flash effect
    if (this.doubleJumpFlash > 0) {
      const flashAlpha = this.doubleJumpFlash / 8;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 25 * flashAlpha;
    }

    // Glow
    const glowColor = rainbowHue !== undefined
      ? `hsl(${rainbowHue}, 100%, 60%)` : colors.accent1;
    if (this.doubleJumpFlash <= 0) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;
    }

    // Body
    ctx.fillStyle = rainbowHue !== undefined
      ? `hsl(${rainbowHue + 120}, 80%, 55%)` : '#44ff44';
    ctx.fillRect(-half, -half, p.width, p.height);
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = rainbowHue !== undefined
      ? `hsl(${rainbowHue + 120}, 100%, 75%)` : '#88ff88';
    ctx.lineWidth = 2;
    ctx.strokeRect(-half, -half, p.width, p.height);

    // Inner square
    const innerSize = p.width * 0.5;
    ctx.fillStyle = rainbowHue !== undefined
      ? `hsl(${rainbowHue + 120}, 90%, 25%)` : '#116611';
    ctx.fillRect(-innerSize / 2, -innerSize / 2, innerSize, innerSize);
    ctx.strokeStyle = rainbowHue !== undefined
      ? `hsl(${rainbowHue + 120}, 80%, 55%)` : '#44ff44';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-innerSize / 2, -innerSize / 2, innerSize, innerSize);

    // Eye
    ctx.fillStyle = '#fff';
    ctx.fillRect(2, -6, 7, 7);
    ctx.fillStyle = '#000';
    ctx.fillRect(5, -4, 3, 3);

    // Double jump available indicator (small glow dot when in air and can double jump)
    if (!p.onGround && !p.hasDoubleJumped) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(0, half + 5, 3, 0, Math.PI * 2);
      ctx.fill();
    }

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
