import { CONFIG } from './config.js';
import { resetCoinCounter } from './core/Coin.js';
import { Board } from './core/Board.js';
import { GameLogic } from './logic/gameLogic.js';
import { DropManager } from './logic/dropManager.js';
import { Renderer } from './ui/renderer.js';
import { Animations } from './ui/animations.js';

class GameController {
  constructor() {
    this.board = new Board();
    this.logic = new GameLogic(this.board);
    this.dropManager = new DropManager(this.board);
    this.renderer = new Renderer(this.board, this.logic, this.dropManager);

    this.selectedSlotIndex = null;
    this.busySlots = new Set();
    this.isHammerActive = false;

    this.bindEvents();
    this.init();
  }

  bindEvents() {
    this.renderer.init((index) => this.handleSlotClick(index));

    document.getElementById('btn-drop').addEventListener('click', () => this.handleDrop());

    const btnHammer = document.getElementById('btn-hammer');
    if (btnHammer) {
      btnHammer.addEventListener('click', () => this.toggleHammerMode());
    }
  }

  toggleHammerMode() {
    if (this.logic.gameState !== 'playing' || this.busySlots.size > 0) return;
    this.setHammerMode(!this.isHammerActive);
  }

  setHammerMode(active) {
    this.isHammerActive = active;
    const btnHammer = document.getElementById('btn-hammer');
    if (btnHammer) {
      if (active) {
        btnHammer.classList.add('active');
        this.selectedSlotIndex = null; // Clear normal selection
        this.renderer.render(this.selectedSlotIndex);
      } else {
        btnHammer.classList.remove('active');
      }
    }
  }

  async init() {
    resetCoinCounter();
    this.board.clearAll();
    this.logic.reset();
    this.dropManager.reset();
    this.selectedSlotIndex = null;
    this.busySlots.clear();
    this.setHammerMode(false);

    this.board.unlockSlotsUpTo(CONFIG.INITIAL_UNLOCKED_SLOTS + this.logic.score);

    this.renderer.hideModal();
    this.dropManager.dealRandomCoins(CONFIG.INITIAL_DEAL, Math.max(CONFIG.COIN_TYPES, (CONFIG.COIN_TYPES - 1) + this.logic.score), true);

    this.renderer.render(this.selectedSlotIndex);

    await this.processAllFullSlots();
    this.checkGameEndState();
  }

  async handleSlotClick(index) {
    if (this.logic.gameState !== 'playing') return;
    if (this.busySlots.size > 0) return; // Prevent clicks while animations or conversions are active

    // Handle Hammer Mode Click
    if (this.isHammerActive) {
      const slot = this.board.getSlot(index);
      if (!slot.isEmpty() && !slot.isLocked) {
        // Prevent clicks during animation
        this.busySlots.add(index);
        this.setHammerMode(false);

        const slotEl = this.renderer.boardEl.children[index];
        await Animations.animateHammerSmash(slotEl);

        // Destroy the coins in the slot completely
        slot.clear();
        this.busySlots.delete(index);
        this.renderer.render(this.selectedSlotIndex);
      }
      return;
    }

    if (this.selectedSlotIndex === null) {
      if (!this.board.getSlot(index).isEmpty()) {
        this.selectedSlotIndex = index;
        this.renderer.render(this.selectedSlotIndex);
      }
    } else if (this.selectedSlotIndex === index) {
      this.selectedSlotIndex = null;
      this.renderer.render(this.selectedSlotIndex);
    } else {
      const srcIndex = this.selectedSlotIndex;
      const destIndex = index;

      const movingCoins = this.logic.getMovingCoins(srcIndex, destIndex);
      const movingCoinEls = movingCoins
        .map(c => this.renderer.coinDomMap.get(c.id))
        .filter(Boolean);

      const success = this.logic.executeTransfer(srcIndex, destIndex);

      if (success) {
        this.selectedSlotIndex = null;
        this.busySlots.add(srcIndex);
        this.busySlots.add(destIndex);

        try {
          await Animations.animateSlowFlight(() => {
            this.renderer.render(this.selectedSlotIndex);
          }, movingCoinEls);
        } finally {
          this.busySlots.delete(srcIndex);
          this.busySlots.delete(destIndex);
        }

        await this.processAllFullSlots();
        this.checkGameEndState();

      } else {
        // Invalid move feedback
        const errSlot = this.selectedSlotIndex;
        this.busySlots.add(errSlot);
        this.renderer.shakeSelectedCoins(errSlot);

        setTimeout(() => {
          this.selectedSlotIndex = null;
          this.busySlots.delete(errSlot);
          this.renderer.render(this.selectedSlotIndex);
        }, 300);
      }
    }
  }

  /**
   * Scans ALL slots on the board for any full 10-matching coin stacks.
   * Processes celebrations and conversions sequentially until no full slots remain.
   */
  async processAllFullSlots() {
    let foundFull = true;
    while (foundFull) {
      foundFull = false;
      const slots = this.board.getAllSlots();
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (!slot.isLocked && !slot.isConverting && this.logic.isSlotMatchFull(i)) {
          foundFull = true;
          await this.celebrateAndConvertSlot(i);
        }
      }
    }
  }

  /**
   * Triggers yellow golden aura celebration, starburst, fusion implosion, and level upgrade for a full slot.
   */
  async celebrateAndConvertSlot(slotIndex) {
    const slot = this.board.getSlot(slotIndex);
    if (!slot || slot.isConverting) return;

    try {
      slot.isConverting = true;
      this.busySlots.add(slotIndex);

      const slotEl = this.renderer.boardEl.children[slotIndex];

      // Step 1: Yellow golden aura celebration (1.2s) + Star Burst
      this.logic.markSlotCelebrating(slotIndex);
      if (slotEl) slotEl.classList.add('slot-celebrate');
      this.renderer.spawnStarBurst(slotIndex);
      this.renderer.render(this.selectedSlotIndex);

      await new Promise(r => setTimeout(r, 400));

      // Step 2: Beautiful fusion implosion
      if (slotEl) slotEl.classList.remove('slot-celebrate');

      slot.coins.forEach(c => { c.isCelebrating = false; });

      const coinElsToMerge = slotEl ? Array.from(slotEl.querySelectorAll('.coin')) : [];
      this.renderer.render(this.selectedSlotIndex);

      await Animations.animateFusion(coinElsToMerge);

      // Step 3: Transform into 2 upgraded level-up coins
      this.logic.executeClearUpgrade(slotIndex);
      this.renderer.render(this.selectedSlotIndex);
      await new Promise(r => setTimeout(r, 450));
    } finally {
      slot.isConverting = false;
      this.busySlots.delete(slotIndex);
      this.renderer.render(this.selectedSlotIndex);
    }
  }

  checkGameEndState() {
    if (this.logic.gameState === 'won') {
      this.renderer.showModal('You Win!', `Excellent! You cleared ${CONFIG.TARGET_SCORE} stacks.`, () => this.init());
    } else {
      this.logic.checkGameOver();
      if (this.logic.gameState === 'lost') {
        this.renderer.showModal('Game Over', 'No more valid moves and the board is full!', () => this.init());
      }
    }
  }

  async handleDrop() {
    if (this.logic.gameState !== 'playing' || this.busySlots.size > 0) return;

    const success = this.dropManager.handleDropButton(
      Math.max(CONFIG.COIN_TYPES, (CONFIG.COIN_TYPES - 1) + this.logic.score)
    );

    if (success) {
      this.selectedSlotIndex = null;

      // Render so new coins get data-new-drop="true" in the DOM
      this.renderer.render(this.selectedSlotIndex);

      // Collect all newly dropped coin elements (marked by renderer)
      const newCoinEls = Array.from(
        this.renderer.boardEl.querySelectorAll('[data-new-drop="true"]')
      );
      // Clear the markers before animating
      newCoinEls.forEach(el => delete el.dataset.newDrop);

      // Play staggered drop animation — coins fall in one by one
      try {
        await Animations.animateDropIn(newCoinEls);
      } catch (err) {
        console.error(err);
      }

      await this.processAllFullSlots();
      this.checkGameEndState();
    }
  }

}

// Start game robustly (handles ES module deferred loading)
function initApp() {
  new GameController();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

