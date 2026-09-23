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

  dealRandomCoins(count, maxCoinType = 5, groupSameSlot = false, animate = false, limitMaxCoinToOne = false) {
    const slots = this.board.getAllSlots();
    let coinsDropped = 0;
    let usedSlotsInBatch = new Set();
    
    while (coinsDropped < count) {
      // Find valid slots with available space
      const validSlots = slots.map((s, index) => ({s, index})).filter(item => {
        const isLocked = item.s.isLocked && !item.s.isTempUnlocked;
        return !item.s.isFull() && !isLocked;
      });
      
      if (validSlots.length === 0) break;
      
      // Try to pick a slot we haven't used in this drop batch yet to spread them out
      let unusedSlots = validSlots.filter(s => !usedSlotsInBatch.has(s.index));
      if (unusedSlots.length === 0) {
        usedSlotsInBatch.clear(); // Reset if all slots have been used
        unusedSlots = validSlots;
      }
      
      // Pick a random valid slot
      const randomSlotInfo = unusedSlots[Math.floor(Math.random() * unusedSlots.length)];
      const randomSlotIndex = randomSlotInfo.index;
      const spaceAvailable = randomSlotInfo.s.spaceAvailable;
      
      usedSlotsInBatch.add(randomSlotIndex);
      
      // Determine cluster size (2 to 3 coins to prevent overloading one slot)
      let clusterSize = Math.floor(Math.random() * 2) + 2; 
      clusterSize = Math.min(clusterSize, count - coinsDropped, spaceAvailable);
      
      let typeToDrop = Math.floor(Math.random() * maxCoinType) + 1;

      // strict logic for limitMaxCoinToOne
      let isForcedMaxCoin = false;
      if (limitMaxCoinToOne) {
          if (coinsDropped === 0) {
              // Guarantee the first coin drop is EXACTLY ONE max coin
              typeToDrop = maxCoinType;
              clusterSize = 1;
              isForcedMaxCoin = true;
          } else if (typeToDrop === maxCoinType) {
              // Downgrade any other attempt to drop max coin
              typeToDrop = Math.floor(Math.random() * (maxCoinType - 1)) + 1;
          }
      }

      // NEW RULE: Actively AVOID dropping a cluster of the same coin on top of itself!
      // This forces the player to manually sort the coins.
      if (!isForcedMaxCoin && !randomSlotInfo.s.isEmpty()) {
          const topType = randomSlotInfo.s.topCoin.type;
          if (typeToDrop === topType) {
              // Shift the coin type to something else valid
              let shiftMax = limitMaxCoinToOne ? (maxCoinType - 1) : maxCoinType;
              if (shiftMax < 1) shiftMax = 1;
              typeToDrop = (typeToDrop % shiftMax) + 1;
          }
      }

      // Drop the cluster of identical coins into the selected slot
      for (let j = 0; j < clusterSize; j++) {
         const newCoin = new Coin(typeToDrop);
         if (animate) newCoin.isNewDrop = true;
         try {
             slots[randomSlotIndex].push(newCoin);
         } catch (e) {}
         coinsDropped++;
      }
    }
  }

  handleDropButton(maxCoinType = 5, limitMaxCoinToOne = false) {
    // Dynamically calculate how many coins to drop based on open slots
    const openSlotsCount = this.board.getAllSlots().filter(s => !s.isLocked || s.isTempUnlocked).length;
    const dynamicDropAmount = Math.floor(openSlotsCount * 1.3); // e.g., 5 slots -> 6 coins, 10 slots -> 13 coins
    
    this.dealRandomCoins(dynamicDropAmount, maxCoinType, true, true, limitMaxCoinToOne); // animate=true
    return true;
  }
}
