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
    return { unlocked: 1, completed: {}, attempts: {} };
  }

  saveProgress() {
    try {
      localStorage.setItem('porterdash_progress', JSON.stringify(this.progress));
    } catch (e) {}
  }

  buildLevelGrid() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';

    for (let i = 0; i < LEVELS.length; i++) {
      const btn = document.createElement('button');
      btn.className = 'level-btn';
      btn.dataset.level = i;

      const numSpan = document.createElement('span');
      numSpan.textContent = i + 1;
      btn.appendChild(numSpan);

      if (this.progress.completed[i]) {
        btn.classList.add('completed');
        const stars = document.createElement('span');
        stars.className = 'level-stars';
        stars.textContent = this.getStarDisplay(this.progress.completed[i]);
        btn.appendChild(stars);
      }

      if (i >= this.progress.unlocked && !this.progress.completed[i]) {
        btn.classList.add('locked');
      }

      grid.appendChild(btn);
    }
  }

  getStarDisplay(stars) {
    const filled = '★';
    const empty = '☆';
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
    if (levelIndex + 1 >= this.progress.unlocked) {
      this.progress.unlocked = Math.min(levelIndex + 2, LEVELS.length);
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

  isLevelUnlocked(index) {
    return index < this.progress.unlocked || this.progress.completed[index];
  }
}
