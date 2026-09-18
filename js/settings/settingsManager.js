export class SettingsManager {
  constructor(onRestartCallback) {
    this.onRestart = onRestartCallback;

    this.musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
    this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    this.vibrateEnabled = localStorage.getItem('vibrateEnabled') !== 'false';

    this.initElements();
    this.bindEvents();
    this.updateUI();
  }

  initElements() {
    this.btnSettings = document.getElementById('btn-settings');
    this.modalSettings = document.getElementById('settings-modal');
    this.btnSettingsClose = document.getElementById('btn-settings-close');
    this.btnSettingsRestart = document.getElementById('btn-settings-restart');
    this.toggleMusic = document.getElementById('toggle-music');
    this.toggleSound = document.getElementById('toggle-sound');
    this.toggleVibrate = document.getElementById('toggle-vibrate');
    this.imgMusic = document.getElementById('img-toggle-music');
    this.imgSound = document.getElementById('img-toggle-sound');
    this.imgVibrate = document.getElementById('img-toggle-vibrate');
  }

  bindEvents() {
    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => this.open());
    }
    if (this.btnSettingsClose) {
      this.btnSettingsClose.addEventListener('click', () => this.close());
    }
    if (this.btnSettingsRestart) {
      this.btnSettingsRestart.addEventListener('click', () => {
        this.close();
        if (typeof this.onRestart === 'function') {
          this.onRestart();
        }
      });
    }

    if (this.toggleMusic) {
      this.toggleMusic.addEventListener('click', () => this.toggleMusicState());
    }
    if (this.toggleSound) {
      this.toggleSound.addEventListener('click', () => this.toggleSoundState());
    }
    if (this.toggleVibrate) {
      this.toggleVibrate.addEventListener('click', () => this.toggleVibrateState());
    }
  }

  open() {
    if (this.modalSettings) {
      this.modalSettings.classList.remove('hidden');
    }
  }

  close() {
    if (this.modalSettings) {
      this.modalSettings.classList.add('hidden');
    }
  }

  toggleMusicState() {
    this.musicEnabled = !this.musicEnabled;
    localStorage.setItem('musicEnabled', this.musicEnabled);
    this.updateUI();
  }

  toggleSoundState() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('soundEnabled', this.soundEnabled);
    this.updateUI();
  }

  toggleVibrateState() {
    this.vibrateEnabled = !this.vibrateEnabled;
    localStorage.setItem('vibrateEnabled', this.vibrateEnabled);
    if (this.vibrateEnabled && navigator.vibrate) {
      navigator.vibrate(50);
    }
    this.updateUI();
  }

  updateUI() {
    if (this.imgMusic) {
      this.imgMusic.src = this.musicEnabled
        ? './Assets/Settings/Music On_.png'
        : './Assets/Settings/Music Off_.png';
    }
    if (this.imgSound) {
      this.imgSound.src = this.soundEnabled
        ? './Assets/Settings/Sound On_.png'
        : './Assets/Settings/Sound Off_.png';
    }
    if (this.imgVibrate) {
      this.imgVibrate.src = this.vibrateEnabled
        ? './Assets/Settings/Vibrate On_.png'
        : './Assets/Settings/Vibrate Off_.png';
    }
  }
}
