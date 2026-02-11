# PorterDash – Ideas to make the game better

Suggestions for **game feel**, **graphics**, and **performance**. Pick what fits your goals.

---

## Game feel

- **Respawn flow**: Music now keeps playing after a crash until you click to retry; consider a short “press any key / click to retry” hint on the death overlay.
- **Camera**: Slight forward look-ahead (camera target slightly ahead of the cube) so upcoming obstacles are easier to read.
- **Juice**: Small screen shake on collectible pickup, light rumble on landing from flight, or a brief “slow-mo” on death (e.g. 0.1s at 0.3x speed then resume).
- **Difficulty curve**: In later levels, add one or two “safe” flight portals so players can recover; vary obstacle density (e.g. breather sections between hard clusters).
- **Checkpoints**: Optional mid-level checkpoints (e.g. every 30–40% progress) with a short respawn animation.

---

## Graphics

- **Ground**: Hill fill is now one continuous path per run (no visible seam at peaks). You could add a second, darker fill slightly offset for a simple “shadow” under the terrain.
- **Background**: Silhouette and mountain opacity were increased so the background reads better; you can tweak `globalAlpha` in `backgrounds.js` (e.g. 0.35–0.5) to taste.
- **Particles**: Cap death and trail particle counts (e.g. 60–80) and reuse objects instead of creating new ones every frame to reduce GC and keep FPS stable.
- **Glow**: Reduce `ctx.shadowBlur` when FPS drops (e.g. if `deltaTime` &gt; 20 ms, use half blur) to keep the look without stutter.
- **Theme variety**: Use level `bgTheme` more (e.g. different sky gradients, stronger color shifts between levels) so each level feels distinct.

---

## Performance

- **Draw calls**: Batch similar draws (e.g. all spikes, all blocks) and avoid changing `fillStyle`/`strokeStyle` more than needed.
- **Offscreen canvas**: Draw static or slowly changing layers (e.g. grid, distant mountains) to an offscreen canvas and only redraw when scroll or theme changes beyond a threshold.
- **requestAnimationFrame**: Use a single game loop (you already do); avoid extra timers or intervals for visual updates.
- **Object pooling**: Reuse arrays/objects for particles, obstacles in view, and ground segments instead of allocating new ones each frame or each level load.
- **Visibility culling**: Skip drawing obstacles and ground segments that are fully off-screen (you already cull some; extend to all draw loops).
- **Reduce work when dead**: When `state === 'dead'`, skip or simplify background updates (e.g. parallax, particles) until the player retries.

---

## Quick wins already in place

- Music continues after crash until retry (no stop on death).
- Ground drawn as continuous path per run to remove hill-peak color/shift.
- Stronger background visibility (silhouettes and mountains).

You can implement these in small steps and test on a slow device to see the impact.
