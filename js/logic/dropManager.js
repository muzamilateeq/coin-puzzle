import { CONFIG } from '../config.js';
import { Coin } from '../core/Coin.js';

export class DropManager {
  constructor(board) {
    this.board = board;
    this.dropsRemaining = CONFIG.INITIAL_DROPS;
  }

  reset() {
    // No drops limit anymore
  }

  dealRandomCoins(count, maxCoinType = 5, groupSameSlot = false, animate = false) {
    const slots = this.board.getAllSlots();
    const assignedTypePerSlot = new Map();
    
    // Filter slots that are full or strictly locked (not temp unlocked)
    let validSlots = slots.map((s, index) => ({s, index})).filter(item => {
      const isLocked = item.s.isLocked && !item.s.isTempUnlocked;
      return !item.s.isFull() && !isLocked;
    });
    
    if (groupSameSlot && validSlots.length > 0) {
      // Pre-assign types to slots to guarantee all numbers are represented
      let typesToAssign = [];
      for (let i = 1; i <= maxCoinType; i++) typesToAssign.push(i);
      
      // If there are more slots than types, fill the rest with random types
      while (typesToAssign.length < validSlots.length) {
        typesToAssign.push(Math.floor(Math.random() * maxCoinType) + 1);
      }
      
      // Shuffle the types using Fisher-Yates
      for (let i = typesToAssign.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [typesToAssign[i], typesToAssign[j]] = [typesToAssign[j], typesToAssign[i]];
      }
      
      // Assign them to the valid slots
      validSlots.forEach((slotInfo, idx) => {
        assignedTypePerSlot.set(slotInfo.index, typesToAssign[idx]);
      });
    }
    
    for (let i = 0; i < count; i++) {
      // Re-evaluate valid slots
      validSlots = slots.map((s, index) => ({s, index})).filter(item => {
        const isLocked = item.s.isLocked && !item.s.isTempUnlocked;
        return !item.s.isFull() && !isLocked;
      });
      
      if (validSlots.length === 0) break;
      
      const randomSlotIndex = validSlots[Math.floor(Math.random() * validSlots.length)].index;
      
      let typeToDrop;
      if (groupSameSlot && assignedTypePerSlot.has(randomSlotIndex)) {
        // 75% chance to match the assigned group, 25% chance to be random noise
        if (Math.random() < 0.75) {
          typeToDrop = assignedTypePerSlot.get(randomSlotIndex);
        } else {
          typeToDrop = Math.floor(Math.random() * maxCoinType) + 1;
        }
      } else {
        typeToDrop = Math.floor(Math.random() * maxCoinType) + 1;
        if (groupSameSlot) assignedTypePerSlot.set(randomSlotIndex, typeToDrop);
      }
      
      const newCoin = new Coin(typeToDrop);
      // Only mark as animated drop when explicitly requested (button click), not on init
      if (animate) newCoin.isNewDrop = true;
      try {
        slots[randomSlotIndex].push(newCoin);
      } catch (e) {
        // Slot filled between re-validation and push — skip this coin safely
      }
    }
  }


  handleDropButton(maxCoinType = 5) {
    this.dealRandomCoins(CONFIG.DROP_AMOUNT, maxCoinType, true, true); // animate=true
    return true;
  }
}
