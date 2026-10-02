export class AudioManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    
    this.soundPaths = {
      dropCoin: './Assets/sounds/dropcoin-sound.mp3',
      levelUp: './Assets/sounds/level-up98.mp3',
      slotComplete: './Assets/sounds/slot-complete.mp3'
    };

    this.buffers = {};
    
    // Initialize Web Audio API context for zero-latency playback
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.audioContext = new AudioContext();
    }

    // Modern browsers require user interaction before audio context can play
    this.unlockAudio = () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    };
    
    document.addEventListener('click', this.unlockAudio);
    document.addEventListener('touchstart', this.unlockAudio);

    this.preloadSounds();
  }

  async preloadSounds() {
    if (!this.audioContext) return;
    
    for (const [key, path] of Object.entries(this.soundPaths)) {
      try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        
        // decodeAudioData decodes the mp3 into memory for instant playback
        // We use the callback signature for full iOS Safari compatibility
        this.audioContext.decodeAudioData(
          arrayBuffer, 
          (buffer) => {
            this.buffers[key] = buffer;
          }, 
          (err) => {
            console.warn(`Error decoding audio ${key}:`, err);
          }
        );
      } catch (err) {
        console.warn(`Failed to fetch sound ${key}:`, err);
      }
    }
  }

  playSound(name) {
    if (!this.settingsManager || !this.settingsManager.soundEnabled) return;
    
    // Ensure we are resumed if they click for the first time on a sound-triggering element
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (this.audioContext && this.buffers[name]) {
      // Use Web Audio API: Zero Latency, exact timing
      const source = this.audioContext.createBufferSource();
      source.buffer = this.buffers[name];
      
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.8;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      source.start(0);
    } else {
      // Fallback: If Web Audio is unsupported or audio is still downloading/decoding
      const src = this.soundPaths[name];
      if (src) {
        const audio = new Audio(src);
        audio.volume = 0.8; 
        audio.play().catch(e => {
          console.warn('Fallback audio play failed:', e);
        });
      }
    }
  }
}
