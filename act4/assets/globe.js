// Shared math/DOM helpers used by act4.html. The old flat-shaded orthographic dot-globe that used to
// live in this file is gone — assets/earth.js (real NASA imagery, WebGL) is the renderer now. This
// file only keeps the generic utilities act4.html's timeline still needs.
(function () {
  var K = (window.KIT = {
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
  });

  // ---- glow sprite shared by every lon/lat overlay (fires, kilns, country rings) drawn on top
  // of the real EARTH.render() imagery. Pure 2D-canvas; projection is supplied by the caller via
  // EARTH.project(t, lon, lat) so this file has no camera/globe math of its own any more.
  var glow = document.createElement("canvas"); glow.width = glow.height = 64;
  (function () {
    var g = glow.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,200,140,1)"); gr.addColorStop(0.18, "rgba(255,120,50,0.85)"); gr.addColorStop(0.5, "rgba(255,90,30,0.18)"); gr.addColorStop(1, "rgba(255,80,20,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  })();
  // ll: flat [lon0,lat0,lon1,lat1,...]; sizeFn(i) -> px diameter or <=0 to skip
  K.glows = function (ctx, t, ll, sizeFn) {
    var n = ll.length / 2;
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < n; i++) {
      var sz = sizeFn(i);
      if (!(sz > 0.3)) continue;
      var p = window.EARTH.project(t, ll[2 * i], ll[2 * i + 1]);
      if (p[2] <= 0.05) continue;
      ctx.drawImage(glow, p[0] - sz / 2, p[1] - sz / 2, sz, sz);
    }
    ctx.globalCompositeOperation = "source-over";
  };
  // ring: flat [lon0,lat0,...] boundary loop; draws one moveTo/lineTo path on ctx (caller sets style + strokes/fills)
  K.ring = function (ctx, t, ring) {
    var pen = false;
    for (var j = 0; j < ring.length; j += 2) {
      var p = window.EARTH.project(t, ring[j], ring[j + 1]);
      if (p[2] <= 0) { pen = false; continue; }
      if (pen) ctx.lineTo(p[0], p[1]); else { ctx.moveTo(p[0], p[1]); pen = true; }
    }
  };

})();
