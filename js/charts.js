/* D3 chart renderers. Each takes the target selection and renders SVG.
   Every chart returns { step() }. main.js calls step() whenever its chapter
   becomes active, so each chart animates in on entry.
   All figures come from Bender, Gebru et al. (2021) unless marked illustrative. */

const Charts = (() => {

  const W = () => document.getElementById("chart").clientWidth || 800;
  const H = () => document.getElementById("chart").clientHeight || window.innerHeight;
  const M = { top: 96, right: 40, bottom: 64, left: 56 };

  const C = {
    gold: "#ffd166", orange: "#f0a35e", red: "#f05c7a", blue: "#5c9dff",
    teal: "#38b6a8", grey: "#9aa5b8", ink: "#e8ecf3", dark: "#10141c",
  };

  /* Fixed SVG canvas; returns root selection already shifted by the margins */
  function svgRoot(sel) {
    sel.selectAll("*").remove();
    const w = W(), h = H();
    const svg = sel.append("svg").attr("width", w).attr("height", h).attr("viewBox", `0 0 ${w} ${h}`);
    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
    return { svg, g, w, h, innerW: w - M.left - M.right, innerH: h - M.top - M.bottom };
  }

  /* Same title block on every chart → consistent look */
  function header(g, title, sub) {
    g.append("text").attr("class", "c-title").attr("x", 0).attr("y", -M.top + 38).text(title);
    if (!sub) return;
    const t = g.append("text").attr("class", "c-sub").attr("x", 0).attr("y", -M.top + 62).text(sub);
    // narrow charts (mobile): wrap the subtitle so it never clips at the right edge
    const svgW = g.node().ownerSVGElement ? g.node().ownerSVGElement.viewBox.baseVal.width : 1200;
    if (svgW < 560) wrap(t, 0, -M.top + 62, 34, 16);
  }
  function source(g, innerH, text) {
    g.append("text").attr("class", "c-src").attr("x", 0).attr("y", innerH + 44).text("Source: " + text);
  }
  function wrap(textSel, x, y, maxChars, lineH) {
    const words = textSel.text().split(/\s+/);
    textSel.text(null);
    let line = [], n = 0, tspan = textSel.append("tspan").attr("x", x).attr("y", y);
    words.forEach(wd => {
      line.push(wd);
      if (line.join(" ").length > maxChars && line.length > 1) {
        line.pop(); tspan.text(line.join(" "));
        line = [wd]; n += 1;
        tspan = textSel.append("tspan").attr("x", x).attr("y", y + n * lineH);
      }
    });
    tspan.text(line.join(" "));
    return n + 1;
  }

  /* ---------- Chart 1: Model growth bubbles (log scale) ---------- */
  function bubbleChart(sel) {
    const { g, innerW, innerH } = svgRoot(sel);
    header(g, "The size race, 2019 → 2021", "Each bubble is a language model · height = number of parameters (log scale)");

    const x = d3.scaleLinear().domain([2018.6, 2021.6]).range([0, innerW]);
    const y = d3.scaleLog().base(10).domain([3e7, 4e12]).range([innerH, 0]);
    const dataColor = d => d.dataGB == null ? C.grey : d.dataGB < 200 ? C.blue : d.dataGB < 700 ? C.teal : C.orange;

    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues([2019, 2020, 2021]).tickFormat(d3.format("d")));
    g.append("g").attr("class", "axis")
      .call(d3.axisLeft(y).tickValues([1e8, 1e9, 1e10, 1e11, 1e12]).tickFormat(d => d3.format("~s")(d).replace("G", "B").replace("T", "T")));
    g.append("text").attr("class", "c-label").attr("x", -M.left + 4).attr("y", -14).text("parameters");

    // de-clutter models that sit on the same year/size
    const jitter = {};
    MODELS.forEach(m => { const k = m.year + ":" + Math.round(Math.log10(m.params) * 3); jitter[k] = (jitter[k] || 0) + 1; m._j = jitter[k] - 1; });

    const px = d => x(d.year) + (d._j % 3 - 1) * 46 + (d.year === 2019 ? 40 : 0) - 10;
    const nodes = g.append("g").selectAll("g").data(MODELS).enter().append("g")
      .attr("opacity", 0)
      .attr("transform", d => `translate(${px(d)},${y(d.params)})`);
    nodes.append("circle").attr("r", d => rScale(d.params))
      .attr("fill", dataColor).attr("fill-opacity", 0.85)
      .attr("stroke", "rgba(255,255,255,0.5)")
      .style("cursor", "pointer")
      .on("mouseover", (ev, d) => showTip(ev, d))
      .on("mousemove", moveTip).on("mouseout", hideTip);
    nodes.append("text").attr("class", "c-label").attr("text-anchor", "middle")
      .attr("y", d => -rScale(d.params) - 6).attr("fill", "#fff")
      .text(d => ["BERT", "GPT-3", "Switch-C", "GShard", "T5-11B", "MegatronLM", "T-NLG"].includes(d.name) ? d.name : "");

    const legend = g.append("g").attr("transform", "translate(10,0)");
    [["< 200 GB training data", C.blue], ["200–700 GB", C.teal], ["700+ GB", C.orange], ["unknown", C.grey]].forEach((d, i) => {
      legend.append("circle").attr("cx", 5).attr("cy", i * 20).attr("r", 5).attr("fill", d[1]);
      legend.append("text").attr("class", "c-label").attr("x", 18).attr("y", i * 20 + 4).text(d[0]);
    });
    const readout = g.append("text").attr("class", "c-big").attr("x", innerW).attr("y", innerH - 20)
      .attr("text-anchor", "end").attr("fill", C.gold)
      .style("font-size", innerW < 560 ? "15px" : null);
    source(g, innerH, "Table 1 · hover a bubble for details");

    return {
      step(t) {
        t = t || 2021;
        nodes.transition().duration(700).attr("opacity", d => d.year <= t ? 1 : 0);
        readout.text(t === 2021 ? "BERT → Switch-C: ≈4,600×" : "2019: from 66M to 8.3B parameters");
      },
    };
  }

  /* ---------- Environmental section: scoped, accessible HTML visuals ----------
     The stage is shared with the rest of the story. CSS positions .env-stage;
     these visualisations never modify the surrounding chapters.
  --------------------------------------------------------------------------- */
  function envPanel(sel, modifier) {
    sel.selectAll('*').remove();
    return sel.append('div')
      .attr('class', `env-stage ${modifier}`)
      .style('color', '#e8ecf3');
  }

  function envHeading(panel, eyebrow, title) {
    panel.append('p').attr('class', 'env-stage-eyebrow').text(eyebrow);
    panel.append('h3').attr('class', 'env-stage-title').text(title);
  }

  function envSource(panel, html) {
    panel.append('p').attr('class', 'env-stage-source').html(html);
  }

  /* Values reported in the assigned paper, §3, p. 612. The line for an
     average person is a calculation that holds the paper's 2017 rate constant;
     it is not a historical time series. CO₂ and CO₂e are distinct measures. */
  function co2Chart(sel) {
    const modelTonnes = COST_FACTS.transformerCO2;
    const annualTonnes = COST_FACTS.humanYearCO2e;
    const maxYears = 60;
    const panel = envPanel(sel, 'env-comparator');
    envHeading(panel, 'Two figures from the paper', 'When do the numbers meet?');
    panel.append('p').attr('class', 'env-stage-intro')
      .text('Scroll to add years at the 2017 global average. The model estimate stays fixed.');

    const legend = panel.append('div').attr('class', 'carbon-legend').attr('aria-hidden', 'true');
    legend.append('span').attr('class', 'carbon-key carbon-key-model')
      .text('Model procedure: 284 tonnes CO₂');
    legend.append('span').attr('class', 'carbon-key carbon-key-person')
      .text('One person: 5 tonnes CO₂e / year');

    const svg = panel.append('svg').attr('class', 'carbon-line-chart')
      .attr('viewBox', '0 0 680 270').attr('role', 'img')
      .attr('aria-label', 'Line chart of two figures reported in the paper. One Transformer development procedure including a search for model designs is estimated at 284 tonnes of CO₂. A line increasing at the 2017 global average of 5 tonnes CO₂ equivalent per person per year reaches 285 tonnes after 57 years. This is an illustrative calculation, not a historical time series or exact equivalence: CO₂ and CO₂ equivalent are different measures.');
    const x = d3.scaleLinear().domain([0, maxYears]).range([55, 650]);
    const y = d3.scaleLinear().domain([0, 300]).range([214, 20]);
    const grid = svg.append('g').attr('class', 'carbon-grid').attr('aria-hidden', 'true');
    [0, 100, 200, 300].forEach(tick => {
      grid.append('line').attr('x1', x(0)).attr('x2', x(maxYears))
        .attr('y1', y(tick)).attr('y2', y(tick));
      grid.append('text').attr('x', x(0) - 10).attr('y', y(tick) + 4)
        .attr('text-anchor', 'end').text(tick);
    });
    [0, 10, 20, 30, 40, 50, 60].forEach(tick => {
      grid.append('text').attr('x', x(tick)).attr('y', 235)
        .attr('text-anchor', 'middle').text(tick);
    });
    grid.append('text').attr('x', x(0)).attr('y', 11).text('Tonnes');
    grid.append('text').attr('x', x(maxYears)).attr('y', 260)
      .attr('text-anchor', 'end').text('Years at the 2017 global average');

    svg.append('line').attr('class', 'carbon-line carbon-line-model')
      .attr('x1', x(0)).attr('x2', x(maxYears)).attr('y1', y(modelTonnes)).attr('y2', y(modelTonnes));
    const person = svg.append('line').attr('class', 'carbon-line carbon-line-person')
      .attr('x1', x(0)).attr('y1', y(0));
    const crossing = svg.append('g').attr('class', 'carbon-crossing-annotation');
    crossing.append('line').attr('class', 'carbon-crossing-guide')
      .attr('x1', x(modelTonnes / annualTonnes)).attr('x2', x(modelTonnes / annualTonnes))
      .attr('y1', y(modelTonnes)).attr('y2', y(0));
    crossing.append('circle').attr('class', 'carbon-crossing').attr('r', 6)
      .attr('cx', x(modelTonnes / annualTonnes)).attr('cy', y(modelTonnes));
    crossing.append('text').attr('class', 'carbon-crossing-label')
      .attr('x', x(modelTonnes / annualTonnes) - 12).attr('y', y(0) - 12)
      .attr('text-anchor', 'end').text('≈ 57 years');
    const marker = svg.append('circle').attr('class', 'carbon-line-marker').attr('r', 5);
    const progressLabel = panel.append('p').attr('class', 'carbon-progress').attr('aria-hidden', 'true');
    panel.append('p').attr('class', 'carbon-comparison-note')
      .text('The lines meet at about 57 years only as a numerical comparison. CO₂e expresses greenhouse gases as an equivalent amount of CO₂; the measures and timeframes differ. The 2017 average is held constant, not a record of actual yearly emissions.');
    envSource(panel, 'Source: <a href="https://doi.org/10.1145/3442188.3445922" target="_blank" rel="noopener noreferrer">Bender et al. (2021), §3, p. 612</a>');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function draw(progress) {
      // Reach the crossing before the chapter ends so it stays visible while readers continue scrolling.
      const years = reducedMotion.matches ? maxYears : Math.max(0, Math.min(maxYears, progress * maxYears / 0.55));
      const shownYears = Math.round(years * 10) / 10;
      crossing.attr('opacity', years >= modelTonnes / annualTonnes ? 1 : 0);
      person.attr('x2', x(years)).attr('y2', y(years * annualTonnes));
      marker.attr('cx', x(years)).attr('cy', y(years * annualTonnes));
      progressLabel.text(`${shownYears} years × ${annualTonnes} tonnes CO₂e per year = ${Math.round(shownYears * annualTonnes * 10) / 10} tonnes CO₂e`);
    }
    // A completed chart is the fallback if scroll progress is not available.
    draw(1);
    return { setProgress: draw };
  }

  function envIntroChart(sel) {
    const panel = envPanel(sel, 'env-static');
    envHeading(panel, 'Behind the screen', 'How does AI have a footprint?');
    const items = [
      ['01', 'Computing', 'Data-centre hardware performs the calculations needed to develop and use a model.'],
      ['02', 'Electricity', 'That hardware and its supporting infrastructure need power.'],
      ['03', 'Emissions', 'Generating electricity can release greenhouse gases; the amount depends on the energy source.'],
    ];
    const list = panel.append('ol').attr('class', 'env-process');
    items.forEach(([number, title, body]) => {
      const item = list.append('li');
      item.append('span').attr('class', 'env-process-number').attr('aria-hidden', 'true').text(number);
      const content = item.append('div');
      content.append('strong').text(title);
      content.append('p').text(body);
    });
    envSource(panel, 'Source: <a href="https://doi.org/10.1145/3442188.3445922" target="_blank" rel="noopener noreferrer">Bender et al. (2021), §3</a>');
    return { step() {} };
  }

  /* Historical change reported in the assigned paper, §3, p. 612. */
  function computeChart(sel) {
    const panel = envPanel(sel, 'env-compute');
    envHeading(panel, 'A historical change in scale', 'The computing race');
    panel.append('p').attr('class', 'env-compute-number').text('300,000×');
    panel.append('p').attr('class', 'env-stage-intro')
      .text('The paper reports this increase in computing used to train the largest deep-learning models over six years.');
    const timeline = panel.append('div').attr('class', 'env-timeline').attr('aria-label', 'Over six years');
    timeline.append('strong').text('Start');
    timeline.append('span').attr('aria-hidden', 'true').text('──────────→');
    timeline.append('strong').text('Six years later');
    panel.append('p').attr('class', 'env-caveat')
      .text('This covers language models and other applications. It measures computation, not electricity or CO₂ emissions.');
    envSource(panel, 'Source: <a href="https://doi.org/10.1145/3442188.3445922" target="_blank" rel="noopener noreferrer">Bender et al. (2021), §3, p. 612</a>');
    return { step() {} };
  }

  function envLifecycleChart(sel) {
    const panel = envPanel(sel, 'env-static');
    envHeading(panel, 'Beyond one training run', 'A model has a lifecycle');
    const items = [
      ['01', 'Develop & experiment', 'Try architectures and settings, often training many versions.'],
      ['02', 'Train & deploy', 'Prepare the chosen model and make it available.'],
      ['03', 'Use repeatedly', 'Each response takes computation. Usage can add up over time.'],
    ];
    const list = panel.append('ol').attr('class', 'env-process');
    items.forEach(([number, title, body]) => {
      const item = list.append('li');
      item.append('span').attr('class', 'env-process-number').attr('aria-hidden', 'true').text(number);
      const content = item.append('div');
      content.append('strong').text(title);
      content.append('p').text(body);
    });
    panel.append('p').attr('class', 'env-caveat')
      .text('How the footprint is divided varies by model and use; these stages are not shown to scale.');
    envSource(panel, 'Source: <a href="https://doi.org/10.1145/3442188.3445922" target="_blank" rel="noopener noreferrer">Bender et al. (2021), §3</a>');
    return { step() {} };
  }

  function envTradeoffChart(sel) {
    const panel = envPanel(sel, 'env-static');
    envHeading(panel, 'One historical translation experiment', 'A small gain, a high cost');
    const stats = panel.append('div').attr('class', 'env-tradeoff');
    const gain = stats.append('div');
    gain.append('strong').text('+0.1');
    gain.append('span').text('BLEU points');
    const cost = stats.append('div');
    cost.append('strong').text('$150,000');
    cost.append('span').text('estimated compute cost');
    panel.append('p').attr('class', 'env-stage-intro')
      .text('The paper discusses an English-to-German machine-translation example. BLEU is a score used to compare translations.');
    panel.append('p').attr('class', 'env-caveat')
      .text('This is one reported example, not the price of every improvement.');
    envSource(panel, 'Source: <a href="https://doi.org/10.1145/3442188.3445922" target="_blank" rel="noopener noreferrer">Bender et al. (2021), §3, p. 612</a>');
    return { step() {} };
  }

  function envJusticeChart(sel) {
    const panel = envPanel(sel, 'env-globe-panel');
    if (typeof window.createEnvironmentalGlobe === 'function') {
      return window.createEnvironmentalGlobe(panel.node());
    }
    envHeading(panel, 'Examples from the paper', 'Who bears the costs?');
    panel.append('p').attr('class', 'env-stage-intro')
      .text('The paper discusses climate risks in Sudan and the Maldives and asks who benefits from language technology.');
    panel.append('p').attr('class', 'env-caveat')
      .text('The paper does not rank countries by climate costs or technology benefits.');
    envSource(panel, 'Source: <a href="https://doi.org/10.1145/3442188.3445922">Bender et al. (2021), §3, pp. 612–613</a>');
    return { step() {} };
  }

  /* ---------- Generic stat-card stack (justice, harms) ---------- */
  function cardsChart(sel, cfg) {
    const { g, innerW, innerH } = svgRoot(sel);
    header(g, cfg.title, cfg.sub);
    const n = cfg.items.length, gap = 18;
    const ch = Math.min(150, (innerH - 10 - gap * (n - 1)) / n);
    const cards = g.selectAll("g.card").data(cfg.items).enter().append("g").attr("class", "card")
      .attr("opacity", 0).attr("transform", (d, i) => `translate(0,${i * (ch + gap) + 20})`);
    cards.append("rect").attr("width", innerW).attr("height", ch).attr("rx", 12)
      .attr("fill", "rgba(255,255,255,0.05)").attr("stroke", "rgba(255,255,255,0.14)");
    cards.append("rect").attr("width", 6).attr("height", ch).attr("rx", 3).attr("fill", d => d.color);
    const bigW = Math.min(190, innerW * 0.33);
    cards.append("text").attr("class", "c-huge").attr("x", 24).attr("y", ch / 2 + 14).attr("fill", d => d.color).text(d => d.big);
    cards.each(function (d) {
      const s = d3.select(this);
      s.append("text").attr("class", "c-head").attr("x", bigW + 24).attr("y", 36).text(d.label);
      const t = s.append("text").attr("class", "c-label").attr("fill", C.ink).text(d.body);
      wrap(t, bigW + 24, 60, Math.floor((innerW - bigW - 48) / 7), 18);
    });
    source(g, innerH, cfg.source);
    return { step() { cards.transition().delay((d, i) => i * 350).duration(600).attr("opacity", 1); } };
  }

  function justiceChart(sel) {
    return cardsChart(sel, {
      title: "Who pays, who benefits?",
      sub: "Climate harm lands first on communities the models are not built for",
      source: "Bender et al. 2021, §3 & §2",
      items: [
        { big: "2100", color: C.blue, label: "The Maldives", body: "Likely to be underwater by 2100. Is it fair to ask them to pay the environmental price of ever larger English models?" },
        { big: "800k", color: C.orange, label: "Sudan", body: "People affected by drastic floods, yet no comparable large models are built for Sudanese Arabic — or Dhivehi." },
        { big: ">90%", color: C.teal, label: "Of the world's languages", body: "Used by more than a billion people, they have little to no language-technology support." },
      ],
    });
  }

  function caseCardsChart(sel) {
    return cardsChart(sel, {
      title: "When fluent text goes wrong",
      sub: "Three ways form without meaning can hurt real people",
      source: "Bender et al. 2021, §6",
      items: [
        { big: "1", color: C.red, label: "Wrongful arrest", body: "A Palestinian man's Arabic “good morning” was machine-translated as “hurt them” (English) and “attack them” (Hebrew). He was arrested." },
        { big: "2", color: C.orange, label: "Bot propaganda", body: "Fluent, plausible text at scale makes fake accounts and extremist recruitment cheap to produce." },
        { big: "3", color: C.gold, label: "Privacy leaks", body: "Very large models model their training data so closely that they can be prompted to output specific information from it." },
      ],
    });
  }

  /* ---------- Chart 4: Who is in the data? (paper §4) ---------- */
  function whoChart(sel) {
    const { g, innerW, innerH } = svgRoot(sel);
    header(g, "Whose voices make up “the internet”?", "Share of each group, in %");
    const x = d3.scaleLinear().domain([0, 100]).range([0, innerW]);
    const data = [
      { label: "US Reddit users who are men", v: 67, lo: 67, color: C.blue, note: "GPT-2 training data is scraped from Reddit links" },
      { label: "US Reddit users aged 18–29", v: 64, lo: 64, color: C.teal, note: "" },
      { label: "Wikipedia editors who are women or girls", v: 15, lo: 8.8, color: C.orange, note: "8.8–15%, depending on the survey" },
      { label: "Languages (of 1B+ speakers) with little or no tech support", v: 90, lo: 90, color: C.red, note: "“over 90%”" },
    ];
    const rh = innerH / data.length;
    const bars = [];
    data.forEach((d, i) => {
      const y0 = i * rh + 10;
      g.append("text").attr("class", "c-label").attr("fill", C.ink).attr("x", 0).attr("y", y0).text(d.label);
      g.append("rect").attr("x", 0).attr("y", y0 + 10).attr("width", innerW).attr("height", 34).attr("rx", 6).attr("fill", "rgba(255,255,255,0.05)");
      const lo = g.append("rect").attr("x", 0).attr("y", y0 + 10).attr("width", 0).attr("height", 34).attr("rx", 6).attr("fill", d.color);
      const hi = g.append("rect").attr("x", 0).attr("y", y0 + 10).attr("width", 0).attr("height", 34).attr("rx", 6).attr("fill", d.color).attr("opacity", 0.45);
      const val = g.append("text").attr("class", "c-val").attr("y", y0 + 33).attr("x", 10).attr("opacity", 0)
        .text(d.lo === d.v ? d.v + "%" : d.lo + "–" + d.v + "%");
      if (d.note) g.append("text").attr("class", "c-src").attr("x", 0).attr("y", y0 + 62).text(d.note);
      bars.push({ lo, hi, val, d });
    });
    source(g, innerH, "Bender et al. 2021, §4 (Pew Internet Research 2016; Wikipedia surveys)");
    return {
      step() {
        bars.forEach((o, i) => {
          o.hi.transition().delay(i * 250).duration(900).attr("width", x(o.d.v));
          o.lo.transition().delay(i * 250).duration(900).attr("width", x(o.d.lo));
          o.val.transition().delay(i * 250 + 700).attr("opacity", 1);
        });
      },
    };
  }

  /* ---------- Chart 5: The bad-word filter (paper §4.1) ---------- */
  function filterChart(sel) {
    const { g, innerW, innerH } = svgRoot(sel);
    header(g, "Filtered silence", "A list of ~400 “bad words” decides which web pages never reach the model");

    g.append("text").attr("class", "c-huge").attr("x", 0).attr("y", 30).attr("fill", C.gold).text("~400");
    g.append("text").attr("class", "c-label").attr("x", 110).attr("y", 14).text("“Dirty, Naughty, Obscene or Otherwise Bad Words”");
    g.append("text").attr("class", "c-label").attr("x", 110).attr("y", 34).text("mostly sexual terms, plus a handful of slurs");

    const pages = [
      { t: "Pornography site", s: "contains listed words", intended: true },
      { t: "Hate-speech forum", s: "contains listed words", intended: true },
      { t: "LGBTQ+ community blog", s: "uses reclaimed words like “twink”", intended: false },
      { t: "Local cooking blog", s: "no listed words", keep: true },
    ];
    const top = 70, gap = 14, ch = Math.min(92, (innerH - top - 60 - gap * 3) / 4);
    let on = false;
    const rowG = g.selectAll("g.page").data(pages).enter().append("g").attr("class", "page")
      .attr("transform", (d, i) => `translate(0,${top + i * (ch + gap)})`);
    const rects = rowG.append("rect").attr("width", innerW).attr("height", ch).attr("rx", 10)
      .attr("fill", "rgba(255,255,255,0.06)").attr("stroke", "rgba(255,255,255,0.18)");
    const titles = rowG.append("text").attr("class", "c-head").attr("x", 18).attr("y", ch / 2 - 4).text(d => d.t);
    rowG.append("text").attr("class", "c-label").attr("x", 18).attr("y", ch / 2 + 18).text(d => d.s);
    const badge = rowG.append("text").attr("class", "c-val").attr("x", innerW - 16).attr("y", ch / 2 + 6)
      .attr("text-anchor", "end").attr("opacity", 0);

    const bt = top + 4 * (ch + gap) + 6;
    const btn = g.append("g").attr("transform", `translate(0,${bt})`).style("cursor", "pointer");
    const btnR = btn.append("rect").attr("width", 190).attr("height", 38).attr("rx", 19).attr("fill", "rgba(255,255,255,0.1)").attr("stroke", C.gold);
    const btnT = btn.append("text").attr("class", "c-val").attr("x", 95).attr("y", 24).attr("text-anchor", "middle").attr("fill", C.gold);
    const verdict = g.append("text").attr("class", "c-label").attr("x", 210).attr("y", bt + 24).attr("fill", C.red);

    function apply(animate) {
      const tr = s => animate ? s.transition().duration(600) : s;
      tr(rowG).attr("opacity", d => on && !d.keep ? 0.3 : 1);
      tr(rects).attr("stroke", d => on && !d.keep ? (d.intended ? C.grey : C.red) : "rgba(255,255,255,0.18)")
        .attr("stroke-width", d => on && d.intended === false ? 3 : 1);
      badge.attr("opacity", on ? 1 : 0)
        .attr("fill", d => d.keep ? C.teal : d.intended ? C.grey : C.red)
        .text(d => d.keep ? "kept ✓" : d.intended ? "removed (intended)" : "removed — voices lost");
      titles.style("text-decoration", d => on && !d.keep ? "line-through" : "none");
      btnT.text(on ? "Filter: ON  (click to undo)" : "Turn the filter ON");
      btnR.attr("fill", on ? "rgba(255,209,102,0.2)" : "rgba(255,255,255,0.1)");
      verdict.text(on ? "A community's own voice is erased." : "");
    }
    btn.on("click", () => { on = !on; apply(true); });
    apply(false);
    g.append("text").attr("class", "c-src").attr("x", 0).attr("y", innerH + 20).text("Example pages are illustrative.");
    source(g, innerH, "Bender et al. 2021, §4.1 (C4 corpus)");
    return { step() { setTimeout(() => { if (!on) { on = true; apply(true); } }, 900); } };
  }

  function parrotChart(sel) {
    const { svg, g, w, h } = svgRoot(sel);
    header(g, "The fluent parrot", "It sounds confident — but there is no understanding behind the words");
    // g is already translated by the chart margins → centre within the
    // inner area, not the raw viewport.
    const cx = (w - M.left - M.right) / 2;
    // R sets the character scale: the artwork is ≈2.5R wide and ≈2.6R tall,
    // so R ≈ 0.14 × stage keeps it comfortably inside the viewport.
    const R = Math.min(w, h) * 0.14;
    const baseX = cx, baseY = (h - M.top - M.bottom) / 2;

    // subtle gridlines behind ("patterns in noise")
    const grid = g.append("g").attr("class", "gridlines").attr("opacity", 0.1).attr("stroke", "#9aa5b8").attr("fill", "none");
    for (let n = -7; n <= 7; n++) {
      grid.append("line").attr("x1", n * 26 + baseX).attr("y1", baseY - 2 * R).attr("x2", n * 26 + baseX).attr("y2", baseY + 4 * R);
    }

    // The OpenMoji parrot spans roughly x:[11,62], y:[4.5,57] in a 72-box
    // → center at (36.5, 31), approx width 51px.
    const VB_W = 51, VB_H = 52.5;
    const originX = 11, originY = 4.5;
    const scale = (R * 1.25) / (VB_W / 2);

    const parrotG = g.append("g")
      .attr("transform", `translate(${baseX},${baseY})`);
    // Dedicated layers so each transform lives on its own group:
    // parrotG = position · swayG = idle sway · hopG = hop.
    const swayG = parrotG.append("g");
    const hopG = swayG.append("g");

    const inner = hopG.append("g")
      .attr("transform", `translate(${-(originX + VB_W / 2) * scale}, ${-(originY + VB_H / 2) * scale}) scale(${scale})`);

    // Embed the artwork robustly: parse as SVG document, import as DOM node.
    const artDoc = new DOMParser().parseFromString(PARROT_SVG, "image/svg+xml");
    const artNode = document.importNode(artDoc.documentElement, true);
    inner.node().appendChild(artNode);

    // Idle sway on its own layer (rotate around the character centre).
    let swayDir = 1;
    (function sway() {
      swayG.transition()
        .duration(1600).ease(d3.easeSinInOut)
        .attr("transform", `rotate(${swayDir * 2.5})`)
        .on("end", () => { swayDir *= -1; sway(); });
    })();

    // Eye position in viewBox units, taken from the artwork geometry.
    // The parrot's visible eye sits in the red head around the white
    // highlight ("glint") path centred near x≈33, y≈15.
    const eyeSpot = [33, 15];

    function placePupil(selection, spot) {
      selection
        .attr("cx", scale * (spot[0] - (originX + VB_W / 2)))
        .attr("cy", scale * (spot[1] - (originY + VB_H / 2)));
    }

    // A small eye ensemble on the near-side eye: a static white sclera +
    // an orbiting black pupil. Placed in hopG so it moves with the hop.
    const sclera = hopG.append("circle")
      .attr("fill", "#fff").attr("stroke", "#10141c").attr("stroke-width", Math.max(1, scale * 0.5))
      .attr("r", scale * 2.2);
    const pupil = hopG.append("circle")
      .attr("r", scale * 1.1)
      .attr("fill", "#10141c");

    placePupil(sclera, eyeSpot);
    placePupil(pupil, eyeSpot);

    // --- speech line (below the character) ---
    const bubble = g.append("text")
      .attr("text-anchor", "middle")
      .attr("x", baseX)
      .attr("y", baseY + R * 2.6)
      .attr("fill", "#fff")
      .style("font-size", 16)
      .style("font-family", "Newsreader, Georgia, serif");

    const states = [
      { text: "I can tell you how to vote.", kind: "confident" },
      { text: "I write believable news articles.", kind: "confident" },
      { text: "Two plus two is four.", kind: "confident" },
      { text: "I am a thinking machine.", kind: "confident" },
      { text: "…but I don't actually understand it.", kind: "hollow" },
      { text: "pluck pluck caw caw· random· tokens.", kind: "hollow" },
    ];
    let idx = 0;

    function renderState(st) {
      const hollow = st.kind === "hollow";
      bubble.interrupt().transition().duration(300).attr("opacity", 0).ease(d3.easeLinear).end()
        .catch(() => {})
        .then(() => {
          bubble
            .text(st.text)
            .attr("stroke", hollow ? "#f05c7a" : "none")
            .attr("stroke-width", hollow ? 0.6 : 0)
            .transition().duration(300).attr("opacity", 1);
        });
    }

    // cursor-tracking pupil (only when pointer is over the chart area)
    d3.select("#chart").on("mousemove", function (ev) {
      const rect = this.getBoundingClientRect();
      const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
      let dx = mx - baseX, dy = my - baseY;
      const len = Math.hypot(dx, dy) || 1;
      const clamp = scale * 1.5;
      placePupil(pupil, eyeSpot);
      pupil.attr("cx", scale * (eyeSpot[0] - (originX + VB_W / 2)) + (dx / len) * clamp);
      pupil.attr("cy", scale * (eyeSpot[1] - (originY + VB_H / 2)) + (dy / len) * clamp);
    });

    renderState(states[0]);

    // step(s): 0 = auto-cycle the confident lines; 4/5 = fixed "hollow" lines
    let timer = null;
    function show(i) {
      idx = i;
      renderState(states[idx]);
      const hollow = states[idx].kind === "hollow";
      parrotG.transition().duration(500)
        .style("filter", hollow ? "grayscale(1) brightness(0.8)" : "none")
        .attr("opacity", hollow ? 0.6 : 1);
      hopG.interrupt()
        .transition().duration(140).ease(d3.easeQuadOut)
        .attr("transform", "translate(0,-8)")
        .transition().duration(200)
        .attr("transform", "translate(0,0)");
    }

    return {
      step(s) {
        if (timer) { clearInterval(timer); timer = null; }
        s = s || 0;
        show(s);
        if (s === 0) {
          timer = setInterval(() => {
            if (!g.node().isConnected) { clearInterval(timer); return; }
            show((idx + 1) % 4);
          }, 2400);
        }
      },
    };
  }

  function autocompleteChart(sel) {
    const { g, innerW, innerH } = svgRoot(sel);
    const START = "The doctor said";
    header(g, "Next-word roulette", "Click a candidate. The model only ever picks what is likely, never what is true.");
    g.append("text").attr("class", "c-src").attr("x", 0).attr("y", innerH + 44).text("Probabilities are illustrative, not from the paper.");

    const compact = innerW < 560;

    // longer sentences shrink so they never clip (the "that …" branches run long)
    function chipSize(s) {
      const big = compact ? 22 : 26, mid = compact ? 15 : 17, small = compact ? 13 : 14;
      return s.length > 44 ? small : s.length > 32 ? mid : big;
    }

    // --- the parrot (standing in for the LLM) says the sentence you assemble ---
    const VB_W = 51, VB_H = 52.5, PCX = 36.5, PCY = 30.75;
    const PH = compact ? 40 : Math.min(210, innerH * 0.32);
    const pScale = PH / VB_H;
    const parrotX = innerW - (compact ? 30 : 80);
    const parrotY = compact ? 92 : Math.round(innerH * 0.45);   // art-centre position
    const parrotG = g.append("g").attr("transform", `translate(${parrotX},${parrotY})`);
    parrotG.append("g")
      .attr("transform", `scale(${pScale}) translate(${-PCX},${-PCY})`)
      .node().appendChild(document.importNode(
        new DOMParser().parseFromString(PARROT_SVG, "image/svg+xml").documentElement, true));

    // Eye ensemble on the near-side eye, same as parrotChart: the visible eye
    // sits in the red head around the white glint at viewBox ≈ (33, 15).
    const eyeSpot = [33, 15];
    const eyeXY = [pScale * (eyeSpot[0] - PCX), pScale * (eyeSpot[1] - PCY)];
    parrotG.append("circle")
      .attr("cx", eyeXY[0]).attr("cy", eyeXY[1])
      .attr("r", pScale * 2.2)
      .attr("fill", "#fff").attr("stroke", "#10141c")
      .attr("stroke-width", Math.max(1, pScale * 0.5));
    parrotG.append("circle")
      .attr("cx", eyeXY[0]).attr("cy", eyeXY[1])
      .attr("r", pScale * 1.1)
      .attr("fill", "#10141c");

    const beak = [parrotX - (VB_W / 2) * pScale * 0.55, parrotY - (VB_H / 2) * pScale * 0.52];

    // --- current sentence, rendered as the parrot's speech bubble ---
    const sentenceG = g.append("g").attr("transform", `translate(0, 40)`);
    const bRect = sentenceG.append("rect").attr("rx", 12)
      .attr("fill", "rgba(255,255,255,0.07)").attr("stroke", "rgba(255,255,255,0.28)")
      .attr("stroke-width", 1.2);
    const bTail = sentenceG.append("path").attr("fill", "rgba(255,255,255,0.07)");
    const voice = sentenceG.append("line").attr("stroke", C.grey).attr("stroke-width", 1.2)
      .attr("stroke-dasharray", "3 5").attr("opacity", 0.7);
    const chips = sentenceG.append("text")
      .attr("class", "c-head")
      .style("font-size", chipSize(START) + "px")
      .attr("x", 0).attr("y", 0)
      .text(START);

    // fit the bubble around the sentence and run the voice line to the beak
    function layoutBubble() {
      const bb = chips.node().getBBox();
      const px = compact ? 10 : 14, py = compact ? 8 : 11;
      const x = bb.x - px, y = bb.y - py, w = bb.width + 2 * px, h = bb.height + 2 * py;
      const cy = bb.y + bb.height / 2;
      bRect.attr("x", x).attr("y", y).attr("width", w).attr("height", h);
      bTail.attr("d", `M${x + w - 2},${cy - 6} L${x + w + (compact ? 12 : 18)},${cy} L${x + w - 2},${cy + 6} Z`);
      voice.attr("x1", x + w + (compact ? 12 : 18)).attr("y1", cy + 40)
        .attr("x2", beak[0]).attr("y2", beak[1]);
    }
    layoutBubble();

    // --- candidate bars ---
    // spread across the stage: bubble on top, bars centre-left, big parrot right
    const barX = compact ? 128 : 170;    // bars start after the word labels
    const barMaxW = compact ? Math.min(innerW - barX - 24, 190)
                            : Math.min(innerW - barX - 170, 340);
    const barH = compact ? 32 : 44, barGap = compact ? 16 : 26;
    const candY = compact ? 150 : Math.round(innerH * 0.52);
    const candG = g.append("g").attr("transform", `translate(0, ${candY})`);

    let sentence = START;

    function renderCandidates() {
      const options = AUTOCOMPLETE_STEPS[sentence];
      candG.selectAll("*").remove();

      candG.selectAll("text.label")
        .data(options).enter()
        .append("text")
        .attr("class", "label")
        .attr("x", 0)
        .attr("y", (d, i) => i * (barH + barGap) + barH / 2)
        .attr("dy", "0.35em")
        .attr("fill", "#fff")
        .style("font-size", compact ? 16 : 18)
        .style("font-weight", 700)
        .text(d => d[0]);

      candG.selectAll("rect.bar")
        .data(options).enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", barX)
        .attr("y", (d, i) => i * (barH + barGap))
        .attr("width", 0)
        .attr("height", barH)
        .attr("rx", 6)
        .attr("fill", "#ffd166")
        .attr("opacity", 0.85)
        .style("cursor", "pointer")
        .transition().duration(600)
        .attr("width", d => (d[1] / 50) * barMaxW);

      candG.selectAll("text.pct")
        .data(options).enter()
        .append("text")
        .attr("class", "pct")
        .attr("x", barX + 8)
        .attr("y", (d, i) => i * (barH + barGap) + barH / 2)
        .attr("dy", "0.35em")
        .attr("fill", "#10141c")
        .style("font-size", compact ? 13 : 15)
        .style("font-weight", 700)
        .style("pointer-events", "none")
        .text(d => d[1] + "%");

      candG.selectAll("rect.hit")
        .data(options).enter()
        .append("rect")
        .attr("class", "hit")
        .attr("x", barX)
        .attr("y", (d, i) => i * (barH + barGap))
        .attr("width", barMaxW)
        .attr("height", barH)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("click", (ev, d) => pick(d[0]));
    }

    function pick(word) {
      sentence = sentence + " " + word;
      chips.data([sentence]).text(sentence);
      chips.style("font-size", chipSize(sentence) + "px");
      layoutBubble();
      if (AUTOCOMPLETE_STEPS[sentence]) {
        renderCandidates();
      } else {
        // finished: hollow punchline, centred on the stage
        const endY = Math.round(innerH * 0.5) - candY;   // candG is already offset by candY
        const lh = compact ? 18 : 22;
        candG.selectAll("*").remove();
        const pl = candG.append("text")
          .attr("class", "c-head")
          .attr("x", 0).attr("y", endY)
          .attr("fill", "#f05c7a")
          .style("font-style", "italic")
          .style("font-size", (compact ? 15 : 19) + "px")
          .text(AUTOCOMPLETE_ENDING);
        const plines = wrap(pl, 0, endY, compact ? 30 : 44, lh);
        candG.append("text")
          .attr("x", 0).attr("y", endY + plines * lh + 26)
          .attr("fill", "#9aa5b8")
          .style("font-size", 13)
          .text("Model's understanding of the sentence so far: 0% (illustrative)");
        candG.append("text")
          .attr("x", 0).attr("y", endY + plines * lh + 54)
          .attr("fill", "#ffd166")
          .style("font-size", 13)
          .style("cursor", "pointer")
          .text("↺ play again")
          .on("click", () => {
            sentence = START;
            chips.data([START]).text(START);
            chips.style("font-size", chipSize(START) + "px");
            layoutBubble();
            renderCandidates();
          });
      }
    }

    renderCandidates();

    return { step() { /* user-driven interaction; scroll step keeps state */ } };
  }


  /* ---------- Tooltip helpers ---------- */
  function showTip(ev, d) {
    const dataLabel = d.dataGB ? `${d.dataGB} GB` : "n/a";
    d3.select("#tooltip").style("opacity", 1)
      .html(`<strong>${d.name}</strong><span class="tt-sub">${d.year} · ${formatParams(d.params)} parameters</span><br>training data: ${dataLabel}`);
    moveTip(ev);
  }
  function moveTip(ev) {
    d3.select("#tooltip").style("left", (ev.clientX + 16) + "px").style("top", (ev.clientY + 16) + "px");
  }
  function hideTip() { d3.select("#tooltip").style("opacity", 0); }

  function formatParams(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + " trillion";
    if (n >= 1e9) return (n / 1e9).toFixed(0) + " billion";
    if (n >= 1e6) return (n / 1e6).toFixed(0) + " million";
    return n;
  }
  function rScale(params) {
    const t = (Math.log10(params) - 7) / (12.5 - 7);
    return 7 + t * 30;
  }

  /* ---------- Chart: How parrots are born (4-step pipeline, §1 @Erik) ---------- */
  /* The pipeline as a literal birth: an egg (the unfiltered web inside) rides
     the assembly line, cracks under training pressure, hatches into a grey
     chick that babbles fluent fragments, and leaves the line as a full parrot
     talking "…but without any reference to meaning." (§6.1).
     Life stages: 01–02 egg, 03 chick, 04 parrot. The birth is our illustration
     of the paper's narrative arc (§1, §6.1). */
  function birthChart(sel) {
    const { innerW, innerH, g } = svgRoot(sel);
    header(g, "How parrots are born", "Four steps from raw text to fluent, meaningless speech");
    const compact = innerW < 560;

    const steps = [
      { n: "01", title: "Collect the web", color: C.blue },
      { n: "02", title: "Train at scale", color: C.teal },
      { n: "03", title: "Generate fluency", color: C.orange },
      { n: "04", title: "Impute understanding", color: C.gold },
    ];
    const n = steps.length;
    const pad = compact ? 26 : 54;
    const sx = d3.scalePoint().domain(d3.range(n)).range([pad, innerW - pad]);
    const beltY = Math.min(innerH * (compact ? 0.55 : 0.5), innerH - 92);
    const r = compact ? 34 : 48;
    const numF = compact ? 18 : 26;
    const titleF = compact ? 11 : 13.5;

    // belt + animated dashes flowing towards the creature
    g.append("line").attr("x1", sx(0)).attr("y1", beltY).attr("x2", sx(n - 1)).attr("y2", beltY)
      .attr("stroke", "rgba(255,255,255,0.16)").attr("stroke-width", 2);
    const flow = g.append("line").attr("x1", sx(0)).attr("y1", beltY).attr("x2", sx(n - 1)).attr("y2", beltY)
      .attr("stroke", C.orange).attr("stroke-width", 2).attr("stroke-linecap", "round")
      .attr("stroke-dasharray", "8 22").attr("opacity", 0.75);
    (function flowLoop() {
      flow.transition().duration(1400).ease(d3.easeLinear).attr("stroke-dashoffset", -30)
        .on("end", () => { flow.attr("stroke-dashoffset", 0); flowLoop(); });
    })();

    const stations = g.selectAll("g.station").data(steps).enter().append("g").attr("class", "station")
      .attr("transform", (d, i) => `translate(${sx(i)},${beltY})`);
    stations.append("circle").attr("r", r)
      .attr("fill", "rgba(255,255,255,0.04)")
      .attr("stroke", "rgba(255,255,255,0.2)");
    stations.append("text").attr("class", "c-big").attr("text-anchor", "middle").attr("y", 5)
      .attr("font-size", numF).attr("fill", C.grey).text(d => d.n);
    stations.append("text").attr("text-anchor", "middle").attr("y", r + 14)
      .attr("font-size", titleF).attr("fill", C.ink).text(d => d.title);
    if (!compact) {
      stations.append("text").attr("text-anchor", "middle").attr("y", r + 32)
        .attr("font-size", 10.5).attr("fill", C.grey)
        .each(function (d) { wrap(d3.select(this), 0, r + 32, 30, 12); });
    }

    // ---- the creature that rides the line: egg → cracks → chick → parrot ----
    const R = compact ? 22 : Math.min(44, innerH * 0.16);
    const VB_W = 51, VB_H = 52.5, originX = 11, originY = 4.5;
    const CX = originX + VB_W / 2, CY = originY + VB_H / 2;
    const scale = (R * 1.25) / (VB_W / 2);
    const footY = (VB_H / 2) * scale;   // shared ground line for every life stage

    const actor = g.append("g").attr("class", "parrot-g");

    // embeds the OpenMoji art at scale s2, with its feet resting on footY
    function artAt(parent, s2) {
      const gg = parent.append("g");
      gg.append("g")
        .attr("transform", `translate(0,${footY - (VB_H / 2) * s2}) scale(${s2}) translate(${-CX},${-CY})`)
        .node().appendChild(document.importNode(
          new DOMParser().parseFromString(PARROT_SVG, "image/svg+xml").documentElement, true));
      return gg;
    }

    // --- stages 01–02: the egg (speckled with the unfiltered web) ---
    const eggRx = R * 0.78, eggRy = R * 1.02, eggCY = footY - eggRy;
    const eggG = actor.append("g");
    const eggShake = eggG.append("g");
    eggShake.append("ellipse").attr("cx", 0).attr("cy", eggCY)
      .attr("rx", eggRx).attr("ry", eggRy)
      .attr("fill", "#efe9dc").attr("stroke", "rgba(255,255,255,0.35)").attr("stroke-width", 1.5);
    [[-0.32, -0.3, C.blue, 0.42], [0.25, -0.05, C.teal, 0.5], [-0.1, 0.28, C.orange, 0.45],
     [0.38, 0.32, C.blue, 0.35], [-0.42, 0.05, C.teal, 0.3]].forEach(([fx, fy, col, op]) => {
      eggShake.append("circle").attr("cx", fx * eggRx).attr("cy", eggCY + fy * eggRy)
        .attr("r", R * 0.085).attr("fill", col).attr("opacity", op);
    });
    const cracks = eggShake.append("g").attr("fill", "none")
      .attr("stroke", "#33302a").attr("stroke-width", 1.6).attr("stroke-linejoin", "round");
    const crackPaths = [
      `M0,${eggCY - eggRy * 0.86} l${eggRx * 0.16},${eggRy * 0.2} l${-eggRx * 0.22},${eggRy * 0.2} l${eggRx * 0.24},${eggRy * 0.22}`,
      `M${-eggRx * 0.12},${eggCY - eggRy * 0.36} l${-eggRx * 0.3},${eggRy * 0.14} l${eggRx * 0.08},${eggRy * 0.2}`,
      `M${eggRx * 0.2},${eggCY - eggRy * 0.28} l${eggRx * 0.28},${eggRy * 0.2}`,
    ].map(d => cracks.append("path").attr("d", d).node());
    const crackLen = crackPaths.map(p => p.getTotalLength());
    crackPaths.forEach((p, i) => {
      p.setAttribute("stroke-dasharray", crackLen[i]);
      p.setAttribute("stroke-dashoffset", crackLen[i]);
    });

    // --- stage 03: the chick hatches (pale grey: fluent, but nothing behind it) ---
    const chickG = actor.append("g");
    artAt(chickG, scale * 0.78).style("filter", "grayscale(1) brightness(1.5)").attr("opacity", 0.95);
    chickG.append("path")
      .attr("d", d3.arc().innerRadius(0).outerRadius(eggRx * 1.05).startAngle(0).endAngle(Math.PI)())
      .attr("transform", `translate(0,${footY - R * 0.42})`)
      .attr("fill", "#efe9dc").attr("stroke", "rgba(255,255,255,0.35)").attr("stroke-width", 1.5);

    // --- stage 04: the parrot leaves the line, talking ---
    const parrotArt = artAt(actor, scale);

    // shared speech bubble: the chick babbles at 03, the punchline lands at 04
    const bubble = g.append("text").attr("text-anchor", "middle")
      .attr("x", innerW / 2).attr("y", beltY + r + (compact ? 34 : 78))
      .attr("fill", C.red).style("font-family", "Newsreader, Georgia, serif")
      .style("font-size", compact ? 13 : 17).attr("opacity", 0);

    function stageFor(i) { return i <= 1 ? eggG : i === 2 ? chickG : parrotArt; }
    function showStage(idx, dur) {
      [eggG, chickG, parrotArt].forEach(gg => {
        gg.interrupt().transition().duration(dur).attr("opacity", gg === stageFor(idx) ? 1 : 0);
      });
    }
    function shake(on) {
      eggShake.interrupt().attr("transform", `rotate(0,0,${eggCY})`);
      if (!on) return;
      (function loop() {
        eggShake.transition().duration(260).ease(d3.easeSinInOut)
          .attr("transform", `rotate(2.4,0,${eggCY})`)
          .transition().duration(260).ease(d3.easeSinInOut)
          .attr("transform", `rotate(-2.4,0,${eggCY})`)
          .on("end", loop);
      })();
    }
    function drawCracks(draw, dur) {
      crackPaths.forEach((p, i) => {
        d3.select(p).interrupt().transition().duration(draw ? dur : 0).delay(draw ? i * 180 : 0)
          .attr("stroke-dashoffset", draw ? 0 : crackLen[i]);
      });
    }
    function setBubble(idx, dur) {
      const line = idx === 3
        ? { t: "…but without any reference to meaning.", c: C.red, fs: compact ? 13 : 17 }
        : idx === 2
          ? { t: "“the doctor said…  the doctor said…”", c: C.grey, fs: compact ? 12 : 15 }
          : null;
      bubble.interrupt();
      if (!line) { bubble.transition().duration(dur).attr("opacity", 0); return; }
      bubble.text(line.t).attr("fill", line.c).style("font-size", line.fs + "px")
        .attr("opacity", 0).transition().duration(dur).attr("opacity", 1);
    }

    function setActive(idx, animate) {
      const dur = animate ? 600 : 0;
      stations.select("circle").transition().duration(dur)
        .attr("fill", (d, i) => i <= idx ? d.color : "rgba(255,255,255,0.04)")
        .attr("fill-opacity", (d, i) => i < idx ? 0.22 : i === idx ? 0.32 : 1)
        .attr("stroke", (d, i) => i === idx ? "#e8ecf3" : i < idx ? d.color : "rgba(255,255,255,0.2)")
        .attr("stroke-width", (d, i) => i === idx ? 3 : 1.5);
      stations.selectAll("text").transition().duration(dur)
        .attr("fill", (d, i) => i < idx ? C.teal : i === idx ? "#fff" : C.grey);
      const tx = sx(idx), ty = beltY - r - R * 1.15;
      if (animate) {
        actor.interrupt().transition().duration(900).ease(d3.easeCubicInOut)
          .attr("transform", `translate(${tx},${ty})`);
      } else {
        actor.attr("transform", `translate(${tx},${ty})`);
      }
      showStage(idx, animate ? 350 : 0);
      shake(idx === 1);
      drawCracks(idx >= 1, 700);
      setBubble(idx, animate ? 400 : 0);
    }

    setActive(0, false);
    return {
      step(s) {
        const idx = Math.max(0, Math.min(n - 1, (s || 1) - 1));
        setActive(idx, true);
      },
    };
  }

  /* ---------- Chart: Closing question (Paths Forward, owners ALL) ---------- */
  function faqChart(sel) {
    const { g, innerW, innerH } = svgRoot(sel);
    header(g, "Is bigger inevitable?", "The closing challenge of the paper");
    const compact = innerW < 560;
    const x = innerW / 2;
    const body = g.append("g").attr("opacity", 0);

    body.append("text").attr("class", "c-huge").attr("x", x).attr("y", innerH * 0.3)
      .attr("text-anchor", "middle").style("font-size", (compact ? 66 : 110) + "px").attr("fill", C.orange).text("?");

    const qY = innerH * 0.3 + (compact ? 74 : 128);
    const quote = body.append("text").attr("x", x).attr("y", qY)
      .attr("text-anchor", "middle")
      .style("font-family", "Newsreader, Georgia, serif")
      .style("font-size", compact ? 16 : 21)
      .attr("fill", C.ink);
    quote.selectAll("tspan").data([
      "“It may seem like progress depends on the",
      "creation of ever larger language models.”",
    ]).enter().append("tspan")
      .attr("x", x).attr("y", (d, i) => qY + i * (compact ? 22 : 28))
      .attr("text-anchor", "middle").text(d => d);

    body.append("text").attr("x", x).attr("y", qY + (compact ? 62 : 86))
      .attr("text-anchor", "middle").attr("font-size", compact ? 11 : 13)
      .attr("fill", C.grey).text("The paper asks us to look for other answers → §7 Paths Forward");
    source(g, innerH, "Bender et al. 2021, §8 (conclusion)");

    return { step() { body.transition().duration(800).attr("opacity", 1); } };
  }

  return { bubbleChart, co2Chart, computeChart, envIntroChart, envLifecycleChart, envTradeoffChart, envJusticeChart, justiceChart, whoChart, filterChart, parrotChart, autocompleteChart, caseCardsChart, birthChart, faqChart };
})();
