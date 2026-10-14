/**
 * App de pedidos de la pizzería. Todo corre en el cliente: el carrito vive en
 * localStorage y el cobro es una simulación, no hay pasarela detrás.
 */
import {
  pizzas,
  sizes,
  crusts,
  toppings,
  zones,
  coupons,
  payments,
  INC_RATE,
  KITCHEN_MINUTES,
  PICKUP_ADDRESS,
  formatCOP,
  roundToHundred,
  type Coupon,
} from '../data/pizzeria';

interface Line {
  uid: string;
  pizzaId: string;
  sizeId: string;
  crustId: string;
  toppingIds: string[];
  qty: number;
}

interface Totals {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  inc: number;
  total: number;
}

const STORAGE_KEY = 'pz-order-v1';
const MAX_QTY = 20;

const pizzaById = new Map(pizzas.map((p) => [p.id, p]));
const sizeById = new Map(sizes.map((s) => [s.id, s]));
const crustById = new Map(crusts.map((c) => [c.id, c]));
const toppingById = new Map(toppings.map((t) => [t.id, t]));
const zoneById = new Map(zones.map((z) => [z.id, z]));
const paymentById = new Map(payments.map((p) => [p.id, p]));

const clock = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' });

export function mountPizzaApp() {
  const checkout = document.querySelector<HTMLFormElement>('#pz-checkout');
  const configDialog = document.querySelector<HTMLDialogElement>('#pz-config');
  const configForm = document.querySelector<HTMLFormElement>('#pz-cfg-form');
  const ticketDialog = document.querySelector<HTMLDialogElement>('#pz-ticket');
  const linesList = document.querySelector<HTMLUListElement>('#pz-lines');

  if (!checkout || !configDialog || !configForm || !ticketDialog || !linesList) return;

  const el = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!;

  const emptyMsg = el('pz-empty');
  const totalsBox = el('pz-totals');
  const countPill = el('pz-count');
  const confirmBtn = el<HTMLButtonElement>('pz-confirm');
  const errorBox = el('pz-error');
  const etaNote = el('pz-eta-note');
  const deliveryFields = el('pz-delivery-fields');
  const couponInput = el<HTMLInputElement>('pz-coupon');
  const couponMsg = el('pz-coupon-msg');
  const cfgName = el('pz-cfg-name');
  const cfgTagline = el('pz-cfg-tagline');
  const cfgArt = el('pz-cfg-art');
  const cfgQty = el('pz-cfg-qty');
  const cfgPrice = el('pz-cfg-price');

  let lines: Line[] = [];
  let coupon: Coupon | null = null;
  let configPizzaId = pizzas[0].id;
  let configQty = 1;

  /* ---------- Precios ---------- */

  const unitPrice = (spec: Pick<Line, 'pizzaId' | 'sizeId' | 'crustId' | 'toppingIds'>) => {
    const pizza = pizzaById.get(spec.pizzaId);
    const size = sizeById.get(spec.sizeId);
    if (!pizza || !size) return 0;

    const base = roundToHundred(pizza.basePrice * size.multiplier);
    const crustExtra = crustById.get(spec.crustId)?.extra ?? 0;
    const extras = spec.toppingIds.reduce((sum, id) => sum + (toppingById.get(id)?.price ?? 0), 0);

    return base + crustExtra + extras;
  };

  const isDelivery = () => currentMode() === 'domicilio';

  const currentMode = () =>
    (checkout.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value ?? 'domicilio');

  const currentZone = () => zoneById.get(el<HTMLSelectElement>('pz-zone').value) ?? zones[0];

  const currentPayment = () =>
    paymentById.get(
      checkout.querySelector<HTMLInputElement>('input[name="payment"]:checked')?.value ?? ''
    ) ?? payments[0];

  const computeTotals = (): Totals => {
    const subtotal = lines.reduce((sum, line) => sum + unitPrice(line) * line.qty, 0);

    let discount = 0;
    if (coupon && subtotal >= coupon.minSubtotal) {
      if (coupon.percentOff) discount = Math.round(subtotal * coupon.percentOff);
      if (coupon.amountOff) discount = Math.min(coupon.amountOff, subtotal);
    }

    const freeDelivery = Boolean(coupon?.freeDelivery && subtotal >= coupon.minSubtotal);
    const deliveryFee = !isDelivery() || freeDelivery ? 0 : currentZone().fee;
    const inc = Math.round((subtotal - discount) * INC_RATE);

    return { subtotal, discount, deliveryFee, inc, total: subtotal - discount + deliveryFee + inc };
  };

  /* ---------- Persistencia ---------- */

  const save = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ lines, coupon: coupon?.code ?? null })
      );
    } catch {
      /* Modo privado o cuota llena: el pedido sigue en memoria. */
    }
  };

  const restore = (): { lines: Line[]; coupon: Coupon | null } => {
    const empty = { lines: [] as Line[], coupon: null };

    let raw: string | null = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      return empty;
    }
    if (!raw) return empty;

    try {
      const parsed = JSON.parse(raw) as { lines?: unknown; coupon?: unknown };
      const savedCode = typeof parsed.coupon === 'string' ? parsed.coupon : '';

      const restoredLines = Array.isArray(parsed.lines)
        ? parsed.lines.flatMap((entry) => {
            const line = entry as Partial<Line>;
            if (!line.pizzaId || !pizzaById.has(line.pizzaId)) return [];
            if (!line.sizeId || !sizeById.has(line.sizeId)) return [];
            if (!line.crustId || !crustById.has(line.crustId)) return [];

            const qty = Math.min(MAX_QTY, Math.max(1, Math.round(Number(line.qty) || 1)));
            const toppingIds = Array.isArray(line.toppingIds)
              ? line.toppingIds.filter((id): id is string => toppingById.has(id as string))
              : [];

            return [
              {
                uid: line.uid || newUid(),
                pizzaId: line.pizzaId,
                sizeId: line.sizeId,
                crustId: line.crustId,
                toppingIds,
                qty,
              },
            ];
          })
        : [];

      return {
        lines: restoredLines,
        coupon: coupons.find((c) => c.code === savedCode) ?? null,
      };
    } catch {
      return empty;
    }
  };

  const newUid = () => `l${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

  const signature = (line: Pick<Line, 'pizzaId' | 'sizeId' | 'crustId' | 'toppingIds'>) =>
    [line.pizzaId, line.sizeId, line.crustId, [...line.toppingIds].sort().join('+')].join('|');

  /* ---------- Carrito ---------- */

  const describe = (line: Line) => {
    const size = sizeById.get(line.sizeId)!;
    const crust = crustById.get(line.crustId)!;
    const parts = [`${size.name} · ${size.detail}`, `masa ${crust.name.toLowerCase()}`];
    if (line.toppingIds.length) {
      parts.push(`+ ${line.toppingIds.map((id) => toppingById.get(id)!.name).join(', ')}`);
    }
    return parts.join(' · ');
  };

  const renderCart = () => {
    const count = lines.reduce((sum, line) => sum + line.qty, 0);
    countPill.textContent = `${count} ${count === 1 ? 'pizza' : 'pizzas'}`;
    emptyMsg.hidden = count > 0;
    totalsBox.hidden = count === 0;
    confirmBtn.disabled = count === 0;

    linesList.replaceChildren(
      ...lines.map((line) => {
        const pizza = pizzaById.get(line.pizzaId)!;
        const item = document.createElement('li');
        item.className = 'pz-line';
        item.dataset.uid = line.uid;
        item.innerHTML = `
          <div class="pz-line-top">
            <span class="pz-line-name"></span>
            <span class="pz-line-total"></span>
          </div>
          <p class="pz-line-spec"></p>
          <div class="pz-line-actions">
            <div class="pz-qty" role="group">
              <button type="button" class="pz-qty-btn" data-line-step="-1" aria-label="Quitar una">−</button>
              <output class="pz-qty-val"></output>
              <button type="button" class="pz-qty-btn" data-line-step="1" aria-label="Agregar una">+</button>
            </div>
            <button type="button" class="pz-line-remove" data-line-remove>Quitar</button>
          </div>`;

        item.querySelector('.pz-line-name')!.textContent = pizza.name;
        item.querySelector('.pz-line-total')!.textContent = formatCOP(unitPrice(line) * line.qty);
        item.querySelector('.pz-line-spec')!.textContent = describe(line);
        item.querySelector('.pz-qty-val')!.textContent = String(line.qty);

        return item;
      })
    );

    const totals = computeTotals();
    el('pz-subtotal').textContent = formatCOP(totals.subtotal);
    el('pz-inc').textContent = formatCOP(totals.inc);
    el('pz-total').textContent = formatCOP(totals.total);
    el('pz-delivery').textContent =
      !isDelivery() ? 'Recoges en tienda' : totals.deliveryFee === 0 && count > 0 ? 'Gratis' : formatCOP(totals.deliveryFee);

    const discountRow = el('pz-discount-row');
    discountRow.hidden = totals.discount === 0;
    if (totals.discount > 0) {
      el('pz-discount-code').textContent = coupon ? `(${coupon.code})` : '';
      el('pz-discount').textContent = `−${formatCOP(totals.discount)}`;
    }

    renderEta(count);
    save();
  };

  const renderEta = (count: number) => {
    if (count === 0) {
      etaNote.textContent = '';
      return;
    }
    if (!isDelivery()) {
      etaNote.textContent = `Listo para recoger en ~${KITCHEN_MINUTES} min · ${PICKUP_ADDRESS}`;
      return;
    }
    const zone = currentZone();
    etaNote.textContent = `Llega en ${KITCHEN_MINUTES + zone.etaMin}–${KITCHEN_MINUTES + zone.etaMax} min a ${zone.name}`;
  };

  /* ---------- Diálogo de personalización ---------- */

  const configSpec = () => ({
    pizzaId: configPizzaId,
    sizeId: configForm.querySelector<HTMLInputElement>('input[name="size"]:checked')!.value,
    crustId: configForm.querySelector<HTMLInputElement>('input[name="crust"]:checked')!.value,
    toppingIds: [...configForm.querySelectorAll<HTMLInputElement>('input[name="topping"]:checked')].map(
      (input) => input.value
    ),
  });

  const renderConfigPrice = () => {
    cfgQty.textContent = String(configQty);
    cfgPrice.textContent = formatCOP(unitPrice(configSpec()) * configQty);
  };

  const openConfig = (pizzaId: string, card: Element | null) => {
    const pizza = pizzaById.get(pizzaId);
    if (!pizza) return;

    configPizzaId = pizzaId;
    configQty = 1;
    cfgName.textContent = pizza.name;
    cfgTagline.textContent = pizza.tagline;

    const art = card?.querySelector('svg');
    cfgArt.replaceChildren(...(art ? [art.cloneNode(true)] : []));

    configForm.reset();
    renderConfigPrice();
    configDialog.showModal();
  };

  document.querySelectorAll<HTMLButtonElement>('.pz-configure').forEach((button) => {
    button.addEventListener('click', () => {
      openConfig(button.dataset.pizza ?? '', button.closest('.pz-card'));
    });
  });

  configForm.addEventListener('change', renderConfigPrice);

  configForm.addEventListener('click', (event) => {
    const step = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-qty-step]');
    if (!step) return;
    configQty = Math.min(MAX_QTY, Math.max(1, configQty + Number(step.dataset.qtyStep)));
    renderConfigPrice();
  });

  configForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const spec = configSpec();
    const existing = lines.find((line) => signature(line) === signature(spec));

    if (existing) {
      existing.qty = Math.min(MAX_QTY, existing.qty + configQty);
    } else {
      lines.push({ uid: newUid(), ...spec, qty: configQty });
    }

    errorBox.textContent = '';
    renderCart();
    configDialog.close();
  });

  /* ---------- Acciones sobre las líneas ---------- */

  linesList.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const uid = target.closest<HTMLElement>('.pz-line')?.dataset.uid;
    if (!uid) return;

    const index = lines.findIndex((line) => line.uid === uid);
    if (index === -1) return;

    if (target.closest('[data-line-remove]')) {
      lines.splice(index, 1);
    } else {
      const step = target.closest<HTMLButtonElement>('[data-line-step]');
      if (!step) return;
      const next = lines[index].qty + Number(step.dataset.lineStep);
      if (next < 1) lines.splice(index, 1);
      else lines[index].qty = Math.min(MAX_QTY, next);
    }

    renderCart();
  });

  /* ---------- Cupones ---------- */

  const applyCoupon = () => {
    const code = couponInput.value.trim().toUpperCase();
    couponMsg.classList.remove('is-ok', 'is-bad');

    if (!code) {
      coupon = null;
      couponMsg.textContent = '';
      renderCart();
      return;
    }

    const found = coupons.find((c) => c.code === code);
    if (!found) {
      coupon = null;
      couponMsg.textContent = `El cupón ${code} no existe.`;
      couponMsg.classList.add('is-bad');
      renderCart();
      return;
    }

    coupon = found;
    const { subtotal } = computeTotals();
    if (subtotal < found.minSubtotal) {
      couponMsg.textContent = `${found.code} aplica desde ${formatCOP(found.minSubtotal)} en pizzas. Te faltan ${formatCOP(found.minSubtotal - subtotal)}.`;
      couponMsg.classList.add('is-bad');
    } else {
      couponMsg.textContent = `${found.code} aplicado: ${found.label}.`;
      couponMsg.classList.add('is-ok');
    }
    renderCart();
  };

  el<HTMLButtonElement>('pz-coupon-apply').addEventListener('click', applyCoupon);

  couponInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyCoupon();
    }
  });

  // Editar el campo después de aplicar dejaría el código a la vista peleado
  // con el descuento ya cobrado, así que el cupón se cae al primer cambio.
  couponInput.addEventListener('input', () => {
    if (!coupon || couponInput.value.trim().toUpperCase() === coupon.code) return;
    coupon = null;
    couponMsg.textContent = '';
    couponMsg.classList.remove('is-ok', 'is-bad');
    renderCart();
  });

  /* ---------- Checkout ---------- */

  checkout.addEventListener('change', () => {
    deliveryFields.hidden = !isDelivery();
    renderCart();
  });

  checkout.addEventListener('submit', (event) => event.preventDefault());

  const setFieldError = (name: string, message: string) => {
    const slot = checkout.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (slot) slot.textContent = message;
    checkout.querySelector(`[name="${name}"]`)?.closest('.pz-field')?.classList.toggle('is-invalid', Boolean(message));
  };

  const validate = () => {
    const name = el<HTMLInputElement>('pz-name').value.trim();
    const phone = el<HTMLInputElement>('pz-phone').value.replace(/\D/g, '');
    const address = el<HTMLInputElement>('pz-address').value.trim();

    setFieldError('name', name.length >= 3 ? '' : 'Escribe el nombre de quien recibe.');
    setFieldError('phone', /^3\d{9}$/.test(phone) ? '' : 'Celular de 10 dígitos que empiece por 3.');
    setFieldError('address', !isDelivery() || address.length >= 8 ? '' : 'Dirección completa, con barrio o número de apto.');

    const invalid = checkout.querySelectorAll('.pz-field.is-invalid').length > 0;
    return invalid ? null : { name, phone, address };
  };

  const paymentLine = (paymentId: string, total: number) => {
    if (paymentId === 'efectivo') return `Pago contra entrega · ten listos ${formatCOP(total)}`;
    if (paymentId === 'nequi') return 'Push enviado a Nequi · aprobado (simulado)';
    return 'Pago aprobado · tarjeta ···· 4242 (simulado)';
  };

  const showTicket = (customer: { name: string; phone: string; address: string }, totals: Totals) => {
    const mode = currentMode();
    const zone = currentZone();
    const payment = currentPayment();
    const notes = el<HTMLTextAreaElement>('pz-notes').value.trim();

    el('pz-ticket-id').textContent = `PZ-${Math.floor(1000 + Math.random() * 9000)}`;

    const minOffset = KITCHEN_MINUTES + (mode === 'domicilio' ? zone.etaMin : 0);
    const maxOffset = KITCHEN_MINUTES + (mode === 'domicilio' ? zone.etaMax : 10);
    const from = clock.format(new Date(Date.now() + minOffset * 60_000));
    const to = clock.format(new Date(Date.now() + maxOffset * 60_000));

    el('pz-ticket-eta').textContent =
      mode === 'domicilio'
        ? `Entre ${from} y ${to} en ${customer.address} · ${zone.name}. Avisamos al ${customer.phone}.`
        : `Listo entre ${from} y ${to} para recoger en ${PICKUP_ADDRESS}. Avisamos al ${customer.phone}.`;

    const ticketLines = el<HTMLUListElement>('pz-ticket-lines');
    ticketLines.replaceChildren(
      ...lines.map((line) => {
        const item = document.createElement('li');
        const label = document.createElement('span');
        const value = document.createElement('span');
        label.textContent = `${line.qty}× ${pizzaById.get(line.pizzaId)!.name} · ${sizeById.get(line.sizeId)!.name}`;
        value.textContent = formatCOP(unitPrice(line) * line.qty);
        item.append(label, value);
        return item;
      })
    );

    if (notes) {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = `Nota: ${notes}`;
      item.append(label);
      ticketLines.append(item);
    }

    const rows: [string, string][] = [
      ['Subtotal', formatCOP(totals.subtotal)],
      ...(totals.discount > 0
        ? ([[`Descuento ${coupon?.code ?? ''}`, `−${formatCOP(totals.discount)}`]] as [string, string][])
        : []),
      ['Domicilio', mode === 'domicilio' ? formatCOP(totals.deliveryFee) : 'Recoges en tienda'],
      ['Impuesto al consumo 8%', formatCOP(totals.inc)],
    ];

    const ticketTotals = el('pz-ticket-totals');
    ticketTotals.replaceChildren(
      ...rows.map(([label, value]) => {
        const row = document.createElement('div');
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = label;
        dd.textContent = value;
        row.append(dt, dd);
        return row;
      })
    );

    const finalRow = document.createElement('div');
    finalRow.className = 'pz-totals-final';
    const finalDt = document.createElement('dt');
    const finalDd = document.createElement('dd');
    finalDt.textContent = 'Total';
    finalDd.textContent = formatCOP(totals.total);
    finalRow.append(finalDt, finalDd);
    ticketTotals.append(finalRow);

    el('pz-ticket-pay').textContent = `${payment.name} · ${paymentLine(payment.id, totals.total)}`;

    ticketDialog.showModal();
  };

  confirmBtn.addEventListener('click', () => {
    if (lines.length === 0) return;

    const customer = validate();
    if (!customer) {
      errorBox.textContent = 'Faltan datos de entrega. Revisa el paso 2.';
      document.querySelector('#pz-step-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    errorBox.textContent = '';
    const totals = computeTotals();
    const label = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Procesando pago…';

    window.setTimeout(() => {
      showTicket(customer, totals);
      confirmBtn.textContent = label;
      lines = [];
      coupon = null;
      couponInput.value = '';
      couponMsg.textContent = '';
      couponMsg.classList.remove('is-ok', 'is-bad');
      renderCart();
    }, 1100);
  });

  /* ---------- Arranque ---------- */

  const restored = restore();
  lines = restored.lines;
  coupon = restored.coupon;
  couponInput.value = restored.coupon?.code ?? '';
  deliveryFields.hidden = !isDelivery();
  renderCart();
}
