/* D3 chart renderers. Each takes the target selection and renders SVG. */

const Charts = (() => {

  const W = () => document.getElementById("chart").clientWidth || 800;
  const H = () => window.innerHeight;
  const M = { top: 70, right: 170, bottom: 60, left: 70 };

  /* Set up a fixed SVG canvas once, return the root selection */
  function svgRoot(sel) {
    sel.selectAll("*").remove();
    const w = W(), h = H();
    const svg = sel
      .append("svg")
      .attr("width", w)
      .attr("height", h)
      .attr("viewBox", `0 0 ${w} ${h}`);
    return { svg, g: svg.append("g").attr("transform", `translate(${M.left},${M.top})`), w, h };
  }

  /* ---------- Chart 1: Model growth bubbles (log scale) ---------- */
  function bubbleChart(sel) {
    const { g, w, h } = svgRoot(sel);
    const innerW = w - M.left - M.right;
    const innerH = h - M.top - M.bottom;

    g.append("text")
      .attr("class", "chart-title")
      .attr("x", 0).attr("y", -M.top + 30)
      .text("Language models, 2019 → 2021");

    g.append("text")
      .attr("class", "stage-label")
      .attr("x", 0).attr("y", -M.top + 52)
      .text("Bubble size = parameters · colour = training data size");

    const xMax = 2021.8, xMin = 2017.8;
    const x = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);

    // log scale for parameters: from ~1e7 up to ~2e12
    const y = d3.scaleLog().base(10).domain([1e7, 4e12]).range([innerH, 0]).nice();

    // bubbles visible only from their release year onward
    const vis = d3.scaleThreshold()
      .domain([2019.5, 2020.5])
      .range([1, 2, 3]); // opacity multiplier used in main loop

    const bubbleSel = g.append("g")
      .selectAll(".bubble")
      .data(MODELS.map((m, i) => ({ ...m, i })))
      .enter()
      .append("circle")
      .attr("class", "bubble")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.params))
      .attr("r", d => rScale(d.params))
      .attr("fill", d => d.color)
      .attr("stroke", "rgba(255,255,255,0.35)")
      .attr("stroke-width", 1)
      .attr("opacity", 0);

    bubbleSel
      .on("mouseover", (ev, d) => showTip(ev, d))
      .on("mousemove", (ev) => moveTip(ev))
      .on("mouseout", hideTip);

    // labels only for the landmark models
    const labelSel = g.append("g").selectAll(".blabel")
      .data(MODELS)
      .enter()
      .append("text")
      .attr("class", "blabel")
      .attr("x", d => x(d.year))
      .attr("y", d => y(d.params))
      .attr("text-anchor", "start")
      .attr("fill", "#fff")
      .attr("font-size", 11)
      .attr("dy", -14)
      .attr("opacity", 0)
      .text(d => d.name);

    // axis
    const xAxis = d3.axisBottom(x).ticks(3).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(y).tickFormat(d3.format(".0e"));

    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(xAxis);
    g.append("g").attr("class", "axis").call(yAxis);

    g.append("text")
      .attr("class", "stage-label")
      .attr("x", innerW / 2)
      .attr("y", innerH + 46)
      .attr("text-anchor", "middle")
      .text("Year of release →");

    // legend
    const legend = g.append("g").attr("class", "legend").attr("transform", `translate(${innerW + 24},${innerH - 180})`);
    const legendData = [
      { label: "smaller dataset (<200 GB)", color: "#5c9dff" },
      { label: "mid dataset (~200–600 GB)", color: "#38b6a8" },
      { label: "large dataset (700+ GB)", color: "#f0a35e" },
    ];
    legend.selectAll("rect")
      .data(legendData)
      .enter()
      .append("rect")
      .attr("x", 0).attr("y", (d, i) => i * 20)
      .attr("width", 12).attr("height", 12)
      .attr("rx", 2)
      .attr("fill", d => d.color);
    legend.selectAll("text")
      .data(legendData)
      .enter()
      .append("text")
      .attr("x", 18).attr("y", (d, i) => i * 20 + 10)
      .text(d => d.label)
      .attr("font-size", 11);

    // year readout
    const yearLabel = g.append("text")
      .attr("class", "stage-label")
      .attr("x", 0).attr("y", -10)
      .attr("font-size", 15)
      .attr("fill", "#ffd166");

    return {
      step(t) {
        // t = current year (2019, 2020, 2021)
        const opMin = 0.05, opMax = 1;
        bubbleSel.attr("opacity", d => {
          if (d.year > t) return 0;
          const m = vis(d.year);
          const lerp = d.year === t ? 1 : m - 1; // fully bright in its release year
          return (opMin + (opMax - opMin) * lerp) * 0.9;
        });
        labelSel.attr("opacity", d => (d && d.year === t ? 1 : 0));
        yearLabel.text(`Showing models released up to ${t}`);
      },
    };
  }

  /* ---------- Chart 2: CO2 comparison bars ---------- */
  function co2Chart(sel) {
    const { g, w, h } = svgRoot(sel);
    const innerW = w - M.left - M.right;
    const innerH = h - M.top - M.bottom;

    g.append("text").attr("class", "chart-title").attr("x", 0).attr("y", -M.top + 30).text("CO₂ emissions, one training run");

    const data = [
      { label: "Average person, 1 year", co2: 5, color: "#9aa5b8" },
      { label: "One person's lifetime (76 yrs)", co2: 5 * 76, color: "#9aa5b8" },
      { label: "Train BERT (1×)", co2: 284 / 2, color: "#f0a35e" },   // approx, one base run
      { label: "Train Transformer + search", co2: 284, color: "#f05c7a" },
    ];

    const max = 320;
    const x = d3.scaleLinear().domain([0, max]).range([0, innerW]);
    const y = d3.scaleBand().domain(data.map(d => d.label)).range([0, innerH]).padding(0.3);

    const bars = g.append("g").selectAll("rect")
      .data(data).enter()
      .append("rect")
      .attr("class", "bubble")
      .attr("x", 0).attr("y", d => y(d.label))
      .attr("width", 0).attr("height", y.bandwidth())
      .attr("fill", d => d.color).attr("rx", 4);

    const labels = g.append("g").selectAll("text")
      .data(data).enter()
      .append("text")
      .attr("class", "legend")
      .attr("x", d => 8).attr("y", d => y(d.label) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("fill", "#fff")
      .style("font-weight", 700)
      .text(() => '');

    const caption = g.append("text").attr("class", "hint-in-svg").attr("x", 0).attr("y", innerH + 34).attr("fill", "#9aa5b8")
      .text("An average person emits ~5 t CO₂e per year. One big model can match a whole lifetime.");

    const dd = g.append("g");
    const yearRects = bars;

    return {
      step() {
        bars.transition().duration(900)
          .attr("width", d => x(d.co2))
          .attr("opacity", d => (d.co2 === 284 ? 1 : 0.65));
        dd.selectAll("text").remove();
      },
    };
  }

  /* ---------- Chart 3: Compute growth vs Moore's law ---------- */
  function computeChart(sel) {
    const { g, w, h } = svgRoot(sel);
    const innerW = w - M.left - M.right;
    const innerH = h - M.top - M.bottom;

    g.append("text").attr("class", "chart-title").attr("x", 0).attr("y", -M.top + 30).text("Compute needed to train the biggest models");

    // 300,000x in 6 years vs Moore (2x per 18 months ≈ ~16x in 6y)
    const x = d3.scaleLinear().domain([0, 6]).range([0, innerW]);
    const y = d3.scaleLog().base(10).domain([1, 400000]).range([innerH, 0]).nice();

    const lineLM = d3.line()
      .x((d, i) => x(i))
      .y(d => y(d.lm));
    const lineMoore = d3.line()
      .x((d, i) => x(i))
      .y(d => y(d.moore));

    const pts = [];
    for (let i = 0; i <= 6; i++) {
      pts.push({ lm: Math.pow(300000, i / 6), moore: Math.pow(2, i / 1.5) });
    }

    const lm = g.append("path").datum(pts)
      .attr("class", "axis")
      .attr("d", lineLM)
      .attr("fill", "none").attr("stroke", "#ffd166").attr("stroke-width", 3);
    const moore = g.append("path").datum(pts)
      .attr("class", "axis")
      .attr("d", lineMoore)
      .attr("fill", "none").attr("stroke", "#9aa5b8")
      .attr("stroke-width", 2).attr("stroke-dasharray", "4 4");

    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(4).tickFormat(d => d + "y"));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y));

    // labels
    g.append("text").attr("x", innerW * 0.62).attr("y", 60).attr("fill", "#ffd166")
      .style("font-size", 13).text("language models: ×300,000");
    g.append("text").attr("x", innerW * 0.32).attr("y", innerH * 0.55).attr("fill", "#9aa5b8")
      .style("font-size", 13).text("Moore's law: ~×16");

    const gmark = g.append("circle")
      .attr("r", 6).attr("fill", "#ffd166")
      .attr("cx", x(6)).attr("cy", y(300000))
      .attr("opacity", 0);

    return {
      step() {
        const len = lm.node().getTotalLength();
        lm.attr("stroke-dasharray", len).attr("stroke-dashoffset", len)
          .transition().duration(1200).attr("stroke-dashoffset", 0);
        moore.attr("stroke-dasharray", len).attr("stroke-dashoffset", len)
          .transition().duration(1200).attr("stroke-dashoffset", 0);
        gmark.transition().delay(500).attr("opacity", 1);
      },
    };
  }

  /* ---------- Chart 4: Data representativeness (diverging / bias) ---------- */
  function whoChart(sel) {
    const { g, w, h } = svgRoot(sel);
    const innerW = w - M.left - M.right;
    const innerH = h - M.top - M.bottom;

    g.append("text").attr("class", "chart-title").attr("x", 0).attr("y", -M.top + 30).text("Who shapes a language model's 'world'?");

    const data = [
      { label: "Reddit users who are men", value: 67, color: "#5c9dff" },
      { label: "Reddit users under 30", value: 64, color: "#38b6a8" },
      { label: "Wikipedia editors who are women", value: 12, color: "#f0a35e" },
    ];

    const y = d3.scaleBand().domain(data.map(d => d.label)).range([0, innerH]).padding(0.35);
    const x = d3.scaleLinear().domain([0, 100]).range([0, innerW]);

    const bars = g.append("g").selectAll("rect")
      .data(data).enter()
      .append("rect")
      .attr("x", 0).attr("y", d => y(d.label))
      .attr("width", 0).attr("height", y.bandwidth())
      .attr("fill", d => d.color).attr("rx", 4);

    const vals = g.append("g").selectAll("text")
      .data(data).enter()
      .append("text")
      .attr("x", d => x(d.value) + 6).attr("y", d => y(d.label) + y.bandwidth() / 2)
      .attr("dy", "0.35em").attr("fill", "#fff").style("font-size", 13).style("font-weight", 700)
      .text(d => d.value + "%");

    const caption = g.append("text").attr("x", 0).attr("y", innerH + 34).attr("fill", "#9aa5b8")
      .text("The rest of the world's voices are under-represented — or missing entirely.");

    return {
      step() {
        bars.transition().duration(700)
          .attr("width", d => x(d.value));
      },
    };
  }

  /* ---------- Chart 5: Filtered silence (bad-words list composition) ---------- */
  function filterChart(sel) {
    const { g, w, h } = svgRoot(sel);
    const innerW = w - M.left - M.right;
    const innerH = h - M.top - M.bottom;

    g.append("text").attr("class", "chart-title").attr("x", 0).attr("y", -M.top + 30).text("The 'bad word' filter isn't neutral");

    const cx = innerW / 2, cy = innerH / 2, R = Math.min(innerW, innerH) / 2.4;

    const data = [
      { label: "sexual language", value: 360, color: "#f05c7a" },
      { label: "racial slurs", value: 25, color: "#f0a35e" },
      { label: "other / misc", value: 15, color: "#9aa5b8" },
    ];

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(R * 0.5).outerRadius(R);
    const outerArc = d3.arc().innerRadius(R * 0.62).outerRadius(R * 0.62);

    const arcs = g.append("g").attr("transform", `translate(${cx},${cy})`)
      .selectAll("path")
      .data(pie(data))
      .enter()
      .append("path")
      .attr("class", "bubble")
      .attr("fill", d => d.data.color)
      .attr("stroke", "rgba(0,0,0,0.4)");

    const labels = g.append("g").attr("transform", `translate(${cx},${cy})`).selectAll("text")
      .data(pie(data))
      .enter()
      .append("text")
      .attr("class", "legend")
      .attr("transform", d => `translate(${outerArc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#fff")
      .style("font-size", 12)
      .text(d => `${d.data.label} (~${d.data.value})`);

    return {
      step() {
        arcs.transition().duration(800)
          .attrTween("d", function (d) {
            const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
            return t => arc(i(t));
          });
      },
    };
  }

  /* ---------- Chart 6: The hollow parrot --------------
     A friendly-looking parrot that "speaks" fluently but is
     hollow — no meaning. The eye follows the cursor, the
     wing idly beats, and speech cycles between confident
     "intelligence" and empty, hollow failure.
  ------------------------------------------------------- */
  function parrotChart(sel) {
    const { svg, g, w, h } = svgRoot(sel);
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.3;
    const baseX = cx, baseY = cy;

    // --- gradients / defs ---
    const defs = svg.append("defs");

    const bodyGrad = defs.append("radialGradient").attr("id", "bodygrad")
      .attr("cx", "40%").attr("cy", "35%").attr("r", "75%");
    bodyGrad.append("stop").attr("offset", "0%").attr("stop-color", "#37c98a");
    bodyGrad.append("stop").attr("offset", "100%").attr("stop-color", "#118a52");

    const bellyGrad = defs.append("radialGradient").attr("id", "bellygrad");
    bellyGrad.append("stop").attr("offset", "0%").attr("stop-color", "#7de3b6");
    bellyGrad.append("stop").attr("offset", "100%").attr("stop-color", "#2fae7a");

    const beakGrad = defs.append("linearGradient").attr("id", "beakgrad")
      .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%");
    beakGrad.append("stop").attr("offset", "0%").attr("stop-color", "#ffd166");
    beakGrad.append("stop").attr("offset", "100%").attr("stop-color", "#fb8500");

    // subtle grid "grid lines" behind to echo "patterns in noise"
    const grid = g.append("g").attr("class", "gridlines").attr("opacity", 0.12).attr("stroke", "#9aa5b8").attr("fill", "none");
    for (let n = -6; n <= 6; n++) {
      grid.append("line").attr("x1", n * 24 + cx).attr("y1", cy - 4 * R).attr("x2", n * 24 + cx).attr("y2", cy + 2.4 * R);
    }

    const parrotG = g.append("g").attr("transform", `translate(${baseX},${baseY})`);

    // --- wing (behind body) ---
    const wingDef = parrotG.append("g").attr("transform", "translate(0, 0)");
    const wing = wingDef.append("path")
      .attr("d", `M ${-R*0.1} ${-R*0.2} Q ${-R*2.1} ${R*0.1} ${-R*1.7} ${R*1.2} Q ${-R*0.9} ${R*1.0} ${R*0.05} ${R*0.55} Z`)
      .attr("fill", "#0e6f45")
      .attr("opacity", 0.9);

    // --- body ---
    const body = parrotG.append("ellipse")
      .attr("rx", R * 0.95).attr("ry", R * 1.15)
      .attr("fill", "url(#bodygrad)")
      .attr("stroke", "#0d5c38").attr("stroke-width", 2);

    // belly patch
    parrotG.append("ellipse")
      .attr("cx", R * 0.6).attr("cy", R * 0.5)
      .attr("rx", R * 0.42).attr("ry", R * 0.6)
      .attr("fill", "url(#bellygrad)");

    // --- head ---
    const head = parrotG.append("circle")
      .attr("cx", R * 0.35).attr("cy", -R * 0.9)
      .attr("r", R * 0.5)
      .attr("fill", "url(#bodygrad)")
      .attr("stroke", "#0d5c38").attr("stroke-width", 2);

    // crest feathers (top of head)
    const crestG = parrotG.append("g");
    for (let i = -1; i <= 1; i++) {
      crestG.append("path")
        .attr("d", `M ${R*0.35 + i*R*0.12} ${-R*1.35} Q ${R*0.35 + i*R*0.22} ${-R*1.75} ${R*0.35 + i*R*0.34} ${-R*1.95}`)
        .attr("stroke", "#2fae7a").attr("stroke-width", R * 0.06).attr("stroke-linecap", "round")
        .attr("fill", "none");
    }

    // cheek blush
    parrotG.append("circle").attr("cx", R * 0.85).attr("cy", -R * 0.78).attr("r", R * 0.12).attr("fill", "#f0a35e").attr("opacity", 0.5);

    // --- eye (root group so pupil can be offset) ---
    const eyeG = parrotG.append("g").attr("transform", `translate(${R * 0.62}, ${-R * 1.0})`);
    eyeG.append("circle").attr("r", R * 0.18).attr("fill", "#fff").attr("stroke", "#0d5c38").attr("stroke-width", 1.5);
    // iris
    eyeG.append("circle").attr("r", R * 0.1).attr("fill", "#4b7bd6");
    // pupil
    const pupil = eyeG.append("circle").attr("r", R * 0.055).attr("fill", "#10141c");

    // --- beak ---
    parrotG.append("path")
      .attr("d", `M ${R*0.5} ${-R*0.82} Q ${R*1.25} ${-R*0.72} ${R*1.1} ${-R*0.42} Q ${R*0.7} ${-R*0.5} ${R*0.55} ${-R*0.6} Z`)
      .attr("fill", "url(#beakgrad)");
    // beak lower part line
    parrotG.append("line")
      .attr("x1", R * 0.5).attr("y1", -R * 0.6)
      .attr("x2", R * 1.0).attr("y2", -R * 0.55)
      .attr("stroke", "#a45a00").attr("stroke-width", 1.5);

    // --- speech line (below char) ---
    const bubble = g.append("text")
      .attr("text-anchor", "middle")
      .attr("x", cx).attr("y", cy + R * 2.35)
      .attr("fill", "#fff")
      .style("font-size", 16)
      .style("font-family", "Newsreader, Georgia, serif");

    // --- speech states: {text, kind} kind: "confident" | "hollow".
    // confident = feels meaningful; hollow = breaks down into noise.
    const states = [
      { text: "I can tell you how to vote.", kind: "confident" },
      { text: "I write believable news articles.", kind: "confident" },
      { text: "Two plus two is four.", kind: "confident" },
      { text: "I am a thinking machine.", kind: "confident" },
      { text: "…but I don't actually know what I'm saying.", kind: "hollow" },
      { text: "hm hm hm pluck pluck caw caw…", kind: "hollow" },
    ];
    let idx = 0;
    let wingUp = false;

    /* --- animation loop for wing flourish --- */
    function beat() {
      wingUp = !wingUp;
      wing.transition().duration(350)
        .ease(d3.easeBack)
        .attr("transform", wingUp ? "rotate(-16)" : "rotate(0)");
      // randomize when next beat happens (lazy, idle flapping)
      const delay = 900 + Math.random() * 1600;
      setTimeout(beat, delay);
    }
    beat();

    /* --- render a state into the speech line with typography --- */
    function renderState(st) {
      const hollow = st.kind === "hollow";
      // reset
      bubble.transition().duration(350).attr("opacity", 0).ease(d3.easeLinear).end()
        .then(() => {
          bubble
            .text(st.text)
            .style("color", hollow ? "#f05c7a" : "#ffd166")
            .style("font-style", hollow ? "italic" : "normal")
            .attr("stroke", hollow ? "#f05c7a" : "none")
            .attr("stroke-width", hollow ? 0.6 : 0)
            .transition().duration(350).attr("opacity", 1);
        });
    }

    /* --- cursor-tracking pupil --- */
    d3.select("#chart").on("mousemove", function (ev) {
      const rect = this.getBoundingClientRect();
      const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
      // vector from eye anchor to cursor, -clamped
      let dx = mx - baseX, dy = my - baseY;
      const len = Math.hypot(dx, dy) || 1;
      const clamp = R * 0.06;
      pupil.attr("cx", (dx / len) * clamp)
           .attr("cy", (dy / len) * clamp);
    });

    stateInitial(states[0]);

    function stateInitial(st) { renderState(st); }

    return {
      step() {
        idx = (idx + 1) % states.length;
        renderState(states[idx]);
        // little hop on state change
        parrotG.transition().duration(120).attr("transform", `translate(${baseX}, ${baseY - 6})`)
          .transition().duration(120).attr("transform", `translate(${baseX}, ${baseY})`);
      },
    };
  }

  /* ---------- Tooltip helpers ---------- */
  function showTip(ev, d) {
    const tip = d3.select("#tooltip");
    const dataLabel = d.dataGB ? `${d.dataGB} GB` : "n/a";
    tip.style("opacity", 1)
      .html(`<strong>${d.name}</strong><span class="tt-sub">${d.year} · ${formatParams(d.params)} parameters</span><br>training data: ${dataLabel}`);
    moveTip(ev);
  }
  function moveTip(ev) {
    d3.select("#tooltip")
      .style("left", (ev.offsetX + 18) + "px")
      .style("top", (ev.offsetY + 18) + "px");
  }
  function hideTip() { d3.select("#tooltip").style("opacity", 0); }

  function formatParams(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(1) + " trillion";
    if (n >= 1e9) return (n / 1e9).toFixed(0) + " billion";
    if (n >= 1e6) return (n / 1e6).toFixed(0) + " million";
    return n;
  }
  function rScale(params) {
    // log-scaled radius so bubbles are readable
    const t = (Math.log10(params) - 7) / (12.5 - 7); // ~1e7 -> 3e12
    return 8 + t * 42;
  }

  return { bubbleChart, co2Chart, computeChart, whoChart, filterChart, parrotChart };
})();
