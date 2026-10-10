// One Earth for all of Act 3: a single camera path (act seconds), NASA textures, and the projection
// every scene uses to pin data onto the planet. Pure functions of act time; render() draws one frame.
(function () {
  var D = Math.PI / 180, W = 1920, H = 1080;
  var clamp = function (x) { return Math.min(1, Math.max(0, x)); };
  var EASE = {
    lin: function (x) { return x; },
    io: function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    out: function (x) { return 1 - Math.pow(1 - x, 3); },
    dive: function (x) { return x < 0.5 ? 16 * Math.pow(x, 5) : 1 - Math.pow(-2 * x + 2, 5) / 2; },
    cut: function (x) { return x >= 1 ? 1 : 0; },
  };

  // ---- camera: orbit around a target on the surface. lon/lat = target, dist = camera-target (Earth radii),
  // hd = compass heading the camera faces, el = elevation above the target's horizon, sx/sy = lens shift (NDC).
  var SHOT_KEYS = [
    // S1 clue: dawn on the night side, looking east along the horizon
    [0.0, { lon: 104, lat: 18, dist: 0.62, hd: 84, el: 9, roll: -2, fov: 38, sx: 0, sy: -0.34 }],
    [9.7, { lon: 107, lat: 18.5, dist: 0.58, hd: 86, el: 9.5, roll: -1.5 }, "lin"],
    // S2 the fix: dive onto Bangladesh (left of frame)
    [11.1, { lon: 90.3, lat: 23.7, dist: 0.215, hd: 0, el: 90, roll: 0, fov: 38, sx: -0.42, sy: 0 }, "dive"],
    [14.5, { dist: 0.205 }, "lin"],
    [18.4, { lon: 90.6, hd: 5, dist: 0.2 }, "io"],
    [19.0, { lon: 90.3, hd: 0, dist: 0.205 }, "io"],
    [24.9, { dist: 0.188 }, "lin"],
    // S3 proof: match-cut back to the clue's horizon, then down to Bangladesh, then out to orbit
    [25.0, { lon: 107, lat: 18.5, dist: 0.58, hd: 86, el: 9.5, roll: -1.5, sx: 0, sy: -0.34 }, "cut"],
    [29.3, { lon: 108.2, dist: 0.57 }, "lin"],
    [30.5, { lon: 90.5, lat: 23.2, dist: 0.42, hd: -8, el: 52, roll: 0, sx: 0.32, sy: 0.05 }, "dive"],
    [33.4, { lon: 90.9, hd: -2, dist: 0.39 }, "lin"],
    [34.5, { lon: 86, lat: 19, dist: 1.9, hd: 0, el: 90, sx: 0, sy: 0 }, "io"],
    [38.0, { lon: 82 }, "lin"],
    // S4 crops: the year dial lies on the ground; then pull out to every farm belt
    [38.9, { lon: 90.3, lat: 22.6, dist: 0.66, hd: 0, el: 56, sx: -0.42, sy: 0.04 }, "dive"],
    [44.3, { lon: 90.5, dist: 0.63, hd: 3 }, "lin"],
    [45.4, { lon: 62, lat: 20, dist: 2.7, hd: 0, el: 90, sx: 0.3, sy: 0 }, "io"],
    [47.0, { lon: 50 }, "lin"],
    // S5 kilns: straight down on Bangladesh
    [47.8, { lon: 90.3, lat: 23.7, dist: 0.215, hd: 0, el: 90, sx: -0.44, sy: 0 }, "dive"],
    [58.0, { dist: 0.19 }, "lin"],
    // S6 just ask: rewind spin, the 0:41 frame, then the site floats over South Asia
    [58.9, { lon: 300, lat: 18, dist: 2.1, sx: 0, sy: 0 }, "out"],
    [60.3, { lon: 282, lat: 19, dist: 1.95 }, "lin"],
    [61.2, { lon: 438, lat: 24, dist: 1.3, el: 72, hd: 0 }, "io"],
    [74.6, { lon: 440.5, dist: 1.22 }, "lin"],
    [75.6, {}, "lin"], // the 1 s freeze
    [77.0, { lon: 444, dist: 2.2, el: 90 }, "io"],
  ];
  // scalar tracks: [t, value, ease]
  var TRACKS = {
    sunLon: [[0, -150], [9.7, -152], [11.4, 100, "io"], [24.99, 102, "lin"], [25, -152, "cut"], [29.3, -153], [30.5, 98, "io"], [44.3, 98], [45.4, 50, "io"], [47.0, 50], [47.8, 98, "io"], [77, 100, "lin"]],
    sunLat: [[0, 6], [77, 6]],
    night: [[0, 0], [52.05, 0], [52.17, 1, "lin"], [58.0, 1], [58.6, 0, "io"]],
    cloudG: [[0, 0.9], [77, 0.9]],
    cloudR: [[0, 0.9], [9.8, 0.9], [11.0, 0, "io"], [18.6, 0], [19.2, 1, "out"], [24.99, 1], [25, 0.9, "cut"], [29.4, 0.9], [30.4, 0.1, "io"], [34.0, 0.1], [34.6, 0.9, "io"], [38.1, 0.9], [38.8, 0.08, "io"], [44.4, 0.08], [45.3, 0.9, "io"], [47.1, 0.9], [47.7, 0, "io"], [58, 0], [58.8, 0.9, "io"]],
    wipe: [[0, -999], [19.39, -999], [19.4, 87.6, "cut"], [22.0, 97.5, "io"], [24.99, 97.5], [25, -999, "cut"]],
    blur: [[0, 0], [14.4, 0], [14.9, 14, "io"], [18.3, 14], [18.8, 0, "io"], [29.4, 0], [30.4, 3, "io"], [33.4, 3], [34.4, 7, "io"], [38.0, 7], [38.6, 0, "io"], [58.0, 0], [58.3, 9, "io"], [74.6, 9], [75.6, 9], [76.9, 0, "io"]],
    expo: [[0, 1], [14.4, 1], [14.9, 0.42, "io"], [18.3, 0.42], [18.8, 1, "io"], [29.4, 1], [30.4, 0.55, "io"], [33.4, 0.55], [34.4, 0.38, "io"], [38.0, 0.38], [38.7, 0.95, "io"], [58.0, 0.95], [58.9, 0.5, "io"], [74.6, 0.5], [75.6, 0.5], [77, 1, "io"]],
  };

  function lerpKey(keys, t, field) {
    var i = 0;
    while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
    var a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    if (b === a || t <= a[0]) return field(a);
    var e = EASE[b[2] || "io"], x = e(clamp((t - a[0]) / (b[0] - a[0])));
    return field(a) + (field(b) - field(a)) * x;
  }
  // fill every shot key so each one names every field
  var FIELDS = ["lon", "lat", "dist", "hd", "el", "roll", "fov", "sx", "sy"], prev = {};
  SHOT_KEYS.forEach(function (k) { FIELDS.forEach(function (f) { if (k[1][f] === undefined) k[1][f] = prev[f]; }); prev = k[1]; });

  function track(name, t) { return lerpKey(TRACKS[name], t, function (k) { return k[1]; }); }
  function vec(lon, lat, r) {
    var lo = lon * D, la = lat * D, c = Math.cos(la);
    return [r * c * Math.cos(lo), r * c * Math.sin(lo), r * Math.sin(la)];
  }
  var add = function (a, b, s) { return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]; };
  var dot = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };
  var cross = function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; };
  var norm = function (a) { var l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };

  var memo = { t: NaN };
  function cam(t) {
    if (t === memo.t) return memo.c;
    var s = {};
    FIELDS.forEach(function (f) { s[f] = lerpKey(SHOT_KEYS, t, function (k) { return k[1][f]; }); });
    var lo = s.lon * D, la = s.lat * D;
    var n = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
    var E = [-Math.sin(lo), Math.cos(lo), 0], N = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
    var h = s.hd * D, e = s.el * D, r = s.roll * D;
    var hdir = add([N[0] * Math.cos(h), N[1] * Math.cos(h), N[2] * Math.cos(h)], E, Math.sin(h));
    var right = add([E[0] * Math.cos(h), E[1] * Math.cos(h), E[2] * Math.cos(h)], N, -Math.sin(h));
    // camera sits behind and above the target, looking at it
    var off = add([-hdir[0] * Math.cos(e), -hdir[1] * Math.cos(e), -hdir[2] * Math.cos(e)], n, Math.sin(e));
    var C = add(n, off, s.dist), F = norm([n[0] - C[0], n[1] - C[1], n[2] - C[2]]);
    var U = norm(cross(right, F));
    right = norm(cross(F, U));
    var R2 = add([right[0] * Math.cos(r), right[1] * Math.cos(r), right[2] * Math.cos(r)], U, Math.sin(r));
    var U2 = norm(cross(R2, F));
    var c = { C: C, R: R2, U: U2, F: F, tan: Math.tan((s.fov * D) / 2), sx: s.sx, sy: s.sy, s: s };
    memo = { t: t, c: c };
    return c;
  }
  // world point -> screen. returns [x, y, visible(0..1 limb fade), px per radian on the surface]
  function projectV(t, P) {
    var c = cam(t), d = [P[0] - c.C[0], P[1] - c.C[1], P[2] - c.C[2]], z = dot(d, c.F);
    if (z <= 1e-4) return [0, 0, 0, 0];
    var nx = dot(d, c.R) / (z * c.tan * (W / H)) + c.sx, ny = dot(d, c.U) / (z * c.tan) + c.sy;
    var pr = Math.hypot(P[0], P[1], P[2]), facing = dot([P[0] / pr, P[1] / pr, P[2] / pr], norm([c.C[0] - P[0], c.C[1] - P[1], c.C[2] - P[2]]));
    return [((nx + 1) / 2) * W, ((1 - ny) / 2) * H, clamp(facing / 0.08 + 0.5), H / 2 / (z * c.tan)];
  }
  function project(t, lon, lat, alt) { return projectV(t, vec(lon, lat, 1 + (alt || 0))); }
  // a point `km` east / north of (lon, lat) on the ground plane, for ground-drawn shapes like dials
  function offsetLL(lon, lat, eastDeg, northDeg) { return [lon + eastDeg / Math.cos(lat * D), lat + northDeg]; }

  // ---------------------------------------------------------------- WebGL
  var VS = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }";
  var FS = [
    "precision highp float;",
    "uniform vec2 uRes; uniform vec3 uC, uR, uU, uF, uSun; uniform float uTan, uAsp, uNight, uCloudG, uCloudR, uWipe, uExpo, uSunVis; uniform vec2 uShift, uSunScr;",
    "uniform sampler2D tDay, tNight, tCloud, rDay, rNight, rCloud;",
    "const float AT = 1.022;",
    "vec2 sph(vec3 ro, vec3 rd, float r){ float b = dot(ro, rd), c = dot(ro, ro) - r * r, h = b * b - c; if (h < 0.) return vec2(-1.); h = sqrt(h); return vec2(-b - h, -b + h); }",
    "vec3 lin(vec3 c){ return c * c; }",
    "vec3 samp(sampler2D g, sampler2D r, vec2 ll, float bias){",
    "  vec3 c = texture2D(g, vec2((ll.x + 180.) / 360., (90. - ll.y) / 180.), bias).rgb;",
    "  vec2 ru = vec2((ll.x - 65.) / 35., (40. - ll.y) / 35.);",
    "  float m = smoothstep(0., .04, ru.x) * smoothstep(1., .96, ru.x) * smoothstep(0., .04, ru.y) * smoothstep(1., .96, ru.y);",
    "  vec3 rc = texture2D(r, clamp(ru, 0., 1.)).rgb;",
    "  return mix(c, rc, m);",
    "}",
    "float hash(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }",
    "vec3 stars(vec3 rd){ vec3 q = rd * 260.; vec3 id = floor(q); float h = hash(id); if (h < .9965) return vec3(0.); vec3 f = fract(q) - .5; float d = length(f); float b = (h - .9965) / .0035; return mix(vec3(.75, .85, 1.), vec3(1., .9, .75), hash(id + 3.)) * smoothstep(.22, 0., d) * (.25 + 2.2 * b * b); }",
    "vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }",
    "void main(){",
    "  vec2 ndc = gl_FragCoord.xy / uRes * 2. - 1.;",
    "  vec3 rd = normalize(uF + uR * ((ndc.x - uShift.x) * uTan * uAsp) + uU * ((ndc.y - uShift.y) * uTan));",
    "  vec3 col = stars(rd) * .5;",
    "  vec2 hs = sph(uC, rd, 1.), ha = sph(uC, rd, AT);",
    "  float sunUp = dot(rd, uSun);",
    "  if (hs.x > 0.) {",
    "    vec3 n = uC + rd * hs.x;",
    "    vec2 ll = vec2(degrees(atan(n.y, n.x)), degrees(asin(clamp(n.z, -1., 1.))));",
    "    float ndl = dot(n, uSun);",
    "    float day = smoothstep(-.06, .22, ndl) * (1. - uNight);",
    "    vec3 alb = lin(samp(tDay, rDay, ll, 0.));",
    "    vec3 lights = lin(samp(tNight, rNight, ll, 0.));",
    "    lights = max(lights - .004, 0.) * vec3(1.15, .9, .62) * 2.3;",
    "    vec3 cl = samp(tCloud, rCloud, ll, 0.);",
    "    float mn = min(cl.r, min(cl.g, cl.b)), mx = max(cl.r, max(cl.g, cl.b));",
    "    float bdm = smoothstep(17., 11., length((ll - vec2(90.3, 23.7)) * vec2(cos(radians(ll.y)), 1.)));",
    "    float ca = smoothstep(.26, .8, mn) * (1. - smoothstep(.12, .34, mx - mn)) * mix(uCloudG, uCloudR, bdm);",
    "    ca *= 1. - (1. - smoothstep(uWipe - .12, uWipe + .12, ll.x)) * bdm;",
    "    vec3 surf = alb * (.03 + 1.25 * max(ndl, 0.)) * mix(.06, 1., 1. - uNight) + lights * (1. - day);",
    "    float ocean = smoothstep(.02, .07, alb.b - alb.r) * (1. - smoothstep(.06, .14, alb.g));",
    "    vec3 hv = normalize(uSun - rd);",
    "    surf += vec3(1., .92, .8) * pow(max(dot(n, hv), 0.), 70.) * .55 * ocean * day * (1. - ca);",
    "    vec3 cloudCol = lin(mix(vec3(.82), cl, .6)) * 1.25 * (.02 + 1.2 * max(ndl, 0.)) * (1. - uNight) + lights * .25 * (1. - day);",
    "    surf = mix(surf, cloudCol, ca);",
    "    float path = hs.x - max(ha.x, 0.);",
    "    float haze = 1. - exp(-path * 9.);",
    "    vec3 hazeCol = mix(vec3(1., .42, .16), vec3(.32, .56, 1.), smoothstep(-.05, .45, ndl)) * smoothstep(-.06, .3, ndl) * (1. - uNight * .9);",
    "    col = mix(surf, hazeCol * .8, haze * .7);",
    "  } else if (ha.x > 0.) {",
    "    float b = dot(uC, rd); vec3 cp = uC - rd * b; float d = length(cp);",
    "    float k = clamp((d - 1.) / (AT - 1.), 0., 1.);",
    "    float ndl = dot(normalize(cp), uSun);",
    "    vec3 rim = mix(vec3(1., .38, .12), vec3(.3, .55, 1.), smoothstep(-.1, .5, ndl));",
    "    float lit = smoothstep(-.35, .25, ndl);",
    "    col += rim * pow(1. - k, 3.2) * lit * 1.6 * (1. - uNight * .85);",
    "  }",
    "  if (hs.x < 0.) col += vec3(1., .82, .6) * (pow(max(sunUp, 0.), 900.) * 3. + pow(max(sunUp, 0.), 80.) * .06);",
    "  vec2 sd = ndc - uSunScr;",
    "  col += vec3(.45, .62, 1.) * exp(-abs(sd.y) * 70.) * exp(-abs(sd.x) * 1.6) * .55 * uSunVis;",
    "  col += vec3(1., .7, .45) * exp(-length(sd * vec2(uAsp, 1.)) * 5.) * .35 * uSunVis;",
    "  col = aces(col * uExpo * 1.35);",
    "  col = pow(col, vec3(.4545));",
    "  col = mix(col, col * vec3(.92, 1., 1.06), smoothstep(.4, 0., dot(col, vec3(.33))));",
    "  gl_FragColor = vec4(col, 1.);",
    "}",
  ].join("\n");

  var gl, prog, U = {}, canvas;
  var TEX = ["day", "night", "cloud", "rday", "rnight", "rcloud"], SAMP = ["tDay", "tNight", "tCloud", "rDay", "rNight", "rCloud"];
  function init(cv, base) {
    canvas = cv;
    gl = cv.getContext("webgl", { preserveDrawingBuffer: true, antialias: false, alpha: false });
    var sh = function (type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog); gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ["uRes", "uC", "uR", "uU", "uF", "uSun", "uTan", "uAsp", "uNight", "uCloudG", "uCloudR", "uWipe", "uExpo", "uSunVis", "uShift", "uSunScr"].concat(SAMP).forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    var aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    return Promise.all(TEX.map(function (name, i) {
      return new Promise(function (res, rej) {
        var img = new Image();
        img.onload = function () {
          var tx = gl.createTexture();
          gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, i < 3 ? gl.REPEAT : gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
          gl.uniform1i(U[SAMP[i]], i);
          res();
        };
        img.onerror = rej;
        img.src = base + name + ".jpg";
      });
    }));
  }
  function state(t) {
    var o = {};
    for (var k in TRACKS) o[k] = track(k, t);
    return o;
  }
  function render(t) {
    if (!gl) return;
    var c = cam(t), st = state(t), sun = vec(st.sunLon, st.sunLat, 1);
    // sun on screen (for the anamorphic streak); dims as the limb covers it
    var far = add(c.C, sun, 50), sp = projectV(t, far), b = dot(c.C, sun), cp = add(c.C, sun, -b), miss = Math.hypot(cp[0], cp[1], cp[2]);
    var vis = clamp((dot(sun, c.F) + 0.2) / 0.5) * (b > 0 ? 1 : clamp((miss - 0.99) / 0.04)) * (1 - st.night);
    gl.viewport(0, 0, W, H);
    gl.uniform2f(U.uRes, W, H);
    gl.uniform3fv(U.uC, c.C); gl.uniform3fv(U.uR, c.R); gl.uniform3fv(U.uU, c.U); gl.uniform3fv(U.uF, c.F); gl.uniform3fv(U.uSun, sun);
    gl.uniform1f(U.uTan, c.tan); gl.uniform1f(U.uAsp, W / H); gl.uniform2f(U.uShift, c.sx, c.sy);
    gl.uniform1f(U.uNight, st.night); gl.uniform1f(U.uCloudG, st.cloudG); gl.uniform1f(U.uCloudR, st.cloudR); gl.uniform1f(U.uWipe, st.wipe);
    gl.uniform1f(U.uExpo, st.expo); gl.uniform1f(U.uSunVis, vis); gl.uniform2f(U.uSunScr, (sp[0] / W) * 2 - 1, 1 - (sp[1] / H) * 2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.style.filter = st.blur > 0.05 ? "blur(" + st.blur.toFixed(2) + "px)" : "none";
  }

  window.EARTH = { cam: cam, project: project, offsetLL: offsetLL, state: state, init: init, render: render };
})();
