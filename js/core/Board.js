import { CONFIG } from '../config.js';
import { Slot } from './Slot.js';

export class Board {
  constructor() {
    this.slots = Array.from({ length: CONFIG.TOTAL_SLOTS }, () => new Slot());
    this.manuallyUnlockedIndices = new Set();
    this.lastScoreCount = CONFIG.INITIAL_UNLOCKED_SLOTS;
    this.hasBoughtGemSlot = false;
  }

  getSlot(index) {
    return this.slots[index];
  }

  getAllSlots() {
    return this.slots;
  }

  unlockSpecificSlot(index) {
    if (this.slots[index].lockType === 'gem') {
      this.hasBoughtGemSlot = true;
    }
    this.manuallyUnlockedIndices.add(index);
    this.updateLocksAndTypes(this.lastScoreCount);
  }

  resetGemSlotPurchase() {
    this.hasBoughtGemSlot = false;
    this.manuallyUnlockedIndices.clear();
  }

  unlockSlotsUpTo(count, unlockScoreCalculator = null) {
    this.updateLocksAndTypes(count, unlockScoreCalculator);
  }

  updateLocksAndTypes(baseCount, unlockScoreCalculator = null) {
    this.lastScoreCount = baseCount;
    
    // Total effective unlocked slots = base level progression + manually purchased slots (600 coins)
    const extraCount = this.manuallyUnlockedIndices.size;
    const totalUnlockedCount = Math.min(CONFIG.TOTAL_SLOTS, baseCount + extraCount);
    
    const unlockedStartIndex = CONFIG.TOTAL_SLOTS - totalUnlockedCount;
    let lockedSlotIndices = [];
    
    this.slots.forEach((slot, index) => {
      if (index >= unlockedStartIndex) {
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
    let availableSlots = [...lockedSlotIndices];

    if (availableSlots.length > 0) {
      if (!this.hasBoughtGemSlot) {
        // 1. Gem slot on the rightmost locked slot
        let gemIdx = availableSlots[availableSlots.length - 1];
        this.slots[gemIdx].lockType = 'gem';
        this.slots[gemIdx].unlockCost = 600;
        let targetIndexForLogic = (15 - gemIdx) - extraCount; 
        if (unlockScoreCalculator) {
            this.slots[gemIdx].unlockLevel = unlockScoreCalculator(targetIndexForLogic);
        }
        availableSlots = availableSlots.filter(idx => idx !== gemIdx);

        // 2. Padlock slot on the next locked slot to the left
        if (availableSlots.length > 0) {
          let padIdx = availableSlots[availableSlots.length - 1];
          this.slots[padIdx].lockType = 'padlock';
          let targetIndexForLogic = (15 - padIdx) - extraCount;
          if (unlockScoreCalculator) {
              this.slots[padIdx].unlockLevel = unlockScoreCalculator(targetIndexForLogic);
          }
          availableSlots = availableSlots.filter(idx => idx !== padIdx);
        }

        // 3. Time slot on the next locked slot to the left
        if (availableSlots.length > 0) {
          let timeIdx = availableSlots[availableSlots.length - 1];
          const activeTempIdx = lockedSlotIndices.find(idx => this.slots[idx].isTempUnlocked);
          if (activeTempIdx !== undefined) {
            timeIdx = activeTempIdx;
          }
          this.slots[timeIdx].lockType = 'time';
          this.slots[timeIdx].timeBonus = 60;
        }
      } else {
        // Gem slot has been bought on this board: Padlock and Time slots shift right to fill the boundary
        // 1. Padlock slot on the rightmost locked slot
        if (availableSlots.length > 0) {
          let padIdx = availableSlots[availableSlots.length - 1];
          this.slots[padIdx].lockType = 'padlock';
          let targetIndexForLogic = (15 - padIdx) - extraCount;
          if (unlockScoreCalculator) {
              this.slots[padIdx].unlockLevel = unlockScoreCalculator(targetIndexForLogic);
          }
          availableSlots = availableSlots.filter(idx => idx !== padIdx);
        }

        // 2. Time slot on the next locked slot to the left
        if (availableSlots.length > 0) {
          let timeIdx = availableSlots[availableSlots.length - 1];
          const activeTempIdx = lockedSlotIndices.find(idx => this.slots[idx].isTempUnlocked);
          if (activeTempIdx !== undefined) {
            timeIdx = activeTempIdx;
          }
          this.slots[timeIdx].lockType = 'time';
          this.slots[timeIdx].timeBonus = 60;
        }
      }
    }
  }

  hasEmptySpace() {
    return this.slots.some(slot => {
      // Exclude locked slots AND temporarily unlocked (blue) slots
      // because coins cannot be dropped into them.
      const isAvailable = !slot.isLocked && !slot.isTempUnlocked;
      return isAvailable && !slot.isFull();
    });
  }

  clearAll() {
    this.slots.forEach(slot => slot.clear());
  }

  clearNonRequiredCoins(requiredSet) {
    this.slots.forEach(slot => {
      slot.coins = slot.coins.filter(c => requiredSet.has(c.type));
    });
  }
}
