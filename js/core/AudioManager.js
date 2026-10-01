export class AudioManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    
    this.soundPaths = {
      dropCoin: './Assets/sounds/dropcoin-sound.mp3',
      levelUp: './Assets/sounds/level-up98.mp3',
      slotComplete: './Assets/sounds/slot-complete.mp3'
    };

    // Preload sounds by creating dummy audio elements
    Object.values(this.soundPaths).forEach(src => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.load();
    });
  }

  playSound(name) {
    if (!this.settingsManager || !this.settingsManager.soundEnabled) return;
    
    const src = this.soundPaths[name];
    if (src) {
      // Create a fresh Audio object within the user interaction event
      // This bypasses iOS Safari's strict cloneNode/autoplay restrictions
      const audio = new Audio(src);
      audio.volume = 0.8; 
      audio.play().catch(e => {
        console.warn('Audio play failed:', e);
      });
    }
  }
}
