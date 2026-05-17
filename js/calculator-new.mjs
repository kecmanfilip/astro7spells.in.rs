import { SwissEphemeris, Planet, HouseSystem, LunarPoint, CalculationFlag } from './swisseph-browser.js';
import { cities } from './cities.js';

// Inicijalizuj Swiss Ephemeris
const swe = new SwissEphemeris();
let sweReady = false;

async function initSwissEphemeris() {
  if (sweReady) return;
  await swe.init();
  sweReady = true;
}

const zodiacSigns = [
  'Ovan', 'Bik', 'Blizanci', 'Rak', 'Lav',
  'Devica', 'Vaga', 'Škorpija', 'Strelac',
  'Jarac', 'Vodolija', 'Ribe'
];

const planetNames = {
  sun: 'Sunce', moon: 'Mesec', mercury: 'Merkur', venus: 'Venera',
  mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
  uranus: 'Uran', neptune: 'Neptun', pluto: 'Pluton',
};

function getZodiac(deg) {
  const idx = Math.floor(deg / 30) % 12;
  const d = Math.floor(deg % 30);
  const m = Math.floor(((deg % 30) % 1) * 60);
  return `${zodiacSigns[idx]} ${d}°${m.toString().padStart(2, '0')}'`;
}

function getSign(deg) {
  return zodiacSigns[Math.floor(deg / 30) % 12];
}

// Planet ID mapa za @swisseph/browser
const planetMap = {
  Sun: Planet.Sun,
  Moon: Planet.Moon,
  Mercury: Planet.Mercury,
  Venus: Planet.Venus,
  Mars: Planet.Mars,
  Jupiter: Planet.Jupiter,
  Saturn: Planet.Saturn,
  Uranus: Planet.Uranus,
  Neptune: Planet.Neptune,
  Pluto: Planet.Pluto,
};

// Aspekt proračuni
function getAspects(planetPositions) {
  const aspects = [];
  const aspectTypes = [
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

      for (const asp of aspectTypes) {
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

async function calculateChart() {
  await initSwissEphemeris();

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

  let lat, lon;
  if (cityVal === 'manual') {
    lat = parseFloat(document.getElementById('lat').value);
    lon = parseFloat(document.getElementById('lon').value);
    if (isNaN(lat) || isNaN(lon)) {
      alert('Molimo unesite validne koordinate.');
      return;
    }
  } else {
    const coords = JSON.parse(cityVal);
    lat = coords.lat;
    lon = coords.lon;
  }

  // Julian Day — vreme je lokalno, ali prosleđujemo kao UTC+offset
  // @swisseph/browser julianDay očekuje UTC vreme
  // Moramo konvertovati lokalno vreme u UTC
  const localDate = new Date(year, month - 1, day, hour, minute, 0);
  const timezoneOffset = localDate.getTimezoneOffset(); // u minutima
  const utcDate = new Date(localDate.getTime() - timezoneOffset * 60000);

  const jd = swe.julianDay(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
    utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60 + utcDate.getUTCSeconds() / 3600
  );

  // Planete
  const planetPositions = {};
  const planetData = {};
  for (const [name, id] of Object.entries(planetMap)) {
    const pos = swe.calculatePosition(jd, id);
    planetPositions[name] = pos;
    planetData[name] = {
      deg: pos.longitude,
      sign: getSign(pos.longitude),
      retrograde: pos.latitude < 0, // Speed < 0 = retrogradno
    };
  }

  // Lilith (Mean Apogee)
  const lilithPos = swe.calculatePosition(jd, LunarPoint.MeanApogee);
  planetPositions['Lilith'] = lilithPos;

  // Part of Fortune — treba poseban proračun
  // Pars Fortunae = Ascendant + Moon - Sun (za noćne karte: Ascendant + Sun - Moon)
  // Za sada preskačemo

  // Kuće
  const houseData = swe.calculateHouses(jd, lat, lon, HouseSystem.Placidus);
  const cusps = houseData.cusps;
  const ascendant = houseData.ascendant;
  const mc = houseData.mediumCoeli;

  // Aspekti
  const aspects = getAspects(planetPositions);

  // Render rezultate
  renderResults(name, planetData, cusps, ascendant, mc, aspects);
}

function renderResults(name, planetData, cusps, ascendant, mc, aspects) {
  document.getElementById('res-name').textContent = name;

  document.getElementById('res-sun').textContent =
    `${getZodiac(planetData.Sun.deg)} (${planetData.Sun.sign})`;
  document.getElementById('res-moon').textContent =
    `${getZodiac(planetData.Moon.deg)} (${planetData.Moon.sign})`;
  document.getElementById('res-asc').textContent = getZodiac(ascendant);
  document.getElementById('res-mc').textContent = getZodiac(mc);

  // Planet grid
  const planetsGrid = document.getElementById('planets-grid');
  planetsGrid.innerHTML = '';
  for (const [key, data] of Object.entries(planetData)) {
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

  // Aspekti
  const aspectsGrid = document.getElementById('aspects-grid');
  if (aspectsGrid) {
    aspectsGrid.innerHTML = '';
    if (aspects.length === 0) {
      aspectsGrid.innerHTML = '<p style="color:var(--text-muted)">Nema zabeleženih glavnih aspekata.</p>';
    } else {
      aspects.forEach(a => {
        const div = document.createElement('div');
        div.className = 'aspect-item';
        div.innerHTML = `
          <div class="aspect-symbol">${a.type === 'conjunction' ? '☌' : a.type === 'sextile' ? '⚹' : a.type === 'square' ? '□' : a.type === 'trine' ? '△' : '☍'}</div>
          <div class="aspect-info">
            <div class="aspect-planets">${planetNames[a.planet1] || a.planet1} × ${planetNames[a.planet2] || a.planet2}</div>
            <div class="aspect-type">${a.type}</div>
          </div>
          <div class="aspect-orb">±${a.orb}°</div>
        `;
        aspectsGrid.appendChild(div);
      });
    }
  }

  // AstroChart
  if (typeof renderChartWithAstroChart === 'function') {
    const acSign = getSign(ascendant);
    const mcSign = getSign(mc);
    const data = {
      planets: {},
      cusps: cusps,
    };
    for (const [key, pos] of Object.entries(planetPositions)) {
      const deg = pos.longitude;
      const retro = pos.latitude < 0 ? -1 : undefined; // speed je u latitude
      data.planets[key] = retro ? [deg, retro] : [deg];
    }
    renderChartWithAstroChart(data, 'chart-visual');
  }

  document.getElementById('results').style.display = 'block';
  document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

// Init
document.getElementById('calc-form').addEventListener('submit', (e) => {
  e.preventDefault();
  calculateChart();
});
