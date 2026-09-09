export class Animations {

  /** Promote an element to its own GPU compositing layer before animating. */
  static _promote(el) {
    el.style.willChange = 'transform, opacity';
  }

  /** Release the GPU layer after animation — frees memory for idle coins. */
  static _demote(el) {
    el.style.willChange = '';
  }

  /** Cancel any running Web Animations on the element to avoid conflicts. */
  static _cancelExisting(el) {
    el.getAnimations().forEach(a => a.cancel());
  }

  /**
   * Staggered falling drop animation for newly dropped coins.
   * Coins fall in from above one by one with a gentle bounce.
   */
  static async animateDropIn(coinEls) {
    if (!coinEls || coinEls.length === 0) return;

    // Promote all to GPU layers BEFORE measuring/animating
    coinEls.forEach(el => {
      Animations._cancelExisting(el);
      Animations._promote(el);
    });

    // Batch all .animate() calls inside one rAF so they share the same start frame
    const animFinished = new Promise(resolve => {
      requestAnimationFrame(() => {
        const promises = coinEls.map((el, index) => {
          const delay = index * 55;

          const anim = el.animate([
            { transform: 'translateY(-120px) scale(0.7)', opacity: 0 },
            { transform: 'translateY(6px) scale(1.08)', opacity: 1, offset: 0.75 },
            { transform: 'translateY(0) scale(1)', opacity: 1 }
          ], {
            duration: 400,
            delay,
            easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
            fill: 'both'
          });

          anim.onfinish = () => {
            Animations._demote(el);
            anim.cancel(); // Release so CSS class transforms work
          };

          return anim.finished;
        });

        resolve(Promise.all(promises).catch(() => {}));
      });
    });

    const timeoutPromise = new Promise(r => setTimeout(r, 750));
    return Promise.race([animFinished, timeoutPromise]);
  }

  /**
   * Smooth coin flight using FLIP + Web Animations API.
   * Creates a lag-free 3D parabolic arc.
   */
  static async animateSlowFlight(updateFn, elementsToAnimate = []) {
    const validEls = elementsToAnimate.filter(el => el && el.isConnected);
    if (validEls.length === 0) { updateFn(); return; }

    // 1. Measure start positions (before DOM change)
    const startPositions = new Map();
    validEls.forEach(el => {
      Animations._cancelExisting(el);
      Animations._promote(el);
      startPositions.set(el, el.getBoundingClientRect());
    });

    // 2. Mutate DOM
    updateFn();

    // 3. Measure end positions
    const moves = [];
    validEls.forEach((el, index) => {
      const start = startPositions.get(el);
      const end = el.getBoundingClientRect();
      const dx = start.left - end.left;
      const dy = start.top - end.top;

      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        moves.push({ el, dx, dy, index });
      } else {
        // No actual movement — release layer immediately
        Animations._demote(el);
      }
    });

    if (moves.length === 0) return;

    // 4. Batch all .animate() in one rAF for same-frame start (zero stutter)
    const animFinished = new Promise(resolve => {
      requestAnimationFrame(() => {
        const promises = moves.map(({ el, dx, dy, index }) => {
          const delay = index * 65;
          const originalZ = el.style.zIndex;
          el.style.zIndex = 100 + index;

          const anim = el.animate([
            { transform: `translate3d(${dx}px, ${dy}px, 0) scale(1) rotate(0deg)` },
            { transform: `translate3d(${dx * 0.5}px, ${dy * 0.5 - 40}px, 0) scale(1.15) rotate(5deg)` },
            { transform: `translate3d(0, 0, 0) scale(1) rotate(0deg)` }
          ], {
            duration: 480,
            delay,
            easing: 'cubic-bezier(0.34, 1.25, 0.64, 1)',
            fill: 'both'
          });

          anim.onfinish = () => {
            el.style.zIndex = originalZ;
            Animations._demote(el);
            anim.cancel(); // Release so CSS class transforms work
          };

          return anim.finished;
        });

        resolve(Promise.all(promises).catch(() => {}));
      });
    });

    const timeoutPromise = new Promise(r => setTimeout(r, 750));
    return Promise.race([animFinished, timeoutPromise]);
  }

  /**
   * Fusion implosion: 10 coins collapse into center.
   * Optimized: filter only on first/last keyframe, not mid-flight.
   */
  static async animateFusion(coinEls) {
    if (!coinEls || coinEls.length === 0) return;

    const centerEl = coinEls[Math.floor(coinEls.length / 2)];
    if (!centerEl) return;
    const centerRect = centerEl.getBoundingClientRect();

    // Promote all to GPU layers first
    coinEls.forEach(el => {
      Animations._cancelExisting(el);
      Animations._promote(el);
    });

    const animFinished = new Promise(resolve => {
      requestAnimationFrame(() => {
        const promises = coinEls.map((el, index) => {
          const rect = el.getBoundingClientRect();
          const dy = centerRect.top - rect.top;
          const delay = Math.abs(index - 4.5) * 35;

          const anim = el.animate([
            { transform: 'translate3d(0,0,0) scale(1)', opacity: 1, filter: 'brightness(1.5)' },
            { transform: `translate3d(0,${dy * 0.5}px,0) scale(1.2) rotate(10deg)`, opacity: 0.85, offset: 0.5 },
            { transform: `translate3d(0,${dy}px,0) scale(0) rotate(90deg)`, opacity: 0, filter: 'brightness(5)' }
          ], {
            duration: 480,
            delay,
            easing: 'cubic-bezier(0.5, 0, 0.2, 1)',
            fill: 'both'
          });

          anim.onfinish = () => Animations._demote(el);

          return anim.finished;
        });

        resolve(Promise.all(promises).catch(() => {}));
      });
    });

    const timeoutPromise = new Promise(r => setTimeout(r, 750));
    return Promise.race([animFinished, timeoutPromise]);
  }
}