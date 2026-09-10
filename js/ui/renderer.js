import { CONFIG } from '../config.js';

export class Renderer {
  constructor(board, gameLogic, dropManager) {
    this.board = board;
    this.gameLogic = gameLogic;
    this.dropManager = dropManager;

    // DOM Elements
    this.boardEl = document.getElementById('game-board');
    this.scoreEl = document.getElementById('ui-score');
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
    this.targetEl.textContent = CONFIG.TARGET_SCORE;
    this.coinDomMap.clear();
  }

  render(selectedSlotIndex) {
    // Update Stats UI
    this.scoreEl.textContent = this.gameLogic.score;
    if (this.dropsEl) this.dropsEl.textContent = '∞';

    // Drop button state
    const hasEmptySpace = this.board.hasEmptySpace();
    this.dropBtn.disabled = (
      this.gameLogic.gameState !== 'playing' ||
      !hasEmptySpace
    );

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
      if (slot.isLocked) slotClass += ' locked';
      if (selectedSlotIndex === index) slotClass += ' selected';
      // BUG FIX: Don't strip animation classes set by processTransferLifecycle
      if (slotEl.classList.contains('slot-celebrate')) slotClass += ' slot-celebrate';

      slotEl.className = slotClass;

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

        coinEl.className = coinClass;
        coinEl.textContent = coin.type;
        // Remove stale viewTransitionName - no longer using View Transitions API
        coinEl.style.viewTransitionName = '';

        // BUG FIX: Use insertBefore to maintain correct coin stacking order
        const currentChild = slotEl.children[coinIndex];
        if (currentChild !== coinEl) {
          slotEl.insertBefore(coinEl, currentChild || null);
        }
      });
    });

    // Cleanup dead coin elements
    for (const [id, el] of this.coinDomMap.entries()) {
      if (!activeCoinIds.has(id)) {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
        this.coinDomMap.delete(id);
      }
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
