// Textos listos para copiar: Marketplace, catálogo de WhatsApp Business, portales e historia.
import { num, money, lista, cap } from './datos.js';

const CORTO = { Departamento: 'Depa', Casa: 'Casa', 'Casa en condominio': 'Casa', Terreno: 'Terreno', 'Local comercial': 'Local', Oficina: 'Oficina', Bodega: 'Bodega' };
const ABREV = { Departamento: 'Depto.', Casa: 'Casa', 'Casa en condominio': 'Casa', Terreno: 'Terreno', 'Local comercial': 'Local', Oficina: 'Oficina', Bodega: 'Bodega' };
const cut = (t, n) => t.length <= n ? t : t.slice(0, n - 1).replace(/[\s,–-]+\S*$/, '') ;
const curTxt = (p) => p.cur === 'USD' ? ' USD' : '';

function precioLinea(p, emoji = false) {
  const base = `${p.short}: ${p.price}${curTxt(p)}${p.suffix}`;
  if (p.kind === 'renta') return base + (p.sub && p.sub !== 'Mantenimiento a consultar' ? (p.sub.startsWith('+') ? ' ' + p.sub : ` (${p.sub.toLowerCase()})`) : '');
  return base + (p.sub ? ` · ${p.sub.toLowerCase()}` : '');
}

function caracteristicas(d) {
  const p = d.p, r = [];
  if (num(p.m2)) r.push(['📐', `${num(p.m2)} m² de construcción`]);
  if (num(p.m2terreno)) r.push(['🌳', `${num(p.m2terreno)} m² de terreno`]);
  if (num(p.rec)) r.push(['🛏️', `${num(p.rec)} ${num(p.rec) == 1 ? 'recámara' : 'recámaras'}`]);
  if (d.banos) r.push(['🛁', `${d.banos} ${d.banos == 1 ? 'baño' : 'baños'}${num(p.mediosBanos) ? ` (${num(p.banos)} completos y ${num(p.mediosBanos)} medio${num(p.mediosBanos) > 1 ? 's' : ''})` : ''}`]);
  if (num(p.estac)) r.push(['🚗', `${num(p.estac)} ${num(p.estac) == 1 ? 'estacionamiento' : 'estacionamientos'}`]);
  if (p.piso) r.push(['🏢', /piso|nivel/i.test(p.piso) ? p.piso : `Piso ${p.piso}`]);
  if (p.amueblado) r.push(['🛋️', p.amueblado]);
  if (p.mascotas) r.push(['🐾', p.mascotas]);
  if (p.antiguedad) r.push(['📅', `Antigüedad: ${p.antiguedad}`]);
  return r;
}

function cierre(d) {
  const c = d.contacto;
  return `Soy ${c.nombre}, ${c.rol.toLowerCase()}${c.empresa ? ' de ' + c.empresa : ''}${c.telefono ? ': ' + c.telefono : ''}`;
}

export function textos(d) {
  const p = d.p, corto = CORTO[d.tipo] || d.tipo, zona = d.zona || d.ciudad;
  const zonaCiudad = [d.zona, d.ciudad].filter(Boolean).join(' ');
  const recTxt = d.habitable && num(p.rec) ? `${num(p.rec)} rec` : (num(p.m2) ? `${num(p.m2)} m²` : '');
  const car = caracteristicas(d);

  // ---- Marketplace: una publicación por operación (solo admite un precio)
  const marketplace = d.prices.map(pr => {
    const titulo = cut(`${corto} en ${pr.kind} ${recTxt ? recTxt + ', ' : ''}${zonaCiudad} – ${pr.price}${curTxt(pr)}`.replace(/\s+/g, ' '), 100);
    const L = [];
    L.push(`🏡 ${d.tipo} en ${d.opTxt} · ${d.title}`);
    if (d.location || p.direccion) L.push(`📍 ${[p.direccion, d.location].filter(Boolean).join(', ')}`);
    L.push('');
    d.prices.forEach(x => L.push(`💰 ${precioLinea(x)}`));
    if (car.length) { L.push(''); car.forEach(([e, t]) => L.push(`${e} ${t}`)); }
    if (d.amen.length) { L.push(''); L.push(`✨ Amenidades: ${lista(d.amen)}`); }
    L.push(''); L.push(d.description);
    L.push(''); L.push(`📲 ${cierre(d)}`);
    return { op: pr.kind, titulo, precio: `${Math.round(pr.value)}`, cuerpo: L.join('\n') };
  });

  // ---- Catálogo de WhatsApp Business
  const opNombre = d.ops.length === 2 ? 'Renta y venta' : cap(d.ops[0] || 'venta');
  const pr0 = d.prices[0];
  const wa = {
    nombre: cut(`${ABREV[d.tipo] || d.tipo} ${d.title.replace(/^(depa|depto\.?|departamento|casa)\s+/i, '')} – ${opNombre}`, 60),
    precio: pr0 ? `${Math.round(pr0.value)}${pr0.cur === 'USD' ? ' (USD)' : ''}` : '',
    nota: d.prices.length === 2 ? 'Pon el precio de renta en el campo de precio; el de venta va en la descripción.' : '',
    descripcion: [
      [num(p.m2) && `${num(p.m2)} m²`, d.habitable && num(p.rec) && `${num(p.rec)} rec`, d.banos && `${d.banos} baños`, num(p.estac) && `${num(p.estac)} estac.`, p.amueblado].filter(Boolean).join(' · '),
      d.amen.length ? lista(d.amen.slice(0, 4)) + '.' : '',
      d.prices.map(x => precioLinea(x)).join('. ') + '.',
      d.location ? `Ubicación: ${d.location}.` : '',
      `Informes con ${d.contacto.nombre}${d.contacto.empresa ? ', ' + d.contacto.rol.toLowerCase() + ' ' + d.contacto.empresa : ''}${d.contacto.telefono ? ': ' + d.contacto.telefono : ''}`,
    ].filter(Boolean).join('\n'),
    codigo: d.clave,
    enlace: '',
  };

  // ---- Portales (sin emojis, texto formal), un bloque por operación
  const portales = [];
  const tituloPortal = {
    'Mercado Libre': (pr) => `${d.tipo} en ${cap(pr.kind)} ${d.habitable && num(p.rec) ? num(p.rec) + ' Recámaras ' : ''}${zonaCiudad}`,
    'Inmuebles24': (pr) => `${d.tipo} en ${pr.kind} en ${zona}${d.habitable && num(p.rec) ? ', ' + num(p.rec) + ' rec' : ''}${num(p.m2) ? ', ' + num(p.m2) + ' m²' : ''}`,
    'Vivanuncios': (pr) => `${d.tipo}${d.habitable && num(p.rec) ? ' de ' + num(p.rec) + ' rec' : ''} en ${pr.kind} – ${zonaCiudad}`,
  };
  const desc = (pr) => {
    const P = [];
    const intro = `${d.tipo} en ${pr.kind}${d.location ? ' en ' + d.location : ''}.`;
    P.push(d.descAuto ? d.description.replace(/^[^.]*\./, intro) : `${intro} ${d.description}`);
    const c = car.map(([, t]) => t); if (c.length) P.push('Características:\n' + c.map(t => '- ' + t).join('\n'));
    if (d.amen.length) P.push('Amenidades:\n' + d.amen.map(t => '- ' + t).join('\n'));
    P.push('Precio:\n- ' + precioLinea(pr));
    if (d.address) P.push(`Ubicación: ${d.address.replace(/ · /g, ', ')}.`);
    P.push(`Para más información o para agendar una visita, comuníquese con ${d.contacto.nombre}, ${d.contacto.rol.toLowerCase()}${d.contacto.empresa ? ' de ' + d.contacto.empresa : ''}${d.contacto.telefono ? ', al ' + d.contacto.telefono : ''}.`);
    return P.join('\n\n');
  };
  for (const portal of Object.keys(tituloPortal)) for (const pr of d.prices) {
    const datos = [
      ['Operación', cap(pr.kind)], ['Tipo', d.tipo], ['Precio', `${Math.round(pr.value)}`], ['Moneda', pr.cur],
      pr.kind === 'renta' ? ['Mantenimiento', p.mantIncluido ? 'Incluido' : num(p.mant) ? `${Math.round(num(p.mant))}` : 'Confirmar'] : null,
      num(p.m2) ? ['m² construidos', `${num(p.m2)}`] : null, num(p.m2terreno) ? ['m² terreno', `${num(p.m2terreno)}`] : null,
      d.habitable && num(p.rec) ? ['Recámaras', `${num(p.rec)}`] : null, num(p.banos) ? ['Baños', `${num(p.banos)}`] : null,
      num(p.mediosBanos) ? ['Medios baños', `${num(p.mediosBanos)}`] : null, num(p.estac) ? ['Estacionamientos', `${num(p.estac)}`] : null,
      p.antiguedad ? ['Antigüedad', p.antiguedad] : null, d.zona ? ['Colonia / SM', d.zona] : null, d.ciudad ? ['Ciudad', d.ciudad] : null, d.estado ? ['Estado', d.estado] : null,
    ].filter(Boolean);
    portales.push({ portal, op: pr.kind, titulo: cut(tituloPortal[portal](pr).replace(/\s+/g, ' ').trim(), 60), descripcion: desc(pr), datos });
  }

  // ---- Historia
  const historia = `${d.tipo} en ${d.opTxt}${d.location ? ' en ' + d.location : ''} ✨\n${d.prices.map(x => `${x.short} ${x.price}${curTxt(x)}${x.suffix}`).join(' · ')}\nEscríbeme para agendar tu visita${d.contacto.telefono ? ': ' + d.contacto.telefono : ''} 📲`;

  return { marketplace, wa, portales, historia };
}

// Lo que conviene confirmar antes de publicar
export function porConfirmar(d, fotos) {
  const p = d.p, r = [];
  if (d.ops.includes('renta') && !p.mantIncluido && !num(p.mant)) r.push('El mantenimiento: ¿está incluido en la renta o se paga aparte? (aparece "a consultar")');
  if (p.renta && !num(p.precioRenta)) r.push('Marcaste "En renta" pero falta el precio de renta.');
  if (p.venta && !num(p.precioVenta)) r.push('Marcaste "En venta" pero falta el precio de venta.');
  if (!num(p.m2) && !num(p.m2terreno)) r.push('Los m² de la propiedad.');
  if (d.habitable && !num(p.rec)) r.push('El número de recámaras.');
  if (!d.zona && !d.ciudad) r.push('La colonia o zona y la ciudad.');
  if (!String(p.descripcion || '').trim()) r.push('La descripción se armó automáticamente; revísala o escribe la tuya.');
  if (d.ops.includes('venta') && !p.libreGravamen) r.push('Si la propiedad está libre de gravamen.');
  if (fotos.length < 5) r.push(`Solo hay ${fotos.length} foto${fotos.length === 1 ? '' : 's'}; con 8 a 15 el anuncio rinde mucho mejor.`);
  if (fotos.some(f => f.oscura)) r.push('Hay fotos oscuras: si puedes, cámbialas por unas de día.');
  if (fotos.some(f => f.dup != null)) r.push('Hay fotos que parecen repetidas: deja solo una de cada.');
  return r;
}
