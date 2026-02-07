/**
 * PorterDash Background System
 * Animated backgrounds with parallax layers and pixel creatures
 */

class BackgroundSystem {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.particles = [];
    this.bgShapes = [];
    this.creatures = [];
    this.gridOffset = 0;
    this.time = 0;
    this.pulsePhase = 0;
  }

  init(colors, creatureTypes) {
    this.colors = colors;
    this.particles = [];
    this.bgShapes = [];
    this.creatures = [];

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
  }

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

    // Grid lines
    this.drawGrid(rainbowHue);

    // Background shapes (parallax)
    this.drawBgShapes(rainbowHue);

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
  }

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

    // Vertical lines
    const startX = -this.gridOffset;
    for (let x = startX; x < w; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < h; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  drawBgShapes(rainbowHue) {
    const ctx = this.ctx;

    for (const shape of this.bgShapes) {
      const color = rainbowHue !== undefined
        ? `hsla(${rainbowHue + 20}, 70%, 20%, ${shape.opacity})`
        : this.colors.bgShapes;

      ctx.fillStyle = rainbowHue !== undefined ? color : this.colors.bgShapes;
      ctx.globalAlpha = shape.opacity;

      if (shape.type === 'rect') {
        // Rounded rect with glow border
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

        // Border glow
        ctx.strokeStyle = rainbowHue !== undefined
          ? `hsla(${rainbowHue}, 100%, 60%, ${shape.opacity * 0.5})`
          : this.colors.accent1;
        ctx.globalAlpha = shape.opacity * 0.3;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Diamond
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

      // Glow
      ctx.globalAlpha = p.opacity * pulseFactor * 0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
      ctx.fill();

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

  drawBat(ctx, s, hue, isRainbow, frame) {
    const wingFlap = Math.sin(frame * 0.15) * 0.4;
    const color = isRainbow ? `hsl(${hue + 180}, 80%, 60%)` : this.colors.accent1;
    ctx.fillStyle = color;

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.3, s * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wings
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

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(-s * 0.12, -s * 0.08, s * 0.08, s * 0.08);
    ctx.fillRect(s * 0.04, -s * 0.08, s * 0.08, s * 0.08);
  }

  drawFireball(ctx, s, hue, isRainbow, frame) {
    const flicker = Math.sin(frame * 0.2) * 0.2 + 1;
    const color = isRainbow ? `hsl(${hue + 30}, 100%, 60%)` : this.colors.accent2;

    // Glow
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, s * flicker);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.6, color.replace(')', ', 0.4)').replace('hsl', 'hsla').replace('rgb', 'rgba'));
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, s * flicker, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Trailing particles
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

    // Body
    ctx.beginPath();
    ctx.arc(0, -s * 0.2 + bob, s * 0.4, Math.PI, 0);
    ctx.lineTo(s * 0.4, s * 0.3 + bob);
    // Wavy bottom
    for (let i = 4; i >= -4; i--) {
      const wave = Math.sin(frame * 0.08 + i * 0.8) * s * 0.08;
      ctx.lineTo(i * s * 0.1, s * 0.3 + wave + bob);
    }
    ctx.closePath();
    ctx.fill();

    // Eyes
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

    // Outer glow
    ctx.globalAlpha *= 0.4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.6 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha *= 2;
    // Inner core
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting sparks
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

    // Bell
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * (0.4 + pulse), s * (0.3 - pulse), 0, Math.PI, 0);
    ctx.fill();

    // Tentacles
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * s * 0.1, s * 0.05);
      const wave = Math.sin(frame * 0.06 + i * 0.5) * s * 0.15;
      ctx.quadraticCurveTo(i * s * 0.1 + wave, s * 0.3, i * s * 0.1 - wave * 0.5, s * 0.55);
      ctx.stroke();
    }

    // Inner glow dots
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

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(-s * 0.25, -s * 0.1, s * 0.5, s * 0.2);

    // Eye/sensor
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Propellers
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

    // Skull
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Jaw
    ctx.beginPath();
    ctx.ellipse(0, s * 0.15 + jawMove, s * 0.25, s * 0.12, 0, 0, Math.PI);
    ctx.fill();

    // Eyes (dark hollows)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(-s * 0.12, -s * 0.12, s * 0.09, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.12, -s * 0.12, s * 0.09, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing eye dots
    ctx.fillStyle = isRainbow ? `hsl(${hue}, 100%, 50%)` : this.colors.portal;
    ctx.beginPath();
    ctx.arc(-s * 0.12, -s * 0.12, s * 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.12, -s * 0.12, s * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }
}
