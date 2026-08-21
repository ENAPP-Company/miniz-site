/* ============================================================
   ENAPP — paylaşımlı vanilla JS
   i18n motoru + kaydırmayla belirme + sayaç + giriş sahnesi
   Sayfa kendi sözlüğünü window.I18N = { tr:{}, en:{}, de:{} } ile verir.
   ============================================================ */
(function () {
  "use strict";

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LANGS = ["tr", "en", "de"];

  /* ---------- i18n ---------- */
  function dictFor(lang) {
    return (window.I18N && window.I18N[lang]) || (window.I18N && window.I18N.tr) || {};
  }

  function applyLang(lang) {
    if (LANGS.indexOf(lang) === -1) lang = "tr";
    var dict = dictFor(lang);
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("data-lang", lang);

    // TUZAK: boş string atlanmasın → `!== undefined` kullan, `if(dict[key])` DEĞİL.
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (dict[k] !== undefined) el.textContent = dict[k];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-html");
      if (dict[k] !== undefined) el.innerHTML = dict[k];
    });
    document.querySelectorAll("[data-i18n-content]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-content");
      if (dict[k] !== undefined) el.setAttribute("content", dict[k]);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-ph");
      if (dict[k] !== undefined) el.setAttribute("placeholder", dict[k]);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-aria");
      if (dict[k] !== undefined) el.setAttribute("aria-label", dict[k]);
    });

    // dil düğmeleri
    document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang-btn") === lang ? "true" : "false");
    });

    try { localStorage.setItem("enapp_lang", lang); } catch (e) {}
  }

  function initLang() {
    // 1) ?lang= (paylaşılabilir link), 2) localStorage, 3) tarayıcı dili, 4) tr
    var lang = null;
    try {
      var q = new URLSearchParams(window.location.search).get("lang");
      if (q && LANGS.indexOf(q) !== -1) lang = q;
    } catch (e) {}
    if (lang === null) {
      try { lang = localStorage.getItem("enapp_lang"); } catch (e) {}
    }
    if (LANGS.indexOf(lang) === -1) {
      var nav = (navigator.language || "tr").slice(0, 2).toLowerCase();
      lang = LANGS.indexOf(nav) !== -1 ? nav : "tr";
    }
    applyLang(lang);
    document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () { applyLang(btn.getAttribute("data-lang-btn")); });
    });
  }

  /* ---------- Sayaç ---------- */
  function runCounter(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (REDUCED) { el.textContent = String(target); return; }
    var dur = 800, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      // easeOutCubic
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = String(target);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Kaydırmayla belirme + sayaç tetikleme ---------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal, .stagger");
    if (REDUCED || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("in"); });
      document.querySelectorAll("[data-count]").forEach(runCounter);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          e.target.querySelectorAll && e.target.querySelectorAll("[data-count]").forEach(runCounter);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });

    // Bağımsız sayaçlar (reveal içinde değilse)
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCounter(e.target); cObs.unobserve(e.target); } });
    }, { threshold: 0.6 });
    document.querySelectorAll("[data-count]").forEach(function (el) { cObs.observe(el); });
  }

  /* ---------- Giriş sahnesi (yalnızca #intro olan sayfada) ---------- */
  function initIntro() {
    var intro = document.getElementById("intro");
    var hero = document.querySelector(".hero-title");
    var seen = false;
    try { seen = localStorage.getItem("enapp_intro_seen") === "1"; } catch (e) {}
    var skip = false;
    try { skip = new URLSearchParams(window.location.search).get("nointro") === "1"; } catch (e) {}

    if (!intro || REDUCED || seen || skip) {
      if (intro) intro.parentNode && intro.parentNode.removeChild(intro);
      if (hero) hero.classList.add("no-intro");
      return;
    }
    // Sahneyi oynat
    if (hero) hero.classList.add("play-intro");
    try { localStorage.setItem("enapp_intro_seen", "1"); } catch (e) {}
    // Toplam < 1.2s: perde ~1.15s'de kalkar
    setTimeout(function () {
      intro.classList.add("done");
      setTimeout(function () { intro.parentNode && intro.parentNode.removeChild(intro); }, 560);
    }, 1150);
  }

  /* ---------- Eski Miniz çapalarını /miniz/ 'e yönlendir ---------- */
  function redirectOldAnchors() {
    if (!document.body.hasAttribute("data-redirect-old")) return;
    var old = ["#features", "#neden", "#yorumlar", "#cta", "#uygulamalar"];
    var h = window.location.hash;
    if (h && old.indexOf(h) !== -1) {
      window.location.replace("/miniz/" + h);
    }
  }

  function boot() {
    redirectOldAnchors();
    initLang();
    initIntro();
    initReveal();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // Dışarıya aç (gerekirse)
  window.ENAPP = { setLang: applyLang };
})();
