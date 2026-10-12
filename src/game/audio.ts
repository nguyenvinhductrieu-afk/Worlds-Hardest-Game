/**
 * AudioManager — Web Audio API based sound engine.
 * All sounds are synthesized at runtime, no external files needed.
 */

type SoundName = 'death' | 'level_complete' | 'collect' | 'button' | 'game_over';

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicOsc: OscillatorNode | null = null;
  private musicInterval: number | null = null;
  private musicEnabled = true;
  private masterVol = 0.7;
  private sfxVol = 0.8;
  private musicVol = 0.4;
  private noteIndex = 0;

  init(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.masterGain.gain.value = this.masterVol;
      this.sfxGain.gain.value = this.sfxVol;
      this.musicGain.gain.value = this.musicVol;
    } catch {
      // Audio not supported — game still works
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMasterVolume(v: number): void {
    this.masterVol = v;
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  setSfxVolume(v: number): void {
    this.sfxVol = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  setMusicVolume(v: number): void {
    this.musicVol = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    volumeMultiplier = 1,
    delay = 0,
  ): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3 * volumeMultiplier, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  private playNoise(duration: number, volumeMultiplier = 1, delay = 0): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime + delay;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3 * volumeMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
    source.stop(now + duration + 0.05);
  }

  play(sound: SoundName): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    this.resume();

    switch (sound) {
      case 'death':
        // Descending tones + noise burst
        this.playTone(400, 0.15, 'square', 1, 0);
        this.playTone(300, 0.15, 'square', 0.8, 0.08);
        this.playTone(150, 0.25, 'sawtooth', 0.7, 0.16);
        this.playNoise(0.15, 0.5, 0);
        break;

      case 'level_complete':
        // Ascending arpeggio
        this.playTone(523, 0.12, 'square', 1, 0); // C5
        this.playTone(659, 0.12, 'square', 1, 0.1); // E5
        this.playTone(784, 0.12, 'square', 1, 0.2); // G5
        this.playTone(1047, 0.3, 'square', 1, 0.3); // C6
        break;

      case 'collect':
        // Short bright blip
        this.playTone(880, 0.06, 'square', 0.7, 0);
        this.playTone(1320, 0.08, 'square', 0.5, 0.04);
        break;

      case 'button':
        this.playTone(600, 0.05, 'square', 0.5, 0);
        break;

      case 'game_over':
        this.playTone(400, 0.2, 'sawtooth', 1, 0);
        this.playTone(300, 0.2, 'sawtooth', 0.8, 0.15);
        this.playTone(200, 0.4, 'sawtooth', 0.7, 0.3);
        break;
    }
  }

  startMusic(): void {
    if (!this.musicEnabled) return;
    if (!this.ctx) this.init();
    if (!this.ctx || !this.musicGain) return;
    if (this.musicInterval !== null) return;

    this.resume();

    const scale = [220, 247, 277, 294, 330, 370, 415, 440];
    const pattern = [0, 2, 4, 2, 5, 4, 2, 0, 3, 2, 0, 2];

    const playNote = () => {
      if (!this.ctx || !this.musicGain) return;
      const note = scale[pattern[this.noteIndex % pattern.length]];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.22);
      this.noteIndex++;
    };

    playNote();
    this.musicInterval = window.setInterval(playNote, 280);
  }

  stopMusic(): void {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const audioManager = new AudioManager();
