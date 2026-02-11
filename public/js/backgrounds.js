/**
 * PorterDash Background System v2
 * Animated backgrounds with parallax layers, pixel creatures,
 * mountains, giant robots, cave environments, flashing elements
 */

class BackgroundSystem {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.particles = [];
    this.bgShapes = [];
    this.creatures = [];
    this.mountains = [];
    this.robots = [];
    this.fallingDebris = [];
    this.stalactites = [];
    this.flashElements = [];
    this.laserBeams = [];
    this.lightStreaks = [];
    this.segmentedLayers = [];
    this.nebulaClouds = [];
    this.driftingClouds = [];
    this.distantPlanet = null;
    this.flowLines = [];
    this.bottomWavePhase = 0;
    this.scrollX = 0;
    this.gridOffset = 0;
    this.time = 0;
    this.pulsePhase = 0;
    this.bgTheme = 'default';
    this.flashTimer = 0;
    this.screenFlash = 0;
    this._gridCache = null;
    this._gridCacheCtx = null;
    this._lastGridBucket = -999;
    this._lastGridRainbow = undefined;
    this._GRID_CACHE_BUCKET = 24;
  }

  init(colors, creatureTypes, bgTheme) {
    this.colors = colors;
    this.bgTheme = bgTheme || 'default';
    this.particles = [];
    this.bgShapes = [];
    this.creatures = [];
    this.mountains = [];
    this.robots = [];
    this.fallingDebris = [];
    this.stalactites = [];
    this.flashElements = [];
    this.laserBeams = [];
    this.lightStreaks = [];
    this.segmentedLayers = [];
    this.nebulaClouds = [];
    this.driftingClouds = [];
    this.distantPlanet = null;
    this.flowLines = [];
    this.bottomWavePhase = 0;
    this.scrollX = 0;
    this.flashTimer = 0;
    this.screenFlash = 0;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Nebula / glowing cloud layers (cosmic reference - multiple parallax blobs)
    this.initNebulaClouds(w, h);
    // Drifting soft clouds (horizon / alien sky)
    this.initDriftingClouds(w, h);
    // Flowing horizon lines (energy / lava / wireframe feel)
    this.initFlowLines(w, h);

    // Vertical light streaks (digital rain / energy streams) - Geometry Dash style
    const streakCount = 50 + Math.floor(Math.random() * 30);
    for (let i = 0; i < streakCount; i++) {
      this.lightStreaks.push({
        x: Math.random() * w * 1.3,
        y: Math.random() * h,
        length: 60 + Math.random() * 140,
        speedY: 1 + Math.random() * 2,
        speedX: -0.15 - Math.random() * 0.35,
        opacity: 0.06 + Math.random() * 0.14,
        width: 0.6 + Math.random() * 1.4,
      });
    }

    // Layered segmented panels (parallax wall - vertical strips for side-scroll)
    for (let layer = 0; layer < 3; layer++) {
      const segmentWidth = 70 + layer * 35 + Math.random() * 35;
      const segmentCount = Math.ceil((w * 1.8) / segmentWidth) + 2;
      this.segmentedLayers.push({
        layer,
        segmentWidth,
        segmentCount,
        speed: 0.1 + layer * 0.07,
        offset: Math.random() * segmentWidth,
        opacity: 0.09 - layer * 0.025,
      });
    }

    // Create background floating shapes (parallax layer)
    for (let i = 0; i < 20; i++) {
      this.bgShapes.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.7,
        w: 30 + Math.random() * 120,
        h: 30 + Math.random() * 80,
        speed: 0.3 + Math.random() * 0.7,
        opacity: 0.03 + Math.random() * 0.08,
        type: Math.random() > 0.5 ? 'rect' : 'diamond',
      });
    }

    // Create ambient particles
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 1 + Math.random() * 3,
        speedX: -0.5 - Math.random() * 1.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: 0.2 + Math.random() * 0.6,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    // Create background creatures (fewer, much bigger for strong silhouette)
    if (creatureTypes) {
      const count = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const type = creatureTypes[Math.floor(Math.random() * creatureTypes.length)];
        this.creatures.push(this.createCreature(type, w, h));
      }
    }

    // Theme-specific initialization
    this.initTheme(w, h);
  }

  initTheme(w, h) {
    const theme = this.bgTheme;

    // Mountains (for mountain, city, and chaos themes)
    if (theme === 'mountains' || theme === 'city' || theme === 'chaos' || theme === 'space') {
      this.initMountains(w, h);
    }

    // Giant robots (for city and chaos themes)
    if (theme === 'city' || theme === 'chaos') {
      this.initRobots(w, h);
    }

    // Cave elements
    if (theme === 'cave' || theme === 'chaos') {
      this.initCave(w, h);
    }

    // Flash elements
    if (theme === 'flash' || theme === 'chaos' || theme === 'city') {
      this.initFlashElements(w, h);
    }

    // Space elements + distant planet/moon
    if (theme === 'space') {
      this.initSpaceElements(w, h);
      this.initDistantPlanet(w, h);
    }
  }

  // ==================== NEBULA / GLOW CLOUDS ====================

  initNebulaClouds(w, h) {
    const layerSpeeds = [0.03, 0.07, 0.12];
    const layerCounts = [4, 4, 3];
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < layerCounts[layer]; i++) {
        this.nebulaClouds.push({
          x: Math.random() * w * 2.5 - w * 0.3,
          y: h * (0.15 + Math.random() * 0.6),
          radiusX: 80 + Math.random() * 180,
          radiusY: 40 + Math.random() * 100,
          speed: layerSpeeds[layer] * (0.7 + Math.random() * 0.6),
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.008 + Math.random() * 0.015,
          layer,
          colorIndex: Math.floor(Math.random() * 2),
          opacity: 0.06 + layer * 0.02 + Math.random() * 0.04,
        });
      }
    }
  }

  initDriftingClouds(w, h) {
    for (let i = 0; i < 8; i++) {
      const baseW = 90 + Math.random() * 140;
      const baseH = 35 + Math.random() * 45;
      const puffs = [];
      const puffCount = 5 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffCount; p++) {
        puffs.push({
          dx: (Math.random() - 0.5) * baseW * 0.9,
          dy: (Math.random() - 0.5) * baseH * 1.2,
          r: baseW * (0.2 + Math.random() * 0.25),
        });
      }
      this.driftingClouds.push({
        x: Math.random() * w * 1.5,
        y: h * (0.12 + Math.random() * 0.48),
        w: baseW,
        h: baseH,
        puffs,
        speed: 0.12 + Math.random() * 0.2,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.008 + Math.random() * 0.015,
        wobbleAmp: 5 + Math.random() * 12,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.12 + Math.random() * 0.1,
      });
    }
  }

  initFlowLines(w, h) {
    const lineCount = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < lineCount; i++) {
      this.flowLines.push({
        y: h * (0.4 + Math.random() * 0.45),
        amplitude: 15 + Math.random() * 40,
        frequency: 0.008 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.04,
        width: 0.8 + Math.random() * 1.5,
        opacity: 0.04 + Math.random() * 0.06,
        layer: Math.floor(Math.random() * 2),
      });
    }
  }

  initDistantPlanet(w, h) {
    this.distantPlanet = {
      x: w * 0.7 + Math.random() * w * 0.5,
      radius: 80 + Math.random() * 120,
      y: h * 0.15 + Math.random() * 0.2 * h,
      speed: 0.02,
      phase: Math.random() * Math.PI * 2,
    };
  }

  // ==================== MOUNTAIN SYSTEM ====================

  initMountains(w, h) {
    const groundY = h * 0.82;
    // 3 parallax mountain layers
    for (let layer = 0; layer < 3; layer++) {
      const peaks = [];
      const peakCount = 5 + layer * 3;
      const layerH = (0.3 - layer * 0.08) * h;
      const baseY = groundY - layer * 20;

      for (let i = 0; i < peakCount + 4; i++) {
        peaks.push({
          x: (i / peakCount) * w * 1.5 - w * 0.2,
          height: layerH * (0.4 + Math.random() * 0.6),
          width: (w / peakCount) * (0.8 + Math.random() * 0.6),
        });
      }

      this.mountains.push({
        layer,
        peaks,
        speed: 0.15 + layer * 0.1,
        opacity: 0.28 - layer * 0.06,
        baseY,
        offset: 0,
        totalWidth: w * 1.5,
      });
    }
  }

  // ==================== ROBOT SYSTEM ====================

  initRobots(w, h) {
    const groundY = h * 0.82;
    // 2-3 giant robots walking in background
    const robotCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < robotCount; i++) {
      this.robots.push({
        x: w * 0.3 + Math.random() * w * 1.5,
        y: groundY,
        height: 120 + Math.random() * 100, // giant!
        speed: 0.3 + Math.random() * 0.5,
        direction: -1,
        walkFrame: Math.random() * Math.PI * 2,
        walkSpeed: 0.02 + Math.random() * 0.02,
        opacity: 0.15 + Math.random() * 0.15,
        eyeGlow: 0,
        eyeGlowSpeed: 0.03 + Math.random() * 0.03,
        armSwing: 0,
        type: Math.floor(Math.random() * 3), // 3 robot designs
      });
    }
  }

  // ==================== CAVE SYSTEM ====================

  initCave(w, h) {
    // Stalactites hanging from ceiling
    const stalCount = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < stalCount; i++) {
      this.stalactites.push({
        x: Math.random() * w * 1.5,
        width: 8 + Math.random() * 25,
        height: 40 + Math.random() * 120,
        opacity: 0.15 + Math.random() * 0.2,
        drip: Math.random() * Math.PI * 2,
        dripSpeed: 0.01 + Math.random() * 0.03,
      });
    }

    // Falling debris particles
    for (let i = 0; i < 15; i++) {
      this.fallingDebris.push(this.createDebris(w, h));
    }
  }

  createDebris(w, h) {
    return {
      x: Math.random() * w,
      y: -20 - Math.random() * 200,
      size: 3 + Math.random() * 8,
      speedY: 1 + Math.random() * 3,
      speedX: (Math.random() - 0.5) * 0.5,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.1,
      opacity: 0.2 + Math.random() * 0.4,
      shape: Math.random() > 0.5 ? 'rock' : 'shard',
    };
  }

  // ==================== FLASH ELEMENTS ====================

  initFlashElements(w, h) {
    // Pulsing neon bars
    for (let i = 0; i < 6; i++) {
      this.flashElements.push({
        type: 'neonBar',
        x: Math.random() * w,
        y: 30 + Math.random() * h * 0.5,
        width: 100 + Math.random() * 200,
        height: 2 + Math.random() * 4,
        speed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.03 + Math.random() * 0.05,
        opacity: 0,
      });
    }

    // Laser beams
    for (let i = 0; i < 3; i++) {
      this.laserBeams.push({
        x: w * 0.2 + Math.random() * w * 0.6,
        angle: -0.3 + Math.random() * 0.6,
        width: 1 + Math.random() * 2,
        opacity: 0,
        phase: Math.random() * Math.PI * 2,
        sweepSpeed: 0.005 + Math.random() * 0.01,
        active: false,
        timer: Math.random() * 200,
      });
    }
  }

  // ==================== SPACE ELEMENTS ====================

  initSpaceElements(w, h) {
    // Add extra stars/nebula particles
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.7,
        size: 0.5 + Math.random() * 2,
        speedX: -0.1 - Math.random() * 0.3,
        speedY: 0,
        opacity: 0.3 + Math.random() * 0.7,
        pulse: Math.random() * Math.PI * 2,
        isStar: true,
      });
    }
  }

  createCreature(type, w, h) {
    return {
      type,
      x: w + Math.random() * w * 1.2,
      y: h * 0.15 + Math.random() * (h * 0.5),
      size: 52 + Math.random() * 68,
      speed: 0.8 + Math.random() * 1.5,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.015 + Math.random() * 0.025,
      wobbleAmp: 8 + Math.random() * 20,
      opacity: 0.2 + Math.random() * 0.35,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      frame: 0,
    };
  }

  // ==================== UPDATE ====================

  update(scrollSpeed, scrollX) {
    this.time++;
    this.pulsePhase += 0.02;
    if (scrollX !== undefined) this.scrollX = scrollX;
    this.gridOffset = (this.gridOffset + scrollSpeed * 0.5) % 60;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Update bg shapes
    for (const shape of this.bgShapes) {
      shape.x -= scrollSpeed * shape.speed * 0.3;
      if (shape.x + shape.w < 0) {
        shape.x = w + Math.random() * 200;
        shape.y = Math.random() * h * 0.7;
      }
    }

    // Update particles
    for (const p of this.particles) {
      p.x += p.speedX - scrollSpeed * 0.2;
      p.y += p.speedY;
      p.pulse += 0.05;
      if (p.x < -10) {
        p.x = w + 10;
        p.y = Math.random() * h;
      }
    }

    // Update vertical light streaks (digital rain)
    for (const s of this.lightStreaks) {
      s.y += s.speedY;
      s.x += s.speedX - scrollSpeed * 0.15;
      if (s.y > h + s.length) {
        s.y = -s.length - Math.random() * 80;
        s.x = Math.random() * w * 1.2;
      }
      if (s.x < -20) s.x = w + 20;
      if (s.x > w + 20) s.x = -20;
    }

    // Update segmented layers parallax
    for (const sl of this.segmentedLayers) {
      sl.offset += scrollSpeed * sl.speed;
      if (sl.offset >= sl.segmentWidth) sl.offset -= sl.segmentWidth;
    }

    // Update nebula clouds (parallax)
    for (const n of this.nebulaClouds) {
      n.x -= scrollSpeed * n.speed;
      n.phase += n.pulseSpeed;
      if (n.x + n.radiusX * 2 < 0) {
        n.x = w + n.radiusX + Math.random() * w;
        n.y = h * (0.15 + Math.random() * 0.6);
      }
    }

    // Update drifting clouds
    for (const c of this.driftingClouds) {
      c.x -= scrollSpeed * c.speed;
      c.wobble += c.wobbleSpeed;
      c.phase += 0.01;
      if (c.x + c.w < 0) {
        c.x = w + 50 + Math.random() * w;
        c.y = h * (0.1 + Math.random() * 0.5);
      }
    }

    // Update flow lines (phase only; they're full-width)
    for (const fl of this.flowLines) {
      fl.phase += fl.speed + scrollSpeed * 0.002;
    }

    // Update distant planet (space theme)
    if (this.distantPlanet) {
      this.distantPlanet.x -= scrollSpeed * this.distantPlanet.speed;
      this.distantPlanet.phase += 0.005;
      if (this.distantPlanet.x + this.distantPlanet.radius < 0) {
        this.distantPlanet.x = w + this.distantPlanet.radius + Math.random() * w * 0.5;
      }
    }

    this.bottomWavePhase += 0.02 + scrollSpeed * 0.002;

    // Update creatures
    for (const c of this.creatures) {
      c.x -= c.speed + scrollSpeed * 0.4;
      c.wobble += c.wobbleSpeed;
      c.rotation += c.rotSpeed;
      c.frame++;
      if (c.x < -140) {
        c.x = w + 150 + Math.random() * 350;
        c.y = h * 0.15 + Math.random() * (h * 0.5);
      }
    }

    // Update theme-specific elements
    this.updateTheme(scrollSpeed, w, h);
  }

  updateTheme(scrollSpeed, w, h) {
    // Mountains
    for (const mt of this.mountains) {
      mt.offset += scrollSpeed * mt.speed;
      if (mt.offset > mt.totalWidth / mt.peaks.length) {
        mt.offset -= mt.totalWidth / mt.peaks.length;
      }
    }

    // Robots
    for (const robot of this.robots) {
      robot.x -= robot.speed + scrollSpeed * 0.2;
      robot.walkFrame += robot.walkSpeed;
      robot.eyeGlow = Math.sin(this.time * robot.eyeGlowSpeed) * 0.5 + 0.5;
      robot.armSwing = Math.sin(robot.walkFrame) * 0.4;

      if (robot.x < -200) {
        robot.x = w + 200 + Math.random() * 400;
        robot.height = 120 + Math.random() * 100;
        robot.type = Math.floor(Math.random() * 3);
      }
    }

    // Stalactites scroll
    for (const stal of this.stalactites) {
      stal.x -= scrollSpeed * 0.6;
      stal.drip += stal.dripSpeed;
      if (stal.x < -40) {
        stal.x = w + 40 + Math.random() * 200;
        stal.height = 40 + Math.random() * 120;
        stal.width = 8 + Math.random() * 25;
      }
    }

    // Falling debris
    for (let i = 0; i < this.fallingDebris.length; i++) {
      const d = this.fallingDebris[i];
      d.y += d.speedY;
      d.x += d.speedX - scrollSpeed * 0.3;
      d.rotation += d.rotSpeed;
      if (d.y > h + 20 || d.x < -20) {
        this.fallingDebris[i] = this.createDebris(w, h);
        this.fallingDebris[i].x = Math.random() * w;
        this.fallingDebris[i].y = -20;
      }
    }

    // Flash elements
    for (const fe of this.flashElements) {
      fe.phase += fe.pulseSpeed;
      fe.opacity = Math.max(0, Math.sin(fe.phase) * 0.5 + 0.1);
      fe.x -= fe.speed + scrollSpeed * 0.3;
      if (fe.x + fe.width < 0) {
        fe.x = w + Math.random() * 200;
        fe.y = 30 + Math.random() * h * 0.5;
      }
    }

    // Laser beams
    for (const lb of this.laserBeams) {
      lb.timer++;
      lb.phase += lb.sweepSpeed;
      lb.angle = Math.sin(lb.phase) * 0.5;
      // Toggle active on/off periodically
      if (lb.timer % 180 < 60) {
        lb.active = true;
        lb.opacity = Math.min(0.3, lb.opacity + 0.02);
      } else {
        lb.active = false;
        lb.opacity = Math.max(0, lb.opacity - 0.03);
      }
      lb.x -= scrollSpeed * 0.4;
      if (lb.x < -50) lb.x = w + 50 + Math.random() * 200;
    }

    // Screen flash effect (random bursts)
    this.flashTimer++;
    if (this.screenFlash > 0) {
      this.screenFlash -= 0.03;
    }
    if ((this.bgTheme === 'flash' || this.bgTheme === 'chaos') && this.flashTimer % 300 < 5) {
      this.screenFlash = 0.15;
    }
  }

  // ==================== DRAW ====================

  draw(rainbowHue, drawScrollX) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const colors = this.colors;
    const theme = this.bgTheme;

    // Background gradient – theme variety (stronger color shifts per level)
    let grad = ctx.createLinearGradient(0, 0, 0, h);
    if (rainbowHue !== undefined) {
      grad.addColorStop(0, `hsl(${rainbowHue}, 80%, 5%)`);
      grad.addColorStop(1, `hsl(${rainbowHue + 30}, 80%, 12%)`);
    } else {
      const c1 = colors.bg1 || '#0a0a12';
      const c2 = colors.bg2 || '#1a1a2e';
      if (theme === 'city') {
        grad.addColorStop(0, c1);
        grad.addColorStop(0.4, this.hexToRgba(c2, 0.7));
        grad.addColorStop(1, c2);
      } else if (theme === 'space') {
        grad.addColorStop(0, '#050510');
        grad.addColorStop(0.3, c1);
        grad.addColorStop(1, c2);
      } else if (theme === 'cave' || theme === 'chaos') {
        grad.addColorStop(0, '#000004');
        grad.addColorStop(0.5, c1);
        grad.addColorStop(1, c2);
      } else if (theme === 'flash') {
        grad.addColorStop(0, c1);
        grad.addColorStop(0.6, this.hexToRgba(colors.accent1 || c2, 0.15));
        grad.addColorStop(1, c2);
      } else {
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
      }
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Wallpaper layer (rich backdrop – uses drawScrollX for camera look-ahead)
    this.drawWallpaper(rainbowHue, drawScrollX);

    // Cave ceiling overlay
    if (this.bgTheme === 'cave' || this.bgTheme === 'chaos') {
      this.drawCaveCeiling(rainbowHue);
    }

    // Distant planet/moon (space theme - very back layer)
    if (this.distantPlanet) this.drawDistantPlanet(rainbowHue);

    // Nebula / glowing cloud layers (cosmic - multiple parallax)
    this.drawNebulaClouds(rainbowHue);

    // Vertical light streaks (digital rain / energy streams)
    this.drawLightStreaks(rainbowHue);

    // Layered segmented background (parallax panels)
    this.drawSegmentedLayers(rainbowHue);

    // Grid lines
    this.drawGrid(rainbowHue);

    // Mountains (back layer - drawn first)
    this.drawMountains(rainbowHue);

    // Drifting clouds (mid layer - soft movement)
    this.drawDriftingClouds(rainbowHue);

    // Background shapes (parallax)
    this.drawBgShapes(rainbowHue);

    // Robots (behind creatures)
    this.drawRobots(rainbowHue);

    // Stalactites
    this.drawStalactites(rainbowHue);

    // Falling debris
    this.drawFallingDebris(rainbowHue);

    // Flash elements
    this.drawFlashElements(rainbowHue);

    // Laser beams
    this.drawLaserBeams(rainbowHue);

    // Ambient particles
    this.drawParticles(rainbowHue);

    // Creatures
    this.drawCreatures(rainbowHue);

    // Flowing horizon lines (energy / lava feel - foreground movement)
    this.drawFlowLines(rainbowHue);

    // Bottom zig-zag wave layer (parallax waves near bottom)
    this.drawBottomWaves(rainbowHue);

    // Ambient glow pulse (synced to music beat when available)
    let pulse = Math.sin(this.pulsePhase) * 0.5 + 0.5;
    if (typeof sound !== 'undefined' && sound.isOnBeat && sound.isOnBeat(4)) {
      pulse += 0.08;
    }
    const glowColor = rainbowHue !== undefined
      ? `hsla(${rainbowHue}, 100%, 50%, ${0.03 + pulse * 0.04})`
      : colors.glow.replace(/[\d.]+\)$/, `${0.03 + pulse * 0.04})`);
    ctx.fillStyle = glowColor;
    ctx.fillRect(0, 0, w, h);

    // Screen flash overlay
    if (this.screenFlash > 0) {
      const flashColor = rainbowHue !== undefined
        ? `hsla(${rainbowHue}, 100%, 80%, ${this.screenFlash})`
        : `rgba(255, 255, 255, ${this.screenFlash})`;
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ==================== WALLPAPER (static backdrop under all layers) ====================

  drawWallpaper(rainbowHue, drawScrollX) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const colors = this.colors;
    const theme = this.bgTheme;
    const scrollX = drawScrollX !== undefined ? drawScrollX : (this.scrollX || 0);

    // 1) Richer sky gradient overlay (adds depth - horizon glow)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (rainbowHue !== undefined) {
      skyGrad.addColorStop(0, `hsla(${rainbowHue}, 70%, 8%, 0.4)`);
      skyGrad.addColorStop(0.5, 'transparent');
      skyGrad.addColorStop(0.85, `hsla(${rainbowHue + 20}, 60%, 15%, 0.5)`);
      skyGrad.addColorStop(1, `hsla(${rainbowHue + 10}, 50%, 10%, 0.7)`);
    } else {
      const c1 = colors.bg1 || '#0a0a12';
      const c2 = colors.bg2 || '#1a1a2e';
      skyGrad.addColorStop(0, this.hexToRgba(c1, 0.5));
      skyGrad.addColorStop(0.45, 'transparent');
      skyGrad.addColorStop(0.8, this.hexToRgba(c2, 0.4));
      skyGrad.addColorStop(1, this.hexToRgba(c2, 0.85));
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 2) Horizon band (distant land/water - soft strip)
    const horizonY = h * 0.72;
    const bandH = h * 0.35;
    const bandGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    const bandColor = rainbowHue !== undefined
      ? `hsla(${rainbowHue + 30}, 40%, 8%, 0.6)`
      : colors.bg2 ? this.hexToRgba(colors.bg2, 0.6) : 'rgba(15, 15, 25, 0.6)';
    bandGrad.addColorStop(0, 'transparent');
    bandGrad.addColorStop(0.15, bandColor);
    bandGrad.addColorStop(1, bandColor);
    ctx.fillStyle = bandGrad;
    ctx.fillRect(0, horizonY, w, bandH);

    // 3) Distant silhouettes (theme-based, very slow parallax)
    const parallax = (scrollX || 0) * 0.015;
    ctx.globalAlpha = 0.4;

    if (theme === 'mountains' || theme === 'default' || !theme) {
      this.drawWallpaperSilhouetteMountains(ctx, w, h, horizonY, parallax, rainbowHue);
    } else if (theme === 'space') {
      this.drawWallpaperSilhouetteSpace(ctx, w, h, rainbowHue);
    } else if (theme === 'city') {
      this.drawWallpaperSilhouetteCity(ctx, w, h, horizonY, parallax, rainbowHue);
    } else {
      this.drawWallpaperSilhouetteMountains(ctx, w, h, horizonY, parallax, rainbowHue);
    }

    ctx.globalAlpha = 1;
  }

  drawWallpaperSilhouetteMountains(ctx, w, h, horizonY, parallax, rainbowHue) {
    const color = rainbowHue !== undefined
      ? `hsl(${rainbowHue + 200}, 30%, 5%)`
      : this.colors.bg2 ? this.hexToRgba(this.colors.bg2, 0.9) : 'rgba(10, 10, 20, 0.9)';
    ctx.fillStyle = color;

    const peakHeight = h * 0.25;
    for (let layer = 0; layer < 2; layer++) {
      ctx.beginPath();
      ctx.moveTo(-50, h + 20);
      const L = 14 + layer * 6;
      for (let i = 0; i <= L; i++) {
        const x = (i / L) * (w + 200) - 100 + parallax * (1 + layer * 0.5);
        const y = horizonY - Math.abs(Math.sin((i / L) * 4 + layer * 2)) * peakHeight * (0.4 + layer * 0.3) - Math.sin((x + parallax) * 0.008) * 15;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w + 50, h + 20);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawWallpaperSilhouetteSpace(ctx, w, h, rainbowHue) {
    const color = rainbowHue !== undefined
      ? `hsla(${rainbowHue + 180}, 50%, 12%, 0.35)`
      : this.colors.accent1 ? this.hexToRgba(this.colors.accent1, 0.12) : 'rgba(80, 100, 180, 0.12)';
    const cy = h * 0.4;
    const r = w * 0.65;
    const grad = ctx.createRadialGradient(w * 0.5, cy, 0, w * 0.5, cy, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, color.startsWith('hsl') ? color.replace(/[\d.]+\)$/, '0.1)') : this.hexToRgba(this.colors.accent1 || '#4488ff', 0.06));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  drawWallpaperSilhouetteCity(ctx, w, h, horizonY, parallax, rainbowHue) {
    const color = rainbowHue !== undefined
      ? `hsl(${rainbowHue + 220}, 25%, 6%)`
      : this.colors.bg2 ? this.hexToRgba(this.colors.bg2, 0.85) : 'rgba(8, 8, 18, 0.85)';
    ctx.fillStyle = color;
    const blockW = 40;
    const startX = -((parallax * 2) % blockW) - blockW * 2;
    ctx.beginPath();
    ctx.moveTo(-50, h + 20);
    for (let x = startX; x < w + 100; x += blockW) {
      const towerH = 30 + (Math.sin(x * 0.02) * 0.5 + 0.5) * 80;
      ctx.lineTo(x, horizonY - towerH);
      ctx.lineTo(x + blockW * 0.7, horizonY - towerH * 0.6);
    }
    ctx.lineTo(w + 50, h + 20);
    ctx.closePath();
    ctx.fill();
  }

  // ==================== GRID (offscreen cache when scroll/theme change beyond threshold) ====================

  drawGrid(rainbowHue) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const bucket = Math.floor(this.gridOffset / this._GRID_CACHE_BUCKET);
    const rainbowChanged = (rainbowHue !== this._lastGridRainbow);
    if (!this._gridCache || this._gridCache.width !== w || this._gridCache.height !== h) {
      this._gridCache = document.createElement('canvas');
      this._gridCache.width = w;
      this._gridCache.height = h;
      this._gridCacheCtx = this._gridCache.getContext('2d');
      this._lastGridBucket = -999;
    }
    if (bucket !== this._lastGridBucket || rainbowChanged) {
      this._lastGridBucket = bucket;
      this._lastGridRainbow = rainbowHue;
      const cctx = this._gridCacheCtx;
      const spacing = 60;
      const lineColor = rainbowHue !== undefined
        ? `hsla(${rainbowHue}, 100%, 50%, 0.06)`
        : this.colors.gridLines;
      cctx.strokeStyle = lineColor;
      cctx.lineWidth = 1;
      const startX = -this.gridOffset;
      for (let x = startX; x < w + spacing; x += spacing) {
        cctx.beginPath();
        cctx.moveTo(x, 0);
        cctx.lineTo(x, h);
        cctx.stroke();
      }
      for (let y = 0; y < h; y += spacing) {
        cctx.beginPath();
        cctx.moveTo(0, y);
        cctx.lineTo(w, y);
        cctx.stroke();
      }
    }
    ctx.drawImage(this._gridCache, 0, 0);
  }

  // ==================== DISTANT PLANET (Space theme) ====================

  drawDistantPlanet(rainbowHue) {
    if (!this.distantPlanet) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const p = this.distantPlanet;
    const x = p.x;
    const y = p.y;
    const r = p.radius;
    if (x + r < 0 || x - r > w) return;

    const hue = rainbowHue !== undefined ? rainbowHue + 200 : 0;
    const mainColor = rainbowHue !== undefined
      ? `hsla(${hue}, 40%, 25%, 0.35)`
      : this.colors.bgShapes ? this.hexToRgba(this.colors.bgShapes, 0.35) : 'rgba(40, 50, 80, 0.35)';
    const rimColor = rainbowHue !== undefined
      ? `hsla(${hue}, 60%, 45%, 0.2)`
      : this.colors.accent1 ? this.hexToRgba(this.colors.accent1, 0.2) : 'rgba(120, 180, 220, 0.2)';

    const pulse = 0.92 + Math.sin(p.phase) * 0.08;
    const rr = r * pulse;

    const grad = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.2, 0, x, y, rr * 1.2);
    grad.addColorStop(0, rimColor);
    grad.addColorStop(0.4, mainColor);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, rr * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
  }

  // ==================== NEBULA CLOUDS (Glowing layers) ====================

  drawNebulaClouds(rainbowHue) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const c1 = this.colors.accent1 || '#88aaff';
    const c2 = this.colors.accent2 || '#ff88aa';
    const bg2 = this.colors.bg2 || '#1a1a2e';

    for (const n of this.nebulaClouds) {
      if (n.x + n.radiusX * 2 < 0 || n.x - n.radiusX > w) continue;

      const pulse = 0.85 + Math.sin(n.phase) * 0.15;
      const rx = n.radiusX * pulse;
      const ry = n.radiusY * pulse;
      const color = n.colorIndex === 0 ? c1 : c2;

      const grad = ctx.createRadialGradient(
        n.x - rx * 0.3, n.y - ry * 0.2, 0,
        n.x, n.y, Math.max(rx, ry)
      );
      grad.addColorStop(0, this.hexToRgba(color, n.opacity));
      grad.addColorStop(0.5, this.hexToRgba(color, n.opacity * 0.4));
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(n.x, n.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Internal "energy" line (cosmic reference - swirling contour)
      ctx.strokeStyle = this.hexToRgba(color, n.opacity * 0.5);
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4 + Math.sin(n.phase * 1.3) * 0.2;
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.05) {
        const a = t * Math.PI * 2 + n.phase * 0.5;
        const ex = n.x + Math.cos(a) * rx * (0.6 + Math.sin(t * 4 + n.phase) * 0.2);
        const ey = n.y + Math.sin(a) * ry * (0.5 + Math.cos(t * 3) * 0.2);
        if (t === 0) ctx.moveTo(ex, ey);
        else ctx.lineTo(ex, ey);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ==================== DRIFTING CLOUDS (fluffy, cloud-like) ====================

  drawDriftingClouds(rainbowHue) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (const c of this.driftingClouds) {
      if (c.x + c.w < 0 || c.x > w) continue;

      const yOff = Math.sin(c.wobble) * c.wobbleAmp;
      const baseY = c.y + yOff;
      const opacity = c.opacity * (0.85 + Math.sin(c.phase) * 0.15);

      const baseColor = rainbowHue !== undefined
        ? `hsla(${rainbowHue + 30}, 35%, 92%, ${opacity})`
        : this.colors.bgShapes
          ? this.hexToRgba(this.colors.bgShapes, Math.min(1, opacity * 1.2))
          : `rgba(200, 210, 230, ${opacity})`;

      const edgeColor = rainbowHue !== undefined
        ? `hsla(${rainbowHue + 25}, 25%, 88%, 0)`
        : 'rgba(220, 225, 240, 0)';

      ctx.globalAlpha = 1;

      const cx = c.x + c.w / 2;
      const cy = baseY + c.h / 2;

      for (const puff of c.puffs || []) {
        const px = cx + puff.dx;
        const py = cy + puff.dy;
        const r = puff.r;

        const grad = ctx.createRadialGradient(px - r * 0.3, py - r * 0.2, 0, px, py, r);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(0.5, baseColor);
        grad.addColorStop(0.85, edgeColor);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowColor = 'rgba(255,255,255,0.4)';
      ctx.shadowBlur = 12;
      for (const puff of c.puffs || []) {
        const px = cx + puff.dx;
        const py = cy + puff.dy;
        const r = puff.r * 0.7;
        const softColor = rainbowHue !== undefined
          ? `hsla(${rainbowHue + 30}, 20%, 98%, ${opacity * 0.5})`
          : `rgba(245, 248, 255, ${opacity * 0.5})`;
        ctx.fillStyle = softColor;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
  }

  // ==================== FLOW LINES (Horizon energy / lava feel) ====================

  drawFlowLines(rainbowHue) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const scrollX = this.scrollX || 0;

    for (const fl of this.flowLines) {
      const color = rainbowHue !== undefined
        ? `hsla(${rainbowHue + 60}, 80%, 60%, ${fl.opacity})`
        : this.colors.accent1 ? this.hexToRgba(this.colors.accent1, fl.opacity) : `rgba(150, 200, 255, ${fl.opacity})`;

      ctx.strokeStyle = color;
      ctx.lineWidth = fl.width;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.7 + Math.sin(fl.phase * 2) * 0.3;

      ctx.beginPath();
      const steps = 80;
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * (w + 100) - 50;
        const t = (x + scrollX) * fl.frequency + fl.phase;
        const y = fl.y + Math.sin(t) * fl.amplitude + (fl.layer ? Math.sin(t * 0.7) * 10 : 0);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ==================== LIGHT STREAKS (Digital rain) ====================

  drawLightStreaks(rainbowHue) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (const s of this.lightStreaks) {
      const alpha = s.opacity * (0.75 + Math.sin(this.time * 0.02 + s.x * 0.01) * 0.25);
      if (alpha <= 0) continue;

      const color = rainbowHue !== undefined
        ? `hsla(${rainbowHue + 180}, 100%, 88%, ${alpha})`
        : this.colors.accent1
          ? this.hexToRgba(this.colors.accent1, alpha)
          : `rgba(200, 230, 255, ${alpha})`;

      ctx.lineCap = 'round';
      // Soft glow behind streak
      ctx.strokeStyle = rainbowHue !== undefined
        ? `hsla(${rainbowHue + 180}, 100%, 90%, ${alpha * 0.35})`
        : this.colors.accent1
          ? this.hexToRgba(this.colors.accent1, alpha * 0.35)
          : `rgba(200, 230, 255, ${alpha * 0.35})`;
      ctx.lineWidth = s.width * 3;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.speedX * 8, s.y + s.length);
      ctx.stroke();
      // Bright core
      ctx.strokeStyle = color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.speedX * 8, s.y + s.length);
      ctx.stroke();
    }
  }

  hexToRgba(hex, alpha) {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) return `rgba(180, 220, 255, ${alpha})`;
    return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
  }

  // ==================== SEGMENTED LAYERS (Parallax panels) ====================

  drawSegmentedLayers(rainbowHue) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (const sl of this.segmentedLayers) {
      const shade = 12 + sl.layer * 4;
      const color = rainbowHue !== undefined
        ? `hsla(${rainbowHue + 240}, 40%, ${shade}%, ${sl.opacity})`
        : this.colors.bg2
          ? this.hexToRgba(this.colors.bg2, sl.opacity)
          : `rgba(30, 20, 50, ${sl.opacity})`;

      ctx.fillStyle = color;
      ctx.strokeStyle = rainbowHue !== undefined
        ? `hsla(${rainbowHue + 220}, 50%, ${shade + 8}%, ${sl.opacity * 0.6})`
        : this.colors.gridLines || `rgba(80, 60, 120, ${sl.opacity * 0.5})`;
      ctx.lineWidth = 0.5;

      const baseOffset = -sl.offset;
      for (let col = -1; col < sl.segmentCount + 1; col++) {
        const x = baseOffset + col * sl.segmentWidth;
        if (x + sl.segmentWidth < 0 || x > w) continue;
        const xx = Math.max(0, x);
        const ww = Math.min(sl.segmentWidth, w - xx, (x + sl.segmentWidth) - xx);
        if (ww <= 0) continue;
        ctx.fillRect(xx, 0, ww, h);
        ctx.strokeRect(xx, 0, ww, h);
      }
      ctx.lineWidth = 1;
    }
  }

  // ==================== BOTTOM ZIG-ZAG WAVES ====================

  drawBottomWaves(rainbowHue) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const groundY = h * 0.82;
    const waveHeight = 32;
    const waveTop = groundY - waveHeight * 2.8;

    const phase = this.bottomWavePhase + (this.scrollX || 0) * 0.015;
    const step = 22;

    for (let layer = 0; layer < 2; layer++) {
      const layerPhase = phase + layer * 0.7;
      const opacity = 0.11 - layer * 0.04;
      const shade = 18 + layer * 6;
      const color = rainbowHue !== undefined
        ? `hsla(${rainbowHue + 260}, 50%, ${shade}%, ${opacity})`
        : this.colors.bg2
          ? this.hexToRgba(this.colors.bg2, opacity)
          : `rgba(40, 25, 70, ${opacity})`;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-10, groundY + 20);

      for (let x = -step * 2; x < w + step * 2; x += step) {
        const t = (x / step) * 0.5 + layerPhase;
        const y = waveTop + Math.sin(t) * waveHeight + layer * 8;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w + 20, groundY + 20);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ==================== MOUNTAINS ====================

  drawMountains(rainbowHue) {
    const ctx = this.ctx;
    const w = this.canvas.width;

    for (const mt of this.mountains) {
      const hue = rainbowHue !== undefined ? rainbowHue + mt.layer * 20 : 0;
      const color = rainbowHue !== undefined
        ? `hsla(${hue}, 60%, ${10 + mt.layer * 5}%, ${mt.opacity})`
        : this.colors.bgShapes;

      ctx.globalAlpha = mt.opacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, mt.baseY);

      for (const peak of mt.peaks) {
        const px = peak.x - mt.offset;
        const wrappedX = ((px % w) + w) % w;

        // Draw mountain peak as triangle
        ctx.lineTo(wrappedX - peak.width * 0.5, mt.baseY);
        ctx.lineTo(wrappedX, mt.baseY - peak.height);
        ctx.lineTo(wrappedX + peak.width * 0.5, mt.baseY);
      }

      ctx.lineTo(w, mt.baseY);
      ctx.lineTo(w, mt.baseY + 20);
      ctx.lineTo(0, mt.baseY + 20);
      ctx.closePath();
      ctx.fill();

      // Snow caps on back layer
      if (mt.layer === 0 && rainbowHue === undefined) {
        ctx.globalAlpha = mt.opacity * 0.6;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (const peak of mt.peaks) {
          const px = peak.x - mt.offset;
          const wrappedX = ((px % w) + w) % w;
          const snowH = peak.height * 0.15;
          ctx.beginPath();
          ctx.moveTo(wrappedX, mt.baseY - peak.height);
          ctx.lineTo(wrappedX - peak.width * 0.08, mt.baseY - peak.height + snowH);
          ctx.lineTo(wrappedX + peak.width * 0.08, mt.baseY - peak.height + snowH);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    }
  }

  // ==================== ROBOTS ====================

  drawRobots(rainbowHue) {
    const ctx = this.ctx;

    for (const robot of this.robots) {
      ctx.save();
      ctx.globalAlpha = robot.opacity;

      const x = robot.x;
      const y = robot.y;
      const h = robot.height;
      const legSwing = Math.sin(robot.walkFrame) * 15;
      const bodyBob = Math.abs(Math.sin(robot.walkFrame * 2)) * 5;

      const hue = rainbowHue !== undefined ? rainbowHue : 0;
      const bodyColor = rainbowHue !== undefined
        ? `hsl(${hue + 180}, 50%, 25%)`
        : this.colors.bgShapes;
      const accentColor = rainbowHue !== undefined
        ? `hsl(${hue}, 100%, 50%)`
        : this.colors.accent1;
      const eyeColor = rainbowHue !== undefined
        ? `hsl(${hue + 60}, 100%, 60%)`
        : this.colors.portal;

      switch (robot.type) {
        case 0: // Bipedal mech
          this.drawMechRobot(ctx, x, y - bodyBob, h, legSwing, bodyColor, accentColor, eyeColor, robot);
          break;
        case 1: // Floating drone giant
          this.drawGiantDrone(ctx, x, y - h * 0.5 - bodyBob * 3, h, bodyColor, accentColor, eyeColor, robot);
          break;
        case 2: // Spider bot
          this.drawSpiderBot(ctx, x, y - bodyBob, h, legSwing, bodyColor, accentColor, eyeColor, robot);
          break;
      }

      ctx.restore();
    }
  }

  drawMechRobot(ctx, x, y, h, legSwing, bodyColor, accentColor, eyeColor, robot) {
    const w = h * 0.5;

    // Legs
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = h * 0.06;
    ctx.lineCap = 'round';

    // Left leg
    ctx.beginPath();
    ctx.moveTo(x - w * 0.15, y - h * 0.35);
    ctx.lineTo(x - w * 0.2 + legSwing * 0.5, y - h * 0.15);
    ctx.lineTo(x - w * 0.15 - legSwing * 0.3, y);
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y - h * 0.35);
    ctx.lineTo(x + w * 0.2 - legSwing * 0.5, y - h * 0.15);
    ctx.lineTo(x + w * 0.15 + legSwing * 0.3, y);
    ctx.stroke();

    // Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x - w * 0.25, y - h * 0.65, w * 0.5, h * 0.3);

    // Chest plate accent
    ctx.fillStyle = accentColor;
    ctx.globalAlpha *= 0.6;
    ctx.fillRect(x - w * 0.15, y - h * 0.58, w * 0.3, h * 0.05);
    ctx.globalAlpha /= 0.6;

    // Arms
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = h * 0.05;
    // Left arm
    ctx.beginPath();
    ctx.moveTo(x - w * 0.25, y - h * 0.55);
    ctx.lineTo(x - w * 0.4, y - h * 0.45 + robot.armSwing * h * 0.1);
    ctx.lineTo(x - w * 0.35, y - h * 0.3 + robot.armSwing * h * 0.05);
    ctx.stroke();
    // Right arm
    ctx.beginPath();
    ctx.moveTo(x + w * 0.25, y - h * 0.55);
    ctx.lineTo(x + w * 0.4, y - h * 0.45 - robot.armSwing * h * 0.1);
    ctx.lineTo(x + w * 0.35, y - h * 0.3 - robot.armSwing * h * 0.05);
    ctx.stroke();

    // Head
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x - w * 0.15, y - h * 0.8, w * 0.3, h * 0.15);

    // Eyes (glowing)
    const eyeGlow = robot.eyeGlow;
    ctx.fillStyle = eyeColor;
    ctx.globalAlpha *= (0.5 + eyeGlow * 0.5);
    ctx.fillRect(x - w * 0.1, y - h * 0.75, w * 0.07, w * 0.05);
    ctx.fillRect(x + w * 0.03, y - h * 0.75, w * 0.07, w * 0.05);
    // Eye glow aura
    ctx.globalAlpha *= 0.3;
    ctx.beginPath();
    ctx.arc(x - w * 0.065, y - h * 0.73, w * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w * 0.065, y - h * 0.73, w * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  drawGiantDrone(ctx, x, y, h, bodyColor, accentColor, eyeColor, robot) {
    const w = h * 0.7;
    const bob = Math.sin(this.time * 0.02) * h * 0.05;

    // Body (rounded rectangle)
    ctx.fillStyle = bodyColor;
    const bodyW = w * 0.6;
    const bodyH = h * 0.25;
    const bx = x - bodyW / 2;
    const by = y + bob - bodyH / 2;
    ctx.beginPath();
    ctx.moveTo(bx + 8, by);
    ctx.lineTo(bx + bodyW - 8, by);
    ctx.quadraticCurveTo(bx + bodyW, by, bx + bodyW, by + 8);
    ctx.lineTo(bx + bodyW, by + bodyH - 8);
    ctx.quadraticCurveTo(bx + bodyW, by + bodyH, bx + bodyW - 8, by + bodyH);
    ctx.lineTo(bx + 8, by + bodyH);
    ctx.quadraticCurveTo(bx, by + bodyH, bx, by + bodyH - 8);
    ctx.lineTo(bx, by + 8);
    ctx.quadraticCurveTo(bx, by, bx + 8, by);
    ctx.closePath();
    ctx.fill();

    // Central eye
    ctx.fillStyle = eyeColor;
    ctx.globalAlpha *= (0.6 + robot.eyeGlow * 0.4);
    ctx.beginPath();
    ctx.arc(x, y + bob, h * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // Eye glow
    ctx.globalAlpha *= 0.3;
    ctx.beginPath();
    ctx.arc(x, y + bob, h * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha /= 0.3;
    ctx.globalAlpha /= (0.6 + robot.eyeGlow * 0.4);

    // Propeller arms
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = h * 0.03;
    for (let side = -1; side <= 1; side += 2) {
      const px = x + side * w * 0.4;
      const py = y + bob - h * 0.05;
      ctx.beginPath();
      ctx.moveTo(x + side * bodyW * 0.3, y + bob);
      ctx.lineTo(px, py);
      ctx.stroke();

      // Spinning prop
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(this.time * 0.15 * side);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = h * 0.02;
      ctx.beginPath();
      ctx.moveTo(-w * 0.15, 0);
      ctx.lineTo(w * 0.15, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Beam of light downward
    ctx.globalAlpha *= 0.05;
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.moveTo(x - h * 0.04, y + bob + h * 0.06);
    ctx.lineTo(x + h * 0.04, y + bob + h * 0.06);
    ctx.lineTo(x + h * 0.2, y + bob + h * 0.5);
    ctx.lineTo(x - h * 0.2, y + bob + h * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha /= 0.05;
  }

  drawSpiderBot(ctx, x, y, h, legSwing, bodyColor, accentColor, eyeColor, robot) {
    const w = h * 0.5;
    const legCount = 3; // per side

    // Legs (4 per side)
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = h * 0.03;
    ctx.lineCap = 'round';

    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < legCount; i++) {
        const baseX = x + side * w * 0.15;
        const baseY = y - h * 0.4 + i * h * 0.08;
        const phase = robot.walkFrame + i * 0.8 + (side > 0 ? Math.PI : 0);
        const swing = Math.sin(phase) * 12;

        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(baseX + side * w * 0.3, baseY - h * 0.1 + swing);
        ctx.lineTo(baseX + side * w * 0.4, baseY + h * 0.05 - swing * 0.5);
        ctx.stroke();
      }
    }

    // Body (oval)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.4, w * 0.2, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Multiple eyes
    ctx.fillStyle = eyeColor;
    ctx.globalAlpha *= (0.5 + robot.eyeGlow * 0.5);
    const eyePositions = [
      [-0.08, -0.05], [0.08, -0.05],
      [-0.04, 0.02], [0.04, 0.02],
    ];
    for (const [ex, ey] of eyePositions) {
      ctx.beginPath();
      ctx.arc(x + w * ex, y - h * 0.4 + h * ey, h * 0.015, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==================== CAVE ====================

  drawCaveCeiling(rainbowHue) {
    const ctx = this.ctx;
    const w = this.canvas.width;

    // Dark ceiling overlay gradient
    const caveGrad = ctx.createLinearGradient(0, 0, 0, 80);
    if (rainbowHue !== undefined) {
      caveGrad.addColorStop(0, `hsla(${rainbowHue}, 30%, 3%, 0.8)`);
      caveGrad.addColorStop(1, 'transparent');
    } else {
      caveGrad.addColorStop(0, 'rgba(0,0,0,0.7)');
      caveGrad.addColorStop(1, 'transparent');
    }
    ctx.fillStyle = caveGrad;
    ctx.fillRect(0, 0, w, 80);

    // Rough ceiling edge
    ctx.fillStyle = rainbowHue !== undefined
      ? `hsla(${rainbowHue}, 20%, 8%, 0.5)`
      : 'rgba(20,15,10,0.5)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= w; x += 15) {
      const noise = Math.sin(x * 0.02 + this.time * 0.001) * 10 +
                   Math.sin(x * 0.05) * 8 +
                   Math.sin(x * 0.01 + 1) * 15;
      ctx.lineTo(x, 15 + noise);
    }
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fill();
  }

  drawStalactites(rainbowHue) {
    const ctx = this.ctx;

    for (const stal of this.stalactites) {
      const color = rainbowHue !== undefined
        ? `hsla(${rainbowHue + 30}, 20%, 15%, ${stal.opacity})`
        : this.colors.bgShapes;

      ctx.globalAlpha = stal.opacity;
      ctx.fillStyle = color;

      // Main stalactite shape
      ctx.beginPath();
      ctx.moveTo(stal.x - stal.width / 2, 0);
      ctx.lineTo(stal.x + stal.width / 2, 0);
      ctx.lineTo(stal.x + stal.width * 0.15, stal.height * 0.6);
      ctx.lineTo(stal.x, stal.height);
      ctx.lineTo(stal.x - stal.width * 0.15, stal.height * 0.6);
      ctx.closePath();
      ctx.fill();

      // Drip effect
      const dripY = stal.height + (Math.sin(stal.drip) * 0.5 + 0.5) * 20;
      const dripOpacity = Math.sin(stal.drip) * 0.5 + 0.5;
      if (dripOpacity > 0.3) {
        ctx.globalAlpha = stal.opacity * dripOpacity * 0.6;
        ctx.fillStyle = rainbowHue !== undefined
          ? `hsl(${rainbowHue}, 60%, 50%)`
          : this.colors.accent1;
        ctx.beginPath();
        ctx.arc(stal.x, dripY, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }
  }

  drawFallingDebris(rainbowHue) {
    const ctx = this.ctx;

    for (const d of this.fallingDebris) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rotation);
      ctx.globalAlpha = d.opacity;

      const color = rainbowHue !== undefined
        ? `hsl(${rainbowHue + 20}, 30%, 30%)`
        : this.colors.bgShapes;
      ctx.fillStyle = color;

      if (d.shape === 'rock') {
        // Irregular rock shape
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.5, -d.size * 0.3);
        ctx.lineTo(d.size * 0.2, -d.size * 0.5);
        ctx.lineTo(d.size * 0.5, -d.size * 0.1);
        ctx.lineTo(d.size * 0.3, d.size * 0.4);
        ctx.lineTo(-d.size * 0.3, d.size * 0.5);
        ctx.lineTo(-d.size * 0.5, d.size * 0.1);
        ctx.closePath();
        ctx.fill();
      } else {
        // Sharp shard
        ctx.beginPath();
        ctx.moveTo(0, -d.size * 0.6);
        ctx.lineTo(d.size * 0.3, 0);
        ctx.lineTo(0, d.size * 0.6);
        ctx.lineTo(-d.size * 0.2, d.size * 0.1);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ==================== FLASH ELEMENTS ====================

  drawFlashElements(rainbowHue) {
    const ctx = this.ctx;

    for (const fe of this.flashElements) {
      if (fe.opacity <= 0) continue;

      const color = rainbowHue !== undefined
        ? `hsla(${rainbowHue + 90}, 100%, 60%, ${fe.opacity})`
        : this.colors.accent1;

      ctx.globalAlpha = fe.opacity;
      ctx.fillStyle = color;
      ctx.fillRect(fe.x, fe.y, fe.width, fe.height);

      // Glow effect
      ctx.globalAlpha = fe.opacity * 0.3;
      ctx.fillRect(fe.x, fe.y - 3, fe.width, fe.height + 6);

      // Bright center line
      ctx.globalAlpha = fe.opacity * 0.8;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(fe.x, fe.y + fe.height * 0.3, fe.width, fe.height * 0.4);

      ctx.globalAlpha = 1;
    }
  }

  drawLaserBeams(rainbowHue) {
    const ctx = this.ctx;

    for (const lb of this.laserBeams) {
      if (lb.opacity <= 0) continue;

      const h = this.canvas.height;
      ctx.save();
      ctx.translate(lb.x, 0);
      ctx.rotate(lb.angle);

      const color = rainbowHue !== undefined
        ? `hsla(${rainbowHue + 120}, 100%, 50%, ${lb.opacity})`
        : this.colors.accent2;

      // Outer glow
      ctx.globalAlpha = lb.opacity * 0.2;
      ctx.strokeStyle = color;
      ctx.lineWidth = lb.width * 6;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, h);
      ctx.stroke();

      // Inner beam
      ctx.globalAlpha = lb.opacity;
      ctx.lineWidth = lb.width;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, h);
      ctx.stroke();

      // Bright core
      ctx.globalAlpha = lb.opacity * 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = lb.width * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, h);
      ctx.stroke();

      ctx.restore();
    }
  }

  // ==================== EXISTING DRAWING SYSTEMS ====================

  drawBgShapes(rainbowHue) {
    const ctx = this.ctx;

    for (const shape of this.bgShapes) {
      const color = rainbowHue !== undefined
        ? `hsla(${rainbowHue + 20}, 70%, 20%, ${shape.opacity})`
        : this.colors.bgShapes;

      ctx.fillStyle = rainbowHue !== undefined ? color : this.colors.bgShapes;
      ctx.globalAlpha = shape.opacity;

      if (shape.type === 'rect') {
        const r = 4;
        ctx.beginPath();
        ctx.moveTo(shape.x + r, shape.y);
        ctx.lineTo(shape.x + shape.w - r, shape.y);
        ctx.quadraticCurveTo(shape.x + shape.w, shape.y, shape.x + shape.w, shape.y + r);
        ctx.lineTo(shape.x + shape.w, shape.y + shape.h - r);
        ctx.quadraticCurveTo(shape.x + shape.w, shape.y + shape.h, shape.x + shape.w - r, shape.y + shape.h);
        ctx.lineTo(shape.x + r, shape.y + shape.h);
        ctx.quadraticCurveTo(shape.x, shape.y + shape.h, shape.x, shape.y + shape.h - r);
        ctx.lineTo(shape.x, shape.y + r);
        ctx.quadraticCurveTo(shape.x, shape.y, shape.x + r, shape.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = rainbowHue !== undefined
          ? `hsla(${rainbowHue}, 100%, 60%, ${shape.opacity * 0.5})`
          : this.colors.accent1;
        ctx.globalAlpha = shape.opacity * 0.3;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        const cx = shape.x + shape.w / 2;
        const cy = shape.y + shape.h / 2;
        ctx.beginPath();
        ctx.moveTo(cx, shape.y);
        ctx.lineTo(shape.x + shape.w, cy);
        ctx.lineTo(cx, shape.y + shape.h);
        ctx.lineTo(shape.x, cy);
        ctx.closePath();
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }
  }

  drawParticles(rainbowHue) {
    const ctx = this.ctx;

    for (const p of this.particles) {
      const pulseFactor = Math.sin(p.pulse) * 0.3 + 0.7;
      const size = p.size * pulseFactor;
      const color = rainbowHue !== undefined
        ? `hsla(${rainbowHue + Math.random() * 60}, 100%, 70%, ${p.opacity * pulseFactor})`
        : this.colors.particle;

      ctx.globalAlpha = p.opacity * pulseFactor;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();

      // Star twinkle effect
      if (p.isStar && pulseFactor > 0.85) {
        ctx.globalAlpha *= 0.4;
        ctx.beginPath();
        ctx.moveTo(p.x - size * 3, p.y);
        ctx.lineTo(p.x + size * 3, p.y);
        ctx.moveTo(p.x, p.y - size * 3);
        ctx.lineTo(p.x, p.y + size * 3);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else {
        // Glow
        ctx.globalAlpha = p.opacity * pulseFactor * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }
  }

  drawCreatures(rainbowHue) {
    const ctx = this.ctx;

    for (const c of this.creatures) {
      const yOff = Math.sin(c.wobble) * c.wobbleAmp;
      const cx = c.x;
      const cy = c.y + yOff;
      const s = c.size;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(c.rotation);
      ctx.globalAlpha = c.opacity;

      const hue = rainbowHue !== undefined ? rainbowHue : 0;

      switch (c.type) {
        case 'bat':
          this.drawBat(ctx, s, hue, rainbowHue !== undefined, c.frame);
          break;
        case 'fireball':
          this.drawFireball(ctx, s, hue, rainbowHue !== undefined, c.frame);
          break;
        case 'ghost':
          this.drawGhost(ctx, s, hue, rainbowHue !== undefined, c.frame);
          break;
        case 'wisp':
          this.drawWisp(ctx, s, hue, rainbowHue !== undefined, c.frame);
          break;
        case 'jellyfish':
          this.drawJellyfish(ctx, s, hue, rainbowHue !== undefined, c.frame);
          break;
        case 'drone':
          this.drawDrone(ctx, s, hue, rainbowHue !== undefined, c.frame);
          break;
        case 'skull':
          this.drawSkull(ctx, s, hue, rainbowHue !== undefined, c.frame);
          break;
      }

      ctx.restore();
    }
  }

  // ==================== CREATURE DRAWING (unchanged) ====================

  drawBat(ctx, s, hue, isRainbow, frame) {
    const wingFlap = Math.sin(frame * 0.15) * 0.4;
    const color = isRainbow ? `hsl(${hue + 180}, 80%, 60%)` : this.colors.accent1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.3, s * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, 0);
    ctx.quadraticCurveTo(-s * 0.7, -s * (0.5 + wingFlap), -s * 0.9, -s * 0.1);
    ctx.quadraticCurveTo(-s * 0.5, s * 0.1, -s * 0.2, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.2, 0);
    ctx.quadraticCurveTo(s * 0.7, -s * (0.5 + wingFlap), s * 0.9, -s * 0.1);
    ctx.quadraticCurveTo(s * 0.5, s * 0.1, s * 0.2, 0);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-s * 0.12, -s * 0.08, s * 0.08, s * 0.08);
    ctx.fillRect(s * 0.04, -s * 0.08, s * 0.08, s * 0.08);
  }

  drawFireball(ctx, s, hue, isRainbow, frame) {
    const flicker = Math.sin(frame * 0.2) * 0.2 + 1;
    const color = isRainbow ? `hsl(${hue + 30}, 100%, 60%)` : this.colors.accent2;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, s * flicker);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.6, color.replace(')', ', 0.4)').replace('hsl', 'hsla').replace('rgb', 'rgba'));
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, s * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const tx = s * 0.4 + i * s * 0.2;
      const ty = Math.sin(frame * 0.1 + i) * s * 0.2;
      ctx.globalAlpha *= 0.6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(tx, ty, s * 0.15 - i * 0.02 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGhost(ctx, s, hue, isRainbow, frame) {
    const bob = Math.sin(frame * 0.06) * s * 0.1;
    const color = isRainbow ? `hsl(${hue + 120}, 60%, 70%)` : this.colors.accent1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -s * 0.2 + bob, s * 0.4, Math.PI, 0);
    ctx.lineTo(s * 0.4, s * 0.3 + bob);
    for (let i = 4; i >= -4; i--) {
      const wave = Math.sin(frame * 0.08 + i * 0.8) * s * 0.08;
      ctx.lineTo(i * s * 0.1, s * 0.3 + wave + bob);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(-s * 0.12, -s * 0.15 + bob, s * 0.08, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.12, -s * 0.15 + bob, s * 0.08, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawWisp(ctx, s, hue, isRainbow, frame) {
    const color = isRainbow ? `hsl(${hue + 90}, 100%, 75%)` : this.colors.portal;
    const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;
    ctx.globalAlpha *= 0.4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.6 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha *= 2;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const angle = frame * 0.04 + (i * Math.PI * 2) / 3;
      const dist = s * 0.4 * pulse;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawJellyfish(ctx, s, hue, isRainbow, frame) {
    const color = isRainbow ? `hsl(${hue + 200}, 80%, 65%)` : this.colors.accent1;
    const pulse = Math.sin(frame * 0.05) * 0.15;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * (0.4 + pulse), s * (0.3 - pulse), 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * s * 0.1, s * 0.05);
      const wave = Math.sin(frame * 0.06 + i * 0.5) * s * 0.15;
      ctx.quadraticCurveTo(i * s * 0.1 + wave, s * 0.3, i * s * 0.1 - wave * 0.5, s * 0.55);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.globalAlpha *= 0.6;
    ctx.beginPath();
    ctx.arc(-s * 0.1, -s * 0.08, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.1, -s * 0.08, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  drawDrone(ctx, s, hue, isRainbow, frame) {
    const color = isRainbow ? `hsl(${hue + 60}, 90%, 55%)` : this.colors.accent2;
    const propSpin = frame * 0.3;
    ctx.fillStyle = color;
    ctx.fillRect(-s * 0.25, -s * 0.1, s * 0.5, s * 0.2);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let side = -1; side <= 1; side += 2) {
      const px = side * s * 0.35;
      ctx.save();
      ctx.translate(px, -s * 0.1);
      ctx.rotate(propSpin);
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, 0);
      ctx.lineTo(s * 0.15, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawSkull(ctx, s, hue, isRainbow, frame) {
    const color = isRainbow ? `hsl(${hue + 0}, 80%, 60%)` : this.colors.accent1;
    const jawMove = Math.sin(frame * 0.04) * s * 0.03;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, s * 0.15 + jawMove, s * 0.25, s * 0.12, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(-s * 0.12, -s * 0.12, s * 0.09, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.12, -s * 0.12, s * 0.09, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isRainbow ? `hsl(${hue}, 100%, 50%)` : this.colors.portal;
    ctx.beginPath();
    ctx.arc(-s * 0.12, -s * 0.12, s * 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.12, -s * 0.12, s * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }
}
