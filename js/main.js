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
   [9-14] Environment (@Leo) · [15-16] Data & bias (@Maria)
   [17-18] Harms (@Robin) · [19-20] Paths forward (all: table + FAQ) */
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
    { idx: 9, render: "envIntroChart", step: null },
    { idx: 10, render: "computeChart", step: null },
    { idx: 11, render: "co2Chart", step: null },
    { idx: 12, render: "envLifecycleChart", step: null },
    { idx: 13, render: "envTradeoffChart", step: null },
    { idx: 14, render: "envJusticeChart", step: null },
    { idx: 15, render: "whoChart", step: 1 },
    { idx: 16, render: "filterChart", step: 1 },
    { idx: 17, render: "caseCardsChart", step: 1 },
    { idx: 18, render: "caseCardsChart", step: 1 },
    { idx: 19, render: "parrotChart", step: 5 },
    { idx: 20, render: "faqChart", step: 1 },
  ];
}

function init() {
  const stage = document.getElementById("chart");
  const chapters = Array.from(document.querySelectorAll(".chapter"));

  const chartMapping = buildCharts();
  let current = null;   // {render, instance}

  function updateCarbonProgress() {
    if (current?.render !== "co2Chart" || typeof current.instance.setProgress !== "function") return;
    const chapter = chapters.find(element => element.classList.contains("carbon-scroll-chapter"));
    if (!chapter) return;
    const bounds = chapter.getBoundingClientRect();
    const progress = (window.innerHeight * 0.55 - bounds.top) / bounds.height;
    current.instance.setProgress(Math.max(0, Math.min(1, progress)));
  }

  function show(entry) {
    if (current && current.render === entry.render) {
      if (typeof current.instance.step === "function") current.instance.step(entry.step);
      return;
    }
    // teardown old chart, build new one
    const factory = Charts[entry.render];
    if (!factory) return;
    if (current && typeof current.instance.destroy === "function") current.instance.destroy();
    current = { render: entry.render, instance: factory(d3.select(stage)) };
    if (typeof current.instance.step === "function") current.instance.step(entry.step);
    updateCarbonProgress();
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
  window.addEventListener("scroll", updateCarbonProgress, { passive: true });
  window.addEventListener("resize", updateCarbonProgress);

}

boot();
