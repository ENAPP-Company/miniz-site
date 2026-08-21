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
    document.querySelectorAll("[data-lang-btn]").forEach(function (b){ b.addEventListener("click", function(){ applyLang(b.getAttribute("data-lang-btn")); if(window.__heroReplay) window.__heroReplay(); }); });
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

    // Hero logo + alt öğeler (başlık ayrı modülde: initHeroTitle, boot'ta çağrılır).
    var tl = gsap.timeline();
    var mark = document.querySelector(".mark-tile");
    var rises = gsap.utils.toArray(".hero-rise");
    gsap.set([mark].filter(Boolean).concat(rises), { opacity: 1 });
    if (mark) tl.from(mark, { scale: 0.8, opacity: 0, duration: 0.7, ease: "power3.out" }, 0);
    rises.forEach(function(el,i){ tl.from(el, { y: 18, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.3 + i*0.08); });

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

    if (HEAVY) { initTilt(gsap); initMagnetic(gsap); }
  }

  /* ---------------- Hero başlığı: harf harf geliş (3 sahne) ---------------- */
  function initHeroTitle(){
    var title=document.querySelector(".hero-title"); if(!title) return;
    var line1=title.querySelector(".line1"), line2=title.querySelector(".line2"); if(!line1||!line2) return;
    var gsap=window.gsap;
    function txt(){ var l=document.documentElement.getAttribute("lang")||"tr"; var d=(window.I18N&&window.I18N[l])||(window.I18N&&window.I18N.tr)||{}; return [d["hero.title1"],d["hero.title2"]]; }
    function render(){ var t=txt(); if(t[0]!==undefined) line1.textContent=t[0]; if(t[1]!==undefined) line2.textContent=t[1]; }
    render();
    // reduced-motion / GSAP yok: metin ANINDA görünür (SEO düz metin zaten DOM'da)
    if(!gsap || REDUCED){ title.style.opacity="1"; return; }

    var ease1 = window.CustomEase ? CustomEase.create("enHeroEase","M0,0 C0.16,1 0.3,1 1,1") : "power4.out";
    var tl=null, scrolled=false;
    function finishNow(){ if(tl) tl.progress(1); }   // yarıda kalan harf kalmasın (kaydırınca)
    function onScroll(){ if(scrolled)return; scrolled=true; finishNow(); window.removeEventListener("scroll",onScroll); }

    function play(){
      scrolled=false; window.addEventListener("scroll",onScroll,{passive:true});
      title.style.opacity="1"; gsap.set(title,{opacity:1});
      var s1=new SplitType(line1,{types:"chars"}), s2=new SplitType(line2,{types:"chars"});
      var c2=s2.chars.slice(); var dot=c2.length?c2.pop():null;   // son karakter = nokta
      var n1=s1.chars.length, n2=c2.length;
      // 1.6s SERT sınır: stagger'ları spec değerinde tut (28/20ms, mobilde yarısı),
      // metin uzunsa toplam 1.6s'yi aşmasın diye orantılı kıs.
      var maxStag1 = SMALL?0.014:0.028, maxStag2 = SMALL?0.010:0.020;
      var dur1=0.6, dur2=0.44, dotDur=0.34, gap=0.18, dotDelay=0.12, budget=1.5;
      var stagBudget = Math.max(0, budget - (gap+dur2+dotDelay+dotDur));
      var stag1 = Math.min(maxStag1, n1>1 ? stagBudget*0.6/(n1-1) : maxStag1);
      var stag2 = Math.min(maxStag2, n2>1 ? stagBudget*0.4/(n2-1) : maxStag2);
      tl=gsap.timeline();
      // Sahne 1: y40 + opacity0 + blur6 -> yerine
      tl.from(s1.chars,{y:40,opacity:0,filter:"blur(6px)",duration:dur1,stagger:stag1,ease:ease1},0);
      // Sahne 2: 1. bölümün stagger'ı bittikten +180ms; daha hızlı + scale1.06->1 (vurgulu)
      var scene2Pos=(n1-1)*stag1 + gap;
      tl.from(c2,{y:40,opacity:0,filter:"blur(6px)",scale:1.06,duration:dur2,stagger:stag2,ease:ease1}, scene2Pos);
      // Sahne 3: nokta en son, +120ms, scale0->1 yaylanarak
      if(dot){ var scene2End=scene2Pos+(n2-1)*stag2+dur2; tl.from(dot,{scale:0,opacity:0,duration:dotDur,ease:"back.out(2.2)"}, scene2End+dotDelay); }
      tl.eventCallback("onComplete",function(){ title.querySelectorAll(".char").forEach(function(c){ c.style.filter="none"; }); });
    }
    play();

    // Dil değişiminde yeniden oynat (eski harfler yukarı+blur çıkar, yeniler gelir)
    window.__heroReplay=function(){
      if(REDUCED){ render(); return; }
      var chars=title.querySelectorAll(".char");
      if(!chars.length){ render(); play(); return; }
      gsap.to(chars,{y:-24,opacity:0,filter:"blur(6px)",duration:0.26,stagger:0.004,ease:"power2.in",onComplete:function(){ render(); play(); }});
    };
  }

  /* ---------------- Slogan şeridi (yukarıdan kayarak değişen) ---------------- */
  function initSlogan(){
    var el=document.querySelector(".slogan span"); if(!el) return;
    function phrases(){ var l=document.documentElement.getAttribute("lang")||"tr"; var d=(window.I18N&&window.I18N[l])||(window.I18N&&window.I18N.tr)||{}; return d["hero.slogans"]||[]; }
    var p=phrases(); if(!p.length) return;
    var i=0; el.textContent=p[0];
    if(REDUCED) return;
    var gsap=window.gsap;
    setInterval(function(){
      var arr=phrases(); if(!arr.length) return;
      i=(i+1)%arr.length; var next=arr[i];
      if(gsap){ gsap.timeline()
        .to(el,{y:-22,opacity:0,duration:.35,ease:"power2.in"})
        .call(function(){ el.textContent=next; })
        .fromTo(el,{y:22,opacity:0},{y:0,opacity:1,duration:.42,ease:"power2.out"}); }
      else { el.textContent=next; }
    }, 2500);
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
    initHeroTitle();
    initSlogan();
    initMotion();
    initPageTransition(window.gsap);
  }
  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.ENAPP = { setLang: applyLang };
})();
