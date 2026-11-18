const { chromium } = require('playwright'); const fs = require('fs');
const EMBED = fs.readFileSync(__dirname + '/embed.css', 'utf8');
(async () => {
  const b = await chromium.launch(); const out = {};
  for (const f of fs.readdirSync(__dirname + '/paginas')) {
    fs.writeFileSync('/tmp/emb.html', fs.readFileSync(__dirname + '/paginas/' + f, 'utf8').replace('</head>', `<style>${EMBED}</style></head>`));
    const p = await b.newPage({ viewport: { width: 760, height: 900 } }); await p.goto('file:///tmp/emb.html'); await p.waitForTimeout(600);
    out[f] = await p.evaluate(() => { const r = document.querySelector('.iso-plate').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    console.log(f, out[f]); await p.close();
  }
  fs.writeFileSync(__dirname + '/sizes.json', JSON.stringify(out)); await b.close();
})();
