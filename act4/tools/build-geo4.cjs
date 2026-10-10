// Bakes lon/lat geometry for Act 4 into assets/geo4.js (window.GEO4). Everything is in degrees so
// the composition can project it through one orthographic camera (globe -> South Asia -> Bhaluka).
// Needs d3-geo, topojson-client, world-atlas:  NODE_PATH=<dir>/node_modules node tools/build-geo4.cjs
const d3 = require("d3-geo");
const topo = require("topojson-client");
const w50 = require("world-atlas/countries-50m.json");
const land110 = require("world-atlas/land-110m.json");
const fs = require("fs");
const path = require("path");

const r2 = (n) => Math.round(n * 100) / 100;
const countries50 = topo.feature(w50, w50.objects.countries).features;
const land = topo.feature(land110, land110.objects.land);
const byId = (id) => countries50.find((f) => f.id === id);

let seed = 20261010;
const rand = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());

// South Asia, in the order they light up (Afghanistan and Pakistan -> Sri Lanka)
const SA = [["004", "AFGHANISTAN"], ["586", "PAKISTAN"], ["356", "INDIA"], ["524", "NEPAL"], ["064", "BHUTAN"], ["050", "BANGLADESH"], ["144", "SRI LANKA"], ["462", "MALDIVES"]];
const saF = SA.map(([id]) => byId(id));
const saIdx = (ll) => saF.findIndex((f) => d3.geoContains(f, ll));
const bdF = saF[5];

// ---- globe land dots: Fibonacci sphere, ~0.8 deg spacing
const N = 60000, GA = Math.PI * (3 - Math.sqrt(5));
const landLL = [], landSA = [];
for (let i = 0; i < N; i++) {
  const z = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - z * z), th = GA * i;
  const lon = (Math.atan2(r * Math.sin(th), r * Math.cos(th)) * 180) / Math.PI, lat = (Math.asin(z) * 180) / Math.PI;
  if (!d3.geoContains(land, [lon, lat])) continue;
  landLL.push(r2(lon), r2(lat));
  landSA.push(lon > 58 && lon < 99 && lat > 4 && lat < 40 && saIdx([lon, lat]) >= 0 ? 1 : 0);
}

// ---- South Asia dots, 0.2 deg grid, with country index (for lighting country by country)
const saLL = [], saC = [];
for (let lat = 38.5; lat > 5.4; lat -= 0.2)
  for (let lon = 60.5; lon < 97.6; lon += 0.2) {
    const c = saIdx([lon, lat]);
    if (c >= 0) { saLL.push(r2(lon), r2(lat)); saC.push(c); }
  }

// ---- Bangladesh dots, 0.045 deg grid (the Bhaluka close-up)
const bdLL = [];
for (let lat = 26.7; lat > 20.5; lat -= 0.045)
  for (let lon = 88.0; lon < 92.8; lon += 0.045)
    if (d3.geoContains(bdF, [lon, lat])) bdLL.push(r2(lon), r2(lat));

// ---- outlines (rings thinned to >= 0.04 deg steps)
function rings(f) {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const out = [];
  polys.forEach((p) => {
    const ring = p[0], keep = [];
    let last = null;
    ring.forEach(([lo, la]) => {
      if (!last || Math.hypot(lo - last[0], la - last[1]) >= 0.04) { keep.push(r2(lo), r2(la)); last = [lo, la]; }
    });
    if (keep.length >= 6) out.push(keep);
  });
  return out;
}
const countries = SA.map(([id, name], i) => {
  const c = d3.geoCentroid(saF[i]);
  return { name, label: [r2(c[0]), r2(c[1])], rings: rings(saF[i]) };
});
countries[2].label = [79.0, 22.0]; // India: keep the label off the coast
countries[7].label = [73.4, 3.6];

// ---- clustered samplers
function sample(clusters, n, accept) {
  const pts = [], meta = [];
  const tot = clusters.reduce((a, c) => a + c[4], 0);
  while (pts.length / 2 < n) {
    let r = rand() * tot, k = 0;
    while (r > clusters[k][4]) { r -= clusters[k][4]; k++; }
    const c = clusters[k], ll = [c[0] + gauss() * c[2], c[1] + gauss() * c[3]];
    if (!accept(ll)) continue;
    pts.push(r2(ll[0]), r2(ll[1])); meta.push(k);
  }
  return { ll: pts, k: meta };
}
// global fires: [lon, lat, sx, sy, weight, peak month 0-11]
const FIRE = [
  [-60, -9, 6, 4, 0.12, 8], [-48, -13, 4, 3, 0.07, 8], [20, 8, 9, 3, 0.14, 0], [24, -11, 8, 3, 0.14, 7],
  [115, 58, 15, 5, 0.07, 6], [132, -15, 10, 3, 0.1, 9], [102, 18, 4, 4, 0.08, 2], [80, 24, 6, 5, 0.1, 3],
  [75.5, 30.5, 1.5, 1, 0.03, 10], [-92, 17, 4, 3, 0.04, 3], [-118, 40, 4, 5, 0.03, 7], [65, 50, 10, 3, 0.04, 8],
  [113, -1, 6, 2, 0.04, 8],
];
const fires = sample(FIRE, 2600, (ll) => d3.geoContains(land, ll));
fires.m = fires.k.map((k) => FIRE[k][5]);
// South Asia's brick belt (stand-in for ~138,000 kilns)
const KILN = [
  [73.8, 31.3, 1.0, 0.7, 0.2], [76.2, 30.0, 1.0, 0.6, 0.15], [78.5, 28.6, 1.0, 0.6, 0.15], [84.0, 26.0, 2.0, 0.6, 0.2],
  [88.2, 23.2, 0.6, 0.6, 0.08], [90.3, 23.9, 0.6, 0.6, 0.15], [84.5, 27.3, 1.2, 0.3, 0.04], [68.5, 25.8, 0.6, 0.6, 0.03],
];
const kilns = sample(KILN, 1800, (ll) => saIdx(ll) >= 0);

const out = {
  land: { ll: landLL, sa: landSA },
  sa: { ll: saLL, c: saC },
  bd: { ll: bdLL },
  countries,
  fires: { ll: fires.ll, m: fires.m },
  kilns: { ll: kilns.ll },
  places: {
    bhaluka: [90.38, 24.38], naogaon: [88.94, 24.8], tangail: [89.92, 24.25], kurangani: [77.23, 10.08],
  },
  // forest and farm districts that would host a pilot
  pilots: [[90.38, 24.38], [89.2, 21.95], [75.4, 30.8], [79.2, 30.1], [77.23, 10.08], [84.4, 27.55], [80.7, 7.6], [90.4, 27.3], [68.6, 26.2], [71.6, 34.4], [85.3, 23.4]],
};
const js = "window.GEO4=" + JSON.stringify(out) + ";\n";
fs.writeFileSync(path.join(__dirname, "../assets/geo4.js"), js);
console.log("land", landLL.length / 2, "sa", saLL.length / 2, "bd", bdLL.length / 2, "fires", fires.ll.length / 2,
  "kilns", kilns.ll.length / 2, "rings", countries.map((c) => c.rings.reduce((a, r) => a + r.length / 2, 0)).join("/"), "KB", (js.length / 1024).toFixed(0));
