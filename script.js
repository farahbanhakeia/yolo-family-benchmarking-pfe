


(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     FIT-TO-SLIDE — supprime tout défilement interne
     Chaque .slide-inner voit son contenu enveloppé dans un .fit-wrap qui est
     mis à l'échelle (transform: scale) pour tenir entièrement dans la zone
     visible, quelle que soit la résolution. Aucune position de slide n'est
     modifiée : seul le contenu interne est redimensionné.
  --------------------------------------------------------------------- */
  function wrapSlideContents() {
    document.querySelectorAll('.slide-inner').forEach((inner) => {
      if (inner.querySelector(':scope > .fit-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'fit-wrap';
      while (inner.firstChild) wrap.appendChild(inner.firstChild);
      inner.appendChild(wrap);
    });
  }

  function fitAllSlideContent() {
    document.querySelectorAll('.slide-inner').forEach((inner) => {
      const wrap = inner.querySelector(':scope > .fit-wrap');
      if (!wrap) return;
      wrap.style.transform = 'none';
      const availW = inner.clientWidth;
      const availH = inner.clientHeight;
      const natW = wrap.scrollWidth;
      const natH = wrap.scrollHeight;
      if (!natW || !natH || !availW || !availH) return;
      const scale = Math.min(1, availW / natW, availH / natH);
      wrap.style.transform = scale < 0.999 ? `scale(${scale})` : 'none';
    });
  }

  wrapSlideContents();
  fitAllSlideContent();
  window.addEventListener('load', fitAllSlideContent);

  let fitResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(fitResizeTimer);
    fitResizeTimer = setTimeout(fitAllSlideContent, 120);
  });

  /* ---------------------------------------------------------------------
     ÉTAT GLOBAL
  --------------------------------------------------------------------- */
  const slides = Array.from(document.querySelectorAll('.slide'));
  const total = slides.length;
  let current = 0;
  let chartsRendered = false;

  const els = {
    progressFill: document.getElementById('progress-fill'),
    counterCurrent: document.getElementById('counter-current'),
    counterTotal: document.getElementById('counter-total'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnMenu: document.getElementById('btn-menu'),
    btnFullscreen: document.getElementById('btn-fullscreen'),
    menu: document.getElementById('slide-menu'),
    menuScrim: document.getElementById('menu-scrim'),
    menuList: document.getElementById('slide-menu-list'),
    dots: document.getElementById('dots'),
    deck: document.getElementById('deck')
  };

  els.counterTotal.textContent = String(total).padStart(2, '0');

  /* ---------------------------------------------------------------------
     GÉNÉRATION DU MENU DE SOMMAIRE + DES POINTS DE NAVIGATION
  --------------------------------------------------------------------- */
  slides.forEach((slide, i) => {
    const title = slide.dataset.title || `Slide ${i + 1}`;

    // Élément de menu (panneau latéral)
    const li = document.createElement('li');
    li.innerHTML = `<span class="mnum">${String(i + 1).padStart(2, '0')}</span><span>${title}</span>`;
    li.addEventListener('click', () => { goTo(i); closeMenu(); });
    els.menuList.appendChild(li);

    // Point de navigation rapide
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.title = title;
    dot.addEventListener('click', () => goTo(i));
    els.dots.appendChild(dot);
  });

  const menuItems = Array.from(els.menuList.children);
  const dotItems = Array.from(els.dots.children);

  /* ---------------------------------------------------------------------
     NAVIGATION ENTRE SLIDES
  --------------------------------------------------------------------- */
  function render() {
    slides.forEach((slide, i) => {
      slide.classList.remove('active', 'prev');
      if (i === current) slide.classList.add('active');
      else if (i < current) slide.classList.add('prev');
    });
    

    const pct = total > 1 ? (current / (total - 1)) * 100 : 100;
    els.progressFill.style.width = pct + '%';
    els.counterCurrent.textContent = String(current + 1).padStart(2, '0');

    menuItems.forEach((el, i) => el.classList.toggle('active', i === current));
    dotItems.forEach((el, i) => el.classList.toggle('active', i === current));

    els.btnPrev.style.opacity = current === 0 ? '0.4' : '1';
    els.btnNext.style.opacity = current === total - 1 ? '0.4' : '1';

    // Rejoue les animations d'apparition en forçant un reflow
    const activeSlide = slides[current];
    const animated = activeSlide.querySelectorAll('.reveal-item, .reveal-stagger > *');
    animated.forEach((el) => {
      el.style.animation = 'none';
      // eslint-disable-next-line no-unused-expressions
      el.offsetHeight; // force reflow
      el.style.animation = '';
    });

    // Diapositive des résultats : dessine les graphiques une seule fois
    if (activeSlide.dataset.title === 'Résultats' && !chartsRendered) {
      chartsRendered = true;
      requestAnimationFrame(renderAllCharts);
    }

    // Recalcule la mise à l'échelle (au cas où le contenu ait changé)
    requestAnimationFrame(fitAllSlideContent);
  }

  function goTo(index) {
    current = Math.max(0, Math.min(total - 1, index));
    render();
  }
  function next() { if (current < total - 1) goTo(current + 1); }
  function prev() { if (current > 0) goTo(current - 1); }

  els.btnNext.addEventListener('click', next);
  els.btnPrev.addEventListener('click', prev);

  /* ---------------------------------------------------------------------
     NAVIGATION CLAVIER
  --------------------------------------------------------------------- */
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        e.preventDefault(); next(); break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home':
        e.preventDefault(); goTo(0); break;
      case 'End':
        e.preventDefault(); goTo(total - 1); break;
      case 'f': case 'F':
        toggleFullscreen(); break;
      case 'm': case 'M':
        toggleMenu(); break;
      case 'Escape':
        closeMenu(); break;
      default: break;
    }
  });

  /* ---------------------------------------------------------------------
     SWIPE TACTILE (mobile / trackpad)
  --------------------------------------------------------------------- */
  let touchStartX = 0;
  els.deck.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  els.deck.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 60) { dx < 0 ? next() : prev(); }
  }, { passive: true });

  /* ---------------------------------------------------------------------
     MENU DE SOMMAIRE (ouverture / fermeture)
  --------------------------------------------------------------------- */
  function openMenu() { els.menu.classList.add('active'); els.menuScrim.classList.add('active'); }
  function closeMenu() { els.menu.classList.remove('active'); els.menuScrim.classList.remove('active'); }
  function toggleMenu() { els.menu.classList.contains('active') ? closeMenu() : openMenu(); }
  els.btnMenu.addEventListener('click', toggleMenu);
  els.menuScrim.addEventListener('click', closeMenu);

  /* ---------------------------------------------------------------------
     MODE PLEIN ÉCRAN
  --------------------------------------------------------------------- */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }
  els.btnFullscreen.addEventListener('click', toggleFullscreen);

  /* ---------------------------------------------------------------------
     INITIALISATION
  --------------------------------------------------------------------- */
  render();

  /* =========================================================================
     FOND ANIMÉ — réseau de nœuds façon "réseau de neurones"
     Dessiné en Canvas 2D, discret, se redimensionne avec la fenêtre.
  ========================================================================= */
  const bgCanvas = document.getElementById('bg-canvas');
  const ctx = bgCanvas.getContext('2d');
  let nodes = [];
  const NODE_COUNT_BASE = 55;

  function resizeCanvas() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    const count = Math.round(NODE_COUNT_BASE * (window.innerWidth * window.innerHeight) / (1440 * 900));
    nodes = Array.from({ length: Math.max(20, count) }, () => ({
      x: Math.random() * bgCanvas.width,
      y: Math.random() * bgCanvas.height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.4 + 0.8
    }));
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function drawBackground() {
    ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    const linkDist = 150;

    // Déplacement des nœuds
    nodes.forEach((n) => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > bgCanvas.width) n.vx *= -1;
      if (n.y < 0 || n.y > bgCanvas.height) n.vy *= -1;
    });

    // Liens entre nœuds proches
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < linkDist) {
          ctx.strokeStyle = `rgba(11, 42, 74, ${0.06 * (1 - dist / linkDist)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }
    // Nœuds
    nodes.forEach((n) => {
      ctx.fillStyle = 'rgba(14, 165, 196, 0.35)';
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(drawBackground);
  }
  requestAnimationFrame(drawBackground);

  /* =========================================================================
     DONNÉES D'EXEMPLE — BENCHMARK YOLO (valeurs illustratives)
  ========================================================================= */
  const BENCH_DATA = [
    { name: 'YOLOv5s',  map: 37.4, fps: 156, params: 7.2,  size: 14.4, precision: 62, recall: 60, memory: 55 },
    { name: 'YOLOv7',   map: 51.4, fps: 118, params: 36.9, size: 74.8, precision: 78, recall: 74, memory: 70 },
    { name: 'YOLOv8m',  map: 50.2, fps: 132, params: 25.9, size: 49.7, precision: 76, recall: 73, memory: 66 },
    { name: 'YOLOv9c',  map: 53.0, fps: 108, params: 25.5, size: 51.1, precision: 80, recall: 77, memory: 68 },
    { name: 'YOLOv10m', map: 51.3, fps: 145, params: 15.4, size: 32.0, precision: 77, recall: 75, memory: 58 },
    { name: 'YOLO11m',  map: 51.5, fps: 150, params: 20.1, size: 38.8, precision: 78, recall: 76, memory: 60 }
  ];

  /* =========================================================================
     RENDU DE TOUS LES GRAPHIQUES (slide "Résultats")
  ========================================================================= */
  function renderAllCharts() {
    fillTable();
    drawBarChart();
    drawRadarChart();
    drawHeatmap();
  }
  window.addEventListener('resize', () => {
    if (chartsRendered) { drawBarChart(); drawRadarChart(); drawHeatmap(); }
  });

  function fillTable() {
    const tbody = document.querySelector('#results-table tbody');
    if (!tbody || tbody.children.length) return;
    BENCH_DATA.forEach((d) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${d.name}</td><td>${d.map.toFixed(1)}%</td><td>${d.fps}</td><td>${d.params}</td><td>${d.size}</td>`;
      tbody.appendChild(tr);
    });
  }

  function prepCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, w: rect.width, h: rect.height };
  }

  const COLOR_NAVY = '#0B2A4A';
  const COLOR_CYAN = '#0EA5C4';

  /* --- Bar chart : mAP par modèle ------------------------------------- */
  function drawBarChart() {
    const canvas = document.getElementById('chart-bar');
    if (!canvas) return;
    const { c, w, h } = prepCanvas(canvas);
    c.clearRect(0, 0, w, h);

    const padL = 34, padB = 26, padT = 10, padR = 10;
    const chartW = w - padL - padR, chartH = h - padT - padB;
    const maxVal = 60;
    const barGap = 14;
    const barW = (chartW - barGap * (BENCH_DATA.length - 1)) / BENCH_DATA.length;

    // Grille horizontale
    c.strokeStyle = 'rgba(11,42,74,0.08)';
    c.fillStyle = '#8496AC';
    c.font = '10px Inter, sans-serif';
    for (let i = 0; i <= 4; i++) {
      const val = (maxVal / 4) * i;
      const y = padT + chartH - (val / maxVal) * chartH;
      c.beginPath(); c.moveTo(padL, y); c.lineTo(w - padR, y); c.stroke();
      c.fillText(String(Math.round(val)), 2, y + 3);
    }

    BENCH_DATA.forEach((d, i) => {
      const x = padL + i * (barW + barGap);
      const barH = (d.map / maxVal) * chartH;
      const y = padT + chartH - barH;
      const grad = c.createLinearGradient(0, y, 0, padT + chartH);
      grad.addColorStop(0, COLOR_CYAN);
      grad.addColorStop(1, COLOR_NAVY);
      c.fillStyle = grad;
      roundRectTop(c, x, y, barW, barH, 5);
      c.fill();

      c.fillStyle = COLOR_NAVY;
      c.font = '600 10px Inter, sans-serif';
      c.textAlign = 'center';
      c.fillText(d.map.toFixed(1), x + barW / 2, y - 6);
      c.fillStyle = '#4F6178';
      c.font = '9px Inter, sans-serif';
      c.fillText(d.name.replace('YOLO', ''), x + barW / 2, padT + chartH + 15);
      c.textAlign = 'left';
    });
  }
  function roundRectTop(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x, y + r);
    c.arcTo(x, y, x + r, y, r);
    c.lineTo(x + w - r, y);
    c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h);
    c.lineTo(x, y + h);
    c.closePath();
  }

  /* --- Radar chart : profil multi-critères (3 modèles représentatifs) - */
  function drawRadarChart() {
    const canvas = document.getElementById('chart-radar');
    if (!canvas) return;
    const { c, w, h } = prepCanvas(canvas);
    c.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2 + 6, radius = Math.min(w, h) / 2 - 34;
    const axes = ['Précision', 'Vitesse', 'Recall', 'Efficacité mémoire', 'Compacité'];
    const n = axes.length;

    const series = [
      { name: 'YOLOv5s', color: 'rgba(14,165,196,0.75)', values: [62, 95, 60, 80, 90] },
      { name: 'YOLOv8m', color: 'rgba(11,42,74,0.75)', values: [76, 78, 73, 62, 55] },
      { name: 'YOLO11m', color: 'rgba(224,101,74,0.7)', values: [78, 82, 76, 68, 60] }
    ];

    // Grille radiale (anneaux)
    c.strokeStyle = 'rgba(11,42,74,0.12)';
    c.font = '9px Inter, sans-serif';
    c.fillStyle = '#8496AC';
    for (let ring = 1; ring <= 4; ring++) {
      c.beginPath();
      for (let i = 0; i <= n; i++) {
        const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
        const rr = (radius * ring) / 4;
        const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr;
        i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
      }
      c.stroke();
    }
    // Axes + labels
    c.strokeStyle = 'rgba(11,42,74,0.18)';
    c.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
      const px = cx + Math.cos(ang) * radius, py = cy + Math.sin(ang) * radius;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(px, py); c.stroke();
      const lx = cx + Math.cos(ang) * (radius + 16), ly = cy + Math.sin(ang) * (radius + 16);
      c.fillStyle = '#4F6178';
      c.fillText(axes[i], lx, ly + 3);
    }

    // Séries
    series.forEach((s) => {
      c.beginPath();
      s.values.forEach((val, i) => {
        const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
        const rr = (radius * val) / 100;
        const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr;
        i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
      });
      c.closePath();
      c.fillStyle = s.color.replace('0.75', '0.15').replace('0.7', '0.12');
      c.fill();
      c.strokeStyle = s.color;
      c.lineWidth = 2;
      c.stroke();
    });

    // Légende
    c.textAlign = 'left';
    series.forEach((s, i) => {
      const ly = h - 8 - (series.length - 1 - i) * 0;
      const x0 = 6 + i * 90;
      c.fillStyle = s.color;
      c.fillRect(x0, h - 12, 8, 8);
      c.fillStyle = '#4F6178';
      c.font = '9px Inter, sans-serif';
      c.fillText(s.name, x0 + 12, h - 5);
    });
  }

  /* --- Heatmap : précision (Y) vs vitesse (X) ------------------------- */
  function drawHeatmap() {
    const canvas = document.getElementById('chart-heatmap');
    if (!canvas) return;
    const { c, w, h } = prepCanvas(canvas);
    c.clearRect(0, 0, w, h);

    const padL = 70, padB = 34, padT = 14, padR = 14;
    const chartW = w - padL - padR, chartH = h - padT - padB;
    const rowH = chartH / BENCH_DATA.length;

    const metrics = [
      { key: 'precision', label: 'Précision' },
      { key: 'recall', label: 'Recall' },
      { key: 'fps', label: 'Vitesse', norm: 160 },
      { key: 'memory', label: 'Mémoire', invert: true }
    ];
    const colW = chartW / metrics.length;

    BENCH_DATA.forEach((d, r) => {
      metrics.forEach((m, cidx) => {
        let raw = m.key === 'fps' ? (d.fps / (m.norm || 100)) * 100 : d[m.key];
        if (m.invert) raw = 100 - raw;
        const t = Math.max(0, Math.min(1, raw / 100));
        const x = padL + cidx * colW, y = padT + r * rowH;
        const color = mixColor(t);
        c.fillStyle = color;
        c.fillRect(x + 2, y + 2, colW - 4, rowH - 4);
        c.fillStyle = t > 0.55 ? '#ffffff' : '#0B2A4A';
        c.font = '600 10px Inter, sans-serif';
        c.textAlign = 'center';
        c.fillText(Math.round(raw), x + colW / 2, y + rowH / 2 + 3);
      });
      c.fillStyle = '#4F6178';
      c.font = '10px Inter, sans-serif';
      c.textAlign = 'right';
      c.fillText(d.name.replace('YOLO', ''), padL - 8, padT + r * rowH + rowH / 2 + 3);
    });

    // Labels colonnes
    c.fillStyle = '#8496AC';
    c.font = '9px Inter, sans-serif';
    c.textAlign = 'center';
    metrics.forEach((m, i) => {
      c.fillText(m.label, padL + i * colW + colW / 2, padT + chartH + 16);
    });
  }
  function mixColor(t) {
    // Interpolation cyan (bas) -> navy (haut) selon l'intensité t (0..1)
    const c1 = [230, 247, 250]; // fond très clair
    const c2 = [14, 165, 196];  // cyan
    const c3 = [11, 42, 74];    // navy
    let r, g, b;
    if (t < 0.5) {
      const k = t / 0.5;
      r = c1[0] + (c2[0] - c1[0]) * k;
      g = c1[1] + (c2[1] - c1[1]) * k;
      b = c1[2] + (c2[2] - c1[2]) * k;
    } else {
      const k = (t - 0.5) / 0.5;
      r = c2[0] + (c3[0] - c2[0]) * k;
      g = c2[1] + (c3[1] - c2[1]) * k;
      b = c2[2] + (c3[2] - c2[2]) * k;
    }
    return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
  }

})();

/* ============================================================================
   SLIDE CNN — EXPLORATION INTERACTIVE (Backbone / Neck / Head / Output)
   Panneau latéral : un seul ouvert à la fois, se referme au second clic sur
   la même carte, le pipeline principal reste toujours visible en arrière-plan.
   ========================================================================= */
(function () {
  'use strict';

  const panel   = document.getElementById('cnnSidePanel');
  const scrim   = document.getElementById('cnnPanelScrim');
  const closeBtn = document.getElementById('cnnPanelClose');
  if (!panel || !scrim) return; // sécurité si cette diapositive n'existe pas

  const stepEl    = document.getElementById('cnnPanelStep');
  const eyebrowEl = document.getElementById('cnnPanelEyebrow');
  const titleEl   = document.getElementById('cnnPanelTitle');
  const contents  = Array.from(panel.querySelectorAll('.cnn-panel-content'));
  const cards     = Array.from(document.querySelectorAll('.cnn-card[data-target]'));
  const ovNodes   = Array.from(document.querySelectorAll('.ov-explorable[data-target]'));
  const triggers  = [...cards, ...ovNodes];

  // Métadonnées affichées dans l'en-tête du panneau pour chaque section
  const meta = {
    backbone: { step: '01', eyebrow: 'Backbone', title: 'Extraction hiérarchique des caractéristiques' },
    neck:     { step: '02', eyebrow: 'Neck',     title: 'Fusion multi-échelle (FPN / PAN)' },
    head:     { step: '03', eyebrow: 'Head',      title: 'Les trois branches de prédiction' },
    output:   { step: '04', eyebrow: 'Output',   title: 'Détection finale — après NMS' }
  };

  let activeTarget = null;

  function setActiveTriggers(target) {
    triggers.forEach((t) => {
      const isActive = t.dataset.target === target;
      t.classList.toggle('is-active', isActive);
      if (t.classList.contains('cnn-card')) t.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    });
  }

  function openPanel(target) {
    const data = meta[target];
    if (!data) return;

    contents.forEach((c) => c.classList.toggle('active', c.dataset.content === target));
    stepEl.textContent = data.step;
    eyebrowEl.textContent = data.eyebrow;
    titleEl.textContent = data.title;

    panel.classList.add('active');
    scrim.classList.add('active');
    setActiveTriggers(target);
    activeTarget = target;
  }

  function closePanel() {
    panel.classList.remove('active');
    scrim.classList.remove('active');
    setActiveTriggers(null);
    activeTarget = null;
  }

  triggers.forEach((el) => {
    el.addEventListener('click', () => {
      const target = el.dataset.target;
      if (activeTarget === target) { closePanel(); }
      else { openPanel(target); }
    });
  });

  closeBtn.addEventListener('click', closePanel);
  scrim.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('active')) closePanel();
  });

})();

/* ============================================================================
   BACKBONE — FICHE EXPLICATIVE DES COUCHES (Conv / BN / SiLU / Pool / Résiduel)
   Clic sur une couche d'un Conv Block -> relation mathématique + rôle.
   ========================================================================= */
(function () {
  'use strict';

  const wrap  = document.getElementById('layerDetail');
  const label = document.getElementById('ldLabel');
  const formula = document.getElementById('ldFormula');
  const role  = document.getElementById('ldRole');
  if (!wrap || !label || !formula || !role) return;

  // Construit une petite fraction HTML (numérateur / dénominateur) façon notation mathématique
  function frac(num, den) {
    return `<span class="frac"><span class="num">${num}</span><span class="den">${den}</span></span>`;
  }

  const layerInfo = {
    conv: {
      label: 'Convolution',
      formula: 'Y = Σ (X × K) + b',
      role: "Extrait les caractéristiques de l'image (contours, textures, formes) en faisant glisser des filtres (kernels) sur l'entrée."
    },
    silu: {
      label: 'Activation (SiLU / ReLU)',
      formula: 'f(x) = max(0, x)',
      role: "Introduit de la non-linéarité dans le réseau et ne conserve que les activations positives, permettant d'apprendre des relations complexes."
    },
    bn: {
      label: 'Batch Normalization',
      formulaHtml: `x̂ = ${frac('x − μ', '√(σ² + ε)')}`,
      role: "Normalise les activations de chaque batch pour stabiliser et accélérer l'entraînement du réseau."
    },
    pool: {
      label: 'Pooling',
      formula: 'Y = max(X)   (Max Pooling)',
      role: "Réduit la taille spatiale des cartes de caractéristiques tout en conservant l'information la plus essentielle."
    },
    residual: {
      label: 'Bloc résiduel',
      formula: 'y = F(x) + x',
      role: "Facilite l'entraînement des réseaux profonds en préservant le flux du gradient grâce à une connexion directe (skip connection)."
    }
  };

  let activeLayer = null;
  let activeBtn = null;

  function showLayer(key, btn) {
    const data = layerInfo[key];
    if (!data) return;
    label.textContent = data.label;
    formula.innerHTML = data.formulaHtml || data.formula;
    role.textContent = data.role;
    wrap.classList.add('has-content');
    activeLayer = key;
    if (activeBtn) activeBtn.classList.remove('is-active');
    activeBtn = btn;
    if (activeBtn) activeBtn.classList.add('is-active');
  }

  function hideLayer() {
    wrap.classList.remove('has-content');
    activeLayer = null;
    if (activeBtn) activeBtn.classList.remove('is-active');
    activeBtn = null;
  }

  document.querySelectorAll('.cb-tag[data-layer]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.layer;
      if (activeLayer === key && activeBtn === btn) { hideLayer(); }
      else { showLayer(key, btn); }
    });
  });

})();

/* ============================================================================
   NECK & HEAD — FICHES EXPLICATIVES GÉNÉRIQUES
   (Définition / À quoi ça sert / Relation mathématique)
   ========================================================================= */
(function () {
  'use strict';

  function wireConceptPanel(containerId, triggerSelector, data) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;

    const titleEl  = wrap.querySelector('h4[id$="Title"]');
    const defEl    = wrap.querySelector('p[id$="Def"]');
    const usageEl  = wrap.querySelector('p[id$="Usage"]');
    const formulaEl = wrap.querySelector('div[id$="Formula"]');
    const noteEl   = wrap.querySelector('p[id$="Note"]');
    const triggers = Array.from(document.querySelectorAll(triggerSelector));

    let activeKey = null;
    let activeBtn = null;

    function show(key, btn) {
      const d = data[key];
      if (!d) return;
      titleEl.textContent = d.title;
      defEl.textContent = d.def;
      usageEl.textContent = d.usage;
      formulaEl.innerHTML = d.formula;
      if (noteEl) noteEl.textContent = d.note || '';
      wrap.classList.add('has-content');
      activeKey = key;
      if (activeBtn) activeBtn.classList.remove('is-active');
      activeBtn = btn;
      if (activeBtn) activeBtn.classList.add('is-active');
    }

    function hide() {
      wrap.classList.remove('has-content');
      activeKey = null;
      if (activeBtn) activeBtn.classList.remove('is-active');
      activeBtn = null;
    }

    triggers.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.info;
        if (activeKey === key && activeBtn === btn) { hide(); }
        else { show(key, btn); }
      });
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
      });
    });
  }

  // --- NECK : Chemin Top-Down (FPN) / Chemin Bottom-Up (PAN) ---
  wireConceptPanel('neckDetail', '.ncap-btn[data-info]', {
    topdown: {
      title: 'Chemin Top-Down — Feature Pyramid Network (FPN)',
      def: "Le Feature Pyramid Network (FPN) transmet les caractéristiques des couches profondes vers les couches superficielles afin de construire une pyramide de caractéristiques à différentes échelles.",
      usage: "Il combine des informations sémantiques (haut niveau) avec des informations de localisation (bas niveau), ce qui améliore la détection des objets de différentes tailles — notamment les petits objets.",
      formula: 'P<sub>l</sub> = Conv(C<sub>l</sub> + Up(P<sub>l+1</sub>))',
      note: "C_l : caractéristique du Backbone · Up(·) : opération d'upsampling · P_l : nouvelle carte de caractéristiques."
    },
    bottomup: {
      title: 'Chemin Bottom-Up — Path Aggregation Network (PAN)',
      def: "Le Path Aggregation Network (PAN) transmet ensuite les informations des couches superficielles vers les couches profondes afin d'enrichir les caractéristiques.",
      usage: "Il améliore la propagation des informations de localisation et renforce la précision de la détection, en particulier pour les objets moyens et grands.",
      formula: 'N<sub>l</sub> = Conv(P<sub>l</sub> + Down(N<sub>l−1</sub>))',
      note: "P_l : sortie du FPN · Down(·) : opération de downsampling · N_l : nouvelle carte de caractéristiques enrichie."
    }
  });

  // --- HEAD : Bounding Box / Classe / Confidence Score ---
  wireConceptPanel('headDetail', '.head-card-clickable[data-info]', {
    bbox: {
      title: 'Bounding Box',
      def: "Une Bounding Box (boîte englobante) est un rectangle qui entoure l'objet détecté dans l'image, généralement défini par son centre, sa largeur et sa hauteur.",
      usage: "Elle permet de localiser précisément la position de l'objet dans l'image.",
      formula: 'B = (x, y, w, h)',
      note: "x, y : coordonnées du centre · w : largeur · h : hauteur de la boîte."
    },
    class: {
      title: 'Classe (Class Prediction)',
      def: "La classe correspond à la catégorie de l'objet détecté (personne, voiture, chien, etc.).",
      usage: "Elle permet d'identifier la nature de l'objet détecté.",
      formula: 'ĉ = argmax<sub>i</sub> P(c<sub>i</sub>)',
      note: "P(cᵢ) : probabilité de chaque classe · ĉ : classe ayant la probabilité la plus élevée."
    },
    confidence: {
      title: 'Confidence Score',
      def: "Le Confidence Score est un score compris entre 0 et 1 qui indique le niveau de confiance du modèle dans la détection.",
      usage: "Il permet de filtrer les détections peu fiables en ne conservant que celles dont le score dépasse un seuil donné.",
      formula: 'Confidence = P(Objet) × IoU',
      note: "P(Objet) : probabilité qu'un objet soit présent · IoU : chevauchement entre la boîte prédite et la boîte réelle."
    }
  });

})();

/* ============================================================================
   MODAL — DÉTAIL D'UN DÉFI (module autonome, n'interfère pas avec le reste)
   ========================================================================= */
(function () {
  'use strict';

  // Base de données des défis : image, description, légende (facultative)
  // Les clés doivent correspondre exactement au texte des <h4> de chaque nœud.
  const challengeData = {
    "Occlusions": {
      image: "images/occlusions.png",
      description: "Une partie de l'objet est masquée par un autre élément de la scène, ce qui complique sa localisation et sa reconnaissance.",
      caption: "Exemple : piéton partiellement caché par un véhicule."
    },
    "Variations d'échelle": {
      image: "images/scale.png",
      description: "Un même objet peut apparaître à des tailles très différentes selon sa distance par rapport à la caméra.",
      caption: "Exemple : véhicule proche vs. véhicule éloigné."
    },
    "Variations de perspective": {
      image: "images/perspective.png",
      description: "L'angle de vue modifie fortement l'apparence visuelle d'un même objet, rendant sa reconnaissance plus difficile.",
      caption: "Exemple : vue de face vs. vue de profil."
    },
    "Diversité intra-classe": {
      image: "images/intra-class.png",
      description: "Les objets d'une même catégorie peuvent présenter une grande variabilité de forme, de couleur ou de texture.",
      caption: "Exemple : nombreux modèles de chaises différents."
    },
    "Similarité inter-classe": {
      image: "images/inter-class.png",
      description: "Des objets appartenant à des classes distinctes peuvent se ressembler visuellement, augmentant le risque de confusion.",
      caption: "Exemple : loup vs. husky sibérien."
    },
    "Petits objets": {
      image: "images/small-objects.png",
      description: "La faible résolution des petits objets limite l'extraction de caractéristiques discriminantes nécessaires à leur détection.",
      caption: "Exemple : oiseau lointain dans une image aérienne."
    },
    "Scènes complexes": {
      image: "images/complex-scenes.png",
      description: "Les arrière-plans encombrés, le chevauchement d'objets et la forte densité compliquent l'analyse globale de la scène.",
      caption: "Exemple : foule dense en milieu urbain."
    }
  };

  // Références DOM
  const overlay    = document.getElementById('challengeModalOverlay');
  const mediaBox   = document.getElementById('challengeModalMedia');
  const modalImg   = document.getElementById('challengeModalImage');
  const modalTitle = document.getElementById('challengeModalTitle');
  const modalDesc  = document.getElementById('challengeModalDesc');
  const modalCap   = document.getElementById('challengeModalCaption');
  const closeBtn   = document.getElementById('challengeModalClose');

  if (!overlay) return; // sécurité si le modal n'a pas été inséré dans le HTML

  // Ouvre le modal avec les données du défi cliqué
  function openModal(key) {
    const data = challengeData[key];
    if (!data) return;

    modalTitle.textContent = key;
    modalDesc.textContent = data.description || '';
    modalCap.textContent = data.caption || '';
    modalCap.style.display = data.caption ? 'block' : 'none';

    // Réinitialise l'affichage avant de charger la nouvelle image
    mediaBox.classList.remove('fallback');
    modalImg.src = data.image;
    modalImg.alt = key;

    overlay.classList.add('active');
  }

  // Ferme le modal
  function closeModal() {
    overlay.classList.remove('active');
  }

  // Si l'image ne se charge pas (chemin pas encore complété), afficher un fallback propre
  modalImg.addEventListener('error', () => mediaBox.classList.add('fallback'));

  // Clic sur une carte de défi (nœud entier) -> ouverture du modal correspondant
  document.querySelectorAll('.challenge-node').forEach((node) => {
    node.addEventListener('click', (e) => {
      e.stopPropagation(); // n'affecte pas une éventuelle navigation par clic sur la slide
      const h4 = node.querySelector('h4');
      const key = node.getAttribute('data-challenge') || (h4 ? h4.textContent.trim() : '');
      openModal(key);
    });
  });

  // Fermeture : bouton ✕
  closeBtn.addEventListener('click', closeModal);

  // Fermeture : clic en dehors de la fenêtre (sur l'overlay uniquement)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Fermeture : touche Échap
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
  });

})();
/* ============================================================================
   SLIDE — MODÈLE PRÉ-ENTRAÎNÉ (v2)
   Révélation progressive : un seul panneau flottant réutilisé pour le terme
   "weights" et pour chaque étape du pipeline. + hover interactif sur le
   diagramme radial "Utilité". Module autonome, n'interfère pas avec le reste.
   ========================================================================= */
(function () {
  'use strict';

  const overlay   = document.getElementById('ptModalOverlay');
  if (!overlay) return; // sécurité si cette diapositive n'existe pas

  const closeBtn  = document.getElementById('ptModalClose');
  const eyebrowEl = document.getElementById('ptModalEyebrow');
  const titleEl   = document.getElementById('ptModalTitle');
  const contentEl = document.getElementById('ptModalContent');
  const triggers  = Array.from(document.querySelectorAll('[data-pt-panel]'));

  // Contenu affiché pour chaque déclencheur (terme "weights" + étapes du pipeline)
  const data = {

    weights: {
      eyebrow: 'Concept clé',
      title: 'Weights (poids appris)',
      html:
        '<p>Les <strong>weights</strong> représentent les paramètres appris pendant l\'entraînement. ' +
        'Ils stockent les connaissances du réseau de neurones (formes, textures, contours, objets...) ' +
        'et permettent de réutiliser ces connaissances sans réentraîner le modèle depuis zéro.</p>' +
        '<h4>Exemples</h4>' +
        '<div class="pretrain-example-row">' +
          '<div class="pretrain-example-card"><h4>ResNet</h4><p>Pré-entraîné sur ImageNet</p></div>' +
          '<div class="pretrain-example-card"><h4>YOLO</h4><p>Pré-entraîné sur COCO</p></div>' +
        '</div>'
    },

    dataset: {
      eyebrow: 'Étape 1 — Pipeline',
      title: 'Dataset',
      html:
        '<p>Collection d\'images annotées utilisée pour entraîner le modèle.</p>' +
        '<div class="pretrain-chip-row">' +
          '<span class="pretrain-chip">ImageNet</span>' +
          '<span class="pretrain-chip">COCO</span>' +
        '</div>'
    },

    training: {
      eyebrow: 'Étape 2 — Pipeline',
      title: 'Entraînement',
      html:
        '<p>Le réseau ajuste progressivement ses weights grâce aux données afin d\'apprendre à ' +
        'reconnaître des caractéristiques visuelles.</p>'
    },

    pretrained: {
      eyebrow: 'Étape 3 — Pipeline',
      title: 'Modèle pré-entraîné',
      html:
        '<p>Modèle ayant déjà appris des caractéristiques générales réutilisables.</p>'
    },

   transfer: {
  eyebrow: 'Étape 4 — Pipeline',
  title: 'Transfer Learning',
  html: `
    <p>
      Le Transfer Learning adapte un modèle pré-entraîné à un nouveau domaine
      en conservant les connaissances déjà acquises, ce qui réduit le coût
      d'entraînement tout en améliorant la précision.
    </p>

    <div class="pretrain-chip-row" style="justify-content:center; margin-top:14px;">
      <span class="pretrain-chip">YOLO pré-entraîné (COCO)</span>
    </div>

    <span class="pt-flow-arrow">↓ Fine-Tuning</span>

    <div class="pretrain-chip-row" style="justify-content:center; flex-wrap:wrap; gap:12px;">
      <span class="pretrain-chip">Casques de sécurité</span>
      <span class="pretrain-chip">Déchets</span>
      <span class="pretrain-chip">Véhicules</span>
      <span class="pretrain-chip">Défauts industriels</span>
    </div>
  `
},
    newtask: {
      eyebrow: 'Étape 5 — Pipeline',
      title: 'Nouvelle tâche',
      html:
        '<p>Le modèle est spécialisé pour une application spécifique.</p>' +
        '<ul class="pt-check-list">' +
          '<li>Détection de déchets</li>' +
          '<li>Détection de véhicules</li>' +
          '<li>Détection médicale</li>' +
          '<li>Détection de visages</li>' +
          '<li>Comptage d\'objets</li>' +
        '</ul>'
    }

  };

  let activeKey = null;

  function openPanel(key) {
    const d = data[key];
    if (!d) return;
    eyebrowEl.textContent = d.eyebrow;
    titleEl.textContent = d.title;
    contentEl.innerHTML = d.html;
    overlay.classList.add('active');
    activeKey = key;
    triggers.forEach((t) => t.classList.toggle('is-active-trigger', t.dataset.ptPanel === key));
  }

  function closePanel() {
    overlay.classList.remove('active');
    activeKey = null;
    triggers.forEach((t) => t.classList.remove('is-active-trigger'));
  }

  triggers.forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = el.dataset.ptPanel;
      if (activeKey === key) { closePanel(); }
      else { openPanel(key); }
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });

  closeBtn.addEventListener('click', closePanel);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePanel(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closePanel();
  });

})();

/* --- Diagramme radial "Utilité" : hover synchronisé nœud <-> ligne --- */
(function () {
  'use strict';

  const nodes = Array.from(document.querySelectorAll('.pt-hub-node[data-hub]'));
  if (!nodes.length) return;

  const links = Array.from(document.querySelectorAll('.pt-link[data-hub]'));

  function setHover(hub, state) {
    links.forEach((l) => { if (l.dataset.hub === hub) l.classList.toggle('is-hover', state); });
  }

  nodes.forEach((n) => {
    const hub = n.dataset.hub;

    n.addEventListener('mouseenter', () => setHover(hub, true));
    n.addEventListener('mouseleave', () => setHover(hub, false));
    n.addEventListener('focus', () => setHover(hub, true));
    n.addEventListener('blur', () => setHover(hub, false));

    // Support tactile : un tap affiche l'infobulle, un tap ailleurs la referme
    n.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasTapped = n.classList.contains('is-tapped');
      nodes.forEach((other) => { other.classList.remove('is-tapped'); setHover(other.dataset.hub, false); });
      if (!wasTapped) { n.classList.add('is-tapped'); setHover(hub, true); }
    });
  });

  document.addEventListener('click', () => {
    nodes.forEach((n) => { n.classList.remove('is-tapped'); setHover(n.dataset.hub, false); });
  });

})();

/* ============================================================================
   YOLO — ÉVOLUTION ARCHITECTURALE : clic sur un bloc du schéma horizontal
   pour afficher sa définition. Réutilise le composant générique
   .concept-detail (déjà utilisé pour Neck / Head) : chaque diapositive garde
   son propre panneau, ciblé via closest('.slide').
   ========================================================================= */
(function () {
  'use strict';

  document.addEventListener('click', (e) => {
    const box = e.target.closest('.yg-box');
    if (!box) return;

    const slide = box.closest('.slide');
    const panel = slide && slide.querySelector('.concept-detail');
    if (!panel) return;

    const titleEl = panel.querySelector('.concept-detail-card h4');
    const defEl = panel.querySelector('.concept-detail-card .cd-row p');
    const wasActive = box.classList.contains('is-active');

    // Réinitialise les autres blocs de la même diapositive
    slide.querySelectorAll('.yg-box.is-active').forEach((b) => b.classList.remove('is-active'));

    if (wasActive) {
      panel.classList.remove('has-content');
      return;
    }

    titleEl.textContent = box.dataset.term || '';
    defEl.textContent = box.dataset.def || '';
    panel.classList.add('has-content');
    box.classList.add('is-active');
  });

})();

/* ============================================================================
   SLIDE — ARCHITECTURE DE LA PLATEFORME
   Survol d'une branche (Ultralytics / Externes) : met en évidence toute la
   chaîne de traitement associée (noeuds communs + connecteurs + branche).
   ========================================================================= */
(function () {
  'use strict';

  const archWrap = document.getElementById('archWrap');
  if (!archWrap) return;

  const branches = archWrap.querySelectorAll('.arch-branch');

  branches.forEach((branch) => {
    const key = branch.dataset.branch; // "ultra" ou "ext"
    const hoverClass = 'hover-' + key;

    const activate = () => archWrap.classList.add(hoverClass);
    const deactivate = () => archWrap.classList.remove(hoverClass);

    branch.addEventListener('mouseenter', activate);
    branch.addEventListener('mouseleave', deactivate);
    branch.addEventListener('focusin', activate);
    branch.addEventListener('focusout', deactivate);
  });
})();

/* ============================================================================
   ============================================================================
   YOLOX / YOLO-WORLD — SCHÉMAS D'ARCHITECTURE INTERACTIFS
   ----------------------------------------------------------------------------
   - archData   : fiche complète de chaque module (facilement modifiable/complétable)
   - ICONS      : mini-bibliothèque d'icônes SVG (traits, sans dépendance externe)
   - Clic sur .arch-node / .arch-chip (data-key) -> ouvre le panneau latéral
     .arch-side-panel de la diapositive courante avec la fiche correspondante.
   ============================================================================
   ========================================================================= */
(function () {
  'use strict';

  /* ---- Bibliothèque d'icônes (chemins SVG, viewBox 0 0 24 24) ---- */
  var ICONS = {
    image:        '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    shuffle:      '<path d="M3 6h4l7 12h4M14 6h4v4M18 6l-5.5 5.5M18 18l-4-4M3 18h4l2.5-4.2"/>',
    layers:       '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
    maximize:     '<path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4"/>',
    grid:         '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    expand:       '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7.5" y="7.5" width="9" height="9" rx="1"/><rect x="10.8" y="10.8" width="2.4" height="2.4"/>',
    branch:       '<circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="9" r="2.2"/><path d="M6 8.2V15.8M6 8.2C6 12 9.5 12 15.8 9.6"/>',
    merge:        '<path d="M6 4v6c0 3 3 4 6 4s6-1 6-4V4M12 14v6"/>',
    sliders:      '<path d="M4 6h9M17 6h3M4 12h4M11 12h9M4 18h12M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
    cpu:          '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="10" y="10" width="4" height="4"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    tag:          '<path d="M3 3h8l10 10-8 8L3 11V3z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
    box:          '<rect x="4" y="6" width="16" height="12" rx="1.5" stroke-dasharray="3.2 3.2"/><circle cx="4" cy="6" r="1.3"/>',
    checkCircle:  '<circle cx="12" cy="12" r="9"/><path d="M7.5 12l3 3 6-6.5"/>',
    target:       '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    filter:       '<path d="M4 4h16l-6.2 7.6V18l-3.6 2v-8.4L4 4z"/>',
    checkSquare:  '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7.5 12l3 3 6-6.5"/>',
    text:         '<path d="M5 5h14M12 5v14M9 19h6"/>',
    brain:        '<path d="M9 4a3 3 0 00-3 3v1a3 3 0 00-2 5 3 3 0 002 5 3 3 0 003 3M15 4a3 3 0 013 3v1a3 3 0 012 5 3 3 0 01-2 5 3 3 0 01-3 3M9 4v16M15 4v16"/>',
    hash:         '<path d="M5 9h14M5 15h14M9 3L7 21M17 3l-2 18"/>',
    gitMerge:     '<circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M6 8.2V13a4 4 0 004 4h4.8M18 15.8V13"/>',
    globe:        '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>'
  };

  function svgIcon(name) {
    var body = ICONS[name] || ICONS.layers;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }

  var CAT_LABELS = {
    input: 'Entrée / Pré-traitement', backbone: 'Backbone', neck: 'Neck', head: 'Head',
    fusion: 'Fusion', text: 'Branche Texte', assign: 'Assignation / Post-traitement', output: 'Sortie'
  };

  /* ---- Fiche complète de chaque module (clé = data-key dans le HTML) ---- */
  var archData = {

    /* ===================== YOLOX ===================== */
    'input-image': {
      cat:'input', icon:'image', name:'Input Image', fullname:"Image d'entrée (Input Image)",
      role:"Point d'entrée du pipeline : fournit la matrice de pixels sur laquelle repose toute la détection.",
      def:"Image RGB brute, redimensionnée (généralement 640×640×3) avant d'être injectée dans le réseau de neurones.",
      why:"Toute architecture de détection a besoin d'une représentation numérique normalisée de la scène à analyser.",
      pros:['Format standard, facile à produire','Compatible avec tout backbone CNN'],
      cons:['Sensible à la résolution et à la qualité de la source'],
      io:{ 'in':'Image brute (caméra, fichier, flux vidéo)', out:'Tenseur normalisé H×W×3' },
      versions:['YOLOX','YOLO-World','Toutes versions YOLO']
    },
    'data-augmentation': {
      cat:'input', icon:'shuffle', name:'Data Augmentation', fullname:'Augmentation de données (Data Augmentation)',
      role:"Diversifier artificiellement les images d'entraînement pour améliorer la généralisation du modèle.",
      def:"Ensemble de transformations (Mosaic, MixUp, HSV, flip...) appliquées aléatoirement aux images avant l'entraînement.",
      why:"Réduit le sur-apprentissage et rend le modèle plus robuste aux variations d'échelle, de position et de contexte.",
      pros:['Améliore la robustesse du modèle','Réduit le besoin en données annotées','Peu coûteux en calcul'],
      cons:['Peut ralentir la convergence si trop agressif','Doit être désactivé en fin d\u2019entraînement (YOLOX)'],
      io:{ 'in':'Image + annotations', out:'Image augmentée + annotations ajustées' },
      versions:['YOLOX','YOLOv4','YOLOv5','YOLOv7']
    },
    'backbone-cspdarknet53': {
      cat:'backbone', icon:'layers', name:'CSPDarknet53', fullname:'Cross Stage Partial Darknet-53',
      role:'Extraire des caractéristiques riches à plusieurs niveaux de la scène.',
      def:"Backbone profond chargé d'extraire les caractéristiques de l'image tout en réduisant les calculs grâce aux connexions CSP.",
      why:'Un bon backbone conditionne la qualité de toutes les étapes suivantes (Neck, Head).',
      pros:['Moins de calcul','Meilleure propagation du gradient','Précision élevée','Vitesse importante'],
      cons:['Plus lourd que des backbones mobiles (MobileNet)','Nécessite un pré-entraînement (ImageNet) pour de bons résultats'],
      io:{ 'in':'Image augmentée (640×640×3)', out:'Cartes de caractéristiques multi-échelles (P3, P4, P5)' },
      versions:['YOLOX','YOLOv4','YOLOv5','YOLOv7']
    },
    'focus': {
      cat:'backbone', icon:'maximize', name:'Focus', fullname:'Focus Layer',
      role:"Réorganiser l'image en sous-échantillonnant l'espace vers la profondeur avant la première convolution.",
      def:"Découpe l'image en 4 sous-images entrelacées puis les concatène sur l'axe des canaux, en remplacement des convolutions à grand pas.",
      why:"Réduit la taille spatiale sans perte d'information dès la première couche, ce qui économise du calcul.",
      pros:['Aucune perte d\u2019information (contrairement au strided conv)','Réduction rapide de la résolution','Peu coûteux'],
      cons:['Remplacé par des convolutions 6×6 dans les versions plus récentes (YOLOv5 v6+)'],
      io:{ 'in':'Image 640×640×3', out:'Tenseur 320×320×12' },
      versions:['YOLOX','YOLOv5 (versions initiales)']
    },
    'csp-blocks': {
      cat:'backbone', icon:'grid', name:'CSP Blocks', fullname:'CSP Blocks (Cross Stage Partial)',
      role:'Extraire des caractéristiques profondes tout en limitant la redondance des calculs.',
      def:"Divise la carte de caractéristiques en deux parties : l'une traverse un bloc résiduel dense, l'autre est directement concaténée en sortie.",
      why:'Diminue le coût de calcul et de mémoire tout en conservant une précision élevée.',
      pros:['Réduction du coût de calcul (~20%)','Meilleure propagation du gradient','Évite les caractéristiques redondantes'],
      cons:['Architecture plus complexe à concevoir et à régler'],
      io:{ 'in':"Feature map d'un étage", out:'Feature map enrichie, même résolution' },
      versions:['YOLOX','YOLOv4','YOLOv5','YOLOv7']
    },
    'spp': {
      cat:'backbone', icon:'expand', name:'SPP', fullname:'Spatial Pyramid Pooling (SPP)',
      role:'Agréger le contexte spatial à différentes échelles avant la sortie du backbone.',
      def:'Applique plusieurs max-pooling de tailles de noyau différentes (5, 9, 13) en parallèle sur la même carte, puis concatène les résultats.',
      why:"Élargit le champ réceptif effectif sans perte de résolution, utile pour détecter des objets de tailles variées.",
      pros:['Élargit le champ réceptif','Robuste aux variations d\u2019échelle des objets','Peu de paramètres additionnels'],
      cons:['Coût mémoire lié aux multiples pooling parallèles'],
      io:{ 'in':'Feature map finale du backbone', out:'Feature map enrichie en contexte multi-échelle' },
      versions:['YOLOX','YOLOv3-SPP','YOLOv4','YOLOv7']
    },
    'neck-panfpn': {
      cat:'neck', icon:'branch', name:'PAN-FPN', fullname:'Path Aggregation Network – Feature Pyramid Network (PAN-FPN)',
      role:'Fusionner les informations sémantiques (haut niveau) et spatiales (bas niveau) entre les échelles.',
      def:'Combine un chemin top-down (FPN, propage la sémantique) et un chemin bottom-up (PAN, propage les détails spatiaux) entre les cartes P3, P4, P5.',
      why:'Permet de détecter efficacement des objets de tailles très différentes dans la même image.',
      pros:['Fusion bidirectionnelle riche','Améliore la détection multi-échelle','Faible surcoût par rapport à un FPN simple'],
      cons:['Ajoute de la latence par rapport à un neck simple (FPN seul)'],
      io:{ 'in':'Cartes P3, P4, P5 du backbone', out:'Cartes fusionnées multi-échelles' },
      versions:['YOLOX','YOLOv4','YOLOv5','YOLOv7','YOLO-World']
    },
    'feature-fusion': {
      cat:'neck', icon:'merge', name:'Feature Fusion', fullname:'Feature Fusion',
      role:'Combiner les cartes de caractéristiques provenant de niveaux différents du réseau.',
      def:"Opération d'addition ou de concaténation des feature maps issues du chemin top-down et du chemin bottom-up.",
      why:"Enrichit chaque échelle avec l'information des échelles voisines pour une meilleure représentation.",
      pros:['Améliore la précision sur les petits objets','Coût de calcul faible'],
      cons:['Peut introduire du bruit si les échelles sont mal alignées'],
      io:{ 'in':'Deux (ou plus) feature maps', out:'Feature map fusionnée' },
      versions:['YOLOX','YOLO-World','La plupart des YOLO modernes']
    },
    'multiscale-fusion': {
      cat:'neck', icon:'sliders', name:'Multi-scale Fusion', fullname:'Multi-scale Fusion',
      role:'Assurer une détection cohérente sur des objets de tailles très différentes.',
      def:'Mécanisme global du Neck qui produit plusieurs cartes de sortie (P3/P4/P5), chacune spécialisée sur une gamme de tailles d\u2019objets.',
      why:"Un objet petit et un objet grand ne sont pas visibles de la même façon selon la résolution de la carte.",
      pros:['Meilleure couverture des échelles d\u2019objets','Réduit le taux de faux négatifs sur les petits objets'],
      cons:['Augmente le nombre de prédictions à traiter en aval'],
      io:{ 'in':'Feature maps fusionnées', out:'Trois têtes de sortie (P3, P4, P5)' },
      versions:['YOLOX','YOLOv4','YOLOv5','YOLO-World']
    },
    'decoupled-head': {
      cat:'head', icon:'cpu', name:'Decoupled Head', fullname:'Decoupled Head',
      role:'Prédire séparément la classe, la position et la confiance de chaque objet détecté.',
      def:'Sépare la tête de détection en trois branches indépendantes (classification, régression, objectness) au lieu d\u2019une tête couplée unique.',
      why:'Les tâches de classification et de régression ont des besoins contradictoires ; les séparer accélère la convergence.',
      pros:['Convergence plus rapide','Meilleure précision (mAP)','Compatible avec l\u2019approche anchor-free'],
      cons:['Légèrement plus de paramètres qu\u2019une tête couplée','Trois branches à synchroniser'],
      io:{ 'in':'Feature maps multi-échelles du Neck', out:'Classes, boîtes (x, y, w, h), scores d\u2019objectness' },
      versions:['YOLOX','YOLOv6','YOLOv8']
    },
    'cls-branch': {
      cat:'head', icon:'tag', name:'Classification Branch', fullname:'Classification Branch',
      role:"Prédire la classe de l'objet détecté parmi les catégories connues.",
      def:'Sous-réseau convolutif dédié qui produit un vecteur de probabilités sur l\u2019ensemble des classes pour chaque position.',
      why:'Isoler cette tâche améliore sa précision : classification et localisation ont des dynamiques d\u2019apprentissage différentes.',
      pros:['Meilleure précision de classification','Apprentissage plus stable'],
      cons:['Ajoute des paramètres par rapport à une tête partagée'],
      io:{ 'in':"Feature map d'une échelle", out:'Distribution de probabilités par classe' },
      versions:['YOLOX','YOLOv6','YOLOv8']
    },
    'reg-branch': {
      cat:'head', icon:'box', name:'Regression Branch', fullname:'Regression Branch',
      role:'Prédire les coordonnées précises de la boîte englobante (bounding box).',
      def:'Sous-réseau qui régresse les quatre valeurs (x, y, largeur, hauteur) décrivant la position de l\u2019objet.',
      why:'La régression de boîte est une tâche continue, très différente de la classification discrète ; la séparer améliore la localisation.',
      pros:['Localisation plus précise','Compatible avec les pertes IoU / GIoU / CIoU'],
      cons:['Sensible aux objets très petits ou très allongés'],
      io:{ 'in':"Feature map d'une échelle", out:'Coordonnées (x, y, w, h)' },
      versions:['YOLOX','YOLOv6','YOLOv8']
    },
    'obj-branch': {
      cat:'head', icon:'checkCircle', name:'Objectness Branch', fullname:'Objectness Branch',
      role:"Estimer la probabilité qu'un objet soit réellement présent dans la zone considérée.",
      def:'Sous-réseau qui prédit un score entre 0 et 1 représentant la confiance de présence d\u2019un objet, indépendamment de sa classe.',
      why:'Permet de filtrer rapidement les zones de fond avant même de considérer la classification.',
      pros:['Filtrage rapide des faux positifs','Simplifie le score final (objectness × classe)'],
      cons:['Peut être mal calibré sur des scènes très denses'],
      io:{ 'in':"Feature map d'une échelle", out:'Score de confiance [0, 1]' },
      versions:['YOLOX','YOLOv3+','YOLOv6']
    },
    'simota': {
      cat:'assign', icon:'target', name:'SimOTA', fullname:'SimOTA (Simplified Optimal Transport Assignment)',
      role:'Associer dynamiquement les prédictions aux objets réels (labels) pendant l\u2019entraînement.',
      def:'Stratégie d\u2019assignation dynamique qui formule l\u2019attribution des labels comme un problème de transport optimal simplifié, en choisissant pour chaque objet le nombre optimal de prédictions positives.',
      why:'Les stratégies fixes (seuil IoU) attribuent mal les labels pour des objets de tailles ou formes atypiques.',
      pros:['Assignation adaptative par objet','Améliore sensiblement la précision (mAP)','Aucun hyperparamètre d\u2019ancre à régler'],
      cons:['Plus coûteux en calcul pendant l\u2019entraînement','Sans effet à l\u2019inférence (entraînement uniquement)'],
      io:{ 'in':'Prédictions brutes + vérité terrain', out:'Assignation prédiction ↔ label optimisée' },
      versions:['YOLOX']
    },
    'nms': {
      cat:'assign', icon:'filter', name:'NMS', fullname:'Non-Maximum Suppression (NMS)',
      role:'Supprimer les détections redondantes pour ne garder qu\u2019une boîte par objet réel.',
      def:'Algorithme de post-traitement qui trie les boîtes par score de confiance et élimine celles qui se chevauchent trop (IoU élevé) avec une boîte de score supérieur.',
      why:'Un même objet génère souvent plusieurs boîtes proches ; le NMS garantit une seule détection finale par objet.',
      pros:['Simple et rapide','Standard, bien compris et largement validé'],
      cons:['Peut supprimer des objets réellement proches (occlusion)','Seuil IoU à régler manuellement'],
      io:{ 'in':'Boîtes candidates + scores', out:'Boîtes finales filtrées' },
      versions:['YOLOX','YOLO-World','Toutes versions YOLO']
    },
    'final-detection': {
      cat:'output', icon:'checkSquare', name:'Final Detection', fullname:'Détection finale (Final Detection)',
      role:'Résultat exploitable du pipeline : liste des objets détectés avec classe, position et score.',
      def:'Sortie finale après NMS, prête à être affichée, exportée ou utilisée par une application avale.',
      why:'C\u2019est la finalité du pipeline : transformer une image brute en une information structurée exploitable.',
      pros:['Directement utilisable en production','Format standard (classe, bbox, score)'],
      cons:['Qualité dépendante de toutes les étapes précédentes'],
      io:{ 'in':'Boîtes filtrées par NMS', out:'Objets détectés (classe, bbox, confiance)' },
      versions:['YOLOX','YOLO-World','Toutes versions YOLO']
    },

    /* ===================== YOLO-WORLD (clés spécifiques) ===================== */
    'input-image-world': {
      cat:'input', icon:'image', name:'Image', fullname:"Image d'entrée",
      role:'Fournit la scène visuelle à analyser conjointement avec le vocabulaire textuel.',
      def:'Image RGB brute, identique en principe à celle utilisée par les YOLO classiques, redimensionnée avant traitement.',
      why:'Sert de base visuelle commune sur laquelle le vocabulaire ouvert (texte) viendra se projeter.',
      pros:['Aucun pré-traitement spécifique requis','Compatible avec les pipelines YOLO existants'],
      cons:['Sensible à la résolution et à la qualité de la source'],
      io:{ 'in':'Image brute', out:'Tenseur normalisé H×W×3' },
      versions:['YOLO-World']
    },
    'backbone-cspdarknet-cspnext': {
      cat:'backbone', icon:'layers', name:'Backbone', fullname:'CSPDarknet / CSPNeXt Backbone',
      role:'Extraire les caractéristiques visuelles de l\u2019image d\u2019entrée.',
      def:'Backbone convolutif (variante CSPDarknet ou CSPNeXt selon la version) partagé avec les architectures YOLO classiques, adapté pour être combiné à des embeddings textuels.',
      why:'Réutiliser un backbone YOLO éprouvé permet à YOLO-World d\u2019atteindre la vitesse temps réel tout en ajoutant la compréhension du langage.',
      pros:['Rapide (temps réel)','Backbone déjà optimisé et validé sur les YOLO classiques'],
      cons:['Moins expressif qu\u2019un backbone Transformer (ViT) pour la sémantique fine'],
      io:{ 'in':'Image', out:'Cartes de caractéristiques visuelles multi-échelles' },
      versions:['YOLO-World','YOLOv5','YOLOv8 (CSPNeXt via RTMDet)']
    },
    'vision-features': {
      cat:'backbone', icon:'image', name:'Vision Features', fullname:'Vision Features (cartes visuelles)',
      role:'Représenter la scène visuelle sous une forme prête à être comparée à des embeddings de texte.',
      def:'Cartes de caractéristiques multi-échelles produites par le Neck, encodant l\u2019apparence et la structure spatiale de l\u2019image.',
      why:'Ces caractéristiques doivent être exprimées dans un espace compatible avec les embeddings textuels pour permettre la fusion vision-langage.',
      pros:['Conserve l\u2019information spatiale (localisation)','Multi-échelle (petits et grands objets)'],
      cons:['Ne contient aucune sémantique de vocabulaire ouvert avant fusion'],
      io:{ 'in':'Sortie du Neck (PAN-FPN)', out:'Cartes visuelles prêtes pour la fusion' },
      versions:['YOLO-World']
    },
    'prompt-text': {
      cat:'text', icon:'text', name:'Prompt Text', fullname:'Prompt Text (vocabulaire ouvert)',
      role:'Fournir la liste des catégories/objets à détecter, exprimée en langage naturel.',
      def:'Ensemble de mots ou phrases libres (ex. "person", "red backpack", "fire hydrant") définissant le vocabulaire de détection pour l\u2019image courante.',
      why:'C\u2019est ce qui permet à YOLO-World de détecter des classes non vues à l\u2019entraînement, sans réentraînement (open-vocabulary).',
      pros:['Vocabulaire modifiable à la volée','Aucune ré-annotation ni ré-entraînement nécessaire'],
      cons:['Qualité de détection dépendante de la formulation du prompt'],
      io:{ 'in':'Texte libre saisi par l\u2019utilisateur', out:'Liste de catégories cibles' },
      versions:['YOLO-World']
    },
    'clip-text-encoder': {
      cat:'text', icon:'brain', name:'CLIP Text Encoder', fullname:'CLIP Text Encoder',
      role:'Transformer le texte du prompt en représentation vectorielle comparable aux caractéristiques visuelles.',
      def:'Encodeur de texte pré-entraîné issu de CLIP (Contrastive Language-Image Pretraining), figé ou affiné, qui projette chaque mot/catégorie dans un espace d\u2019embedding partagé avec la vision.',
      why:'CLIP a appris, sur des milliards de paires image-texte, un espace où concepts visuels et textuels sont alignés — condition nécessaire à la détection en vocabulaire ouvert.',
      pros:['Alignement vision-langage déjà appris','Généralise à des concepts jamais vus en détection'],
      cons:['Coût de calcul additionnel','Qualité limitée par les biais du pré-entraînement CLIP'],
      io:{ 'in':'Catégories textuelles (prompt)', out:'Embeddings textuels' },
      versions:['YOLO-World']
    },
    'text-embeddings': {
      cat:'text', icon:'hash', name:'Text Embeddings', fullname:'Text Embeddings',
      role:'Représenter chaque catégorie textuelle sous forme de vecteur numérique exploitable par le réseau.',
      def:'Vecteurs denses produits par le CLIP Text Encoder, un par catégorie du prompt, situés dans le même espace vectoriel que les caractéristiques visuelles.',
      why:'Permettent une comparaison directe (similarité) entre régions de l\u2019image et catégories textuelles.',
      pros:['Compacts et rapides à comparer','Réutilisables sans recalcul pour un même prompt'],
      cons:['Doivent être recalculés si le vocabulaire change'],
      io:{ 'in':'Sortie du CLIP Text Encoder', out:'Vecteurs d\u2019embeddings (un par classe)' },
      versions:['YOLO-World']
    },
    'vision-language-fusion': {
      cat:'fusion', icon:'gitMerge', name:'Vision-Language Fusion', fullname:'Vision-Language Fusion',
      role:'Combiner les caractéristiques visuelles et les embeddings textuels pour une détection guidée par le langage.',
      def:'Mécanisme (ex. RepVL-PAN dans YOLO-World) qui met en relation chaque région visuelle avec les embeddings de texte via un produit de similarité, injectant l\u2019information linguistique dans les cartes visuelles.',
      why:'C\u2019est le cœur de l\u2019approche open-vocabulary : sans cette fusion, le modèle ne pourrait pas relier une région de l\u2019image à un mot du prompt.',
      pros:['Permet de détecter des classes non vues à l\u2019entraînement','Réutilise une architecture de détection standard en aval'],
      cons:['Sensible à la qualité des embeddings textuels','Ajoute complexité et temps de calcul'],
      io:{ 'in':'Vision Features + Text Embeddings', out:'Cartes visuelles enrichies par le langage' },
      versions:['YOLO-World']
    },
    'detection-head-world': {
      cat:'head', icon:'cpu', name:'Detection Head', fullname:'Detection Head (Open-Vocabulary)',
      role:'Prédire les classes (parmi le vocabulaire ouvert), les boîtes et les scores d\u2019objectness pour chaque région.',
      def:'Tête de détection similaire à celle des YOLO classiques, mais dont la branche de classification compare les régions aux embeddings textuels plutôt qu\u2019à une liste fixe de classes.',
      why:'Permet de conserver la vitesse d\u2019une tête YOLO standard tout en supportant un vocabulaire de classes arbitraire et modifiable.',
      pros:['Vitesse proche des YOLO classiques','Vocabulaire de classes flexible'],
      cons:['Précision dépendante de la qualité de la fusion vision-langage en amont'],
      io:{ 'in':'Cartes visuelles enrichies par le langage', out:'Classes (ouvertes), boîtes, scores' },
      versions:['YOLO-World']
    },
    'cls-branch-world': {
      cat:'head', icon:'tag', name:'Classification', fullname:'Classification Branch (vocabulaire ouvert)',
      role:'Associer chaque région détectée à la catégorie textuelle la plus proche.',
      def:'Calcule la similarité entre la caractéristique visuelle d\u2019une région et chaque embedding textuel du prompt, puis sélectionne la classe la plus proche.',
      why:'Remplace la classification classique à liste fixe par une comparaison ouverte, extensible à tout nouveau prompt.',
      pros:['Aucune classe fixe imposée au modèle','S\u2019adapte instantanément à un nouveau vocabulaire'],
      cons:['Performance liée à la qualité de l\u2019alignement vision-langage'],
      io:{ 'in':'Région visuelle fusionnée + embeddings textuels', out:'Classe prédite (parmi le prompt)' },
      versions:['YOLO-World']
    },
    'open-vocab-detection': {
      cat:'output', icon:'globe', name:'Open Vocabulary Detection', fullname:'Open Vocabulary Detection',
      role:'Résultat final : détection d\u2019objets pour un vocabulaire de classes défini librement au moment de l\u2019inférence.',
      def:'Sortie finale de YOLO-World après NMS : liste d\u2019objets détectés, chacun associé à une catégorie choisie parmi le vocabulaire fourni en texte, même si elle n\u2019a jamais été vue à l\u2019entraînement.',
      why:'C\u2019est l\u2019objectif principal de YOLO-World : dépasser le nombre fixe de classes des YOLO classiques.',
      pros:['Détecte des classes jamais vues à l\u2019entraînement (zero-shot)','Aucun ré-entraînement nécessaire pour un nouveau domaine'],
      cons:['Précision généralement inférieure à un modèle spécialisé sur des classes fixes','Dépend fortement de la formulation du prompt'],
      io:{ 'in':'Boîtes filtrées par NMS + classes ouvertes', out:'Objets détectés avec catégories libres' },
      versions:['YOLO-World']
    }
  };

  function listHTML(items) {
    if (!items || !items.length) return '<ul><li>—</li></ul>';
    return '<ul>' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
  }

  function renderPanelBody(d) {
    var versions = (d.versions || []).map(function (v) {
      return '<span class="arch-version-chip">' + v + '</span>';
    }).join('');
    return ''
      + '<p class="arch-p-def">' + d.def + '</p>'
      + '<div class="arch-p-row"><span class="arch-p-label">Rôle</span><p>' + d.role + '</p></div>'
      + '<div class="arch-p-row"><span class="arch-p-label">Pourquoi ce module ?</span><p>' + d.why + '</p></div>'
      + '<div class="arch-pros-cons">'
      +   '<div class="arch-pc-box pros"><h5>Avantages</h5>' + listHTML(d.pros) + '</div>'
      +   '<div class="arch-pc-box cons"><h5>Limites</h5>' + listHTML(d.cons) + '</div>'
      + '</div>'
      + '<div class="arch-io-box">'
      +   '<div class="arch-io-col"><strong>Entrée</strong>' + d.io['in'] + '</div>'
      +   '<div class="arch-io-col"><strong>Sortie</strong>' + d.io.out + '</div>'
      + '</div>'
      + '<div class="arch-p-row" style="margin-bottom:4px;"><span class="arch-p-label">Utilisé dans</span>'
      +   '<div class="arch-versions">' + versions + '</div>'
      + '</div>';
  }

  function openArchPanel(slide, key) {
    var d = archData[key];
    if (!d) return;
    var scrim = slide.querySelector('[data-arch-scrim]');
    var panel = slide.querySelector('[data-arch-panel]');
    if (!scrim || !panel) return;

    var iconEl = panel.querySelector('[data-arch-panel-icon]');
    iconEl.innerHTML = svgIcon(d.icon);
    iconEl.style.background = 'var(--arch-' + d.cat + '-soft)';
    iconEl.style.color = 'var(--arch-' + d.cat + ')';
    panel.querySelector('[data-arch-panel-eyebrow]').textContent = CAT_LABELS[d.cat] || '';
    panel.querySelector('[data-arch-panel-title]').textContent = d.fullname || d.name;
    panel.querySelector('[data-arch-panel-body]').innerHTML = renderPanelBody(d);

    scrim.classList.add('active');
    panel.classList.add('active');

    slide.querySelectorAll('.arch-node.is-active, .arch-chip.is-active').forEach(function (n) {
      n.classList.remove('is-active');
    });
    var trigger = slide.querySelector('[data-key="' + key + '"]');
    if (trigger) trigger.classList.add('is-active');
  }

  function closeArchPanel(slide) {
    var scrim = slide.querySelector('[data-arch-scrim]');
    var panel = slide.querySelector('[data-arch-panel]');
    if (scrim) scrim.classList.remove('active');
    if (panel) panel.classList.remove('active');
    slide.querySelectorAll('.arch-node.is-active, .arch-chip.is-active').forEach(function (n) {
      n.classList.remove('is-active');
    });
  }

  /* ---- Remplit chaque icône de bloc du schéma à partir de son data-icon ---- */
  function initArchIcons() {
    document.querySelectorAll('.arch-node-icon[data-icon]').forEach(function (el) {
      el.innerHTML = svgIcon(el.dataset.icon);
    });
  }
  initArchIcons();

  document.addEventListener('click', function (e) {
    var closeTrigger = e.target.closest('[data-arch-panel-close], [data-arch-scrim]');
    if (closeTrigger) {
      var slideC = closeTrigger.closest('.slide');
      if (slideC) closeArchPanel(slideC);
      return;
    }
    var node = e.target.closest('.arch-flow [data-key], .arch-world-wrap [data-key]');
    if (node) {
      var slide = node.closest('.slide');
      if (slide) openArchPanel(slide, node.dataset.key);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var t = e.target;
      if (t && t.matches && t.matches('.arch-node[data-key], .arch-chip[data-key]')) {
        e.preventDefault();
        t.click();
      }
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.arch-side-panel.active').forEach(function (p) {
        var slide = p.closest('.slide');
        if (slide) closeArchPanel(slide);
      });
    }
  });

})();
