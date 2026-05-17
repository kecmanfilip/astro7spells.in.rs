function drawNatalChart(horoscope, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const W = 520, H = 520;
  const cx = W / 2, cy = H / 2;
  const outerR = 240;
  const houseR = 200;
  const planetR = 220;
  const signR = (houseR + outerR) / 2;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.width = '100%';
  svg.style.maxWidth = '520px';
  svg.style.display = 'block';
  svg.style.margin = '0 auto';

  function astroX(deg, r) { return cx + r * Math.cos((180 - deg) * Math.PI / 180); }
  function astroY(deg, r) { return cy + r * Math.sin((180 - deg) * Math.PI / 180); }

  function addCircle(r, stroke, width, fill) {
    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy);
    c.setAttribute('r', r);
    c.setAttribute('fill', fill || 'none');
    c.setAttribute('stroke', stroke || 'var(--border)');
    c.setAttribute('stroke-width', width || '1');
    svg.appendChild(c);
  }

  // Pozadina
  addCircle(outerR, '#dc2626', '2', '#faf9ff');
  addCircle(houseR, '#dc2626', '1.5', 'none');

  // Zodijačke linije — CRVENE (umesto sivih)
  for (let i = 0; i < 12; i++) {
    const a = i * 30;
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', astroX(a, 0));
    line.setAttribute('y1', astroY(a, 0));
    line.setAttribute('x2', astroX(a, outerR));
    line.setAttribute('y2', astroY(a, outerR));
    line.setAttribute('stroke', '#dc2626');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('opacity', '0.25');
    svg.appendChild(line);
  }

  // Kućne linije (house cusps) — CRVENE, deblje
  const houses = horoscope.Houses || [];
  houses.forEach((house) => {
    const deg = house.ChartPosition.StartPosition.Ecliptic.DecimalDegrees;
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', astroX(deg, 0));
    line.setAttribute('y1', astroY(deg, 0));
    line.setAttribute('x2', astroX(deg, houseR));
    line.setAttribute('y2', astroY(deg, houseR));
    line.setAttribute('stroke', '#dc2626');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('opacity', '0.85');
    svg.appendChild(line);

    const midR = houseR * 0.45;
    const hx = astroX(deg + 2, midR);
    const hy = astroY(deg + 2, midR);
    const hText = document.createElementNS(svgNS, 'text');
    hText.setAttribute('x', hx);
    hText.setAttribute('y', hy);
    hText.setAttribute('text-anchor', 'middle');
    hText.setAttribute('dominant-baseline', 'middle');
    hText.setAttribute('font-size', '9');
    hText.setAttribute('font-weight', '600');
    hText.setAttribute('fill', '#dc2626');
    hText.setAttribute('opacity', '0.7');
    hText.textContent = house.id;
    svg.appendChild(hText);
  });

  // Nazivi znakova
  const signNames = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  for (let i = 0; i < 12; i++) {
    const a = i * 30 + 15;
    const txt = document.createElementNS(svgNS, 'text');
    txt.setAttribute('x', astroX(a, signR));
    txt.setAttribute('y', astroY(a, signR));
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('dominant-baseline', 'middle');
    txt.setAttribute('font-size', '20');
    txt.setAttribute('fill', 'var(--text-muted)');
    txt.textContent = signNames[i];
    svg.appendChild(txt);
  }

  // Planet simboli
  const planetMap = {
    sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
    jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇'
  };
  const planetColors = {
    sun: '#f59e0b', moon: '#94a3b8', mercury: '#10b981', venus: '#ec4899',
    mars: '#ef4444', jupiter: '#8b5cf6', saturn: '#6366f1',
    uranus: '#06b6d4', neptune: '#3b82f6', pluto: '#7c3aed'
  };

  const planets = (horoscope.CelestialBodies?.all || []).filter(p => planetMap[(p.key || '').toLowerCase()]);

  // Sortiraj po stepenu
  const sorted = planets.map(p => {
    const key = (p.key || p.name || '').toLowerCase();
    const deg = p.ChartPosition?.Ecliptic?.DecimalDegrees || 0;
    return { p, key, deg, symbol: planetMap[key] || '?', color: planetColors[key] || 'var(--accent)' };
  }).sort((a, b) => a.deg - b.deg);

  // Anti-collision: grupiši bliske planete
  const groups = [];
  let currentGroup = [];
  sorted.forEach(item => {
    if (currentGroup.length === 0) {
      currentGroup.push(item);
    } else {
      const last = currentGroup[currentGroup.length - 1];
      const diff = Math.abs(item.deg - last.deg);
      const diffWrap = Math.min(diff, 360 - diff);
      if (diffWrap < 12) {
        currentGroup.push(item);
      } else {
        groups.push(currentGroup);
        currentGroup = [item];
      }
    }
  });
  if (currentGroup.length) groups.push(currentGroup);

  // Wrap around
  if (groups.length > 1) {
    const first = groups[0];
    const last = groups[groups.length - 1];
    const diffWrap = Math.min(
      Math.abs(first[0].deg - last[last.length - 1].deg),
      360 - Math.abs(first[0].deg - last[last.length - 1].deg)
    );
    if (diffWrap < 12) {
      groups[0] = last.concat(first);
      groups.pop();
    }
  }

  const PR = 14; // poluprečnik kruga planete

  // Rasporedi planete u svakoj grupi — spiralni raspored
  const placed = [];
  groups.forEach(group => {
    const count = group.length;
    // Ako su bliske, pomeri ih na različite radijuse (ka centru) i različite uglove
    group.forEach((item, idx) => {
      const { p, key, deg, symbol, color } = item;
      // Spiralni pomak: prva planeta najspoljnija, svaka naredna 28px unutra
      const r = planetR - idx * 28;
      // Ugao: ako ima više planeta, pomeri svaku za dovoljno da se ne preklapaju
      // Potrebno min 2*PR + 4px = 32px po obimu. Na radijusu r, to je ~32/r*57.3 stepeni
      const minAngle = (36 / Math.max(r, 100)) * (180 / Math.PI);
      const angleOffset = (idx - (count - 1) / 2) * Math.max(minAngle, 7);
      const adjustedDeg = deg + angleOffset;

      const px = astroX(adjustedDeg, r);
      const py = astroY(adjustedDeg, r);

      placed.push({ px, py, deg, symbol, color, key, r });
    });
  });

  // Nacrtaj planete — prvo one najdublje (unutrašnje) pa prema spolja
  // Ali mi želimo da spoljašnje budu vidljive, pa crtamo unutrašnje prve
  const placedSorted = [...placed].sort((a, b) => b.r - a.r);

  placedSorted.forEach(({ px, py, deg, symbol, color, key, r }) => {
    const g = document.createElementNS(svgNS, 'g');
    g.style.cursor = 'pointer';

    // Krug pozadina
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', px);
    circle.setAttribute('cy', py);
    circle.setAttribute('r', PR);
    circle.setAttribute('fill', 'var(--surface)');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', '2');
    g.appendChild(circle);

    // Simbol
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', px);
    text.setAttribute('y', py);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '13');
    text.setAttribute('font-weight', '600');
    text.setAttribute('fill', color);
    text.textContent = symbol;
    g.appendChild(text);

    // Step — prikaži kao mali label van kruga, u pravcu od centra
    const step = Math.round((deg % 30) * 10) / 10;
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const labelDist = PR + 10;
    const lx = px + (dx / dist) * labelDist;
    const ly = py + (dy / dist) * labelDist;
    const stepText = document.createElementNS(svgNS, 'text');
    stepText.setAttribute('x', lx);
    stepText.setAttribute('y', ly);
    stepText.setAttribute('text-anchor', 'middle');
    stepText.setAttribute('dominant-baseline', 'middle');
    stepText.setAttribute('font-size', '8');
    stepText.setAttribute('fill', 'var(--text-muted)');
    stepText.setAttribute('font-weight', '500');
    stepText.textContent = step + '°';
    g.appendChild(stepText);

    // Tooltip (title) na hover
    const title = document.createElementNS(svgNS, 'title');
    title.textContent = `${key.toUpperCase()}: ${step}°`;
    g.appendChild(title);

    svg.appendChild(g);
  });

  // Ascendant
  const ac = horoscope.Ascendant;
  if (ac && ac.ChartPosition) {
    const acDeg = ac.ChartPosition.Ecliptic.DecimalDegrees;
    const acX = astroX(acDeg, outerR - 4);
    const acY = astroY(acDeg, outerR - 4);
    const acText = document.createElementNS(svgNS, 'text');
    acText.setAttribute('x', acX);
    acText.setAttribute('y', acY);
    acText.setAttribute('text-anchor', 'middle');
    acText.setAttribute('dominant-baseline', 'middle');
    acText.setAttribute('font-size', '11');
    acText.setAttribute('font-weight', '700');
    acText.setAttribute('fill', '#dc2626');
    acText.textContent = 'AC';
    svg.appendChild(acText);

    const acLine = document.createElementNS(svgNS, 'line');
    acLine.setAttribute('x1', cx);
    acLine.setAttribute('y1', cy);
    acLine.setAttribute('x2', astroX(acDeg, outerR));
    acLine.setAttribute('y2', astroY(acDeg, outerR));
    acLine.setAttribute('stroke', '#dc2626');
    acLine.setAttribute('stroke-width', '2.5');
    acLine.setAttribute('opacity', '0.9');
    svg.insertBefore(acLine, svg.firstChild);
  }

  // Midheaven
  const mc = horoscope.Midheaven;
  if (mc && mc.ChartPosition) {
    const mcDeg = mc.ChartPosition.Ecliptic.DecimalDegrees;
    const mcX = astroX(mcDeg, outerR - 4);
    const mcY = astroY(mcDeg, outerR - 4);
    const mcText = document.createElementNS(svgNS, 'text');
    mcText.setAttribute('x', mcX);
    mcText.setAttribute('y', mcY);
    mcText.setAttribute('text-anchor', 'middle');
    mcText.setAttribute('dominant-baseline', 'middle');
    mcText.setAttribute('font-size', '11');
    mcText.setAttribute('font-weight', '700');
    mcText.setAttribute('fill', '#0891b2');
    mcText.textContent = 'MC';
    svg.appendChild(mcText);

    const mcLine = document.createElementNS(svgNS, 'line');
    mcLine.setAttribute('x1', cx);
    mcLine.setAttribute('y1', cy);
    mcLine.setAttribute('x2', astroX(mcDeg, outerR));
    mcLine.setAttribute('y2', astroY(mcDeg, outerR));
    mcLine.setAttribute('stroke', '#0891b2');
    mcLine.setAttribute('stroke-width', '2.5');
    mcLine.setAttribute('opacity', '0.9');
    svg.insertBefore(mcLine, svg.firstChild);
  }

  // Centar
  const centerText = document.createElementNS(svgNS, 'text');
  centerText.setAttribute('x', cx);
  centerText.setAttribute('y', cy - 6);
  centerText.setAttribute('text-anchor', 'middle');
  centerText.setAttribute('font-size', '10');
  centerText.setAttribute('fill', 'var(--text-muted)');
  centerText.setAttribute('font-weight', '600');
  centerText.textContent = 'Natalna karta';
  svg.appendChild(centerText);

  container.appendChild(svg);
}
