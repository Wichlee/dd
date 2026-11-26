/* Boot scrollytelling with Scrollama. One chart per chapter group. */

const CDN_D3 = "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js";
const CDN_SCROLLAMA = "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/build/scrollama.min.js";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

async function boot() {
  try {
    if (!window.d3) await loadScript(CDN_D3);
    if (!window.scrollama) await loadScript(CDN_SCROLLAMA);
  } catch (err) {
    document.getElementById("chart").innerHTML =
      '<p style="color:#fff;padding:2rem;max-width:520px">⚠ Network error: could not load D3 / Scrollama from CDN.<br>Please check your internet connection and reload.</p>';
    console.error(err);
    return;
  }
  init();
}

/* Map each chapter index -> chart + step.
   Order follows the outline:
   [0-1] Hero/scale (@Erik) · [2-4] Parrot section (@Erik)
   [5-8] How parrots are born — 4 steps (@Erik)
   [9-11] Environment (@Leo) · [12-13] Data & bias (@Maria)
   [14-15] Harms (@Robin) · [16-17] Paths forward (all: table + FAQ) */
function buildCharts() {
  return [
    { idx: 0, render: "bubbleChart", step: 2019 },
    { idx: 1, render: "bubbleChart", step: 2021 },
    { idx: 2, render: "parrotChart", step: 0 },
    { idx: 3, render: "autocompleteChart", step: 1 },
    { idx: 4, render: "parrotChart", step: 4 },
    { idx: 5, render: "birthChart", step: 1 },
    { idx: 6, render: "birthChart", step: 2 },
    { idx: 7, render: "birthChart", step: 3 },
    { idx: 8, render: "birthChart", step: 4 },
    { idx: 9, render: "co2Chart", step: 1 },
    { idx: 10, render: "computeChart", step: 1 },
    { idx: 11, render: "justiceChart", step: 1 },
    { idx: 12, render: "whoChart", step: 1 },
    { idx: 13, render: "filterChart", step: 1 },
    { idx: 14, render: "caseCardsChart", step: 1 },
    { idx: 15, render: "caseCardsChart", step: 1 },
    { idx: 16, render: "parrotChart", step: 5 },
    { idx: 17, render: "faqChart", step: 1 },
  ];
}

function init() {
  const stage = document.getElementById("chart");
  const chapters = Array.from(document.querySelectorAll(".chapter"));

  const chartMapping = buildCharts();
  let current = null;   // {render, instance}

  function show(entry) {
    if (current && current.render === entry.render) {
      current.instance.step(entry.step);
      return;
    }
    // teardown old chart, build new one
    const factory = Charts[entry.render];
    if (!factory) return;
    current = { render: entry.render, instance: factory(d3.select(stage)) };
    current.instance.step(entry.step);
  }

  const scroller = scrollama();

  scroller
    .setup({
      step: ".chapter",
      offset: 0.55,
    })
    .onStepEnter(({ element, index }) => {
      element.classList.add("active");
      const entry = chartMapping[index];
      if (entry) show(entry);
    })
    .onStepExit(({ element }) => {
      element.classList.remove("active");
    });

  // select first chapter on load
  window.addEventListener("load", () => {
    scroller.resize();
  });

  window.addEventListener("resize", scroller.resize);

  // initial render (first chapter/chart)
  show(chartMapping[0]);
}

boot();
