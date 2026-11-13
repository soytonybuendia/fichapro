import { CATS, CAT_ORDER, derive, slug } from './datos.js';
import { fontsReady, prepBrand, fotoCuadrada, fotoAjustada, portada, catalogo, historia, fichaPaginas } from './render.js';
import { textos, porConfirmar } from './textos.js';
import { makePdf } from './pdf.js';
import { makeZip } from './zip.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const AMENIDADES = ['Alberca', 'Gimnasio', 'Seguridad 24/7', 'Acceso controlado', 'Elevador', 'Roof garden', 'Jardín', 'Terraza', 'Balcón',
  'Área de asadores', 'Casa club', 'Salón de eventos', 'Juegos infantiles', 'Cancha de pádel', 'Coworking', 'Spa', 'Cuarto de servicio', 'Bodega',
  'Aire acondicionado', 'Cocina integral', 'Vista al mar', 'Cerca de la playa', 'Estacionamiento de visitas', 'Pet friendly'];

// ---------- estado y guardado ----------
const load = (k, def) => { try { return { ...def, ...JSON.parse(localStorage.getItem(k) || '{}') }; } catch { return { ...def }; } };
const PERFIL0 = { nombre: '', telefono: '', rol: 'Asesor inmobiliario', empresa: '', oscuro: '#252526', acento: '#BEAF87', logo: '' };
const PROP0 = { tipo: 'Departamento', renta: true, venta: false, monedaRenta: 'MXN', monedaVenta: 'MXN', amenidades: [] };
const S = { perfil: load('fp.perfil', PERFIL0), prop: load('fp.prop', PROP0), fotos: [], step: 'perfil', kit: null, bg: null, hi: null };
let logoImg = null;
let saveT;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem('fp.perfil', JSON.stringify(S.perfil)); localStorage.setItem('fp.prop', JSON.stringify(S.prop)); } catch { /* sin almacenamiento */ } }, 250); };

const idb = {
  db: null,
  open() { return this.db ||= new Promise((ok, ko) => { const r = indexedDB.open('fichapro', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); },
  async get(k) { const db = await this.open(); return new Promise(ok => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => ok(r.result); r.onerror = () => ok(undefined); }); },
  async set(k, v) { const db = await this.open(); return new Promise(ok => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = ok; t.onerror = ok; }); },
};
let fotosT;
const saveFotos = () => { clearTimeout(fotosT); fotosT = setTimeout(() => idb.set('fotos', S.fotos.map(f => ({ id: f.id, blob: f.blob, cat: f.cat }))).catch(() => {}), 300); };

// ---------- avisos ----------
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2200); }

// ---------- pasos ----------
const STEPS = ['perfil', 'propiedad', 'fotos', 'kit'];
function go(step) {
  S.step = step;
  STEPS.forEach(s => { $('#step-' + s).hidden = s !== step; });
  $$('.steps button').forEach(b => { if (b.dataset.step === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
  const i = STEPS.indexOf(step);
  $('#atras').style.visibility = i ? 'visible' : 'hidden';
  $('#siguiente').hidden = i === STEPS.length - 1;
  $('#siguiente').textContent = i === STEPS.length - 2 ? 'Ver mi kit' : 'Siguiente';
  if (step === 'kit') renderFaltan();
  window.scrollTo({ top: 0 });
}
$$('.steps button').forEach(b => b.addEventListener('click', () => go(b.dataset.step)));
$('#atras').addEventListener('click', () => go(STEPS[Math.max(0, STEPS.indexOf(S.step) - 1)]));
$('#siguiente').addEventListener('click', () => go(STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(S.step) + 1)]));

// ---------- formulario ----------
function bindForm() {
  $$('main [name*="."]').forEach(el => {
    const [grp, key] = el.name.split('.'); const obj = S[grp];
    if (el.type === 'checkbox') el.checked = !!obj[key]; else if (obj[key] != null) el.value = obj[key];
    el.addEventListener('input', () => { obj[key] = el.type === 'checkbox' ? el.checked : el.value; save(); syncOps(); S.kit && markStale(); });
    el.addEventListener('change', () => { obj[key] = el.type === 'checkbox' ? el.checked : el.value; save(); syncOps(); });
  });
  syncOps();
}
function syncOps() { $('.if-renta').hidden = !S.prop.renta; $('.if-venta').hidden = !S.prop.venta; }
function markStale() { $('#genStatus').textContent = 'Cambiaste datos: vuelve a generar para actualizar el kit.'; }

function renderAmen() {
  const sel = S.prop.amenidades || [];
  const all = [...AMENIDADES, ...sel.filter(a => !AMENIDADES.includes(a))];
  $('#amenChips').innerHTML = all.map(a => `<button type="button" class="chip" aria-pressed="${sel.includes(a)}">${esc(a)}</button>`).join('');
}
$('#amenChips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return; const a = b.textContent, sel = S.prop.amenidades ||= [];
  const i = sel.indexOf(a); if (i >= 0) sel.splice(i, 1); else sel.push(a);
  b.setAttribute('aria-pressed', i < 0); save();
});
function addAmen() { const v = $('#amenNueva').value.trim(); if (!v) return; const sel = S.prop.amenidades ||= []; if (!sel.includes(v)) sel.push(v); $('#amenNueva').value = ''; save(); renderAmen(); }
$('#amenAdd').addEventListener('click', addAmen);
$('#amenNueva').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addAmen(); } });

// ---------- logo ----------
async function loadLogo() {
  logoImg = null;
  if (S.perfil.logo) { logoImg = await imgFrom(S.perfil.logo); $('#logoPrev').innerHTML = `<img src="${S.perfil.logo}" alt="Tu logo">`; $('#logoQuitar').hidden = false; }
  else { $('#logoPrev').textContent = 'Sin logo'; $('#logoQuitar').hidden = true; }
}
$('#logoFile').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return; const img = await imgFrom(URL.createObjectURL(f));
  const k = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight)); const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  S.perfil.logo = c.toDataURL('image/png'); save(); await loadLogo(); e.target.value = '';
});
$('#logoQuitar').addEventListener('click', () => { S.perfil.logo = ''; save(); loadLogo(); });

// ---------- fotos ----------
function imgFrom(src) { return new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; }); }
function analizar(img) {
  const c = document.createElement('canvas'); c.width = 9; c.height = 8; const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, 9, 8); const d = x.getImageData(0, 0, 9, 8).data; const g = [];
  let sum = 0; for (let i = 0; i < d.length; i += 4) { const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; g.push(l); sum += l; }
  let hash = ''; for (let y = 0; y < 8; y++) for (let xx = 0; xx < 8; xx++) hash += g[y * 9 + xx] > g[y * 9 + xx + 1] ? '1' : '0';
  return { oscura: sum / g.length < 70, hash, chica: Math.min(img.naturalWidth, img.naturalHeight) < 700 };
}
async function prepFoto(blob, cat = 'otro', id = crypto.randomUUID?.() || String(Math.random())) {
  const url0 = URL.createObjectURL(blob); let img = await imgFrom(url0);
  if (Math.max(img.naturalWidth, img.naturalHeight) > 2400 || blob.size > 2.5e6) { // reduce para ahorrar memoria
    const k = 2400 / Math.max(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * Math.min(1, k)); c.height = Math.round(img.naturalHeight * Math.min(1, k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url0);
    blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9)); img = await imgFrom(URL.createObjectURL(blob));
  }
  return { id, blob, url: img.src, img, cat, ...analizar(img) };
}
async function addFiles(files) {
  const list = [...files].filter(f => f.type.startsWith('image/')); if (!list.length) return;
  $('#fotoCount').textContent = `Cargando ${list.length} foto${list.length > 1 ? 's' : ''}…`;
  for (const f of list) { try { S.fotos.push(await prepFoto(f)); } catch { toast('No se pudo leer una foto'); } }
  marcarDuplicados(); renderFotos(); saveFotos();
}
function marcarDuplicados() {
  S.fotos.forEach((f, i) => { f.dup = null; for (let j = 0; j < i; j++) { let h = 0; for (let k = 0; k < 64; k++) if (f.hash[k] !== S.fotos[j].hash[k]) h++; if (h <= 5) { f.dup = j; break; } } });
}
function renderFotos() {
  const n = S.fotos.length;
  $('#fotoCount').textContent = n ? `${n} foto${n > 1 ? 's' : ''}` : '';
  $('#photos').innerHTML = S.fotos.map((f, i) => {
    const w = [f.oscura && 'Foto oscura', f.dup != null && `Parecida a la ${String(f.dup + 1).padStart(2, '0')}`, f.chica && 'Resolución baja'].filter(Boolean).join(' · ');
    return `<li class="ph" data-i="${i}"><div class="thumb" style="background-image:url('${f.url}')"></div><span class="num">${String(i + 1).padStart(2, '0')}</span>
    <div class="tools"><select aria-label="Qué se ve en la foto ${i + 1}">${CATS.map(([k, l]) => `<option value="${k}"${k === f.cat ? ' selected' : ''}>${l}</option>`).join('')}</select>
    <div class="mv"><button type="button" data-a="first" title="Usar como portada" aria-label="Usar como portada">★</button><button type="button" data-a="up" aria-label="Mover antes">←</button><button type="button" data-a="down" aria-label="Mover después">→</button><button type="button" data-a="del" aria-label="Quitar foto">✕</button></div>
    ${w ? `<div class="warn">${w}</div>` : ''}</div></li>`;
  }).join('');
}
$('#photos').addEventListener('change', e => { const li = e.target.closest('.ph'); if (!li) return; S.fotos[+li.dataset.i].cat = e.target.value; saveFotos(); });
$('#photos').addEventListener('click', e => {
  const b = e.target.closest('button[data-a]'); if (!b) return; const i = +b.closest('.ph').dataset.i, F = S.fotos;
  if (b.dataset.a === 'first' && i) F.unshift(F.splice(i, 1)[0]);
  if (b.dataset.a === 'up' && i) [F[i - 1], F[i]] = [F[i], F[i - 1]];
  if (b.dataset.a === 'down' && i < F.length - 1) [F[i + 1], F[i]] = [F[i], F[i + 1]];
  if (b.dataset.a === 'del') { URL.revokeObjectURL(F[i].url); F.splice(i, 1); }
  marcarDuplicados(); renderFotos(); saveFotos();
});
$('#ordenar').addEventListener('click', () => {
  if (S.fotos.length < 3) return;
  const [first, ...rest] = S.fotos;
  rest.sort((a, b) => (CAT_ORDER[a.cat] - CAT_ORDER[b.cat]) || (a.oscura - b.oscura));
  S.fotos = [first, ...rest]; marcarDuplicados(); renderFotos(); saveFotos(); toast('Ordenadas: interiores, recámaras, amenidades y fachada');
});
$('#fotoFile').addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
const drop = $('#drop');
['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));

// ---------- kit ----------
function requisitos() {
  const r = [];
  if (!S.perfil.nombre?.trim()) r.push(['perfil', 'Tu nombre (paso 1)']);
  if (!S.perfil.telefono?.trim()) r.push(['perfil', 'Tu teléfono (paso 1)']);
  const d = derive(S.prop, S.perfil);
  if (!d.prices.length) r.push(['propiedad', 'Al menos una operación con precio: renta o venta (paso 2)']);
  if (!S.fotos.length) r.push(['fotos', 'Al menos una foto (paso 3)']);
  return r;
}
function renderFaltan() {
  const req = requisitos(), d = derive(S.prop, S.perfil), conf = porConfirmar(d, S.fotos), el = $('#faltan');
  if (!req.length && !conf.length) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = (req.length ? `<h2>Falta para generar</h2><ul>${req.map(([s, t]) => `<li><a href="#" data-go="${s}">${esc(t)}</a></li>`).join('')}</ul>` : '')
    + (conf.length ? `<h2 style="margin-top:${req.length ? 14 : 0}px">Conviene confirmar con el propietario</h2><ul>${conf.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '');
  $('#generar').disabled = !!req.length;
}
$('#faltan').addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (a) { e.preventDefault(); go(a.dataset.go); } });

const toBlob = (c, q = 0.92) => new Promise(r => c.toBlob(r, 'image/jpeg', q));
function autoBg() {
  const i = S.fotos.findIndex((f, i) => i > 0 && !f.oscura && ['amenidad', 'fachada', 'sala', 'balcon'].includes(f.cat));
  return i > 0 ? i : (S.fotos.length > 1 ? 1 : 0);
}
function fillPhotoSelects() {
  const opts = S.fotos.map((f, i) => `<option value="${i}">Foto ${String(i + 1).padStart(2, '0')} · ${CATS.find(c => c[0] === f.cat)?.[1] || ''}</option>`).join('');
  $('#bgSel').innerHTML = opts; $('#hiSel').innerHTML = opts;
  $('#bgSel').value = S.bg; $('#hiSel').value = S.hi;
}
$('#bgSel').addEventListener('change', e => { S.bg = +e.target.value; generar(); });
$('#hiSel').addEventListener('change', e => { S.hi = +e.target.value; generar(); });

async function generar() {
  if (requisitos().length) { renderFaltan(); return; }
  const btn = $('#generar'), st = $('#genStatus'); btn.disabled = true; st.textContent = 'Generando tu kit…';
  try {
    await fontsReady();
    if (S.bg == null || S.bg >= S.fotos.length) S.bg = autoBg();
    if (S.hi == null || S.hi >= S.fotos.length) S.hi = 0;
    const d = derive(S.prop, S.perfil), B = prepBrand(S.perfil, logoImg), name = slug(d.title);
    const fotos = S.fotos;
    const seq = [];
    seq.push({ name: `${name}_01.jpg`, blob: await toBlob(fotoCuadrada(fotos[0].img), 0.95) });
    for (let i = 1; i < fotos.length; i++) seq.push({ name: `${name}_${String(i + 1).padStart(2, '0')}.jpg`, blob: await toBlob(fotoAjustada(fotos[i].img), 0.92) });
    const portadaBlob = await toBlob(portada(d, B, fotos[S.bg].img));
    seq.push({ name: `${name}_${String(fotos.length + 1).padStart(2, '0')}_ficha_resumen.jpg`, blob: portadaBlob, resumen: true });
    st.textContent = 'Armando la ficha PDF…';
    const pages = fichaPaginas(d, B, fotos);
    const pdf = await makePdf(pages, d.title);
    const pageThumbs = await Promise.all(pages.map(p => { const c = document.createElement('canvas'); c.width = 320; c.height = 414; c.getContext('2d').drawImage(p, 0, 0, 320, 414); return toBlob(c, 0.8); }));
    const cat = await toBlob(catalogo(d, B, fotos[S.bg].img));
    const his = await toBlob(historia(d, B, fotos[S.hi].img), 0.9);
    const T = textos(d);
    if (S.kit) Object.values(S.kit.urls).flat().forEach(u => URL.revokeObjectURL(u));
    S.kit = { d, name, seq, pdf, cat, his, portada: portadaBlob, T, urls: {} };
    renderKit(pageThumbs);
    st.textContent = 'Listo. Se generó en tu teléfono; nada se subió a internet.';
    $('#kit').hidden = false;
  } catch (err) { console.error(err); st.textContent = 'Algo falló al generar. Intenta de nuevo o con menos fotos.'; }
  btn.disabled = false; btn.textContent = 'Volver a generar';
}
$('#generar').addEventListener('click', generar);

function u(blob) { const x = URL.createObjectURL(blob); (S.kit.urls.all ||= []).push(x); return x; }
function renderKit(thumbs) {
  const K = S.kit;
  $('#pdfPages').innerHTML = thumbs.map((b, i) => `<img src="${u(b)}" alt="Página ${i + 1} de la ficha">`).join('');
  $('#seq').innerHTML = K.seq.map((f, i) => `<li><img src="${u(f.blob)}" alt="Foto ${i + 1}"><span>${String(i + 1).padStart(2, '0')}${f.resumen ? ' · resumen' : ''}</span></li>`).join('');
  $('#imgPortada').src = u(K.portada); $('#imgCatalogo').src = u(K.cat); $('#imgHistoria').src = u(K.his);
  fillPhotoSelects();
  renderTextos();
}

const copyBox = (t, label = '') => `<div class="copybox">${label ? `<div class="hint" style="margin-bottom:4px">${esc(label)}</div>` : ''}<button type="button" class="cp" data-copy="${esc(t)}">Copiar</button><div class="body">${esc(t)}</div></div>`;
function renderTextos() {
  const { T, d } = S.kit;
  let h = '';
  h += `<div class="card txt"><h2>Facebook Marketplace</h2>${T.marketplace.length > 1 ? '<p class="hint">Marketplace solo permite un precio por anuncio: haz dos publicaciones, una para renta y otra para venta.</p>' : ''}`;
  T.marketplace.forEach(m => { h += `${T.marketplace.length > 1 ? `<h3>Publicación de ${m.op}</h3>` : '<h3>Título</h3>'}${copyBox(m.titulo, T.marketplace.length > 1 ? 'Título' : '')}${copyBox(m.precio, 'Precio')}${copyBox(m.cuerpo, 'Descripción')}`; });
  h += `<p class="hint">Foto principal: la 01, ${esc((CATS.find(c => c[0] === S.fotos[0].cat)?.[1] || '').toLowerCase())}, limpia y sin texto; Marketplace ya muestra el precio debajo y una foto con texto parece anuncio y recibe menos clics.</p></div>`;
  h += `<div class="card txt"><h2>Catálogo de WhatsApp Business</h2><p class="hint">Usa la imagen del catálogo y copia cada campo.</p>
    <h3>Nombre</h3>${copyBox(T.wa.nombre)}<h3>Precio</h3>${copyBox(T.wa.precio)}${T.wa.nota ? `<p class="hint">${esc(T.wa.nota)}</p>` : ''}
    <h3>Descripción</h3>${copyBox(T.wa.descripcion)}${T.wa.codigo ? `<h3>Código del artículo</h3>${copyBox(T.wa.codigo)}` : ''}<h3>Enlace</h3><p class="hint">Déjalo vacío, salvo que tengas una página de la propiedad.</p></div>`;
  const portales = [...new Set(T.portales.map(p => p.portal))];
  h += `<div class="card txt"><h2>Portales inmobiliarios</h2><p class="hint">Sube las fotos en el orden de la carpeta, <b>sin la ficha resumen</b>.</p><div class="tabs" role="group" aria-label="Portal">${portales.map((p, i) => `<button type="button" data-portal="${esc(p)}" aria-pressed="${!i}">${esc(p)}</button>`).join('')}</div>`;
  portales.forEach((p, i) => {
    h += `<div data-pblock="${esc(p)}"${i ? ' hidden' : ''}>`;
    T.portales.filter(x => x.portal === p).forEach(x => {
      h += `${d.prices.length > 1 ? `<h3>${esc(p)} · ${x.op}</h3>` : ''}${copyBox(x.titulo, 'Título')}${copyBox(x.descripcion, 'Descripción')}
      <div class="copybox"><div class="hint" style="margin-bottom:4px">Datos para el formulario</div><dl class="fields">${x.datos.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>`;
    });
    h += '</div>';
  });
  h += `</div><div class="card txt"><h2>Texto para acompañar la historia</h2>${copyBox(T.historia)}</div>`;
  $('#textos').innerHTML = h;
}
$('#textos').addEventListener('click', async e => {
  const c = e.target.closest('[data-copy]');
  if (c) { try { await navigator.clipboard.writeText(c.dataset.copy); } catch { const t = document.createElement('textarea'); t.value = c.dataset.copy; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); } c.textContent = 'Copiado'; setTimeout(() => c.textContent = 'Copiar', 1500); return; }
  const p = e.target.closest('[data-portal]');
  if (p) { $$('[data-portal]').forEach(b => b.setAttribute('aria-pressed', b === p)); $$('[data-pblock]').forEach(b => b.hidden = b.dataset.pblock !== p.dataset.portal); }
});

function textosTxt() {
  const { T } = S.kit, L = [];
  T.marketplace.forEach(m => L.push(`=== FACEBOOK MARKETPLACE${T.marketplace.length > 1 ? ' (' + m.op.toUpperCase() + ')' : ''} ===`, `Título: ${m.titulo}`, `Precio: ${m.precio}`, '', m.cuerpo, ''));
  L.push('=== CATÁLOGO DE WHATSAPP BUSINESS ===', `Nombre: ${T.wa.nombre}`, `Precio: ${T.wa.precio}`, T.wa.nota, 'Descripción:', T.wa.descripcion, T.wa.codigo ? `Código: ${T.wa.codigo}` : '', '');
  T.portales.forEach(p => L.push(`=== ${p.portal.toUpperCase()} (${p.op.toUpperCase()}) ===`, `Título: ${p.titulo}`, '', p.descripcion, '', 'Datos para el formulario:', ...p.datos.map(([k, v]) => `- ${k}: ${v}`), ''));
  L.push('=== HISTORIA ===', T.historia, '');
  return L.filter(l => l != null).join('\n');
}
function leeme() {
  const K = S.kit;
  return `ORDEN PARA PUBLICAR\n\nCarpeta "fotos": súbelas en orden, de la 01 a la ${String(K.seq.length).padStart(2, '0')}.\n- La 01 es la portada del anuncio: va limpia, sin texto.\n- La última (${K.seq[K.seq.length - 1].name}) es la ficha resumen: SOLO para Facebook Marketplace y redes.\n  En Mercado Libre, Inmuebles24 y Vivanuncios sube la misma secuencia SIN esa última.\n\nOtros archivos:\n- ${K.name}_ficha.pdf: ficha para mandar por WhatsApp o correo.\n- ${K.name}_historia.jpg: para estados de WhatsApp e historias de Instagram y Facebook.\n- ${K.name}_catalogo_whatsapp.jpg: imagen del producto en el catálogo de WhatsApp Business.\n- ${K.name}_textos.txt: textos listos para copiar en cada plataforma.\n`;
}

// Dentro de un artefacto de Claude las descargas pasan por su confirmación y no hay menú de compartir.
const EN_CLAUDE = typeof window.claude?.use === 'function';
let dlCap = null;
if (EN_CLAUDE) { document.body.classList.add('en-claude'); window.claude.use('downloads').then(n => { dlCap = n; }).catch(() => {}); }
async function download(blob, name) {
  if (EN_CLAUDE) {
    if (!dlCap) { toast('Las descargas no están disponibles en esta vista'); return false; }
    try { await dlCap.save({ filename: name, data: blob }); return true; }
    catch (e) { if (e?.code === 'rate_limited') toast('Espera un momento y vuelve a intentar'); else if (e?.code !== 'declined') toast('No se pudo descargar ' + name); return false; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return true;
}
async function share(files, title) {
  const fs = files.map(f => new File([f.blob], f.name, { type: f.blob.type }));
  if (!EN_CLAUDE && navigator.canShare?.({ files: fs })) { try { await navigator.share({ files: fs, title }); } catch { /* el usuario canceló */ } return; }
  for (const f of fs) { if (!(await download(f, f.name))) break; }
}
const files = {
  pdf: () => [{ blob: S.kit.pdf, name: `${S.kit.name}_ficha.pdf` }],
  fotos: () => S.kit.seq,
  portada: () => [{ blob: S.kit.portada, name: S.kit.seq[S.kit.seq.length - 1].name }],
  catalogo: () => [{ blob: S.kit.cat, name: `${S.kit.name}_catalogo_whatsapp.jpg` }],
  historia: () => [{ blob: S.kit.his, name: `${S.kit.name}_historia.jpg` }],
};
$('#kit').addEventListener('click', e => {
  const s = e.target.closest('[data-share]'); if (s) return share(files[s.dataset.share](), S.kit.d.title);
  const dl = e.target.closest('[data-dl]'); if (dl) { const [f] = files[dl.dataset.dl](); download(f.blob, f.name); }
});
$('#dlPdf').addEventListener('click', () => download(S.kit.pdf, `${S.kit.name}_ficha.pdf`));
$('#dlZip').addEventListener('click', async () => {
  const K = S.kit, N = K.name;
  const zip = await makeZip([
    { name: `${N}/LEEME.txt`, data: leeme() },
    ...K.seq.map(f => ({ name: `${N}/fotos/${f.name}`, data: f.blob })),
    { name: `${N}/${N}_ficha.pdf`, data: K.pdf },
    { name: `${N}/${N}_historia.jpg`, data: K.his },
    { name: `${N}/${N}_catalogo_whatsapp.jpg`, data: K.cat },
    { name: `${N}/${N}_textos.txt`, data: textosTxt() },
  ]);
  download(zip, `kit_${N}.zip`);
});

// ---------- nueva propiedad ----------
$('#nueva')?.addEventListener('click', async (e) => {
  const b = e.currentTarget; // se confirma tocando dos veces (confirm() no funciona en todas las vistas)
  if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Toca otra vez: se borra la actual'; toast('Se borran datos y fotos de esta propiedad; tu perfil se queda'); setTimeout(() => { delete b.dataset.armed; b.textContent = 'Nueva propiedad'; }, 4000); return; }
  delete b.dataset.armed; b.textContent = 'Nueva propiedad';
  S.prop = { ...PROP0, amenidades: [] }; S.fotos.forEach(f => URL.revokeObjectURL(f.url)); S.fotos = []; S.kit = null; S.bg = S.hi = null;
  try { localStorage.setItem('fp.prop', JSON.stringify(S.prop)); await idb.set('fotos', []); } catch { /* sin almacenamiento */ }
  $$('[name^="prop."]').forEach(el => { const k = el.name.split('.')[1]; if (el.type === 'checkbox') el.checked = !!S.prop[k]; else el.value = S.prop[k] ?? (el.tagName === 'SELECT' ? el.options[0].value : ''); });
  syncOps(); renderAmen(); renderFotos(); $('#kit').hidden = true; $('#generar').textContent = 'Generar mi kit'; go('propiedad');
});

// ---------- inicio ----------
(async function init() {
  bindForm(); renderAmen(); await loadLogo();
  try {
    const saved = await idb.get('fotos');
    if (saved?.length) { for (const f of saved) S.fotos.push(await prepFoto(f.blob, f.cat, f.id)); marcarDuplicados(); renderFotos(); }
  } catch { /* sin fotos guardadas */ }
  go(S.perfil.nombre && S.perfil.telefono ? 'propiedad' : 'perfil');
  if (!EN_CLAUDE && 'serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
