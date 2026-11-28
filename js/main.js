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
   [5-10] Environment (@Leo) · [11-12] Data & bias (@Maria)
   [13-14] Harms (@Robin)  · [15] Paths forward (all, HTML table) */
function buildCharts() {
  return [
    { idx: 0, render: "bubbleChart", step: 2019 },
    { idx: 1, render: "bubbleChart", step: 2021 },
    { idx: 2, render: "parrotChart", step: null },
    { idx: 3, render: "autocompleteChart", step: null },
    { idx: 4, render: "parrotChart", step: null },
    { idx: 5, render: "envIntroChart", step: null },
    { idx: 6, render: "computeChart", step: null },
    { idx: 7, render: "co2Chart", step: null },
    { idx: 8, render: "envLifecycleChart", step: null },
    { idx: 9, render: "envTradeoffChart", step: null },
    { idx: 10, render: "envJusticeChart", step: null },
    { idx: 11, render: "whoChart", step: null },
    { idx: 12, render: "filterChart", step: null },
    { idx: 13, render: "caseCardsChart", step: null },
    { idx: 14, render: "caseCardsChart", step: null },
    { idx: 15, render: null, step: null }, // HTML comparison table, keep chart
  ];
}

function init() {
  const stage = document.getElementById("chart");
  const chapters = Array.from(document.querySelectorAll(".chapter"));

  const chartMapping = buildCharts();
  let current = null;   // {render, instance}

  function show(entry) {
    if (current && current.render === entry.render) {
      if (entry.step) current.instance.step(entry.step);
      return;
    }
    // teardown old chart, build new one
    const factory = Charts[entry.render];
    if (!factory) return;
    if (current && typeof current.instance.destroy === "function") current.instance.destroy();
    current = { render: entry.render, instance: factory(d3.select(stage)) };
    if (entry.step) current.instance.step(entry.step);
  }

  const scroller = scrollama();
  // Render the opening chart before Scrollama selects the visible chapter.
  // This also lets a restored scroll position or #environment anchor win.
  show(chartMapping[0]);

  scroller
    .setup({
      step: ".chapter",
      offset: 0.55,
      progress: true,
    })
    .onStepEnter(({ element, index }) => {
      element.classList.add("active");
      const entry = chartMapping[index];
      if (entry) show(entry);
    })
    .onStepExit(({ element }) => {
      element.classList.remove("active");
    })
    .onStepProgress(({ index, progress }) => {
      if (chartMapping[index]?.render === current?.render && typeof current?.instance.setProgress === "function") {
        current.instance.setProgress(progress);
      }
    });

  // select first chapter on load
  window.addEventListener("load", () => {
    scroller.resize();
  });

  window.addEventListener("resize", scroller.resize);

}

boot();
