const state = {
  quote: null,
  planCode: null,
  order: null,
  accessToken: null,
  method: 'card',
  pollTimer: null,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const baht = (satang) => (satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n) => n.toLocaleString('th-TH');

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of [].concat(children)) node.append(c);
  return node;
}

function showError(msg) {
  const box = $('#error');
  box.textContent = msg || '';
  box.hidden = !msg;
  if (msg) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function goTo(step) {
  showError('');
  $$('[data-panel]').forEach((p) => (p.hidden = Number(p.dataset.panel) !== step));
  $$('#steps li').forEach((li) => {
    const s = Number(li.dataset.step);
    li.classList.toggle('active', s === step);
    li.classList.toggle('done', s < step);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'เกิดข้อผิดพลาด'), { data });
  return data;
}

const orderHeaders = () => ({ 'x-order-token': state.accessToken });

function withBusy(btn, fn) {
  return async (...args) => {
    btn.disabled = true;
    try {
      await fn(...args);
    } catch (err) {
      showError(err.message);
    } finally {
      btn.disabled = false;
    }
  };
}

// ---------- ขั้นที่ 1: เช็คเบี้ย ----------
async function loadOptions() {
  const opts = await api('/api/options');
  const fill = (id, items) => $(id).replaceChildren(...items.map((o) => el('option', { value: o.value, textContent: o.label })));
  fill('#vehicleType', opts.vehicleTypes);
  fill('#region', opts.regions);
  fill('#garage', opts.garages);
  fill('#deductible', opts.deductibles.map((d) => ({ value: d, label: d ? `${num(d)} บาท` : 'ไม่มี' })));
  $('#quoteForm').carYear.value = new Date().getFullYear() - 2;
}

$('#quoteForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = e.submitter;
  withBusy(btn, async () => {
    const body = Object.fromEntries(new FormData(e.target));
    state.quote = await api('/api/quotes', { method: 'POST', body });
    state.quote.input = body;
    renderPlans();
    goTo(2);
  })();
});

// ---------- ขั้นที่ 2: เลือกแผน ----------
function renderPlans() {
  const { plans, cmi, input } = state.quote;
  state.planCode = null;
  $('#toHolder').disabled = true;
  $('#carSummary').textContent = `${input.carBrand} ${input.carModel} ปี ${input.carYear} · ราคาเบี้ยรวมภาษีและอากรแล้ว`;
  $('#cmiPrice').textContent = baht(cmi.total);
  $('#plans').replaceChildren(
    ...plans.map((p) => {
      const top = p.coverage.slice(0, 3).map((c) => el('li', { textContent: `${c.label}: ${num(c.amount)}` }));
      const card = el('button', { type: 'button', className: 'plan' }, [
        el('span', { className: 'name', textContent: p.name }),
        el('span', { className: 'price', textContent: `฿${baht(p.premium.total)}` }),
        el('span', { className: 'muted', textContent: p.sumInsured ? `ทุนประกัน ${num(p.sumInsured)} บาท` : 'คุ้มครองคู่กรณีเท่านั้น' }),
        el('ul', {}, top),
      ]);
      card.addEventListener('click', () => {
        state.planCode = p.code;
        $$('.plan').forEach((x) => x.classList.toggle('selected', x === card));
        $('#toHolder').disabled = false;
      });
      return card;
    }),
  );
}

$('#toHolder').addEventListener('click', () => {
  renderSummary();
  const start = $('#holderForm').startDate;
  const today = new Date().toISOString().slice(0, 10);
  start.min = today;
  if (!start.value) start.value = today;
  goTo(3);
});

function selectedPlan() {
  return state.quote.plans.find((p) => p.code === state.planCode);
}

function renderSummary() {
  const p = selectedPlan();
  const cmi = $('#includeCmi').checked ? state.quote.cmi : null;
  const rows = [
    [`${p.name} (เบี้ยสุทธิ)`, p.premium.net],
    ['อากรแสตมป์', p.premium.stamp],
    ['ภาษีมูลค่าเพิ่ม 7%', p.premium.vat],
  ];
  if (cmi) rows.push(['พ.ร.บ. (รวมภาษีอากร)', cmi.total]);
  const total = p.premium.total + (cmi ? cmi.total : 0);
  const tr = ([label, v], cls = '') =>
    el('tr', { className: cls }, [el('td', { textContent: label }), el('td', { textContent: `${baht(v)} บาท` })]);
  $('#orderSummary').replaceChildren(el('table', {}, [...rows.map((r) => tr(r)), tr(['ยอดชำระทั้งสิ้น', total], 'total')]));
}

// ---------- ขั้นที่ 3: ข้อมูลผู้เอาประกัน ----------
$('#holderForm').addEventListener('submit', (e) => {
  e.preventDefault();
  withBusy(e.submitter, async () => {
    const f = Object.fromEntries(new FormData(e.target));
    const order = await api('/api/orders', {
      method: 'POST',
      body: {
        quoteId: state.quote.quoteId,
        planCode: state.planCode,
        includeCmi: $('#includeCmi').checked,
        startDate: f.startDate,
        holder: {
          title: f.title, firstName: f.firstName, lastName: f.lastName,
          idCard: f.idCard, phone: f.phone, email: f.email, address: f.address,
        },
        vehicle: { plate: f.plate, plateProvince: f.plateProvince, chassisNo: f.chassisNo },
      },
    });
    state.order = order;
    state.accessToken = order.accessToken;
    $('#payAmount').textContent = baht(order.amount);
    resetQr();
    goTo(4);
  })();
});

// ---------- ขั้นที่ 4: ชำระเงิน ----------
$$('.tab').forEach((tab) =>
  tab.addEventListener('click', () => {
    state.method = tab.dataset.method;
    $$('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    $$('[data-method-panel]').forEach((p) => (p.hidden = p.dataset.methodPanel !== state.method));
  }),
);

$('#cardForm').addEventListener('submit', (e) => {
  e.preventDefault();
  withBusy(e.submitter, async () => {
    // ขั้นที่ 1: tokenize ข้อมูลบัตรกับ gateway (ของจริงคือ Omise.js / 2C2P SDK) — เลขบัตรไม่ผ่านเซิร์ฟเวอร์เรา
    const card = Object.fromEntries(new FormData(e.target));
    const token = await api('/mock-gateway/tokens', { method: 'POST', body: card });
    // ขั้นที่ 2: ส่งแค่ token ไปให้เซิร์ฟเวอร์เราตัดเงิน
    const { order } = await api(`/api/orders/${state.order.id}/pay`, {
      method: 'POST',
      headers: orderHeaders(),
      body: { method: 'card', cardToken: token.id },
    });
    e.target.reset();
    onPaid(order);
  })();
});

function resetQr() {
  clearInterval(state.pollTimer);
  $('#qrImage').hidden = true;
  $('#simulatePaid').hidden = true;
  $('#qrStatus').textContent = '';
  $('#createQr').hidden = false;
}

$('#createQr').addEventListener('click', (e) =>
  withBusy(e.currentTarget, async () => {
    const { charge } = await api(`/api/orders/${state.order.id}/pay`, {
      method: 'POST',
      headers: orderHeaders(),
      body: { method: 'promptpay' },
    });
    state.chargeId = charge.id;
    $('#qrImage').src = charge.qrImage;
    $('#qrImage').hidden = false;
    $('#createQr').hidden = true;
    $('#simulatePaid').hidden = false;
    const exp = new Date(charge.expiresAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    $('#qrStatus').textContent = `สแกนด้วยแอปธนาคารเพื่อชำระเงิน (QR หมดอายุเวลา ${exp} น.) — กำลังรอการชำระเงิน…`;
    clearInterval(state.pollTimer);
    state.pollTimer = setInterval(pollOrder, 2000);
  })(),
);

async function pollOrder() {
  try {
    const order = await api(`/api/orders/${state.order.id}`, { headers: orderHeaders() });
    if (order.status === 'paid') onPaid(order);
    else if (order.lastError) {
      clearInterval(state.pollTimer);
      resetQr();
      showError(order.lastError);
    }
  } catch {
    /* ลองใหม่รอบถัดไป */
  }
}

$('#simulatePaid').addEventListener('click', (e) =>
  withBusy(e.currentTarget, async () => {
    await api(`/mock-gateway/charges/${state.chargeId}/simulate-paid`, { method: 'POST' });
    await pollOrder();
  })(),
);

// ---------- ขั้นที่ 5: รับกรมธรรม์ ----------
function onPaid(order) {
  clearInterval(state.pollTimer);
  state.order = order;
  const url = `/api/orders/${order.id}/policy.pdf?token=${encodeURIComponent(state.accessToken)}`;
  $('#policyNumber').textContent = order.policyNumber;
  $('#viewPdf').href = url;
  $('#downloadPdf').href = `${url}&download=1`;
  goTo(5);
}

$('#restart').addEventListener('click', () => {
  Object.assign(state, { quote: null, planCode: null, order: null, accessToken: null });
  $('#holderForm').reset();
  $('#includeCmi').checked = false;
  goTo(1);
});

$('#includeCmi').addEventListener('change', () => state.planCode && renderSummary());
$$('[data-go]').forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.go))));

loadOptions().catch((err) => showError(err.message));
goTo(1);
