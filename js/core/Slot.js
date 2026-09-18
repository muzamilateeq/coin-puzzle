import { CONFIG } from '../config.js';

export class Slot {
  constructor() {
    this.coins = [];
    this.isLocked = true;
    this.lockType = null; // 'gem' | 'time' | null
  }

  push(...coins) {
    if (this.coins.length + coins.length > CONFIG.MAX_PER_SLOT) {
      throw new Error("Exceeded max slot capacity");
    }
    this.coins.push(...coins);
  }

  pop(count) {
    if (count > this.coins.length) {
      throw new Error("Not enough coins to pop");
    }
    return this.coins.splice(this.coins.length - count, count);
  }

  get length() {
    return this.coins.length;
  }

  get topCoin() {
    return this.length > 0 ? this.coins[this.length - 1] : null;
  }

  get spaceAvailable() {
    return CONFIG.MAX_PER_SLOT - this.length;
  }

  getConsecutiveMatches() {
    if (this.length === 0) return 0;
    
    let matchCount = 0;
    const topType = this.topCoin.type;
    
    for (let i = this.length - 1; i >= 0; i--) {
      if (this.coins[i].type === topType) {
        matchCount++;
      } else {
        break;
      }
    }
    return matchCount;
  }

  isFull() {
    return this.length === CONFIG.MAX_PER_SLOT;
  }

  isEmpty() {
    return this.length === 0;
  }
  
  clear() {
    this.coins = [];
  }
}
