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
    if (isSourceLocked) return false;
    // If destination is temp unlocked, it is never considered locked for transfers
    const isDestLocked = destSlot.isLocked && !destSlot.isTempUnlocked;
    if (isDestLocked) return false;

    if (sourceSlot.isEmpty()) return false;
    if (destSlot.isFull()) return false;

    // Explicitly allow move if destination is empty
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
        const oldScore = this.score;
        const newScore = this.score + 1;
        const gemsAwarded = 60;
        window.showLevelUpPopup(oldScore, newScore, gemsAwarded, () => {
          const oldMaxCoin = this.getDropMaxCoin();
          this.score++;
          this.gems += gemsAwarded;
          const newMaxCoin = this.getDropMaxCoin();
          const oldSlots = this.getTotalUnlockedSlots(this.score - 1);
          const slotsToUnlock = this.getTotalUnlockedSlots(this.score);
          this.board.unlockSlotsUpTo(slotsToUnlock, (idx) => this.getScoreToUnlockSlot(idx, this.score));
          this.isLevelingUp = false;
          const mainInstance = window.gameMain;
          const doRender = () => {
            if (oldSlots === 15 && slotsToUnlock === 7 && mainInstance) {
              mainInstance.renderer.playBoardTransitionAnimation(7);
            } else if (mainInstance && mainInstance.renderer) {
              mainInstance.renderer.render();
            }
          };
          // Always show popup for the coin we JUST created (firstType + 1)
          if (window.showNewCoinPopup) {
            window.showNewCoinPopup(firstType + 1, doRender);
          } else {
            doRender();
          }
        });
      }, 500);
    }

    if (this.score >= CONFIG.TARGET_SCORE) {
      this.gameState = 'won';
    }
    return true;
  }

  getTotalUnlockedSlots(score) {
    let extra = 0;
    if (score === 2) extra = 1;
    else if (score >= 3 && score <= 4) extra = 2;
    else if (score >= 5 && score <= 6) extra = 3;
    else if (score === 7) extra = 4;
    else if (score >= 8) extra = score - 3;

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
    let extra = 0;
    if (this.score === 2) extra = 1;
    else if (this.score >= 3 && this.score <= 4) extra = 2;
    else if (this.score >= 5 && this.score <= 6) extra = 3;
    else if (this.score === 7) extra = 4;
    else if (this.score >= 8) extra = this.score - 3;

    const rawTotal = CONFIG.INITIAL_UNLOCKED_SLOTS + extra;


    const maxCoinType = CONFIG.COIN_TYPES + this.score;
    let dropMaxCoin;

    if (this.score <= 2) {
      dropMaxCoin = maxCoinType;
    } else {
      dropMaxCoin = maxCoinType - 1;
    }

    if (dropMaxCoin < 1) dropMaxCoin = 1;
    return dropMaxCoin;
  }

  getDropMinCoin() {
    let extra = 0;
    if (this.score === 2) extra = 1;
    else if (this.score >= 3 && this.score <= 4) extra = 2;
    else if (this.score >= 5 && this.score <= 6) extra = 3;
    else if (this.score === 7) extra = 4;
    else if (this.score >= 8) extra = this.score - 3;

    const rawTotal = CONFIG.INITIAL_UNLOCKED_SLOTS + extra;

    // Board 3+ (starts at Level 21): drop coins from 17 onwards
    if (this.score >= 21) {
      return 17;
    }

    // Board 2 (after Level 13 complete, score 14-20): drop coins from 9 onwards
    if (rawTotal > 15) {
      return 9;
    }

    // On Board 1: Always drop from coin 1 onwards so early coins never stop dropping
    return 1;
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
  getHintMove() {
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

        // ONLY suggest a move if it merges matching coins. No empty slot suggestions.
        if (!destSlot.isFull() && !destSlot.isEmpty() && destSlot.topCoin.type === srcType) {
          return { src: i, dest: j };
        }
      }
    }
    return null;
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
