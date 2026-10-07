# Copy de distribución — oferta de auditoría

Todo listo para copiar y pegar. Enlaza siempre al post real:
`https://dsltdev.com/blog/webhook-payouts-wompi-firma-invalida` (el CTA del
post ya manda a `/#offer`).

---

## LinkedIn (el mejor canal de los 3 — red propia, en español, storytelling personal)

**Post:**

```
Un webhook de Wompi Payouts llevaba semanas rechazando cada confirmación
real de pago — en silencio, sin ningún error visible.

No era un bug ruidoso. El endpoint respondía 401 "firma inválida", que es
EXACTAMENTE lo que tiene que responder ante una firma real inválida. Nada
gritaba que estuviera roto. Solo un archivo lento de transferencias que
nunca se confirmaban solas.

La causa: Wompi firma los webhooks de Payouts con un secreto distinto al
del checkout normal, y manda el timestamp en un lugar distinto del
payload. El código reusaba la función de verificación del checkout —
firma equivocada, forma equivocada. Estaba matemáticamente destinado a
fallar siempre, no era intermitente.

Esto es exactamente el tipo de cosa que reviso cuando audito una
integración de pagos: no busco que "funcione en el happy path", busco los
webhooks que nadie probó de punta a punta con una transacción real.

Si tenés Wompi, Bancolombia, o cualquier pasarela en producción y nunca
tuviste un segundo par de ojos ahí — el caso completo, con la causa real
y el fix, está en el blog. Y si querés que revise la tuya, la oferta está
al final del post.

https://dsltdev.com/blog/webhook-payouts-wompi-firma-invalida

#fintech #pagos #wompi #webhooks #seguridad
```

**Cuándo postear:** martes a jueves, 8-10am hora Colombia (mejor alcance
orgánico en LinkedIn para audiencia profesional local).

---

## Reddit

### Opción A — comunidad en español (más alineada con el público real: founders/devs LATAM con Wompi/Bancolombia)

Subs a considerar: r/devsarg, r/CODEHS, r/colombia (con moderación estricta
de autopromoción, revisar reglas antes), r/programacion.

**Título:**
```
Encontré un webhook de Wompi que rechazaba el 100% de los payouts reales — nunca se notó porque el error "correcto" y el bug se ven idénticos
```

**Cuerpo:**
```
Contexto rápido: reviso integraciones de pago en producción (Wompi,
Bancolombia) y me encontré este caso hace unos días.

Un webhook de Wompi Payouts (confirma transferencias salientes) estaba
verificando la firma con el secreto y el formato del checkout normal —
pero Payouts usa un secreto distinto y pone el timestamp en otro lugar
del payload. Resultado: el checksum nunca coincidía, cada confirmación
real caía en 401 "firma inválida".

Lo que lo hace peligroso no es el bug en sí, es que el síntoma es
indistinguible del comportamiento correcto: un 401 ante una firma
inválida real ES lo que tiene que pasar. No hay ningún log que diga
"esto está roto", solo transferencias que nunca se actualizan solas.

Escribí el caso completo (causa real, por qué el síntoma engaña, el fix)
acá: https://dsltdev.com/blog/webhook-payouts-wompi-firma-invalida

Si alguien anda con integraciones de Wompi/Bancolombia en producción y
quiere que le revise la suya, al final del post hay cómo. Si no, espero
que el caso sirva igual — la lección real es "no asumas que el esquema
de firma de un webhook es el mismo que el de otro endpoint del mismo
proveedor", y eso aplica más allá de Wompi.
```

### Opción B — r/webdev o r/programming (inglés, audiencia general de dev)

**Título:**
```
Found a webhook that silently rejected every real payment confirmation — the bug and the "correct" behavior look identical
```

**Cuerpo:** (traducción directa del texto de arriba, mismo contenido, sin
inventar nada nuevo — no lo escribo dos veces acá, es el mismo caso.)

---

## Hacker News

**Salvedad honesta antes de postear esto:** el post está en español, y el
público real de la oferta (founders/devs colombianos con Wompi/Bancolombia)
casi no se cruza con la audiencia de HN. Probablemente el mejor uso de HN
acá es "practicar la distribución", no la fuente más probable de una venta
real — LinkedIn y Reddit en español están mucho más cerca del comprador
real.

**Si de todos modos lo posteás:**

Submitir como "Show HN" no aplica bien acá (no es un producto/side-project,
es un post técnico) — mejor un submit normal del link, título neutral,
sin intentar venderlo en el título mismo (la cultura de HN penaliza eso):

**Título sugerido:**
```
A webhook that rejected every real payout, and looked correct doing it
```

Dejá que la discusión pase en los comentarios — si alguien pregunta "¿y
esto quién lo escribió/qué hacés?", ahí es natural mencionar la oferta,
no en el post mismo.

---

## Pendiente, tu decisión

- Traducir el post del blog al inglés — lo necesitás de verdad solo si
  vas en serio con HN/r/webdev. Para LinkedIn y Reddit en español no
  hace falta.
- Confirmar si tenés acceso/karma en las subs que sugerí (algunas piden
  cuenta con antigüedad para postear sin que lo filtre el automod).
