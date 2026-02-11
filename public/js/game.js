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
  let lastFrameTime = performance.now();
  let demoInitialized = false;

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
    if (currentScreen === 'dead') {
      if (e.code === 'Escape') returnToMenu();
      else retryLevel();
      return;
    }
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

  const deathOverlay = document.getElementById('death-overlay');
  if (deathOverlay) {
    deathOverlay.addEventListener('click', (e) => {
      if (currentScreen !== 'dead') return;
      if (e.target.id === 'death-overlay') retryLevel();
    });
  }
  const respawnCheckpointBtn = document.getElementById('respawn-checkpoint-btn');
  if (respawnCheckpointBtn) {
    respawnCheckpointBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentScreen !== 'dead' || !engine.hasCheckpoint()) return;
      engine.respawnAtCheckpoint();
      currentScreen = 'playing';
      menu.hideDeath();
    });
  }
  const deathRetryBtn = document.getElementById('death-retry-btn');
  if (deathRetryBtn) {
    deathRetryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentScreen === 'dead') retryLevel();
    });
  }

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
    demoInitialized = false;
    menu.showMenu();
    sound.stopMusic();
  }

  // ---- Demo AI ----

  function demoAI(eng) {
    const p = eng.player;
    const bs = eng.BLOCK_SIZE;
    const scrollX = eng.scrollX;
    const playerWorldX = scrollX + p.x + p.width / 2;

    // In flight mode: steer toward exit portal
    if (p.flightMode) {
      let targetY = eng.displayHeight * 0.35; // default: fly mid-high
      // Look for exit portal
      for (const ob of eng.obstacles) {
        if (ob.type === 'portal_fly_end') {
          const dist = ob.x - playerWorldX;
          if (dist > -bs && dist < bs * 20) {
            // Steer toward the exit portal's center Y
            targetY = ob.y + ob.h / 2;
            break;
          }
        }
      }
      if (p.y + p.height / 2 > targetY + 5) {
        eng.jumpHeld = true; // fly up
      } else {
        eng.jumpHeld = false; // descend
      }
      return;
    }

    // Normal mode: look ahead for obstacles and decide when to jump
    const lookAhead = bs * 6; // how far ahead to scan
    let shouldJump = false;

    for (const ob of eng.obstacles) {
      const obScreenX = ob.x - scrollX;
      const dist = obScreenX - p.x;

      // Only care about obstacles ahead and close
      if (dist < -bs || dist > lookAhead) continue;

      // Jump for deadly obstacles (spikes, flame pits)
      if (ob.deadly && dist > -bs * 0.5 && dist < bs * 3.5) {
        shouldJump = true;
        break;
      }

      // Jump for blocks (non-deadly) that are in the way
      if (ob.type === 'block' && !ob.isPlatform && dist > 0 && dist < bs * 3) {
        if (ob.y < p.y + p.height) {
          shouldJump = true;
          break;
        }
      }
    }

    // Also jump over gaps in the ground
    const aheadWorldX = playerWorldX + bs * 2;
    const groundAhead = eng.getGroundY(aheadWorldX);
    if (groundAhead == null && p.onGround) {
      shouldJump = true;
    }

    // Check for hill peaks - don't jump unnecessarily on hills
    // Just let the player ride the terrain naturally

    if (shouldJump && p.onGround) {
      eng.jumpPressed = true;
      eng.jumpHeld = true;
    } else if (shouldJump && !p.onGround && !p.hasDoubleJumped) {
      // Double jump if still in danger
      let stillInDanger = false;
      for (const ob of eng.obstacles) {
        if (!ob.deadly) continue;
        const obScreenX = ob.x - scrollX;
        const dist = obScreenX - p.x;
        if (dist > -bs && dist < bs * 2 && p.y + p.height > ob.y) {
          stillInDanger = true;
          break;
        }
      }
      if (stillInDanger) {
        eng.jumpPressed = true;
        eng.jumpHeld = true;
      } else {
        eng.jumpPressed = false;
        eng.jumpHeld = false;
      }
    } else {
      eng.jumpPressed = false;
      eng.jumpHeld = false;
    }
  }

  // ---- Main Loop ----

  function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    const t = now != null ? now : performance.now();
    engine.deltaTime = t - lastFrameTime;
    lastFrameTime = t;

    if (currentScreen === 'menu' || currentScreen === 'levels') {
      // Animated demo: AI-controlled player running through the level
      if (!demoInitialized || !engine.level) {
        engine.loadLevel(0);
        engine.state = 'playing';
        demoInitialized = true;
      }
      // Reset demo if player died, completed, or scrolled past level
      if (engine.state === 'dead' || engine.state === 'complete' || engine.state === 'boarding' ||
          engine.state === 'takeoff' || engine.getProgress() >= 0.95) {
        engine.loadLevel(0);
        engine.state = 'playing';
      }

      // AI input: look ahead and decide actions
      demoAI(engine);

      engine.update();
      // If the AI caused death, just reset immediately
      if (engine.state === 'dead' || engine.state === 'dying') {
        engine.loadLevel(0);
        engine.state = 'playing';
      }
      engine.draw();
    } else if (currentScreen === 'playing') {
      engine.update();
      engine.draw();
      menu.updateHUD(engine.getProgress(), engine);

      if (engine.state === 'dead') {
        currentScreen = 'dead';
        menu.showDeath(engine.deathProgress, engine);
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
