
// ---------- prancha técnica: modos e desenho do traço ----------
{
  const body = document.body;
  const buttons = [...document.querySelectorAll("[data-mode]")].filter((b) => b.tagName === "BUTTON");
  const setMode = (m) => { body.dataset.mode = m; buttons.forEach((b) => (b.dataset.mode === m ? b.setAttribute("data-on", "") : b.removeAttribute("data-on"))); };
  buttons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  // cada traço recebe pathLength=1 para animar do começo ao fim
  document.querySelectorAll(".stage path.iso-line:not([data-flow]), .stage path.iso-edge, .stage .dim-line, .stage .dim-ext").forEach((p) => p.setAttribute("pathLength", "1"));
  const draw = (stage) => {
    if (still.matches) return;
    const paths = stage.querySelectorAll("path[pathLength]"); const n = paths.length;
    paths.forEach((p, i) => p.style.setProperty("--d", (i / n * .9).toFixed(3) + "s"));
    stage.classList.remove("drawing"); void stage.offsetWidth; stage.classList.add("drawing");
    clearTimeout(stage._t); stage._t = setTimeout(() => stage.classList.remove("drawing"), 2600);
  };
  const seen = new WeakSet();
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && !seen.has(e.target)) { seen.add(e.target); draw(e.target); } }), { threshold: .25 });
  document.querySelectorAll(".stage").forEach((s) => io.observe(s));
  document.getElementById("redraw").addEventListener("click", () => { setMode("wire"); document.querySelectorAll(".stage").forEach(draw); });
}
