// Synthesizes Act 3's score + SFX into assets/score.wav (48 kHz stereo). Times are act seconds.
// Retime cues here, then: node tools/build-score.mjs
import { writeFileSync } from "node:fs";

const SR = 48000, LEN = 77, N = SR * LEN, TAU = 2 * Math.PI;
const dry = [new Float32Array(N), new Float32Array(N)]; // straight to the mix
const wet = [new Float32Array(N), new Float32Array(N)]; // through the reverb
let seed = 11;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const noise = () => rnd() * 2 - 1;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const env = (x, a, r) => Math.min(1, x / a) * Math.exp(-x / r);

// write fn(x, p) -> sample into a bus with pan (-1..1) and a send to the reverb
function add(t0, dur, pan, send, fn) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR), gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const k = s0 + i;
    if (k < 0) continue;
    if (k >= N) break;
    const v = fn(i / SR, i / n);
    dry[0][k] += v * gl * (1 - send); dry[1][k] += v * gr * (1 - send);
    wet[0][k] += v * gl * send; wet[1][k] += v * gr * send;
  }
}

// ---- instruments
function piano(t, m, g = 0.18, pan = 0) {
  const f = hz(m), ph = new Float64Array(9), dur = Math.min(6, 2.5 + 400 / f);
  add(t, dur, pan, 0.45, (x, p) => {
    let v = 0;
    for (let k = 1; k <= 8; k++) {
      ph[k] += (TAU * f * k * Math.sqrt(1 + 0.0004 * k * k)) / SR;
      v += Math.sin(ph[k]) * Math.exp(-x * (0.7 + 0.55 * k)) / Math.pow(k, 1.4);
    }
    return g * v * Math.min(1, x / 0.004) * Math.min(1, (1 - p) * dur / 0.3);
  });
}
// band-limited saw wavetable for pads
const WT = new Float32Array(4096);
for (let i = 0; i < 4096; i++) for (let k = 1; k <= 14; k++) WT[i] += Math.sin((TAU * i * k) / 4096) / k * (k % 2 ? 1 : 0.6);
function pad(t, dur, notes, g = 0.05, bright = 900) {
  const atk = Math.min(1.6, dur * 0.35), rel = 2.2;
  notes.forEach((m, j) => {
    const f = hz(m), pan = ((j % 3) - 1) * 0.45;
    [-0.004, 0.004].forEach((det) => {
      let ph = rnd() * 4096, y = 0;
      const inc = (f * (1 + det) * 4096) / SR, a = 1 - Math.exp((-TAU * Math.min(bright, f * 6)) / SR);
      add(t, dur + rel, pan, 0.6, (x) => {
        ph = (ph + inc) % 4096; y += a * (WT[ph | 0] - y);
        const e = Math.min(1, x / atk) * (x > dur ? Math.max(0, 1 - (x - dur) / rel) : 1);
        return (g / notes.length) * y * e * (m < 45 ? 1.6 : 1);
      });
    });
  });
}
function sub(t, dur, m, g = 0.1) { let ph = 0; const f = hz(m); add(t, dur, 0, 0.1, (x, p) => { ph += (TAU * f) / SR; return g * Math.sin(ph) * Math.min(1, x / 1.2) * Math.min(1, (1 - p) * dur / 1.5); }); }
function filtNoise(t, dur, g, c0, c1, shape, pan = 0, send = 0.3) {
  let y = 0;
  add(t, dur, pan, send, (x, p) => { const c = c0 + (c1 - c0) * p, a = 1 - Math.exp((-TAU * c) / SR); y += a * (noise() - y); return g * y * shape(p, x); });
}
const whoosh = (t, d = 0.7, g = 0.4) => filtNoise(t, d, g, 300, 2400, (p) => Math.sin(Math.PI * p) ** 2);
const fall = (t, d = 1.5, g = 0.4) => filtNoise(t, d, g, 3000, 250, (p) => Math.sin(Math.PI * p) ** 1.5);
const rise = (t, d, g = 0.25) => filtNoise(t, d, g, 200, 4000, (p) => p ** 2 * (1 - p ** 10));
const tick = (t, g = 0.15, f = 1900, pan = 0) => { let ph = 0; add(t, 0.06, pan, 0.25, (x) => { ph += (TAU * f) / SR; return g * Math.sin(ph) * env(x, 0.0005, 0.008); }); };
const click = (t, g = 0.4) => { add(t, 0.03, 0, 0.2, (x) => g * noise() * env(x, 0.0002, 0.003)); tick(t, g * 0.6, 3200); };
const thud = (t, g = 0.5, f = 62) => { let ph = 0; add(t, 0.6, 0, 0.25, (x) => { ph += (TAU * (f + 50 * Math.exp(-x * 22))) / SR; return g * (Math.sin(ph) * env(x, 0.002, 0.12) + 0.3 * noise() * env(x, 0.001, 0.012)); }); };
const boom = (t, g = 0.8) => { let ph = 0; add(t, 2.4, 0, 0.35, (x) => { ph += (TAU * (34 + 40 * Math.exp(-x * 7))) / SR; return g * (Math.sin(ph) * env(x, 0.004, 0.6) + 0.2 * noise() * env(x, 0.001, 0.03)); }); };
const kick = (t, g = 0.3) => { let ph = 0; add(t, 0.35, 0, 0.05, (x) => { ph += (TAU * (48 + 70 * Math.exp(-x * 30))) / SR; return g * Math.sin(ph) * env(x, 0.002, 0.11); }); };
const ping = (t, m, g = 0.08, pan = 0) => { let ph = 0; const f = hz(m); add(t, 2.0, pan, 0.7, (x) => { ph += (TAU * f) / SR; return g * Math.sin(ph) * env(x, 0.002, 0.5); }); };
const pop = (t, g = 0.12, pan = 0) => { let ph = 0; add(t, 0.12, pan, 0.4, (x, p) => { ph += (TAU * (520 + 480 * p)) / SR; return g * Math.sin(ph) * env(x, 0.002, 0.04); }); };

const flap = (t, g = 0.14, pan = 0) => add(t, 0.02, pan, 0.15, (x) => g * noise() * env(x, 0.0002, 0.0025));
const pulse = (t, g = 0.4) => { let ph = 0; add(t, 0.45, 0, 0.2, (x) => { ph += (TAU * (52 + 18 * Math.exp(-x * 20))) / SR; return g * Math.sin(ph) * env(x, 0.004, 0.09); }); };
const shing = (t, g = 0.3) => { filtNoise(t, 0.7, g, 7000, 1800, (p) => (1 - p) ** 2.5, 0.2, 0.6); ping(t, 93, 0.05, 0.3); ping(t + 0.01, 86, 0.04, 0.3); };
const sweep = (t, d, g, p0, p1) => { let y = 0; add(t, d, 0, 0.35, (x, p) => { const c = 600 + 2600 * Math.sin(Math.PI * p), a = 1 - Math.exp((-TAU * c) / SR); y += a * (noise() - y); return g * y * Math.sin(Math.PI * p) ** 1.5; }); };
const panSweep = (t, d, g, from, to) => { let y = 0; const s0 = Math.floor(t * SR), n = Math.floor(d * SR); for (let i = 0; i < n; i++) { const k = s0 + i; if (k >= N) break; const p = i / n, c = 500 + 2800 * Math.sin(Math.PI * p), a = 1 - Math.exp((-TAU * c) / SR); y += a * (noise() - y); const v = g * y * Math.sin(Math.PI * p) ** 1.5, pan = from + (to - from) * p, gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4); dry[0][k] += v * gl * 0.7; dry[1][k] += v * gr * 0.7; wet[0][k] += v * gl * 0.3; wet[1][k] += v * gr * 0.3; } };
const rewind = (t, d) => { let ph = 0; add(t, d, 0, 0.3, (x, p) => { ph += (TAU * (1400 - 1100 * p + 160 * Math.sin(x * 70))) / SR; return 0.07 * Math.sin(ph) * (1 + 0.6 * Math.sign(Math.sin(ph * 0.5))) * Math.sin(Math.PI * p); }); filtNoise(t, d, 0.3, 5000, 500, (p) => Math.sin(Math.PI * p)); };
const room = (t, d, g) => filtNoise(t, d, g, 140, 220, (p, x) => Math.min(1, x / 1.0) * Math.min(1, (1 - p) * d / 1.0) * (0.8 + 0.2 * Math.sin(x * 0.7)), 0, 0.2);

// ---- harmony (MIDI), same key as Act 4
const Dm = [38, 50, 57, 62, 65], Bb = [34, 46, 53, 58, 62, 65], F = [41, 53, 57, 60, 65], C = [36, 48, 55, 60, 64], Gm = [43, 55, 58, 62, 67];
function arp(t0, t1, chord, step, g, up = 12) {
  const ns = chord.slice(1).map((m) => m + up), seq = ns.concat(ns.slice(1, -1).reverse());
  for (let i = 0, t = t0; t < t1; i++, t += step) piano(t, seq[i % seq.length], g * (0.85 + 0.3 * rnd()), (i % 2 ? 0.3 : -0.3));
}

// S1 · the clue 0-10: music out. Room tone in orbit, a low drone while the lines draw, a glass slice, one low hit
room(0, 10.2, 0.06);
pad(0.6, 7.4, [26, 38, 45], 0.035, 320); sub(0.6, 8.0, 38, 0.04);
shing(4.1, 0.26);
for (let i = 0; i < 5; i++) tick(4.6 + i * 0.08, 0.05, 2400 - i * 120, 0.2 + i * 0.1);
panSweep(7.5, 1.5, 0.16, -0.8, 0.8); // the satellite passes overhead
boom(8.2, 0.9); thud(8.2, 0.35, 48); ping(8.25, 50, 0.05, 0);
fall(9.5, 1.5, 0.32); // dive to Bangladesh

// S2 · the fix 10-25: the score enters under the method; flaps, then a whoosh per step
[[10.4, 4.3, Dm], [14.5, 4.0, Bb], [18.5, 3.6, F], [22.0, 2.8, C]].forEach(([t, d, ch]) => { pad(t, d, ch, 0.045, 800); sub(t, d + 0.4, ch[0], 0.045); });
arp(11.2, 14.5, Dm, 0.375, 0.05); arp(14.5, 18.5, Bb, 0.375, 0.045); arp(18.5, 22.0, F, 0.375, 0.05); arp(22.0, 24.4, C, 0.375, 0.045);
whoosh(10.2, 0.7, 0.18);
sweep(10.4, 1.6, 0.1); sweep(11.0, 1.6, 0.09);           // MODIS, then VIIRS pass over
whoosh(10.8, 0.6, 0.14); for (let i = 0; i < 16; i++) pop(12.2 + i * 0.05, 0.05, rnd() - 0.5);
ping(12.0, 81, 0.04, 0.3); ping(12.25, 81, 0.035, 0.3); ping(12.5, 81, 0.03, 0.3); // three VIIRS cells light
whoosh(14.4, 0.9, 0.3);                                   // the board swings in
for (let i = 0; i < 150; i++) flap(14.7 + rnd() * 2.0, 0.1 + 0.06 * rnd(), rnd() * 1.4 - 0.7);
click(16.9, 0.45); ping(17.1, 74, 0.06, 0); ping(17.12, 81, 0.04, 0);
whoosh(18.4, 0.9, 0.3);                                   // clear
filtNoise(18.6, 0.9, 0.14, 500, 1100, (p) => Math.sin(Math.PI * p), 0, 0.5); // clouds roll in
panSweep(19.4, 2.7, 0.14, -0.7, 0.7);                     // the sweep wipes them off
for (let i = 0; i < 36; i++) pop(19.5 + (i / 36) * 2.5 + rnd() * 0.05, 0.035, -0.6 + (i / 36) * 1.2);
rise(23.6, 1.3, 0.14);

// S3 · the proof 25-38: silence for "watch the jump", a rising whoosh, one crisp click
room(25.0, 4.6, 0.05);
pad(25.0, 4.2, [26, 38], 0.02, 260);
rise(28.4, 1.4, 0.24); whoosh(29.4, 1.0, 0.25);
[[29.8, 3.6, Bb], [33.4, 2.0, F], [35.4, 2.6, C]].forEach(([t, d, ch]) => { pad(t, d, ch, 0.04, 700); sub(t, d + 0.4, ch[0], 0.04); });
for (let i = 0; i < 18; i++) tick(30.4 + i * 0.065, 0.035, 1500 + i * 60, 0);
click(32.0, 0.55); ping(32.02, 86, 0.05, 0.2);
whoosh(33.55, 0.6, 0.3);
arp(33.8, 36.0, F, 0.375, 0.035);
thud(36.2, 0.5, 58); click(36.2, 0.35);

// S4 · crops 38-47: a lighter rhythm; a tick as the hand passes each month; a soft fill as the band fills
pad(38.1, 5.4, F, 0.035, 1200); sub(38.1, 5.8, 41, 0.035);
const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
for (let m = 1; m <= 12; m++) { let lo = 0, hi = 1; for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; io(mid) < m / 12 ? (lo = mid) : (hi = mid); } tick(38.5 + lo * 3.7, 0.09, 1500, 0.1); }
for (let t = 38.5; t < 44.2; t += 0.375) piano(t, [77, 72, 69, 72][Math.round((t - 38.5) / 0.375) % 4], 0.035, 0.25);
filtNoise(42.4, 1.1, 0.18, 400, 1700, (p) => Math.sin(Math.PI * p), 0, 0.5); pad(42.4, 1.6, [65, 69, 72], 0.03, 2400);
pop(43.3, 0.14, 0.3);
whoosh(44.3, 1.2, 0.32); fall(44.4, 1.4, 0.18);
pad(44.6, 2.6, C, 0.035, 900);
for (let i = 0; i < 12; i++) pop(45.2 + i * 0.09, 0.06, rnd() * 1.2 - 0.6);
whoosh(46.9, 0.9, 0.22);

// S5 · kilns 47-58: one held note while detections fall; the switch; a soft pulse on each winter
pad(47.2, 4.8, [50, 62], 0.05, 500); sub(47.2, 5.0, 38, 0.04);
for (let i = 0; i < 40; i++) tick(48.5 + i * 0.07 + rnd() * 0.04, 0.025, 2600 + rnd() * 600, rnd() * 1.2 - 0.6);
click(52.1, 0.6); thud(52.15, 0.3, 46);
pad(52.3, 5.6, [38, 45, 50, 57], 0.03, 380);
for (let w = 0; w < 13; w++) pulse(52.8 + w * 0.215, 0.32);
whoosh(56.3, 0.8, 0.22); ping(56.9, 69, 0.05, 0.2);

// S6 · just ask 58-77: rewind, the stamp's echo, keys, a tick per step, a chime as the answer lands
rewind(58.0, 0.9); thud(59.0, 0.32, 60); thud(59.25, 0.14, 60); thud(59.5, 0.06, 60);
whoosh(60.2, 1.2, 0.22);
pad(60.4, 5.6, Dm, 0.032, 700); sub(60.4, 6.0, 38, 0.035);
[[60.9, 69], [62.6, 65], [64.4, 74]].forEach(([t, m]) => piano(t, m, 0.07, 0.15));
for (let i = 0; i < 22; i++) click(61.7 + i * 0.059 + rnd() * 0.02, 0.12 + rnd() * 0.06);
click(63.25, 0.5);
for (let i = 0; i < 4; i++) tick(63.9 + i * 0.62, 0.12, 1700, 0.3);
whoosh(64.4, 1.4, 0.16);
whoosh(66.3, 0.6, 0.18); [[66.45, 81], [66.47, 86], [66.49, 89]].forEach(([t, m]) => ping(t, m, 0.05, 0.1));
[[66.4, 4.6, Bb], [71.0, 3.4, F]].forEach(([t, d, ch]) => { pad(t, d, ch, 0.035, 800); sub(t, d + 0.3, ch[0], 0.035); });
rise(68.0, 2.2, 0.08);
[[71.0, 74], [71.4, 77], [71.8, 81]].forEach(([t, m]) => piano(t, m, 0.08, 0.2));
thud(73.4, 0.3, 64); whoosh(74.0, 0.4, 0.22); thud(74.15, 0.55, 54);
// 74.6-75.6: near silence (the freeze); then the music returns, handing over to Act 4's Dm
pad(75.6, 2.0, Dm, 0.05, 900); sub(75.6, 2.0, 38, 0.06);
[[75.65, 62], [75.67, 69], [75.69, 74]].forEach(([t, m]) => piano(t, m, 0.1, 0.1));
// ---- reverb (freeverb-style) on the wet bus
function reverb(inp, spread) {
  const out = new Float32Array(N);
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({ b: new Float32Array(Math.round((d + spread) * SR / 44100)), i: 0, f: 0 }));
  const aps = [556, 441, 341, 225].map((d) => ({ b: new Float32Array(Math.round((d + spread) * SR / 44100)), i: 0 }));
  for (let n = 0; n < N; n++) {
    const x = inp[n] * 0.015; let y = 0;
    for (const c of combs) { const o = c.b[c.i]; c.f = o * 0.7 + c.f * 0.3; c.b[c.i] = x + c.f * 0.86; c.i = (c.i + 1) % c.b.length; y += o; }
    for (const a of aps) { const o = a.b[a.i]; a.b[a.i] = y + o * 0.5; a.i = (a.i + 1) % a.b.length; y = o - y; }
    out[n] = y;
  }
  return out;
}
const rl = reverb(wet[0], 0), rr = reverb(wet[1], 23);

// ---- mix, soft-limit, 0.2 s fade at the end, write 16-bit stereo WAV
const out = Buffer.alloc(44 + N * 4);
out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8);
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24);
out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40);
const fadeAt = N - Math.floor(0.2 * SR);
let peak = 0;
for (let n = 0; n < N; n++) {
  const g = n < fadeAt ? 1 : (N - n) / (N - fadeAt);
  const l = Math.tanh((dry[0][n] + wet[0][n] * 0.35 + rl[n] * 2.2) * 2.4) * 0.9 * g;
  const r = Math.tanh((dry[1][n] + wet[1][n] * 0.35 + rr[n] * 2.2) * 2.4) * 0.9 * g;
  peak = Math.max(peak, Math.abs(l), Math.abs(r));
  out.writeInt16LE(Math.round(l * 32767), 44 + n * 4); out.writeInt16LE(Math.round(r * 32767), 46 + n * 4);
}
writeFileSync(new URL("../assets/score.wav", import.meta.url), out);
console.log("wrote assets/score.wav", (out.length / 1e6).toFixed(1), "MB, peak", peak.toFixed(2));
