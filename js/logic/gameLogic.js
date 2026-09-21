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

    if (firstType >= currentMaxCoin) {
      this.score++;
      this.gems += 50;
      this.board.unlockSlotsUpTo(CONFIG.INITIAL_UNLOCKED_SLOTS + this.score);
    }

    if (this.score >= CONFIG.TARGET_SCORE) {
      this.gameState = 'won';
    }
    return true;
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
