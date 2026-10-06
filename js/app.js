/* Probador de Estilos UI — lógica del panel, estado y técnicas web */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const byId = Object.fromEntries(CATALOG.map(i => [i.cat + ":" + i.id, i]));
  const items = cat => CATALOG.filter(i => i.cat === cat);
  const get = (cat, id) => byId[cat + ":" + id];

  const DEFAULT = { mode: "web", device: "desktop", style: "minimal", layout: "classic", techs: [], msys: "m3e", mpats: ["sheet"], seed: "#8B4A1F" };
  const state = { ...DEFAULT, techs: new Set(), mpats: new Set(DEFAULT.mpats) };
  let lastTouched = null;

  const pv = $("#pv"), frame = $("#frame");

  /* ---------------- panel ---------------- */
  const GROUPS = [
    { cat: "style", title: "Estilo visual", hint: "Uno a la vez. Cambia colores, fuentes, bordes y detalles.", type: "radio", key: "style", mode: "web" },
    { cat: "layout", title: "Layout / estructura", hint: "Cambia cómo se acomodan el hero y las tarjetas.", type: "radio", key: "layout", mode: "web" },
    { cat: "tech", title: "Técnicas", hint: "Combínalas. Haz scroll y pasa el mouse por la vista previa.", type: "checkbox", key: "techs", mode: "web" },
    { cat: "msys", title: "Mobile · sistema de diseño", hint: "Cambia a la vista de app automáticamente.", type: "radio", key: "msys", mode: "app" },
    { cat: "mpat", title: "Mobile · patrones", hint: "Toca la lista de cafés, ve a Descubrir, desliza.", type: "checkbox", key: "mpats", mode: "app" },
  ];

  function renderPanel() {
    const host = $("#groups");
    host.innerHTML = "";
    GROUPS.forEach(g => {
      const d = document.createElement("details");
      d.className = "group"; d.open = true; d.dataset.cat = g.cat;
      d.innerHTML = `<summary>${g.title} <small>${items(g.cat).length}</small></summary><p class="group-hint">${g.hint}</p>`;
      if (g.cat === "msys") {
        const ex = document.createElement("div");
        ex.className = "group-extra"; ex.id = "seedRow";
        ex.innerHTML = `<span>Color semilla (Material You):</span><input type="color" id="seed" value="${state.seed}">` +
          ["#8B4A1F", "#2E6B4F", "#3B5BA9", "#A8326E", "#B58A00"].map(c => `<button class="seed" data-seed="${c}" style="background:${c}" aria-label="Semilla ${c}"></button>`).join("");
        d.appendChild(ex);
      }
      items(g.cat).forEach(it => {
        const l = document.createElement("label");
        l.className = "opt"; l.dataset.search = (it.name + " " + it.desc + " " + (it.keys || "")).toLowerCase();
        l.innerHTML = `<input type="${g.type}" name="${g.key}" value="${it.id}" data-cat="${g.cat}">
          <span class="opt-name">${it.name}${it.tag ? `<em>${it.tag}</em>` : ""}</span>
          <span class="opt-desc">${it.desc}</span>`;
        d.appendChild(l);
      });
      host.appendChild(d);
    });
    const nr = document.createElement("p"); nr.className = "noresults"; nr.id = "noresults"; nr.textContent = "Nada coincide. Prueba con otra palabra.";
    host.appendChild(nr);

    host.addEventListener("change", e => {
      const inp = e.target;
      if (inp.id === "seed") { state.seed = inp.value; lastTouched = get("msys", "you"); state.msys = "you"; state.mode = "app"; return apply(); }
      const cat = inp.dataset.cat; if (!cat) return;
      const g = GROUPS.find(x => x.cat === cat);
      if (g.type === "radio") state[g.key] = inp.value;
      else inp.checked ? state[g.key].add(inp.value) : state[g.key].delete(inp.value);
      state.mode = g.mode;
      lastTouched = get(cat, inp.value);
      apply();
    });
    host.addEventListener("click", e => {
      const b = e.target.closest(".seed"); if (!b) return;
      state.seed = b.dataset.seed; state.msys = "you"; state.mode = "app"; lastTouched = get("msys", "you"); apply();
    });
  }

  function syncPanel() {
    $$("#groups input[data-cat]").forEach(inp => {
      const g = GROUPS.find(x => x.cat === inp.dataset.cat);
      inp.checked = g.type === "radio" ? state[g.key] === inp.value : state[g.key].has(inp.value);
    });
    const seed = $("#seed"); if (seed) seed.value = state.seed;
  }

  /* buscador */
  $("#search").addEventListener("input", e => {
    const q = e.target.value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    let any = false;
    $$(".group").forEach(g => {
      let n = 0;
      $$(".opt", g).forEach(o => {
        const txt = o.dataset.search.normalize("NFD").replace(/[̀-ͯ]/g, "");
        const hit = !q || q.split(/\s+/).every(w => txt.includes(w));
        o.classList.toggle("hide", !hit); if (hit) n++;
      });
      g.classList.toggle("empty", n === 0); if (n) { any = true; if (q) g.open = true; }
    });
    $("#noresults").style.display = any ? "none" : "block";
  });

  /* ---------------- aplicar estado ---------------- */
  function apply() {
    document.body.dataset.mode = state.mode;
    $$(".seg-btn[data-mode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === state.mode));
    $$(".seg-btn[data-device]").forEach(b => b.setAttribute("aria-pressed", b.dataset.device === state.device));
    frame.dataset.device = state.device;

    pv.dataset.style = state.style;
    pv.dataset.layout = state.layout;
    const prev = new Set([...pv.classList].filter(c => c.startsWith("t-")));
    items("tech").forEach(t => pv.classList.toggle("t-" + t.id, state.techs.has(t.id)));
    const added = [...state.techs].filter(t => !prev.has("t-" + t));
    const removed = [...prev].map(c => c.slice(2)).filter(t => !state.techs.has(t));
    onTechChange(added, removed);

    window.Mobile && window.Mobile.apply(state);
    syncPanel(); renderFicha(); writeHash();
    requestAnimationFrame(() => { layoutHScroll(); onScroll(); });
  }

  /* ---------------- ficha + prompt ---------------- */
  const sw = p => `<span class="swatches">${(p || []).map(c => `<i style="background:${c}" title="${c}"></i>`).join("")}</span>`;
  function renderFicha() {
    const f = $("#fichaMain");
    let html = "";
    if (state.mode === "web") {
      const s = get("style", state.style), l = get("layout", state.layout);
      html += `<h3>${s.name}</h3><p>${s.desc}</p>
        <p><span class="k">Fuentes</span>${s.fonts} &nbsp; <span class="k">Paleta</span>${sw(s.palette)}</p>
        <p><span class="k">Úsalo en</span>${s.use} <span class="k" style="margin-left:8px">Ojo</span>${s.avoid}</p>
        <p><span class="k">Layout</span><b>${l.name}</b> — ${l.desc}</p>`;
      const ts = [...state.techs].map(id => get("tech", id));
      html += ts.length ? `<div class="chips">${ts.map(t => `<span title="${t.desc}">${t.name}</span>`).join("")}</div>` : `<p><span class="k">Técnicas</span>ninguna activa</p>`;
      if (lastTouched && lastTouched.cat === "tech") html += `<p style="margin-top:8px"><span class="k">${lastTouched.name}</span>${lastTouched.desc} <span class="k" style="margin-left:6px">Cómo</span>${lastTouched.how}</p>`;
      if (state.techs.has("snap") && state.techs.has("smooth")) html += `<p><span class="k">Nota</span>Scroll snap y smooth scroll chocan; aquí gana el snap.</p>`;
    } else {
      const m = get("msys", state.msys);
      html += `<h3>${m.name}</h3><p>${m.desc}</p><p><span class="k">Cómo</span>${m.how}</p>`;
      const ps = [...state.mpats].map(id => get("mpat", id));
      html += ps.length ? ps.map(p => `<p><span class="k">${p.name}</span>${p.desc} <span class="k">Cómo</span>${p.how}</p>`).join("") : `<p><span class="k">Patrones</span>ninguno activo</p>`;
    }
    f.innerHTML = html;
    $("#promptOut").textContent = buildPrompt();
  }

  function buildPrompt() {
    const avoid = "Evitar: gradiente morado-azul, fuente Inter, hero centrado con badge y tres tarjetas iguales con íconos.";
    if (state.mode === "web") {
      const s = get("style", state.style), l = get("layout", state.layout);
      const ts = [...state.techs].map(id => get("tech", id).name.replace(" (simulado)", ""));
      return [
        "Quiero una landing page para [describe tu proyecto].",
        `Estilo visual: ${s.name}${s.id === "ia" ? " (ojo: este es el anti-ejemplo)" : ""} — ${s.desc}`,
        `Layout: ${l.name}.`,
        `Técnicas: ${ts.length ? ts.join(", ") : "ninguna, estático"}.`,
        `Tipografía: ${s.fonts}.`,
        `Paleta: ${s.palette.join(", ")}.`,
        "Que se vea bien en móvil.",
        avoid,
      ].join("\n");
    }
    const m = get("msys", state.msys);
    const ps = [...state.mpats].map(id => get("mpat", id).name);
    return [
      "Quiero una app móvil (Android, Kotlin + Jetpack Compose) para [describe tu app].",
      `Sistema de diseño: ${m.name}.`,
      state.msys === "you" ? `Color semilla: ${state.seed.toUpperCase()}.` : null,
      `Patrones: ${ps.length ? ps.join(", ") : "navegación estándar"}.`,
      "Navegación inferior con 3 destinos.",
      avoid,
    ].filter(Boolean).join("\n");
  }

  /* ---------------- URL ---------------- */
  function writeHash() {
    const p = new URLSearchParams({ m: state.mode, d: state.device, s: state.style, l: state.layout, t: [...state.techs].join(","), sys: state.msys, p: [...state.mpats].join(","), seed: state.seed.replace("#", "") });
    history.replaceState(null, "", "#" + p.toString());
  }
  function readHash() {
    if (!location.hash) return;
    const p = new URLSearchParams(location.hash.slice(1));
    const ok = (cat, v) => v && get(cat, v);
    if (["web", "app"].includes(p.get("m"))) state.mode = p.get("m");
    if (["desktop", "tablet", "phone"].includes(p.get("d"))) state.device = p.get("d");
    if (ok("style", p.get("s"))) state.style = p.get("s");
    if (ok("layout", p.get("l"))) state.layout = p.get("l");
    if (ok("msys", p.get("sys"))) state.msys = p.get("sys");
    state.techs = new Set((p.get("t") || "").split(",").filter(v => ok("tech", v)));
    if (p.has("p")) state.mpats = new Set((p.get("p") || "").split(",").filter(v => ok("mpat", v)));
    if (/^[0-9a-f]{6}$/i.test(p.get("seed") || "")) state.seed = "#" + p.get("seed");
  }

  /* ---------------- barra ---------------- */
  $$(".seg-btn[data-mode]").forEach(b => b.onclick = () => { state.mode = b.dataset.mode; apply(); });
  $$(".seg-btn[data-device]").forEach(b => b.onclick = () => { state.device = b.dataset.device; apply(); });
  $("#resetBtn").onclick = () => { Object.assign(state, { ...DEFAULT, techs: new Set(), mpats: new Set(DEFAULT.mpats) }); lastTouched = null; pv.scrollTop = 0; apply(); toast("Volvió a lo básico"); };
  $("#randomBtn").onclick = () => {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    if (state.mode === "web") {
      state.style = pick(items("style").filter(s => s.id !== "ia" && s.id !== state.style)).id;
      state.layout = pick(items("layout").filter(s => s.id !== "classic")).id;
      const pool = items("tech").map(t => t.id).filter(t => t !== "smooth").sort(() => Math.random() - .5);
      state.techs = new Set(pool.slice(0, 2 + Math.floor(Math.random() * 2)));
    } else {
      state.msys = pick(items("msys").filter(s => s.id !== state.msys)).id;
      state.mpats = new Set(items("mpat").map(t => t.id).filter(() => Math.random() > .4));
      if (state.msys === "you") state.seed = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    }
    lastTouched = null; pv.scrollTop = 0; apply();
    toast(state.mode === "web" ? `${get("style", state.style).name} + ${get("layout", state.layout).name}` : get("msys", state.msys).name);
  };
  $("#copyBtn").onclick = async () => {
    const txt = buildPrompt();
    try { await navigator.clipboard.writeText(txt); toast("Prompt copiado"); }
    catch { const t = document.createElement("textarea"); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); toast("Prompt copiado"); }
  };
  $("#fichaToggle").onclick = () => {
    const f = $("#ficha"); const closed = f.toggleAttribute("data-closed");
    $("#fichaToggle").setAttribute("aria-expanded", !closed);
    requestAnimationFrame(layoutHScroll);
  };
  $("#menuBtn").onclick = () => document.body.classList.toggle("panel-open");
  $("#panelScrim").onclick = () => document.body.classList.remove("panel-open");

  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1600); }
  window.uiToast = toast;

  /* =================================================================
     TÉCNICAS WEB
     ================================================================= */
  const on = t => state.techs.has(t);

  // Partir el título en palabras y letras (para split text y kinetic)
  (function splitTitle() {
    const h = $("#pvTitle"); const words = h.textContent.trim().split(/\s+/);
    let ci = 0;
    h.innerHTML = words.map((w, wi) =>
      `<span class="wm"><span class="w" style="--wi:${wi}">${[...w].map(c => `<span class="ch" style="--ci:${ci++}">${c}</span>`).join("")}</span></span>`
    ).join(" ");
  })();

  // Marcar elementos que aparecen al scroll
  const rvSel = ".p-sec-head, .p-card, .p-step, .p-gal-item, .p-stat, .p-cta > *, .p-story-visual";
  $$(rvSel, pv).forEach(el => {
    el.classList.add("rv");
    const sib = [...el.parentElement.children].filter(x => x.matches(rvSel));
    el.style.setProperty("--rv-i", Math.max(0, sib.indexOf(el)) % 6);
  });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add("in"); }), { root: pv, threshold: 0.12 });
  const observeAll = () => $$(".rv", pv).forEach(el => { el.classList.remove("in"); io.unobserve(el); io.observe(el); });
  observeAll();

  function onTechChange(added, removed) {
    if (added.includes("reveal")) observeAll();
    if (removed.includes("parallax")) $$(".layer", pv).forEach(l => l.style.transform = "");
    if (removed.includes("magnetic")) $$(".magnet", pv).forEach(m => m.style.transform = "");
    if (removed.includes("tilt")) $$(".p-card, .p-gal-item", pv).forEach(c => c.style.transform = "");
    if (removed.includes("hscroll")) { $(".p-gal-track", pv).style.transform = ""; $(".p-gallery", pv).style.removeProperty("--hs-h"); }
    if (removed.includes("scrolly")) setStep(0);
    if (added.includes("smooth")) smoothTarget = pv.scrollTop;
  }

  /* --- scroll: parallax, horizontal, scrollytelling --- */
  const layers = $$(".layer", pv);
  const steps = $$(".p-step", pv);
  const visual = $(".p-story-visual", pv);
  const stepColors = ["var(--acc)", "var(--a3)", "var(--a4)", "var(--fg)"];
  let curStep = -1;
  function setStep(i) {
    if (i === curStep) return; curStep = i;
    const s = steps[i];
    $(".p-story-num", visual).textContent = s.querySelector("span").textContent;
    $(".p-story-label", visual).textContent = s.querySelector("h3").textContent;
    $(".p-story-bar i", visual).style.width = ((i + 1) / steps.length * 100) + "%";
    visual.style.setProperty("--stc", on("scrolly") ? stepColors[i] : "");
    if (!on("scrolly")) visual.style.removeProperty("--stc");
    steps.forEach((st, k) => st.classList.toggle("active", k === i));
  }
  setStep(0);

  function onScroll() {
    const y = pv.scrollTop;
    if (on("parallax")) {
      const hero = $(".p-hero", pv);
      if (y < hero.offsetTop + hero.offsetHeight + 200) layers.forEach(l => l.style.transform = `translate3d(0, ${y * parseFloat(l.dataset.speed)}px, 0)`);
    }
    if (on("hscroll")) {
      const sec = $(".p-gallery", pv), track = $(".p-gal-track", pv);
      const dist = Math.max(0, track.scrollWidth - $(".p-gal-pin", pv).clientWidth + parseFloat(getComputedStyle($(".p-gal-pin", pv)).paddingLeft) * 2);
      const x = Math.min(dist, Math.max(0, y - (sec.offsetTop - navH())));
      track.style.transform = `translate3d(${-x}px,0,0)`;
    }
    if (on("scrolly")) {
      const pr = pv.getBoundingClientRect(); const mid = pr.top + pr.height * 0.5;
      let best = 0, bd = Infinity;
      steps.forEach((s, i) => { const r = s.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - mid); if (d < bd) { bd = d; best = i; } });
      setStep(best);
    }
  }
  const navH = () => $(".p-nav", pv).offsetHeight;
  function layoutHScroll() {
    if (!on("hscroll")) return;
    const sec = $(".p-gallery", pv), track = $(".p-gal-track", pv), pin = $(".p-gal-pin", pv);
    const pinH = pv.clientHeight - navH();
    const dist = Math.max(0, track.scrollWidth - pin.clientWidth + parseFloat(getComputedStyle(pin).paddingLeft) * 2);
    sec.style.setProperty("--hs-h", (pinH + dist) + "px");
  }
  let ticking = false;
  pv.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });
  new ResizeObserver(() => { layoutHScroll(); onScroll(); }).observe(pv);

  /* --- smooth scroll (estilo Lenis) --- */
  let smoothTarget = 0, smoothRaf = null;
  pv.addEventListener("wheel", e => {
    if (!on("smooth") || on("snap") || e.ctrlKey) return;
    e.preventDefault();
    if (!smoothRaf) smoothTarget = pv.scrollTop;
    smoothTarget = Math.max(0, Math.min(pv.scrollHeight - pv.clientHeight, smoothTarget + e.deltaY));
    if (!smoothRaf) smoothRaf = requestAnimationFrame(smoothStep);
  }, { passive: false });
  function smoothStep() {
    const d = smoothTarget - pv.scrollTop;
    if (Math.abs(d) < 0.6) { pv.scrollTop = smoothTarget; smoothRaf = null; return; }
    pv.scrollTop += d * 0.085; smoothRaf = requestAnimationFrame(smoothStep);
  }

  /* --- cursor, magnéticos, tilt --- */
  const dot = $("#cursorDot"); let cx = 0, cy = 0, tx = 0, ty = 0, curRaf = null;
  pv.addEventListener("mousemove", e => {
    if (on("cursor")) {
      tx = e.clientX; ty = e.clientY;
      dot.classList.toggle("big", !!e.target.closest("a, button, .p-card, .p-gal-item"));
      if (!curRaf) curRaf = requestAnimationFrame(cursorStep);
    }
    if (on("magnetic")) {
      $$(".magnet", pv).forEach(m => {
        const r = m.getBoundingClientRect(); const mx = r.left + r.width / 2, my = r.top + r.height / 2;
        const dx = e.clientX - mx, dy = e.clientY - my, dist = Math.hypot(dx, dy);
        m.style.transition = "transform .25s cubic-bezier(.2,.8,.2,1)";
        m.style.transform = dist < 110 ? `translate(${dx * 0.35}px, ${dy * 0.45}px)` : "";
      });
    }
    if (on("tilt")) {
      const c = e.target.closest(".p-card, .p-gal-item");
      if (c) {
        const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.transform = `perspective(700px) rotateY(${x * 18}deg) rotateX(${-y * 18}deg) scale(1.03)`;
      }
    }
  });
  pv.addEventListener("mouseout", e => {
    if (on("tilt")) { const c = e.target.closest(".p-card, .p-gal-item"); if (c && !c.contains(e.relatedTarget)) c.style.transform = ""; }
  });
  pv.addEventListener("mouseleave", () => { $$(".magnet", pv).forEach(m => m.style.transform = ""); });
  function cursorStep() {
    cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
    dot.style.transform = `translate(${cx}px, ${cy}px)`;
    curRaf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5 ? requestAnimationFrame(cursorStep) : null;
  }

  /* --- hover distortion --- */
  const disp = $("#liquidMap"), noise = $("#liquidNoise");
  let distEl = null, distVal = 0, distGoal = 0, distRaf = null, t0 = 0;
  pv.addEventListener("mouseover", e => {
    if (!on("distort")) return;
    const img = e.target.closest(".p-img"); if (!img || img === distEl) return;
    if (distEl) distEl.style.filter = "";
    distEl = img; img.style.filter = "url(#liquid)"; distGoal = 46;
    if (!distRaf) distRaf = requestAnimationFrame(distStep);
  });
  pv.addEventListener("mouseout", e => {
    if (!distEl) return;
    if (e.target.closest(".p-img") === distEl && !distEl.contains(e.relatedTarget)) { distGoal = 0; if (!distRaf) distRaf = requestAnimationFrame(distStep); }
  });
  function distStep(t) {
    distVal += (distGoal - distVal) * 0.12; t0 = t;
    disp.setAttribute("scale", distVal.toFixed(1));
    noise.setAttribute("baseFrequency", `${(0.012 + Math.sin(t / 600) * 0.004).toFixed(4)} ${(0.02 + Math.cos(t / 700) * 0.006).toFixed(4)}`);
    if (distGoal === 0 && distVal < 0.5) { disp.setAttribute("scale", 0); if (distEl) distEl.style.filter = ""; distEl = null; distRaf = null; return; }
    distRaf = requestAnimationFrame(distStep);
  }

  /* --- clicks: navegación, page transitions, ripple, likes --- */
  pv.addEventListener("click", e => {
    const go = e.target.closest("[data-go]");
    const btn = e.target.closest(".p-btn");
    if (btn && on("micro")) {
      const r = btn.getBoundingClientRect(), s = Math.max(r.width, r.height);
      const rp = document.createElement("span"); rp.className = "ripple";
      Object.assign(rp.style, { width: s + "px", height: s + "px", left: (e.clientX - r.left - s / 2) + "px", top: (e.clientY - r.top - s / 2) + "px" });
      btn.appendChild(rp); setTimeout(() => rp.remove(), 650);
    }
    const like = e.target.closest(".p-like");
    if (like) {
      like.classList.toggle("on");
      if (on("micro")) { like.classList.remove("pop"); void like.offsetWidth; like.classList.add("pop"); }
    }
    if (go) {
      e.preventDefault();
      const target = document.getElementById(go.dataset.go);
      const top = Math.max(0, target.offsetTop - (go.dataset.go === "pv-top" ? 0 : navH()));
      if (on("pagetrans")) {
        const c = $("#curtain"); c.className = "curtain in";
        setTimeout(() => { pv.scrollTop = top; smoothTarget = top; c.className = "curtain out"; setTimeout(() => c.className = "curtain", 480); }, 480);
      } else {
        pv.scrollTo({ top, behavior: "smooth" });
      }
    }
  });

  /* ---------------- inicio ---------------- */
  readHash();
  renderPanel();
  apply();
  window.addEventListener("hashchange", () => { readHash(); apply(); });
})();
