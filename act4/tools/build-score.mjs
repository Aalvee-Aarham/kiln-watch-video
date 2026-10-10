// Synthesizes Act 4's score + SFX into assets/score.wav (48 kHz stereo). Times are act seconds.
// Retime cues here, then: node tools/build-score.mjs
import { writeFileSync } from "node:fs";

const SR = 48000, LEN = 74, N = SR * LEN, TAU = 2 * Math.PI;
const dry = [new Float32Array(N), new Float32Array(N)]; // straight to the mix
const wet = [new Float32Array(N), new Float32Array(N)]; // through the reverb
let seed = 7;
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

// ---- harmony (MIDI)
const Dm = [38, 50, 57, 62, 65], Bb = [34, 46, 53, 58, 62, 65], F = [41, 53, 57, 60, 65], C = [36, 48, 55, 60, 64];
const Bb9 = [34, 46, 53, 57, 60, 62], Fadd9 = [41, 53, 55, 57, 60, 65];
function arp(t0, t1, chord, step, g, up = 12) {
  const ns = chord.slice(1).map((m) => m + up), seq = ns.concat(ns.slice(1, -1).reverse());
  for (let i = 0, t = t0; t < t1; i++, t += step) piano(t, seq[i % seq.length], g * (0.85 + 0.3 * rnd()), (i % 2 ? 0.3 : -0.3));
}

// A · what changes 0-9: Dm pad, a sparse motif, a rising tone as the bar extends
pad(0.2, 9.0, Dm, 0.05, 700); sub(0.2, 9.4, 38, 0.06);
[[0.6, 69], [2.4, 65], [4.6, 74], [6.4, 72], [7.6, 69]].forEach(([t, m]) => piano(t, m, 0.13, 0.15));
whoosh(0.3, 0.9, 0.18); thud(1.95, 0.35, 70); rise(2.9, 1.9, 0.18);
pad(3.0, 2.0, [62, 69], 0.025, 2000);
fall(7.9, 1.6, 0.3); ping(9.35, 86, 0.05);

// B · Bhaluka 9-18: one low note on the question, then the answer; music drops out for the 1 s hold
piano(9.15, 50, 0.2, -0.1); piano(9.17, 38, 0.12);
pad(9.3, 6.4, Bb, 0.05, 650);
[[10.85, 65], [10.9, 69], [10.95, 74]].forEach(([t, m]) => piano(t, m, 0.11, 0.2));
click(11.35, 0.45); whoosh(11.65, 0.5, 0.15);
tick(12.25, 0.12, 900); ping(13.2, 81, 0.06, 0.3); ping(13.38, 84, 0.06, 0.3);
ping(14.3, 88, 0.07, 0.3); ping(14.3, 81, 0.05, 0.3);
// 15.9-17.2: near silence

// C · users 18-30: Dm Bb F C with an arpeggio; one click per panel
[[17.5, 3.4, Dm], [20.6, 3.1, Bb], [23.6, 3.1, F], [26.6, 3.4, C]].forEach(([t, d, ch]) => { pad(t, d, ch, 0.05, 900); sub(t, d + 0.5, ch[0], 0.05); });
arp(18.4, 20.6, Dm, 0.375, 0.07); arp(20.6, 23.6, Bb, 0.375, 0.07); arp(23.6, 26.6, F, 0.375, 0.075); arp(26.6, 29.9, C, 0.375, 0.08);
[19.0, 22.6, 26.7].forEach((t) => click(t, 0.4));
filtNoise(23.9, 0.25, 0.35, 5000, 1500, (p) => (1 - p) ** 2, 0, 0.15); // the newspaper lands

// D · scale 30-40: the music builds; a tick per country; it dips under Kurangani, then swells to the kilns
const build = (t) => Math.min(1, Math.max(0.35, (t - 30) / 10)) * (t > 33.1 && t < 35.2 ? 0.55 : 1);
[[30.0, 2.6, Dm], [32.5, 2.6, Bb], [35.0, 2.6, F], [37.5, 2.8, C]].forEach(([t, d, ch]) => { pad(t, d, ch, 0.06 * build(t + 1) + 0.02, 1400); sub(t, d + 0.5, ch[0], 0.07); });
for (let t = 30.6; t < 40.0; t += 0.1875) { const i = Math.round((t - 30.6) / 0.1875), ch = t < 32.5 ? Dm : t < 35 ? Bb : t < 37.5 ? F : C; const ns = ch.slice(1).map((m) => m + 12); piano(t, ns[i % ns.length], 0.055 * build(t), i % 2 ? 0.35 : -0.35); }
for (let t = 30.6; t < 40.0; t += 0.75) kick(t, 0.22 * build(t));
boom(30.6, 0.55); whoosh(30.5, 0.6, 0.2);
for (let k = 0; k < 8; k++) tick(30.7 + k * 0.28, 0.13, 1500 + k * 120, -0.5 + k * 0.14);
thud(33.1, 0.4, 55); ping(33.4, 57, 0.06, 0.2);
for (let i = 0; i < 5; i++) tick(33.6 + i * 0.12, 0.1, 2400);
whoosh(35.0, 2.0, 0.3);
for (let i = 0; i < 60; i++) tick(37.6 + (i / 60) * 1.8 + rnd() * 0.03, 0.04 + 0.04 * (i / 60), 2600 + rnd() * 900, rnd() * 1.2 - 0.6);
rise(37.4, 2.6, 0.16);

// E · effort 40-46: lifts, then thins
pad(40.0, 3.0, Bb, 0.08, 1800); pad(43.0, 2.4, C, 0.06, 1200); sub(40.0, 3.4, 34, 0.08); sub(43.0, 2.8, 36, 0.06);
arp(40.0, 43.0, Bb, 0.1875, 0.06, 24); arp(43.0, 44.6, C, 0.375, 0.05);
for (let i = 0; i < 26; i++) tick(40.2 + i * 0.054, 0.05, 1200 + rnd() * 1600, rnd() - 0.5); // guesswork flicker
whoosh(41.7, 0.6, 0.22); ping(42.1, 81, 0.06);
for (let i = 0; i < 7; i++) pop(43.0 + i * 0.12, 0.08, rnd() - 0.5);

// F · the ask 46-50: one low pad under the line
pad(46.2, 3.6, [38, 45, 50], 0.06, 500); sub(46.2, 4.0, 38, 0.07);
for (let i = 0; i < 12; i++) pop(47.0 + i * 0.08, 0.05, rnd() - 0.5);

// G · the ending 50-59: one held chord; a soft tick per year; 2012 settles instead of jumping
pad(50.3, 14.0, Bb9, 0.06, 800); sub(50.3, 14.5, 34, 0.06);
for (let y = 0; y < 24; y++) tick(50.6 + y * (6.0 / 23.8), 0.06, 1700, -0.3 + y * 0.025);
[[50.6, 74], [52.2, 77], [53.6, 81], [55.4, 72], [57.0, 74]].forEach(([t, m]) => piano(t, m, 0.1, 0.2));
ping(56.9, 50, 0.05);
fall(58.3, 2.2, 0.3);

// H · Bhaluka at dusk 59.5-64: wind only, the chord underneath
filtNoise(59.3, 5.8, 0.16, 380, 520, (p, x) => Math.min(1, x / 1.2) * Math.min(1, (1 - p) * 5.8 / 1.5) * (0.7 + 0.3 * Math.sin(x * 1.3)), -0.2, 0.2);
filtNoise(59.5, 5.6, 0.07, 900, 700, (p, x) => Math.min(1, x / 1.5) * Math.min(1, (1 - p) * 5.6 / 1.5) * (0.6 + 0.4 * Math.sin(x * 0.9 + 2)), 0.3, 0.3);

// I · title 64-70: the chord resolves, then silence
pad(64.3, 2.6, Fadd9, 0.06, 900); sub(64.3, 3.0, 41, 0.06);
[[64.3, 53], [64.32, 60], [64.34, 69], [66.3, 72]].forEach(([t, m]) => piano(t, m, 0.12, 0.1));

// J · the final beat: one soft tick, then cut
tick(72.0, 0.12, 1600); ping(72.0, 93, 0.03);

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

// ---- mix, soft-limit, hard cut at 73.9 s, write 16-bit stereo WAV
const out = Buffer.alloc(44 + N * 4);
out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8);
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24);
out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40);
const cut = Math.floor(73.9 * SR);
let peak = 0;
for (let n = 0; n < N; n++) {
  const g = n < cut ? 1 : 0;
  const l = Math.tanh((dry[0][n] + wet[0][n] * 0.35 + rl[n] * 2.2) * 2.4) * 0.9 * g;
  const r = Math.tanh((dry[1][n] + wet[1][n] * 0.35 + rr[n] * 2.2) * 2.4) * 0.9 * g;
  peak = Math.max(peak, Math.abs(l), Math.abs(r));
  out.writeInt16LE(Math.round(l * 32767), 44 + n * 4); out.writeInt16LE(Math.round(r * 32767), 46 + n * 4);
}
writeFileSync(new URL("../assets/score.wav", import.meta.url), out);
console.log("wrote assets/score.wav", (out.length / 1e6).toFixed(1), "MB, peak", peak.toFixed(2));
