// audio.js — semua suara prosedural lewat WebAudio, tanpa file audio:
// dengung mesin mengikuti kecepatan, sirene dua nada saat polisi dekat,
// blip misi, bunyi tabrakan, dan pukulan. Mulai hanya setelah gestur pengguna.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenTimer = 0;
    this.sirenHigh = false;
  }

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      // mesin: sawtooth rendah + lowpass
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(filter).connect(this.engineGain).connect(this.ctx.destination);
      this.engineOsc.start();
      // sirene: segitiga dua nada
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 720;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain).connect(this.ctx.destination);
      this.sirenOsc.start();
    } catch { this.ctx = null; }
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  toggle() { this.enabled = !this.enabled; if (!this.enabled) this.setEngine(0); return this.enabled; }

  setEngine(speedKmh) {
    if (!this.ctx || !this.enabled) return;
    const on = speedKmh > 1;
    this.engineGain.gain.setTargetAtTime(on ? 0.045 + Math.min(0.05, speedKmh / 2400) : 0, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(50 + speedKmh * 2.2, this.ctx.currentTime, 0.08);
  }

  // Sirene: ganti nada tiap 0.45 detik selama polisi dekat.
  updateSiren(dt, policeNear) {
    if (!this.ctx) return;
    if (!this.enabled || !policeNear) {
      this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      return;
    }
    this.sirenTimer += dt;
    if (this.sirenTimer > 0.45) {
      this.sirenTimer = 0;
      this.sirenHigh = !this.sirenHigh;
      this.sirenOsc.frequency.setTargetAtTime(this.sirenHigh ? 880 : 620, this.ctx.currentTime, 0.02);
    }
    this.sirenGain.gain.setTargetAtTime(0.035, this.ctx.currentTime, 0.1);
  }

  blip(freq = 660, dur = 0.12, type = 'sine', vol = 0.12) {
    if (!this.ctx || !this.enabled) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  // Bunyi tabrakan / pukulan: ledakan noise singkat lewat buffer acak.
  thud(vol = 0.25, dur = 0.18) {
    if (!this.ctx || !this.enabled) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 500;
    src.connect(f).connect(g).connect(this.ctx.destination);
    src.start();
  }

  missionDone() { this.blip(523, 0.15); setTimeout(() => this.blip(659, 0.15), 140); setTimeout(() => this.blip(784, 0.3), 280); }
  pickup() { this.blip(880, 0.1, 'sine', 0.1); setTimeout(() => this.blip(1174, 0.16), 90); }
}
