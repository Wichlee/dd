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

  /* ----------------------------------------------------------------------
     Chart 6: The hollow parrot.
     Uses the free OpenMoji parrot artwork (CC-BY-SA 4.0), embedded inline
     (no remote load). A dark pupil tracks the cursor, the track/crest can
     sway, and the speech line cycles between confident "intelligence"
     and hollow failure.
  ---------------------------------------------------------------------- */
  const PARROT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72"><g id="parrotcolor"><path fill="#d22f27" d="M31.6975,20.781a7.3117,7.3117,0,0,1-3.0456-5.8955,7.5631,7.5631,0,0,1,7.6947-7.424,7.7334,7.7334,0,0,1,7.689,7.1139c.1765,3.1324.0058,6.3177.0058,9.455v1.7054c1.5,1.79,4.0184,5.4063,5.919,15.99.4,2.2264,4.4292,12.201,4.7353,15.99-.7893.3807-1.5784,1.9036-2.3677,2.2843-.4122-1.7023-4.8688-12.1253-7.1028-13.7057a8.471,8.471,0,0,0-2.3676-1.1421c-2.1077-.71-3.9029-1.3173-5.429-1.89a6.0469,6.0469,0,0,1-2.8577.7475c-4.5765,0-8.2866-5.3692-8.2866-11.9924C26.2843,26.8587,28.54,22.4737,31.6975,20.781Z"/><path fill="#f1b31c" d="M27.8238,16.864l-.003-.0145,1.7367,2.2186a3.4693,3.4693,0,0,1-5.3388-.749Z"/><path fill="#1e50a0" d="M30.962,27.6954c-.0026.1084-.0181.2156-.0178.3242a11.7726,11.7726,0,0,0,.9309,4.5612,19.4463,19.4463,0,0,0,5.5989,7.0507A25.4882,25.4882,0,0,0,44.38,43.8307a23.78,23.78,0,0,0,5.1828,1.3938c.2907,1.1925.9688,3.3188.6421,4.1158-.55,1.3419-5.7909-.4749-6.967-.941A25.4938,25.4938,0,0,1,36.3318,44.2a19.4484,19.4484,0,0,1-5.5989-7.0507,11.7731,11.7731,0,0,1-.9308-4.5613A10.3962,10.3962,0,0,1,30.962,27.6954Z"/><path fill="#fcea2b" d="M28.7246,10.9187a7.3027,7.3027,0,0,0-.8762,5.9453L23.08,18.779A7.48,7.48,0,0,1,23,17.7408,6.6464,6.6464,0,0,1,28.7246,10.9187Z"/><path fill="#fff" d="M31,10c-.1248-.0181-.2732-.02-.4079-.0312A7.2164,7.2164,0,0,0,31.6974,20.781c-.0874.0469-.1714.1034-.2575.1544A8.1279,8.1279,0,0,0,37,18a6.5956,6.5956,0,0,0,1-2C37.6238,15.2173,35.3359,10.63,31,10Z"/></g><g id="parrotline"><path fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M27.8484,16.864,23.08,18.779A7.48,7.48,0,0,1,23,17.7408a6.6464,6.6464,0,0,1,5.7246-6.8221"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M52.769,53.4211a24.8711,24.8711,0,0,1,.9267,4.2946c-.7615.3807-1.5229,1.9036-2.2843,2.2843a50.4224,50.4224,0,0,0-2.282-5.8286C48.4063,52.548,47.48,51.4162,46.6957,50"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M29.5575,19.0681a3.4693,3.4693,0,0,1-5.3388-.749"/><line x1="34.6957" x2="34.6957" y1="45" y2="52" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><line x1="57.0873" x2="61" y1="52" y2="52" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><line x1="13" x2="42.9895" y1="52.1722" y2="52.1722" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M34.2793,44.01c-4.4155,0-7.995-5.3692-7.995-11.9924,0-5.1589,2.1758-9.5439,5.2226-11.2366A7.4106,7.4106,0,0,1,35.9924,7.4615a7.5768,7.5768,0,0,1,7.4184,7.1139c.12,2.2168.0732,4.46.0353,6.6942-.0156.9227-.03,1.8438-.03,2.7608v1.7054"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M31.6974,20.781c-.0874.0469-.1714.1034-.2575.1544A8.1279,8.1279,0,0,0,37,18a6.5956,6.5956,0,0,0,1-2c-.3762-.7827-2.6641-5.37-7-6-.1248-.0181-.2732-.02-.4079-.0312"/><line x1="40.6957" x2="40.6957" y1="48" y2="52" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></g></svg>`;

  function parrotChart(sel) {
    const { svg, g, w, h } = svgRoot(sel);
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
      grid.append("line").attr("x1", n * 26 + baseX).attr("y1", baseY - 6 * R).attr("x2", n * 26 + baseX).attr("y2", baseY + 4 * R);
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
      bubble.transition().duration(300).attr("opacity", 0).ease(d3.easeLinear).end()
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

    return {
      step() {
        idx = (idx + 1) % states.length;
        renderState(states[idx]);
        // small hop on the inner layer (independent of the CSS sway)
        hopG.interrupt()
          .transition().duration(140).ease(d3.easeQuadOut)
          .attr("transform", "translate(0,-8)")
          .transition().duration(200)
          .attr("transform", "translate(0,0)");
      },
    };
  }

  /* ---------- Chart 7: Next-word autocomplete simulator (@Erik) ----------
     Interactive: the user clicks a candidate word; the parrot "accepts" it
     and immediately predicts the next one. Static illustrative data —
     no API, no backend.
  ----------------------------------------------------------------------- */
  function autocompleteChart(sel) {
    const { g, w, h } = svgRoot(sel);
    const innerW = w - M.left - M.right;
    const innerH = h - M.top - M.bottom;

    g.append("text").attr("class", "chart-title").attr("x", 0).attr("y", -M.top + 30).text("Next-word roulette");
    g.append("text").attr("class", "stage-label").attr("x", 0).attr("y", -M.top + 52)
      .text("Pick a candidate — the model only ever picks the *likely* word");

    // --- current sentence (chips) ---
    const sentenceG = g.append("g").attr("transform", `translate(0, 40)`);
    const chips = sentenceG.selectAll("text").data([AUTOCOMPLETE_STEPS[0].sentence])
      .enter().append("text")
      .attr("class", "chart-title")
      .attr("x", 0).attr("y", 0)
      .text(d => d);

    // --- candidate bars ---
    const barX = 150;                    // bars start after the word labels
    const barMaxW = Math.min(innerW - barX - 40, 320);
    const barH = 30, barGap = 14;
    const candG = g.append("g").attr("transform", `translate(0, 110)`);

    let stepIdx = 0;

    function renderCandidates() {
      const step = AUTOCOMPLETE_STEPS[stepIdx];
      candG.selectAll("*").remove();

      candG.selectAll("text.label")
        .data(step.options).enter()
        .append("text")
        .attr("class", "label")
        .attr("x", 0)
        .attr("y", (d, i) => i * (barH + barGap) + barH / 2)
        .attr("dy", "0.35em")
        .attr("fill", "#fff")
        .style("font-size", 16)
        .style("font-weight", 700)
        .text(d => d[0]);

      candG.selectAll("rect.bar")
        .data(step.options).enter()
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
        .data(step.options).enter()
        .append("text")
        .attr("class", "pct")
        .attr("x", barX + 8)
        .attr("y", (d, i) => i * (barH + barGap) + barH / 2)
        .attr("dy", "0.35em")
        .attr("fill", "#10141c")
        .style("font-size", 13)
        .style("font-weight", 700)
        .style("pointer-events", "none")
        .text(d => d[1] + "%");

      candG.selectAll("rect.hit")
        .data(step.options).enter()
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
      if (stepIdx >= AUTOCOMPLETE_STEPS.length) return;
      const next = AUTOCOMPLETE_STEPS[stepIdx].sentence + " " + word;
      chips.data([next]).text(next); // extend the sentence
      stepIdx += 1;
      if (stepIdx < AUTOCOMPLETE_STEPS.length) {
        renderCandidates();
      } else {
        // finished: hollow punchline
        candG.selectAll("*").remove();
        candG.append("text")
          .attr("class", "chart-title")
          .attr("x", 0).attr("y", barH)
          .attr("fill", "#f05c7a")
          .style("font-style", "italic")
          .text(AUTOCOMPLETE_ENDING);
        candG.append("text")
          .attr("x", 0).attr("y", barH + 40)
          .attr("fill", "#9aa5b8")
          .style("font-size", 13)
          .text("Model's understanding of the sentence so far: 0%");
        candG.append("text")
          .attr("x", 0).attr("y", barH + 64)
          .attr("fill", "#ffd166")
          .style("font-size", 13)
          .style("cursor", "pointer")
          .text("↺ play again")
          .on("click", () => {
            stepIdx = 0;
            chips.data([AUTOCOMPLETE_STEPS[0].sentence]).text(AUTOCOMPLETE_STEPS[0].sentence);
            renderCandidates();
          });
      }
    }

    renderCandidates();

    return { step() { /* user-driven interaction; scroll step keeps state */ } };
  }

  /* ---------- Chart 8: Case-study cards (@Robin placeholder) ----------
     Simple static preview of the three failure cases from §6.2.
     TODO(Robin): replace with an interactive flip-card carousel.
  --------------------------------------------------------------------- */
  function caseCardsChart(sel) {
    const { g, w, h } = svgRoot(sel);
    const innerW = w - M.left - M.right;
    const innerH = h - M.top - M.bottom;

    g.append("text").attr("class", "chart-title").attr("x", 0).attr("y", -M.top + 30).text("When fluent text goes wrong");

    const cases = [
      { title: "Wrongful arrest", body: "“good morning” → “attack them”: a mistranslation had real consequences." },
      { title: "Bot propaganda", body: "Endless plausible posts, faking human crowds for extremism." },
      { title: "Privacy leaks", body: "Memorised training data regurgitated on request." },
    ];
    const cardW = Math.min(200, (innerW - 40) / 3), cardH = Math.min(190, innerH * 0.5);
    const gap = 24;

    const cardG = g.append("g").selectAll("g.card")
      .data(cases).enter()
      .append("g")
      .attr("class", "card")
      .attr("transform", (d, i) => `translate(${i * (cardW + gap)},${(innerH - cardH) / 2})`);

    cardG.append("rect")
      .attr("width", cardW).attr("height", cardH)
      .attr("rx", 12)
      .attr("fill", "rgba(255,255,255,0.06)")
      .attr("stroke", "rgba(255,255,255,0.25)");

    cardG.append("text")
      .attr("x", 16).attr("y", 34)
      .attr("fill", "#ffd166")
      .style("font-size", 15).style("font-weight", 700)
      .text(d => d.title);

    // simple word-wrapped body text
    cardG.each(function (d) {
      const words = d.body.split(" ");
      const maxChars = 24;
      let line = "", lineNo = 0;
      const gSelf = d3.select(this);
      words.forEach(word => {
        if ((line + " " + word).trim().length > maxChars) {
          gSelf.append("text").attr("x", 16).attr("y", 62 + lineNo * 18)
            .attr("fill", "#cdd5e0").style("font-size", 12).text(line.trim());
          line = word; lineNo += 1;
        } else {
          line = (line + " " + word).trim();
        }
      });
      if (line) gSelf.append("text").attr("x", 16).attr("y", 62 + lineNo * 18)
        .attr("fill", "#cdd5e0").style("font-size", 12).text(line.trim());
    });

    g.append("text")
      .attr("x", 0).attr("y", (innerH + cardH) / 2 + 34)
      .attr("fill", "#9aa5b8").style("font-size", 12)
      .text("Cases from §6.2 of the paper · interactive cards coming soon");

    return { step() { /* static preview */ } };
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

  return { bubbleChart, co2Chart, computeChart, envIntroChart, envLifecycleChart, envTradeoffChart, envJusticeChart, whoChart, filterChart, parrotChart, autocompleteChart, caseCardsChart };
})();
