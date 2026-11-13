// Convierte lo que capturó el usuario en los datos que usan la ficha, las imágenes y los textos.
export const CATS = [
  ['sala', 'Sala'], ['comedor', 'Comedor'], ['cocina', 'Cocina'], ['recamara', 'Recámara'], ['bano', 'Baño'],
  ['balcon', 'Balcón / vista'], ['amenidad', 'Amenidad (alberca, jardín…)'], ['fachada', 'Fachada / acceso'], ['otro', 'Otra'],
];
export const CAT_ORDER = Object.fromEntries(CATS.map(([k], i) => [k, i]));
export const GRUPOS = {
  exterior: ['amenidad', 'balcon', 'fachada', 'otro'],
  interior: ['sala', 'comedor', 'cocina'],
  privado: ['recamara', 'bano'],
};

export const num = (v) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; };
export const money = (v, cur = 'MXN') => num(v) ? '$' + Math.round(num(v)).toLocaleString('es-MX') : '';
const s = (v) => String(v ?? '').trim();
const plural = (n, a, b) => `${n} ${n == 1 ? a : b}`;

export function slug(t) {
  return s(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'propiedad';
}

export function derive(p, perfil) {
  const tipo = p.tipo || 'Departamento';
  const habitable = !['Terreno', 'Local comercial', 'Oficina', 'Bodega'].includes(tipo);
  const femenino = ['Casa', 'Casa en condominio', 'Oficina', 'Bodega'].includes(tipo);
  const ops = [];
  if (p.renta && num(p.precioRenta)) ops.push('renta');
  if (p.venta && num(p.precioVenta)) ops.push('venta');
  const opTxt = ops.length === 2 ? 'renta y venta' : ops[0] || 'venta';
  const tag = ops.length === 2 ? 'RENTA Y VENTA' : ops[0] === 'renta' ? 'EN RENTA' : 'EN VENTA';
  const eyebrow = `${tipo} en ${opTxt}`;
  const zona = s(p.colonia), ciudad = s(p.ciudad), estado = s(p.estado);
  const location = [zona, ciudad].filter(Boolean).join(', ');
  const address = [s(p.direccion), zona, [ciudad, estado].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  const title = s(p.titulo) || `${tipo} en ${zona || ciudad || opTxt}`;

  let mantTxt = '';
  if (p.mantIncluido) mantTxt = 'Mantenimiento incluido';
  else if (num(p.mant)) mantTxt = `+ ${money(p.mant)} de mantenimiento`;
  const prices = [];
  if (ops.includes('renta')) prices.push({
    kind: 'renta', label: 'Renta mensual', short: 'Renta', price: money(p.precioRenta), cur: p.monedaRenta || 'MXN',
    suffix: ' /mes', sub: mantTxt || 'Mantenimiento a consultar', value: num(p.precioRenta),
  });
  if (ops.includes('venta')) prices.push({
    kind: 'venta', label: 'Precio de venta', short: 'Venta', price: money(p.precioVenta), cur: p.monedaVenta || 'MXN',
    suffix: '', sub: p.libreGravamen ? 'Libre de gravamen' : '', value: num(p.precioVenta),
  });

  // Datos clave (hasta 5) y etiquetas cortas
  const stats = [], chips = [];
  if (num(p.m2)) { stats.push([fmtN(p.m2), 'm² const.']); chips.push(`${fmtN(p.m2)} m²`); }
  else if (num(p.m2terreno)) { stats.push([fmtN(p.m2terreno), 'm² terreno']); chips.push(`${fmtN(p.m2terreno)} m² de terreno`); }
  if (num(p.rec)) { stats.push([fmtN(p.rec), num(p.rec) == 1 ? 'Recámara' : 'Recámaras']); chips.push(`${fmtN(p.rec)} rec`); }
  const banos = num(p.banos) + (num(p.mediosBanos) ? num(p.mediosBanos) / 2 : 0);
  if (banos) { stats.push([fmtN(banos), banos == 1 ? 'Baño' : 'Baños']); chips.push(plural(fmtN(banos), 'baño', 'baños')); }
  if (num(p.estac)) { stats.push([fmtN(p.estac), num(p.estac) == 1 ? 'Estac.' : 'Estacs.']); chips.push(`${fmtN(p.estac)} estac.`); }
  if (num(p.m2) && num(p.m2terreno) && stats.length < 5) stats.push([fmtN(p.m2terreno), 'm² terreno']);
  if (s(p.piso) && stats.length < 5) stats.push([s(p.piso).replace(/\s*piso$/i, ''), /nivel/i.test(p.piso) ? 'Niveles' : 'Piso']);
  if (p.amueblado && stats.length < 5) stats.push([p.amueblado === 'Sin amueblar' ? 'No' : p.amueblado === 'Amueblado' ? 'Sí' : 'Semi', 'Amueblado']);
  const amen = (p.amenidades || []).filter(Boolean);
  if (p.amueblado === 'Amueblado') chips.push('Amueblado');
  for (const a of amen) { if (chips.length >= 5) break; chips.push(a); }
  if (p.mascotas === 'Se aceptan mascotas' && chips.length < 5) chips.push('Pet friendly');

  const facts = [['Tipo', tipo], ['Operación', cap(opTxt)]];
  if (s(p.piso)) facts.push([/nivel/i.test(p.piso) ? 'Niveles' : 'Piso', s(p.piso)]);
  if (s(p.antiguedad)) facts.push(['Antigüedad', s(p.antiguedad)]);
  if (p.amueblado && facts.length < 4) facts.push(['Amueblado', p.amueblado]);
  if (ops.includes('venta') && facts.length < 4) facts.push(['Gravamen', p.libreGravamen ? 'Libre de gravamen' : 'A consultar']);
  if (p.mascotas && facts.length < 4) facts.push(['Mascotas', p.mascotas === 'Se aceptan mascotas' ? 'Sí' : 'No']);

  const description = s(p.descripcion) || autoDescription({ tipo, femenino, opTxt, location, p, amen, banos, habitable });
  const contacto = {
    nombre: s(perfil.nombre) || 'Tu asesor',
    telefono: s(perfil.telefono),
    rol: s(perfil.rol) || 'Asesor inmobiliario',
    empresa: s(perfil.empresa),
  };
  contacto.linea = [contacto.rol, contacto.empresa].filter(Boolean).join(' · ');
  return { tipo, habitable, femenino, ops, opTxt, tag, eyebrow, zona, ciudad, estado, location, address, title, prices,
    stats: stats.slice(0, 5), chips: chips.slice(0, 5), facts: facts.slice(0, 4), amen, banos, description, contacto,
    clave: s(p.clave), mantTxt, p, descAuto: !s(p.descripcion) };
}

function fmtN(v) { const n = num(v); return Number.isInteger(n) ? n.toLocaleString('es-MX') : n.toLocaleString('es-MX', { maximumFractionDigits: 1 }); }
export const cap = (t) => t ? t[0].toUpperCase() + t.slice(1) : t;

function autoDescription({ tipo, femenino, opTxt, location, p, amen, banos, habitable }) {
  const partes = [];
  partes.push(`${tipo} en ${opTxt}${location ? ' en ' + location : ''}.`);
  const car = [];
  if (num(p.m2)) car.push(`${fmtN(p.m2)} m² de construcción`);
  if (num(p.m2terreno)) car.push(`${fmtN(p.m2terreno)} m² de terreno`);
  if (habitable && num(p.rec)) car.push(plural(fmtN(p.rec), 'recámara', 'recámaras'));
  if (banos) car.push(plural(fmtN(banos), 'baño', 'baños'));
  if (num(p.estac)) car.push(plural(fmtN(p.estac), 'estacionamiento', 'estacionamientos'));
  if (car.length) partes.push(`Cuenta con ${lista(car)}.`);
  if (p.amueblado) partes.push(`Se entrega ${p.amueblado.toLowerCase()}.`);
  if (amen.length) partes.push(`Disfruta de ${lista(amen.slice(0, 5).map(a => a.toLowerCase()))}.`);
  if (p.mascotas === 'Se aceptan mascotas') partes.push('Se aceptan mascotas.');
  partes.push('Agenda tu visita.');
  return partes.join(' ');
}
export function lista(a) { return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]; }
