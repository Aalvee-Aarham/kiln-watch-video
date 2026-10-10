# Kiln Watch — pitch video source

Full source for the *Kiln Watch* pitch video (NASA Space Apps). Rendered MP4s are **not** in the repo — render them yourself (below).

## Layout

| Path | What |
|---|---|
| `kiln-watch-pitch-v7.md` | The script — all four acts, with Time / Visual / Voice-over / On-screen text / Sound columns |
| `CONTINUITY.md` | How the acts fit together visually and technically. **Read this first** (and point your AI agent at it) |
| `act1 using brag/composition/` | Act 1 HyperFrames project (`brag-plan.md`, `composition-brief.md` describe it) |
| `act2/`, `act3/`, `act4/` | Acts 2–4, each an independent HyperFrames project |
| `*/assets/score.wav` | Synth music+SFX per act, built by `tools/build-score.mjs` |
| `merge.sh` | Concats the four act renders into `kiln-watch-full.mp4` (stream copy, no re-encode) |
| `hyperframes/` | Git submodule — the HyperFrames framework at the exact commit used |

## Render the exact same video

Requirements: Node 18+, ffmpeg, Chrome (HyperFrames installs a headless one if needed).

```bash
git clone --recursive https://github.com/Aalvee-Aarham/kiln-watch-video.git
cd kiln-watch-video

# render each act (CLI version is pinned in each package.json)
(cd "act1 using brag/composition" && npx --yes hyperframes@0.8.143 render -o renders/act1-final.mp4)
(cd act2 && npm run render -- -o renders/act2-final.mp4)
(cd act3 && npm run render -- -o renders/act3-final.mp4)
(cd act4 && npm run render -- -o renders/act4-final.mp4)

# stitch — edit the FFDIR line in merge.sh to your ffmpeg location first
bash merge.sh
```

Preview / edit live: `npm run dev` inside an act folder. Lint after edits: `npm run check`.

**⚠️ Rendering takes a long time, so watch the preview first.** Open the preview link in Chrome, watch the whole video, check every change, and render only once you approve them all. AI agents follow this rule automatically (see `AGENTS.md`).

## Editing (adding footage, swapping a scene)

Each scene is a sub-composition in `<act>/compositions/*.html`, wired into `<act>/index.html` with `data-start` / duration attributes. To drop footage into a scene, put the file in `<act>/assets/` and add a `<video class="clip" data-start=… >` element; to replace an animated scene, swap its host div for the video. The script timestamps in `kiln-watch-pitch-v7.md` are locked — keep durations the same so the acts still line up.

Easiest path: open the repo in Claude Code (each act has `CLAUDE.md` / `AGENTS.md`) and ask for the change.

## Notes

- Narration audio for `kiln-watch-full-narrated.mp4` is not in this repo — the act renders are music + SFX only.
- `merge.sh` has a hard-coded Windows ffmpeg path; change `FFDIR` (or just use `ffmpeg` on PATH).
