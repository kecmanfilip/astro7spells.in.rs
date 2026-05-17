import { cities } from './cities.js';

const zodiacSigns = [
  'Ovan', 'Bik', 'Blizanci', 'Rak', 'Lav',
  'Devica', 'Vaga', 'Škorpija', 'Strelac',
  'Jarac', 'Vodolija', 'Ribe'
];

const planetNames = {
  Sun: 'Sunce', Moon: 'Mesec', Mercury: 'Merkur', Venus: 'Venera',
  Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturn',
  Uranus: 'Uran', Neptune: 'Neptun', Pluto: 'Pluton',
  Chiron: 'Hiron', MeanNode: 'Severni čvor', MeanApogee: 'Lilith',
  Fortune: 'Pars Fortunae',
};

const aspectNames = {
  conjunction: 'Konjunkcija',
  opposition: 'Opozicija',
  trine: 'Trigon',
  square: 'Kvadrat',
  sextile: 'Seksil',
};

const aspectSymbols = {
  conjunction: '☌',
  opposition: '☍',
  trine: '△',
  square: '□',
  sextile: '⚹',
};

function getZodiac(degree) {
  const idx = Math.floor(degree / 30) % 12;
  const deg = Math.floor(degree % 30);
  const min = Math.floor(((degree % 30) % 1) * 60);
  return `${zodiacSigns[idx]} ${deg}°${min.toString().padStart(2, "0")}'`;
}

function getZodiacSign(degree) {
  return zodiacSigns[Math.floor(degree / 30) % 12];
}

// Planet ID mapping for Swiss Ephemeris numeric IDs
const PLANET_IDS = {
  Sun: 0, Moon: 1, Mercury: 2, Venus: 3, Mars: 4,
  Jupiter: 5, Saturn: 6, Uranus: 7, Neptune: 8, Pluto: 9,
  Chiron: 15, MeanNode: 10, MeanApogee: 12,
};

const CalculationFlagSpeed = 256;
const HouseSystemPlacidus = 'P';

let sweInstance = null;
let sweReady = false;

async function getSwe() {
  if (sweInstance && sweReady) return sweInstance;
  if (!window.SwissEphemeris) {
    throw new Error('Swiss Ephemeris nije učitan.');
  }
  sweInstance = new window.SwissEphemeris();
  await sweInstance.init();
  await sweInstance.loadStandardEphemeris();
  sweReady = true;
  return sweInstance;
}

// === TIMEZONE CONVERSION ===
function getTimezoneOffsetMinutes(date, timeZone) {
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const utcParts = {};
  utcFormatter.formatToParts(date).forEach(p => { utcParts[p.type] = p.value; });
  const tzParts = {};
  tzFormatter.formatToParts(date).forEach(p => { tzParts[p.type] = p.value; });

  const utcHours = parseInt(utcParts.hour, 10);
  const utcMinutes = parseInt(utcParts.minute, 10);
  const tzHours = parseInt(tzParts.hour, 10);
  const tzMinutes = parseInt(tzParts.minute, 10);

  let offsetMinutes = (utcHours * 60 + utcMinutes) - (tzHours * 60 + tzMinutes);
  if (offsetMinutes > 12 * 60) offsetMinutes -= 24 * 60;
  if (offsetMinutes < -12 * 60) offsetMinutes += 24 * 60;

  return offsetMinutes;
}

function localToUTC(year, month, day, hour, minute, timeZone) {
  const localDate = new Date(year, month - 1, day, hour, minute);
  const browserOffset = localDate.getTimezoneOffset(); // minutes (UTC - browser)
  const targetOffset = getTimezoneOffsetMinutes(localDate, timeZone);
  const utcTimestamp = localDate.getTime() - browserOffset * 60000 + targetOffset * 60000;
  return new Date(utcTimestamp);
}

function populateCities() {
  const select = document.getElementById('city');
  if (!select) return;
  select.innerHTML = '<option value="" disabled selected>Izaberi grad</option>';
  cities.forEach(c => {
    const opt = document.createElement('option');
    opt.value = JSON.stringify({ lat: c.lat, lon: c.lon, tz: c.tz });
    opt.textContent = c.name;
    select.appendChild(opt);
  });
  const manual = document.createElement('option');
  manual.value = 'manual';
  manual.textContent = 'Drugo mesto (ručno unesi koordinate)';
  select.appendChild(manual);
}

function init() {
  populateCities();

  const citySelect = document.getElementById('city');
  if (citySelect) {
    citySelect.addEventListener('change', (e) => {
      const el = document.getElementById('manual-coords');
      if (el) el.style.display = e.target.value === 'manual' ? 'grid' : 'none';
    });
  }

  const form = document.getElementById('calc-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      calculateChart();
    });
  }
}

// === PARS FORTUNAE ===
function calculateFortune(ascendant, sunDeg, moonDeg, sunHouse) {
  // Day chart: Sun in houses 7-12 (above horizon)
  // Night chart: Sun in houses 1-6 (below horizon)
  const isDay = sunHouse >= 7 && sunHouse <= 12;
  let fortuneDeg;
  if (isDay) {
    fortuneDeg = ascendant + moonDeg - sunDeg;
  } else {
    fortuneDeg = ascendant + sunDeg - moonDeg;
  }
  return ((fortuneDeg % 360) + 360) % 360;
}

function getHouseOfDegree(deg, cusps) {
  for (let i = 0; i < 12; i++) {
    const cuspStart = cusps[i];
    const cuspEnd = cusps[(i + 1) % 12];
    if (cuspEnd > cuspStart) {
      if (deg >= cuspStart && deg < cuspEnd) return i + 1;
    } else {
      // Wrap-around (e.g., cusp 12 to cusp 1)
      if (deg >= cuspStart || deg < cuspEnd) return i + 1;
    }
  }
  return 1;
}

async function calculateChart() {
  try {
    const swe = await getSwe();

    const name = document.getElementById('name').value.trim() || 'Korisnik';
    const day = parseInt(document.getElementById('birth-day').value, 10);
    const month = parseInt(document.getElementById('birth-month').value, 10);
    const year = parseInt(document.getElementById('birth-year').value, 10);
    const hour = parseInt(document.getElementById('birth-hour').value, 10);
    const minute = parseInt(document.getElementById('birth-minute').value, 10);
    const cityVal = document.getElementById('city').value;

    if (!day || !month || !year || isNaN(hour) || isNaN(minute) || !cityVal) {
      alert('Molimo popunite sva obavezna polja.');
      return;
    }

    let lat, lon, timeZone;
    if (cityVal === 'manual') {
      lat = parseFloat(document.getElementById('lat').value);
      lon = parseFloat(document.getElementById('lon').value);
      const tzOffset = parseFloat(document.getElementById('tz-offset')?.value || '0');
      if (isNaN(lat) || isNaN(lon)) {
        alert('Molimo unesite validne koordinate.');
        return;
      }
      timeZone = `Etc/GMT${tzOffset <= 0 ? '+' : '-'}${Math.abs(Math.round(tzOffset))}`;
    } else {
      const coords = JSON.parse(cityVal);
      lat = coords.lat;
      lon = coords.lon;
      timeZone = coords.tz || 'UTC';
    }

    // Julian Day from birth location's local time converted to UTC
    const utcDate = localToUTC(year, month, day, hour, minute, timeZone);
    const jd = swe.dateToJulianDay(utcDate);

    // Planet positions
    const planetData = {};
    const planetPositions = {};
    for (const [pName, pId] of Object.entries(PLANET_IDS)) {
      const pos = swe.calculatePosition(jd, pId, CalculationFlagSpeed);
      planetPositions[pName] = pos;
      planetData[pName] = {
        deg: pos.longitude,
        sign: getZodiacSign(pos.longitude),
        retrograde: pos.longitudeSpeed < 0,
      };
    }

    // Houses
    const houseResult = swe.calculateHouses(jd, lat, lon, HouseSystemPlacidus);
    const cusps = houseResult.cusps.slice(1, 13); // cusps[1..12]
    const ascendant = houseResult.ascendant;
    const mc = houseResult.mc;

    // Pars Fortunae
    const sunHouse = getHouseOfDegree(planetData.Sun.deg, cusps);
    const fortuneDeg = calculateFortune(ascendant, planetData.Sun.deg, planetData.Moon.deg, sunHouse);
    planetData.Fortune = {
      deg: fortuneDeg,
      sign: getZodiacSign(fortuneDeg),
      retrograde: false,
    };

    // Aspects
    const aspects = getAspects(planetPositions);

    renderResults(name, planetData, cusps, ascendant, mc, aspects);
  } catch (err) {
    console.error(err);
    alert('Greška pri izračunavanju. Proverite podatke i pokušajte ponovo.');
  }
}

function getAspects(planetPositions) {
  const aspects = [];
  const aspectDefs = [
    { name: 'conjunction', angle: 0, orb: 10 },
    { name: 'sextile', angle: 60, orb: 6 },
    { name: 'square', angle: 90, orb: 8 },
    { name: 'trine', angle: 120, orb: 8 },
    { name: 'opposition', angle: 180, orb: 10 },
  ];

  const keys = Object.keys(planetPositions);
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const p1 = keys[i];
      const p2 = keys[j];
      const deg1 = planetPositions[p1].longitude;
      const deg2 = planetPositions[p2].longitude;
      const diff = Math.abs(deg1 - deg2);
      const minDiff = Math.min(diff, 360 - diff);

      for (const asp of aspectDefs) {
        const orb = Math.abs(minDiff - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({
            planet1: p1,
            planet2: p2,
            type: asp.name,
            angle: asp.angle,
            orb: parseFloat(orb.toFixed(2)),
          });
          break;
        }
      }
    }
  }
  return aspects;
}

function renderResults(name, planetData, cusps, ascendant, mc, aspects) {
  document.getElementById('res-name').textContent = name;

  document.getElementById('res-sun').textContent =
    `${getZodiac(planetData.Sun.deg)} (${planetData.Sun.sign})`;
  document.getElementById('res-moon').textContent =
    `${getZodiac(planetData.Moon.deg)} (${planetData.Moon.sign})`;
  document.getElementById('res-asc').textContent = getZodiac(ascendant);
  document.getElementById('res-mc').textContent = getZodiac(mc);
  const fortuneEl = document.getElementById('res-fortune');
  if (fortuneEl) fortuneEl.textContent = getZodiac(planetData.Fortune.deg);

  // Planet grid
  const planetsGrid = document.getElementById('planets-grid');
  planetsGrid.innerHTML = '';
  const planetOrder = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','MeanNode','MeanApogee','Fortune'];
  for (const key of planetOrder) {
    const data = planetData[key];
    if (!data) continue;
    const div = document.createElement('div');
    div.className = 'planet-item';
    const retro = data.retrograde ? ' ℞' : '';
    div.innerHTML = `
      <div class="name">${planetNames[key] || key}</div>
      <div class="value">${getZodiac(data.deg)}${retro}</div>
    `;
    planetsGrid.appendChild(div);
  }

  // House grid
  const housesGrid = document.getElementById('houses-grid');
  housesGrid.innerHTML = '';
  cusps.forEach((cusp, idx) => {
    const div = document.createElement('div');
    div.className = 'planet-item';
    div.innerHTML = `
      <div class="name">Kuća ${idx + 1}</div>
      <div class="value">${getZodiac(cusp)}</div>
    `;
    housesGrid.appendChild(div);
  });

  // Aspects
  const aspectsGrid = document.getElementById('aspects-grid');
  if (aspectsGrid) {
    aspectsGrid.innerHTML = '';
    if (aspects.length === 0) {
      aspectsGrid.innerHTML = '<p style="color:var(--text-muted)">Nema zabeleženih glavnih aspekata.</p>';
    } else {
      const typeOrder = ['conjunction', 'opposition', 'trine', 'square', 'sextile'];
      const byType = {};
      aspects.forEach(a => {
        if (!byType[a.type]) byType[a.type] = [];
        byType[a.type].push(a);
      });
      typeOrder.forEach(type => {
        if (!byType[type]) return;
        byType[type].forEach(a => {
          const div = document.createElement('div');
          div.className = 'aspect-item';
          const p1 = planetNames[a.planet1] || a.planet1;
          const p2 = planetNames[a.planet2] || a.planet2;
          const s1 = planetData[a.planet1]?.sign || '';
          const s2 = planetData[a.planet2]?.sign || '';
          const sym = aspectSymbols[type] || '◆';
          const orb = a.orb !== undefined ? `±${a.orb.toFixed(1)}°` : '';
          div.innerHTML = `
            <div class="aspect-symbol">${sym}</div>
            <div class="aspect-info">
              <div class="aspect-planets">${p1} <span style="color:var(--text-muted)">u ${s1}</span> &nbsp;×&nbsp; ${p2} <span style="color:var(--text-muted)">u ${s2}</span></div>
              <div class="aspect-type">${aspectNames[type] || type}</div>
            </div>
            <div class="aspect-orb">${orb}</div>
          `;
          aspectsGrid.appendChild(div);
        });
      });
    }
  }

  // AstroChart
  if (typeof renderChartWithAstroChart === 'function') {
    const data = { planets: {}, cusps, fortune: planetData.Fortune?.deg };
    const acPlanetMap = {
      Sun: 'Sun', Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus',
      Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturn',
      Uranus: 'Uranus', Neptune: 'Neptune', Pluto: 'Pluto',
      Chiron: 'Chiron', MeanNode: 'NNode', MeanApogee: 'Lilith',
    };
    const degreeTexts = {};
    for (const [key, pos] of Object.entries(planetData)) {
      const acKey = acPlanetMap[key];
      if (!acKey) continue;
      if (pos.retrograde) {
        data.planets[acKey] = [pos.deg, -1];
      } else {
        data.planets[acKey] = [pos.deg];
      }
      const deg = pos.deg % 30;
      const d = Math.floor(deg);
      const m = Math.floor((deg % 1) * 60);
      degreeTexts[Math.round(deg)] = `${d}°${m.toString().padStart(2, '0')}'`;
    }
    renderChartWithAstroChart(data, 'chart-visual', degreeTexts);
  }

  document.getElementById('results').style.display = 'block';
  document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

init();
