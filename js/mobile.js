/* Probador de Estilos UI — vista de app móvil */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const phone = $("#phone"), screen = $("#phScreen"), pager = $("#phPager");
  const COFFEES = [
    { n: "Huehuetenango", d: "Frambuesa, panela y final largo. Lavado, 1,900 msnm.", h: 18 },
    { n: "Acatenango", d: "Chocolate amargo y ceniza dulce. Natural, 1,700 msnm.", h: 18 },
    { n: "Atitlán", d: "Cítrico, floral y cuerpo ligero. Lavado, 1,600 msnm.", h: 150 },
    { n: "Cobán", d: "Caramelo, nuez y acidez suave. Honey, 1,400 msnm.", h: 35 },
    { n: "Fraijanes", d: "Durazno y miel de abeja. Lavado, 1,800 msnm.", h: 330 },
  ];
  let st = null;
  const has = p => st && st.mpats.has(p);

  // etiquetas para la barra de navegación expresiva
  $$("#phNav button").forEach(b => b.querySelector("i").dataset.label = b.querySelector("span").textContent);

  /* ---------- Material You: paleta desde un color semilla ---------- */
  function hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s * 100, l * 100];
  }
  function dynamicColor(seed) {
    const [h, s] = hexToHsl(seed); const c = Math.min(s, 70);
    const v = {
      "--m-bg": `hsl(${h} ${c * .35}% 97%)`, "--m-surface": `hsl(${h} ${c * .4}% 93%)`, "--m-surface2": `hsl(${h} ${c * .35}% 89%)`,
      "--m-on": `hsl(${h} 15% 12%)`, "--m-muted": `hsl(${h} 10% 38%)`, "--m-primary": `hsl(${h} ${c}% 36%)`, "--m-onprimary": "#fff",
      "--m-pc": `hsl(${h} ${Math.min(c + 20, 90)}% 86%)`, "--m-onpc": `hsl(${h} ${c}% 14%)`, "--m-ter": `hsl(${(h + 60) % 360} ${c * .6}% 40%)`,
      "--m-line": `hsl(${h} ${c * .3}% 82%)`,
    };
    Object.entries(v).forEach(([k, val]) => phone.style.setProperty(k, val));
  }
  function clearDynamic() { [...phone.style].filter(p => p.startsWith("--m-")).forEach(p => phone.style.removeProperty(p)); }

  /* ---------- páginas / navegación ---------- */
  let page = 0;
  function goPage(i) {
    page = i;
    pager.scrollTo({ left: i * pager.clientWidth, behavior: has("pager") ? "smooth" : "auto" });
    $$("#phNav button").forEach((b, k) => b.classList.toggle("on", k === i));
  }
  $("#phNav").addEventListener("click", e => { const b = e.target.closest("button"); if (b) goPage(+b.dataset.to); });
  pager.addEventListener("scroll", () => {
    if (!has("pager")) return;
    const i = Math.round(pager.scrollLeft / pager.clientWidth);
    if (i !== page) { page = i; $$("#phNav button").forEach((b, k) => b.classList.toggle("on", k === i)); }
  }, { passive: true });

  /* ---------- detalle: bottom sheet o pantalla completa ---------- */
  const sheet = $("#phSheet"), scrim = $("#phScrim"), detail = $("#phDetail");
  function openCoffee(c) {
    const target = has("sheet") ? sheet : detail;
    target.querySelector(".ph-detail-title").textContent = c.n;
    target.querySelector(".ph-detail-notes").textContent = c.d;
    target.style.setProperty("--dh", c.h);
    if (has("sheet")) { sheet.style.transform = ""; sheet.classList.add("open"); scrim.classList.add("open"); }
    else detail.classList.add("open");
  }
  function closeSheet() { sheet.classList.remove("open"); scrim.classList.remove("open"); sheet.style.transform = ""; }
  $("#phList").addEventListener("click", e => { const li = e.target.closest(".ph-item"); if (li) openCoffee(COFFEES[+li.dataset.i + 1]); });
  $(".ph-feature").addEventListener("click", () => openCoffee(COFFEES[0]));
  $("#phBack").onclick = () => detail.classList.remove("open");
  scrim.onclick = closeSheet;
  $$(".ph-cta").forEach(b => b.addEventListener("click", () => { closeSheet(); detail.classList.remove("open"); msg("Agregado al pedido"); }));

  // arrastrar el sheet hacia abajo para cerrarlo
  let sy = null, sd = 0;
  $("#phHandle").addEventListener("pointerdown", e => { sy = e.clientY; sd = 0; sheet.classList.add("dragging"); e.target.setPointerCapture(e.pointerId); });
  $("#phHandle").addEventListener("pointermove", e => { if (sy === null) return; sd = Math.max(0, e.clientY - sy); sheet.style.transform = `translateY(${sd}px)`; });
  $("#phHandle").addEventListener("pointerup", () => { sheet.classList.remove("dragging"); if (sd > 90) closeSheet(); else sheet.style.transform = ""; sy = null; });

  /* ---------- swipe cards ---------- */
  const deck = $("#phDeck");
  let order = [...COFFEES];
  function renderDeck() {
    deck.innerHTML = "";
    order.forEach((c, k) => {
      const d = document.createElement("div");
      d.className = "ph-card"; d.style.setProperty("--h", c.h); d.style.setProperty("--k", k); d.style.zIndex = 10 - k;
      d.innerHTML = `<span class="stamp yes">ME GUSTA</span><span class="stamp no">PASO</span><b>${c.n}</b><span>${c.d}</span>`;
      deck.appendChild(d);
    });
    bindTop();
  }
  function fling(dir) {
    const top = deck.firstElementChild; if (!top || !has("swipe")) return;
    top.style.transition = "transform .45s ease-in, opacity .45s";
    top.style.transform = `translate(${dir * 420}px, -40px) rotate(${dir * 30}deg)`; top.style.opacity = 0;
    msg(dir > 0 ? "Te gusta " + order[0].n : "Pasaste " + order[0].n);
    setTimeout(() => { order.push(order.shift()); renderDeck(); }, 380);
  }
  function bindTop() {
    const c = deck.firstElementChild; if (!c) return;
    let x0 = null, dx = 0;
    c.addEventListener("pointerdown", e => { if (!has("swipe")) return; x0 = e.clientX; dx = 0; c.classList.add("dragging"); c.setPointerCapture(e.pointerId); });
    c.addEventListener("pointermove", e => {
      if (x0 === null) return; dx = e.clientX - x0;
      c.style.transform = `translateX(${dx}px) rotate(${dx / 14}deg)`;
      c.querySelector(".yes").style.opacity = Math.max(0, dx / 100); c.querySelector(".no").style.opacity = Math.max(0, -dx / 100);
    });
    c.addEventListener("pointerup", () => {
      if (x0 === null) return; c.classList.remove("dragging"); x0 = null;
      if (Math.abs(dx) > 100) fling(Math.sign(dx)); else { c.style.transform = ""; $$(".stamp", c).forEach(s => s.style.opacity = 0); }
    });
  }
  $$("[data-swipe]").forEach(b => b.onclick = () => fling(+b.dataset.swipe));

  /* ---------- haptics ---------- */
  const pulse = $("#phPulse");
  screen.addEventListener("pointerdown", e => {
    if (!has("haptics") || !e.target.closest(".ph-tap, .ph-card")) return;
    if (navigator.vibrate) navigator.vibrate(12);
    const r = screen.getBoundingClientRect();
    pulse.style.left = (e.clientX - r.left) + "px"; pulse.style.top = (e.clientY - r.top) + "px";
    pulse.classList.remove("go"); void pulse.offsetWidth; pulse.classList.add("go");
    screen.classList.remove("buzz"); void screen.offsetWidth; screen.classList.add("buzz");
  });
  $$(".ph-switch").forEach(s => s.parentElement.addEventListener("click", () => s.classList.toggle("on")));
  $$(".ph-chips span").forEach(s => s.addEventListener("click", () => { $$(".ph-chips span").forEach(x => x.classList.remove("on")); s.classList.add("on"); }));
  $(".ph-fab").onclick = () => msg("Nuevo pedido");

  let msgT;
  function msg(t) { const el = $("#phToast"); el.textContent = t; el.classList.add("show"); clearTimeout(msgT); msgT = setTimeout(() => el.classList.remove("show"), 1300); }

  /* ---------- aplicar estado desde app.js ---------- */
  window.Mobile = {
    apply(state) {
      const prevSwipe = has("swipe");
      st = state;
      phone.dataset.sys = state.msys;
      ["sheet", "swipe", "haptics", "pager"].forEach(p => phone.classList.toggle("p-" + p, state.mpats.has(p)));
      clearDynamic(); if (state.msys === "you") dynamicColor(state.seed);
      $("#seedRow") && ($("#seedRow").style.display = state.msys === "you" ? "flex" : "none");
      $("#phDeckHint").textContent = has("swipe") ? "Arrastra la tarjeta a los lados" : "Activa “Swipe cards” para deslizar";
      if (!has("sheet")) closeSheet(); else detail.classList.remove("open");
      if (prevSwipe !== has("swipe")) renderDeck();
      requestAnimationFrame(() => goPage(page));
    },
  };
  renderDeck();
})();
