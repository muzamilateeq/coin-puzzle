import { CONFIG } from '../config.js';
import { Slot } from './Slot.js';

export class Board {
  constructor() {
    this.slots = Array.from({ length: CONFIG.TOTAL_SLOTS }, () => new Slot());
    this.manuallyUnlockedIndices = new Set();
    this.lastScoreCount = CONFIG.INITIAL_UNLOCKED_SLOTS;
  }

  getSlot(index) {
    return this.slots[index];
  }

  getAllSlots() {
    return this.slots;
  }

  unlockSpecificSlot(index) {
    this.manuallyUnlockedIndices.add(index);
    this.updateLocksAndTypes(this.lastScoreCount);
  }

  unlockSlotsUpTo(count) {
    // Treat the count param as the base level progression count
    // Since main.js passes CONFIG.INITIAL_UNLOCKED_SLOTS + score + extraUnlockedSlots
    // we need to adjust this because we are now managing extraUnlockedSlots via the Set.
    // However, to keep it simple, we'll rename this internally to updateLocksAndTypes.
    this.updateLocksAndTypes(count);
  }

  updateLocksAndTypes(baseCount) {
    this.lastScoreCount = baseCount;
    
    // First, determine which ones are unlocked by default level progression
    const defaultUnlockedStartIndex = CONFIG.TOTAL_SLOTS - baseCount;
    let lockedSlotIndices = [];
    
    this.slots.forEach((slot, index) => {
      // It is unlocked if it's in the default unlocked zone (level progression) OR if manually unlocked (gems)
      if (index >= defaultUnlockedStartIndex || this.manuallyUnlockedIndices.has(index)) {
        slot.isLocked = false;
        slot.lockType = null;
        slot.isTempUnlocked = false;
        slot.isPendingShift = false;
        slot.tempUnlockTimeLeft = null;
        slot.timeBonus = null;
        slot.unlockLevel = null;
        slot.unlockCost = null;
      } else {
        slot.isLocked = true;
        lockedSlotIndices.push(index);
      }
    });

    // Clear old special types on locked slots
    this.slots.forEach(slot => {
      if (slot.isLocked) {
        slot.lockType = null;
        slot.timeBonus = null;
        slot.unlockLevel = null;
        slot.unlockCost = null;
      }
    });

    // Assign special types to the remaining locked slots from right to left
    if (lockedSlotIndices.length > 0) {
      const idx1 = lockedSlotIndices[lockedSlotIndices.length - 3] || lockedSlotIndices[0];
      this.slots[idx1].lockType = 'time';
      this.slots[idx1].timeBonus = 60;
    }
    
    if (lockedSlotIndices.length > 1) {
      const idx2 = lockedSlotIndices[lockedSlotIndices.length - 2];
      this.slots[idx2].lockType = 'padlock';
    }
    
    if (lockedSlotIndices.length > 2) {
      const idx3 = lockedSlotIndices[lockedSlotIndices.length - 1];
      this.slots[idx3].lockType = 'gem';
      this.slots[idx3].unlockCost = 600;
      
      // Calculate exactly when the NEXT slot (this gem slot) will open
      let unlockScore = 1;
      const targetBaseCount = 15 - idx3;
      for (let s = 1; s <= 50; s++) {
          let extra = 0;
          if (s === 2) extra = 1;
          else if (s === 3) extra = 2;
          else if (s >= 4 && s <= 6) extra = 3;
          else if (s >= 7) extra = s - 3;
          
          if (5 + extra >= targetBaseCount) {
              unlockScore = s;
              break;
          }
      }
      this.slots[idx3].unlockLevel = unlockScore;
    }
  }

  hasEmptySpace() {
    return this.slots.some(slot => {
      const isLocked = slot.isLocked && !slot.isTempUnlocked;
      return !isLocked && !slot.isFull();
    });
  }

  clearAll() {
    this.slots.forEach(slot => slot.clear());
  }
}
