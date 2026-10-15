/**
 * Foto de exemplo desenhada no próprio aparelho (nenhum download): um
 * pôr do sol com céu, morros, água e um tom de pele, para testar os presets.
 */
export async function createSamplePhoto(): Promise<File> {
  const w = 1600;
  const h = 1067;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Não foi possível gerar a foto de exemplo.');

  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  sky.addColorStop(0, '#3b5f8f');
  sky.addColorStop(0.55, '#d9a37a');
  sky.addColorStop(1, '#f6d7a8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const sun = ctx.createRadialGradient(w * 0.68, h * 0.5, 10, w * 0.68, h * 0.5, 260);
  sun.addColorStop(0, 'rgba(255,248,225,1)');
  sun.addColorStop(0.25, 'rgba(255,214,150,0.9)');
  sun.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  const hill = (y: number, amp: number, color: string, seed: number) => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      ctx.lineTo(x, y + Math.sin(x / 210 + seed) * amp + Math.sin(x / 67 + seed * 2) * amp * 0.25);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  hill(h * 0.58, 26, '#6d6a74', 1);
  hill(h * 0.64, 34, '#3f4a3c', 3);

  const water = ctx.createLinearGradient(0, h * 0.72, 0, h);
  water.addColorStop(0, '#5f7f99');
  water.addColorStop(1, '#1c2a36');
  ctx.fillStyle = water;
  ctx.fillRect(0, h * 0.74, w, h * 0.26);

  // Silhueta com tom de pele, para conferir os tons de pele.
  ctx.fillStyle = '#2a211c';
  ctx.fillRect(w * 0.2, h * 0.52, w * 0.09, h * 0.48);
  const face = ctx.createRadialGradient(w * 0.25, h * 0.45, 8, w * 0.245, h * 0.46, 90);
  face.addColorStop(0, '#f1c7a5');
  face.addColorStop(0.7, '#c98f6b');
  face.addColorStop(1, '#8a5a3f');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.ellipse(w * 0.245, h * 0.46, 70, 88, 0, 0, Math.PI * 2);
  ctx.fill();

  const blob = await new Promise<Blob>((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a foto de exemplo.'))), 'image/jpeg', 0.92),
  );
  return new File([blob], 'exemplo-chagas-color.jpg', { type: 'image/jpeg' });
}
