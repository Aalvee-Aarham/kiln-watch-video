# Pitch v8

v7 had one big gap against the Space Apps "240 Seconds of Glory" model: no real demo. The WHAT section needs the prototype shown working. v8 adds a **45 s screen recording of the live site** with its own voice-over, and the whole video now has a narrator (Kokoro TTS, voice `am_michael`). Everything else keeps v7's visuals.

## What changed from v7

| # | Where | Change |
|---|---|---|
| 1 | New, 2:05–2:50 | **Live demo, 45 s**, recorded from the real site: (1) the early-warning map layer next to today's fires; (2) alerts; (3) news vs. the satellite record; (4) the AI analyst; (5) MCP for any agentic AI. Its own project: `demo/`. |
| 2 | Act 3 | Cut both extensions (crops 9 s, kilns 11 s) and the animated chat demo (19 s). The real demo replaces them. Act 3 is 38 s (was 77 s). |
| 3 | Act 4 | Cut the "12 months of guesswork → the weeks that matter" strip (5 s). Act 4 is 69 s (was 74 s). |
| 4 | All acts | Narration added to every act as a `voiceover` track. The music dips under the voice only in the frequencies the voice uses (a "voiceover carve"). |
| 5 | Act 1, 0:41 | The line now matches the question typed on screen: "Is this season worse than normal? No one can honestly say." |

**Length:** 46 + 41 + 38 + 45 + 69 = **239 s (3:59)**. To stay under 240 s, nothing can be added without cutting something else.

## Structure against the model

| Model part | v8 | Time |
|---|---|---|
| WHO, 45 s | Act 1 | 0:00–0:46 |
| WHY, 60 s | Act 2 | 0:46–1:27 |
| WHAT, 60 s | Act 3 (clue, fix, proof) + **the live demo** | 1:27–2:50 |
| SO WHAT NEXT, 75 s | Act 4 (users, scale, the ask, ending) | 2:50–3:59 |

## The live demo, 2:05–2:50

A plain screen recording of the live site: no camera zoom. Orange boxes mark the exact section being talked about; their positions were measured from the page while recording. A short float-in starts the demo and a float-out hands over to Act 4. The narration runs at about 1.1–1.25× so all five features fit in 45 s.

| Time (demo s) | Feature | On screen | Voice-over |
|---|---|---|---|
| 0–16.2 | 01 Early warning map | Explorer, flat map on NASA Blue Marble. It starts with only today's fires (red dots, as on NASA FIRMS). The "Worldwide fire-season outlook" layer is switched on (boxed), and the yellow early-warning dots appear with their legend (boxed). Then the fire layers are switched off (boxed), leaving only the warnings. | "This is Kiln Watch, live. Like NASA FIRMS, the red dots are today's fires." · "Now our extra layer: early warnings. The yellow dots show where a fire season is coming in the next thirty days." · "Turn the layers on and off to compare fires and warnings." |
| 16.2–22.4 | 02 Alerts | The early-warning banner → the Early warning page → Aweil West, South Sudan (Elevated) → **Create alert** → "Alert created" (boxed) | "Pick a place, and one click sets an alert." |
| 22.4–28.6 | 03 News vs. satellites | The News and events page: live fire news worldwide (Google News in 7 languages, GDACS, NASA EONET) | "We also read fire news in seven languages, and check every report against the satellite record." |
| 28.6–36.4 | 04 AI analyst | Aweil West → Analyst → "Is this fire season worse than normal?" → the real answer: **2,156 hotspots, higher than 24 of the previous 26 Novembers** (boxed) | "And the question nobody could answer? Our AI analyst says yes: higher than twenty-four of the last twenty-six Novembers." |
| 36.4–45 | 05 MCP · any agentic AI | The MCP page, opened directly: the title, 31 tools, the endpoint, then "1. Connect". The AI characters are not shown. | "Scientists and fire managers can connect it to Claude, or any agentic AI, through our MCP server and open API." |

**Facts behind the demo (from the site on 12–13 Nov 2026):** today's fires are NASA FIRMS detections rendered by NASA GIBS. The early-warning dots are Kiln Watch's 30-day outlook (yellow: fire season ahead; orange: above normal; red: watch). Aweil West's November 2026 so far is higher than 24 of the previous 26 Novembers (Elevated). The News page reads Google News in 7 languages, plus GDACS and NASA EONET. The MCP page lists 31 tools.

## Full voice-over

| Global | Act time | Line |
|---|---|---|
| **Act 1 · WHO** | | |
| 0:00.3 | 0.3 | For twenty years, NASA satellites have watched the fires on Earth. |
| 0:05.2 | 5.2 | Then, in 2012, the world's fires seemed to multiply. Overnight. |
| 0:10.4 | 10.4 | Except... nothing new was burning. |
| 0:13.2 | 13.2 | A sharper camera, VIIRS, had joined MODIS. The fire record broke. |
| 0:18.1 | 18.1 | A broken record isn't just a data problem. |
| 0:21.4 | 21.4 | Bhaluka forest, Mymensingh. Fire. |
| 0:24.4 | 24.4 | Four days later, fire again. |
| 0:26.7 | 26.7 | No water. They fought it with branches. |
| 0:30.4 | 30.4 | Was anyone watching? |
| 0:33.1 | 33.1 | We're Team Off The Binary, from Bangladesh. Each winter, we breathe this smoke. |
| 0:38.4 | 38.4 | So we stopped guessing, and started measuring. |
| 0:41.2 | 41.2 | Is this season worse than normal? No one can honestly say. |
| **Act 2 · WHY** | | |
| 0:46.3 | 0.3 | Quick test. Two years of fire. Which burned more? |
| 0:52.6 | 6.6 | Hold that answer. We'll come back to it. |
| 0:56.2 | 10.2 | Bhaluka. Tangail. Kurangani. Algeria. Siberia. Canada. Fire seasons nobody saw coming. |
| 1:03.3 | 17.3 | Landscape fire smoke is linked to about one and a half million deaths a year. |
| 1:09.0 | 23.0 | And MODIS is shutting down right now. Without a bridge, twenty years of fire history end here. |
| 1:17.6 | 31.6 | NASA's challenge: Harmonization of MODIS and VIIRS Hot Spots. |
| 1:22.3 | 36.3 | So we built the bridge. |
| **Act 3 · WHAT** | | |
| 1:27.4 | 0.4 | First, the clue. In early 2012, fire counts jumped everywhere at once. |
| 1:33.5 | 6.5 | Fires don't do that. Cameras do. |
| 1:37.4 | 10.4 | So we built an exchange rate, from every day both cameras saw the same place. |
| 1:42.0 | 15.0 | In Bangladesh, three VIIRS fires equal about one MODIS fire. |
| 1:46.6 | 19.6 | And a cloudy day isn't a fire-free day, so we corrected that too. |
| 1:52.4 | 25.4 | Watch the jump. |
| 1:56.2 | 29.2 | Gone, on every continent. In Bangladesh, ninety-seven percent of it was the camera. |
| 2:01.8 | 34.8 | And our quiz? The bigger-looking year burned less. |
| **Live demo** | | (see the table above) |
| **Act 4 · SO WHAT NEXT** | | |
| 2:50.4 | 0.4 | What changes? Before, fair comparisons stopped at 2012. |
| 2:54.6 | 4.6 | Now any place on Earth gets twenty-three years of fair fire history. |
| 2:59.2 | 9.2 | Was anyone watching? |
| 3:00.8 | 10.8 | The satellites were. Bhaluka rarely burns, so Kiln Watch flagged the fire as unusual. |
| 3:09.0 | 19.0 | A farm officer plans around the Boro harvest. |
| 3:12.5 | 22.5 | An inspector sees kiln season overlap the rice's most fragile weeks. |
| 3:17.0 | 27.0 | A scientist gets twenty-three years, no fake jump. |
| 3:20.6 | 30.6 | It already works across South Asia, updated daily from NASA FIRMS. |
| 3:25.4 | 35.4 | The method works anywhere on Earth. |
| 3:27.5 | 37.5 | Next: South Asia's hundred and thirty-eight thousand brick kilns. |
| 3:31.6 | 41.6 | What we need: forest and fire services to pilot it. |
| 3:39.8 | 49.8 | MODIS is going dark. |
| 3:41.8 | 51.8 | The world's fire record doesn't have to. |
| 3:44.6 | 54.6 | Bhaluka was being watched. |
| 3:46.6 | 56.6 | Next time, someone will know. |
| 3:49.4 | 59.4 | One fire record. For any place on Earth. |

## How the pieces are built

- **Voice clips** are in each project's `assets/vo/`, one WAV per line, placed as `<audio data-audio-group="voiceover">` in its `index.html`. To change a line, regenerate that clip with `npx hyperframes tts "<text>" -v am_michael -o assets/vo/<file>.wav`, set the new `data-duration`, then re-run the carve (`/hyperframes-audio`) so the music dips under the new timing.
- **Act 3** cuts are in `assets/earth.js` (camera), `compositions/grade.html` (chapters) and `tools/build-score.mjs` (music). The crops and kilns scene files are still in `compositions/` but not used.
- **Act 4** keeps its original 74 s clock. `ACT_CUTS` in `compositions/act4.html` skips 41–46, and `tools/build-score.mjs` splices the music at the same point.
- **Demo** footage is in `demo/assets/rec/` (MP4s are git-ignored, like the other footage). Each `<video>` picks a source range with `data-media-start`. The camera moves are the `cam()` calls in `demo/index.html`.
- `merge.sh` joins Act 1, Act 2, Act 3, the demo, then Act 4.
