// Formas 3D de cromo iridescente desenhadas em tempo real (WebGL2, ray marching).
// Cada forma é um quadrado na tela onde o shader "esculpe" o objeto e calcula o reflexo.
window.Cromo = (() => {
  const VERT = `#version 300 es
  in vec2 a;
  uniform vec4 uRect;      // x, y, largura, altura em pixels do canvas
  uniform vec2 uTela;
  out vec2 vUv;
  void main() {
    vUv = a * 2.0 - 1.0;
    vec2 p = uRect.xy + a * uRect.zw;
    gl_Position = vec4(p / uTela * 2.0 - 1.0, 0.0, 1.0);
    gl_Position.y = -gl_Position.y;
  }`;

  const FRAG = `#version 300 es
  precision highp float;
  in vec2 vUv;
  uniform int uTipo;
  uniform mat3 uRot;
  uniform float uT, uOp, uPx, uMatiz, uLuz;
  out vec4 cor;

  float sdTorus(vec3 p, vec2 t) { vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
  float sdStar5(vec2 p, float r, float rf) {
    const vec2 k1 = vec2(0.809016994375, -0.587785252292);
    const vec2 k2 = vec2(-k1.x, k1.y);
    p.x = abs(p.x);
    p -= 2.0 * max(dot(k1, p), 0.0) * k1;
    p -= 2.0 * max(dot(k2, p), 0.0) * k2;
    p.x = abs(p.x);
    p.y -= r;
    vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0, 1);
    float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
    return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
  }
  float sdLosango(vec2 p, vec2 b) {
    p = abs(p);
    float h = clamp((-2.0 * (p.x * b.x - p.y * b.y) + (b.x * b.x - b.y * b.y)) / dot(b, b), -1.0, 1.0);
    float d = length(p - 0.5 * b * vec2(1.0 - h, 1.0 + h));
    return d * sign(p.x * b.y + p.y * b.x - b.x * b.y);
  }
  // estrela de n pontas (brilho), em coordenadas polares
  float sdBrilho(vec2 p, float pontas, float fora, float dentro, float alterna) {
    float a = atan(p.y, p.x), r = length(p);
    float k = pow(abs(cos(a * pontas * 0.5)), 6.0);
    float longa = mix(1.0, alterna, step(0.5, fract((a / 6.28318 + 0.5) * pontas * 0.5 + 0.25)));
    return (r - mix(dentro, fora * longa, k)) * 0.55;
  }
  // extrusão com chanfro arredondado: d2 = distância 2D, h = meia espessura
  float extrude(float d2, float z, float h, float bev) {
    vec2 w = vec2(d2 + bev, abs(z) - h + bev);
    return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - bev;
  }

  float mapa(vec3 p) {
    if (uTipo == 0) {                      // anel (toro)
      return sdTorus(p.xzy, vec2(0.6, 0.24));
    } else if (uTipo == 1) {               // fitas cruzadas (união)
      float d = 1e9;
      for (int i = 0; i < 2; i++) {
        float sg = i == 0 ? 1.0 : -1.0;
        vec3 q = p;
        q.xy = rot(0.785 * sg) * q.xy;
        q.yz = rot(0.55 * sg) * q.yz;
        vec2 e = vec2(q.x * 0.6, q.y);
        vec2 s = vec2(length(e) - 0.4, q.z);
        vec2 bb = abs(s) - vec2(0.02, 0.15);
        float r = length(max(bb, 0.0)) + min(max(bb.x, bb.y), 0.0) - 0.035;
        d = min(d, r * 0.6);
      }
      return d;
    } else if (uTipo == 2) {               // brilho de 8 pontas, facetado
      vec2 q = p.xy;
      float d2 = sdLosango(q, vec2(0.18, 0.95));
      d2 = min(d2, sdLosango(q.yx, vec2(0.18, 0.95)));
      vec2 q45 = rot(0.785) * q;
      d2 = min(d2, sdLosango(q45, vec2(0.13, 0.55)));
      d2 = min(d2, sdLosango(q45.yx, vec2(0.13, 0.55)));
      return max(d2, (abs(p.z) + d2 * 0.45) * 0.9) - 0.012;
    } else if (uTipo == 3) {               // estrela de 5 pontas, facetada
      float d2 = sdStar5(p.xy, 0.9, 0.5);
      return max(d2, (abs(p.z) + d2 * 0.42) * 0.9) - 0.015;
    } else if (uTipo == 4) {               // moldura ondulada (quadrado arredondado)
      vec2 q2 = p.xy;
      float a = atan(q2.y, q2.x);
      float se = pow(pow(abs(q2.x), 4.0) + pow(abs(q2.y), 4.0), 0.25);
      float onda = 0.045 * sin(a * 4.0 + 0.8) + 0.03 * sin(a * 8.0 + uT * 0.3);
      vec2 s = vec2(se - 0.6 - onda, p.z + 0.06 * sin(a * 4.0));
      return (length(s) - 0.2) * 0.7;
    } else {                               // anel torcido
      float a = atan(p.z, p.x);
      vec3 q = p;
      q.y -= 0.16 * sin(a * 2.0);
      float r = 0.58 + 0.08 * sin(a * 3.0 + 1.0);
      vec2 s = vec2(length(q.xz) - r, q.y);
      s = rot(a * 1.5) * s;
      return (length(s * vec2(1.0, 1.7)) - 0.17) * 0.6;
    }
  }

  vec3 normal(vec3 p) {
    vec2 e = vec2(0.0025, 0.0);
    return normalize(vec3(mapa(p + e.xyy) - mapa(p - e.xyy), mapa(p + e.yxy) - mapa(p - e.yxy), mapa(p + e.yyx) - mapa(p - e.yyx)));
  }

  // estúdio claro com faixas de luz (o que o cromo reflete)
  vec3 ambiente(vec3 r) {
    float y = r.y;
    vec3 c = mix(vec3(0.05, 0.06, 0.1), vec3(0.55, 0.6, 0.7), smoothstep(-0.6, 0.6, y));  // chão escuro → céu claro
    c += vec3(1.3) * smoothstep(0.6, 0.85, y);                                            // softbox de cima
    c += vec3(1.1) * smoothstep(0.86, 0.97, r.x);                                         // faixa à direita
    c += vec3(0.9) * smoothstep(0.1, 0.0, abs(r.x + 0.55)) * smoothstep(-0.2, 0.4, y);    // faixa vertical à esquerda
    c *= 1.0 - 0.35 * smoothstep(0.35, 0.0, abs(y - 0.1));                                // horizonte mais escuro (contraste)
    return c;
  }
  vec3 iris(float x) {   // película fina: ciano → azul → violeta → rosa → ciano
    vec3 c0 = vec3(0.35, 0.95, 1.0), c1 = vec3(0.25, 0.45, 1.0), c2 = vec3(0.65, 0.35, 1.0), c3 = vec3(1.0, 0.55, 0.9);
    float f = fract(x) * 4.0;
    vec3 a = f < 1.0 ? c0 : f < 2.0 ? c1 : f < 3.0 ? c2 : c3;
    vec3 b = f < 1.0 ? c1 : f < 2.0 ? c2 : f < 3.0 ? c3 : c0;
    return mix(a, b, smoothstep(0.0, 1.0, fract(f)));
  }

  void main() {
    vec3 ro = vec3(vUv * 1.18, 3.2);
    vec3 rd = normalize(vec3(vUv * 0.06, -1.0));
    ro = uRot * ro; rd = uRot * rd;
    // começa perto da esfera que envolve a forma
    float b = dot(ro, rd), c = dot(ro, ro) - 1.15;
    float disc = b * b - c;
    if (disc < 0.0) discard;
    float t = max(0.0, -b - sqrt(disc)), tMax = -b + sqrt(disc);
    float dMin = 1e9; bool acerto = false;
    for (int i = 0; i < 72; i++) {
      vec3 p = ro + rd * t;
      float d = mapa(p);
      dMin = min(dMin, d / max(t, 0.5));
      if (d < 0.0012) { acerto = true; break; }
      t += d;
      if (t > tMax) break;
    }
    float px = uPx * 1.6;
    float alfa = acerto ? 1.0 : 1.0 - smoothstep(0.0, px, dMin * 3.2);
    if (alfa <= 0.002) discard;
    vec3 p = ro + rd * t;
    vec3 n = normal(p);
    vec3 v = -rd;
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    vec3 r = reflect(rd, n);
    vec3 env = ambiente(r);
    float filme = dot(n, normalize(vec3(0.4, 0.7, 0.6))) * 0.7 + dot(r, vec3(0.0, 0.5, 0.5)) * 0.35 + uMatiz;
    vec3 film = iris(filme);
    // cromo: reflexo do estúdio tingido pela película, mais forte nas áreas claras e nas bordas
    float claro = clamp(dot(env, vec3(0.333)), 0.0, 1.5);
    vec3 tinta = mix(vec3(1.0), film, 0.74 + 0.2 * fres);
    vec3 col = env * tinta * 1.05 + film * (0.10 + 0.25 * fres) * (0.4 + claro);
    col += vec3(1.0) * pow(max(dot(r, normalize(vec3(-0.3, 0.9, 0.4))), 0.0), 60.0) * 1.2;
    col *= uLuz;
    col = col / (1.0 + col * 0.35);         // tonemapping suave
    col = pow(col, vec3(0.92));
    cor = vec4(col * alfa * uOp, alfa * uOp);
  }`;

  function compila(gl, tipo, src) {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function matriz(ax, ay, az) {
    const [cx, sx, cy, sy, cz, sz] = [Math.cos(ax), Math.sin(ax), Math.cos(ay), Math.sin(ay), Math.cos(az), Math.sin(az)];
    // Rz * Ry * Rx, em ordem de colunas
    return new Float32Array([
      cz * cy, sz * cy, -sy,
      cz * sy * sx - sz * cx, sz * sy * sx + cz * cx, cy * sx,
      cz * sy * cx + sz * sx, sz * sy * cx - cz * sx, cy * cx,
    ]);
  }

  function criar(canvas) {
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, compila(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compila(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const la = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(la);
    gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    for (const n of ["uRect", "uTela", "uTipo", "uRot", "uT", "uOp", "uPx", "uMatiz", "uLuz"]) u[n] = gl.getUniformLocation(prog, n);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // formas: [{tipo, sx, sy, tam (diâmetro em px do palco), rot:[x,y,z], op, matiz, luz}]
    function desenha(formas, t, escala) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.uTela, canvas.width, canvas.height);
      gl.uniform1f(u.uT, t);
      // as mais distantes primeiro
      for (const f of [...formas].sort((a, b) => a.z - b.z)) {
        if (f.op <= 0.003 || f.tam < 4) continue;
        const lado = f.tam * escala;
        gl.uniform4f(u.uRect, f.sx * escala - lado / 2, f.sy * escala - lado / 2, lado, lado);
        gl.uniform1i(u.uTipo, f.tipo);
        gl.uniformMatrix3fv(u.uRot, false, matriz(...f.rot));
        gl.uniform1f(u.uOp, f.op);
        gl.uniform1f(u.uPx, 2.4 / lado);
        gl.uniform1f(u.uMatiz, f.matiz || 0);
        gl.uniform1f(u.uLuz, f.luz == null ? 1 : f.luz);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
    return { desenha };
  }

  return { criar };
})();
