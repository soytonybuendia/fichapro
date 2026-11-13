# FichaPro

App web instalable (PWA) para que cualquier asesor o propietario capture su propiedad y obtenga su kit de publicación:

- Ficha PDF tamaño carta (4 páginas, o 2 si hay pocas fotos)
- Fotos numeradas en orden de publicación (01 limpia y ficha resumen al final)
- Ficha resumen para Marketplace, imagen para el catálogo de WhatsApp Business e historia vertical 9:16
- Textos para Facebook Marketplace, WhatsApp Business, Mercado Libre, Inmuebles24 y Vivanuncios
- ZIP con todo y botón "Compartir" para mandarlo directo a WhatsApp, Instagram, etc. desde el teléfono

Todo se genera dentro del teléfono o la computadora del usuario. No hay servidor ni base de datos y nada se sube a internet. Los datos y las fotos se quedan guardados en ese dispositivo.

## Publicarla (gratis)

Son archivos estáticos. Sube la carpeta completa a cualquiera de estos servicios:

- **Netlify Drop**: entra a app.netlify.com/drop y arrastra la carpeta.
- **GitHub Pages**, **Vercel** o **Cloudflare Pages**.

Necesita HTTPS (todos esos servicios lo incluyen) para instalarse y para que funcione sin internet.

## Instalarla en el teléfono

- **iPhone**: abre el link en Safari → Compartir → "Agregar a pantalla de inicio".
- **Android**: abre el link en Chrome → menú ⋮ → "Instalar app".

## Ponerla en App Store y Google Play (siguiente paso)

Se puede empaquetar esta misma app con PWABuilder (pwabuilder.com) o Capacitor. Necesitas una cuenta de Apple Developer (US$99 al año) y una de Google Play Console (US$25, un solo pago).

## Probarla en tu computadora

```bash
python3 -m http.server 8765
```

Después abre http://localhost:8765
