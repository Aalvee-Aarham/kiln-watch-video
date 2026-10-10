// Shared helpers for Act 3 scenes. Everything procedural is painted as a pure function of time.
window.KIT = {
  rng: function (seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  // GSAP skips onUpdate on seek; a setter on the tweened object always runs.
  drive: function (tl, dur, paint) {
    var v = 0, o = {};
    Object.defineProperty(o, "t", { get: function () { return v; }, set: function (x) { v = x; paint(x); } });
    tl.to(o, { t: dur, duration: dur, ease: "none" }, 0);
    paint(0);
  },
  p: function (t, a, b) { return Math.min(1, Math.max(0, (t - a) / (b - a))); },
  out: function (x) { return 1 - Math.pow(1 - x, 3); },
  inOut: function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
  lerp: function (a, b, x) { return a + (b - a) * x; },
  svg: function (tag, attrs, parent) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  },
  line: function (pts) {
    var s = "";
    for (var i = 0; i < pts.length; i++) s += (i ? "L" : "M") + pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1);
    return s;
  },
  fmt: function (n, d) { return n.toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); },
};
// The five raw regional lines shared by the clue (s1) and the proof (s3). Monthly 2003-01..2024-12.
KIT.REGIONS = [
  ["AMAZON", "amazon", 8.5, 1.2, 3.0], ["CENTRAL AFRICA", "africa", 0.5, 1.4, 2.7], ["SIBERIA", "siberia", 5.0, 1.1, 3.3],
  ["AUSTRALIA", "australia", 10.0, 1.3, 2.8], ["SOUTH ASIA", "southasia", 3.0, 1.0, 3.2],
];
KIT.MONTHS = 264; KIT.J2012 = 108;
KIT.clueSeries = function () {
  var rnd = KIT.rng(1227);
  return KIT.REGIONS.map(function (r, i) {
    var raw = [], fixed = [];
    for (var m = 0; m < KIT.MONTHS; m++) {
      var mm = m % 12, dist = Math.min(Math.abs(mm - r[2]), 12 - Math.abs(mm - r[2]));
      var v = (0.12 + Math.exp(-(dist * dist) / (2 * r[3] * r[3]))) * (0.85 + 0.3 * Math.sin((m / 12) * 1.7 + i)) * (0.8 + 0.4 * rnd());
      fixed.push(v); raw.push(m >= KIT.J2012 ? v * r[4] : v);
    }
    return { raw: raw, fixed: fixed, max: Math.max.apply(null, raw) };
  });
};

// ---- lon/lat data for drawing onto the Earth (assets/earth.js)
(function () {
  // geo.bd is a Mercator fit of Bangladesh: 107.6 px/deg, x 51.9 = 88.02E, y 20 = 26.57N
  var D = Math.PI / 180, M0 = Math.log(Math.tan(Math.PI / 4 + (26.57 * D) / 2));
  var bdLL = function (p) {
    var m = M0 - (p[1] - 20) / 107.6 * D;
    return [88.02 + (p[0] - 51.9) / 107.6, (2 * Math.atan(Math.exp(m)) - Math.PI / 2) / D];
  };
  var B = window.GEO.bd;
  KIT.BD = {
    kilns: B.kilns.map(bdLL), fires: B.fires.map(bdLL),
    rings: window.GEO4.countries.filter(function (c) { return c.name === "BANGLADESH"; })[0].rings,
  };
  // project a flat lon/lat ring list into an SVG path at act time T (points behind the limb are dropped)
  KIT.ringPath = function (T, rings, alt) {
    var s = "";
    rings.forEach(function (r) {
      var pen = false;
      for (var i = 0; i < r.length; i += 2) {
        var p = window.EARTH.project(T, r[i], r[i + 1], alt);
        if (p[2] < 0.5) { pen = false; continue; }
        s += (pen ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
        pen = true;
      }
      if (pen) s += "Z";
    });
    return s;
  };
  // the five raw-count traces (shared by the clue and the proof so they match-cut)
  KIT.TR = { X0: 980, X1: 1800, Y0: 236, ROW: 92, AMP: 62 };
  KIT.TR.x = function (m) { return KIT.TR.X0 + (m / (KIT.MONTHS - 1)) * (KIT.TR.X1 - KIT.TR.X0); };
  KIT.buildTraces = function (svg, opts) {
    var T = KIT.TR, series = KIT.clueSeries(), X12 = T.x(KIT.J2012);
    var defs = KIT.svg("defs", {}, svg);
    var f = KIT.svg("filter", { id: opts.id + "-glow", x: "-10%", y: "-50%", width: "120%", height: "200%" }, defs);
    KIT.svg("feGaussianBlur", { stdDeviation: 4, result: "b" }, f);
    var mg = KIT.svg("feMerge", {}, f); KIT.svg("feMergeNode", { in: "b" }, mg); KIT.svg("feMergeNode", { in: "SourceGraphic" }, mg);
    var rows = KIT.REGIONS.map(function (r, i) {
      var base = T.Y0 + i * T.ROW + T.AMP, g = KIT.svg("g", {}, svg);
      KIT.svg("line", { x1: T.X0, x2: T.X1, y1: base, y2: base, stroke: "rgba(243,238,228,0.12)", "stroke-width": 1 }, g);
      var lab = KIT.svg("text", { x: T.X0 - 22, y: base - 6, "text-anchor": "end", "font-family": "Instrument Sans", "font-weight": 600, "font-size": 15, "letter-spacing": "4", fill: "rgba(243,238,228,0.85)", stroke: "rgba(0,0,0,0.7)", "stroke-width": 4, "paint-order": "stroke" }, g);
      lab.textContent = r[0];
      var band = KIT.svg("path", { d: "", fill: "#ff7a3d", opacity: 0 }, g);
      var pre = KIT.svg("path", { d: "", fill: "none", stroke: "rgba(243,238,228,0.88)", "stroke-width": 1.6, "stroke-linejoin": "round" }, g);
      var post = KIT.svg("path", { d: "", fill: "none", stroke: "rgba(243,238,228,0.88)", "stroke-width": 1.6, "stroke-linejoin": "round", filter: "url(#" + opts.id + "-glow)" }, g);
      var head = KIT.svg("circle", { r: 3.2, fill: "#fff", opacity: 0, filter: "url(#" + opts.id + "-glow)" }, g);
      var s = series[i], amp = function (v) { return base - (v / s.max) * T.AMP; };
      return { g: g, s: s, base: base, amp: amp, band: band, pre: pre, post: post, head: head, lab: lab };
    });
    var ax = [[0, "2003"], [KIT.J2012, "2012"], [KIT.MONTHS - 1, "2024"]].map(function (a) {
      var t = KIT.svg("text", { x: T.x(a[0]), y: T.Y0 + 5 * T.ROW + 22, "text-anchor": "middle", "font-family": "JetBrains Mono", "font-size": 15, fill: "rgba(243,238,228,0.7)", stroke: "rgba(0,0,0,0.7)", "stroke-width": 4, "paint-order": "stroke" }, svg);
      t.textContent = a[1];
      return t;
    });
    var yTop = T.Y0 - 26, yBot = T.Y0 + 5 * T.ROW - 12;
    var glow = KIT.svg("line", { x1: X12, x2: X12, y1: yTop, y2: yBot, stroke: "#ff4a48", "stroke-width": 16, opacity: 0, "stroke-linecap": "round" }, svg);
    var red = KIT.svg("line", { x1: X12, x2: X12, y1: yTop, y2: yBot, stroke: "#ff4a48", "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
    return { rows: rows, ax: ax, red: red, glow: glow, X12: X12, yTop: yTop, yBot: yBot };
  };
})();
