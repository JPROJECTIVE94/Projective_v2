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

// Contact form: validate, then hand off to the visitor's mail client with the details filled in
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('cf-error');
    if (!form.checkValidity()) { err.hidden = false; var bad = form.querySelector(':invalid'); if (bad) bad.focus(); return; }
    err.hidden = true;
    var v = function (n) { var el = form.elements[n]; return el ? (el.value || '').trim() : ''; };
    var rec = form.querySelector('input[name="rec"]:checked'); var files = form.elements.files && form.elements.files.files ? Array.prototype.map.call(form.elements.files.files, function (f) { return f.name; }) : []; var lines = ['Name: ' + v('name'), 'Company: ' + v('company'), 'Email: ' + v('email'), 'I am a: ' + v('role'), 'Project type: ' + v('projectType'), 'Project state: ' + v('state'), 'REC eligible: ' + (rec ? rec.value : ''), 'Capital need range: ' + v('capital'), '', v('notes'), '', files.length ? 'Documents to attach: ' + files.join(', ') : ''];
    var subject = 'Project enquiry from ' + v('company');
    window.location.href = 'mailto:hello@projective.finance?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
    form.classList.add('is-sent');
    document.getElementById('cf-thanks').hidden = false;
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

// Hero starfield: the dot grid, with each dot pulsing on its own phase
(function () {
  var canvas = document.querySelector('[data-stars]');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GAP = 24, dots = [], w = 0, h = 0, dpr = 1, raf = 0, visible = true, t0 = performance.now();
  function rand(seed) { var x = Math.sin(seed * 9999.7) * 10000; return x - Math.floor(x); }
  function build() {
    var rect = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, Math.round(rect.width)); h = Math.max(1, Math.round(rect.height));
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = [];
    var cols = Math.ceil(w / GAP) + 1, rows = Math.ceil(h / GAP) + 1;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var i = r * cols + c, a = rand(i + 1), b = rand(i + 7), d = rand(i + 13);
      var bright = a > 0.86, gold = d > 0.97;
      dots.push({ x: c * GAP + 12, y: r * GAP + 12,
        base: bright ? 0.30 : 0.06 + b * 0.06, amp: bright ? 0.70 : 0.30 + a * 0.15,
        speed: (bright ? 0.9 : 0.7) + b * 1.8, phase: d * Math.PI * 2,
        size: bright ? 1.4 + a * 1.2 : 1.05, gold: gold });
    }
  }
  function draw(now) {
    var t = (now - t0) / 1000, k = reduce ? 0.4 : 1;
    ctx.clearRect(0, 0, w, h);
    for (var n = 0; n < dots.length; n++) {
      var s = dots[n];
      var wave = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      var alpha = s.base + s.amp * k * wave;
      var size = s.size > 1.3 ? s.size * (0.8 + 0.5 * wave) : s.size;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = s.gold ? '#FFB726' : '#FFFFFF';
      ctx.beginPath(); ctx.arc(s.x, s.y, size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function loop(now) { if (!visible) { raf = 0; return; } draw(now); raf = requestAnimationFrame(loop); }
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
