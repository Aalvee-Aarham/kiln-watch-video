# Hyperframes Composition Brief: Kiln Watch · Act 1

## Objective
Create the 46-second intro (Act 1, WHO) of Team Off The Binary's NASA Space Apps pitch, following `pitch-v7.md` 0:00–0:46 and `brag-plan.md`.

## Output
- Composition directory: `composition/`
- Rendered video: `brag.mp4` (plus `act1-master.mp4` without the poster frame, for editing)
- Format: landscape, 1920x1080, 30 fps
- Duration: 46 s (set by the pitch script)

## Source material
- Script: `E:\nasa\pitch-v7.md` (Act 1 rows)
- Product: Kiln Watch, aalvee-aarham.github.io/kiln-watch (screens: Explorer, Sensors), `harmonization.json` raw season totals
- Data: NASA GIBS MODIS and VIIRS fire detections (2003–2012, 2025); NASA FIRMS Bangladesh detections (12 Apr 2013); CAMS PM2.5 for Dhaka; CelesTrak TLEs
- Imagery: NASA Blue Marble Next Generation (Dec 2004 topo-bathy); Sentinel-2 cloudless 2016 (EOX, CC BY 4.0)
- Footage (Pexels License): Modhutila Eco Park sal forest (Progga Media, Oct 2025); Bangladesh forest canopy (Emrul Kausar Emon, Jan 2025); Gazipur brick kiln (Emrul Kausar Emon, May 2025); charred forest floor (Engin Akyurt, Jul 2025)
- News: Prothom Alo, 25 Mar 2025 (headline and standfirst quoted verbatim in Bengali)
- Copy that must appear verbatim: "2012: FIRES EXPLODE?", "Was anyone watching?", "Team Off The Binary", "Is this season worse than normal?", "UNRELIABLE", the date cards, and the six full names

## Creative direction
- Tone: cinematic with polished restraint; muted documentary
- Hook: a calm photographic Earth with real fires blooming
- Outro: the globe unwraps into a flat world fire map; the music doesn't resolve
- Avoid: high contrast, pure black or white, saturated red, neon glow, gradient text, abstract filler, generic globes, captions or subtitles

## Visual identity
- Background #161d24 / #10161c; text #e6e0d4 / #a9b0b6; accent ember #d9895b; fire amber #e8b77a → ash #8a8580; alarm brick #c0614f; cool steel #8fa6b8; sage #9fb59a
- Fonts: Anek Bangla (Latin and Bengali, local), IBM Plex Mono (local)
- Footage grade: lifted blacks, saturation around 0.8, contrast around 0.92, slate-tinted shadows; dusk for the canopy shot

## Storyboard
See `brag-plan.md` (10 scenes, 46 s).

## Audio
- Role: cinematic support with intentional silences
- Music: custom score `assets/audio/score.wav` (synthesized to the script's Sound column, with brag's bundled Kenney SFX mixed in)
- Treatment: no fade-out; tick… tick… into Act 2
- Exact SFX choice: already placed in the score to match the implemented motion

## Hyperframes instructions
- One standalone `index.html`, one paused GSAP timeline registered on `window.__timelines["main"]`, root `data-duration="46"`
- Three.js globe rendered from timeline time (no wall clock); textures and data loaded before render through `window.__hf.buildReady`
- Footage as framework-owned `<video>` clips (muted), pre-trimmed; grading by CSS filter on non-timed wrappers
- Gate: `npx hyperframes check`, then render at delivery quality
