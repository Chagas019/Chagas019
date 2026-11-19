// Gera curvas CSS linear() a partir dos tokens de mola do guia de movimento do Vetro
// (stiffness/dampingRatio, massa 1). Fórmula do oscilador harmônico amortecido.
const TOKENS = {
  standard: [130.5, 0.825], press: [987, 0.6], sheet: [380, 0.86], hero: [157.9, 0.7], pop: [500, 0.75], bar: [500, 0.9],
};
function curve(k, z) {
  const w = Math.sqrt(k), wd = w * Math.sqrt(1 - z * z);
  const x = (t) => 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  let T = 0.01;
  while (T < 3) { // tempo até ficar a <0,1% do destino para sempre
    let ok = true;
    for (let t = T; t < T + 0.5; t += 0.005) if (Math.abs(1 - x(t)) > 0.001) { ok = false; break; }
    if (ok) break;
    T += 0.01;
  }
  const n = 24, pts = [];
  for (let i = 0; i <= n; i++) pts.push(i === n ? '1' : x((T * i) / n).toFixed(3).replace(/^-?0\.000$/, '0'));
  return { ms: Math.round(T * 1000), css: `linear(${pts.join(', ')})` };
}
for (const [name, [k, z]] of Object.entries(TOKENS)) {
  const c = curve(k, z);
  console.log(`  --spring-${name}: ${c.css};\n  --spring-${name}-ms: ${c.ms}ms;`);
}
