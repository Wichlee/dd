# AGENTS.md — working on the Stochastic Parrots scrollytelling

Instructions for coding agents (and humans) joining this project.
Read this first — it saves you an hour of code archaeology.

## What this is

A self-hosted, general-audience **scrollytelling** page about the paper
*"On the Dangers of Stochastic Parrots: Can Language Models Be Too Big?"*
(Bender, Gebru, McMillan-Major & Shmitchell, FAccT '21).
Course artefact for a Digital Democracy seminar.

- **Plain HTML/CSS/JS + D3 v7 + Scrollama.** No framework, no bundler, no npm,
  no backend. Fully static, hosted on GitHub Pages.
- D3 and Scrollama load from CDN (`cdn.jsdelivr.net`) at view time — do **not**
  add other libraries, local copies or build steps.
- The source paper is in the repo root: `On the Dangers of Stochastic Parrots.pdf`.
  **Every number and quote on the page must be verifiable against it.**

## Run it (30 seconds)

```bash
cd phase1            # this folder IS the repo root
python3 -m http.server 8000
# open http://localhost:8000
```

Deploy = `git push origin main`. GitHub Pages redeploys in ~1–2 minutes:
https://wichlee.github.io/dd/

## File map

| File | Role |
|---|---|
| `index.html` | Hero, all chapters as `<section class="chapter">`, FAQ, outro/footer. Owner comments mark who owns what. |
| `js/main.js` | Boot: loads D3/Scrollama, `buildCharts()` maps **chapter index → chart + step**. |
| `js/charts.js` | Every chart. One function per chart, e.g. `bubbleChart`, `birthChart`. Shared helpers at the top. |
| `js/data.js` | All data: `MODELS`, `TIMELINE_YEARS`, `COST_FACTS`, `BIAS_FACTS`, `AUTOCOMPLETE_STEPS`. |
| `js/parrot-art.js` | `PARROT_SVG` (OpenMoji artwork). Attribution is in the footer — never remove it. |
| `css/style.css` | Theme, layout, chapter cards, responsive rules. |

## Ownership (important!)

The page is split by seminar sections. **Only work on your own sections.**

| Owner | Section | Chapters (index) | Charts |
|---|---|---|---|
| @Erik | Hero / scale + The Stochastic Parrot | 0–8 | `bubbleChart`, `parrotChart`, `autocompleteChart`, `birthChart` |
| @Leo | Environmental costs | 9–11 | `co2Chart`, `computeChart`, `justiceChart` |
| @Maria | Data & bias | 12–13 | `whoChart`, `filterChart` |
| @Robin | Harms / case studies | 14–15 | `caseCardsChart` |
| all | Paths forward + outro | 16–17 | `faqChart`, shared |

Rules:
- `TODO(Leo)`, `TODO(Maria)`, `TODO(Robin)` comments in `index.html` mark your
  starting points. Replace the **placeholder drafts** with your own content —
  you are allowed (expected) to rewrite texts and charts in *your* section.
- Do **not** edit other owners' sections, charts, texts or data. Shared files
  (`main.js`, shared helpers in `charts.js`, `style.css`) are fine to touch,
  but keep changes surgical and mention them in the commit message.
- Keep the chapter **DOM order and count** stable. If you add/remove a chapter
  inside your section, update `buildCharts()` in `main.js` accordingly —
  indices must always match the DOM order of `.chapter` elements.

## How the scrollytelling machine works

- One sticky chart stage on the right (`#chart-stage` / `#chart`), text cards
  scroll past on the left. Scrollama fires `onStepEnter` per chapter.
- `show(entry)` in `main.js`: if the *same* chart is already mounted it calls
  `instance.step(n)` only; otherwise it **tears down the old chart and rebuilds**
  (`svgRoot` clears the stage). Design for both: step-changes must animate,
  fresh builds must render the correct state immediately.
- Each chart factory returns `{ step(s) }`. `s` is the step number from the
  chapter mapping (1-based in the mapping, chart-side it is clamped).

## Style guide — charts (`js/charts.js`)

Reuse the shared helpers at the top of `charts.js`. They exist so every chart
looks like it came from one hand:

- `svgRoot(sel)` → clears the stage, returns `{ g, innerW, innerH }`. Always
  build on `g`, never append straight to the stage.
- `header(g, title, sub)` → the standard title block (auto-wraps `sub` on
  narrow screens). Every chart starts with it.
- `source(g, innerH, "Table 11 …")` → bottom source line, auto-prefixed with
  "Source:".
- `wrap(textSel, x, y, maxChars, lineH)` → SVG text wrapping. Use it for any
  text that can get long — SVG `<text>` never wraps by itself.
- Colors: **only** the palette `C` (`C.gold, C.orange, C.red, C.blue, C.teal,
  C.grey, C.ink, C.dark`). No ad-hoc hex values except in `data.js`-driven
  categories.
- Fonts come from CSS classes (`c-title`, `c-sub`, `c-head`, `c-big`, `c-src`).
  The only inline font-family allowed is the serif quote style
  (`"Newsreader, Georgia, serif"`) for spoken/quoted lines.
- `const compact = innerW < 560;` → mobile branch. Layouts must work at
  **1440×900** and **390×844** with no horizontal overflow and no clipped text.
- Animations: d3 transitions with short durations (400–900 ms). Endless loops
  (dash flow, wobble) are fine — they die with the DOM on teardown. Interrupt
  transitions before starting new ones (`.interrupt()`), as `birthChart` does.
- Interactivity: clicking candidates/elements must keep all state inside the
  chart closure (the chart is rebuilt whenever a different chart mounts).
- Code style: 2-space indent, double quotes, semicolons, `const`/`let`,
  arrow functions — match the existing code, no linter to fight you.

## Style guide — content

- **Language: English.** Factual, crisp, general-audience tone. Short
  paragraphs; bold the key figure/term, never bold whole sentences.
- **Facts:** every number/statement traces to the paper, cited by section —
  e.g. `<p class="source">Bender et al. 2021, §4.1</p>` in the chapter card or
  `source(g, innerH, "…")` in the chart. Known anchors: §2 growth race,
  §3 costs, §4.1/4.2 data & encoding bias, §4.3 toxicity, §5 data filters,
  §6.1 the parrot definition, §8 "ever larger models" close.
- **Illustrative values** (made-up for demonstration, not from the paper) must
  be labelled *on screen* (e.g. "illustrative") and in a comment in `data.js`.
  Do not invent numbers that look like paper numbers.
- Chapter card anatomy (see existing chapters in `index.html`):
  `<p class="step-num">Step 1 of 4 · the data</p>` (optional),
  `<h2>…</h2>`, 1–3 `<p>`, optional `<p class="hint">…</p>` for method notes,
  optional `<p class="source">…</p>`.
- A chapter card should make sense *with* the chart next to it — reference the
  visual ("Watch the egg ride the pipeline on the right") rather than
  duplicating its numbers.

## CSS conventions

- Theme via CSS variables in `:root`: `--bg #0d0f14`, `--panel`, `--ink`,
  `--muted`, `--accent #ffd166`, `--accent-2 #f0a35e`, `--line`. Use them,
  don't hardcode.
- Breakpoint: `@media (max-width: 760px)` (mobile stage = 55vh). Add mobile
  rules there, not scattered.
- Card/knob classes that already exist: `.chapter-content`, `.step-num`,
  `.hint`, `.source`, `.risk-card`, `.faq` details accordion, `.outro`.
- Dark theme: text is light on near-black. Test contrast for anything yellow
  (`--accent`) on light fills.

## QA checklist before you push

1. `python3 -m http.server 8000`, open the site, **scroll through ALL
   chapters** — not just yours — and confirm no chart broke.
2. Console: zero JS errors. (A `/favicon.ico` 404 is known and harmless.)
3. No horizontal scrollbar at 1440×900 **and** 390×844 (devtools).
4. Your interactive bits: click through every path/state, then reload and
   enter your chapter directly (fresh-build path must also be correct).
5. Mobile: nothing clipped behind the text cards that you *need* to see
   (known limitation: the 55vh mobile stage is partly covered by cards —
   agreed to revisit as a team; don't redesign it solo).

## Git

- Branch: `main` only, small commits, imperative summary line
  (e.g. `Environment: fix CO2e units and add comparator interaction`).
- Push to `origin main` — that *is* the deploy. Never force-push.
- Commit only your own section's files (+ the shared file you necessarily
  touched). If your commit would conflict with another owner's work, stop and
  talk to the team (Erik coordinates).
- Fact-check disputes or cross-section ideas → team meeting, not drive-by
  edits.

## Known quirks (don't "fix" without asking)

- `/favicon.ico` 404 in every server log — cosmetic.
- The grey "hollow" parrot in some chapters is intentional (no understanding
  behind the words).
- `AUTOCOMPLETE_STEPS` is a branching map keyed by sentence-so-far — every
  path must end in a complete sentence; keep it that way if you extend it.
- Chapter 16 intentionally reuses `parrotChart` with a fixed hollow line.
