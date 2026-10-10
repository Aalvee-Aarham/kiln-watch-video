# Workflow rule: preview → approve → render

Rendering is slow. Never render until the user has approved the edits in a live preview.
Assume the user is not technical. Use plain words, give exact links, and don't use jargon.

1. **Make the edits**, then run `npx --yes hyperframes@0.8.143 check` in each changed act and fix all errors.
2. **Start a preview** in each changed act: `npx --yes hyperframes@0.8.143 preview --background`, then `preview --status` to get the URL.
3. **Send the user this message**, with the real URL(s) and change list filled in:

   > ⚠️ **Rendering takes a long time, so please watch the preview first.**
   >
   > **Step 1 — Watch the preview.** Open this link in Chrome: `<preview URL>`
   > Press play and watch the whole video. Nothing is rendered yet, so nothing is final.
   >
   > **Step 2 — Check what I changed:**
   > - `<Act N, scene, timestamp>`: `<what changed, in plain words>`
   > - …
   >
   > **Step 3 — Tell me:**
   > - Have you watched the preview in Chrome?
   > - Do you approve all these changes?
   > - Should I render now?
   >
   > Reply **"yes, render"** to start rendering. If something looks wrong, tell me what to fix and I'll update the preview first.

4. **Wait for the answer.** Render only after an explicit yes. If the user hasn't watched the preview yet, remind them to watch it first.
5. On **yes**: stop the preview (`preview --stop`), run `npm run render -- -o renders/<act>-final.mp4` in each changed act, then `bash merge.sh`. Tell the user before you start that rendering will take a while.
   If the user wants changes, go back to step 1. Never render "to see how it looks"; that's what the preview is for.
