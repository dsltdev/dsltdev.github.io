# payouts-webhook (fixture)

Servicio mínimo que recibe webhooks de un proveedor de pagos:

- `POST /webhooks/checkout` confirma pagos entrantes.
- `POST /webhooks/payouts` confirma transferencias salientes.

Reconstrucción sintética del patrón de un caso real, sin código ni datos de
ningún cliente. Sirve de material para el replay del agente auditor en `/lab/agente`.
