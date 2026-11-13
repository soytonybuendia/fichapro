// PDF tamaño carta con una imagen JPG por página.
export async function makePdf(canvases, title = 'Ficha') {
  const enc = new TextEncoder(), chunks = [], offsets = [];
  let len = 0;
  const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; };
  const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
  const jpgs = [];
  for (const c of canvases) {
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
    jpgs.push({ w: c.width, h: c.height, data: new Uint8Array(await blob.arrayBuffer()) });
  }
  const n = jpgs.length, W = 612, H = 792;
  // 1 catálogo, 2 páginas, 3 info; luego por página: page, contenido, imagen
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  const kids = jpgs.map((_, i) => `${4 + i * 3} 0 R`).join(' ');
  obj(2, () => push(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`));
  const safe = title.replace(/[()\\]/g, '').replace(/[^\x20-\x7E]/g, c => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n', Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ñ: 'N' }[c] || ''));
  obj(3, () => push(`<< /Title (${safe}) /Producer (FichaPro) >>`));
  jpgs.forEach((j, i) => {
    const p = 4 + i * 3;
    obj(p, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`));
    const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    obj(p + 1, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    obj(p + 2, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${j.w} /Height ${j.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${j.data.length} >>\nstream\n`);
      push(j.data); push('\nendstream');
    });
  });
  const total = 4 + n * 3, xref = len;
  let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let i = 1; i < total; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  push(x + `trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: 'application/pdf' });
}
