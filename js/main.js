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

/* Map each chapter index -> chart + step */
function buildCharts() {
  // We share ONE sticky stage across all chapters; each chapter triggers the
  // chart that matches the grouped stage. Chapters 2-3 -> bubble, 4-5 -> co2... 
  return [
    { idx: 0, render: "parrotChart", step: null },                    // hook
    { idx: 1, render: "bubbleChart", step: 2019 },                    // growth (enters)
    { idx: 2, render: "bubbleChart", step: 2021 },                    // growth (climax)
    { idx: 3, render: "co2Chart", step: null },                       // price
    { idx: 4, render: "computeChart", step: null },                   // bleu/cost
    { idx: 5, render: "whoChart", step: null },                       // data representativeness
    { idx: 6, render: "whoChart", step: null },                       // one-sided internet
    { idx: 7, render: "filterChart", step: null },                    // filtered silence
    { idx: 8, render: "parrotChart", step: null },                    // hollow parrot
    { idx: 9, render: "parrotChart", step: null },                    // what can we do (final)
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
    current = { render: entry.render, instance: factory(d3.select(stage)) };
    if (entry.step) current.instance.step(entry.step);
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
