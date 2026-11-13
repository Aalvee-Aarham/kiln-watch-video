// Synthesizes the live demo's score + SFX into assets/score.wav (48 kHz stereo). Times are demo seconds.
// Retime cues here, then: node tools/build-score.mjs
import { writeFileSync } from "node:fs";

const SR = 48000, LEN = 45, N = SR * LEN, TAU = 2 * Math.PI;
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

// Live demo, 45 s: a light arpeggio bed (same key as Acts 3 and 4) under the narration,
// a whoosh into each chapter, one click per on-screen click. Times follow the cuts in index.html.
const CLICKS = [4.8, 11.21, 13.1, 17.28, 19.44, 20.72, 29.16];
whoosh(0.0, 1.2, 0.2); rise(0.1, 1.4, 0.07);                        // the site floats in
[[0.4, 15.8, Dm], [16.2, 12.4, Bb], [28.6, 7.8, F], [36.4, 8.0, C]].forEach(([t, d, ch]) => { pad(t, d, ch, 0.035, 900); sub(t, d + 0.4, ch[0], 0.035); });
arp(1.0, 16.0, Dm, 0.375, 0.032); arp(16.4, 28.4, Bb, 0.375, 0.03); arp(28.8, 36.2, F, 0.375, 0.032); arp(36.6, 43.8, C, 0.375, 0.03);
[16.0, 22.2, 28.4, 36.2].forEach((t) => { whoosh(t, 0.6, 0.18); }); // chapter changes
CLICKS.forEach((t) => { click(t, 0.4); ping(t + 0.02, 81, 0.025, 0.2); });
for (let i = 0; i < 26; i++) click(30.0 + i * 0.052 + rnd() * 0.015, 0.1 + rnd() * 0.05); // the question typed
ping(31.38, 74, 0.04, 0.1); ping(31.4, 81, 0.03, 0.1);              // sent
pad(43.8, 1.2, Dm, 0.04, 900); rise(43.6, 1.4, 0.12);               // lift back into Act 4's globe

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
