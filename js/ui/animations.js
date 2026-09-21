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
   * Beautiful glowing pop animation when a slot is unlocked using gems.
   */
  static async animateSlotUnlock(slotEl) {
    const patchEl = slotEl.querySelector('.locked-patch');
    if (!patchEl) return;

    Animations._cancelExisting(patchEl);
    Animations._promote(patchEl);
    Animations._promote(slotEl); // Ensure the slot itself is above other elements during explosion

    // 1. Shake and glow (cracking pressure)
    const shakeAnim = patchEl.animate([
      { transform: 'translate(-50%, -50%) rotate(0deg) scale(1)', filter: 'brightness(1)' },
      { transform: 'translate(-53%, -47%) rotate(-4deg) scale(1.02)', filter: 'brightness(1.2)' },
      { transform: 'translate(-47%, -53%) rotate(4deg) scale(1.04)', filter: 'brightness(1.4)' },
      { transform: 'translate(-53%, -47%) rotate(-4deg) scale(1.06)', filter: 'brightness(1.6)' },
      { transform: 'translate(-47%, -53%) rotate(4deg) scale(1.08)', filter: 'brightness(1.8)' },
      { transform: 'translate(-50%, -50%) rotate(0deg) scale(1.15)', filter: 'brightness(2)' }
    ], { duration: 350, easing: 'linear' });

    await shakeAnim.finished.catch(() => {});
    
    // Hide the original patch completely
    patchEl.style.opacity = '0';

    // 2. Balanced Shatter explosion
    const isTimeSlot = slotEl.classList.contains('locked-time');
    const colors = isTimeSlot ? ['#2A3C93', '#4A5CC3', '#FFFFFF'] : ['#5A3311', '#8B4513', '#D28522', '#FFD700'];
    
    const animPromises = [];
    
    // Shockwave effect
    const wave = document.createElement('div');
    wave.style.position = 'absolute';
    wave.style.top = '50%'; wave.style.left = '50%';
    wave.style.width = '40px'; wave.style.height = '40px';
    wave.style.border = `3px solid ${colors[0]}`;
    wave.style.borderRadius = '50%';
    wave.style.transform = 'translate(-50%, -50%) scale(0)';
    wave.style.zIndex = '89';
    wave.style.pointerEvents = 'none';
    slotEl.appendChild(wave);
    animPromises.push(wave.animate([
      { transform: 'translate(-50%, -50%) scale(0)', opacity: 0.8, borderWidth: '6px' },
      { transform: 'translate(-50%, -50%) scale(3.5)', opacity: 0, borderWidth: '0px' }
    ], { duration: 400, easing: 'ease-out' }).finished.then(() => wave.remove()));

    // Debris Particles
    const particleCount = 20; // Reduced for balance
    
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.style.position = 'absolute';
      const size = 5 + Math.random() * 15; // 5px to 20px
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.clipPath = Math.random() > 0.5 
        ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' 
        : 'polygon(0 0, 100% 30%, 70% 100%, 10% 80%)';
      p.style.top = '50%';
      p.style.left = '50%';
      p.style.zIndex = '100';
      p.style.pointerEvents = 'none';
      if (Math.random() > 0.8) {
        p.style.boxShadow = `0 0 5px ${p.style.backgroundColor}`;
      }
      slotEl.appendChild(p);
      
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.5);
      const velocity = 50 + Math.random() * 70; // Slower burst
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity - 40; // Slight upward bias
      const fallY = ty + 100 + Math.random() * 100; // Softer fall
      const rot = (Math.random() - 0.5) * 720;
      
      const pAnim = p.animate([
        { transform: `translate(-50%, -50%) rotate(0deg) scale(1)`, opacity: 1 },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rot/2}deg) scale(1.1)`, opacity: 1, offset: 0.5 },
        { transform: `translate(calc(-50% + ${tx * 1.2}px), calc(-50% + ${fallY}px)) rotate(${rot}deg) scale(0)`, opacity: 0 }
      ], {
        duration: 600 + Math.random() * 300,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        fill: 'forwards'
      });
      
      animPromises.push(pAnim.finished.then(() => p.remove()).catch(() => p.remove()));
    }

    await Promise.all(animPromises);
    Animations._demote(patchEl);
    Animations._demote(slotEl);
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
          const delay = index * 80; // Increased stagger from 55 to 80ms

          const anim = el.animate([
            { transform: 'translateY(-150%) scale(0.7)', opacity: 0 },
            { transform: 'translateY(10%) scale(1.04)', opacity: 1, offset: 0.75 },
            { transform: 'translateY(0) scale(1)', opacity: 1 }
          ], {
            duration: 650, // Increased duration from 400 to 650ms for smooth elegant drop
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

    // 2. Mutate DOM (render coins inside destination slot)
    updateFn();

    // Collect destination parent slot containers AFTER DOM mutation
    const parentSlots = new Set();
    validEls.forEach(el => {
      if (el.parentElement) parentSlots.add(el.parentElement);
    });

    // Promote destination parent slots to highest z-index so flying coins render above ALL other board slots
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
      const coinDuration = 550; // Increased flight duration from 380 to 550ms
      const delay = flightIndex * 75; // Increased stagger from 55 to 75ms

      const distance = Math.hypot(dx, dy);
      const arcHeight = Math.max(70, Math.min(140, distance * 0.35)); // slightly higher arc

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

    const totalDuration = (moves.length - 1) * 75 + 550 + 50;
    const timeoutPromise = new Promise(r => setTimeout(r, totalDuration + 300));

    try {
      await Promise.race([Promise.all(promises).catch(() => { }), timeoutPromise]);
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
    hammer.src = './Assets/board-ui/hammer-removebg-preview.png';
    hammer.className = 'hammer-anim-img';
    slotEl.appendChild(hammer);

    // Ensure slot has position relative so hammer is positioned correctly
    slotEl.style.position = 'relative';

    // 2. Animate the hammer swinging down
    Animations._promote(hammer);
    const swingAnim = hammer.animate([
      { transform: 'rotate(-45deg) translateY(-30%) scale(1.2)', opacity: 0 },
      { transform: 'rotate(-45deg) translateY(-30%) scale(1.2)', opacity: 1, offset: 0.2 },
      { transform: 'rotate(15deg) translateY(30%) scale(1)', opacity: 1, offset: 0.8 },
      { transform: 'rotate(0deg) translateY(15%) scale(1)', opacity: 1 } // Contact!
    ], {
      duration: 350,
      easing: 'cubic-bezier(0.5, 0, 0.75, 0)', // Accelerate down
      fill: 'forwards'
    });

    await swingAnim.finished.catch(() => { });

    // 3. Contact! Shake the slot and shatter the coins
    slotEl.classList.add('slot-smash');

    // Scatter the coins inside the slot
    const coins = Array.from(slotEl.querySelectorAll('.coin'));
    const vh = window.innerHeight;
    coins.forEach(coin => {
      // Generate random explosion vector
      const angle = (Math.random() - 0.5) * Math.PI; // -90 to 90 degrees (upwards)
      const force = vh * (0.15 + Math.random() * 0.15); // Dynamic force based on screen height
      const tx = Math.sin(angle) * force + 'px';
      const ty = (-Math.cos(angle) * force - (vh * 0.1)) + 'px'; // Fly up and out
      const rot = (Math.random() - 0.5) * 720 + 'deg';

      coin.style.setProperty('--tx', tx);
      coin.style.setProperty('--ty', ty);
      coin.style.setProperty('--rot', rot);
      coin.classList.add('coin-shatter');
    });

    // 4. Hammer recoil and fade out
    const hammerFinish = hammer.animate([
      { transform: 'rotate(0deg) translateY(15%) scale(1)', opacity: 1 },
      { transform: 'rotate(-20deg) translateY(-40%) scale(1.1)', opacity: 0 }
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