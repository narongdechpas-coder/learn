// แทน node:crypto ในเบราว์เซอร์ (ใช้ Web Crypto)
function randomBytes(n) {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(n));
  return {
    toString: () => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''),
  };
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) throw new RangeError('Input buffers must have the same byte length');
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

module.exports = { randomBytes, timingSafeEqual };
