import { Howl } from 'howler';

/**
 * SoundManager — Centralized Web Audio / Howler.js sound system.
 *
 * All sounds are generated procedurally via the Web Audio API so the
 * system is 100 % functional with zero external audio-file dependencies.
 * If you drop real .mp3/.wav files under /public/sounds/ you can map
 * them in the SOUND_SOURCES table below and they will be picked up
 * automatically (Howler falls back to the procedural generator when a
 * file is not found).
 *
 * Every method is safe to call even when the AudioContext is suspended
 * or blocked by autoplay policies — play() is gated behind a user
 * interaction flag that is set on first click/tap.
 */

const SOUND_SOURCES = {
  waitingAmbient: null,
  whoosh: null,
  auctionStart: null,
  newBid: null,
  countdown: null,
  hammer: null,
  winner: null,
  crowdCheer: null,
  fireworks: null,
};

let masterVolume = 0.6;
// Mute preference persists across visits so "sound off" stays off until the
// user explicitly turns it back on.
const MUTED_STORAGE_KEY = 'app:sound-muted';
let muted = (() => {
  try {
    return localStorage.getItem(MUTED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
})();
let audioContext = null;
let hasUserInteraction = false;

const soundCache = {};

// ── Mute-state pub/sub ───────────────────────────────────────────────────────
// UI toggles (navbar sound button) subscribe so every instance reflects the
// current preference without prop drilling through contexts.
const muteListeners = new Set();
function notifyMuteListeners() {
  muteListeners.forEach((cb) => {
    try { cb(muted); } catch { /* listener errors must never break playback */ }
  });
}

function getAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
    }
  }
  return audioContext;
}

function resumeAudioContext() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

function ensureInteraction() {
  if (!hasUserInteraction) {
    hasUserInteraction = true;
    resumeAudioContext();
  }
}

function createOscillator(ctx, type, frequency, startTime, endTime, gainNode) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  osc.connect(gainNode);
  osc.start(startTime);
  osc.stop(endTime);
  return osc;
}

/**
 * Procedural sound generators — each produces a short, pleasant
 * waveform that approximates the intended SFX without files.
 */
const generators = {
  whoosh(ctx) {
    const now = ctx.currentTime;
    const duration = 0.6;
    const endTime = now + duration;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.25 * masterVolume, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

    createOscillator(ctx, 'sawtooth', 120, now, endTime, gainNode);
    createOscillator(ctx, 'sine', 80, now, endTime, gainNode);
    createOscillator(ctx, 'triangle', 300, now, endTime, gainNode);
  },

  auctionStart(ctx) {
    const now = ctx.currentTime;
    const duration = 1.2;
    const endTime = now + duration;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3 * masterVolume, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

    for (let i = 0; i < 5; i++) {
      const freq = 220 * Math.pow(2, i / 3);
      const start = now + i * 0.05;
      const stop = start + 0.3;
      createOscillator(ctx, 'sine', freq, start, stop, gainNode);
    }
  },

  newBid(ctx) {
    const now = ctx.currentTime;
    const duration = 0.4;
    const endTime = now + duration;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2 * masterVolume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

    createOscillator(ctx, 'square', 440, now, endTime, gainNode);
    createOscillator(ctx, 'sine', 220, now, endTime, gainNode);
  },

  countdown(ctx) {
    const now = ctx.currentTime;
    const duration = 0.3;
    const endTime = now + duration;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.18 * masterVolume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

    createOscillator(ctx, 'sine', 880, now, endTime, gainNode);
  },

  hammer(ctx) {
    const now = ctx.currentTime;
    const duration = 0.5;
    const endTime = now + duration;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.35 * masterVolume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

    createOscillator(ctx, 'square', 110, now, endTime, gainNode);
    createOscillator(ctx, 'square', 220, now + 0.02, endTime, gainNode);
    createOscillator(ctx, 'sine', 55, now, endTime, gainNode);
  },

  winner(ctx) {
    const now = ctx.currentTime;
    const duration = 2.0;
    const endTime = now + duration;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);

    for (let i = 0; i < 8; i++) {
      const freq = 440 * Math.pow(2, i / 4);
      const start = now + i * 0.05;
      const stop = start + 0.5;
      createOscillator(ctx, 'sine', freq, start, stop, gainNode);
    }

    gainNode.gain.linearRampToValueAtTime(0.25 * masterVolume, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
  },

  crowdCheer(ctx) {
    const now = ctx.currentTime;
    const duration = 3.0;
    const endTime = now + duration;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2 * masterVolume, now + 0.3);
    gainNode.gain.linearRampToValueAtTime(0.15 * masterVolume, now + 2.0);
    gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

    for (let i = 0; i < 3; i++) {
      createOscillator(ctx, 'sawtooth', 200 + i * 50, now, endTime, gainNode);
      createOscillator(ctx, 'sawtooth', 250 - i * 30, now, endTime, gainNode);
    }
  },

  fireworks(ctx) {
    const now = ctx.currentTime;
    const duration = 1.5;
    const endTime = now + duration;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15 * masterVolume, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

    createOscillator(ctx, 'sawtooth', 180, now, now + 0.2, gainNode);
    createOscillator(ctx, 'sawtooth', 440, now + 0.05, now + 0.25, gainNode);
    createOscillator(ctx, 'sine', 660, now + 0.1, now + 0.35, gainNode);
    createOscillator(ctx, 'sine', 330, now + 0.15, now + 0.4, gainNode);
    createOscillator(ctx, 'square', 880, now + 0.2, now + 0.45, gainNode);
  },

  waitingAmbient(ctx) {
    const now = ctx.currentTime;
    const duration = 4.0;
    const endTime = now + duration;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.04 * masterVolume, now + 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

    createOscillator(ctx, 'sine', 55, now, endTime, gainNode);
    createOscillator(ctx, 'sine', 110, now, endTime, gainNode);
    createOscillator(ctx, 'sine', 82.5, now, endTime, gainNode);
  },
};

function getHowl(key) {
  if (soundCache[key]) {
    return soundCache[key];
  }
  if (SOUND_SOURCES[key]) {
    soundCache[key] = new Howl({
      src: [SOUND_SOURCES[key]],
      volume: muted ? 0 : masterVolume,
    });
    return soundCache[key];
  }
  return null;
}

function playProcedure(ctx, key) {
  if (muted || masterVolume === 0) return;
  const gen = generators[key];
  if (gen) {
    gen(ctx);
  }
}

export const soundManager = {
  setVolume(vol) {
    masterVolume = Math.max(0, Math.min(1, vol));
    Object.values(soundCache).forEach(h => h.volume(masterVolume));
  },

  mute() {
    this.setMuted(true);
  },

  unmute() {
    this.setMuted(false);
  },

  // Single source of truth for the global sound preference. Persists to
  // localStorage, mutes/stops every cached Howl and notifies subscribers.
  setMuted(value) {
    const next = Boolean(value);
    if (muted === next) return;
    muted = next;
    try {
      localStorage.setItem(MUTED_STORAGE_KEY, String(next));
    } catch { /* storage unavailable — session-only preference */ }
    Object.values(soundCache).forEach(h => h.mute(muted));
    if (muted) {
      // Kill anything currently sounding (e.g. waiting ambient loop).
      Object.values(soundCache).forEach(h => h.stop());
    }
    notifyMuteListeners();
  },

  toggleMuted() {
    this.setMuted(!muted);
  },

  subscribe(listener) {
    muteListeners.add(listener);
    return () => muteListeners.delete(listener);
  },

  isMuted() {
    return muted;
  },

  setMasterVolume(vol) {
    masterVolume = Math.max(0, Math.min(1, vol));
  },

  play(key) {
    if (muted) return; // global sound off — no playback at all
    ensureInteraction();
    const ctx = getAudioContext();
    if (ctx) {
      const howl = getHowl(key);
      if (howl) {
        howl.volume(muted ? 0 : masterVolume);
        howl.play();
      } else {
        playProcedure(ctx, key);
      }
    } else if (!muted) {
      playProcedure({ currentTime: 0, destination: { connect: () => {} } }, key);
    }
  },

  stop(key) {
    if (soundCache[key]) {
      soundCache[key].stop();
    }
  },

  stopAll() {
    Object.values(soundCache).forEach(h => h.stop());
  },

  init() {
    if (typeof window !== 'undefined') {
      const onFirstInteraction = () => {
        ensureInteraction();
        window.removeEventListener('click', onFirstInteraction);
        window.removeEventListener('touchstart', onFirstInteraction);
        window.removeEventListener('keydown', onFirstInteraction);
      };
      window.addEventListener('click', onFirstInteraction);
      window.addEventListener('touchstart', onFirstInteraction);
      window.addEventListener('keydown', onFirstInteraction);
    }
  },
};

if (typeof window !== 'undefined') {
  soundManager.init();
}

export const AUCTION_SOUNDS = {
  WAITING_AMBIENT: 'waitingAmbient',
  WHOOSH: 'whoosh',
  AUCTION_START: 'auctionStart',
  NEW_BID: 'newBid',
  COUNTDOWN: 'countdown',
  HAMMER: 'hammer',
  WINNER: 'winner',
  CROWD_CHEER: 'crowdCheer',
  FIREWORKS: 'fireworks',
};

export default soundManager;
