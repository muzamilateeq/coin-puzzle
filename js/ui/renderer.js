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

    // Cache for Coin DOM Elements by ID for smooth View Transitions
    this.coinDomMap = new Map();

    // Callbacks
    this.onSlotClick = null;
  }

  init(onSlotClick) {
    this.onSlotClick = onSlotClick;
    this.coinDomMap.clear();
  }

  render(selectedSlotIndex) {
    // Update Stats UI
    if (this.scoreEl) this.scoreEl.textContent = this.gameLogic.score;
    if (this.gemsEl) this.gemsEl.textContent = this.gameLogic.gems;
    if (this.heartsEl) this.heartsEl.textContent = this.gameLogic.hearts;
    if (this.dropsEl) this.dropsEl.textContent = '∞';

    // Dynamic Target Coin Level required for next slot unlock
    const currentTargetCoin = CONFIG.COIN_TYPES + this.gameLogic.score;
    const totalUnlocked = CONFIG.INITIAL_UNLOCKED_SLOTS + this.gameLogic.score;
    if (this.targetEl) {
      if (totalUnlocked < CONFIG.TOTAL_SLOTS) {
        this.targetEl.textContent = currentTargetCoin;
      } else {
        this.targetEl.textContent = 'MAX';
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
