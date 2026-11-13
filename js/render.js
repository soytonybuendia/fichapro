// Dibuja en canvas: foto 01, ficha resumen, catálogo de WhatsApp, historia y páginas de la ficha PDF.
import { GRUPOS } from './datos.js';

const F = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const LEGAL = 'Propiedad sujeta a disponibilidad. Precio sujeto a cambios sin previo aviso. El envío de esta ficha no compromete a las partes a la suscripción de ningún documento legal. La información y medidas son aproximadas y deberán ratificarse con la documentación pertinente.';

export async function fontsReady() {
  try { await Promise.all(['400', '500', '600', '700', '800'].map(w => document.fonts.load(`${w} 40px Inter`))); } catch { /* usa la del sistema */ }
}

// ---------- utilidades ----------
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.textBaseline = 'top'; return [c, x]; }
const font = (x, w, s) => { x.font = `${w} ${s}px ${F}`; };
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * f)); return `rgb(${c.join(',')})`; }

function cover(x, img, X, Y, W, H) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const k = Math.max(W / iw, H / ih), sw = W / k, sh = H / k;
  x.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, X, Y, W, H);
}
function rr(x, X, Y, W, H, r) {
  r = typeof r === 'number' ? [r, r, r, r] : r; // tl tr br bl
  x.beginPath(); x.moveTo(X + r[0], Y); x.lineTo(X + W - r[1], Y); x.arcTo(X + W, Y, X + W, Y + r[1], r[1]);
  x.lineTo(X + W, Y + H - r[2]); x.arcTo(X + W, Y + H, X + W - r[2], Y + H, r[2]); x.lineTo(X + r[3], Y + H);
  x.arcTo(X, Y + H, X, Y + H - r[3], r[3]); x.lineTo(X, Y + r[0]); x.arcTo(X, Y, X + r[0], Y, r[0]); x.closePath();
}
function coverRound(x, img, X, Y, W, H, r) { x.save(); rr(x, X, Y, W, H, r); x.clip(); cover(x, img, X, Y, W, H); x.restore(); }

function spW(x, t, sp) { return [...t].reduce((a, c) => a + x.measureText(c).width, 0) + sp * Math.max(0, [...t].length - 1); }
function spaced(x, t, X, Y, sp, align = 'left') {
  const w = spW(x, t, sp); let cx = align === 'right' ? X - w : align === 'center' ? X - w / 2 : X;
  for (const c of t) { x.fillText(c, cx, Y); cx += x.measureText(c).width + sp; }
  return w;
}
function wrap(x, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean), lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (x.measureText(t).width <= maxW || !line) line = t; else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}
function fit(x, text, weight, size, min, maxW, maxLines) {
  for (let s = size; s >= min; s -= 2) { font(x, weight, s); const l = wrap(x, text, maxW); if (l.length <= maxLines) return { size: s, lines: l }; }
  font(x, weight, min); return { size: min, lines: clamp(x, wrap(x, text, maxW), maxLines, maxW) };
}
function clamp(x, lines, n, maxW) {
  if (lines.length <= n) return lines;
  const out = lines.slice(0, n); let last = out[n - 1] + '…';
  while (x.measureText(last).width > maxW && last.length > 2) last = last.slice(0, -2) + '…';
  out[n - 1] = last; return out;
}
function shrinkTo(x, text, weight, size, maxW, min = 10) { let s = size; font(x, weight, s); while (s > min && x.measureText(text).width > maxW) { s -= 1; font(x, weight, s); } return s; }
// Dibuja trozos de texto en una misma línea base: parts = [[texto, peso, tamaño, color]]
function inline(x, parts, X, baseY) {
  x.textBaseline = 'alphabetic'; let cx = X;
  for (const [t, w, s, col] of parts) { if (!t) continue; font(x, w, s); x.fillStyle = col; x.fillText(t, cx, baseY); cx += x.measureText(t).width; }
  x.textBaseline = 'top'; return cx - X;
}
function shadowOn(x, b = 14) { x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = b; x.shadowOffsetY = 2; }
function shadowOff(x) { x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0; }
function vgrad(x, W, H, color, stops) {
  const g = x.createLinearGradient(0, 0, 0, H); for (const [p, a] of stops) g.addColorStop(p, rgba(color, a));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
}

// ---------- marca (logo o nombre) ----------
// B = {logo, logoWhite, logoDark, hasAlpha, marca, dark, accent}
export function prepBrand(perfil, logoImg) {
  const B = { logo: logoImg, marca: (perfil.empresa || perfil.nombre || '').trim(), dark: perfil.oscuro || '#252526', accent: perfil.acento || '#BEAF87' };
  if (logoImg) {
    const w = logoImg.naturalWidth, h = logoImg.naturalHeight;
    const [c, x] = mk(w, h); x.drawImage(logoImg, 0, 0);
    const d = x.getImageData(0, 0, w, h).data; let transp = 0, lum = 0, op = 0;
    for (let i = 0; i < d.length; i += 16) { if (d[i + 3] < 200) transp++; else { op++; lum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; } }
    B.hasAlpha = transp > d.length / 16 * 0.05;
    B.light = op && lum / op > 200;
    const tint = (col) => { const [t, tx] = mk(w, h); tx.drawImage(logoImg, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = col; tx.fillRect(0, 0, w, h); return t; };
    if (B.hasAlpha) { B.logoWhite = tint('#ffffff'); if (B.light) B.logoDark = tint(B.dark); }
  }
  return B;
}
function brandOnPhoto(x, B, X, Y, h, maxW, align = 'left') {
  if (B.logo) {
    const src = B.logoWhite || B.logo, r = (src.naturalWidth || src.width) / (src.naturalHeight || src.height);
    let w = h * r; if (w > maxW) { w = maxW; h = w / r; }
    const dx = align === 'right' ? X - w : X;
    if (B.logoWhite) x.drawImage(src, dx, Y, w, h);
    else { const p = h * 0.25; x.fillStyle = '#fff'; rr(x, dx - p, Y - p, w + 2 * p, h + 2 * p, 6); x.fill(); x.drawImage(src, dx, Y, w, h); }
    return w;
  }
  if (!B.marca) return 0;
  x.fillStyle = '#fff'; font(x, 800, Math.round(h * 0.62));
  return spaced(x, B.marca.toUpperCase(), X, Y + h * 0.18, h * 0.08, align);
}
function brandOnWhite(x, B, X, Y, h, maxW) {
  if (B.logo) {
    const src = B.logoDark || B.logo, r = (src.naturalWidth || src.width) / (src.naturalHeight || src.height);
    let w = h * r; if (w > maxW) { w = maxW; h = w / r; }
    x.drawImage(src, X, Y, w, h); return w;
  }
  x.fillStyle = B.dark; font(x, 800, Math.round(h * 0.62)); return spaced(x, (B.marca || '').toUpperCase(), X, Y + h * 0.18, h * 0.08);
}
function tagBox(x, B, text, Xright, Y, size, padX, padY, alpha = 1) {
  font(x, 800, size); const sp = size * 0.14, w = spW(x, text, sp) + padX * 2, h = size + padY * 2;
  x.fillStyle = alpha < 1 ? rgba(B.accent, alpha) : B.accent; rr(x, Xright - w, Y, w, h, 4); x.fill();
  x.fillStyle = B.dark; spaced(x, text, Xright - w + padX, Y + padY + size * 0.04, sp); return h;
}

// Apila bloques de abajo hacia arriba: cada bloque {h, draw(y)}
function stackBottom(blocks, bottomY) { const total = blocks.reduce((a, b) => a + b.h, 0); let y = bottomY - total; for (const b of blocks) { b.draw(y); y += b.h; } return bottomY - total; }

// ---------- foto 01 limpia y fotos del anuncio ----------
export function fotoCuadrada(img, size = 1200) { const [c, x] = mk(size, size); cover(x, img, 0, 0, size, size); return c; }
export function fotoAjustada(img, max = 1600) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, k = Math.min(1, max / Math.max(iw, ih));
  const [c, x] = mk(Math.round(iw * k), Math.round(ih * k)); x.drawImage(img, 0, 0, c.width, c.height); return c;
}

// ---------- ficha resumen (Marketplace, última foto) ----------
export function portada(d, B, img) {
  const W = 1200, [c, x] = mk(W, W), L = 60, R = W - 60, MW = R - L;
  cover(x, img, 0, 0, W, W);
  vgrad(x, W, W, B.dark, [[0, .55], [.22, 0], [.36, 0], [.54, .78], [.68, .93], [1, .97]]);
  brandOnPhoto(x, B, L, 48, 46, 520);
  tagBox(x, B, d.tag, R, 44, 26, 26, 14);
  const t = fit(x, d.title, 800, 104, 60, MW, 2);
  const blocks = [];
  blocks.push({ h: 34, draw: y => { shadowOn(x); x.fillStyle = B.accent; font(x, 700, 24); spaced(x, d.eyebrow.toUpperCase(), L, y, 5); } });
  blocks.push({ h: t.lines.length * t.size + 14, draw: y => { x.fillStyle = '#fff'; font(x, 800, t.size); t.lines.forEach((l, i) => x.fillText(l, L, y + 6 + i * t.size)); } });
  if (d.location) blocks.push({ h: 66, draw: y => { x.fillStyle = '#ddd'; font(x, 400, 30); x.fillText(d.location, L, y + 2); } });
  const cols = d.prices.length || 1, cw = MW / cols;
  blocks.push({ h: 168, draw: y => {
    shadowOff(x); x.fillStyle = B.accent; x.fillRect(L, y, MW, 2); x.fillRect(L, y + 166, MW, 2);
    d.prices.forEach((p, i) => {
      const cx = L + i * cw + (i ? 34 : 0), w = cw - (i ? 34 : 0) - 10;
      if (i) { x.fillStyle = rgba(B.accent, .5); x.fillRect(L + i * cw, y + 20, 1, 128); }
      shadowOn(x); x.fillStyle = B.accent; font(x, 700, 20); spaced(x, p.label.toUpperCase(), cx, y + 22, 3.6);
      const ps = shrinkTo(x, p.price + (p.cur === 'USD' ? ' USD' : ''), 800, 64, w); x.fillStyle = '#fff'; font(x, 800, ps);
      x.fillText(p.price + (p.cur === 'USD' ? ' USD' : ''), cx, y + 52 + (64 - ps) / 2);
      if (p.sub) { x.fillStyle = '#ccc'; font(x, 400, 22); x.fillText(clamp(x, wrap(x, p.sub, w), 1, w)[0], cx, y + 124); }
    });
  } });
  if (d.chips.length) {
    font(x, 500, 23); const rows = [[]]; let rw = 0;
    for (const ch of d.chips) { const w = x.measureText(ch).width + 44; if (rw + w > MW && rows[rows.length - 1].length) { rows.push([]); rw = 0; } rows[rows.length - 1].push([ch, w]); rw += w + 12; }
    const rh = rows.slice(0, 2);
    blocks.push({ h: 28 + rh.length * 47 + (rh.length - 1) * 10 + 30, draw: y => {
      rh.forEach((row, ri) => { let cx = L; const yy = y + 28 + ri * 57;
        for (const [ch, w] of row) { shadowOff(x); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1.5; rr(x, cx, yy, w, 47, 24); x.stroke();
          shadowOn(x, 8); x.fillStyle = '#fff'; font(x, 500, 23); x.fillText(ch, cx + 22, yy + 11); cx += w + 12; } });
    } });
  }
  blocks.push({ h: 70, draw: y => {
    shadowOff(x); font(x, 800, 34); const tel = d.contacto.telefono, tw = x.measureText(tel).width + 56;
    if (tel) { x.fillStyle = '#fff'; rr(x, R - tw, y + 2, tw, 64, 6); x.fill(); x.fillStyle = B.dark; x.fillText(tel, R - tw + 28, y + 16); }
    shadowOn(x); x.fillStyle = '#fff'; const who = [d.contacto.nombre, d.contacto.rol].filter(Boolean).join(' · ');
    const s = shrinkTo(x, who, 400, 26, MW - tw - 24, 16); x.fillText(who, L, y + 20 + (26 - s) / 2);
  } });
  stackBottom(blocks, W - 56); shadowOff(x);
  return c;
}

// ---------- catálogo de WhatsApp Business ----------
export function catalogo(d, B, img) {
  const W = 1200, [c, x] = mk(W, W), L = 70, R = W - 70, MW = R - L;
  cover(x, img, 0, 0, W, W);
  vgrad(x, W, W, B.dark, [[0, .5], [.2, 0], [.46, 0], [.66, .85], [.8, .95], [1, .97]]);
  brandOnPhoto(x, B, L, 56, 54, 560);
  tagBox(x, B, d.tag, R, 50, 32, 30, 16);
  const t = fit(x, d.title, 800, 128, 76, MW, 2);
  const cols = d.prices.length || 1, cw = MW / cols;
  stackBottom([
    { h: t.lines.length * t.size + 34, draw: y => { shadowOn(x); x.fillStyle = '#fff'; font(x, 800, t.size); t.lines.forEach((l, i) => x.fillText(l, L, y + i * t.size)); } },
    { h: 160, draw: y => {
      shadowOff(x); x.fillStyle = B.accent; x.fillRect(L, y, MW, 3);
      d.prices.forEach((p, i) => {
        const cx = L + i * cw + (i ? 40 : 0), w = cw - (i ? 40 : 0) - 6;
        if (i) { x.fillStyle = rgba(B.accent, .5); x.fillRect(L + i * cw, y + 26, 2, 120); }
        shadowOn(x); x.fillStyle = B.accent; font(x, 700, 26); spaced(x, p.short.toUpperCase(), cx, y + 28, 5);
        const main = p.price + (p.cur === 'USD' ? ' USD' : '');
        font(x, 500, 30); const sw = p.suffix ? x.measureText(p.suffix).width : 0;
        const ps = shrinkTo(x, main, 800, 82, w - sw);
        inline(x, [[main, 800, ps, '#fff'], [p.suffix, 500, 30, '#ccc']], cx, y + 66 + 82 * .78);
      });
    } },
  ], W - 70);
  shadowOff(x); return c;
}

// ---------- historia vertical 1080×1920 ----------
export function historia(d, B, img) {
  const W = 1080, H = 1920, [c, x] = mk(W, H), L = 64, R = W - 64, MW = R - L;
  cover(x, img, 0, 0, W, H);
  vgrad(x, W, H, '#141415', [[0, .28], [.17, 0], [.56, 0], [.7, .55], [1, .85]]);
  brandOnPhoto(x, B, L, 250, 34, 420);
  tagBox(x, B, d.tag, R, 246, 20, 18, 10, .92);
  const t = fit(x, d.title, 700, 72, 52, MW, 3);
  const priceLine = d.prices.map(p => ({ l: p.short.toUpperCase(), v: p.price + (p.cur === 'USD' ? ' USD' : ''), s: p.suffix }));
  stackBottom([
    { h: 34, draw: y => { shadowOn(x, 12); x.fillStyle = B.accent; font(x, 600, 20); spaced(x, d.eyebrow.toUpperCase(), L, y, 4); } },
    { h: t.lines.length * t.size * 1.02 + 14, draw: y => { x.fillStyle = '#fff'; font(x, 700, t.size); t.lines.forEach((l, i) => x.fillText(l, L, y + 4 + i * t.size * 1.02)); } },
    d.location ? { h: 56, draw: y => { x.fillStyle = '#e6e6e6'; font(x, 400, 24); x.fillText(d.location, L, y + 2); } } : { h: 12, draw() {} },
    { h: 78, draw: y => {
      shadowOff(x); x.fillStyle = rgba(B.accent, .8); x.fillRect(L, y, MW, 1.5);
      // una sola línea de precios; se reduce si no cabe
      const parts = (k) => priceLine.flatMap((p, i) => [
        ...(i ? [['  ·  ', 700, 40 * k, B.accent]] : []),
        [p.l + ' ', 600, 19 * k, B.accent], [p.v, 700, 40 * k, '#fff'], [p.s, 500, 22 * k, '#ddd']]);
      const width = (k) => parts(k).reduce((a, [t, w, s]) => { if (!t) return a; font(x, w, s); return a + x.measureText(t).width; }, 0);
      let k = 1; while (width(k) > MW && k > .5) k -= .04;
      shadowOn(x, 12); inline(x, parts(k), L, y + 20 + 40 * k * .8);
    } },
    { h: 40, draw: y => {
      const parts = [d.contacto.nombre, B.marca && B.marca !== d.contacto.nombre ? B.marca : ''].filter(Boolean).join(' · ');
      font(x, 400, 24); x.fillStyle = '#eee'; const a = parts + (d.contacto.telefono ? ' · ' : ''); x.fillText(a, L, y + 6);
      if (d.contacto.telefono) { const aw = x.measureText(a).width; x.fillStyle = '#fff'; font(x, 700, 24); x.fillText(d.contacto.telefono, L + aw, y + 6); }
    } },
  ], H - 310);
  shadowOff(x); return c;
}

// ---------- ficha PDF (carta a 150 ppp) ----------
const PW = 1275, PH = 1650, u = 1.5625, MX = 94, MY = 86, CW = PW - 2 * MX;
const pt = (v) => v * 2.0833;

function pageHeader(x, B, d, right) {
  brandOnWhite(x, B, MX, MY, 26 * u, 520);
  x.fillStyle = shade(B.accent, .73); font(x, 600, pt(10)); spaced(x, right.toUpperCase(), PW - MX, MY + 26 * u / 2 - pt(10) / 2, pt(10) * .15, 'right');
  const y = MY + 26 * u + 12 * u; x.fillStyle = B.accent; x.fillRect(MX, y, CW, 2 * u);
  return y + 2 * u + 22 * u;
}
function contactBlock(x, B, d, bottom) {
  const h = 110, y = bottom - h;
  x.fillStyle = B.accent; x.fillRect(MX, y, CW, 2 * u);
  x.fillStyle = shade(B.accent, .73); font(x, 600, pt(8.5)); spaced(x, 'TU ASESOR', MX, y + 22, pt(8.5) * .15);
  x.fillStyle = B.dark; font(x, 700, pt(22)); x.fillText(d.contacto.nombre, MX, y + 44);
  x.fillStyle = '#555'; font(x, 400, pt(9.5)); x.fillText(d.contacto.linea, MX, y + 44 + pt(22) + 6);
  if (d.contacto.telefono) {
    font(x, 600, pt(13)); x.fillStyle = B.dark; const tw = x.measureText(d.contacto.telefono).width;
    x.fillText(d.contacto.telefono, PW - MX - tw, y + 56);
    x.fillStyle = shade(B.accent, .73); font(x, 600, pt(8.5)); spaced(x, 'TELÉFONO / WHATSAPP', PW - MX - tw - 16, y + 60, 1.4, 'right');
  }
  return y;
}
function legal(x) {
  x.fillStyle = '#999'; font(x, 400, pt(7)); const lines = wrap(x, LEGAL, CW); const lh = pt(7) * 1.35;
  const y0 = PH - 26 - lines.length * lh; lines.forEach((l, i) => { const w = x.measureText(l).width; x.fillText(l, (PW - w) / 2, y0 + i * lh); });
  return y0;
}
function grid(x, imgs, X, Y, W, H, gap = 16) {
  const n = imgs.length; if (!n) return;
  if (n === 1) return coverRound(x, imgs[0], X, Y, W, H, 6);
  if (n === 2) { const h = (H - gap) / 2; imgs.forEach((im, i) => coverRound(x, im, X, Y + i * (h + gap), W, h, 6)); return; }
  if (n === 3) { const h1 = (H - gap) * 0.58, h2 = H - gap - h1, w = (W - gap) / 2;
    coverRound(x, imgs[0], X, Y, W, h1, 6); imgs.slice(1).forEach((im, i) => coverRound(x, im, X + i * (w + gap), Y + h1 + gap, w, h2, 6)); return; }
  const w = (W - gap) / 2, h = (H - gap) / 2;
  imgs.slice(0, 4).forEach((im, i) => coverRound(x, im, X + (i % 2) * (w + gap), Y + Math.floor(i / 2) * (h + gap), w, h, 6));
}
function h2(x, B, t, y) { x.fillStyle = B.dark; font(x, 700, pt(20)); x.fillText(t, MX, y); return y + pt(20) + 22; }

export function fichaPaginas(d, B, fotos) { // fotos: [{img, cat}] en orden, 0 = principal
  const pages = [], hero = fotos[0].img;
  // en la ficha no van fotos oscuras ni repetidas, si hay suficientes otras
  const buenas = fotos.slice(1).filter(f => !f.oscura && f.dup == null);
  const rest = buenas.length >= 3 ? buenas : fotos.slice(1);
  // ---- página 1
  { const [c, x] = mk(PW, PH); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH);
    let y = pageHeader(x, B, d, d.clave ? 'ID ' + d.clave : d.opTxt);
    x.fillStyle = shade(B.accent, .73); font(x, 600, pt(10)); spaced(x, d.eyebrow.toUpperCase(), MX, y, pt(10) * .2); y += pt(10) + 10;
    const t = fit(x, d.title, 700, pt(42), pt(28), CW, 2); x.fillStyle = B.dark;
    t.lines.forEach((l, i) => x.fillText(l, MX, y + i * t.size * 1.05)); y += t.lines.length * t.size * 1.05 + 8;
    if (d.address) { x.fillStyle = '#555'; font(x, 400, pt(11)); x.fillText(clamp(x, wrap(x, d.address, CW), 1, CW)[0], MX, y); y += pt(11) + 22; }
    const contactTop = PH - MY - 110;
    const pbH = 150, stH = 92, descMin = 4 * 34 + 20;
    const heroH = Math.max(320, Math.min(560, contactTop - 24 - descMin - 22 - stH - 22 - pbH - y));
    coverRound(x, hero, MX, y, CW, heroH, [9, 9, 0, 0]); y += heroH;
    x.fillStyle = B.dark; rr(x, MX, y, CW, pbH, [0, 0, 9, 9]); x.fill();
    const cols = d.prices.length || 1, cw = CW / cols;
    d.prices.forEach((p, i) => {
      const cx = MX + i * cw + 34, w = cw - 60;
      if (i) { x.fillStyle = '#4a4a4b'; x.fillRect(MX + i * cw, y + 18, 1.5, pbH - 36); }
      x.fillStyle = B.accent; font(x, 600, pt(8.5)); spaced(x, p.label.toUpperCase(), cx, y + 24, pt(8.5) * .15);
      const cur = ' ' + p.cur; font(x, 500, pt(12)); const curW = x.measureText(cur).width;
      const ps = shrinkTo(x, p.price, 700, pt(28), w - curW);
      inline(x, [[p.price, 700, ps, '#fff'], [cur, 500, pt(12), '#ccc']], cx, y + 52 + pt(28) * .8);
      if (p.sub) { x.fillStyle = '#ccc'; font(x, 400, pt(10)); x.fillText(clamp(x, wrap(x, p.sub, w), 1, w)[0], cx, y + 52 + pt(28) + 10); }
    });
    y += pbH + 22;
    if (d.stats.length) {
      x.fillStyle = '#F2F2F2'; rr(x, MX, y, CW, stH, 9); x.fill(); const sw = CW / d.stats.length;
      d.stats.forEach(([v, l], i) => {
        if (i) { x.fillStyle = '#ddd'; x.fillRect(MX + i * sw, y + 14, 1.5, stH - 28); }
        x.fillStyle = B.dark; const vs = shrinkTo(x, String(v), 700, pt(14), sw - 16); const vw = x.measureText(String(v)).width; x.fillText(String(v), MX + i * sw + (sw - vw) / 2, y + 18);
        x.fillStyle = '#666'; font(x, 500, pt(8)); const lw = spW(x, l.toUpperCase(), 1.2); spaced(x, l.toUpperCase(), MX + i * sw + (sw - lw) / 2, y + 26 + pt(14), 1.2);
      });
      y += stH + 24;
    }
    x.fillStyle = '#444'; font(x, 400, pt(10.5)); const lh = pt(10.5) * 1.55;
    const maxL = Math.floor((contactTop - 20 - y) / lh); clamp(x, wrap(x, d.description, CW), maxL, CW).forEach((l, i) => x.fillText(l, MX, y + i * lh));
    contactBlock(x, B, d, PH - MY);
    pages.push(c);
  }
  // ---- galerías
  const pick = (cats, n, used) => { const r = []; for (const f of rest) { if (r.length >= n) break; if (!used.has(f) && cats.includes(f.cat)) { r.push(f); used.add(f); } } return r; };
  const pocas = rest.length + 1 <= 6;
  const used = new Set();
  let galerias;
  if (pocas) {
    const g = []; for (const cat of ['sala', 'cocina', 'recamara', 'amenidad', 'fachada', 'comedor', 'bano', 'balcon', 'otro']) { const f = rest.find(f => f.cat === cat && !g.includes(f)); if (f && g.length < 3) g.push(f); }
    for (const f of rest) if (g.length < 3 && !g.includes(f)) g.push(f);
    galerias = [{ title: 'Galería', fotos: g }];
  } else {
    const ext = pick(GRUPOS.exterior, 4, used), int = pick(GRUPOS.interior, 4, used), pri = pick(GRUPOS.privado, 4, used);
    // completa grupos cortos con lo que sobró
    for (const g of [ext, int, pri]) if (g.length && g.length < 4) for (const f of rest) { if (g.length >= 4) break; if (!used.has(f)) { g.push(f); used.add(f); } }
    galerias = [
      { title: ext.length ? 'Exteriores y amenidades' : '', fotos: ext },
      { title: titulo(int, 'Sala, comedor y cocina'), fotos: int },
      { title: titulo(pri, 'Recámaras y baño'), fotos: pri },
    ];
  }
  const pageGals = galerias.slice(1).filter(g => g.fotos.length);
  // ---- página 2
  { const [c, x] = mk(PW, PH); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH);
    let y = pageHeader(x, B, d, 'Características');
    const last = pageGals.length === 0;
    if (d.amen.length) {
      y = h2(x, B, 'Lo que incluye', y);
      const am = d.amen.slice(0, 18), cw3 = (CW - 2 * 16 * u) / 3, ch = 50;
      am.forEach((a, i) => { const cx = MX + (i % 3) * (cw3 + 16 * u), cy = y + Math.floor(i / 3) * (ch + 10);
        x.fillStyle = '#F2F2F2'; x.fillRect(cx, cy, cw3, ch); x.fillStyle = B.accent; x.fillRect(cx, cy, 3 * u, ch);
        x.fillStyle = B.dark; shrinkTo(x, a, 400, pt(10.5), cw3 - 34); x.fillText(a, cx + 20, cy + (ch - pt(10.5)) / 2); });
      y += Math.ceil(am.length / 3) * (ch + 10) + 20;
    }
    if (d.facts.length) {
      const fw = CW / 4;
      d.facts.forEach(([l, v], i) => { const cx = MX + i * fw;
        x.fillStyle = shade(B.accent, .73); font(x, 600, pt(8)); spaced(x, l.toUpperCase(), cx, y, 1.3);
        x.fillStyle = B.dark; shrinkTo(x, v, 600, pt(11), fw - 16); x.fillText(v, cx, y + pt(8) + 8); });
      y += pt(8) + pt(11) + 44;
    }
    const g = galerias[0];
    let bottom = PH - MY;
    if (last) { legal(x); bottom = contactBlock(x, B, d, PH - MY) - 26; }
    if (g.fotos.length) {
      y = h2(x, B, g.title || 'Galería', y);
      grid(x, g.fotos.map(f => f.img), MX, y, CW, Math.max(200, bottom - y));
    }
    pages.push(c);
  }
  // ---- páginas 3 y 4
  pageGals.forEach((g, i) => {
    const [c, x] = mk(PW, PH); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH);
    let y = pageHeader(x, B, d, 'Galería'); y = h2(x, B, g.title, y);
    let bottom = PH - MY;
    if (i === pageGals.length - 1) { legal(x); bottom = contactBlock(x, B, d, PH - MY) - 26; }
    grid(x, g.fotos.map(f => f.img), MX, y, CW, bottom - y);
    pages.push(c);
  });
  return pages;
}
function titulo(fotos, def) {
  const cats = new Set(fotos.map(f => f.cat));
  if (def.startsWith('Sala')) { const n = ['sala', 'comedor', 'cocina'].filter(c => cats.has(c)).map(c => ({ sala: 'Sala', comedor: 'comedor', cocina: 'cocina' }[c])); if (n.length && n.length < 3 && !cats.has('otro')) return n.length === 1 ? n[0][0].toUpperCase() + n[0].slice(1) : n.slice(0, -1).join(', ').replace(/^./, m => m.toUpperCase()) + ' y ' + n[n.length - 1]; }
  if (def.startsWith('Rec')) { if (!cats.has('bano')) return 'Recámaras'; if (!cats.has('recamara')) return 'Baños'; }
  return def;
}
