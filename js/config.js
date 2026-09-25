export const CONFIG = {
  // --- CORE SETTINGS ---
  COIN_TYPES: 2,                 // Starting max coin type at score 0
  MAX_PER_SLOT: 8,               // Coins required to merge into the next level coin
  TOTAL_SLOTS: 15,               // Total slots physically available on the board
  INITIAL_UNLOCKED_SLOTS: 5,     // Slots open at the beginning of the game
  
  // --- DROPPING SETTINGS ---
  INITIAL_DEAL: 15,              // Coins placed randomly when restarting or starting fresh
  DYNAMIC_DROP_MULTIPLIER: 1.5,  // Multiplier for drop amount based on open slots
  MAX_COIN_WINDOW: 5,            // Difference between Max and Min dropping coins (sliding window size)
  
  // --- PROBABILITIES ---
  LUCKY_DROP_CHANCE: 0.30,       // Chance (0.0 to 1.0) that a coin drops exactly on its matching type
  EMPTY_SLOT_PRIORITY: 0.60,     // Chance (0.0 to 1.0) to aggressively target an empty slot if available
  
  // --- LEVELING SETTINGS ---
  PHASE_A_TARGET: 6,             // Number of stacks needed to complete an EVEN score level
  PHASE_B_TARGET: 1              // Number of stacks needed to complete an ODD score level
};
