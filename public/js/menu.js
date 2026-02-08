/**
 * PorterDash Menu System
 * Handles menu navigation, level select, and overlays
 */

class MenuSystem {
  constructor() {
    this.menuOverlay = document.getElementById('menu-overlay');
    this.levelOverlay = document.getElementById('level-overlay');
    this.hud = document.getElementById('hud');
    this.deathOverlay = document.getElementById('death-overlay');
    this.completeOverlay = document.getElementById('complete-overlay');
    this.pauseOverlay = document.getElementById('pause-overlay');

    this.progressBar = document.getElementById('progress-bar');
    this.progressText = document.getElementById('progress-text');
    this.levelLabel = document.getElementById('level-label');
    this.deathProgress = document.getElementById('death-progress');
    this.completeStars = document.getElementById('complete-stars');

    // Level progress tracking
    this.progress = this.loadProgress();

    // Build level grid
    this.buildLevelGrid();
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem('porterdash_progress');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { completed: {}, attempts: {} };
  }

  saveProgress() {
    try {
      localStorage.setItem('porterdash_progress', JSON.stringify(this.progress));
    } catch (e) {}
  }

  /**
   * Generate a mini preview thumbnail for a level using an offscreen canvas
   */
  generateThumbnail(levelIndex) {
    const level = LEVELS[levelIndex];
    const colors = level.colors;
    const w = 140;
    const h = 100;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, colors.bg1);
    grad.addColorStop(1, colors.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = colors.gridLines;
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 15) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Background shapes
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = colors.bgShapes;
    for (let i = 0; i < 5; i++) {
      const sx = Math.random() * w;
      const sy = Math.random() * h * 0.6;
      const sw = 15 + Math.random() * 30;
      const sh = 10 + Math.random() * 20;
      ctx.fillRect(sx, sy, sw, sh);
    }
    ctx.globalAlpha = 1;

    // Ground
    const gy = h * 0.78;
    ctx.fillStyle = colors.ground;
    ctx.fillRect(0, gy, w, h - gy);

    // Ground line glow
    ctx.strokeStyle = colors.accent1;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = colors.accent1;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ground spikes decoration
    ctx.fillStyle = colors.groundAccent;
    const spikeW = 6;
    for (let x = 0; x < w; x += spikeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + spikeW, gy - 4);
      ctx.lineTo(x + spikeW * 2, gy);
      ctx.closePath();
      ctx.fill();
    }

    // Mini obstacles (first few from level)
    const bs = 10; // mini block size
    let obsDrawn = 0;
    for (const ob of level.obstacles) {
      if (obsDrawn >= 6) break;
      const ox = 15 + ob.x * 2.2;
      if (ox > w - 10) break;

      if (ob.type === 'spike' || ob.type === 'double_spike' || ob.type === 'triple_spike') {
        const count = ob.type === 'triple_spike' ? 3 : ob.type === 'double_spike' ? 2 : 1;
        for (let k = 0; k < count; k++) {
          ctx.fillStyle = colors.spike;
          ctx.shadowColor = colors.accent1;
          ctx.shadowBlur = 3;
          ctx.beginPath();
          ctx.moveTo(ox + k * bs + bs / 2, gy - bs);
          ctx.lineTo(ox + k * bs + bs, gy);
          ctx.lineTo(ox + k * bs, gy);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        obsDrawn++;
      } else if (ob.type === 'block' || ob.type === 'spike_block') {
        const bw = (ob.w || 1) * bs;
        const bh = (ob.h || 1) * bs;
        ctx.fillStyle = colors.block;
        ctx.fillRect(ox, gy - bh, bw, bh);
        ctx.strokeStyle = colors.blockBorder;
        ctx.shadowColor = colors.blockBorder;
        ctx.shadowBlur = 3;
        ctx.lineWidth = 1;
        ctx.strokeRect(ox, gy - bh, bw, bh);
        ctx.shadowBlur = 0;
        obsDrawn++;
      } else if (ob.type === 'portal') {
        ctx.strokeStyle = colors.portal;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = colors.portal;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.ellipse(ox + bs, gy - bs * 1.5, bs * 0.8, bs * 1.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        obsDrawn++;
      }
    }

    // Mini player cube
    const playerX = 8;
    const playerY = gy - bs - 1;
    ctx.fillStyle = '#44ff44';
    ctx.shadowColor = colors.accent1;
    ctx.shadowBlur = 4;
    ctx.fillRect(playerX, playerY, bs, bs);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#88ff88';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(playerX, playerY, bs, bs);

    // Inner detail on player
    ctx.fillStyle = '#116611';
    ctx.fillRect(playerX + 3, playerY + 3, bs - 6, bs - 6);

    // Subtle vignette
    const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // Level number overlay
    ctx.font = 'bold 28px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Number shadow/glow
    ctx.shadowColor = colors.accent1;
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(levelIndex + 1, w / 2, h / 2 - 4);
    ctx.shadowBlur = 0;

    // Level name underneath
    ctx.font = 'bold 7px Orbitron, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(level.name.toUpperCase(), w / 2, h / 2 + 14);

    return canvas.toDataURL();
  }

  buildLevelGrid() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';

    for (let i = 0; i < LEVELS.length; i++) {
      const btn = document.createElement('button');
      btn.className = 'level-btn';
      btn.dataset.level = i;

      // Generate and use thumbnail
      const thumb = document.createElement('img');
      thumb.src = this.generateThumbnail(i);
      thumb.className = 'level-thumb';
      thumb.draggable = false;
      btn.appendChild(thumb);

      if (this.progress.completed[i]) {
        btn.classList.add('completed');
        const stars = document.createElement('span');
        stars.className = 'level-stars';
        stars.textContent = this.getStarDisplay(this.progress.completed[i]);
        btn.appendChild(stars);
      }

      // All levels are always available - no locking
      grid.appendChild(btn);
    }
  }

  getStarDisplay(stars) {
    const filled = '\u2605';
    const empty = '\u2606';
    return filled.repeat(Math.min(stars, 3)) + empty.repeat(Math.max(0, 3 - stars));
  }

  showMenu() {
    this.menuOverlay.classList.remove('hidden');
    this.levelOverlay.classList.add('hidden');
    this.hud.classList.add('hidden');
    this.deathOverlay.classList.add('hidden');
    this.completeOverlay.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');
  }

  showLevels() {
    this.buildLevelGrid();
    this.menuOverlay.classList.add('hidden');
    this.levelOverlay.classList.remove('hidden');
  }

  showGame(levelIndex) {
    this.menuOverlay.classList.add('hidden');
    this.levelOverlay.classList.add('hidden');
    this.hud.classList.remove('hidden');
    this.deathOverlay.classList.add('hidden');
    this.completeOverlay.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');

    this.levelLabel.textContent = `Level ${levelIndex + 1}: ${LEVELS[levelIndex].name}`;
  }

  showDeath(progress) {
    this.deathOverlay.classList.remove('hidden');
    this.deathProgress.textContent = `Progress: ${Math.floor(progress * 100)}%`;
  }

  showComplete(levelIndex) {
    this.completeOverlay.classList.remove('hidden');

    // Calculate stars based on attempts
    const attempts = (this.progress.attempts[levelIndex] || 0) + 1;
    let stars = 3;
    if (attempts > 5) stars = 2;
    if (attempts > 15) stars = 1;

    this.completeStars.textContent = this.getStarDisplay(stars);

    // Save progress
    if (!this.progress.completed[levelIndex] || this.progress.completed[levelIndex] < stars) {
      this.progress.completed[levelIndex] = stars;
    }
    this.saveProgress();
  }

  showPause() {
    this.pauseOverlay.classList.remove('hidden');
  }

  hidePause() {
    this.pauseOverlay.classList.add('hidden');
  }

  updateHUD(progress) {
    const pct = Math.floor(progress * 100);
    this.progressBar.style.width = `${pct}%`;
    this.progressText.textContent = `${pct}%`;
  }

  recordAttempt(levelIndex) {
    if (!this.progress.attempts[levelIndex]) {
      this.progress.attempts[levelIndex] = 0;
    }
    this.progress.attempts[levelIndex]++;
    this.saveProgress();
  }

  isLevelUnlocked() {
    return true; // All levels are always available
  }
}
