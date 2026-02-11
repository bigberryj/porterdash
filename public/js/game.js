/**
 * PorterDash Main Game Controller
 * Ties together engine, menu, sound, and input handling
 */

(function () {
  const canvas = document.getElementById('gameCanvas');
  const engine = new GameEngine(canvas);
  const menu = new MenuSystem();

  let currentScreen = 'menu';
  let currentLevel = 0;
  let demoScroll = 0;
  let demoHue = 0;

  // ---- Sound init on first interaction ----
  function initSound() {
    sound.init();
    sound.resume();
  }

  // ---- Input Handling ----

  function onInputDown(e) {
    if (e) e.preventDefault();
    initSound();

    if (currentScreen === 'dead') {
      retryLevel();
      return;
    }
    if (currentScreen === 'playing') {
      engine.handleInput('down');
    }
  }

  function onInputUp(e) {
    if (currentScreen === 'playing') {
      engine.handleInput('up');
    }
  }

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    initSound();
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      onInputDown(e);
    }
    if (e.code === 'Escape') {
      if (currentScreen === 'playing') pauseGame();
      else if (currentScreen === 'paused') resumeGame();
      else if (currentScreen === 'dead') returnToMenu();
    }
    if (e.code === 'KeyR') {
      if (currentScreen === 'playing' || currentScreen === 'dead' || currentScreen === 'paused') {
        retryLevel();
      }
    }
    if (e.code === 'KeyM') {
      const on = sound.toggleMusic();
      updateSoundButton();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      onInputUp(e);
    }
  });

  // Mouse / Touch
  canvas.addEventListener('mousedown', onInputDown);
  canvas.addEventListener('mouseup', onInputUp);
  canvas.addEventListener('touchstart', onInputDown, { passive: false });
  canvas.addEventListener('touchend', onInputUp, { passive: false });

  // Resize
  window.addEventListener('resize', () => {
    engine.resize();
    if (engine.level) {
      engine.groundY = engine.displayHeight * (1 - engine.GROUND_HEIGHT_RATIO);
      engine.buildObstacles();
    }
  });

  // ---- Sound Toggle Button ----
  const soundBtn = document.getElementById('sound-btn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      initSound();
      sound.toggleSound();
      updateSoundButton();
    });
  }

  function updateSoundButton() {
    if (soundBtn) {
      soundBtn.textContent = sound.enabled ? '\u266A' : '\u2716';
      soundBtn.title = sound.enabled ? 'Sound ON (click to mute)' : 'Sound OFF (click to unmute)';
    }
  }

  // ---- Menu Button Handlers ----

  document.getElementById('play-btn').addEventListener('click', () => {
    initSound();
    let target = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      if (!menu.progress.completed[i]) { target = i; break; }
      target = i;
    }
    startLevel(target);
  });

  document.getElementById('levels-btn').addEventListener('click', () => {
    initSound();
    currentScreen = 'levels';
    menu.showLevels();
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    currentScreen = 'menu';
    menu.showMenu();
  });

  document.getElementById('level-grid').addEventListener('click', (e) => {
    initSound();
    const btn = e.target.closest('.level-btn');
    if (!btn) return;
    const idx = parseInt(btn.dataset.level);
    startLevel(idx);
  });

  document.getElementById('menu-btn').addEventListener('click', () => {
    initSound();
    returnToMenu();
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    const next = currentLevel + 1;
    if (next < LEVELS.length) startLevel(next);
    else returnToMenu();
  });
  document.getElementById('complete-menu-btn').addEventListener('click', returnToMenu);

  document.getElementById('pause-btn').addEventListener('click', pauseGame);
  document.getElementById('resume-btn').addEventListener('click', resumeGame);
  document.getElementById('pause-retry-btn').addEventListener('click', () => {
    menu.hidePause();
    retryLevel();
  });
  document.getElementById('pause-menu-btn').addEventListener('click', () => {
    menu.hidePause();
    returnToMenu();
  });

  // ---- Game Flow ----

  function startLevel(index) {
    currentLevel = index;
    currentScreen = 'playing';
    engine.loadLevel(index);
    menu.showGame(index);
    sound.startMusic(LEVELS[index].speed, index);
  }

  function retryLevel() {
    menu.recordAttempt(currentLevel);
    startLevel(currentLevel);
  }

  function pauseGame() {
    if (currentScreen !== 'playing') return;
    currentScreen = 'paused';
    menu.showPause();
    sound.stopMusic();
  }

  function resumeGame() {
    currentScreen = 'playing';
    menu.hidePause();
    sound.startMusic(LEVELS[currentLevel].speed, currentLevel);
  }

  function returnToMenu() {
    currentScreen = 'menu';
    engine.state = 'idle';
    engine.loadLevel(0);
    menu.showMenu();
    sound.stopMusic();
  }

  // ---- Main Loop ----

  function gameLoop() {
    requestAnimationFrame(gameLoop);

    if (currentScreen === 'menu' || currentScreen === 'levels') {
      if (!engine.level) engine.loadLevel(0);
      demoScroll += 3;
      engine.scrollX = demoScroll;
      engine.time++;
      if (engine.bg && engine.bg.update) engine.bg.update(engine.speed || 6, engine.scrollX);
      engine.updateEffects();
      engine.draw();
    } else if (currentScreen === 'playing') {
      engine.update();
      engine.draw();
      menu.updateHUD(engine.getProgress(), engine);

      if (engine.state === 'dead') {
        currentScreen = 'dead';
        menu.showDeath(engine.deathProgress);
        menu.recordAttempt(currentLevel);
      } else if (engine.state === 'complete') {
        currentScreen = 'complete';
        menu.showComplete(currentLevel, engine);
      }
    } else if (currentScreen === 'paused') {
      engine.draw();
    } else if (currentScreen === 'dead' || currentScreen === 'complete') {
      engine.updateEffects();
      engine.draw();
    }
  }

  // ---- Init ----
  menu.showMenu();
  updateSoundButton();
  gameLoop();
})();
