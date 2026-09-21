import { CONFIG } from './config.js';
import { resetCoinCounter } from './core/Coin.js';
import { Board } from './core/Board.js';
import { GameLogic } from './logic/gameLogic.js';
import { DropManager } from './logic/dropManager.js';
import { Renderer } from './ui/renderer.js';
import { Animations } from './ui/animations.js';
import { SettingsManager } from './settings/settingsManager.js';

class AssetLoader {
  static async loadAll(assets, progressCallback) {
    let loadedCount = 0;
    const totalAssets = assets.length;

    if (totalAssets === 0) {
      if (progressCallback) progressCallback(100);
      return Promise.resolve();
    }

    const promises = assets.map(src => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          if (progressCallback) progressCallback(Math.floor((loadedCount / totalAssets) * 100));
          resolve(img);
        };
        img.onerror = () => {
          loadedCount++;
          if (progressCallback) progressCallback(Math.floor((loadedCount / totalAssets) * 100));
          resolve(null);
        };
        img.src = src;
      });
    });

    await Promise.all(promises);
  }
}

const LOADING_ASSETS = [
  './Assets/Loading/BG_.png',
  './Assets/Loading/Logo Titile_.png',
  './Assets/Loading/Coins In Pockets_.png',
  './Assets/Loading/Loading Bar_.png',
  './Assets/Loading/Loading Fill_.png'
];

const GAME_ASSETS = [
  './Assets/board-ui/Closed Pocket_.png',
  './Assets/board-ui/Coin Pocket.png',
  './Assets/board-ui/image (2).png',
  './Assets/board-ui/Wallet Base.png',
  './Assets/Gameplay/Bar_.png',
  './Assets/Gameplay/Blue Patch_.png',
  './Assets/Gameplay/Coin Base.png',
  './Assets/Gameplay/Coins_.png',
  './Assets/Gameplay/Drop Button_.png',
  './Assets/Gameplay/Extra Time Icon_.png',
  './Assets/Gameplay/Gem.png',
  './Assets/Gameplay/Heart.png',
  './Assets/Gameplay/Lock Base.png',
  './Assets/Gameplay/Plus Icon_.png',
  './Assets/Gameplay/Settings.png',
  './Assets/Settings/Music Off_.png',
  './Assets/Settings/Music On_.png',
  './Assets/Settings/Sound Off_.png',
  './Assets/Settings/Sound On_.png',
  './Assets/Settings/Toggles Base.png',
  './Assets/Settings/Vibrate Off_.png',
  './Assets/Settings/Vibrate On_.png',
  './Assets/Settings/Cross.png'
];

class GameController {
  constructor() {
    this.board = new Board();
    this.logic = new GameLogic(this.board);
    this.dropManager = new DropManager(this.board);
    this.renderer = new Renderer(this.board, this.logic, this.dropManager);
    this.settingsManager = new SettingsManager(() => this.handleRestart());

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

    this.startGameTimers();
  }

  startGameTimers() {
    setInterval(() => {
      // Heart Timer Logic
      if (this.logic.hearts < 5) {
        if (!this.logic.nextHeartTime) {
          // 5 minutes in milliseconds
          this.logic.nextHeartTime = Date.now() + 5 * 60 * 1000;
        }
        
        const remaining = this.logic.nextHeartTime - Date.now();
        if (remaining <= 0) {
          this.logic.hearts++;
          if (this.logic.hearts < 5) {
            this.logic.nextHeartTime = Date.now() + 5 * 60 * 1000;
          } else {
            this.logic.nextHeartTime = null;
          }
        }
      } else {
        this.logic.nextHeartTime = null;
      }
      this.renderer.renderHeartTimer();

      // Slot Timer Logic
      let needsRender = false;
      this.board.getAllSlots().forEach((slot, index) => {
        if (slot.isTempUnlocked && !slot.isPendingShift) {
          slot.tempUnlockTimeLeft--;
          if (slot.tempUnlockTimeLeft <= 0) {
            slot.tempUnlockTimeLeft = 0;
            slot.isPendingShift = true; // Timer expired, wait for empty slot
            this.tryProcessPendingShifts(); // Try to shift immediately if possible
          }
          needsRender = true;
        }
      });
      if (needsRender) this.renderer.render(this.selectedSlotIndex);

    }, 1000);
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

  async handleRestart() {
    if (this.logic.hearts <= 0) {
      // Out of hearts, do nothing or show a message (can be expanded later)
      return;
    }

    this.logic.hearts--;
    if (this.logic.hearts < 5 && !this.logic.nextHeartTime) {
      this.logic.nextHeartTime = Date.now() + 5 * 60 * 1000;
    }
    this.renderer.renderHeartTimer();

    resetCoinCounter();
    this.board.clearAll();
    // Do NOT call this.logic.reset() to keep score and extraUnlockedSlots intact
    this.dropManager.reset();
    this.selectedSlotIndex = null;
    this.busySlots.clear();
    this.setHammerMode(false);

    // Re-apply same slots based on current level progress
    this.board.unlockSlotsUpTo(CONFIG.INITIAL_UNLOCKED_SLOTS + this.logic.score);

    this.renderer.hideModal();
    this.dropManager.dealRandomCoins(CONFIG.INITIAL_DEAL, Math.max(CONFIG.COIN_TYPES, (CONFIG.COIN_TYPES - 1) + this.logic.score), true);

    this.renderer.render(this.selectedSlotIndex);
    
    await this.processAllFullSlots();
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

    const slot = this.board.getSlot(index);

    // Handle unlocking via gems
    if (slot.isLocked && slot.lockType === 'gem') {
      if (this.logic.gems >= slot.unlockCost) {
        this.logic.gems -= slot.unlockCost;
        
        // Add visual unlock animation
        const slotEl = this.renderer.boardEl.children[index];
        this.busySlots.add(index);
        await Animations.animateSlotUnlock(slotEl);
        this.busySlots.delete(index);

        // Unlock specific slot
        this.board.unlockSpecificSlot(index);
        this.renderer.render(this.selectedSlotIndex);
        return;
      } else {
        // Not enough gems (could add visual shake effect here later)
        return;
      }
    }

    // Handle temporary unlock of time slots
    if (slot.isLocked && slot.lockType === 'time' && !slot.isTempUnlocked && !slot.isPendingShift) {
      slot.isTempUnlocked = true;
      slot.tempUnlockTimeLeft = slot.timeBonus !== null ? slot.timeBonus : 60;
      
      // Add visual unlock animation
      const slotEl = this.renderer.boardEl.children[index];
      this.busySlots.add(index);
      await Animations.animateSlotUnlock(slotEl);
      this.busySlots.delete(index);
      
      this.renderer.render(this.selectedSlotIndex);
      return;
    }

    if (slot.isLocked && !slot.isTempUnlocked) return;

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
        await this.tryProcessPendingShifts();
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

  async tryProcessPendingShifts() {
    let shiftedAny = false;
    const slots = this.board.getAllSlots();
    
    for (let srcIndex = 0; srcIndex < slots.length; srcIndex++) {
      const srcSlot = slots[srcIndex];
      if (srcSlot.isPendingShift && srcSlot.length > 0) {
        // Find a valid destination slot
        const emptyIndex = slots.findIndex(s => {
          if (s.isLocked || s.isTempUnlocked || s.isPendingShift) return false;
          if (s.spaceAvailable < srcSlot.length) return false;
          return s.isEmpty() || s.topCoin.type === srcSlot.topCoin.type;
        });
        if (emptyIndex !== -1) {
          // Transfer all coins
          const destSlot = slots[emptyIndex];
          const coinsToMove = srcSlot.pop(srcSlot.length);
          destSlot.push(...coinsToMove);
          
          // Revert time slot to locked
          srcSlot.isTempUnlocked = false;
          srcSlot.isPendingShift = false;
          srcSlot.tempUnlockTimeLeft = null;
          
          const movingCoinEls = coinsToMove
            .map(c => this.renderer.coinDomMap.get(c.id))
            .filter(Boolean);
            
          this.busySlots.add(srcIndex);
          this.busySlots.add(emptyIndex);
          
          try {
            await Animations.animateSlowFlight(() => {
              this.renderer.render(this.selectedSlotIndex);
            }, movingCoinEls);
          } finally {
            this.busySlots.delete(srcIndex);
            this.busySlots.delete(emptyIndex);
          }
          
          shiftedAny = true;
          // After a shift, it might fill a slot, so process again
          await this.processAllFullSlots();
        }
      } else if (srcSlot.isPendingShift && srcSlot.length === 0) {
        // No coins to shift, just lock it back
        srcSlot.isTempUnlocked = false;
        srcSlot.isPendingShift = false;
        srcSlot.tempUnlockTimeLeft = null;
        this.renderer.render(this.selectedSlotIndex);
      }
    }
    return shiftedAny;
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
        const isUnlocked = !slot.isLocked || slot.isTempUnlocked;
        if (isUnlocked && !slot.isConverting && this.logic.isSlotMatchFull(i)) {
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

// Start game robustly
async function initApp() {
  if (window.updateLoadingProgress) {
    
    // PHASE 1: Load the Loading Screen Assets FIRST (so it isn't blank)
    await AssetLoader.loadAll(LOADING_ASSETS);
    // At this point, background, logo, and empty bar are fully visible.

    // PHASE 2: Load the heavy game assets while running the yellow bar
    let assetProgress = 0;
    let timeProgress = 0;
    const startTime = Date.now();
    const MIN_LOAD_TIME = 3000;
    
    // REAL ASSET LOADING: Load images into cache
    const loadPromise = AssetLoader.loadAll(GAME_ASSETS, (percent) => {
      assetProgress = percent;
    });

    // 2. Purely visual 3-second jumpy timer ("rukh rukh k")
    const timePromise = new Promise(resolve => {
      let lastJumpTime = Date.now();
      
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        
        // Jumpy logic: Add chunks randomly
        if (now - lastJumpTime > 300 + Math.random() * 300) {
          lastJumpTime = now;
          const jumpAmount = 10 + Math.random() * 20; // Jump 10% to 30%
          timeProgress = Math.min(100, timeProgress + jumpAmount);
        }
        
        // Force it to 100% when 3 seconds are up
        if (elapsed >= MIN_LOAD_TIME) {
          timeProgress = 100;
        }

        // Use the SLOWER of the two progresses
        window.updateLoadingProgress(Math.min(assetProgress, timeProgress));
        
        if (elapsed >= MIN_LOAD_TIME) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });

    // WAIT for BOTH actual loading and minimum 3s timer to finish!
    await Promise.all([loadPromise, timePromise]);

    // Small delay to let the user see the 100% full bar before hiding
    setTimeout(() => {
      window.hideLoadingScreen();
      new GameController();
    }, 400);

  } else {
    new GameController();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

