# Kiln Watch — cross-act continuity brief

Read this before touching Act 2 or Act 4. It is the single source of truth for how the
four acts fit together visually and technically. The full narrative script is
`kiln-watch-pitch-v7.md` at the project root — treat its Time / Visual / Voice-over /
On-screen text / Sound columns as fixed for whichever act you're building. You may change
**visuals, motion, and sound design**. You may **not** change the script, on-screen text,
or the timestamps in the table (durations are locked to the pitch).

No act has recorded narration — none of Act 1, 3 or 4 has a voice track, only a music+SFX
score (`assets/score.wav`). The "Voice-over" column is a guide for pacing and on-screen
text, not audio to produce. Build the same way: visuals + music/SFX only.

## Layout

```
nasa video/
  kiln-watch-pitch-v7.md      the full script, all four acts
  act1 using brag/
    act1-master.mp4           FINISHED, locked. Do not touch.
    composition/               its HyperFrames source (reference only)
  act3/                        FINISHED reference implementation — the quality bar
    assets/earth.js            the real-NASA-imagery orbital Earth (read in full)
    assets/kit.js               shared draw helpers + Bangladesh lon/lat data
    assets/fonts/*.woff2        Instrument Serif + Instrument Sans
    assets/tex/*.jpg             NASA Blue Marble / Black Marble / VIIRS cloud textures (~9MB, already downloaded — copy, don't redownload)
    assets/geo4.js               real lon/lat geometry: land, South Asia, Bangladesh, fires, kilns, farms, pilots, country rings
    compositions/earth.html     the thin wrapper that drives assets/earth.js from the root timeline
    compositions/grade.html     letterbox + film grain + vignette + chapter titles, composited on data-track-index="5"
    tools/build-score.mjs       the synth score/SFX builder (instrument palette: piano/pad/sub/whoosh/tick/click/thud/boom/kick/ping/pop + reverb) — same sonic palette as act4/tools/build-score.mjs, which this was adapted from
    index.html                   root composition: tracks + :root color tokens + @font-face
  act4/                        OLD style (flat 2D cards, vector dot-globe) — gets restyled to match act3
```

Each act is an **independent HyperFrames project** (own `package.json`/`hyperframes.json`).
There is no shared asset folder — copy files between act dirs, don't reference `../act3/...`
paths from another act's composition (renders are self-contained).

## The shared visual system (copy from act3, don't reinvent)

- **Earth**: `assets/earth.js` is a single WebGL fragment shader that raymarches a lit sphere
  against real Blue Marble day / Black Marble night / VIIRS cloud textures, with an
  orthographic-style perspective camera driven entirely by act-time. Public API:
  - `EARTH.init(canvasEl, "assets/tex/")` → Promise, resolves once all 6 textures load. Await it via `window.__hf.buildReady["earth-textures"]` (see `compositions/earth.html`).
  - `EARTH.render(t)` — paints one frame at act-seconds `t`.
  - `EARTH.project(t, lon, lat, altRadii)` → `[screenX, screenY, visibility0to1, pxPerRadian]`. Use this to pin any 2D DOM/SVG element to a real lon/lat.
  - `EARTH.offsetLL(lon, lat, eastDeg, northDeg)` → `[lon, lat]` a bit of ground east/north — for drawing shapes (dials, boxes) on the surface.
  - `EARTH.state(t)` → `{ night, cloudG, cloudR, wipe, blur, expo, sunLon, sunLat }`.
  - Camera path lives in `SHOT_KEYS` (array of `[t, {lon,lat,dist,hd,el,roll,fov,sx,sy}, ease]`, fields persist from the previous key unless overridden) and `TRACKS` (scalar keyframe tracks: `sunLon/sunLat/night/cloudG/cloudR/wipe/blur/expo`). **Your act needs its own `SHOT_KEYS`/`TRACKS` sized to its own duration** — copy the file and rewrite these two tables; don't reuse act3's literal keyframes beyond the two anchor states below.
  - `night` track flips the globe to Black Marble city-lights; `wipe` is the longitude a cloud-clearing sweep has reached (used by act3's scene 2); `blur`/`expo` are camera-shake/exposure-cut helpers for match-cuts.
- **Typography** (`act3/index.html` `:root` + the shared classes right after `#root > div[data-composition-src]`): `--serif: "Instrument Serif"` for headlines (often `<i>` for the italic beat), `--sans: "Instrument Sans"` for labels, `--mono: "JetBrains Mono"` for numerals/timestamps. Classes `.kick` (small ember-colored eyebrow label), `.lab` (uppercase tracked label, `<b>` for ink-colored emphasis), `.serif` (headline), `.scrim`/`.scrim-l`/`.scrim-r` (edge darkening behind text over the live Earth), `.rule` (thin hairline). Color tokens: `--bg:#000 --ink:#f3eee4 --dim:rgba(243,238,228,.62) --faint:rgba(243,238,228,.32) --hair:rgba(243,238,228,.18) --modis:#f2b862 --viirs:#8fbaff --ember:#ff7a3d --alarm:#ff4a48`.
- **Grade**: `compositions/grade.html` is a thin always-on-top sub-composition (`data-track-index="5"`, full duration) that draws a seeded film-grain canvas, a soft vignette, animated letterbox bars that open at the start and close at the end, and small chapter labels. Copy it and retime the chapter list / letterbox in/out to your act's duration.
- **Score**: `tools/build-score.mjs` is a pure-synth instrument palette (no samples) with a freeverb-style reverb bus, written as a flat cue list keyed to act-seconds. Copy the instrument functions and reverb/mix boilerplate verbatim; write a new cue list for your act's Sound column. Run `node tools/build-score.mjs` to produce `assets/score.wav`.

## HyperFrames mechanics (don't relearn these the hard way)

- One `gsap.timeline({ paused:true })` per composition, registered on `window.__timelines["<composition-id>"]`.
- `K.drive(tl, dur, paint)` (from kit.js) is the standard pattern for "call this paint(t) function every frame" — GSAP skips `onUpdate` on a seek, a tweened setter doesn't.
- Every timed element needs `data-start`+duration and `class="clip"`; sub-compositions are wired via `data-composition-src` on a host div with matching `data-composition-id`.
- Run `npx hyperframes check` after every meaningful edit; fix lint errors before moving on. `npx hyperframes snapshot --at <t1,t2,...> --no-end -o snapshots/_x` is the fast way to eyeball frames (produces a contact sheet you can read as an image). A helper `tools/snap.sh <name> <t1,t2,...>` already exists in act3 (copy it) — it calls the cached CLI via `node` directly, which avoids Git-Bash mangling comma-separated `--at` lists.
- **FFmpeg is installed but not on PATH in this shell.** Before any `render` (and before any `check`/`snapshot` that touches video assets), export:
  ```bash
  FFDIR="/c/Users/User/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin"
  export HYPERFRAMES_FFMPEG_PATH="$FFDIR/ffmpeg.exe" HYPERFRAMES_FFPROBE_PATH="$FFDIR/ffprobe.exe" PATH="$FFDIR:$PATH"
  ```
- CLI is pinned at `hyperframes@0.8.143`, cached under `~/AppData/Local/npm-cache/_npx/*/node_modules/hyperframes`. Invoke it as `node "$HF/bin/hyperframes.mjs" <command>` (resolve `$HF` with `ls -d ~/AppData/Local/npm-cache/_npx/*/node_modules/hyperframes | head -1`) rather than `npx hyperframes@0.8.143 ...`, which redownloads.
- Render at delivery quality to `renders/<act>-final.mp4`: `node "$HF/bin/hyperframes.mjs" render -q delivery -o renders/<act>-final.mp4`.

## Continuity anchors — the two hard constraints

**1. Act 1 → Act 2 handoff (t=46s global).** Act 1 (`act1 using brag/composition/index.html`,
finished, don't touch) is a Three.js globe textured with real Blue Marble imagery
(`assets/img/bluemarble_4096.jpg`) — so Act 2 continuing in a real-NASA-imagery Earth
(via `earth.js`) is a continuation of the same idea, not a style jump. Act 1's last 5
seconds (41–46s) show the globe with "Is this season worse than normal?" typing itself
over continents, a raw chart answering YES in red, then an UNRELIABLE stamp landing with
a thud and a camera-shake; by 45.0–45.3s the question panel slides off-frame to the right
and fades, leaving the bare globe for the last ~0.7s before the cut (no fade to black is
scripted — it's a hard cut at 46s). Open Act 2 on that same idea: a dark globe, fire
history, picking up the thread — you don't need to pixel-match Act 1's camera angle, just
continue tonally (dark, real imagery, restrained) and let Act 2 build its own path from there.

**2. Act 2 → Act 3 handoff (t=1:27 global / Act 3 t=0).** This is the one that must land
precisely: the pitch describes Act 2 ending with "the camera pushes along the line toward
2012, where a faint red mark glows" (1:16–1:27), and Act 3 opens at its t=0 with the five
regional fire-count traces hanging in space over a dawn horizon, camera already in position.
**Act 3's exact opening camera/state** (from `act3/assets/earth.js` `SHOT_KEYS[0]` /
`TRACKS` at t=0):
```
lon: 104   lat: 18   dist: 0.62   hd: 84   el: 9   roll: -2   fov: 38   sx: 0   sy: -0.34
sunLon: -150   sunLat: 6   night: 0   cloudG: 0.9   cloudR: 0.9   wipe: -999   blur: 0   expo: 1
```
(A low, near-horizontal camera looking east along a sunlit dawn limb, data hovering above
it, slight downward lens shift `sy:-0.34` so the horizon sits low in frame.) **Act 2's
final camera key must converge on this same state by its last frame**, and its last visual
beat (the title card "HARMONIZATION OF MODIS AND VIIRS HOT SPOTS" welding the two records,
pushing toward a glowing 2012 mark) should read as the shot immediately before Act 3's
scene 1 takes over — a true match cut, not just a thematic echo. Pull the actual
`SHOT_KEYS`/`TRACKS` arrays from `act3/assets/earth.js` to confirm before you lock your
last keyframe.

**3. Act 3 → Act 4 handoff (t=2:44 global / Act 3 t=77s).** Act 3's last camera key
(`SHOT_KEYS` final entry) is:
```
lon: 444 (≡ 84° after mod 360)   lat: 24   dist: 2.2   el: 90   hd: 0   roll: 0   fov: 38   sx: 0   sy: 0
```
— a wide, straight-down view centered near South Asia (84°E, 24°N), pulled back to 2.2
Earth radii, letterbox closing over it as Act 3 ends (see `compositions/grade.html`'s
closing bars at 76.2–77s). Act 4 should open from approximately this same wide top-down
framing before moving into its own camera path — the letterbox opens again into a
continuation of the same shot, not a hard reset.

## Known numbers that must match across acts (don't invent new ones)

- **The quiz years, introduced in Act 2 and paid off in Act 3**: two raw (uncorrected)
  Bangladesh fire-year totals, **2010 at 22.7** and **2016 at 46.3** — 2016 looks roughly
  2× bigger raw. Act 3's payoff (`act3/compositions/s3-proof.html`, the "C" panel) corrects
  2016 down to **13.2**, i.e. 2016 actually burned *less* than 2010 once harmonized — "the
  bigger-looking year burned less." **Act 2's quiz must use these same two years and these
  same two raw numbers** (2010 / 22.7 vs 2016 / 46.3) so Act 3's reveal is a true callback,
  not a new pair of years.
- Bhaluka, Mymensingh (Angargara beat, Uthura range): fire 20 Mar 2025 ~11pm, then 24 Mar
  ~4pm and 5:30pm; ~3 acres; no water, staff beat flames with branches; fire service
  controlled it ~9:15pm; no one hurt (Prothom Alo, 25 Mar 2025). VIIRS detected fire there
  24–25 Mar 2025; 25 Mar flagged unusual (20 Mar night fire not in the satellite record).
- Tangail: kiln season overlaps the Boro rice band; "Tangail farmers protest over kiln
  emissions damaging Boro paddies" (The Daily Star, 2026).
- Kurangani, India: 11 March 2018, 23 trekkers died; Tamil Nadu now bans treks 15 Feb–15 Apr.
- MODIS end-of-mission: final shutdowns planned late 2026 – early 2027 (NASA).
- Landscape-fire smoke: ~1.5 million deaths/year (Lancet, 2024).
- Bangladesh brick kilns: 3,653 (Bangladesh-only count used in Act 3) / ~138,000 across
  South Asia (Act 4's scale claim) — these are different numbers for different scopes, both correct, don't conflate them.

## Checklist before calling either act done

- [ ] `npx hyperframes check` — 0 errors
- [ ] Snapshot every scene boundary + a few mid-beats, actually look at them
- [ ] Script/on-screen text/timestamps unchanged from `kiln-watch-pitch-v7.md`
- [ ] Opening and closing camera states match the anchors above
- [ ] Rendered to `renders/<act>-final.mp4` at delivery quality, 1920x1080/30fps, with audio
