import { CONFIG } from '../config.js';
import { Slot } from './Slot.js';

export class Board {
  constructor() {
    this.slots = Array.from({ length: CONFIG.TOTAL_SLOTS }, () => new Slot());
  }

  getSlot(index) {
    return this.slots[index];
  }

  getAllSlots() {
    return this.slots;
  }

  unlockSlotsUpTo(count) {
    let lockedCount = 0;
    this.slots.forEach((slot, index) => {
      slot.isLocked = index < CONFIG.TOTAL_SLOTS - count;
      if (slot.isLocked) {
        lockedCount++;
        // Demo mapping: make the first locked slot a 'gem' lock, and the second a 'time' lock
        if (lockedCount === 1) slot.lockType = 'gem';
        else if (lockedCount === 2) slot.lockType = 'time';
        else slot.lockType = null;
      } else {
        slot.lockType = null;
      }
    });
  }

  hasEmptySpace() {
    return this.slots.some(slot => !slot.isLocked && !slot.isFull());
  }

  clearAll() {
    this.slots.forEach(slot => slot.clear());
  }
}
