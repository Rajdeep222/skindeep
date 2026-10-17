# Reach Theory Desk: handoff to a local session

Read this first. It replaces the cloud chat history.

## Who and what
- Owner: Rajdeep, runs the marketing agency **Reach Theory** in Khanna, Punjab. Team: Rajdeep (owner, id `me`), Panda (partner), Editor.
- Clients: Om Sons (bespoke tailor), RK Jewellers, DJ YPS, Master Wheels Khanna, Eroe Clothing (LA blanks wholesaler, English, AI images), and Reach Theory's own page (id `reachstory`). Khanna clients use Roman-script Punjabi.
- The product is **one file**: `reach-theory-desk.html` (about 4,500 lines, HTML + CSS + JS, no build step). It is a Claude Artifact, live at https://claude.ai/artifact/7MUtfZe8XExmpUdnNzKtYB (private, for the owner's own use; no public or native app planned).
- Data lives in the artifact's shared database (ArtifactData tool / `db` capability), not in the repo.
- Git: repo `rajdeep222/skindeep`, branch `claude/gracious-albattani-gdw2ad`. Last published version at handoff: **49**.

## Owner's standing rules (follow them)
- Never suggest filming or shooting: we only edit clips clients send; Eroe uses AI images.
- Calm tone. The owner finds long lists, overdue counts and alarm wording stressful. No red counters, no scolding.
- "Don't ask me, tell me what to do": recommend a default, then act. But for larger changes the owner sometimes says "discuss first, then plan, then execute": do that when asked.
- Routine posts are plain tasks ("Post reel"); specific ideas only for festival-linked pieces (within 10 days of a festival that applies to the client) or campaign pieces. Inspiration is optional, inside the task.
- Reels for DJ YPS and Master Wheels are handled by Panda: hidden from the owner's reminders.
- Image generation was removed from the desk earlier; only prompts remain.

## How to publish a change
1. Edit `reach-theory-desk.html` (it is the full published page including the host wrapper).
2. `python3 tools/make-publish.py /tmp/desk-publish.html` strips the wrapper (the host adds its own `<html>/<body>`).
3. Artifact tool: `action: publish`, `url: https://claude.ai/artifact/7MUtfZe8XExmpUdnNzKtYB`, `file_path: /tmp/desk-publish.html`. Omit `capabilities` and `icon` (carried forward). Contract is 0.2.66; upgrading to the newest runtime is a separate, tested step (not done).
4. Before the first publish in a session, `action: read` the live artifact. If a publish is refused as "not built on the newer version", compare the diff; if it only shows your own edits, publish the same file again.
5. Run the tests first (below). Commit and push.

## Tests
See `tests/README.md`. Five headless Playwright suites with a mocked database. They need a fixture of real data (`tests/fixtures/clients`, `tests/fixtures/tasks`, git-ignored). Create it with the ArtifactData tool: `list` collection `clients` and `tasks` with `out_dir = tests/fixtures`. Note: the live task list was cleared on 16 Oct, so some suites expect tasks that only exist in an older fixture; adapt or seed tasks when needed.

## Architecture in one minute
- Single-page app. State in `S` (clients, tasks, team, insights, campaigns, invoices, studio, pipeline...), UI state in `ui`. `render()` rebuilds `#main`; views are `viewFocus`, `viewToday` (Overview), `viewTasks`, `viewClient` (tabs), `viewTeam`, `viewPipeline` (New clients), etc. Handlers: one `click` listener (`data-act`), one `change` (`data-change`), one `submit` (`data-form`).
- Claude calls: `sample()` / `sample.json()`; streaming NDJSON through `streamItems`. Plan my day = `planDay()`.
- Look: dark sidebar, flat panels, one blue accent. Tokens at the top of the `<style>`; "Professional panel overrides" block follows.
- Opens on Focus every time (`ui.view = 'focus'`; saved navigation is no longer restored).

## Data model (fields added or relied on)
- `clients/{id}`: `todos[{id,text,at}]`, `planNotes[{t,when,until,note}]`, `noSuggest[]`, `asks[]`, `followers[{d,n}]`, `target`, `plan`, `brand`, plus **`partner {by, kinds[]}`** (work handled by someone else, hidden from reminders) and **`owners {kind: memberId}`** (who normally does what).
- `team/{id}`: `name, role (owner|partner|editor)`, **`hours`** (weekly), **`away[{from,to,note}]`**, **`partnerWork[{cid,name,kinds}]`** (copy of partner rules so a Contributor can read it; clients are admin-only).
- `tasks/{id}`: `title, client, kind, status, assignee, due, priority, hard, rolled, brief, todo, campaign`, plus **`plain`** (routine post), **`doneBy`**, **`inspo{items}`**, **`partnerPosted`/`logged`** (posts logged by hand or by the partner).
- `meta/`: `focus {d, clients[], by}` (today's focus picks), `pace`, `pipeline {items[]}`, `studio`, `routines`, `rules`, `calendar`, `backup` (never created: the owner has not downloaded a backup yet), `clearedTasks` (backup of the 21 tasks deleted on 16 Oct; also in `backups/open-tasks-2026-10-16.json`).
- Access rules: root admin read/write; `tasks` interact read/write; `team` interact read, admin write. Editor share = admin; Contributor share = interact (sees only their own tasks plus "Mark a post as live").

## What was built in the cloud session (v43 to v49)
Professional restyle; open on Focus; Focus picker for today; "Handled by someone else" per client + one-tap "posted today" + Panda's contributor view; plain "Post reel" tasks + festival rule + optional inspiration/steps; Team page (add, rename, role, remove); who-does-what defaults, weekly hours, time off, who-finished-what; Growth page rebuilt as **New clients** (find prospects first, bulk add, weekly outreach count); upsell code removed.

## Morning check (scheduled routine)
Prompt saved in `docs/morning-check-prompt.md`. The routine fires into the old cloud session; recreate it for a local session or keep the cloud one.

## Open items
- Panda is not yet added with Contributor access; "Who does what" and weekly hours are not filled in; no backup downloaded yet.
- The Meta Ads and Higgsfield connectors in the page were never exercised in the cloud session (unverified).
- Plan my day, Get inspiration and Suggest who to approach were tested only with a fake Claude, not against the real one.
- Eroe "Plan Halloween/fall AI product posts": owner's note says plan about 2 days before Halloween (29 Oct), not earlier.
- Optional later: archive old tasks, per-client scope limit, approval deadline in the pack, runtime upgrade.
