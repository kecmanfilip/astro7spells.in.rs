// Adapter: konvertuje Swiss Ephemeris podatke u AstroChart format
// AstroChart: https://github.com/Kibo/AstroChart (MIT License)

function renderChartWithAstroChart(data, containerId, degreeTexts) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (typeof astrology === 'undefined') {
    console.warn('AstroChart nije učitan.');
    return;
  }

  // === Global AstroChart styling ===
  astrology.COLOR_BACKGROUND = '#faf9ff';
  astrology.POINTS_COLOR = '#1e1b2e';
  astrology.POINTS_TEXT_SIZE = 8;
  astrology.POINTS_STROKE = 1.2;
  astrology.SIGNS_COLOR = '#1e1b2e';
  astrology.SIGNS_STROKE = 1.5;
  astrology.CIRCLE_COLOR = '#dc2626';
  astrology.CIRCLE_STRONG = 2;
  astrology.LINE_COLOR = '#dc2626';
  astrology.CUSPS_FONT_COLOR = '#dc2626';
  astrology.CUSPS_STROKE = 1;
  astrology.SYMBOL_AXIS_FONT_COLOR = '#dc2626';
  astrology.SYMBOL_AXIS_STROKE = 1.6;

  // Element boje: Vatra=Crveno, Zemlja=Zeleno, Vazduh=Žuto, Voda=Plavo
  astrology.COLOR_ARIES     = '#e74c3c'; // Vatra
  astrology.COLOR_TAURUS    = '#27ae60'; // Zemlja
  astrology.COLOR_GEMINI    = '#f1c40f'; // Vazduh (žuto)
  astrology.COLOR_CANCER    = '#3498db'; // Voda
  astrology.COLOR_LEO       = '#e74c3c'; // Vatra
  astrology.COLOR_VIRGO     = '#27ae60'; // Zemlja
  astrology.COLOR_LIBRA     = '#f1c40f'; // Vazduh (žuto)
  astrology.COLOR_SCORPIO   = '#3498db'; // Voda
  astrology.COLOR_SAGITTARIUS = '#e74c3c'; // Vatra
  astrology.COLOR_CAPRICORN = '#27ae60'; // Zemlja
  astrology.COLOR_AQUARIUS  = '#f1c40f'; // Vazduh (žuto)
  astrology.COLOR_PISCES    = '#3498db'; // Voda

  // Rebuild COLORS_SIGNS array with current values to ensure overrides stick
  astrology.COLORS_SIGNS = [
    astrology.COLOR_ARIES, astrology.COLOR_TAURUS, astrology.COLOR_GEMINI,
    astrology.COLOR_CANCER, astrology.COLOR_LEO, astrology.COLOR_VIRGO,
    astrology.COLOR_LIBRA, astrology.COLOR_SCORPIO, astrology.COLOR_SAGITTARIUS,
    astrology.COLOR_CAPRICORN, astrology.COLOR_AQUARIUS, astrology.COLOR_PISCES
  ];

  // Aspekti: harmonijski = plavo, disharmonijski = crveno
  astrology.ASPECTS = {
    conjunction: { degree: 0,  orbit: 10, color: 'transparent' },
    sextile:     { degree: 60, orbit: 6,  color: '#3498db' },
    square:      { degree: 90, orbit: 8,  color: '#e74c3c' },
    trine:       { degree: 120, orbit: 8, color: '#3498db' },
    opposition:  { degree: 180, orbit: 10, color: '#e74c3c' }
  };

  // === Monkey-patch degree labels to show minutes ===
  const originalText = astrology.SVG.prototype.text;
  astrology.SVG.prototype.text = function(text, x, y, size, color) {
    if (degreeTexts && size === astrology.POINTS_TEXT_SIZE && /^\d{1,2}$/.test(String(text))) {
      const replacement = degreeTexts[String(text)];
      if (replacement) {
        text = replacement;
      }
    }
    return originalText.call(this, text, x, y, size, color);
  };

  // === Chart data ===
  const chartData = {
    planets: data.planets || {},
    cusps: data.cusps || [],
  };

  // === Render ===
  console.log("CHART INIT - Colors array:", astrology.COLORS_SIGNS);
  console.log("CHART INIT - Planet payload:", chartData.planets);
  console.log("CHART INIT - Cusps payload:", chartData.cusps);
  const chart = new astrology.Chart(containerId, 520, 520);
  const radix = chart.radix(chartData);
  radix.aspects();

  // === Restore original text function ===
  astrology.SVG.prototype.text = originalText;

  // === Post-render custom elements ===
  const svg = container.querySelector('svg');
  if (svg) {
    // 1. Zodiac color fallback
    const colorMap = {
      'astrology-sign-0': astrology.COLOR_ARIES,
      'astrology-sign-1': astrology.COLOR_TAURUS,
      'astrology-sign-2': astrology.COLOR_GEMINI,
      'astrology-sign-3': astrology.COLOR_CANCER,
      'astrology-sign-4': astrology.COLOR_LEO,
      'astrology-sign-5': astrology.COLOR_VIRGO,
      'astrology-sign-6': astrology.COLOR_LIBRA,
      'astrology-sign-7': astrology.COLOR_SCORPIO,
      'astrology-sign-8': astrology.COLOR_SAGITTARIUS,
      'astrology-sign-9': astrology.COLOR_CAPRICORN,
      'astrology-sign-10': astrology.COLOR_AQUARIUS,
      'astrology-sign-11': astrology.COLOR_PISCES,
    };
    for (const [id, color] of Object.entries(colorMap)) {
      const el = svg.querySelector(`[id*="${id}"]`);
      if (el) {
        el.setAttribute('fill', color);
        el.style.fill = color;
      }
    }

    // 2. Large axis labels (As, Ds, Mc, Ic)
    const shift = radix.shift || 0;
    const g = radix.radius + radix.radius / astrology.INNER_CIRCLE_RADIUS_RATIO / 4;
    const axisLabels = [
      { text: 'As', deg: chartData.cusps[0] + shift, r: g + 20 },
      { text: 'Ds', deg: chartData.cusps[6] + shift, r: g + 2 },
      { text: 'Ic', deg: chartData.cusps[3] - 2 + shift, r: g + 10 },
      { text: 'Mc', deg: chartData.cusps[9] + 2 + shift, r: g + 10 },
    ];
    axisLabels.forEach(label => {
      const pos = astrology.utils.getPointPosition(radix.cx, radix.cy, label.r, label.deg);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos.x);
      text.setAttribute('y', pos.y);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('font-size', '18');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', '#dc2626');
      text.setAttribute('font-family', 'Inter, sans-serif');
      text.textContent = label.text;
      svg.appendChild(text);
    });

    // 3. Pars Fortunae glyph (⊕)
    if (data.fortune !== undefined) {
      const fPos = astrology.utils.getPointPosition(radix.cx, radix.cy, radix.pointRadius, data.fortune + shift);
      const fText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      fText.setAttribute('x', fPos.x);
      fText.setAttribute('y', fPos.y);
      fText.setAttribute('text-anchor', 'middle');
      fText.setAttribute('dominant-baseline', 'central');
      fText.setAttribute('font-size', '16');
      fText.setAttribute('fill', '#7c3aed');
      fText.setAttribute('font-weight', '600');
      fText.textContent = '⊕';
      svg.appendChild(fText);
    }
  }
}
