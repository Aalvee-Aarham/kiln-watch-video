# Workflow rule: preview → approve → render

Rendering is slow. Never render until the user has approved the edits in a live preview.

1. **Make the edits**, then run `npx --yes hyperframes@0.8.143 check` in each changed act and fix all errors.
2. **Start a preview** in each changed act: `npx --yes hyperframes@0.8.143 preview --background`, then `preview --status` to get the URL. Tell the user to open it in Chrome.
3. **List every change**: act, file, scene/timestamp, and what changed (footage added, scene replaced, text, timing, audio).
4. **Ask, and wait for the answer:**
   > "Have you watched the preview in Chrome? Do you approve all these changes? Should I render?"
5. Only on an explicit **yes**: stop the preview (`preview --stop`), run `npm run render` in each changed act (`-o renders/<act>-final.mp4`), then `bash merge.sh`.
   If the user wants changes, go back to step 1. Never render "to see how it looks"; that's what the preview is for.
