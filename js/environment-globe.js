/* A geographic illustration for the environmental-justice chapter.
   Geographic outlines: Natural Earth via world-atlas. The map is not impact data. */
(function () {
  'use strict';
  const CDN = 'https://cdn.jsdelivr.net/npm/';
  const places = {
    sudan: { label: 'Sudan', lon: 30.2, lat: 15.6, text: 'The paper points to Sudan as an example of a place facing climate risks. It also notes the limited availability of large language models for Sudanese Arabic.' },
    maldives: { label: 'Maldives', lon: 73.3, lat: 3.2, text: 'The paper points to the Maldives as an example of a place facing climate risks. It also notes the limited availability of large language models for Dhivehi.' }
  };
  let dependencyPromise;
  function script(url, globalName) {
    if (window[globalName]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const node = document.createElement('script');
      node.src = url; node.async = true;
      node.onload = () => window[globalName] ? resolve() : reject(new Error('Missing ' + globalName));
      node.onerror = () => reject(new Error('Could not load ' + globalName));
      document.head.appendChild(node);
    });
  }
  function dependencies() {
    if (!dependencyPromise) {
      dependencyPromise = Promise.all([
        script(CDN + 'three@0.160.1/build/three.min.js', 'THREE'),
        script(CDN + 'topojson-client@3/dist/topojson-client.min.js', 'topojson'),
        fetch(CDN + 'world-atlas@2/countries-50m.json').then(response => {
          if (!response.ok) throw new Error('Could not load geography');
          return response.json();
        })
      ]).then(([, , topology]) => topology).catch(error => { dependencyPromise = null; throw error; });
    }
    return dependencyPromise;
  }
  function point(THREE, lon, lat, r) {
    const lambda = lon * Math.PI / 180, phi = lat * Math.PI / 180;
    return new THREE.Vector3(r * Math.cos(phi) * Math.cos(lambda), r * Math.sin(phi), -r * Math.cos(phi) * Math.sin(lambda));
  }
  function createEnvironmentalGlobe(container) {
    let disposed = false, frame = 0, renderer, observer, geometry, texture, material, ringGeometry, ringMaterial, camera;
    let rotationY = -Math.PI / 2 - 30.2 * Math.PI / 180;
    let rotationX = 15.6 * Math.PI / 180;
    let targetY = rotationY, targetX = rotationX, lastProgress = null, dragging = false, lastX, lastY;
    const root = document.createElement('div');
    root.className = 'globe-panel';
    root.innerHTML = `
      <p class="globe-kicker">The authors’ question</p>
      <h3>Who bears the costs?</h3>
      <p class="globe-intro">Explore two places discussed in the paper.</p>
      <div class="globe-stage" aria-label="Interactive three-dimensional globe highlighting Sudan and the Maldives">
        <p class="globe-loading" role="status">Loading the globe…</p>
        <div class="globe-inset" hidden>
          <span>Maldives · enlarged</span>
          <svg viewBox="0 0 110 100" role="img" aria-label="Enlarged outline of the Maldives from Natural Earth"></svg>
        </div>
      </div>
      <div class="globe-benefits-visual" hidden>
        <p class="benefits-eyebrow">One example in the paper</p>
        <h4>What language was in GPT-3’s training data?</h4>
        <p class="benefits-gap">The paper does not map where benefits go.</p>
        <div class="benefits-chart" role="img" aria-label="The paper reports that 7 percent of GPT-3 training data was not English; the remaining 93 percent is calculated as English.">
          <div class="benefits-chart-bar" aria-hidden="true"><span class="benefits-english"></span><span class="benefits-other"></span></div>
          <div class="benefits-chart-labels" aria-hidden="true"><span><strong>93%</strong> English</span><span><strong>7%</strong> not English</span></div>
        </div>
        <p class="benefits-caption">The paper reports 7% was not English; 93% is the remainder. This is training data for one model, <strong>not a measure of its users or benefits</strong>.</p>
        <a class="benefits-source" href="https://doi.org/10.1145/3442188.3445922">Source: the paper, §2, p. 611</a>
      </div>
      <p class="globe-instructions">Scroll or drag to turn the globe. Choose a topic below.</p>
      <div class="globe-controls" role="group" aria-label="Explore the paper’s examples">
        <button type="button" aria-pressed="false" data-place="sudan">Sudan</button>
        <button type="button" aria-pressed="false" data-place="maldives">Maldives</button>
        <button type="button" aria-pressed="false" data-place="benefits">Benefits</button>
      </div>
      <p class="globe-detail" aria-live="polite">Choose a topic to learn more.</p>
      <p class="globe-note">Gold marks examples, not a ranking. The ring locates the Maldives; it is not a border.</p>
      <p class="globe-source"><a href="https://doi.org/10.1145/3442188.3445922">Paper: Bender et al. (2021), §§2–3</a><span class="globe-geography"> · Geographic outlines: <a href="https://www.naturalearthdata.com/">Natural Earth</a> via world-atlas</span></p>`;
    container.appendChild(root);
    const stage = root.querySelector('.globe-stage');
    const detail = root.querySelector('.globe-detail');
    const heading = root.querySelector('h3');
    const intro = root.querySelector('.globe-intro');
    const geography = root.querySelector('.globe-geography');
    const instructions = root.querySelector('.globe-instructions');
    const note = root.querySelector('.globe-note');
    const benefitsVisual = root.querySelector('.globe-benefits-visual');
    const loading = root.querySelector('.globe-loading');
    const inset = root.querySelector('.globe-inset');
    const buttons = Array.from(root.querySelectorAll('button'));
    function selectPlace(name) {
      if (name === 'benefits') {
        inset.hidden = true;
        stage.hidden = true;
        benefitsVisual.hidden = false;
        heading.textContent = 'Who benefits?';
        intro.textContent = 'The paper discusses unequal language support.';
        geography.hidden = true;
        instructions.textContent = 'Choose Sudan or Maldives to return.';
        detail.textContent = 'The paper does not map where benefits are used most or rank languages by benefit. It says access depends in part on resources and the languages a technology supports.';
        note.textContent = 'The graphic shows language representation, not a ranking of beneficiaries.';
        buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.place === name)));
        return;
      }
      stage.hidden = false;
      benefitsVisual.hidden = true;
      heading.textContent = 'Who bears the costs?';
      intro.textContent = 'Explore two places discussed in the paper.';
      geography.hidden = false;
      instructions.textContent = 'Scroll or drag to turn the globe. Choose a topic below.';
      note.textContent = 'Gold marks examples, not a ranking. The ring locates the Maldives; it is not a border.';
      requestAnimationFrame(resize);
      const place = places[name];
      inset.hidden = name !== 'maldives';
      targetY = -Math.PI / 2 - place.lon * Math.PI / 180;
      // Choose the shortest turn from the present rotation.
      while (targetY - rotationY > Math.PI) targetY -= 2 * Math.PI;
      while (targetY - rotationY < -Math.PI) targetY += 2 * Math.PI;
      targetX = place.lat * Math.PI / 180;
      detail.textContent = place.text;
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.place === name)));
    }
    buttons.forEach(button => button.addEventListener('click', () => selectPlace(button.dataset.place)));
    function destroy() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', resize);
      if (geometry) geometry.dispose();
      if (material) material.dispose();
      if (ringGeometry) ringGeometry.dispose();
      if (ringMaterial) ringMaterial.dispose();
      if (texture) texture.dispose();
      if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
      root.remove();
    }
    function resize() {
      if (!renderer || !stage.clientWidth || !stage.clientHeight) return;
      renderer.setSize(stage.clientWidth, stage.clientHeight, false);
      if (camera) {
        const aspect = stage.clientWidth / stage.clientHeight;
        camera.left = -1.42 * aspect; camera.right = 1.42 * aspect;
        camera.updateProjectionMatrix();
      }
    }
    dependencies().then(topology => {
      if (disposed) return;
      if (!window.d3) throw new Error('D3 is unavailable');
      const THREE = window.THREE;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
      catch (error) { throw new Error('3D graphics unavailable'); }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      stage.prepend(renderer.domElement);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      loading.remove();
      const scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1.42, 1.42, 1.42, -1.42, 0.1, 20);
      camera.position.z = 5;
      scene.add(new THREE.AmbientLight(0xffffff, 2.0));
      const canvas = document.createElement('canvas');
      canvas.width = 2048; canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1b3543'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const projection = d3.geoEquirectangular().scale(canvas.width / (2 * Math.PI)).translate([canvas.width / 2, canvas.height / 2]);
      const path = d3.geoPath(projection, ctx);
      ctx.beginPath(); path(d3.geoGraticule10()); ctx.strokeStyle = 'rgba(147, 182, 190, 0.18)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); path(topojson.feature(topology, topology.objects.land));
      ctx.fillStyle = '#829e92'; ctx.fill(); ctx.strokeStyle = '#aec0b1'; ctx.lineWidth = 1.5; ctx.stroke();
      const countryObjects = topology.objects.countries.geometries;
      const countryFeatures = ['729', '462'].map(id => {
        const shape = countryObjects.find(country => String(country.id) === id);
        if (!shape) throw new Error('A highlighted country is missing from the map');
        return topojson.feature(topology, shape);
      });
      countryFeatures.forEach(feature => {
        ctx.beginPath(); path(feature);
        ctx.fillStyle = '#ffd166'; ctx.fill();
        ctx.strokeStyle = '#ffe49c'; ctx.lineWidth = 1.2; ctx.stroke();
      });
      // The Maldives' small islands are difficult to see at globe scale.
      // Show the same geographic feature in an enlarged, labelled inset on selection.
      const insetProjection = d3.geoMercator().fitExtent([[8, 8], [102, 92]], countryFeatures[1]);
      d3.select(inset.querySelector('svg')).append('path')
        .attr('d', d3.geoPath(insetProjection)(countryFeatures[1]))
        .attr('fill', '#ffd166').attr('stroke', '#ffe49c').attr('stroke-width', '1');
      texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      geometry = new THREE.SphereGeometry(1, 72, 48);
      material = new THREE.MeshLambertMaterial({ map: texture });
      const earth = new THREE.Group();
      earth.add(new THREE.Mesh(geometry, material));
      // Locator only: the actual islands are also coloured on the texture.
      ringGeometry = new THREE.RingGeometry(0.045, 0.052, 48);
      ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide });
      const locator = new THREE.Mesh(ringGeometry, ringMaterial);
      locator.position.copy(point(THREE, places.maldives.lon, places.maldives.lat, 1.014));
      locator.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), locator.position.clone().normalize());
      earth.add(locator);
      scene.add(earth);
      function render() {
        if (disposed) return;
        if (!root.isConnected) { destroy(); return; }
        const speed = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0.1;
        rotationY += (targetY - rotationY) * speed;
        rotationX += (targetX - rotationX) * speed;
        earth.rotation.set(rotationX, rotationY, 0, 'XYZ');
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      }
      const surface = renderer.domElement;
      surface.addEventListener('pointerdown', event => {
        dragging = true; lastX = event.clientX; lastY = event.clientY;
        surface.setPointerCapture(event.pointerId); surface.classList.add('is-dragging');
      });
      surface.addEventListener('pointermove', event => {
        if (!dragging) return;
        targetY += (event.clientX - lastX) * 0.008;
        targetX = Math.max(-1.1, Math.min(1.1, targetX + (event.clientY - lastY) * 0.008));
        lastX = event.clientX; lastY = event.clientY;
        buttons.forEach(button => button.setAttribute('aria-pressed', 'false'));
        inset.hidden = true;
        detail.textContent = 'Choose a topic to learn more.';
      });
      const endDrag = () => { dragging = false; surface.classList.remove('is-dragging'); };
      surface.addEventListener('pointerup', endDrag);
      surface.addEventListener('pointercancel', endDrag);
      if (window.ResizeObserver) { observer = new ResizeObserver(resize); observer.observe(stage); }
      else window.addEventListener('resize', resize);
      resize(); render();
    }).catch(error => {
      if (disposed) return;
      loading.textContent = 'The 3D globe could not be loaded. Use the buttons below to explore the paper’s examples.';
      root.querySelector('.globe-instructions').textContent = 'Select an example below.';
      console.warn('Environmental globe:', error);
    });
    return {
      setProgress(progress) {
        const p = Math.max(0, Math.min(1, Number(progress) || 0));
        if (dragging || (lastProgress !== null && Math.abs(p - lastProgress) < 0.002)) return;
        lastProgress = p;
        // Keep the explicitly selected language view visible while scrolling this chapter.
        if (!benefitsVisual.hidden) return;
        if (buttons.some(button => button.getAttribute('aria-pressed') === 'true')) {
          buttons.forEach(button => button.setAttribute('aria-pressed', 'false'));
          inset.hidden = true;
          detail.textContent = 'Choose a topic to learn more.';
        }
        const lon = 30.2 + (73.3 - 30.2) * p;
        const lat = 15.6 + (3.2 - 15.6) * p;
        targetY = -Math.PI / 2 - lon * Math.PI / 180;
        targetX = lat * Math.PI / 180;
      },
      destroy
    };
  }
  window.createEnvironmentalGlobe = createEnvironmentalGlobe;
})();
