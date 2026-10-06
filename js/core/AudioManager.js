export class AudioManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    
    this.soundPaths = {
      dropCoin: './Assets/sounds/coin-dropslot.mp3',
      levelUp: './Assets/sounds/level-up98.mp3',
      slotComplete: './Assets/sounds/slot-complete.mp3',
      btnDrop: './Assets/sounds/drop-coinsounds.mp3',
      wrongSlot: './Assets/sounds/wrong-slotsound.mp3',
      selectCoin: './Assets/sounds/coin-selecting.mp3',
      settingAdjust: './Assets/sounds/setting-adjust.mp3',
      newCoinUnlock: './Assets/sounds/new-coin.mp3',
      newSlotOpen: './Assets/sounds/new-slot-open.mp3'
    };

    this.buffers = {};
    this.audioContext = null;
    this.masterGain = null;
    this.unlocked = false;
    
    // Initialize Web Audio API context for zero-latency playback
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.audioContext = new AudioContext();
      // Setup a single master gain (volume) node connected to speakers
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.audioContext.destination);
    }

    // Professional H5 Audio Unlock Routine (Pre-warms the audio hardware)
    this.unlockAudio = () => {
      if (this.unlocked || !this.audioContext) return;
      
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Play a tiny silent buffer to force hardware initialization instantly (crucial for iOS Safari)
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);

      this.unlocked = true;
      document.removeEventListener('click', this.unlockAudio);
      document.removeEventListener('touchstart', this.unlockAudio);
    };
    
    document.addEventListener('click', this.unlockAudio);
    document.addEventListener('touchstart', this.unlockAudio);

    this.preloadSounds();
  }

  async preloadSounds() {
    if (!this.audioContext) return;
    
    // Fetch and decode all sounds concurrently
    const loadSound = async (key, path) => {
      try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        
        this.audioContext.decodeAudioData(
          arrayBuffer, 
          (buffer) => { this.buffers[key] = buffer; }, 
          (err) => { console.warn(`Error decoding audio ${key}:`, err); }
        );
      } catch (err) {
        console.warn(`Failed to fetch sound ${key}:`, err);
      }
    };

    for (const [key, path] of Object.entries(this.soundPaths)) {
      loadSound(key, path);
    }
  }

  playSound(name, duration = null) {
    if (!this.settingsManager || !this.settingsManager.soundEnabled) return;
    
    // Wake up if OS put tab to sleep
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (this.audioContext && this.buffers[name]) {
      // Use Web Audio API: Zero Latency, exact timing
      const source = this.audioContext.createBufferSource();
      source.buffer = this.buffers[name];
      source.connect(this.masterGain);
      source.start(0);
      if (duration) {
        source.stop(this.audioContext.currentTime + duration);
      }
    } else {
      // Fallback: If Web Audio is unsupported or audio is still downloading/decoding
      const src = this.soundPaths[name];
      if (src) {
        const audio = new Audio(src);
        audio.volume = 0.8; 
        audio.play().catch(() => {});
        if (duration) {
          setTimeout(() => {
            audio.pause();
          }, duration * 1000);
        }
      }
    }
  }
}
