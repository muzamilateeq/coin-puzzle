import { CONFIG } from '../config.js';
import { Coin } from '../core/Coin.js';

export class GameLogic {
  constructor(board) {
    this.board = board;
    this.score = 0;
    this.gems = 1000;
    this.hearts = 5;
    this.nextHeartTime = null;
    this.gameState = 'playing'; // 'playing', 'won', 'lost'
  }

  reset() {
    this.score = 0;
    this.gameState = 'playing';
  }

  isValidMove(sourceIndex, destIndex) {
    if (sourceIndex === destIndex) return false;

    const sourceSlot = this.board.getSlot(sourceIndex);
    const destSlot = this.board.getSlot(destIndex);

    const isSourceLocked = sourceSlot.isLocked && !sourceSlot.isTempUnlocked;
    const isDestLocked = destSlot.isLocked && !destSlot.isTempUnlocked;

    if (isSourceLocked || isDestLocked) return false;
    if (sourceSlot.isEmpty()) return false;
    if (destSlot.isFull()) return false;

    if (destSlot.isEmpty()) return true;

    // Match types
    return sourceSlot.topCoin.type === destSlot.topCoin.type;
  }

  getMovingCoins(sourceIndex, destIndex) {
    if (!this.isValidMove(sourceIndex, destIndex)) return [];

    const sourceSlot = this.board.getSlot(sourceIndex);
    const destSlot = this.board.getSlot(destIndex);

    const matchCount = sourceSlot.getConsecutiveMatches();
    const spaceAvailable = destSlot.spaceAvailable;

    const transferCount = Math.min(matchCount, spaceAvailable);
    return sourceSlot.coins.slice(sourceSlot.length - transferCount);
  }

  executeTransfer(sourceIndex, destIndex) {
    if (!this.isValidMove(sourceIndex, destIndex)) return false;

    const sourceSlot = this.board.getSlot(sourceIndex);
    const destSlot = this.board.getSlot(destIndex);

    const matchCount = sourceSlot.getConsecutiveMatches();
    const spaceAvailable = destSlot.spaceAvailable;

    const transferCount = Math.min(matchCount, spaceAvailable);

    const coinsToMove = sourceSlot.pop(transferCount);
    destSlot.push(...coinsToMove);

    return true;
  }

  isSlotMatchFull(slotIndex) {
    const slot = this.board.getSlot(slotIndex);
    const isSlotLocked = slot.isLocked && !slot.isTempUnlocked;
    if (!slot || isSlotLocked || !slot.isFull()) return false;
    const firstType = slot.coins[0].type;
    return slot.coins.every(c => c.type === firstType);
  }

  markSlotCelebrating(slotIndex) {
    const slot = this.board.getSlot(slotIndex);
    if (this.isSlotMatchFull(slotIndex)) {
      slot.coins.forEach(c => {
        c.isCelebrating = true;
        c.isShrinking = false;
      });
      return true;
    }
    return false;
  }

  markSlotShrinking(slotIndex) {
    const slot = this.board.getSlot(slotIndex);
    if (this.isSlotMatchFull(slotIndex)) {
      slot.coins.forEach(c => {
        c.isCelebrating = false;
        c.isShrinking = true;
      });
      return true;
    }
    return false;
  }

  executeClearUpgrade(slotIndex) {
    const slot = this.board.getSlot(slotIndex);
    if (!this.isSlotMatchFull(slotIndex)) return false;

    const firstType = slot.coins[0].type;
    slot.clear();

    // Convert to the next level and leave exactly 2 coins
    // Cap at max coin type to avoid generating unrecognized/unstyled coins
    const newType = Math.min(firstType + 1, CONFIG.COIN_TYPES + this.score + 1);
    const c1 = new Coin(newType);
    const c2 = new Coin(newType);
    c1.isNewMerge = true;
    c2.isNewMerge = true;
    slot.push(c1, c2);

    const currentMaxCoin = CONFIG.COIN_TYPES + this.score;

    if (firstType >= currentMaxCoin && !this.isLevelingUp) {
      this.isLevelingUp = true;
      const event = new CustomEvent('hudGoalCompleted', { detail: { coinType: firstType + 1 } });
      window.dispatchEvent(event);

      setTimeout(() => {
        this.score++;
        this.gems += 50 + 10; // Extra 10 for completing the goal
        
        const oldSlots = this.getTotalUnlockedSlots(this.score - 1);
        const slotsToUnlock = this.getTotalUnlockedSlots(this.score);
        this.board.unlockSlotsUpTo(slotsToUnlock, (idx) => this.getScoreToUnlockSlot(idx, this.score));
        this.isLevelingUp = false;

        const mainInstance = window.gameMain;
        if (oldSlots === 15 && slotsToUnlock === 7 && mainInstance) {
          mainInstance.renderer.playBoardTransitionAnimation(7);
        } else if (mainInstance && mainInstance.renderer) {
          mainInstance.renderer.render();
        }
      }, 1500);
    }

    this.checkCollectionLevelUp();

    if (this.score >= CONFIG.TARGET_SCORE) {
      this.gameState = 'won';
    }
    return true;
  }

  getTotalUnlockedSlots(score) {
    let extra = 0;
    if (score === 2) extra = 1;
    else if (score === 3) extra = 2;
    else if (score >= 4 && score <= 6) extra = 3;
    else if (score >= 7 && score <= 11) extra = 4;
    else if (score >= 12) extra = Math.floor((score - 12) / 2) + 5;
    
    let total = CONFIG.INITIAL_UNLOCKED_SLOTS + extra;
    
    if (total > 15) {
      let over = total - 15;
      let currentInCycle = ((over - 1) % 9) + 7;
      return currentInCycle;
    }
    
    return total;
  }

  getScoreToUnlockSlot(targetIndex, currentScore) {
    for (let s = currentScore; s <= currentScore + 200; s++) {
      if (this.getTotalUnlockedSlots(s) >= targetIndex) {
        return s;
      }
    }
    return currentScore;
  }

  getDropMaxCoin() {
    const maxCoinType = CONFIG.COIN_TYPES + this.score;
    let mergingCoin;
    if (this.score < 4) {
      mergingCoin = this.score + 2;
    } else {
      mergingCoin = Math.floor(this.score / 2) + 4;
    }
    
    let dropMaxCoin = mergingCoin >= 5 ? mergingCoin - 1 : mergingCoin;
    
    if (dropMaxCoin > maxCoinType) {
      dropMaxCoin = maxCoinType;
    }
    return dropMaxCoin;
  }

  getDropMinCoin() {
    const dropMaxCoin = this.getDropMaxCoin();
    // Keep a sliding window of max 6 coin types dropping at a time
    // E.g. if dropMax is 15, min will be 10.
    return Math.max(1, dropMaxCoin - CONFIG.MAX_COIN_WINDOW);
  }

  checkCollectionLevelUp() {
    if (this.isLevelingUp) return false;

    let leveledUp = false;
    let targetCoinType = null;
    const totalCount = (type) => {
      let total = 0;
      for (const slot of this.board.getAllSlots()) {
        if (slot.isEmpty()) continue;
        for (const c of slot.coins) {
          if (c.type === type) total++;
        }
      }
      return total;
    };

    if (this.score >= 4) {
      if (this.score % 2 === 0) {
        // Phase A: (Scores 4, 6, 8...) -> Target = 6 of coin N
        const N = (this.score / 2) + 4;
        if (totalCount(N) >= CONFIG.PHASE_A_TARGET) {
          targetCoinType = N;
          leveledUp = true;
        }
      } else {
        // Phase B: (Scores 5, 7, 9...) -> Target = 1 of coin N+1
        const N = ((this.score - 1) / 2) + 4;
        if (totalCount(N + 1) >= CONFIG.PHASE_B_TARGET) {
          targetCoinType = N + 1;
          leveledUp = true;
        }
      }
    }

    if (leveledUp) {
      this.isLevelingUp = true;

      // Dispatch event to UI
      const event = new CustomEvent('hudGoalCompleted', { detail: { coinType: targetCoinType } });
      window.dispatchEvent(event);

      // Wait 1.5 seconds for animation
      setTimeout(() => {
        this.score++;
        this.gems += 10 + (this.score % 2 === 0 ? 100 : 200) + (this.score * 10);

        const oldSlots = this.getTotalUnlockedSlots(this.score - 1);
        const slotsToUnlock = this.getTotalUnlockedSlots(this.score);
        this.board.unlockSlotsUpTo(slotsToUnlock, (idx) => this.getScoreToUnlockSlot(idx, this.score));

        if (this.score >= CONFIG.TARGET_SCORE) {
          this.gameState = 'won';
        }

        this.isLevelingUp = false;

        // Force re-render to update UI with new score/goals
        const mainInstance = window.gameMain;
        if (oldSlots === 15 && slotsToUnlock === 7 && mainInstance) {
          mainInstance.renderer.playBoardTransitionAnimation(7);
        } else if (mainInstance && mainInstance.renderer) {
          mainInstance.renderer.render();
        }
      }, 1500);
    }
    return leveledUp;
  }

  checkClear(slotIndex) {
    if (this.isSlotMatchFull(slotIndex)) {
      return this.executeClearUpgrade(slotIndex);
    }
    return false;
  }

  checkAllClears() {
    let clearedAny = false;
    this.board.getAllSlots().forEach((_, index) => {
      if (this.isSlotMatchFull(index)) {
        this.executeClearUpgrade(index);
        clearedAny = true;
      }
    });
    return clearedAny;
  }

  hasValidMoves() {
    const slots = this.board.getAllSlots();

    for (let i = 0; i < CONFIG.TOTAL_SLOTS; i++) {
      const srcSlot = slots[i];
      const isSrcLocked = srcSlot.isLocked && !srcSlot.isTempUnlocked;
      if (isSrcLocked || srcSlot.isEmpty()) continue;

      const srcType = srcSlot.topCoin.type;

      for (let j = 0; j < CONFIG.TOTAL_SLOTS; j++) {
        if (i === j) continue;
        const destSlot = slots[j];
        const isDestLocked = destSlot.isLocked && !destSlot.isTempUnlocked;
        if (isDestLocked) continue;

        if (destSlot.isEmpty()) return true;
        if (!destSlot.isFull() && destSlot.topCoin.type === srcType) {
          return true;
        }
      }
    }
    return false;
  }

  checkGameOver() {
    // Game over disabled
    return;
  }

  getRequiredCoinTypes() {
    let required = new Set();
    const dropMax = this.getDropMaxCoin();
    
    // The player's "earned progress" are any coins that they manually crafted.
    // Manually crafted coins are exactly the ones strictly greater than the max coin that drops.
    // Anything <= dropMax is just a random drop and should be cleared on restart.
    for (let i = dropMax + 1; i <= 30; i++) {
      required.add(i);
    }
    
    return required;
  }
}
