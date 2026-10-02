/* ABI Mobile App — เชื่อมต่อ API ของระบบ (เช็คเบี้ย / สั่งซื้อ / ชำระเงิน / กรมธรรม์ PDF) */
(function () {
  async function call(path, { method = 'GET', body, token } = {}) {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-order-token': token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่'), { status: res.status, data });
    return data;
  }

  let optionsPromise = null;

  window.ABI_API = {
    options: () => (optionsPromise ||= call('/api/options')),
    createQuote: (form) => call('/api/quotes', { method: 'POST', body: form }),
    createOrder: (body) => call('/api/orders', { method: 'POST', body }),
    getOrder: (order) => call(`/api/orders/${order.id}`, { token: order.accessToken }),
    pay: (order, body) => call(`/api/orders/${order.id}/pay`, { method: 'POST', token: order.accessToken, body }),
    // ของจริง: เบราว์เซอร์ส่งข้อมูลบัตรไป tokenize ที่ payment gateway โดยตรง (เลขบัตรไม่ผ่านเซิร์ฟเวอร์เรา)
    tokenizeCard: (card) => call('/mock-gateway/tokens', { method: 'POST', body: card }),
    simulatePromptPayPaid: (chargeId) => call(`/mock-gateway/charges/${chargeId}/simulate-paid`, { method: 'POST' }),
    policyUrl: (order, download) =>
      `/api/orders/${order.id}/policy.pdf?token=${encodeURIComponent(order.accessToken)}${download ? '&download=1' : ''}`,
  };

  // ดาวน์โหลดกรมธรรม์ — เวอร์ชันไฟล์เดียว (offline) จะแทนที่ฟังก์ชันนี้ด้วยการสร้าง PDF ในเบราว์เซอร์
  window.ABI_downloadPolicy = window.ABI_downloadPolicy || (async (order) => {
    const a = Object.assign(document.createElement('a'), { href: window.ABI_API.policyUrl(order, true) });
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
})();
