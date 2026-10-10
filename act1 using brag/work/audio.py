# Score + SFX for Act 1 (0:00-0:46), timed to pitch-v7's Sound column. Leaves headroom for the team's VO.
# python audio.py -> work/audio.wav (48 kHz stereo)
import numpy as np, os
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR, DUR = 48000, 46.0
N = int(SR * DUR)
L, R = np.zeros(N), np.zeros(N)
rng = np.random.default_rng(7)
HERE = os.path.dirname(os.path.abspath(__file__))
BEAT = 0.625                       # 96 bpm; montage cuts land on beats (37.2, 38.45, 39.7)
GRID0 = 37.2


def tt(d): return np.arange(int(d * SR)) / SR
def db(x): return 10 ** (x / 20)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def hz(note): return 440 * 2 ** ((note - 69) / 12)   # MIDI -> Hz


def add(sig, t0, gain=1.0, pan=0.0, stereo=None):
    i0 = int(round(t0 * SR))
    if i0 >= N: return
    if stereo is None: sl, sr_ = sig, sig
    else: sl, sr_ = stereo
    n = min(len(sl), N - i0)
    gl, gr = gain * np.sqrt((1 - pan) / 2), gain * np.sqrt((1 + pan) / 2)
    L[i0:i0 + n] += gl * sl[:n]; R[i0:i0 + n] += gr * sr_[:n]


def fades(sig, a=0.005, r=0.02):
    n = len(sig); e = np.ones(n)
    ia, ir = min(n, int(a * SR)), min(n, int(r * SR))
    if ia: e[:ia] = np.linspace(0, 1, ia)
    if ir: e[-ir:] *= np.linspace(1, 0, ir)
    return sig * e


def sample(name):
    sr, x = wavfile.read(os.path.join(HERE, 'sfx', name))
    x = x.astype(float); x /= (np.abs(x).max() + 1e-9)
    return x


def pad(notes, dur, att=1.2, rel=1.5, bright=900):
    t = tt(dur); s = np.zeros_like(t)
    for n in notes:
        for det in (-0.07, 0.0, 0.06):         # slight detune chorus
            f = hz(n + det)
            s += np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) + .35 * np.sin(4 * np.pi * f * t) + .12 * np.sin(6 * np.pi * f * t)
    s = lp(s, bright)
    e = np.minimum(1, t / att) * np.minimum(1, (dur - t) / rel).clip(0)
    return s * e / (len(notes) * 3)


def pluck(note, dur=.5, bright=2400):
    t = tt(dur); f = hz(note)
    s = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.4 * np.exp(-t * (6 + 3 * k)) for k in range(1, 7))
    return lp(fades(s, .002, .05), bright)


def kick(d=.28, f0=95, f1=42):
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t * 28)
    return fades(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11), .001, .03)


def noise(d): return rng.standard_normal(int(d * SR))


def hat(d=.06): return fades(hp(noise(d), 7000) * np.exp(-tt(d) * 70), .001, .01)


def snare(d=.22): return fades(bp(noise(d), 900, 5000) * np.exp(-tt(d) * 22) + .4 * np.sin(2 * np.pi * 190 * tt(d)) * np.exp(-tt(d) * 30), .001, .02)


def tick(f=1900, d=.05): t = tt(d); return fades(np.sin(2 * np.pi * f * t) * np.exp(-t * 90) + .15 * bp(noise(d), 2000, 6000) * np.exp(-t * 120), .001, .01)


def whoosh(d, f0, f1, curve=2.0):
    # band sweep: log-spaced bandpassed noise, each band faded in as the sweep passes it (no per-chunk filter resets)
    x = noise(d); p = np.linspace(0, 1, len(x)) ** curve; fc = f0 * (f1 / f0) ** p; out = np.zeros_like(x)
    for f in np.geomspace(f0, f1, 9):
        w = np.exp(-(np.log(fc / f) / .35) ** 2)
        out += bp(x, f * .75, min(f * 1.33, 20000)) * w
    return lp(out * np.sin(np.pi * np.linspace(0, 1, len(x)) ** 1.6), 9000)


def piano(note, d=5.0):
    t = tt(d); f = hz(note); B = 0.0004; s = np.zeros_like(t)
    for k in range(1, 14):
        fk = f * k * np.sqrt(1 + B * k * k)
        s += np.sin(2 * np.pi * fk * t + rng.uniform(0, 1)) / k ** 1.15 * np.exp(-t * (0.7 + 0.45 * k))
    s += .25 * lp(noise(d), 1800) * np.exp(-t * 60)   # hammer
    return fades(lp(s, 3500), .003, .4)


# ---------- 0:00-0:10  low hum, one soft tick per year; 2012 alarm sting + bass hit ----------
t = tt(10.0)
hum = (np.sin(2 * np.pi * 36.7 * t) * .9 + np.sin(2 * np.pi * 73.4 * t) * .55 + np.sin(2 * np.pi * 110 * t) * .18)
hum *= (0.75 + .25 * np.sin(2 * np.pi * .23 * t)) * np.minimum(1, t / 1.2)
air = lp(noise(10), 500) * .35
tension = np.where(t > 5, 1, 0) * (np.sin(2 * np.pi * 77.8 * t) * .35 + np.sin(2 * np.pi * 155.6 * t) * .12) * np.minimum(1, (t - 5).clip(0) / 1.5)
bed = (hum + air + tension) * (1 + .5 * ((t - 5).clip(0) / 5))
add(fades(bed, .01, .012), 0, db(-24))
for k in range(9): add(tick(1700 + 40 * k), k * 5 / 9 + .02, db(-26), pan=-.25 + .06 * k)
add(whoosh(.6, 400, 6000, 1.2)[::-1], 4.4, db(-28))                        # reverse swell into 2012
bh = tt(1.6); bass_hit = np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-bh * 9)) / SR) * np.exp(-bh * 2.6)
add(fades(bass_hit + .3 * lp(noise(1.6), 300) * np.exp(-bh * 8), .001, .2), 5.0, db(-9))
for i, (f, d0) in enumerate([(880, 0), (698, .17), (880, .34), (698, .51)]):  # alarm sting
    a = tt(.16); tone = np.sign(np.sin(2 * np.pi * f * a)) * .5 + np.sin(2 * np.pi * f * a)
    add(fades(lp(tone, 2600) * np.exp(-a * 6), .004, .03), 5.0 + d0, db(-25 - 3 * i), pan=(-.3, .3)[i % 2])
# hard cut to total silence at 0:10 (fades() keeps it click-free)

# ---------- 0:13-0:20.3  pixel clicks; quiet pulse bed that stops dead as the pin lands ----------
add(pad([62, 65, 69], 7.35, att=1.5, rel=.05, bright=700), 13.0, db(-22))
for i, b in enumerate(np.arange(13.2, 19.95, BEAT / 2)):
    add(pluck([62, 69, 65, 72, 62, 69, 67, 74][i % 8], .35), b, db(-31), pan=(-.35, .35)[i % 2])
add(sample('impactSoft_medium_001.wav'), 13.88, db(-18))
add(sample('click_003.wav'), 13.9, db(-20))
for i in range(9): add(sample(('click_002.wav', 'click_005.wav')[i % 2]), 14.9 + .19 * i, db(-20 + i * .3), pan=-.4 + .1 * i)   # 9 real VIIRS pixels
add(whoosh(2.25, 250, 5000, 1.5), 18.0, db(-17))
add(kick(.5, 70, 38), 20.33, db(-14)); add(sample('impactSoft_medium_003.wav'), 20.33, db(-17))

# ---------- 0:21-0:29  only soft wind and crackle ----------
d = 8.25; t = tt(d)
gust = .55 + .3 * np.sin(2 * np.pi * .17 * t) + .15 * np.sin(2 * np.pi * .41 * t + 1)
wl, wr = (lp(np.cumsum(noise(d)) * .02, 650) for _ in range(2))
wl, wr = hp(wl, 60) * gust, hp(wr, 60) * gust
env = np.minimum(1, t / .45) * np.minimum(1, (d - t) / .4).clip(0)
add(None, 21.0, db(-17), stereo=(wl * env / np.abs(wl).max(), wr * env / np.abs(wr).max()))
cr = np.zeros(int(d * SR))
for _ in range(330):
    s = rng.uniform(0, d - .05); rate = 1.0 if s < 4 else .45      # smoulder in the first shot, quieter on the ash
    if rng.random() > rate: continue
    b = bp(noise(.012), 1500, 7000) * np.exp(-tt(.012) * rng.uniform(250, 600)) * rng.uniform(.2, 1) ** 2
    i = int(s * SR); cr[i:i + len(b)] += b
add(fades(cr * env, .01, .05), 21.0, db(-21), pan=.1)

def squeak(d):                                                           # dry-erase marker stroke
    t = tt(d); f = 2300 + 500 * np.sin(2 * np.pi * rng.uniform(5, 9) * t)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * .25 + bp(noise(d), 1800, 5200)
    return fades(s * (.6 + .4 * np.sin(2 * np.pi * 13 * t) ** 2), .01, .03)


add(whoosh(.45, 900, 6000, 1.0), 21.55, db(-31), pan=.3)                # clipping slides in
add(squeak(.45) * .5, 22.0, db(-32))                                      # highlighter

# ---------- 0:30  one low piano note; a quiet pulse begins ----------
add(piano(38, 6.0) + .6 * piano(50, 6.0), 30.0, db(-19))
for b in np.arange(GRID0 - 10 * BEAT, GRID0, BEAT):                  # 30.95 ... 36.575
    add(kick(.3, 70, 40), b, db(-27 + 7 * (b - 30.9) / 6.3))

# ---------- 0:33-0:41  a tick per card, whoosh into the grid, then the beat picks up ----------
CH = {'Dm': [50, 53, 57, 62], 'Bb': [46, 53, 58, 62], 'F': [53, 57, 60, 65], 'C': [48, 55, 60, 64]}
for start, ch, dur in [(33.0, 'Dm', 1.7), (34.7, 'Bb', 2.5), (37.2, 'F', 2.5), (39.7, 'C', 1.35)]:
    add(pad(CH[ch], dur + .4, att=.6 if start > 33 else 2.0, rel=.35, bright=1100), start, db(-22))
for i in range(6): add(sample('click2.wav'), 33.3 + .3 * i + .05, db(-19), pan=(-.45, -.3, -.15)[i % 3])
add(whoosh(.7, 600, 7000, 1.0), 34.6, db(-27), pan=.4)            # air-quality panel slides in
for k, b in enumerate(np.arange(GRID0, 41.0, BEAT / 2)):            # montage groove
    if k % 2 == 0: add(kick(), b, db(-16))
    if k % 4 == 2: add(snare(), b, db(-24))
    add(hat(), b + (BEAT / 4 if k % 2 else 0), db(-31), pan=.25)
    root = {37.2: 41, 39.7: 36}[37.2 if b < 39.7 else 39.7]
    add(pluck(root + (12 if k % 2 else 0), .3, 900), b, db(-19))
keys = sorted(rng.uniform(37.25, 38.4, 15))
for i, kt in enumerate(keys): add(sample(f'key{i % 12 + 1:02d}.wav'), kt, db(-17 + rng.uniform(-3, 2)), pan=rng.uniform(-.3, .3))
add(sample('click2.wav'), 39.2, db(-15)); add(sample('impactSoft_medium_001.wav'), 39.2, db(-22))


for a, b in [(39.76, 39.95), (39.98, 40.12), (40.14, 40.29), (40.29, 40.44), (40.43, 40.69), (40.69, 40.87), (40.73, 40.94)]:
    add(squeak(b - a), a, db(-27), pan=-.15)

# ---------- 0:41-0:46  question typed, the raw chart says YES, UNRELIABLE stamp ----------
add(pad([38, 50, 53, 57], 6.0, att=.5, rel=.6, bright=650), 41.0, db(-20))
add(whoosh(.8, 300, 3500, 1.3), 45.25, db(-25))                          # globe unwraps
for kt in (45.2, 45.7): add(tick(1350, .06), kt, db(-21)); add(tick(1000, .05), kt + .25, db(-25))
add(pad([39], 3.0, att=1.2, rel=.6, bright=500), 43.0, db(-26))      # dissonant Eb creeps in under the stamp
for i, kt in enumerate(np.linspace(41.22, 42.18, 17)): add(sample(f'key{(i * 5) % 12 + 1:02d}.wav'), kt + rng.uniform(-.015, .015), db(-20), pan=rng.uniform(-.2, .2))
for i in range(5): add(tick(1200 + 90 * i, .07), 41.7 + .17 * i, db(-27), pan=-.5 + .25 * i)
add(whoosh(.55, 500, 4000, 1.0), 42.8, db(-25), pan=.4)
yes = tt(.5); add(fades((np.sin(2 * np.pi * 220 * yes) + .5 * np.sin(2 * np.pi * 233 * yes)) * np.exp(-yes * 7), .003, .05), 43.68, db(-21))
add(sample('impactPunch_heavy_000.wav'), 44.56, db(-11)); add(sample('impactSoft_heavy_002.wav'), 44.57, db(-14))
add(kick(.8, 80, 34), 44.56, db(-10))

# ---------- master: gentle glue, true silences, -1 dBFS ceiling ----------
for a, b in [(10.0, 13.0), (29.3, 30.0)]:
    L[int(a * SR):int(b * SR)] = 0; R[int(a * SR):int(b * SR)] = 0
mix = np.stack([L, R], 1)
peak = np.abs(mix).max(); mix = mix / peak * db(-1)
mix = np.tanh(mix * 1.15) / np.tanh(1.15) * db(-1)
assert np.abs(mix).max() <= 1.0 and not np.isnan(mix).any()
for a, b in [(10.05, 12.95), (29.35, 29.95)]: assert np.abs(mix[int(a * SR):int(b * SR)]).max() == 0, 'silence beats must be silent'
wavfile.write(os.path.join(HERE, '..', 'composition', 'assets', 'audio', 'score.wav'), SR, (mix * 32767).astype(np.int16))
rms = lambda a, b: 20 * np.log10(np.sqrt((mix[int(a * SR):int(b * SR)] ** 2).mean()) + 1e-9)
print('wrote audio.wav; RMS dBFS by act:', {f'{a}-{b}': round(rms(a, b), 1) for a, b in [(0, 5), (5, 10), (13, 18), (21, 29), (30, 33), (33, 37.2), (37.2, 41), (41, 46)]})
