/**
 * PorterDash Main Game Controller
 * Ties together engine, menu, and input handling
 */

(function () {
  const canvas = document.getElementById('gameCanvas');
  const engine = new GameEngine(canvas);
  const menu = new MenuSystem();

  let currentScreen = 'menu'; // menu, levels, playing, dead, complete, paused
  let currentLevel = 0;
  let demoScroll = 0;
  let demoHue = 0;
  let animFrame = null;

  // ---- Input Handling ----

  function onInputDown(e) {
    if (e) e.preventDefault();

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
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      onInputDown(e);
    }
    if (e.code === 'Escape') {
      if (currentScreen === 'playing') {
        pauseGame();
      } else if (currentScreen === 'paused') {
        resumeGame();
      }
    }
    if (e.code === 'KeyR') {
      if (currentScreen === 'playing' || currentScreen === 'dead' || currentScreen === 'paused') {
        retryLevel();
      }
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

  // ---- Menu Button Handlers ----

  document.getElementById('play-btn').addEventListener('click', () => {
    // Find first unlocked unfinished level, or first unlocked
    let target = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      if (menu.isLevelUnlocked(i) && !menu.progress.completed[i]) {
        target = i;
        break;
      }
      if (menu.isLevelUnlocked(i)) target = i;
    }
    startLevel(target);
  });

  document.getElementById('levels-btn').addEventListener('click', () => {
    currentScreen = 'levels';
    menu.showLevels();
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    currentScreen = 'menu';
    menu.showMenu();
  });

  // Level grid click
  document.getElementById('level-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.level-btn');
    if (!btn) return;
    const idx = parseInt(btn.dataset.level);
    if (!menu.isLevelUnlocked(idx)) return;
    startLevel(idx);
  });

  // Death buttons
  document.getElementById('retry-btn').addEventListener('click', retryLevel);
  document.getElementById('menu-return-btn').addEventListener('click', returnToMenu);

  // Complete buttons
  document.getElementById('next-btn').addEventListener('click', () => {
    const next = currentLevel + 1;
    if (next < LEVELS.length) {
      startLevel(next);
    } else {
      returnToMenu();
    }
  });
  document.getElementById('complete-menu-btn').addEventListener('click', returnToMenu);

  // Pause buttons
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
  }

  function retryLevel() {
    menu.recordAttempt(currentLevel);
    startLevel(currentLevel);
  }

  function pauseGame() {
    if (currentScreen !== 'playing') return;
    currentScreen = 'paused';
    menu.showPause();
  }

  function resumeGame() {
    currentScreen = 'playing';
    menu.hidePause();
  }

  function returnToMenu() {
    currentScreen = 'menu';
    engine.state = 'idle';
    menu.showMenu();
  }

  // ---- Main Loop ----

  function gameLoop() {
    animFrame = requestAnimationFrame(gameLoop);

    if (currentScreen === 'menu' || currentScreen === 'levels') {
      // Demo background
      demoScroll += 3;
      demoHue = (demoHue + 0.3) % 360;
      engine.drawDemo(demoScroll, demoHue);
    } else if (currentScreen === 'playing') {
      engine.update();
      engine.draw();
      menu.updateHUD(engine.getProgress());

      // Check state transitions
      if (engine.state === 'dead') {
        currentScreen = 'dead';
        menu.showDeath(engine.deathProgress);
        menu.recordAttempt(currentLevel);
      } else if (engine.state === 'complete') {
        currentScreen = 'complete';
        menu.showComplete(currentLevel);
      }
    } else if (currentScreen === 'paused') {
      // Still draw but don't update
      engine.draw();
    } else if (currentScreen === 'dead' || currentScreen === 'complete') {
      // Keep drawing (with effects fading)
      engine.updateEffects();
      engine.draw();
    }
  }

  // ---- Init ----
  menu.showMenu();
  gameLoop();
})();
