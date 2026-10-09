import { CONFIG } from './config.js';
import { resetCoinCounter, Coin } from './core/Coin.js';
import { Board } from './core/Board.js';
import { GameLogic } from './logic/GameLogic.js';
import { DropManager } from './logic/DropManager.js';
import { Renderer } from './ui/renderer.js';
import { Animations } from './ui/animations.js';
import { SettingsManager } from './settings/settingsManager.js';
import { AudioManager } from './core/AudioManager.js';
import { createCoinSvg } from './ui/coinSvg.js';

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
  './Assets/Gameplay/Plus Iocn_.png',
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
    window.gameMain = this; // Expose globally for GameLogic to trigger re-renders

    // Global function called by GameLogic when a level up happens
    window.showLevelUpPopup = (oldLevel, newLevel, gems, onContinue) => {
      if (window.audioManager) window.audioManager.playSound('levelUp');
      if (window._gameController) {
        window._gameController._tutorialRunning = false;
        const hand = document.getElementById('tutorial-hand');
        if (hand) hand.style.opacity = '0';
      }
      
      const overlay = document.getElementById('lu-overlay');
      document.getElementById('lu-gems').textContent = `+${gems}`;
      overlay.style.display = 'flex';

      const oldBtn = document.getElementById('lu-continue');
      const newBtn = oldBtn.cloneNode(true);
      oldBtn.parentNode.replaceChild(newBtn, oldBtn);
      newBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
        if (onContinue) onContinue();
      });
    };

    // Global function: show new coin unlocked popup
    window.showNewCoinPopup = (coinType, onContinue) => {
      if (this.audioManager) this.audioManager.playSound('newCoinUnlock');
      let svgStr = createCoinSvg(coinType, true);
      svgStr = svgStr.replace('class="coin-svg"', 'class="coin-svg" style="width:100%; height:100%;"');
      
      const overlay = document.getElementById('nc-overlay');
      document.getElementById('nc-svg-wrapper').innerHTML = svgStr;
      document.getElementById('nc-coin-text').textContent = `Coin ${coinType}`;
      overlay.style.display = 'flex';

      const oldBtn = document.getElementById('nc-continue');
      const newBtn = oldBtn.cloneNode(true);
      oldBtn.parentNode.replaceChild(newBtn, oldBtn);
      newBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
        if (onContinue) onContinue();
      });
    };

    window.showAdsPopup = (onContinue, customSubtitle = null) => {
      const overlay = document.getElementById('ads-overlay');
      const subtitleEl = overlay.querySelector('.popup-subtitle');
      if (subtitleEl) {
        subtitleEl.textContent = customSubtitle || 'Watch a short ad to unlock this slot!';
      }
      overlay.style.display = 'flex';
      
      const btn = document.getElementById('ads-continue');
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => {
        if (this.audioManager) this.audioManager.playSound('newSlotOpen');
        overlay.style.display = 'none';
        if (onContinue) onContinue();
      });
    };

    this.board = new Board();
    this.logic = new GameLogic(this.board);
    this.dropManager = new DropManager(this.board);
    this.renderer = new Renderer(this.board, this.logic, this.dropManager);
    this.settingsManager = new SettingsManager(() => this.handleRestart());
    this.audioManager = new AudioManager(this.settingsManager);
    window.audioManager = this.audioManager;

    this.selectedSlotIndex = null;
    this.busySlots = new Set();
    this.isHammerActive = false;
    this.hammerCount = 2;
    this.fanCount = 1;

    this.dropsSinceLevelUp = 5; // Start at 5 so the first drop is normal if no level up yet
    this.lastMaxCoinType = CONFIG.COIN_TYPES;

    this.bindEvents();
    this.init();
    this.updateBoosterBadges();
  }

  bindEvents() {
    this.renderer.init((index) => this.handleSlotClick(index));

    document.getElementById('btn-drop').addEventListener('click', () => this.handleDrop());
    
    const btnEndLevel = document.getElementById('btn-end-level');
    if (btnEndLevel) {
      btnEndLevel.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleRestart();
      });
    }

    const btnHammer = document.getElementById('btn-hammer');
    if (btnHammer) {
      btnHammer.addEventListener('click', () => this.toggleHammerMode());
    }

    const btnFan = document.getElementById('btn-fan');
    if (btnFan) {
      btnFan.addEventListener('click', () => this.handleFanSort());
    }

    // Booster Purchase Popup Handlers
    const overlayBuy = document.getElementById('booster-buy-overlay');
    const btnCloseBuy = document.getElementById('booster-buy-close');
    const btnGemBuy = document.getElementById('booster-buy-gem-btn');
    const btnAdBuy = document.getElementById('booster-buy-ad-btn');

    if (btnCloseBuy && overlayBuy) {
      btnCloseBuy.addEventListener('click', () => {
        overlayBuy.style.display = 'none';
      });
    }

    if (btnGemBuy) {
      btnGemBuy.addEventListener('click', () => {
        const cost = 200;
        if (this.logic.gems >= cost) {
          this.logic.gems -= cost;
          if (this._activeBuyBoosterType === 'hammer') {
            this.hammerCount++;
          } else {
            this.fanCount++;
          }
          if (this.audioManager) this.audioManager.playSound('newSlotOpen');
          this.renderer.render(this.selectedSlotIndex);
          this.updateBoosterBadges();
          if (overlayBuy) overlayBuy.style.display = 'none';
        } else {
          btnGemBuy.classList.add('shake-btn');
          setTimeout(() => btnGemBuy.classList.remove('shake-btn'), 400);
        }
      });
    }

    if (btnAdBuy) {
      btnAdBuy.addEventListener('click', () => {
        if (overlayBuy) overlayBuy.style.display = 'none';
        if (this._activeBuyBoosterType === 'hammer') {
          this.hammerCount++;
        } else {
          this.fanCount++;
        }
        if (this.audioManager) this.audioManager.playSound('newSlotOpen');
        this.renderer.render(this.selectedSlotIndex);
        this.updateBoosterBadges();
      });
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

  updateBoosterBadges() {
    const hammerBadge = document.getElementById('hammer-count-badge');
    const fanBadge = document.getElementById('fan-count-badge');
    const btnHammer = document.getElementById('btn-hammer');
    const btnFan = document.getElementById('btn-fan');

    if (hammerBadge) {
      if (this.hammerCount > 0) {
        hammerBadge.textContent = this.hammerCount;
        hammerBadge.classList.remove('is-plus');
        if (btnHammer) btnHammer.classList.remove('disabled');
      } else {
        hammerBadge.textContent = '+';
        hammerBadge.classList.add('is-plus');
        if (btnHammer) btnHammer.classList.add('disabled');
      }
    }

    if (fanBadge) {
      if (this.fanCount > 0) {
        fanBadge.textContent = this.fanCount;
        fanBadge.classList.remove('is-plus');
        if (btnFan) btnFan.classList.remove('disabled');
      } else {
        fanBadge.textContent = '+';
        fanBadge.classList.add('is-plus');
        if (btnFan) btnFan.classList.add('disabled');
      }
    }
  }

  showBoosterBuyPopup(type) {
    this._activeBuyBoosterType = type;
    const overlay = document.getElementById('booster-buy-overlay');
    const imgEl = document.getElementById('booster-buy-img');
    const titleEl = document.getElementById('booster-buy-title');

    if (imgEl) {
      imgEl.src = type === 'hammer' ? './Assets/Gameplay/Hammer.png' : './Assets/Gameplay/Fan.png';
    }

    if (titleEl) {
      titleEl.textContent = type === 'hammer' ? 'GET HAMMER' : 'GET FAN SORT';
    }

    const hand = document.getElementById('tutorial-hand');
    if (hand) hand.style.opacity = '0';

    if (overlay) overlay.style.display = 'flex';
  }

  async init() {
    resetCoinCounter();
    this.board.clearAll();
    this.board.resetGemSlotPurchase();
    this.logic.reset();
    this.dropManager.reset();
    this.selectedSlotIndex = null;
    this.busySlots.clear();
    this.setHammerMode(false);
    this.hammerCount = 2;
    this.fanCount = 1;
    this.updateBoosterBadges();
    // Reset tutorial so it shows fresh every new game (score 0)
    this._tutorialRunning = false;
    localStorage.removeItem('coinPuzzleTutorialDone');

    const totalSlots = this.logic.getTotalUnlockedSlots(this.logic.score);
    this.board.unlockSlotsUpTo(totalSlots, (idx) => this.logic.getScoreToUnlockSlot(idx, this.logic.score));

    this.renderer.hideModal();
    const currentMaxCoin = CONFIG.COIN_TYPES + this.logic.score;
    const dropMaxCoin = this.logic.getDropMaxCoin();
    const dropMinCoin = this.logic.getDropMinCoin();
    this.dropManager.dealRandomCoins(CONFIG.INITIAL_DEAL, dropMaxCoin, true, false, false, dropMinCoin);

    this.renderer.render(this.selectedSlotIndex);

    await this.processAllFullSlots();
    this.checkGameEndState();

    // Show tutorial hint automatically on game start
    setTimeout(() => this.showTutorialHint(), 800);
  }

  async handleRestart() {
    if (this.logic.hearts <= 0) {
      window.showAdsPopup(() => {
        this.logic.hearts++; // Give 1 heart for watching the ad
        this.renderer.renderHeartTimer();
        this.handleRestart(); // Try restarting again now that we have a heart
      }, 'Watch a short ad to get +1 Health Heart and restart!');
      return;
    }

    this.logic.hearts--;
    if (this.logic.hearts < 5 && !this.logic.nextHeartTime) {
      this.logic.nextHeartTime = Date.now() + 5 * 60 * 1000;
    }
    this.renderer.renderHeartTimer();

    // Preserve required coins (user's progress) instead of wiping the whole board
    const requiredTypes = this.logic.getRequiredCoinTypes();
    this.board.clearNonRequiredCoins(requiredTypes);

    // Count how many coins were kept, and reset temporary unlocks
    let coinsKept = 0;
    this.board.getAllSlots().forEach(slot => {
      coinsKept += slot.length;
      if (slot.isTempUnlocked) {
        slot.isTempUnlocked = false;
        slot.isPendingShift = false;
        slot.tempUnlockTimeLeft = null;
      }
    });

    // Do NOT call this.logic.reset() to keep score and extraUnlockedSlots intact
    this.dropManager.reset();
    this.selectedSlotIndex = null;
    this.busySlots.clear();
    this.setHammerMode(false);
    this.hammerCount = 2;
    this.fanCount = 1;
    this.updateBoosterBadges();

    // Re-apply same slots based on current level progress
    const totalSlots = this.logic.getTotalUnlockedSlots(this.logic.score);
    this.board.unlockSlotsUpTo(totalSlots, (idx) => this.logic.getScoreToUnlockSlot(idx, this.logic.score));

    this.renderer.hideModal();
    const dropMaxCoin = this.logic.getDropMaxCoin();
    const dropMinCoin = this.logic.getDropMinCoin();

    // Drop only enough coins to reach INITIAL_DEAL, so the board doesn't overflow
    const coinsToDrop = Math.max(0, CONFIG.INITIAL_DEAL - coinsKept);
    if (coinsToDrop > 0) {
      this.dropManager.dealRandomCoins(coinsToDrop, dropMaxCoin, true, true, false, dropMinCoin);
    }

    // Render so new coins get data-new-drop="true" in the DOM
    this.renderer.render(this.selectedSlotIndex);

    // Collect all newly dropped coin elements (marked by renderer)
    const newCoinEls = Array.from(
      this.renderer.boardEl.querySelectorAll('[data-new-drop="true"]')
    );
    // Clear the markers before animating
    newCoinEls.forEach(el => delete el.dataset.newDrop);

    // Play staggered drop animation & drop sound — coins fall in one by one
    if (newCoinEls.length > 0) {
      if (this.audioManager) this.audioManager.playSound('btnDrop');
      try {
        await Animations.animateDropIn(newCoinEls);
      } catch (err) {
        console.error(err);
      }
    }

    await this.processAllFullSlots();
    
    // Call tutorial hint at start
    setTimeout(() => this.showTutorialHint(), 500);
  }

  toggleHammerMode() {
    if (this.logic.gameState !== 'playing') return;
    if (this.hammerCount <= 0) {
      this.setHammerMode(false);
      const btnHammer = document.getElementById('btn-hammer');
      if (btnHammer) {
        btnHammer.classList.add('shake-btn');
        setTimeout(() => btnHammer.classList.remove('shake-btn'), 400);
      }
      this.showBoosterBuyPopup('hammer');
      return;
    }
    this.setHammerMode(!this.isHammerActive);
  }

  setHammerMode(active) {
    this.isHammerActive = active;
    const btnHammer = document.getElementById('btn-hammer');
    if (btnHammer) {
      if (active) {
        btnHammer.classList.add('active');
        document.body.classList.add('hammer-cursor');
      } else {
        btnHammer.classList.remove('active');
        document.body.classList.remove('hammer-cursor');
      }
    }
  }

  async handleFanSort() {
    if (this.logic.gameState !== 'playing') return;
    if (this.busySlots.size > 0) return;

    if (this.fanCount <= 0) {
      const btnFan = document.getElementById('btn-fan');
      if (btnFan) {
        btnFan.classList.add('shake-btn');
        setTimeout(() => btnFan.classList.remove('shake-btn'), 400);
      }
      this.showBoosterBuyPopup('fan');
      return;
    }

    const btnFan = document.getElementById('btn-fan');
    if (btnFan) btnFan.classList.add('spinning');

    if (this.audioManager) {
      this.audioManager.playSound('fanWind') || this.audioManager.playSound('drop');
    }

    // 1. Gather all active (unlocked / tempUnlocked) slots
    const playableSlots = this.board.getAllSlots().filter(slot => !slot.isLocked || slot.isTempUnlocked);

    let allCoins = [];
    playableSlots.forEach(slot => {
      allCoins.push(...slot.coins);
    });

    if (allCoins.length === 0) {
      if (btnFan) btnFan.classList.remove('spinning');
      return;
    }

    // Deduct fan count upon activation
    this.fanCount--;
    this.updateBoosterBadges();

    // Mark all active slots as busy
    playableSlots.forEach((slot) => {
      const realIdx = this.board.getAllSlots().indexOf(slot);
      if (realIdx !== -1) this.busySlots.add(realIdx);
    });

    // Add visual wind swirl effect to game board
    const boardEl = this.renderer.boardEl;
    if (boardEl) boardEl.classList.add('fan-wind-active');

    await new Promise(r => setTimeout(r, 250));

    // Clear coins from active slots
    playableSlots.forEach(slot => slot.clear());

    // 2. Group all coins by type
    const coinGroups = new Map();
    allCoins.forEach(coin => {
      if (!coinGroups.has(coin.type)) {
        coinGroups.set(coin.type, []);
      }
      coinGroups.get(coin.type).push(coin);
    });

    // Sort types ascending
    const sortedTypes = Array.from(coinGroups.keys()).sort((a, b) => a - b);

    // 3. Re-distribute sorted coins into playable slots cleanly (preserving 100% of coins)
    for (const type of sortedTypes) {
      const coinsOfType = coinGroups.get(type);

      while (coinsOfType.length > 0) {
        // Priority 1: Slot already containing this coin type with available space
        let targetSlot = playableSlots.find(s => !s.isEmpty() && s.topCoin && s.topCoin.type === type && !s.isFull());

        // Priority 2: Completely empty slot
        if (!targetSlot) {
          targetSlot = playableSlots.find(s => s.isEmpty());
        }

        // Priority 3: Any slot with available space (fail-safe)
        if (!targetSlot) {
          targetSlot = playableSlots.find(s => !s.isFull());
        }

        if (!targetSlot) break;

        const space = targetSlot.spaceAvailable;
        const toInsert = coinsOfType.splice(0, space);
        targetSlot.push(...toInsert);
      }
    }

    // Render updated clean board DOM
    this.renderer.render(this.selectedSlotIndex);

    await new Promise(r => setTimeout(r, 200));

    if (boardEl) boardEl.classList.remove('fan-wind-active');
    this.busySlots.clear();

    // 4. Process any 10-coin full slots created by the sort
    await this.processAllFullSlots();

    if (btnFan) {
      setTimeout(() => btnFan.classList.remove('spinning'), 300);
    }
  }

  async handleSlotClick(index) {
    if (this.logic.gameState !== 'playing') return;
    if (this.busySlots.size > 0) return; // Prevent clicks while animations or conversions are active

    // Handle Hammer Mode Click
    if (this.isHammerActive) {
      if (this.hammerCount <= 0) {
        this.setHammerMode(false);
        return;
      }

      const slot = this.board.getSlot(index);
      if (!slot.isEmpty() && !slot.isLocked) {
        // Prevent clicks during animation
        this.busySlots.add(index);
        this.setHammerMode(false);

        // Deduct 1 hammer
        this.hammerCount--;
        this.updateBoosterBadges();

        const slotEl = this.renderer.boardEl.children[index];
        await Animations.animateHammerSmash(slotEl);

        // Destroy the coins in the slot completely
        slot.clear();
        this.busySlots.delete(index);
        await this.tryProcessPendingShifts();
        this.renderer.render(this.selectedSlotIndex);
      }
      return;
    }

    const slot = this.board.getSlot(index);

    // Handle unlocking via gems
    if (slot.isLocked && slot.lockType === 'gem') {
      if (this.logic.gems >= slot.unlockCost) {
        if (this.audioManager) this.audioManager.playSound('newSlotOpen');
        this.logic.gems -= slot.unlockCost;

        // Add visual unlock animation
        const slotEl = this.renderer.boardEl.children[index];
        this.busySlots.add(index);
        await Animations.animateSlotUnlock(slotEl);
        this.busySlots.delete(index);

        // Unlock specific slot (update internal lock states and boundary)
        this.board.unlockSpecificSlot(index);
        this.updateBoosterBadges();
        
        // After opening a new slot, if any slot's timer has expired (pending shift),
        // try to shift its coins into the newly available empty space
        await this.tryProcessPendingShifts();
        
        this.renderer.render(this.selectedSlotIndex);
        return;
      } else {
        // Not enough gems (could add visual shake effect here later)
        return;
      }
    }

    // Handle temporary unlock of time slots
    if (slot.isLocked && slot.lockType === 'time' && !slot.isTempUnlocked && !slot.isPendingShift) {
      window.showAdsPopup(async () => {
        slot.isTempUnlocked = true;
        slot.tempUnlockTimeLeft = slot.timeBonus !== null ? slot.timeBonus : 60;

        // Add visual unlock animation
        const slotEl = this.renderer.boardEl.children[index];
        this.busySlots.add(index);
        await Animations.animateSlotUnlock(slotEl);
        this.busySlots.delete(index);

        this.renderer.render(this.selectedSlotIndex);
      });
      return;
    }

    // Handle padlock slots (Level Locks - unlocked automatically on level up)
    if (slot.isLocked && slot.lockType === 'padlock') {
      return;
    }

    if (slot.isLocked && !slot.isTempUnlocked) return;

    if (this.selectedSlotIndex === null) {
      if (!this.board.getSlot(index).isEmpty()) {
        if (this.audioManager) this.audioManager.playSound('selectCoin');
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
        if (this.audioManager) {
          this.audioManager.playSound('dropCoin');
          if (movingCoins.length > 3) {
            setTimeout(() => {
              this.audioManager.playSound('dropCoin');
            }, 100); // 100ms delay for fast double play
          }
        }
        this._tutorialRunning = false;
        const hand = document.getElementById('tutorial-hand');
        if (hand) hand.style.opacity = '0';
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

        // Auto-restart tutorial hint after each move (while score is 0)
        if (this.logic.score === 0) {
          setTimeout(() => {
            this._tutorialRunning = false;
            this.showTutorialHint();
          }, 1000);
        }

      } else {
        if (this.audioManager) this.audioManager.playSound('wrongSlot');
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
        // 1. Try to find a slot of the SAME TYPE that has enough space for ALL coins
        let destIndex = slots.findIndex(s => {
          if (s.isLocked || s.isTempUnlocked || s.isPendingShift) return false;
          if (s.isEmpty() || s.isFull()) return false;
          return s.topCoin.type === srcSlot.topCoin.type && s.spaceAvailable >= srcSlot.length;
        });

        // 2. If no matching color slot with enough space, find ANY completely empty slot
        if (destIndex === -1) {
          destIndex = slots.findIndex(s => {
            if (s.isLocked || s.isTempUnlocked || s.isPendingShift) return false;
            return s.isEmpty();
          });
        }

        if (destIndex !== -1) {
          const destSlot = slots[destIndex];
          const coinsToMove = srcSlot.pop(srcSlot.length);
          destSlot.push(...coinsToMove);

          const movingCoinEls = coinsToMove
            .map(c => this.renderer.coinDomMap.get(c.id))
            .filter(Boolean);

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

          shiftedAny = true;
          // After a shift, it might fill a slot, so process again
          await this.processAllFullSlots();
        }

        // If the source slot is now empty after moving all it could, lock it back
        if (srcSlot.length === 0) {
          srcSlot.isTempUnlocked = false;
          srcSlot.isPendingShift = false;
          srcSlot.tempUnlockTimeLeft = null;
          this.renderer.render(this.selectedSlotIndex);
        }
      } else if (srcSlot.isPendingShift && srcSlot.length === 0) {
        // Was already empty, just lock it back
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
      if (this.audioManager) this.audioManager.playSound('slotComplete');
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
      this.checkGameEndState();

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
      this.renderer.showModal('You Win!', `Excellent! You reached Level ${CONFIG.TARGET_SCORE}.`, () => this.init());
    }
  }

  async handleDrop() {
    if (this.logic.gameState !== 'playing' || this.busySlots.size > 0) return;

    const maxCoinType = CONFIG.COIN_TYPES + this.logic.score;
    const dropMaxCoin = this.logic.getDropMaxCoin();

    if (maxCoinType !== this.lastMaxCoinType) {
      this.lastMaxCoinType = maxCoinType;
      this.dropsSinceLevelUp = 0;
    }
    this.dropsSinceLevelUp++;

    // Only apply the "limit to 1" logic specifically for the newly arrived 4 coin
    const limitMaxCoinToOne = this.dropsSinceLevelUp <= 5 && maxCoinType === 4;

    const dropMinCoin = this.logic.getDropMinCoin();
    const success = this.dropManager.handleDropButton(
      dropMaxCoin,
      limitMaxCoinToOne,
      dropMinCoin
    );

    if (success) {
      if (this.audioManager) this.audioManager.playSound('btnDrop');
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
      await this.tryProcessPendingShifts();
      this.checkGameEndState();
      this.showTutorialHint();
    }
  }

  showTutorialHint() {
    // Tutorial only shows at Level 1 (score = 0). Once score >= 1, stop.
    if (this.logic.score > 0) {
      this._tutorialRunning = false;
      const hand = document.getElementById('tutorial-hand');
      if (hand) hand.style.opacity = '0';
      return;
    }
    
    if (this._tutorialRunning) return;

    // We no longer abort if there's no hint, because we want to show the DROP button instead.
    // The runLoop will handle both cases.

    this._tutorialRunning = true;

    // Inject CSS once
    if (!document.getElementById('tutorial-style')) {
      const style = document.createElement('style');
      style.id = 'tutorial-style';
      style.textContent = `
        #tutorial-hand {
          position: fixed;
          font-size: 4rem;
          z-index: 9999;
          pointer-events: none;
          filter: drop-shadow(0 4px 14px rgba(0,0,0,0.7));
          opacity: 0;
          transition: left 0.2s ease, top 0.2s ease, opacity 0.3s;
        }
        @keyframes handTap {
          0% { transform: translateY(0) scale(1); }
          
          /* Single Tap */
          15% { transform: translateY(12px) scale(0.85); }
          30% { transform: translateY(0) scale(1); }
          
          /* Pause */
          100% { transform: translateY(0) scale(1); }
        }
        .bouncing-hand {
          animation: handTap 1.8s ease-in-out infinite;
          transform-origin: center;
        }
      `;
      document.head.appendChild(style);
    }

    let hand = document.getElementById('tutorial-hand');
    if (!hand) {
      hand = document.createElement('div');
      hand.id = 'tutorial-hand';
      hand.innerHTML = '👆';
      document.body.appendChild(hand);
    }

    const getPos = (index) => {
      const el = document.querySelector(`.slot[data-index="${index}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2 - 40, y: r.top + r.height / 2 - 10 };
    };

    const getDropBtnPos = () => {
      const btn = document.getElementById('btn-drop');
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      // Center of the drop button, slightly higher
      return { x: r.left + r.width / 2 - 40, y: r.top + r.height / 2 - 30 };
    };

    const runLoop = () => {
      // Check if any popup modal is currently active/visible
      const isPopupVisible = Array.from(document.querySelectorAll('.popup-overlay'))
        .some(el => el.style.display === 'flex' || window.getComputedStyle(el).display === 'flex');
      
      const isSettingsVisible = !document.getElementById('settings-modal')?.classList.contains('hidden');

      if (isPopupVisible || isSettingsVisible || !this._tutorialRunning) {
        hand.style.display = 'none';
        hand.style.opacity = '0';
        hand.classList.remove('bouncing-hand');
        if (isPopupVisible || isSettingsVisible) {
          setTimeout(runLoop, 500);
          return;
        }
        return;
      }

      // Stop if level up already happened
      if (this.logic.score > 0) {
        this._tutorialRunning = false;
        hand.style.display = 'none';
        hand.style.opacity = '0';
        return;
      }

      // Fetch FRESH hint on every iteration — board may have changed
      const currentHint = this.logic.getHintMove();

      if (currentHint) {
        // === CASE 1: Valid slot move exists ===
        hand.classList.add('bouncing-hand');
        
        let targetPos;
        // If they selected the right source, point to destination!
        if (this.selectedSlotIndex === currentHint.src) {
          targetPos = getPos(currentHint.dest);
        } else {
          // Otherwise (nothing selected, or wrong slot), point to source
          targetPos = getPos(currentHint.src);
        }

        if (targetPos) {
          hand.style.display = 'block';
          // Use a fast transition so it glides smoothly if the target changes
          hand.style.transition = 'left 0.2s ease, top 0.2s ease, opacity 0.3s';
          hand.style.left = targetPos.x + 'px';
          hand.style.top = targetPos.y + 'px';
          hand.style.opacity = '1';
        }

        setTimeout(runLoop, 150);

      } else if (this.board.hasEmptySpace()) {
        // === CASE 2: No valid moves BUT board has empty space → point to DROP button ===
        const dropPos = getDropBtnPos();
        if (!dropPos) { setTimeout(runLoop, 500); return; }

        hand.style.display = 'block';
        hand.style.transition = 'left 0.2s ease, top 0.2s ease, opacity 0.3s';
        hand.style.left = dropPos.x + 'px';
        hand.style.top = dropPos.y + 'px';
        hand.style.opacity = '1';
        
        hand.classList.add('bouncing-hand');

        setTimeout(runLoop, 150);
      } else {
        // === CASE 3: Board is completely full → Hide tutorial hand completely ===
        hand.style.opacity = '0';
        hand.classList.remove('bouncing-hand');
        setTimeout(runLoop, 500);
      }
    };

    runLoop();
  }

  hideTutorialHint() {
    this._tutorialRunning = false;
    const hand = document.getElementById('tutorial-hand');
    if (hand) hand.style.opacity = '0';
    localStorage.setItem('coinPuzzleTutorialDone', 'true');
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
      window._gameController = new GameController();
    }, 400);

  } else {
    window._gameController = new GameController();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

