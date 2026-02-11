/**
 * PorterDash Sound System v2
 * Level music from MP3 files in /music, synced to BPM for level timing
 */

const MUSIC_TRACKS = [
  { url: '/music/catch22music-doom-drum-and-bass-full-369484.mp3', bpm: 174 },
  { url: '/music/catch22music-hopeless-drum-and-bass-full-369496.mp3', bpm: 170 },
  { url: '/music/catch22music-rapid-drum-and-bass-full-369486.mp3', bpm: 174 },
  { url: '/music/ebunny-cyberpunk-354179.mp3', bpm: 128 },
  { url: '/music/industrial-breakbeat-old-school-90s-rave-punk-classic-4-472172.mp3', bpm: 140 },
  { url: '/music/industrial-breakbeat-old-school-90s-rave-punk-classic-5-472174.mp3', bpm: 142 },
  { url: '/music/kaleidoplasm-blockhead-135801.mp3', bpm: 135 },
  { url: '/music/kaleidoplasm-s0l3m4gg07-135806.mp3', bpm: 138 },
  { url: '/music/musinova-neon-sky-liquid-jungle-breakbeat-drum-and-bass-356503.mp3', bpm: 174 },
  { url: '/music/tooone-11-snake-charmer-267944.mp3', bpm: 130 },
];

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicEnabled = true;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicInterval = null;
    this.musicStep = 0;
    this.initialized = false;
    this.currentTrack = null;
    this.filterNode = null;
    this.filterLFO = 0;
    this.musicAudio = null;
    this.musicSource = null;
    this.syncInterval = null;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.3;
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    if (this.masterGain) {
      this.masterGain.gain.value = this.enabled ? 0.6 : 0;
    }
    if (!this.enabled) this.stopMusic();
    return this.enabled;
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicGain) this.musicGain.gain.value = this.musicEnabled ? 0.3 : 0;
    if (this.musicAudio) this.musicAudio.muted = !this.musicEnabled;
    return this.musicEnabled;
  }

  getMusicStep() {
    return this.musicStep || 0;
  }

  getBPM() {
    if (this.currentTrack && this.currentTrack.bpm) return this.currentTrack.bpm;
    const idx = this._currentLevelIndex;
    if (idx != null && MUSIC_TRACKS[idx]) return MUSIC_TRACKS[idx].bpm;
    return 128;
  }

  getBPMForLevel(levelIndex) {
    const idx = Math.min(levelIndex !== undefined ? levelIndex : 0, MUSIC_TRACKS.length - 1);
    return MUSIC_TRACKS[idx] ? MUSIC_TRACKS[idx].bpm : 128;
  }

  isOnBeat(subdivision) {
    const s = subdivision || 4;
    return (this.musicStep || 0) % s === 0;
  }

  // ==================== SOUND EFFECTS ====================

  playJump() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(780, t + 0.08);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playDoubleJump() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(600, t);
    osc1.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
    osc2.frequency.setValueAtTime(610, t);
    osc2.frequency.exponentialRampToValueAtTime(1220, t + 0.1);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.15);
    osc2.stop(t + 0.15);
  }

  playLand() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.06);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  playCollect() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.06);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playDeath() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.25);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 0.3);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  playComplete() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = t + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.35);
    });
    const shimmerStart = t + 0.48;
    [1047, 1318, 1568].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, shimmerStart);
      gain.gain.linearRampToValueAtTime(0.15, shimmerStart + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, shimmerStart + 0.8);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(shimmerStart);
      osc.stop(shimmerStart + 0.8);
    });
  }

  // ==================== TRACK DEFINITIONS ====================
  // 10 unique electronic tracks - each with different style, BPM, key, patterns

  getTrack(levelIndex) {
    const tracks = [

      // Level 1: "First Steps" - Chill House 128 BPM, C minor
      {
        bpm: 128,
        style: 'house',
        // Notes: C3=130.81, Eb3=155.56, F3=174.61, G3=196, Bb3=233.08
        bassNotes: [130.81, 130.81, 155.56, 130.81, 174.61, 174.61, 155.56, 130.81],
        arpNotes: [523.25, 622.25, 783.99, 622.25, 523.25, 466.16, 523.25, 622.25],
        // 16-step patterns (1=hit, 0=rest)
        kick:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
        hihat:  [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
        openHat:[0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1],
        bass:   [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0],
        arp:    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        pad:    true,
        padChord: [261.63, 311.13, 392.00],
        bassType: 'sub',
        synthType: 'soft',
        filterSweep: false,
      },

      // Level 2: "Neon Fields" - Progressive House 130 BPM, A minor
      {
        bpm: 130,
        style: 'progressive',
        bassNotes: [110, 110, 130.81, 110, 146.83, 146.83, 130.81, 116.54],
        arpNotes: [440, 523.25, 659.25, 523.25, 440, 392, 440, 523.25,
                   659.25, 783.99, 659.25, 523.25, 440, 523.25, 659.25, 440],
        kick:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
        hihat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
        openHat:[0,0,0,0, 0,0,0,0, 0,0,0,1, 0,0,0,0],
        bass:   [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,1,0,0],
        arp:    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
        pad:    true,
        padChord: [220, 261.63, 329.63],
        bassType: 'pluck',
        synthType: 'arp',
        filterSweep: true,
      },

      // Level 3: "Cyber Pulse" - Driving Techno 136 BPM, D minor
      {
        bpm: 136,
        style: 'techno',
        bassNotes: [73.42, 73.42, 87.31, 73.42, 97.99, 87.31, 73.42, 82.41],
        arpNotes: [293.66, 349.23, 440, 349.23, 293.66, 261.63, 293.66, 349.23],
        kick:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
        hihat:  [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
        openHat:[0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1],
        bass:   [1,0,1,0, 0,0,1,0, 1,0,1,0, 0,1,0,0],
        arp:    [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,1],
        pad:    false,
        bassType: 'acid',
        synthType: 'stab',
        filterSweep: true,
      },

      // Level 4: "Magenta Madness" - Electro House 138 BPM, E minor
      {
        bpm: 138,
        style: 'electro',
        bassNotes: [82.41, 82.41, 98, 82.41, 110, 98, 82.41, 73.42],
        arpNotes: [329.63, 392, 493.88, 659.25, 493.88, 392, 329.63, 293.66],
        kick:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0],
        snare:  [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0],
        hihat:  [1,0,1,0, 1,0,1,0, 1,0,1,1, 1,0,1,0],
        openHat:[0,0,0,1, 0,0,0,0, 0,0,0,0, 0,0,0,1],
        bass:   [1,0,0,1, 0,1,0,0, 1,0,0,1, 0,0,1,0],
        arp:    [1,0,1,0, 0,1,0,1, 1,0,1,0, 0,1,0,1],
        pad:    false,
        bassType: 'distorted',
        synthType: 'lead',
        filterSweep: true,
      },

      // Level 5: "Purple Reign" - Trance 140 BPM, F minor
      {
        bpm: 140,
        style: 'trance',
        bassNotes: [87.31, 87.31, 103.83, 87.31, 116.54, 103.83, 87.31, 77.78],
        arpNotes: [349.23, 415.30, 523.25, 698.46, 523.25, 415.30, 349.23, 415.30,
                   523.25, 698.46, 523.25, 415.30, 349.23, 311.13, 349.23, 415.30],
        kick:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
        hihat:  [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
        openHat:[0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1],
        bass:   [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
        arp:    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
        pad:    true,
        padChord: [174.61, 207.65, 261.63],
        bassType: 'rolling',
        synthType: 'supersaw',
        filterSweep: true,
      },

      // Level 6: "Solar Flare" - Tech House 134 BPM, G minor
      {
        bpm: 134,
        style: 'techhouse',
        bassNotes: [98, 98, 116.54, 98, 130.81, 116.54, 98, 87.31],
        arpNotes: [392, 466.16, 587.33, 466.16, 392, 349.23, 392, 466.16],
        kick:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare:  [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],
        hihat:  [1,0,1,1, 0,1,1,0, 1,0,1,1, 0,1,1,0],
        openHat:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
        bass:   [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,1],
        arp:    [1,0,0,0, 1,0,0,1, 0,0,1,0, 0,0,1,0],
        pad:    false,
        bassType: 'groove',
        synthType: 'chord',
        filterSweep: false,
      },

      // Level 7: "Deep Freeze" - Dark Techno 142 BPM, B minor
      {
        bpm: 142,
        style: 'darktechno',
        bassNotes: [61.74, 61.74, 73.42, 61.74, 82.41, 73.42, 65.41, 61.74],
        arpNotes: [246.94, 293.66, 369.99, 293.66, 246.94, 220, 246.94, 293.66],
        kick:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare:  [0,0,0,0, 1,0,0,0, 0,0,0,1, 1,0,0,0],
        hihat:  [1,1,0,1, 1,0,1,1, 1,1,0,1, 1,0,1,1],
        openHat:[0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
        bass:   [1,0,1,0, 0,0,1,0, 1,0,0,1, 0,1,0,0],
        arp:    [0,0,1,0, 0,1,0,0, 1,0,0,0, 0,1,0,1],
        pad:    true,
        padChord: [123.47, 146.83, 185],
        bassType: 'dark',
        synthType: 'drone',
        filterSweep: true,
      },

      // Level 8: "Crimson Storm" - Hard Techno 148 BPM, A minor
      {
        bpm: 148,
        style: 'hardtechno',
        bassNotes: [55, 55, 65.41, 55, 73.42, 65.41, 55, 61.74],
        arpNotes: [440, 523.25, 659.25, 880, 659.25, 523.25, 440, 392],
        kick:   [1,0,0,1, 1,0,0,0, 1,0,1,0, 1,0,0,0],
        snare:  [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,1,0],
        hihat:  [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
        openHat:[0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1],
        bass:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 0,1,0,1],
        arp:    [1,0,0,1, 0,1,0,0, 1,0,0,1, 0,0,1,0],
        pad:    false,
        bassType: 'distorted',
        synthType: 'screech',
        filterSweep: true,
      },

      // Level 9: "Toxic Waste" - Acid Techno 152 BPM, E minor
      {
        bpm: 152,
        style: 'acid',
        bassNotes: [82.41, 82.41, 98, 82.41, 110, 123.47, 110, 98],
        arpNotes: [329.63, 392, 493.88, 392, 329.63, 293.66, 329.63, 392,
                   493.88, 587.33, 493.88, 392, 329.63, 392, 493.88, 329.63],
        kick:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare:  [0,0,0,0, 1,0,0,0, 0,0,1,0, 1,0,0,0],
        hihat:  [1,0,1,1, 1,0,1,0, 1,1,1,0, 1,0,1,1],
        openHat:[0,1,0,0, 0,1,0,0, 0,0,0,1, 0,1,0,0],
        bass:   [1,0,1,0, 0,1,1,0, 1,0,1,0, 1,1,0,1],
        arp:    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
        pad:    false,
        bassType: 'acid',
        synthType: 'acid',
        filterSweep: true,
      },

      // Level 10: "Infinity" - DnB / Neurofunk 174 BPM, D minor
      {
        bpm: 174,
        style: 'dnb',
        bassNotes: [73.42, 73.42, 87.31, 73.42, 97.99, 87.31, 73.42, 65.41],
        arpNotes: [587.33, 698.46, 880, 698.46, 587.33, 523.25, 587.33, 698.46],
        kick:   [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
        snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
        hihat:  [1,0,1,1, 0,1,1,0, 1,1,0,1, 0,1,1,0],
        openHat:[0,1,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,1],
        bass:   [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,1],
        arp:    [1,0,1,0, 0,1,0,1, 1,0,0,1, 0,1,1,0],
        pad:    true,
        padChord: [146.83, 174.61, 220],
        bassType: 'reese',
        synthType: 'neuro',
        filterSweep: true,
      },
    ];

    return tracks[Math.min(levelIndex, tracks.length - 1)];
  }

  // ==================== MUSIC ENGINE (MP3 + beat sync) ====================

  startMusic(levelSpeed, levelIndex) {
    this.stopMusic();
    if (!this.enabled) return;

    const idx = Math.min(levelIndex !== undefined ? levelIndex : 0, MUSIC_TRACKS.length - 1);
    const meta = MUSIC_TRACKS[idx];
    if (!meta || !meta.url) return;

    this._currentLevelIndex = idx;
    this.currentTrack = { bpm: meta.bpm };
    this.musicStep = 0;

    this.init();
    if (!this.ctx) return;

    const audio = new Audio(meta.url);
    audio.loop = true;
    audio.volume = 1;

    try {
      this.musicSource = this.ctx.createMediaElementSource(audio);
      this.musicSource.connect(this.musicGain);
    } catch (e) {
      audio.connect = null;
    }

    this.musicAudio = audio;
    audio.muted = !this.musicEnabled;
    audio.play().catch(() => {});

    const bpm = meta.bpm;
    const stepsPerBeat = 4;

    this.syncInterval = setInterval(() => {
      if (!this.musicAudio || this.musicAudio.paused) return;
      const t = this.musicAudio.currentTime;
      this.musicStep = Math.floor(t * (bpm / 60) * stepsPerBeat);
    }, 50);
  }

  // ==================== DRUM INSTRUMENTS ====================

  playKick(t, style) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    // Style variations
    const isHard = style === 'hardtechno' || style === 'acid' || style === 'dnb';
    const startFreq = isHard ? 200 : 150;
    const endFreq = isHard ? 25 : 35;
    const vol = isHard ? 0.55 : 0.4;
    const decay = style === 'dnb' ? 0.12 : 0.18;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.08);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

    // Add click transient for harder styles
    if (isHard) {
      const click = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      click.type = 'square';
      click.frequency.setValueAtTime(1200, t);
      click.frequency.exponentialRampToValueAtTime(100, t + 0.01);
      clickGain.gain.setValueAtTime(0.15, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
      click.connect(clickGain);
      clickGain.connect(this.musicGain);
      click.start(t);
      click.stop(t + 0.02);
    }

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + decay);
  }

  playSnare(t, style) {
    if (!this.ctx) return;
    const isHard = style === 'hardtechno' || style === 'dnb';
    const duration = isHard ? 0.15 : 0.1;
    const vol = isHard ? 0.3 : 0.2;

    // Noise component
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = style === 'dnb' ? 4000 : 3000;
    filter.Q.value = style === 'darktechno' ? 2 : 1;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(t);
    noise.stop(t + duration);

    // Tonal body
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
    oscGain.gain.setValueAtTime(0.12, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(oscGain);
    oscGain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  playHihat(t, open, style) {
    if (!this.ctx) return;
    const duration = open ? 0.12 : 0.04;
    const vol = open ? 0.12 : 0.08;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (open
        ? Math.exp(-i / (bufferSize * 0.5))
        : Math.exp(-i / (bufferSize * 0.1)));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = style === 'house' ? 7000 : 9000;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(t);
    noise.stop(t + duration);
  }

  // ==================== BASS INSTRUMENTS ====================

  playBassNote(t, freq, duration, bassType) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    switch (bassType) {
      case 'sub':
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.setValueAtTime(0.2, t + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        break;

      case 'pluck':
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.5);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + duration * 0.3);
        filter.Q.value = 5;
        break;

      case 'acid': {
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.setValueAtTime(0.15, t + duration * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        filter.type = 'lowpass';
        // Acid filter envelope - sharp attack, slow decay
        const cutoff = 400 + Math.sin(this.filterLFO) * 300;
        filter.frequency.setValueAtTime(2500, t);
        filter.frequency.exponentialRampToValueAtTime(cutoff, t + duration * 0.4);
        filter.Q.value = 12; // resonance!
        break;
      }

      case 'distorted': {
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.setValueAtTime(0.12, t + duration * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        filter.type = 'lowpass';
        filter.frequency.value = 600;
        filter.Q.value = 3;
        // Add a second oscillator for thickness
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.value = freq * 1.005;
        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.06, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc2.connect(gain2);
        gain2.connect(this.musicGain);
        osc2.start(t);
        osc2.stop(t + duration);
        break;
      }

      case 'rolling':
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.16, t);
        gain.gain.setValueAtTime(0.16, t + duration * 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(300, t + duration * 0.5);
        filter.Q.value = 4;
        break;

      case 'groove':
        osc.type = 'square';
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.6);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, t);
        filter.frequency.exponentialRampToValueAtTime(400, t + duration * 0.3);
        filter.Q.value = 6;
        break;

      case 'dark':
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.setValueAtTime(0.14, t + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        filter.type = 'lowpass';
        filter.frequency.value = 250;
        filter.Q.value = 2;
        break;

      case 'reese': {
        // Two detuned saws for that DnB reese bass
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.setValueAtTime(0.1, t + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, t);
        filter.frequency.exponentialRampToValueAtTime(300, t + duration * 0.5);
        filter.Q.value = 4;
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.value = freq * 1.01; // slight detune
        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.1, t);
        gain2.gain.setValueAtTime(0.1, t + duration * 0.7);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + duration);
        const filter2 = this.ctx.createBiquadFilter();
        filter2.type = 'lowpass';
        filter2.frequency.setValueAtTime(1200, t);
        filter2.frequency.exponentialRampToValueAtTime(300, t + duration * 0.5);
        filter2.Q.value = 4;
        osc2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(this.musicGain);
        osc2.start(t);
        osc2.stop(t + duration);
        break;
      }

      default:
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        filter.type = 'lowpass';
        filter.frequency.value = 400;
    }

    osc.frequency.value = freq;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  // ==================== SYNTH INSTRUMENTS ====================

  playSynthNote(t, freq, duration, synthType) {
    if (!this.ctx) return;

    switch (synthType) {
      case 'soft': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + duration);
        break;
      }

      case 'arp': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, t);
        filter.frequency.exponentialRampToValueAtTime(800, t + duration * 0.3);
        filter.Q.value = 2;
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.7);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + duration);
        break;
      }

      case 'stab': {
        // Short chord stab
        [freq, freq * 1.26, freq * 1.5].forEach((f) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = f;
          gain.gain.setValueAtTime(0.03, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.3);
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2000, t);
          filter.frequency.exponentialRampToValueAtTime(500, t + duration * 0.2);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.musicGain);
          osc.start(t);
          osc.stop(t + duration * 0.3);
        });
        break;
      }

      case 'lead': {
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc.frequency.value = freq;
        osc2.frequency.value = freq * 1.003; // slight detune
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(4000, t);
        filter.frequency.exponentialRampToValueAtTime(1000, t + duration * 0.4);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.6);
        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc2.start(t);
        osc.stop(t + duration);
        osc2.stop(t + duration);
        break;
      }

      case 'supersaw': {
        // Multiple detuned saws for that trance supersaw
        const detunes = [-12, -5, 0, 5, 12];
        detunes.forEach((det) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          osc.detune.value = det;
          gain.gain.setValueAtTime(0.02, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.8);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(t);
          osc.stop(t + duration);
        });
        break;
      }

      case 'chord': {
        [freq, freq * 1.2, freq * 1.5].forEach((f) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = f;
          gain.gain.setValueAtTime(0.03, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.5);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(t);
          osc.stop(t + duration);
        });
        break;
      }

      case 'drone': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        filter.type = 'lowpass';
        filter.frequency.value = 600 + Math.sin(this.filterLFO * 0.5) * 400;
        filter.Q.value = 6;
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + duration);
        break;
      }

      case 'screech': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 3, t);
        filter.frequency.exponentialRampToValueAtTime(freq, t + duration * 0.3);
        filter.Q.value = 10;
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.4);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + duration);
        break;
      }

      case 'acid': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(4000, t);
        filter.frequency.exponentialRampToValueAtTime(600, t + duration * 0.3);
        filter.Q.value = 15; // high resonance for acid squelch
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.6);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + duration);
        break;
      }

      case 'neuro': {
        // Modulated bass/lead for neurofunk
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc2.type = 'square';
        osc.frequency.value = freq;
        osc2.frequency.value = freq * 0.998;
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 4, t);
        filter.frequency.exponentialRampToValueAtTime(freq, t + duration * 0.3);
        filter.Q.value = 5;
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.5);
        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc2.start(t);
        osc.stop(t + duration);
        osc2.stop(t + duration);
        break;
      }
    }
  }

  // ==================== PAD (background atmosphere) ====================

  startPad(track) {
    if (!this.ctx || !track.padChord) return;
    // Create a sustained pad that plays in the background
    // We re-trigger it periodically since oscillators can't loop forever cleanly
    this.padInterval = setInterval(() => {
      if (!this.enabled || !this.musicEnabled) return;
      const t = this.ctx.currentTime;
      track.padChord.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc2.type = 'triangle';
        osc.frequency.value = freq;
        osc2.frequency.value = freq * 1.002;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.025, t + 0.5);
        gain.gain.setValueAtTime(0.025, t + 3);
        gain.gain.linearRampToValueAtTime(0, t + 4);
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc2.start(t);
        osc.stop(t + 4);
        osc2.stop(t + 4);
      });
    }, 3500);
  }

  // ==================== STYLE-SPECIFIC EXTRAS ====================

  playExtras(t, step, track, stepDuration) {
    const bar = Math.floor(this.musicStep / 16);

    switch (track.style) {
      case 'progressive':
        // Rising filter sweep every 2 bars
        if (step === 0 && bar % 2 === 0) {
          this.playRiser(t, stepDuration * 16);
        }
        break;

      case 'trance':
        // Reverse crash every 4 bars
        if (step === 0 && bar % 4 === 0) {
          this.playReverseCrash(t, stepDuration * 8);
        }
        break;

      case 'electro':
        // Glitch effect on bar 3
        if (step === 12 && bar % 4 === 2) {
          this.playGlitch(t, stepDuration * 2);
        }
        break;

      case 'hardtechno':
        // Industrial hit every 2 bars
        if (step === 0 && bar % 2 === 1) {
          this.playIndustrialHit(t);
        }
        break;

      case 'acid':
        // Acid squelch accent
        if (step === 6 || step === 14) {
          this.playAcidAccent(t, track.bassNotes[0] * 2, stepDuration);
        }
        break;

      case 'dnb':
        // Amens-style ghost snare
        if (step === 3 || step === 11) {
          this.playGhostSnare(t);
        }
        break;
    }
  }

  playRiser(t, duration) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (i / bufferSize) * 0.5;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.06, t + duration * 0.9);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(6000, t + duration * 0.9);
    filter.Q.value = 3;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(t);
    noise.stop(t + duration);
  }

  playReverseCrash(t, duration) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const progress = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * progress * progress;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + duration);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.frequency.linearRampToValueAtTime(8000, t + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(t);
    noise.stop(t + duration);
  }

  playGlitch(t, duration) {
    if (!this.ctx) return;
    for (let i = 0; i < 4; i++) {
      const glitchTime = t + i * duration * 0.25;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 200 + Math.random() * 2000;
      gain.gain.setValueAtTime(0.04, glitchTime);
      gain.gain.exponentialRampToValueAtTime(0.001, glitchTime + duration * 0.2);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(glitchTime);
      osc.stop(glitchTime + duration * 0.2);
    }
  }

  playIndustrialHit(t) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.05)) *
        Math.sin(i * 0.1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    noise.connect(gain);
    gain.connect(this.musicGain);
    noise.start(t);
    noise.stop(t + 0.2);
  }

  playAcidAccent(t, freq, duration) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(5000, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + duration * 0.2);
    filter.Q.value = 18;
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.4);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  playGhostSnare(t) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4500;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(t);
    noise.stop(t + 0.05);
  }

  // ==================== STOP ====================

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.padInterval) {
      clearInterval(this.padInterval);
      this.padInterval = null;
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.musicAudio) {
      this.musicAudio.pause();
      this.musicAudio.currentTime = 0;
      this.musicAudio.src = '';
      this.musicAudio = null;
    }
    this.musicSource = null;
    this.musicStep = 0;
    this.currentTrack = null;
  }
}

// Global instance
const sound = new SoundSystem();
