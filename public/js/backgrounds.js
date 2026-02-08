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
    this.gridOffset = 0;
    this.time = 0;
    this.pulsePhase = 0;
    this.bgTheme = 'default';
    this.flashTimer = 0;
    this.screenFlash = 0;
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
    this.flashTimer = 0;
    this.screenFlash = 0;

    const w = this.canvas.width;
    const h = this.canvas.height;

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

    // Create background creatures
    if (creatureTypes) {
      for (let i = 0; i < 8; i++) {
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

    // Space elements
    if (theme === 'space') {
      this.initSpaceElements(w, h);
    }
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
        opacity: 0.12 - layer * 0.03,
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
      x: w + Math.random() * w,
      y: 40 + Math.random() * (h * 0.55),
      size: 12 + Math.random() * 20,
      speed: 1 + Math.random() * 2.5,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.04,
      wobbleAmp: 5 + Math.random() * 15,
      opacity: 0.15 + Math.random() * 0.35,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      frame: 0,
    };
  }

  // ==================== UPDATE ====================

  update(scrollSpeed) {
    this.time++;
    this.pulsePhase += 0.02;
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

    // Update creatures
    for (const c of this.creatures) {
      c.x -= c.speed + scrollSpeed * 0.4;
      c.wobble += c.wobbleSpeed;
      c.rotation += c.rotSpeed;
      c.frame++;
      if (c.x < -60) {
        c.x = w + 100 + Math.random() * 300;
        c.y = 40 + Math.random() * (h * 0.55);
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

  draw(rainbowHue) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const colors = this.colors;

    // Background gradient
    let grad;
    if (rainbowHue !== undefined) {
      const c1 = `hsl(${rainbowHue}, 80%, 5%)`;
      const c2 = `hsl(${rainbowHue + 30}, 80%, 12%)`;
      grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
    } else {
      grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, colors.bg1);
      grad.addColorStop(1, colors.bg2);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Cave ceiling overlay
    if (this.bgTheme === 'cave' || this.bgTheme === 'chaos') {
      this.drawCaveCeiling(rainbowHue);
    }

    // Grid lines
    this.drawGrid(rainbowHue);

    // Mountains (back layer - drawn first)
    this.drawMountains(rainbowHue);

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

    // Ambient glow pulse
    const pulse = Math.sin(this.pulsePhase) * 0.5 + 0.5;
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

  // ==================== GRID ====================

  drawGrid(rainbowHue) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const spacing = 60;
    const lineColor = rainbowHue !== undefined
      ? `hsla(${rainbowHue}, 100%, 50%, 0.06)`
      : this.colors.gridLines;

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;

    const startX = -this.gridOffset;
    for (let x = startX; x < w; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let y = 0; y < h; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
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
