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
    this.slots.forEach((slot, index) => {
      slot.isLocked = index < CONFIG.TOTAL_SLOTS - count;
    });
  }

  hasEmptySpace() {
    return this.slots.some(slot => !slot.isLocked && !slot.isFull());
  }

  clearAll() {
    this.slots.forEach(slot => slot.clear());
  }
}
