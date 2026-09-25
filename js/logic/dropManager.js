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

  dealRandomCoins(count, maxCoinType = 5, groupSameSlot = false, animate = false, limitMaxCoinToOne = false, minCoinType = 1) {
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
      // USER REQUEST: Prioritize completely empty slots so they get used more often
      let emptySlots = unusedSlots.filter(item => item.s.isEmpty());
      let randomSlotInfo;
      
      if (emptySlots.length > 0 && Math.random() < CONFIG.EMPTY_SLOT_PRIORITY) {
        // Force picking an empty slot if one exists based on priority
        randomSlotInfo = emptySlots[Math.floor(Math.random() * emptySlots.length)];
      } else {
        randomSlotInfo = unusedSlots[Math.floor(Math.random() * unusedSlots.length)];
      }
      
      const randomSlotIndex = randomSlotInfo.index;
      const spaceAvailable = randomSlotInfo.s.spaceAvailable;
      
      usedSlotsInBatch.add(randomSlotIndex);
      
      // Determine cluster size (2 to 3 coins to prevent overloading one slot)
      let clusterSize = Math.floor(Math.random() * 2) + 2; 
      clusterSize = Math.min(clusterSize, count - coinsDropped, spaceAvailable);
      
      // Generate a random coin between minCoinType and maxCoinType
      const range = maxCoinType - minCoinType + 1;
      let typeToDrop = Math.floor(Math.random() * range) + minCoinType;

      // strict logic for limitMaxCoinToOne
      let isForcedMaxCoin = false;
      if (limitMaxCoinToOne) {
          if (coinsDropped === 0) {
              // Guarantee the first coin drop is EXACTLY ONE max coin
              typeToDrop = maxCoinType;
              clusterSize = 1;
              isForcedMaxCoin = true;
          } else if (typeToDrop === maxCoinType && range > 1) {
              // Downgrade any other attempt to drop max coin
              typeToDrop = Math.floor(Math.random() * (range - 1)) + minCoinType;
          }
      }

      // NEW RULE: Actively AVOID dropping a cluster of the same coin on top of itself!
      // This forces the player to manually sort the coins.
      // USER REQUEST: Allow a small chance for the same coin to drop on itself as a lucky moment.
      if (!isForcedMaxCoin && !randomSlotInfo.s.isEmpty()) {
          const topType = randomSlotInfo.s.topCoin.type;
          if (typeToDrop === topType && Math.random() >= CONFIG.LUCKY_DROP_CHANCE) {
              // Shift the coin type to something else valid within [minCoinType, shiftMax]
              let shiftMax = limitMaxCoinToOne ? (maxCoinType - 1) : maxCoinType;
              if (shiftMax < minCoinType) shiftMax = minCoinType;
              
              const currentOffset = typeToDrop - minCoinType;
              const rangeLimit = shiftMax - minCoinType + 1;
              typeToDrop = ((currentOffset + 1) % rangeLimit) + minCoinType;
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

  handleDropButton(maxCoinType = 5, limitMaxCoinToOne = false, minCoinType = 1) {
    const openSlots = this.board.getAllSlots().filter(s => !s.isLocked || s.isTempUnlocked);
    const totalSpace = openSlots.reduce((sum, slot) => sum + slot.spaceAvailable, 0);
    
    // Normal drop amount based on open slots (e.g. 5 slots -> 7 coins)
    let baseAmount = Math.floor(openSlots.length * CONFIG.DYNAMIC_DROP_MULTIPLIER);
    
    // If board is getting full, restrict the drop to half of the available space
    let dynamicDropAmount = Math.min(baseAmount, Math.floor(totalSpace / 2));
    if (dynamicDropAmount < 1 && totalSpace > 0) dynamicDropAmount = 1;
    
    this.dealRandomCoins(dynamicDropAmount, maxCoinType, true, true, limitMaxCoinToOne, minCoinType); // animate=true
    return true;
  }
}
