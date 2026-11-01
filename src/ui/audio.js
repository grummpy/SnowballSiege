/** All sound is synthesized. No audio files. */

const MELODY = [523.25, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 523.25];

export function createAudio() {
  let ctx = null;
  let master = null;
  let volume = 0.8;
  let muted = false;
  let failed = false;
  let themeOn = false;
  let nextNote = 0;
  let stepIndex = 0;

  function ensure() {
    if (failed) return null;
    try {
      if (!ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
          failed = true;
          return null;
        }
        ctx = new AudioCtx();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : volume;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch {
      failed = true;
      return null;
    }
  }

  function applyGain() {
    if (!master || !ctx) return;
    master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.03);
  }

  function tone(freq, dur, type, gain, delay = 0, slide = 0) {
    const audio = ensure();
    if (!audio) return;
    const t = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, gain, freq) {
    const audio = ensure();
    if (!audio) return;
    const length = Math.max(1, Math.floor(audio.sampleRate * dur));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.7;
    const amp = audio.createGain();
    const t = audio.currentTime;
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  function tick() {
    if (!themeOn) return;
    const audio = ensure();
    if (!audio) return;
    const now = audio.currentTime;
    if (!nextNote || nextNote < now) nextNote = now + 0.02;
    while (nextNote < now + 0.25) {
      const freq = MELODY[stepIndex % MELODY.length];
      tone(freq, 0.16, 'square', 0.018, nextNote - now);
      if (stepIndex % 4 === 0) tone(freq / 2, 0.28, 'triangle', 0.03, nextNote - now);
      stepIndex += 1;
      nextNote += 0.2;
    }
  }

  return {
    unlock() {
      ensure();
    },
    startTheme() {
      themeOn = true;
      ensure();
    },
    setVolume(value) {
      volume = value;
      applyGain();
    },
    setMuted(value) {
      muted = value;
      applyGain();
    },
    tick,
    ui() {
      tone(660, 0.06, 'square', 0.03);
    },
    countdown() {
      tone(520, 0.12, 'square', 0.04);
    },
    go() {
      tone(780, 0.16, 'square', 0.05);
    },
    throw() {
      tone(280, 0.12, 'sawtooth', 0.03, 0, 180);
    },
    hit() {
      noise(0.12, 0.08, 400);
      tone(140, 0.1, 'triangle', 0.05);
    },
    ko() {
      tone(392, 0.12, 'square', 0.05);
      tone(262, 0.18, 'square', 0.05, 0.1);
      tone(196, 0.28, 'triangle', 0.06, 0.22);
    },
    pickup() {
      tone(660, 0.08, 'square', 0.04);
      tone(880, 0.1, 'square', 0.04, 0.07);
    },
    repair() {
      tone(480, 0.05, 'triangle', 0.02);
    },
    block() {
      tone(720, 0.08, 'square', 0.03);
    },
    roundWin() {
      tone(523, 0.12, 'square', 0.05);
      tone(659, 0.12, 'square', 0.05, 0.1);
      tone(784, 0.2, 'square', 0.05, 0.2);
    },
    matchWin() {
      tone(523, 0.12, 'square', 0.05);
      tone(659, 0.12, 'square', 0.05, 0.12);
      tone(784, 0.12, 'square', 0.05, 0.24);
      tone(1046, 0.32, 'square', 0.06, 0.36);
    },
  };
}
