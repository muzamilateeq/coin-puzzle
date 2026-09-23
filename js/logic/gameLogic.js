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
        const slotsToUnlock = CONFIG.INITIAL_UNLOCKED_SLOTS + this.getExtraSlots(this.score);
        this.board.unlockSlotsUpTo(slotsToUnlock);
        this.isLevelingUp = false;
        
        const mainInstance = window.gameMain; 
        if (mainInstance && mainInstance.renderer) {
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

  getExtraSlots(score) {
    if (score === 0) return 0;
    if (score === 1) return 0; // Working on 3-coin
    if (score === 2) return 1; // Completed 3-coin. First slot opens!
    if (score === 3) return 2; // Completed 4-coin. Second slot opens!
    if (score === 4) return 3; // Level 4. Third slot opens!
    if (score === 5) return 3; // Level 5 (paused)
    if (score === 6) return 3; // Level 6 (paused)
    return score - 3; // Level 7 opens next slot
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
        if (totalCount(N) >= 6) {
          targetCoinType = N;
          leveledUp = true;
        }
      } else {
        // Phase B: (Scores 5, 7, 9...) -> Target = 1 of coin N+1
        const N = ((this.score - 1) / 2) + 4;
        if (totalCount(N + 1) >= 1) {
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
        
        const slotsToUnlock = CONFIG.INITIAL_UNLOCKED_SLOTS + this.getExtraSlots(this.score);
        this.board.unlockSlotsUpTo(slotsToUnlock);
        
        if (this.score >= CONFIG.TARGET_SCORE) {
          this.gameState = 'won';
        }
        
        this.isLevelingUp = false;
        
        // Force re-render to update UI with new score/goals
        const mainInstance = window.gameMain; 
        if (mainInstance && mainInstance.renderer) {
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
}
