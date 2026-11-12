// Studio requirements viewer: History, search, and Play on the use case map.
// Every page reads without this file.
"use strict";
(() => {
  const history = document.getElementById("history");
  history.onchange = () => { localStorage.setItem("req-history", history.checked ? "1" : "0"); if (!box.hidden) draw(); };

  // ---- search; the links of the index are relative to the folder of this script
  const base = document.currentScript.src.replace(/[^/]*$/, "");
  const box = document.getElementById("search"), q = document.getElementById("q"), res = document.getElementById("results");
  let hits = [], sel = 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  const open = () => { box.hidden = false; q.value = ""; draw(); q.focus(); };
  const close = () => { box.hidden = true; };
  document.getElementById("search-open").onclick = open;
  document.getElementById("search-close").onclick = close;
  box.onclick = e => { if (e.target === box) close(); };
  function draw() {
    const t = q.value.trim().toLowerCase();
    if (t.length < 2) { res.innerHTML = "<p>Type a word, an id such as DIAG-015, or a file name.</p>"; hits = []; return; }
    hits = (window.SEARCH || []).filter(x => (history.checked || !x.r) && (x.t + " " + x.s).toLowerCase().includes(t)).slice(0, 30);
    let html = "", last = "";
    hits.forEach((x, i) => {
      if (x.k !== last) { html += `<h3>${x.k === "File" ? "Files" : x.k + "s"}</h3>`; last = x.k; }
      const sub = x.k === "File" ? `${x.s} · ${x.n} behaviour${x.n > 1 ? "s" : ""}` : x.s;
      html += `<a href="${esc(base + x.h)}" data-i="${i}"><small>${esc(sub)}${x.r ? " · retired" : ""}</small>${esc(x.t)}</a>`;
    });
    res.innerHTML = html || `<p>Nothing matches “${esc(q.value)}”.</p>`;
    sel = 0; mark();
  }
  const mark = () => res.querySelectorAll("a").forEach(a => a.classList.toggle("sel", +a.dataset.i === sel));
  q.oninput = draw;
  q.onkeydown = e => {
    if (e.key === "ArrowDown") sel = Math.min(hits.length - 1, sel + 1);
    else if (e.key === "ArrowUp") sel = Math.max(0, sel - 1);
    else if (e.key === "Enter" && hits[sel]) { location.href = base + hits[sel].h; return; }
    else if (e.key === "Escape") { close(); return; }
    else return;
    e.preventDefault(); mark();
  };
  addEventListener("keydown", e => {
    if (e.key === "Escape" && !box.hidden) { close(); return; }
    if (!box.hidden || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === "/") { e.preventDefault(); open(); }
  });

  // ---- Play a path on the map: a dot walks the path, step by step
  const svg = document.querySelector("svg.metro");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const tok = document.createElementNS(NS, "circle");
  tok.setAttribute("r", "8"); tok.setAttribute("class", "tok"); tok.style.opacity = 0; svg.appendChild(tok);
  let run = 0;
  async function play(pi) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const me = ++run;
    const steps = [...svg.querySelectorAll(`.tr[data-path="${pi}"]`)].sort((a, b) => a.dataset.step - b.dataset.step);
    svg.classList.add("playing"); svg.querySelectorAll(".on").forEach(x => x.classList.remove("on"));
    tok.style.fill = pi ? "var(--p2)" : "var(--p1)"; tok.style.opacity = 1;
    for (const tr of steps) {
      if (me !== run) return;
      tr.classList.add("on");
      const p = tr.querySelector(".hit"), L = p.getTotalLength(), t0 = performance.now();
      const ends = [p.getPointAtLength(0), p.getPointAtLength(L)];
      svg.querySelectorAll(".st").forEach(st => { const c = st.querySelector("circle"); if (ends.some(pt => Math.abs(pt.x - c.cx.baseVal.value) < 1 && Math.abs(pt.y - c.cy.baseVal.value) < 1)) st.classList.add("on"); });
      await new Promise(done => {
        const f = now => {
          if (me !== run) return done();
          const k = Math.min(1, (now - t0) / 900), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, pt = p.getPointAtLength(L * e);
          tok.setAttribute("cx", pt.x); tok.setAttribute("cy", pt.y);
          k < 1 ? requestAnimationFrame(f) : setTimeout(done, 350);
        };
        requestAnimationFrame(f);
      });
    }
    setTimeout(() => { if (me === run) { svg.classList.remove("playing"); tok.style.opacity = 0; } }, 1200);
  }
  document.querySelectorAll("[data-play]").forEach(b => b.onclick = () => play(+b.dataset.play));
})();
