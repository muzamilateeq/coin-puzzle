import { CONFIG } from '../config.js';
import { createCoinSvg } from './coinSvg.js';

export class Renderer {
  constructor(board, gameLogic, dropManager) {
    this.board = board;
    this.gameLogic = gameLogic;
    this.dropManager = dropManager;

    // DOM Elements
    this.boardEl = document.getElementById('game-board');
    this.scoreEl = document.getElementById('ui-score');
    this.gemsEl = document.getElementById('ui-gems');
    this.heartsEl = document.getElementById('ui-hearts');
    this.targetEl = document.getElementById('ui-target');
    this.dropsEl = document.getElementById('ui-drops');
    this.dropBtn = document.getElementById('btn-drop');

    this.hudBaseCurrent = document.getElementById('hud-base-current');
    this.hudBaseNext = document.getElementById('hud-base-next');
    this.hudCountCurrent = document.getElementById('hud-count-current');
    this.hudCountNext = document.getElementById('hud-count-next');

    // Cache for Coin DOM Elements by ID for smooth View Transitions
    this.coinDomMap = new Map();

    // Callbacks
    this.onSlotClick = null;
  }

  init(onSlotClick) {
    this.onSlotClick = onSlotClick;
    this.coinDomMap.clear();

    if (!this.hudListenerAdded) {
      window.addEventListener('hudGoalCompleted', this.handleHudGoalCompleted.bind(this));
      this.hudListenerAdded = true;
    }
  }

  handleHudGoalCompleted(e) {
    const coinType = e.detail.coinType;
    let targetHudBox = null;
    
    if (this.hudBaseCurrent && this.hudBaseCurrent.dataset.svgKey === `${coinType}_true`) {
      targetHudBox = this.hudBaseCurrent;
    } else if (this.hudBaseNext && this.hudBaseNext.dataset.svgKey === `${coinType}_true`) {
      targetHudBox = this.hudBaseNext;
    }

    if (targetHudBox) {
        // Create green tick
        const tick = document.createElement('div');
        tick.className = 'hud-checkmark';
        tick.innerHTML = '✔';
        targetHudBox.appendChild(tick);
        
        // Add celebrate animation
        targetHudBox.classList.add('hud-celebrate');
        
        // Floating +10 Gems
        const floatText = document.createElement('div');
        floatText.className = 'floating-gem-text';
        floatText.innerHTML = '+10 <img src="assets/gem.png" style="width:20px; vertical-align:middle; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));">';
        targetHudBox.appendChild(floatText);
        
        // Cleanup after animation
        setTimeout(() => {
            if (tick.parentNode) tick.remove();
            if (floatText.parentNode) floatText.remove();
            targetHudBox.classList.remove('hud-celebrate');
        }, 1500);
    }
  }

  render(selectedSlotIndex) {
    // Update Stats UI
    if (this.scoreEl) {
      this.scoreEl.textContent = this.gameLogic.score;
      const hudLevelContainer = this.scoreEl.closest('.hud-level-text');
      if (hudLevelContainer) {
        hudLevelContainer.style.visibility = this.gameLogic.score === 0 ? 'hidden' : 'visible';
      }
    }
    if (this.gemsEl) this.gemsEl.textContent = this.gameLogic.gems;
    if (this.heartsEl) this.heartsEl.textContent = this.gameLogic.hearts;
    if (this.dropsEl) this.dropsEl.textContent = '∞';
    if (this.hammersEl) this.hammersEl.textContent = this.gameLogic.hammers;

    if (this.uiCoins) this.uiCoins.textContent = this.gameLogic.coins;

    // Dynamic Target Coin Level required for next slot unlock
    const currentMaxCoin = CONFIG.COIN_TYPES + this.gameLogic.score;

    // Helper to find the TOTAL count of a specific coin type across the ENTIRE board
    const getTotalCount = (type) => {
      let total = 0;
      const boardObj = (this.gameLogic && this.gameLogic.board) || this.board;
      if (boardObj) {
        const slots = boardObj.getAllSlots();
        for (const slot of slots) {
          if (slot.isEmpty()) continue;
          for (const c of slot.coins) {
            if (c.type === type) total++;
          }
        }
      }
      return total;
    };

    const totalUnlocked = CONFIG.INITIAL_UNLOCKED_SLOTS + this.gameLogic.score;
    
    if (this.targetEl) {
      if (totalUnlocked < CONFIG.TOTAL_SLOTS) {
        this.targetEl.textContent = currentMaxCoin;
      } else {
        this.targetEl.textContent = 'MAX';
      }
    }

    // Update HUD Coin Bases Visibility
    const hudCoinBases = document.getElementById('hud-coin-bases');
    if (hudCoinBases) {
      if (this.gameLogic.score >= 1) { // Hide on score 0, show from score 1 (Coin 4 target)
        hudCoinBases.style.visibility = 'visible';
      } else {
        hudCoinBases.style.visibility = 'hidden';
      }
    }

    // Update HUD Coin Bases with SVGs
    if (this.hudBaseCurrent && this.hudBaseNext) {
      const score = this.gameLogic.score;

      if (score >= 4) {
        if (score % 2 === 0) {
          // Phase A: (Scores 4, 6, 8...) -> Target = 6 of coin N
          const N = (score / 2) + 4;
          this.hudBaseNext.style.display = 'none';
          
          const leftCoin = N;
          const svgKey1 = `${leftCoin}_true`;
          if (this.hudBaseCurrent.dataset.svgKey !== svgKey1) {
            const oldSvg = this.hudBaseCurrent.querySelector('svg');
            if (oldSvg) oldSvg.remove();
            
            let svgStr = createCoinSvg(leftCoin, true);
            svgStr = svgStr.replace('class="coin-svg"', 'class="coin-svg hud-svg"');
            this.hudBaseCurrent.insertAdjacentHTML('afterbegin', svgStr);
            this.hudBaseCurrent.dataset.svgKey = svgKey1;
          }
          
          if (this.hudCountCurrent) {
            const maxCount = getTotalCount(leftCoin);
            this.hudCountCurrent.textContent = Math.max(0, CONFIG.PHASE_A_TARGET - maxCount);
          }
        } else {
          // Phase B: (Scores 5, 7, 9...) -> Target = 1 of coin N+1, AND reach MAX_PER_SLOT for coin N
          const N = ((score - 1) / 2) + 4;
          this.hudBaseNext.style.display = 'flex';
          
          const leftCoin = N + 1;
          const rightCoin = N;
          
          const svgKey1 = `${leftCoin}_true`;
          if (this.hudBaseCurrent.dataset.svgKey !== svgKey1) {
            const oldSvg = this.hudBaseCurrent.querySelector('svg');
            if (oldSvg) oldSvg.remove();
            
            let svgStr = createCoinSvg(leftCoin, true);
            svgStr = svgStr.replace('class="coin-svg"', 'class="coin-svg hud-svg"'); // fully colored
            this.hudBaseCurrent.insertAdjacentHTML('afterbegin', svgStr);
            this.hudBaseCurrent.dataset.svgKey = svgKey1;
          }
          
          const svgKey2 = `${rightCoin}_true`;
          if (this.hudBaseNext.dataset.svgKey !== svgKey2) {
            const oldSvg = this.hudBaseNext.querySelector('svg');
            if (oldSvg) oldSvg.remove();
            
            let svgStr = createCoinSvg(rightCoin, true);
            svgStr = svgStr.replace('class="coin-svg"', 'class="coin-svg hud-svg"');
            this.hudBaseNext.insertAdjacentHTML('afterbegin', svgStr);
            this.hudBaseNext.dataset.svgKey = svgKey2;
          }
          
          if (this.hudCountCurrent) {
            this.hudCountCurrent.textContent = Math.max(0, CONFIG.PHASE_B_TARGET - getTotalCount(leftCoin));
          }
          if (this.hudCountNext) {
            this.hudCountNext.textContent = Math.max(0, CONFIG.MAX_PER_SLOT - getTotalCount(rightCoin));
          }
        }
      } else {
        // Early levels (Score 1, 2, 3)
        if (score === 1) {
          // At Level 1, ONLY show the target box (Coin 4)
          this.hudBaseNext.style.display = 'none';
          
          const targetCoin = currentMaxCoin + 1;
          const svgKey = `${targetCoin}_true`;
          
          if (this.hudBaseCurrent.dataset.svgKey !== svgKey) {
            const oldSvg = this.hudBaseCurrent.querySelector('svg');
            if (oldSvg) oldSvg.remove();
            
            let svgStr = createCoinSvg(targetCoin, true);
            svgStr = svgStr.replace('class="coin-svg"', 'class="coin-svg hud-svg"');
            this.hudBaseCurrent.insertAdjacentHTML('afterbegin', svgStr);
            this.hudBaseCurrent.dataset.svgKey = svgKey;
          }
          
          if (this.hudCountCurrent) {
            const maxCount = getTotalCount(targetCoin);
            this.hudCountCurrent.textContent = Math.max(0, 1 - maxCount).toString();
          }
        } else {
          // At Level 2 & 3, show TWO boxes (Target and Current Max)
          this.hudBaseNext.style.display = 'flex';
          
          // 1. Left Box (Next Upcoming Locked Coin, e.g., 5)
          const leftCoin = currentMaxCoin + 1;
          const svgKey1 = `${leftCoin}_true`;
          if (this.hudBaseCurrent.dataset.svgKey !== svgKey1) {
            const oldSvg = this.hudBaseCurrent.querySelector('svg');
            if (oldSvg) oldSvg.remove();
            
            let svgStr = createCoinSvg(leftCoin, true);
            svgStr = svgStr.replace('class="coin-svg"', 'class="coin-svg hud-svg next-locked-coin"');
            this.hudBaseCurrent.insertAdjacentHTML('afterbegin', svgStr);
            this.hudBaseCurrent.dataset.svgKey = svgKey1;
          }
          
          // 2. Right Box (Currently Collecting Coin, e.g., 4)
          const rightCoin = currentMaxCoin;
          const svgKey2 = `${rightCoin}_true`;
          if (this.hudBaseNext.dataset.svgKey !== svgKey2) {
            const oldSvg = this.hudBaseNext.querySelector('svg');
            if (oldSvg) oldSvg.remove();
            
            let svgStr = createCoinSvg(rightCoin, true);
            svgStr = svgStr.replace('class="coin-svg"', 'class="coin-svg hud-svg"');
            this.hudBaseNext.insertAdjacentHTML('afterbegin', svgStr);
            this.hudBaseNext.dataset.svgKey = svgKey2;
          }
          
          // Set the text under the coins
          if (this.hudCountCurrent) this.hudCountCurrent.textContent = '1';
          if (this.hudCountNext) {
            const maxCount = getTotalCount(rightCoin);
            this.hudCountNext.textContent = Math.max(0, CONFIG.MAX_PER_SLOT - maxCount);
          }
        }
      }
    }

    // Drop button state
    const hasEmptySpace = this.board.hasEmptySpace();
    this.dropBtn.disabled = (
      this.gameLogic.gameState !== 'playing' ||
      !hasEmptySpace
    );

    this.renderBoard(selectedSlotIndex);
    this.renderHeartTimer();
  }

  renderHeartTimer() {
    const timerEl = document.getElementById('ui-heart-timer');
    if (!timerEl) return;
    
    if (this.gameLogic.hearts >= 5) {
      timerEl.textContent = 'Full';
    } else if (this.gameLogic.nextHeartTime) {
      const remaining = Math.max(0, Math.ceil((this.gameLogic.nextHeartTime - Date.now()) / 1000));
      const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
      const secs = (remaining % 60).toString().padStart(2, '0');
      timerEl.textContent = `${mins}:${secs}`;
    }
    
    if (this.heartsEl) this.heartsEl.textContent = this.gameLogic.hearts;
  }

  async playBoardTransitionAnimation(newTotalSlots) {
    // 1. Clone the current board for the exit animation
    const clone = this.boardEl.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.top = this.boardEl.offsetTop + 'px';
    clone.style.left = this.boardEl.offsetLeft + 'px';
    clone.style.width = this.boardEl.offsetWidth + 'px';
    clone.style.height = this.boardEl.offsetHeight + 'px';
    clone.style.zIndex = '100';
    clone.style.transition = 'transform 1s ease-in-out, opacity 1s ease-in-out';
    this.boardEl.parentElement.appendChild(clone);

    // 2. Clear the actual game board in logic and DOM
    this.board.clearAll();
    this.board.unlockSlotsUpTo(newTotalSlots, (idx) => this.gameLogic.getScoreToUnlockSlot(idx, this.gameLogic.score));
    
    Array.from(this.boardEl.children).forEach(slotEl => {
       const coins = slotEl.querySelectorAll('.coin');
       coins.forEach(c => c.remove());
    });
    this.coinDomMap.clear();

    // 3. Render the updated locks on the real board
    this.renderBoard(null);

    // 4. Position the real board below the screen
    this.boardEl.style.transition = 'none';
    this.boardEl.style.transform = 'translateY(100vh)';
    
    // Force reflow
    this.boardEl.offsetHeight;

    // 5. Animate both
    this.boardEl.style.transition = 'transform 1s ease-in-out';
    clone.style.transform = 'translateY(-100vh)';
    this.boardEl.style.transform = 'translateY(0)';

    // 6. Wait for animation
    await new Promise(r => setTimeout(r, 1000));

    // 7. Cleanup
    clone.remove();
    this.boardEl.style.transition = 'none';
  }

  renderBoard(selectedSlotIndex) {
    const slots = this.board.getAllSlots();

    // Initialize slots if they don't exist yet
    if (this.boardEl.children.length !== slots.length) {
      this.boardEl.innerHTML = '';
      slots.forEach((slot, index) => {
        const slotEl = document.createElement('div');
        slotEl.className = 'slot';
        slotEl.addEventListener('click', () => {
          if (this.onSlotClick) this.onSlotClick(index);
        });
        this.boardEl.appendChild(slotEl);
      });
    }

    const activeCoinIds = new Set();

    // Sync state for all slots and coins
    slots.forEach((slot, index) => {
      const slotEl = this.boardEl.children[index];

      // Update slot classes — preserve animation classes already set
      let slotClass = 'slot';
      const isEffectivelyLocked = slot.isLocked && !slot.isTempUnlocked;
      
      if (isEffectivelyLocked) {
        slotClass += ' locked';
        if (slot.lockType) {
          slotClass += ` locked-special locked-${slot.lockType}`;
        }
      }
      if (selectedSlotIndex === index) slotClass += ' selected';
      if (slot.isPendingShift) slotClass += ' pending-shift'; // Visual cue when timer ends
      // BUG FIX: Don't strip animation classes set by processTransferLifecycle
      if (slotEl.classList.contains('slot-celebrate')) slotClass += ' slot-celebrate';

      slotEl.className = slotClass;

      // Handle rendering special locked slot internals
      if (isEffectivelyLocked && slot.lockType) {
        let patchEl = slotEl.querySelector('.locked-patch');
        
        // Rebuild patch if it doesn't exist or if its type/level/temp state has changed
        const currentLevel = slot.unlockLevel ? String(slot.unlockLevel) : '';
        const tempState = slot.isTempUnlocked ? '1' : '0';
        
        if (!patchEl || patchEl.dataset.lockType !== slot.lockType || patchEl.dataset.tempState !== tempState) {
          if (patchEl) patchEl.remove();
          
          patchEl = document.createElement('div');
          patchEl.className = 'locked-patch';
          patchEl.dataset.lockType = slot.lockType;
          patchEl.dataset.unlockLevel = currentLevel;
          patchEl.dataset.tempState = tempState;
          
          if (slot.lockType === 'gem') {
            const levelText = slot.unlockLevel ? `<div class="locked-level">LEVEL ${slot.unlockLevel}</div>` : '<div class="locked-level"></div>';
            const costText = slot.unlockCost !== null ? slot.unlockCost : 600;
            
            patchEl.innerHTML = `
              ${levelText}
              <img src="./Assets/Gameplay/Plus Iocn_.png" class="locked-icon-plus-center" />
              <div class="locked-bottom-row">
                <img src="./Assets/Gameplay/Gem.png" class="locked-icon-gem" />
                <span class="locked-cost">${costText}</span>
              </div>
            `;
          } else if (slot.lockType === 'time') {
            const timeVal = slot.timeBonus !== null ? slot.timeBonus : 60;
            
            patchEl.innerHTML = `
              <div class="locked-level">EXTRA</div>
              <img src="./Assets/Gameplay/Extra Time Icon_.png" class="locked-icon-time-center" />
              <div class="locked-bottom-row">
                <span class="locked-cost">${timeVal} Sec</span>
              </div>
            `;
          } else if (slot.lockType === 'padlock') {
            patchEl.innerHTML = `
              <img src="./Assets/Gameplay/Lock Base.png" class="locked-icon-padlock" />
            `;
          }
          // Insert at the beginning so it stays behind coins if any
          slotEl.insertBefore(patchEl, slotEl.firstChild);
        } else {
          // If patch exists and type is same, just update text to avoid image flickering
          if (patchEl.dataset.unlockLevel !== currentLevel) {
            patchEl.dataset.unlockLevel = currentLevel;
            const levelEl = patchEl.querySelector('.locked-level');
            if (levelEl && currentLevel) {
              levelEl.textContent = `LEVEL ${currentLevel}`;
            }
          }
        }
      } else {
        // Normal lock or Unlocked: clean up the special patch if it exists
        const patchEl = slotEl.querySelector('.locked-patch');
        if (patchEl) patchEl.remove();
      }

      // Handle floating temp timer overlay
      let tempTimerEl = slotEl.querySelector('.slot-temp-timer');
      if (slot.isTempUnlocked) {
        if (!tempTimerEl) {
          tempTimerEl = document.createElement('div');
          tempTimerEl.className = 'slot-temp-timer';
          slotEl.appendChild(tempTimerEl);
        }
        tempTimerEl.textContent = `${slot.tempUnlockTimeLeft}s`;
        if (slot.isPendingShift) {
          tempTimerEl.classList.add('pending');
        } else {
          tempTimerEl.classList.remove('pending');
        }
      } else if (tempTimerEl) {
        tempTimerEl.remove();
      }

      // Sync coins
      const matchCount = slot.getConsecutiveMatches();
      const matchStartIndex = slot.length - matchCount;

      slot.coins.forEach((coin, coinIndex) => {
        activeCoinIds.add(coin.id);

        let coinEl = this.coinDomMap.get(coin.id);
        if (!coinEl) {
          coinEl = document.createElement('div');
          this.coinDomMap.set(coin.id, coinEl);
        }

        let coinClass = `coin type-${coin.type}`;

        // Always reset drop marker so old coins are never re-animated
        delete coinEl.dataset.newDrop;

        if (coin.isCelebrating) {
          coinClass += ' coins-celebrate';
        } else if (coin.isShrinking) {
          coinClass += ' coins-shrink';
        } else if (coin.isNewDrop) {
          // Mark ONLY new coins for staggered drop animation in main.js
          coinEl.dataset.newDrop = 'true';
          coin.isNewDrop = false;
        } else if (coin.isNewMerge) {
          coinClass += ' merging';
          coin.isNewMerge = false;
        }

        if (selectedSlotIndex === index && coinIndex >= matchStartIndex) {
          coinClass += ' selected-coin';
        }

        const isStackFrontCoin = (coinIndex === slot.coins.length - 1);
        if (isStackFrontCoin) {
          coinClass += ' has-label';
        }

        coinEl.className = coinClass;
        coinEl.style.viewTransitionName = '';

        // SVG Coin Rendering: inject SVG, only re-render when type/label changes
        const svgKey = `${coin.type}_${isStackFrontCoin}`;
        if (coinEl.dataset.svgKey !== svgKey) {
          coinEl.innerHTML = createCoinSvg(coin.type, isStackFrontCoin);
          coinEl.dataset.svgKey = svgKey;
        }

        // BUG FIX: Use insertBefore to maintain correct coin stacking order
        const currentChild = slotEl.children[coinIndex];
        if (currentChild !== coinEl) {
          slotEl.insertBefore(coinEl, currentChild || null);
        }
      });
    });

    // Cleanup dead coin elements — collect IDs first to avoid mutation-during-iteration
    const deadIds = [];
    for (const [id] of this.coinDomMap.entries()) {
      if (!activeCoinIds.has(id)) deadIds.push(id);
    }
    for (const id of deadIds) {
      const el = this.coinDomMap.get(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
      this.coinDomMap.delete(id);
    }
  }

  shakeSelectedCoins(slotIndex) {
    const slotEls = this.boardEl.querySelectorAll('.slot');
    if (slotEls[slotIndex]) {
      const selectedCoins = slotEls[slotIndex].querySelectorAll('.selected-coin');
      selectedCoins.forEach(coinEl => {
        coinEl.classList.add('shake');
        setTimeout(() => coinEl.classList.remove('shake'), 300);
      });
    }
  }

  spawnStarBurst(slotIndex) {
    const slotEl = this.boardEl.children[slotIndex];
    if (!slotEl) return;

    // Spawn vertical golden star laser line sliding down the slot
    const beam = document.createElement('div');
    beam.className = 'gold-beam-line';
    slotEl.appendChild(beam);
    setTimeout(() => beam.remove(), 1100);

    // Spawn central golden lens flare starburst
    const flare = document.createElement('div');
    flare.className = 'star-flare';
    slotEl.appendChild(flare);
    setTimeout(() => flare.remove(), 900);

    // Spawn subtle golden ✦ starburst rays
    const starCount = 10;
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.className = 'star-particle';
      star.textContent = '✦';

      const angle = (i / starCount) * Math.PI * 2 + (Math.random() * 0.4);
      const dist = 50 + Math.random() * 40;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;

      star.style.setProperty('--tx', `${tx}px`);
      star.style.setProperty('--ty', `${ty}px`);

      slotEl.appendChild(star);
      setTimeout(() => star.remove(), 950);
    }
  }

  showModal(title, msg, onRestart) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMsg = document.getElementById('modal-msg');
    const modalRestartBtn = document.getElementById('btn-modal-restart');

    modalTitle.textContent = title;
    modalMsg.textContent = msg;
    modal.classList.add('active');

    modalRestartBtn.onclick = () => {
      modal.classList.remove('active');
      if (onRestart) onRestart();
    };
  }

  hideModal() {
    document.getElementById('modal').classList.remove('active');
  }
}
