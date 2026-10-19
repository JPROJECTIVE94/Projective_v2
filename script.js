// Projective Finance — site behaviour



// Flow: pinned three-step (scroll drives the active slide; tabs jump to a slide)
(function () {
  var section = document.getElementById('flow');
  var track = document.querySelector('[data-flow-track]');
  if (!section || !track) return;
  var slides = Array.prototype.slice.call(track.querySelectorAll('[data-flow-slide]'));
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-flow-tab]'));
  var n = slides.length, current = -1;
  function mobile() { return window.matchMedia('(max-width: 900px)').matches; }
  function setActive(i) {
    if (i === current) return;
    current = i;
    slides.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
    tabs.forEach(function (t, k) { if (k === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
    if (!mobile()) track.style.transform = 'translateX(' + (-i * 100) + '%)';
  }
  function update() {
    if (mobile()) { track.style.transform = ''; slides.forEach(function (s) { s.classList.add('is-active'); }); current = -1; return; }
    var rect = section.getBoundingClientRect();
    var total = section.offsetHeight - window.innerHeight;
    var progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
    var i = Math.min(n - 1, Math.floor(progress * n));
    setActive(i);
  }
  tabs.forEach(function (t, k) {
    t.addEventListener('click', function () {
      var total = section.offsetHeight - window.innerHeight;
      var y = section.getBoundingClientRect().top + window.scrollY + (total * (k + 0.5)) / n;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// Contact form: role first, then only that role's fields; POST to FORM_ENDPOINT when set, else hand off to email
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;
  var FORM_ENDPOINT = ''; // e.g. 'https://formspree.io/f/xxxxxxxx' — until set, submissions open the visitor's email client
  var COPY = {
    builder: ['Get your project financed.', 'We fund infrastructure end to end, from development capital through perm debt. Qualifying projects get pooled and closed from our global network of qualified investors.'],
    investor: ['Lend through Projective facilities.', 'Senior secured lending to solar, storage and municipal projects, from development capital to permanent debt. Tell us your mandate and we will send the term sheet.'],
    other: ['Talk to Projective.', 'Tell us a little about what you need and we will route it to the right person.']
  };
  var title = document.querySelector('[data-cf-title]'), intro = document.querySelector('[data-cf-intro]');
  var groups = { builder: form.querySelector('[data-cf-group="builder"]'), investor: form.querySelector('[data-cf-group="investor"]') };
  var REQ = { builder: ['projectType', 'state', 'capital'], investor: ['investorType', 'ticket', 'country'] };
  function roleKey(v) { return v === 'Lender' ? 'investor' : v === 'Builder' ? 'builder' : 'other'; }
  function setRole(v) {
    var key = roleKey(v);
    Object.keys(groups).forEach(function (g) {
      var on = g === key; groups[g].hidden = !on;
      REQ[g].forEach(function (n) { var el = form.elements[n]; if (el) el.required = on; });
    });
    var rec = form.querySelector('input[name="rec"][value="Yes"]'); if (rec) rec.required = key === 'builder';
    var c = COPY[key];
    if (title) title.innerHTML = c[0].replace(/\.$/, '') + '<span style="color: #D9A32B">.</span>';
    if (intro) intro.textContent = c[1];
  }
  form.querySelectorAll('input[name="role"]').forEach(function (r) { r.addEventListener('change', function () { setRole(r.value); }); });
  var q = new URLSearchParams(location.search), pre = q.get('role');
  if (pre) {
    var want = pre === 'investor' || pre === 'lender' ? 'Lender' : pre === 'builder' || pre === 'developer' ? 'Builder' : null;
    var el = want && form.querySelector('input[name="role"][value="' + want + '"]');
    if (el) { el.checked = true; setRole(want); }
  }
  var err = document.getElementById('cf-error'), thanks = document.getElementById('cf-thanks');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { err.hidden = false; var bad = form.querySelector(':invalid'); if (bad) bad.focus(); return; }
    err.hidden = true;
    var fd = new FormData(form);
    if (FORM_ENDPOINT) {
      var btn = form.querySelector('button[type="submit"]'); if (btn) btn.disabled = true;
      fetch(FORM_ENDPOINT, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } }).then(function (r) {
        if (!r.ok) throw new Error('send failed');
        form.classList.add('is-sent'); thanks.hidden = false;
        var a = document.querySelector('[data-cf-thanks-sent]'), b = document.querySelector('[data-cf-thanks-mail]'); if (a) a.hidden = false; if (b) b.hidden = true;
      }).catch(function () { if (btn) btn.disabled = false; err.textContent = 'Something went wrong sending the form. Email hello@projective.finance instead.'; err.hidden = false; });
      return;
    }
    var v = function (n) { var el = form.elements[n]; return el ? (el.value || '').trim() : ''; };
    var role = fd.get('role') || '', rec = fd.get('rec') || '';
    var files = form.elements.files && form.elements.files.files ? Array.prototype.map.call(form.elements.files.files, function (f) { return f.name; }) : [];
    var lines = ['Role: ' + role, 'Name: ' + v('name'), 'Company: ' + v('company'), 'Email: ' + v('email')];
    if (roleKey(role) === 'investor') lines = lines.concat(['Investor type: ' + v('investorType'), 'Ticket size: ' + v('ticket'), 'Country: ' + v('country')]);
    else lines = lines.concat(['Project type: ' + v('projectType'), 'Project state: ' + v('state'), 'REC eligible: ' + rec, 'Capital need range: ' + v('capital')]);
    lines = lines.concat(['', v('notes'), '', files.length ? 'Documents to attach: ' + files.join(', ') : '']);
    window.location.href = 'mailto:hello@projective.finance?subject=' + encodeURIComponent((roleKey(role) === 'investor' ? 'Investor enquiry' : 'Project enquiry') + ' from ' + v('company')) + '&body=' + encodeURIComponent(lines.join('\n'));
    form.classList.add('is-sent'); thanks.hidden = false;
  });
})();

// Contact: show chosen file names; highlight the drop zone on drag
(function () {
  var input = document.getElementById('cf-files'); var list = document.getElementById('cf-files-list'); var zone = document.querySelector('.cf-upload');
  if (!input || !list || !zone) return;
  var render = function () { list.textContent = input.files.length ? Array.prototype.map.call(input.files, function (f) { return f.name; }).join(' · ') : ''; };
  input.addEventListener('change', render);
  ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('is-over'); }); });
  zone.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) { input.files = e.dataTransfer.files; render(); } });
})();

// Hero starfield: the dot grid, each dot pulsing on its own phase (sprite-based, 30fps, cheap)
(function () {
  var canvas = document.querySelector('[data-stars]');
  if (!canvas) return;
  var ctx = canvas.getContext('2d', { alpha: true });
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GAP = 24, dots = [], w = 0, h = 0, dpr = 1, raf = 0, visible = true, t0 = performance.now(), lastDraw = 0;
  var sprites = {};
  var SHOT_EVERY = 30000, shot = null, nextShotAt = performance.now() + 8000, ORANGE = '#FF9F1C';
  function rand(seed) { var x = Math.sin(seed * 9999.7) * 10000; return x - Math.floor(x); }
  function sprite(color, r) {
    var key = color + r; if (sprites[key]) return sprites[key];
    var s = document.createElement('canvas'); var px = Math.ceil(r * 2 * dpr) + 2; s.width = s.height = px;
    var g = s.getContext('2d'); g.fillStyle = color; g.beginPath(); g.arc(px / 2, px / 2, r * dpr, 0, Math.PI * 2); g.fill();
    sprites[key] = s; return s;
  }
  function build() {
    var rect = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(1.5, window.devicePixelRatio || 1); sprites = {};
    w = Math.max(1, Math.round(rect.width)); h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    dots = [];
    var cols = Math.ceil(w / GAP) + 1, rows = Math.ceil(h / GAP) + 1;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var i = r * cols + c, a = rand(i + 1), b = rand(i + 7), d = rand(i + 13);
      var bright = a > 0.86, gold = d > 0.97;
      dots.push({ x: (c * GAP + 12) * dpr, y: (r * GAP + 12) * dpr,
        base: bright ? 0.30 : 0.06 + b * 0.06, amp: bright ? 0.70 : 0.30 + a * 0.15,
        speed: (bright ? 0.9 : 0.7) + b * 1.8, phase: d * Math.PI * 2,
        size: bright ? 1.4 + a * 1.2 : 1.05, bright: bright, color: gold ? '#FFB726' : '#FFFFFF' });
    }
  }
  function draw(now) {
    var t = (now - t0) / 1000, k = reduce ? 0.4 : 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var n = 0; n < dots.length; n++) {
      var s = dots[n];
      var wave = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      var alpha = s.base + s.amp * k * wave;
      var size = s.bright ? s.size * (0.8 + 0.5 * wave) : s.size;
      var img = sprite(s.color, Math.round(size * 4) / 4);
      ctx.globalAlpha = alpha > 1 ? 1 : (alpha < 0 ? 0 : alpha);
      ctx.drawImage(img, s.x - img.width / 2, s.y - img.height / 2);
    }
    if (shot) {
      var p = (now - shot.t0) / shot.dur;
      if (p >= 1) { shot = null; nextShotAt = now + SHOT_EVERY; }
      else {
        var head = sprite(ORANGE, 1.05), TRAIL = 9;
        for (var q = TRAIL; q >= 0; q--) {
          var pp = p - q * 0.022; if (pp < 0) continue;
          var x = shot.x0 + (shot.x1 - shot.x0) * pp, y = shot.y0 + (shot.y1 - shot.y0) * pp;
          ctx.globalAlpha = q === 0 ? 1 : (1 - q / (TRAIL + 1)) * 0.5;
          ctx.drawImage(head, x - head.width / 2, y - head.height / 2);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  function launchShot(now) {
    // Enter just past the top edge, travel down and to the left until the dot leaves the canvas
    var m = 12 * dpr, W = canvas.width, H = canvas.height, dx = -1, dy = 0.62;
    var x0 = (0.45 + Math.random() * 0.65) * W, y0 = -m;
    var len = Math.min((x0 + m) / -dx, (H + 2 * m) / dy);
    shot = { t0: now, dur: Math.max(900, Math.min(2200, len / (0.6 * W) * 1000)), x0: x0, y0: y0, x1: x0 + dx * len, y1: y0 + dy * len };
  }
  function loop(now) {
    if (!visible) { raf = 0; return; }
    if (!reduce && !shot && now >= nextShotAt) launchShot(now);
    if (shot || now - lastDraw >= 32) { lastDraw = now; draw(now); }
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf) raf = requestAnimationFrame(loop); }
  build(); draw(performance.now()); start();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }, { threshold: 0 }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { visible = true; start(); } });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(); draw(performance.now()); }, 150); });
})();

// Case study: play the timeline bars when the figure scrolls into view
(function () {
  var el = document.querySelector('[data-timeline]');
  if (!el) return;
  var play = function () { el.classList.add('is-in'); };
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { play(); return; }
  var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { play(); io.disconnect(); } }, { threshold: 0.4 });
  io.observe(el);
})();

// Capital structure snapshot: horizontal snap carousel
(function () {
  var track = document.querySelector('[data-fac-track]');
  if (!track) return;
  var cards = Array.prototype.slice.call(track.querySelectorAll('[data-fac-card]'));
  var prev = document.querySelector('[data-fac-prev]'), next = document.querySelector('[data-fac-next]');
  var dots = Array.prototype.slice.call(document.querySelectorAll('[data-fac-dots] i')), count = document.querySelector('[data-fac-count]');
  var n = cards.length, idx = 0;
  function step() { return cards[0].getBoundingClientRect().width + 16; }
  function sync() {
    var i = Math.round(track.scrollLeft / step()); i = Math.max(0, Math.min(n - 1, i));
    if (i === idx) return; idx = i;
    dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
    if (count) count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    if (prev) prev.disabled = i === 0; if (next) next.disabled = i === n - 1;
    var vp = document.querySelector('[data-fac-viewport]'); if (vp) vp.classList.toggle('is-end', i === n - 1);
    var hint = document.querySelector('[data-fac-hint]'); if (hint && i > 0) hint.classList.add('is-hidden');
  }
  function go(i) { i = Math.max(0, Math.min(n - 1, i)); track.scrollTo({ left: i * step(), behavior: 'smooth' }); }
  if (prev) { prev.disabled = true; prev.addEventListener('click', function () { go(idx - 1); }); }
  if (next) next.addEventListener('click', function () { go(idx + 1); });
  track.addEventListener('scroll', function () { window.requestAnimationFrame(sync); }, { passive: true });
  track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); } });
  // mouse drag to scroll (touch and trackpads already scroll natively)
  var down = false, startX = 0, startLeft = 0, moved = false;
  track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft; track.classList.add('is-dragging'); track.setPointerCapture(e.pointerId); });
  track.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - startX; if (Math.abs(dx) > 3) moved = true; track.scrollLeft = startLeft - dx; });
  function up(e) { if (!down) return; down = false; track.classList.remove('is-dragging'); go(Math.round(track.scrollLeft / step())); }
  track.addEventListener('pointerup', up); track.addEventListener('pointercancel', up);
  track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  window.addEventListener('resize', function () { track.scrollTo({ left: idx * step() }); });
})();
