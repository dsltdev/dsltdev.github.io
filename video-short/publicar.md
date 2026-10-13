# Publicar: "El webhook que rechazaba cada pago real"

Video: `out/webhook-payouts-short.mp4` (1080×1920, 39 s, 30 fps, con pista de audio en silencio) · Portada: `out/cover.png`.

## Antes de subirlo

- **Agrega audio.** El video es solo texto y gráficos. En TikTok, Reels o Shorts elige un sonido de fondo suave desde la propia app (los de tendencia ayudan al alcance) o graba tu voz leyendo el guion de abajo. Un video con tu voz suele retener mejor y construye marca personal.
- **Revisa que el texto no quede tapado.** Las plataformas cubren la parte baja (botones y descripción). El diseño deja libres los ~420 px inferiores, pero compruébalo en la vista previa de cada app.
- **Es un caso real con datos de ejemplo.** Los ids `po_…` y el `timestamp` son inventados; el mecanismo (dos esquemas de firma, llave equivocada, 401 permanente) es el del artículo del blog. Si alguien pregunta, dilo así.

## Enlaces (con UTM para medir en tu panel / Plausible)

- Artículo: `https://dsltdev.com/blog/webhook-payouts-wompi-firma-invalida?utm_source=short&utm_medium=video&utm_campaign=webhook-payouts`
- Enlace del perfil (oferta): `https://dsltdev.com/?utm_source=short&utm_medium=video&utm_campaign=webhook-payouts`

Usa un `utm_source` distinto por plataforma (`tiktok`, `instagram`, `youtube`, `linkedin`) para saber cuál trae visitas.

## Texto sugerido

**Título (YouTube Shorts):** El webhook que rechazaba cada pago real (y nadie lo notó)

**Descripción corta:**
Un webhook de Wompi Payouts validaba con la llave y el esquema del checkout. Resultado: 401 en cada evento real y transferencias en `pending` para siempre. Lo encontré revisando código. Si tienes pagos en producción, te lo reviso: auditoría de pagos a precio fijo, reporte en 24 h hábiles. Link en mi perfil.

**Comentario fijado:**
Auditoría de pagos, precio fijo $150.000 COP, reporte en 24 h hábiles → dsltdev.com. Caso completo en el blog.

**Hashtags:** #IA #agentesdeIA #fintech #pagos #wompi #colombia #webhooks

## Guion para grabar tu voz (≈ 35 s)

1. "Este webhook rechazó cada pago real. Durante semanas. Y nadie lo notó."
2. "Las transferencias se quedaban en pending. Para siempre, aunque Wompi ya las había aprobado."
3. "No faltaba validación: validaba con la llave equivocada. Checkout y Payouts firman distinto: otro secreto, y el timestamp en otro nivel."
4. "Y respondía 401, justo lo que haría ante un fraude. Por eso nadie lo notó."
5. "El arreglo: un verificador propio para Payouts. Nada elegante."
6. "¿Tu integración de pagos tiene un bug silencioso? Auditoría a precio fijo, 150 mil pesos, reporte en 24 horas hábiles. Link en mi perfil."

## Cómo saber si funcionó

Revisa en tu panel (tarjeta de embudo y visitantes) las visitas con `utm_campaign=webhook-payouts` a los 3, 7 y 14 días. Lo que cuenta no son las vistas del video, sino cuántas personas llegan al sitio y cuántas escriben o pagan.
