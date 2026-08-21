/* ============================================================
   ENAPP — paylaşımlı vanilla JS (açık tema)
   i18n + GSAP/ScrollTrigger/Lenis/SplitType düzenlemesi.
   Kütüphaneler yoksa veya reduced-motion ise içerik SADE + görünür kalır.
   ============================================================ */
(function () {
  "use strict";

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TOUCH = window.matchMedia && window.matchMedia("(hover: none)").matches;
  var SMALL = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
  var HEAVY = !REDUCED && !TOUCH && !SMALL;   // 3D tilt, paralaks, özel imleç
  var LANGS = ["tr", "en", "de"];

  /* ---------------- i18n ---------------- */
  function dictFor(l) { return (window.I18N && window.I18N[l]) || (window.I18N && window.I18N.tr) || {}; }
  function applyLang(lang) {
    if (LANGS.indexOf(lang) === -1) lang = "tr";
    var d = dictFor(lang);
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("data-lang", lang);
    var map = [["data-i18n","textContent"],["data-i18n-html","innerHTML"]];
    document.querySelectorAll("[data-i18n]").forEach(function (el){ var k=el.getAttribute("data-i18n"); if(d[k]!==undefined) el.textContent=d[k]; });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el){ var k=el.getAttribute("data-i18n-html"); if(d[k]!==undefined) el.innerHTML=d[k]; });
    document.querySelectorAll("[data-i18n-content]").forEach(function (el){ var k=el.getAttribute("data-i18n-content"); if(d[k]!==undefined) el.setAttribute("content", d[k]); });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el){ var k=el.getAttribute("data-i18n-ph"); if(d[k]!==undefined) el.setAttribute("placeholder", d[k]); });
    document.querySelectorAll("[data-lang-btn]").forEach(function (b){ b.setAttribute("aria-pressed", b.getAttribute("data-lang-btn")===lang?"true":"false"); });
    try { localStorage.setItem("enapp_lang", lang); } catch(e){}
  }
  function initLang() {
    var lang = null;
    try { var q = new URLSearchParams(location.search).get("lang"); if (q && LANGS.indexOf(q)!==-1) lang=q; } catch(e){}
    if (lang===null) { try { lang = localStorage.getItem("enapp_lang"); } catch(e){} }
    if (LANGS.indexOf(lang)===-1) { var n=(navigator.language||"tr").slice(0,2).toLowerCase(); lang=LANGS.indexOf(n)!==-1?n:"tr"; }
    applyLang(lang);
    document.querySelectorAll("[data-lang-btn]").forEach(function (b){ b.addEventListener("click", function(){ applyLang(b.getAttribute("data-lang-btn")); }); });
  }

  /* ---------------- Sayaç (varsa) ---------------- */
  function runCounter(el){ if(el.dataset.counted) return; el.dataset.counted="1"; var t=parseInt(el.getAttribute("data-count"),10)||0; if(REDUCED){el.textContent=String(t);return;} var s=null,dur=800; function step(ts){ if(s===null)s=ts; var p=Math.min((ts-s)/dur,1); el.textContent=String(Math.round((1-Math.pow(1-p,3))*t)); if(p<1)requestAnimationFrame(step);} requestAnimationFrame(step); }

  /* ---------------- Sade fallback: reveal görünür ---------------- */
  function showAllReveals(){ document.documentElement.classList.remove("gsap-ready"); document.querySelectorAll("[data-count]").forEach(runCounter); }

  /* ---------------- Eski Miniz çapaları ---------------- */
  function redirectOldAnchors(){ if(!document.body.hasAttribute("data-redirect-old"))return; var old=["#features","#neden","#yorumlar","#cta","#uygulamalar"]; var h=location.hash; if(h&&old.indexOf(h)!==-1) location.replace("/miniz/"+h); }

  /* ---------------- Motion (GSAP) ---------------- */
  function initMotion(){
    var gsap = window.gsap;
    if (!gsap || REDUCED) { showAllReveals(); return; }
    var ST = window.ScrollTrigger;
    if (ST) gsap.registerPlugin(ST);

    // Lenis yumuşak kaydırma
    if (window.Lenis && ST) {
      var lenis = new Lenis({ duration: 1.05, easing: function(t){ return Math.min(1, 1.001 - Math.pow(2, -10*t)); } });
      lenis.on("scroll", ST.update);
      gsap.ticker.add(function(t){ lenis.raf(t*1000); });
      gsap.ticker.lagSmoothing(0);
      document.documentElement.classList.add("lenis");
      window.__lenis = lenis;
    }

    // Hero: önce hedefleri GÖRÜNÜR set et (gsap-ready CSS opacity:0'ı ez), sonra from ile getir.
    var tl = gsap.timeline();
    var mark = document.querySelector(".mark-hero");
    var title = document.querySelector(".hero-title");
    var rises = gsap.utils.toArray(".hero-rise");
    gsap.set([mark, title].filter(Boolean).concat(rises), { opacity: 1 });
    if (mark) tl.from(mark, { scale: 0.8, opacity: 0, duration: 0.7, ease: "power3.out" }, 0);
    if (title && window.SplitType) {
      var st = new SplitType(title, { types: "words" });
      tl.from(st.words, { y: 26, opacity: 0, filter: "blur(10px)", duration: 0.6, stagger: 0.04, ease: "power3.out" }, 0.15)
        .set(st.words, { filter: "none" });
    }
    rises.forEach(function(el,i){ tl.from(el, { y: 18, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.4 + i*0.08); });

    // Reveal + stagger (ScrollTrigger)
    if (ST) {
      gsap.utils.toArray(".reveal").forEach(function(el){
        var kids = el.hasAttribute("data-stagger") ? el.children : [el];
        gsap.set(el, { opacity: 1 });
        gsap.from(kids, {
          y: 22, opacity: 0, duration: 0.6, ease: "power3.out",
          stagger: el.hasAttribute("data-stagger") ? 0.08 : 0,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
          onStart: function(){ el.querySelectorAll && el.querySelectorAll("[data-count]").forEach(runCounter); }
        });
      });

      // Paralaks: arka plan meshleri + hero telefonları (yalnız masaüstü)
      if (HEAVY) {
        gsap.utils.toArray(".mesh").forEach(function(m,i){
          gsap.to(m, { yPercent: (i%2?12:-12), ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1 } });
        });
        gsap.utils.toArray("[data-parallax]").forEach(function(el){
          var sp = parseFloat(el.getAttribute("data-parallax")) || 0.15;
          gsap.to(el, { yPercent: -sp*100, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 } });
        });
      }
    } else { showAllReveals(); }

    if (HEAVY) { initTilt(gsap); initMagnetic(gsap); initCursor(gsap); }
  }

  /* ---------------- 3D tilt ---------------- */
  function initTilt(gsap){
    document.querySelectorAll(".tilt").forEach(function(card){
      var qx=gsap.quickTo(card,"rotationY",{duration:.4,ease:"power3"});
      var qy=gsap.quickTo(card,"rotationX",{duration:.4,ease:"power3"});
      card.style.transformPerspective="900px";
      card.addEventListener("mousemove", function(e){ var r=card.getBoundingClientRect(); var px=(e.clientX-r.left)/r.width-0.5, py=(e.clientY-r.top)/r.height-0.5; qx(px*8); qy(-py*8); });
      card.addEventListener("mouseleave", function(){ qx(0); qy(0); });
    });
  }

  /* ---------------- Manyetik butonlar ---------------- */
  function initMagnetic(gsap){
    document.querySelectorAll(".magnetic").forEach(function(btn){
      var inner=btn.querySelector(".mag-inner")||btn;
      var qx=gsap.quickTo(btn,"x",{duration:.4,ease:"power3"}), qy=gsap.quickTo(btn,"y",{duration:.4,ease:"power3"});
      var ix=gsap.quickTo(inner,"x",{duration:.4,ease:"power3"}), iy=gsap.quickTo(inner,"y",{duration:.4,ease:"power3"});
      btn.addEventListener("mousemove", function(e){ var r=btn.getBoundingClientRect(); var x=e.clientX-r.left-r.width/2, y=e.clientY-r.top-r.height/2; qx(x*0.3); qy(y*0.3); ix(x*0.15); iy(y*0.15); });
      btn.addEventListener("mouseleave", function(){ qx(0);qy(0);ix(0);iy(0); });
    });
  }

  /* ---------------- Özel imleç ---------------- */
  function initCursor(gsap){
    var dot=document.createElement("div"), ring=document.createElement("div");
    dot.className="cursor-dot"; ring.className="cursor-ring";
    document.body.appendChild(dot); document.body.appendChild(ring); document.body.classList.add("has-cursor");
    var dx=gsap.quickTo(dot,"x",{duration:.05}), dy=gsap.quickTo(dot,"y",{duration:.05});
    var rx=gsap.quickTo(ring,"x",{duration:.28,ease:"power3"}), ry=gsap.quickTo(ring,"y",{duration:.28,ease:"power3"});
    window.addEventListener("mousemove", function(e){ dx(e.clientX);dy(e.clientY);rx(e.clientX);ry(e.clientY); });
    document.querySelectorAll("a,button,.tilt").forEach(function(el){
      el.addEventListener("mouseenter", function(){ ring.classList.add("grow"); });
      el.addEventListener("mouseleave", function(){ ring.classList.remove("grow"); });
    });
  }

  /* ---------------- Sayfa geçiş örtüsü ---------------- */
  function initPageTransition(gsap){
    if (!gsap || REDUCED) return;
    var veil=document.querySelector(".page-veil"); if(!veil) return;
    document.querySelectorAll('a[href]').forEach(function(a){
      var href=a.getAttribute("href");
      if(!href||href[0]==="#"||a.target==="_blank"||href.indexOf("mailto:")===0||href.indexOf("http")===0) return;
      a.addEventListener("click", function(e){ e.preventDefault(); gsap.to(veil,{opacity:1,duration:.3,ease:"power2.inOut",onComplete:function(){ location.href=href; }}); });
    });
  }

  function boot(){
    redirectOldAnchors();
    initLang();
    initMotion();
    initPageTransition(window.gsap);
  }
  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.ENAPP = { setLang: applyLang };
})();
