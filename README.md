# Stochastic Parrots — interactive scrollytelling

A general-audience visualisation of the paper *"On the Dangers of
Stochastic Parrots: Can Language Models Be Too Big?"* (Bender, Gebru,
McMillan-Major & Shmitchell, FAccT '21).

Built with plain **HTML / CSS / JS**, **D3.js** (charts) and **Scrollama**
(scroll tracker). No frameworks, no build step — fully static.

## Run locally

```bash
cd phase1
python3 -m http.server 8000
# open http://localhost:8000
```

Or simply double-click `index.html` in your file manager (it also works,
since there is no backend — the CDN scripts only need internet).

## Host (GitHub Pages)

The site is fully static (no backend, no build step), so GitHub Pages works
out of the box.

### Deploy
1. Push this folder (it is the repo root) to GitHub.
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** → branch
   **main** → root folder.
3. Live at `https://<user>.github.io/<repo>/`.

`.nojekyll` is included so GitHub does not run Jekyll on the files.

> Needs internet at view-time: D3 & Scrollama load from a CDN
> (`cdn.jsdelivr.net`). The source PDFs are excluded via `.gitignore`.

## Structure

```
├── index.html          hero + 10 scroll chapters + outro
├── css/style.css       sticky chart stage, theming
├── js/
│   ├── data.js         all figures from the paper (single source of truth)
│   ├── charts.js       D3 chart renderers (one per chapter group)
│   └── main.js         Scrollama bootstrapping + CDN loader
├── .nojekyll           tell GitHub Pages not to run Jekyll
├── .gitignore          ignores the source PDFs
└── README.md
```
