/* CHAGAS® — componentes de aplicação (posts, reels, carrossel, wallpaper, cartão)
   Cada peça usa unidades cqw relativas à própria largura: renderiza igual no deck e na exportação. */
(function(){
const VB = window.CHAGAS_VB;
const lg = (k, style='', cls='') => `<svg class="lg ${cls}" viewBox="0 0 ${VB[k][2]} ${VB[k][3]}" style="${style}"><use href="#lg-${k}" width="${VB[k][2]}" height="${VB[k][3]}"/></svg>`;
const tally = (style='') => `<span class="tally" style="${style}"><i></i><i></i><i></i><i></i><b></b></span>`;
const hdr = (l, r, color='') => `<div class="tag" style="position:absolute;left:6cqw;right:6cqw;top:5.5cqw;display:flex;justify-content:space-between;${color}"><span>${l}</span><span>${r}</span></div>`;
const foot = (txt='@chagas_catolico', color='') => `<div class="tag" style="position:absolute;left:6cqw;right:6cqw;bottom:5cqw;display:flex;justify-content:space-between;align-items:center;${color}"><span>${txt}</span>${lg('symbol','height:5cqw;color:currentColor')}</div>`;

const POSTS = [
  // 1 manifesto
  () => `<div class="art r45 grao">
    ${hdr('Manifesto','01/09')}
    <div class="dx" style="position:absolute;left:-2cqw;top:20cqw;font-size:31cqw;">Cria<br>tivi<br>dade</div>
    <div class="corte" style="left:58cqw;top:-10cqw;width:3cqw;height:140cqw"></div>
    <div class="serif it" style="position:absolute;right:6cqw;bottom:15cqw;font-size:8cqw;line-height:.95;text-align:right">não tem<br>limite.</div>
    ${foot()}
  </div>`,
  // 2 dica de foto
  () => `<div class="art r45 bg-branco grao" style="color:var(--preto)">
    ${hdr('Dica de foto','Nº 03')}
    <div style="position:absolute;left:6cqw;top:22cqw;font-size:12cqw;color:var(--preto)">${tally('--tw:.1em;--tg:.35em')}</div>
    <div class="dc" style="position:absolute;left:6cqw;right:6cqw;top:40cqw;font-size:17cqw">Fotografe<br>a luz,<br><span style="color:var(--fogo)">não a coisa.</span></div>
    <p style="position:absolute;left:6cqw;width:60cqw;bottom:16cqw;font:400 3.4cqw/1.35 var(--d)">Antes de apontar a câmera, procure de onde a luz vem. O assunto é só o que ela toca.</p>
    ${foot('Salve pra usar no domingo','color:var(--preto)')}
  </div>`,
  // 3 igreja
  () => `<div class="art r45 grao" style="background:var(--carvao)">
    ${hdr('Comunicação da Igreja','03/09')}
    <div class="serif" style="position:absolute;left:6cqw;right:8cqw;top:24cqw;font-size:10.5cqw;line-height:.98">A Igreja tem a melhor história já contada.</div>
    <div class="serif it" style="position:absolute;left:6cqw;right:8cqw;top:68cqw;font-size:10.5cqw;line-height:.98;color:var(--fogo)">Conte como tal.</div>
    <div class="corte" style="left:-10cqw;top:63cqw;width:130cqw;height:.8cqw;transform:rotate(-20deg)"></div>
    ${foot()}
  </div>`,
  // 4 bastidores: construção do monograma
  () => `<div class="art r45 bg-branco" style="color:var(--preto)">
    ${hdr('Bastidores','04/09','color:var(--preto)')}
    <svg viewBox="0 0 400 500" style="position:absolute;inset:0;width:100%;height:100%">
      <g stroke="#0D0D0D" stroke-width=".6" fill="none" opacity=".35">
        ${Array.from({length:21},(_,i)=>`<path d="M${i*20} 0 V500"/>`).join('')}${Array.from({length:26},(_,i)=>`<path d="M0 ${i*20} H400"/>`).join('')}
      </g>
      <g stroke="#FF4D1A" stroke-width="1" fill="none"><circle cx="200" cy="250" r="118"/><path d="M110 470 L290 30"/><path d="M60 250 H340" stroke-dasharray="4 4"/></g>
    </svg>
    ${lg('monogram','position:absolute;left:15cqw;top:26cqw;width:70cqw;color:var(--preto)')}
    <div class="tag" style="position:absolute;left:6cqw;bottom:12cqw;color:var(--preto)">Corte a 20° · deslocamento 1/14</div>
    <div class="serif it" style="position:absolute;left:6cqw;bottom:5cqw;font-size:5.4cqw;color:var(--preto)">como nasceu o C.</div>
  </div>`,
  // 5 monograma 3D
  () => `<div class="art r45 bg-fogo">
    <div style="position:absolute;left:12cqw;top:18cqw;width:76cqw;height:76cqw">
      ${Array.from({length:18},(_,i)=>lg('monogram',`position:absolute;inset:0;width:100%;color:${i===17?'#F2F0EB':'#0D0D0D'};transform:translate(${(17-i)*-0.45}cqw,${(17-i)*0.45}cqw);--fogo:${i===17?'#0D0D0D':'#0D0D0D'}`)).join('')}
    </div>
    ${hdr('CHAGAS® Lab','05/09','color:var(--preto)')}
    ${foot('Objeto nº 1 — o C','color:var(--preto)')}
  </div>`,
  // 6 frase
  () => `<div class="art r45 grao">
    <div class="dx" style="position:absolute;left:6cqw;top:16cqw;font-size:19cqw;clip-path:polygon(0 0,100% 0,100% 49%,0 49%)">Ideia<br>boa</div>
    <div class="dx" style="position:absolute;left:6cqw;top:16cqw;font-size:19cqw;color:var(--fogo);clip-path:polygon(0 49%,100% 49%,100% 100%,0 100%);transform:translate(3cqw,1.8cqw)">Ideia<br>boa</div>
    <div class="dc" style="position:absolute;left:6cqw;top:62cqw;font-size:22cqw">incomoda.</div>
    ${foot()}
  </div>`,
  // 7 capa de carrossel igreja
  () => `<div class="art r45 bg-branco grao" style="color:var(--preto)">
    ${hdr('Carrossel · Igreja','→ arraste','color:var(--preto)')}
    <div class="dx" style="position:absolute;left:5cqw;top:16cqw;font-size:46cqw;color:var(--fogo);letter-spacing:-.08em">5</div>
    <div class="dc" style="position:absolute;left:44cqw;right:5cqw;top:22cqw;font-size:10.5cqw">erros que<br>apagam o<br>post da sua<br>paróquia</div>
    <div style="position:absolute;left:6cqw;bottom:16cqw;font-size:9cqw">${tally('--tw:.1em')}</div>
    ${foot('E como consertar cada um','color:var(--preto)')}
  </div>`,
  // 8 experimental: tipografia elástica
  () => `<div class="art r45" style="background:#000">
    ${hdr('Experimento #12','08/09')}
    <div style="position:absolute;left:0;right:0;top:20cqw;display:flex;justify-content:center;align-items:flex-end;gap:0">
      ${'CRIAR'.split('').map((c,i)=>`<span style="font:900 30cqw/.8 var(--d);font-stretch:${[50,80,150,110,60][i]}%;${i===2?'color:var(--fogo)':''}">${c}</span>`).join('')}
    </div>
    <div style="position:absolute;left:0;right:0;top:46cqw;display:flex;justify-content:center;gap:0;opacity:.35">
      ${'CRIAR'.split('').map((c,i)=>`<span style="font:900 30cqw/.8 var(--d);font-stretch:${[150,110,50,80,140][i]}%">${c}</span>`).join('')}
    </div>
    <p class="mono" style="position:absolute;left:6cqw;right:6cqw;bottom:14cqw;font-size:2.6cqw;opacity:.7">Uma fonte, cinco larguras. Nenhum limite.</p>
    ${foot()}
  </div>`,
  // 9 contagem
  () => `<div class="art r45 grao" style="background:var(--carvao)">
    ${hdr('Diário de ideias','09/09')}
    <div style="position:absolute;left:6cqw;top:20cqw;right:6cqw;display:grid;grid-template-columns:repeat(5,1fr);gap:3cqw 4cqw;font-size:7.6cqw;opacity:.9">
      ${Array.from({length:20},()=>tally('--tw:.09em;--tg:.28em')).join('')}
    </div>
    <div style="position:absolute;left:6cqw;bottom:14cqw"><div class="tag" style="opacity:.6">Ideia nº</div><div class="dx" style="font-size:20cqw;color:var(--fogo)">101</div></div>
    ${foot()}
  </div>`,
];

const REELS = [
  ['3 ângulos','que mudam<br>qualquer foto','Dica de foto'],
  ['Igreja','sem clichê.<br>Ep. 01','Comunicação'],
  ['Bastidores','criando<br>uma marca','Processo'],
  ['Lab #12','a fonte<br>que estica','Experimento'],
];
const reel = (i) => { const [a,b,c]=REELS[i]; const light=i%2===1;
  return `<div class="art r916 grao" style="${light?'background:var(--branco);color:var(--preto)':''}">
    ${hdr(c,'Reels')}
    <div style="position:absolute;left:-1cqw;right:0;top:46cqw">
      <div class="dx" style="font-size:${a.length>9?10.5:a.length>8?12:17}cqw;white-space:nowrap">${a}</div>
      <div class="serif it" style="margin:4cqw 0 0 7cqw;font-size:11cqw;line-height:.95;color:var(--fogo)">${b}</div>
    </div>
    <div class="corte" style="left:${34+i*12}cqw;top:24cqw;width:3cqw;height:80cqw"></div>
    <div style="position:absolute;left:6cqw;right:6cqw;top:125cqw;height:30cqw;border:1px solid currentColor;opacity:.35"></div>
    <div class="tag" style="position:absolute;left:6cqw;top:157cqw;opacity:.6">Área segura do feed (4:5)</div>
    ${foot('@chagas_catolico',light?'color:var(--preto)':'')}
  </div>`; };

const CAROUSEL = [
  () => POSTS[6](),
  () => `<div class="art r45 bg-branco" style="color:var(--preto)">${hdr('Erro 1/5','→','color:var(--preto)')}
    <div class="dx" style="position:absolute;left:6cqw;top:16cqw;font-size:30cqw;color:var(--fogo)">01</div>
    <div class="dc" style="position:absolute;left:6cqw;right:6cqw;top:48cqw;font-size:12cqw">Texto demais<br>na arte.</div>
    <p style="position:absolute;left:6cqw;right:20cqw;top:78cqw;font:400 3.6cqw/1.35 var(--d)"><b>Conserte:</b> uma ideia por imagem. O resto vai na legenda.</p>
    ${foot('CHAGAS® · Igreja','color:var(--preto)')}</div>`,
  () => `<div class="art r45 bg-branco" style="color:var(--preto)">${hdr('Erro 2/5','→','color:var(--preto)')}
    <div class="dx" style="position:absolute;left:6cqw;top:16cqw;font-size:30cqw;color:var(--fogo)">02</div>
    <div class="dc" style="position:absolute;left:6cqw;right:6cqw;top:48cqw;font-size:12cqw">Foto escura<br>do altar.</div>
    <p style="position:absolute;left:6cqw;right:20cqw;top:78cqw;font:400 3.6cqw/1.35 var(--d)"><b>Conserte:</b> fotografe de lado, com a luz das janelas. Nunca contra ela.</p>
    ${foot('CHAGAS® · Igreja','color:var(--preto)')}</div>`,
  () => `<div class="art r45 bg-branco" style="color:var(--preto)">${hdr('Erro 3/5','→','color:var(--preto)')}
    <div class="dx" style="position:absolute;left:6cqw;top:16cqw;font-size:30cqw;color:var(--fogo)">03</div>
    <div class="dc" style="position:absolute;left:6cqw;right:6cqw;top:48cqw;font-size:12cqw">Dez fontes<br>no mesmo post.</div>
    <p style="position:absolute;left:6cqw;right:20cqw;top:78cqw;font:400 3.6cqw/1.35 var(--d)"><b>Conserte:</b> duas fontes, no máximo. Uma pra gritar, outra pra explicar.</p>
    ${foot('CHAGAS® · Igreja','color:var(--preto)')}</div>`,
  () => `<div class="art r45 grao">
    <div class="dx" style="position:absolute;left:6cqw;top:18cqw;font-size:15cqw">Salva.<br>Manda pro<br><span style="color:var(--fogo)">pascom.</span></div>
    <div class="corte" style="left:70cqw;top:-10cqw;width:3cqw;height:140cqw"></div>
    <p class="serif it" style="position:absolute;left:6cqw;bottom:16cqw;font-size:6cqw">Toda terça tem dica nova.</p>
    ${foot()}</div>`,
];

const tipTemplate = () => `<div class="art r45 bg-branco" style="color:var(--preto)">
  ${hdr('Dica de criatividade','Nº __','color:var(--preto)')}
  <div style="position:absolute;left:6cqw;top:16cqw;font-size:8cqw">${tally('--tw:.1em')}</div>
  <div style="position:absolute;left:6cqw;right:6cqw;top:30cqw;height:34cqw;border:2px dashed rgba(13,13,13,.35);display:grid;place-items:center" class="tag">Título · Anybody 55% · até 3 linhas</div>
  <div style="position:absolute;left:6cqw;right:30cqw;top:68cqw;height:12cqw;border:2px dashed rgba(13,13,13,.35);display:grid;place-items:center" class="tag">Explicação · 2 linhas</div>
  <div class="corte" style="left:84cqw;top:58cqw;width:2.6cqw;height:50cqw"></div>
  ${foot('Rodapé fixo · @ + símbolo','color:var(--preto)')}
</div>`;

const wallpaper = () => `<div class="art rphone grao">
  <div class="mono" style="position:absolute;left:0;right:0;top:20cqw;text-align:center;font-size:22cqw;font-weight:400;letter-spacing:-.02em;opacity:.9">09:41</div>
  <div style="position:absolute;left:-30cqw;top:72cqw;width:160cqw">${lg('monogram','width:100%;color:#1f1f1f;--fogo:#2a2a2a')}</div>
  <div class="corte" style="left:46cqw;top:-20cqw;width:3cqw;height:260cqw"></div>
  <div class="serif it" style="position:absolute;left:8cqw;bottom:22cqw;font-size:9cqw;line-height:.95">cria antes<br>de rolar.</div>
  <div class="tag" style="position:absolute;left:8cqw;bottom:12cqw;opacity:.5">CHAGAS® · wallpaper 01</div>
</div>`;

const card = () => `<div class="art rphone" style="background:var(--preto)">
  <div style="position:absolute;inset:0;height:62cqw;background:var(--fogo)"></div>
  ${lg('monogram','position:absolute;left:8cqw;top:16cqw;width:34cqw;color:var(--preto);--fogo:#F2F0EB')}
  <div class="tag" style="position:absolute;right:8cqw;top:16cqw;color:var(--preto);text-align:right">Cartão<br>digital</div>
  <div class="dx" style="position:absolute;left:8cqw;top:76cqw;font-size:15cqw">Chagas</div>
  <div class="serif it" style="position:absolute;left:8cqw;top:92cqw;font-size:7cqw;color:var(--fogo)">diretor de criação</div>
  <div style="position:absolute;left:8cqw;right:8cqw;top:112cqw;display:grid;gap:3.5cqw;font:500 3.6cqw/1.2 var(--m);text-transform:uppercase;letter-spacing:.04em">
    ${['Direção de arte','Fotografia & audiovisual','Comunicação para a Igreja','Conteúdo & estratégia'].map(t=>`<div style="display:flex;gap:3cqw;border-top:1px solid #333;padding-top:3cqw"><span style="color:var(--fogo)">/</span>${t}</div>`).join('')}
  </div>
  <div style="position:absolute;left:8cqw;right:8cqw;bottom:24cqw;display:grid;grid-template-columns:1fr 1fr;gap:3cqw">
    <div style="border:1px solid var(--branco);padding:3.5cqw;text-align:center" class="tag">Instagram</div>
    <div style="border:1px solid var(--branco);padding:3.5cqw;text-align:center" class="tag">WhatsApp</div>
  </div>
  <div style="position:absolute;left:8cqw;right:8cqw;bottom:9cqw;background:var(--branco);color:var(--preto);padding:4cqw;text-align:center" class="tag">Salvar contato</div>
</div>`;

window.CHAGAS = { lg, tally, POSTS, reel, CAROUSEL, tipTemplate, wallpaper, card };
document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML('afterbegin', window.CHAGAS_LOGOS);
  document.querySelectorAll('[data-c]').forEach(el => {
    const [k, i] = el.dataset.c.split(':');
    const C = window.CHAGAS;
    el.innerHTML = k==='post' ? C.POSTS[+i]() : k==='reel' ? C.reel(+i) : k==='car' ? C.CAROUSEL[+i]() : C[k]();
  });
  document.querySelectorAll('[data-lg]').forEach(el => { el.outerHTML = window.CHAGAS.lg(el.dataset.lg, el.getAttribute('style')||'', el.className); });
  document.querySelectorAll('[data-tally]').forEach(el => { el.outerHTML = window.CHAGAS.tally(el.getAttribute('style')||''); });
});
})();
