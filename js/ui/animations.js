export class Animations {

  /** Promote an element to its own GPU compositing layer before animating. */
  static _promote(el) {
    el.style.willChange = 'transform, opacity';
    el.style.transition = 'none';
  }

  /** Release the GPU layer after animation — frees memory for idle coins. */
  static _demote(el) {
    el.style.willChange = '';
    el.style.transition = '';
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
            { transform: 'translateY(6px) scale(1.04)', opacity: 1, offset: 0.75 },
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

        resolve(Promise.all(promises).catch(() => { }));
      });
    });

    const timeoutPromise = new Promise(r => setTimeout(r, 750));
    return Promise.race([animFinished, timeoutPromise]);
  }

  /**
   * Ultra-Premium Fluid Cascade Wave Flight.
   * Coins stream together ("saath saath") in a buttery 60fps cascading 3D arc.
   */
  static async animateSlowFlight(updateFn, elementsToAnimate = []) {
    const validEls = elementsToAnimate.filter(el => el && el.isConnected);
    if (validEls.length === 0) {
      if (typeof updateFn === 'function') updateFn();
      return;
    }

    // 0. Clean up selection class so start measurements are 100% exact & un-offset
    validEls.forEach(el => el.classList.remove('selected-coin'));

    // 1. Measure true start positions before DOM mutation
    const startPositions = new Map();
    validEls.forEach(el => {
      Animations._cancelExisting(el);
      Animations._promote(el);
      startPositions.set(el, el.getBoundingClientRect());
    });

    // Collect all parent slot containers of flying coins BEFORE DOM mutation
    const parentSlots = new Set();
    validEls.forEach(el => {
      if (el.parentElement) parentSlots.add(el.parentElement);
    });

    // 2. Mutate DOM (render coins inside destination slot)
    updateFn();

    // Collect destination parent slot containers AFTER DOM mutation
    validEls.forEach(el => {
      if (el.parentElement) parentSlots.add(el.parentElement);
    });

    // Promote parent slots to highest z-index so flying coins render above ALL other board slots & coins
    parentSlots.forEach(slotEl => {
      slotEl.style.setProperty('z-index', '9999', 'important');
    });

    // 3. Measure true end positions and elevate z-index during flight
    const moves = [];

    validEls.forEach((el, flightIndex) => {
      const start = startPositions.get(el);
      const end = el.getBoundingClientRect();
      const dx = start.left - end.left;
      const dy = start.top - end.top;

      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        // Elevate z-index so flying coin renders on top of all slot contents
        el.style.setProperty('z-index', String(10000 + flightIndex), 'important');
        moves.push({ el, dx, dy, flightIndex });
      } else {
        Animations._demote(el);
      }
    });

    if (moves.length === 0) {
      parentSlots.forEach(slotEl => slotEl.style.removeProperty('z-index'));
      return;
    }

    // 4. Trigger Web Animations API: Fluid Stream Cascade Wave
    const promises = moves.map(({ el, dx, dy, flightIndex }) => {
      const coinDuration = 380; // Crisp 380ms flight per coin
      const delay = flightIndex * 55; // 55ms fluid cascade wave stagger (coins stream together!)
      
      const distance = Math.hypot(dx, dy);
      const arcHeight = Math.max(55, Math.min(110, distance * 0.28));

      const anim = el.animate([
        { transform: `translate3d(${dx}px, ${dy}px, 0)`, offset: 0 },
        { transform: `translate3d(${dx * 0.5}px, ${dy * 0.5 - arcHeight}px, 0)`, offset: 0.5 },
        { transform: `translate3d(0px, 0px, 0)`, offset: 1 }
      ], {
        duration: coinDuration,
        delay,
        easing: 'cubic-bezier(0.25, 1, 0.4, 1)',
        fill: 'both'
      });

      anim.onfinish = () => {
        el.style.removeProperty('z-index');
        Animations._demote(el);
        anim.cancel();
      };

      return anim.finished;
    });

    const totalDuration = (moves.length - 1) * 55 + 380 + 50;
    const timeoutPromise = new Promise(r => setTimeout(r, totalDuration + 300));
    
    try {
      await Promise.race([Promise.all(promises).catch(() => {}), timeoutPromise]);
    } finally {
      // Always cleanup parent slot z-indexes after animation finishes
      parentSlots.forEach(slotEl => slotEl.style.removeProperty('z-index'));
    }
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

        resolve(Promise.all(promises).catch(() => { }));
      });
    });

    const timeoutPromise = new Promise(r => setTimeout(r, 750));
    return Promise.race([animFinished, timeoutPromise]);
  }

  static async animateHammerSmash(slotEl) {
    if (!slotEl) return;

    // 1. Create and inject hammer
    const hammer = document.createElement('img');
    hammer.src = './Assets/hammer-removebg-preview.png';
    hammer.className = 'hammer-anim-img';
    slotEl.appendChild(hammer);

    // Ensure slot has position relative so hammer is positioned correctly
    slotEl.style.position = 'relative';

    // 2. Animate the hammer swinging down
    Animations._promote(hammer);
    const swingAnim = hammer.animate([
      { transform: 'rotate(-45deg) translateY(-20px) scale(1.2)', opacity: 0 },
      { transform: 'rotate(-45deg) translateY(-20px) scale(1.2)', opacity: 1, offset: 0.2 },
      { transform: 'rotate(15deg) translateY(20px) scale(1)', opacity: 1, offset: 0.8 },
      { transform: 'rotate(0deg) translateY(10px) scale(1)', opacity: 1 } // Contact!
    ], {
      duration: 350,
      easing: 'cubic-bezier(0.5, 0, 0.75, 0)', // Accelerate down
      fill: 'forwards'
    });

    await swingAnim.finished.catch(() => {});

    // 3. Contact! Shake the slot and shatter the coins
    slotEl.classList.add('slot-smash');
    
    // Scatter the coins inside the slot
    const coins = Array.from(slotEl.querySelectorAll('.coin'));
    coins.forEach(coin => {
      // Generate random explosion vector
      const angle = (Math.random() - 0.5) * Math.PI; // -90 to 90 degrees (upwards)
      const force = 150 + Math.random() * 150;
      const tx = Math.sin(angle) * force + 'px';
      const ty = (-Math.cos(angle) * force - 100) + 'px'; // Fly up and out
      const rot = (Math.random() - 0.5) * 720 + 'deg';
      
      coin.style.setProperty('--tx', tx);
      coin.style.setProperty('--ty', ty);
      coin.style.setProperty('--rot', rot);
      coin.classList.add('coin-shatter');
    });

    // 4. Hammer recoil and fade out
    const recoilAnim = hammer.animate([
      { transform: 'rotate(0deg) translateY(10px) scale(1)', opacity: 1 },
      { transform: 'rotate(-20deg) translateY(-30px) scale(1.1)', opacity: 0 }
    ], {
      duration: 250,
      easing: 'ease-out',
      fill: 'forwards'
    });

    // Wait for the shatter/recoil to finish (approx 500ms)
    await new Promise(resolve => setTimeout(resolve, 500));

    // 5. Cleanup
    hammer.remove();
    slotEl.classList.remove('slot-smash');
  }
}