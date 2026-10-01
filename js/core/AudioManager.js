export class AudioManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    
    this.sounds = {
      dropCoin: new Audio('./Assets/sounds/dropcoin-sound.mp3'),
      levelUp: new Audio('./Assets/sounds/level-up98.mp3'),
      slotComplete: new Audio('./Assets/sounds/slot-complete.mp3')
    };

    // Preload sounds
    Object.values(this.sounds).forEach(audio => {
      audio.load();
    });
  }

  playSound(name) {
    if (!this.settingsManager || !this.settingsManager.soundEnabled) return;
    
    const audio = this.sounds[name];
    if (audio) {
      // Clone the node to allow overlapping sounds
      const clone = audio.cloneNode();
      clone.volume = 0.8; // Set default volume
      clone.play().catch(e => {
        // Audio play might fail if user hasn't interacted with page yet
        console.warn('Audio play failed:', e);
      });
    }
  }
}
