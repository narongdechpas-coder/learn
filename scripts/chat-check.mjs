// Checks the chatbot Netlify function without calling the real API: request checks, the call it makes, errors.
import assert from 'node:assert/strict';

const mod = await import('../netlify/functions/chat.mjs');
const handler = mod.default;
const post = (body, ip = '1.1.1.1') => new Request('http://x/api/chat', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'x-nf-client-connection-ip': ip } });
const ok = { messages: [{ role: 'user', content: 'PA ราคาเท่าไร' }], knowledge: 'PA 300,000 ขั้น 1 1,590 บาท', lang: 'th' };

delete process.env.ANTHROPIC_API_KEY;
assert.equal((await handler(post(ok))).status, 503, 'no key: not configured');
process.env.ANTHROPIC_API_KEY = ' "test-key"\n';
assert.equal((await handler(new Request('http://x/api/chat'))).status, 405, 'GET refused');
assert.equal((await handler(post('{bad'))).status, 400, 'bad JSON');
assert.equal((await handler(post({ ...ok, messages: [{ role: 'assistant', content: 'hi' }] }))).status, 400, 'must start with the user');
assert.equal((await handler(post({ ...ok, messages: [{ role: 'user', content: 'x'.repeat(1001) }] }))).status, 400, 'message too long');
assert.equal((await handler(post({ ...ok, knowledge: '' }))).status, 400, 'knowledge required');
assert.equal((await handler(post({ ...ok, messages: Array.from({ length: 21 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'q' })) }))).status, 400, 'too many turns');

let sent;
globalThis.fetch = async (url, init) => {
  sent = { url, init, body: JSON.parse(init.body) };
  return new Response(JSON.stringify({ content: [{ type: 'text', text: 'PA 300,000 ขั้น 1 ราคา 1,590 บาทต่อปีครับ' }] }), { status: 200 });
};
const res = await handler(post(ok));
assert.equal(res.status, 200);
assert.equal((await res.json()).text, 'PA 300,000 ขั้น 1 ราคา 1,590 บาทต่อปีครับ');
assert.equal(sent.url, 'https://api.anthropic.com/v1/messages');
assert.equal(sent.init.headers['x-api-key'], 'test-key');
assert.equal(sent.body.model, 'claude-haiku-5-5', 'default model');
assert.equal(sent.body.max_tokens, 2000, 'room for a whole Thai answer');
assert.deepEqual(sent.body.messages, ok.messages);
assert.match(sent.body.system[0].text, /น้องแจ็คกี้/);
assert.match(sent.body.system[1].text, /<knowledge>[\s\S]*PA 300,000/);
assert.deepEqual(sent.body.system[1].cache_control, { type: 'ephemeral' }, 'knowledge cached');
process.env.CHAT_MODEL = 'claude-sonnet-5-5';
await handler(post({ ...ok, lang: 'en' }, '2.2.2.2'));
assert.equal(sent.body.model, 'claude-sonnet-5-5', 'CHAT_MODEL overrides the model');
assert.match(sent.body.system[0].text, /Reply in English/);

globalThis.fetch = async () => new Response(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }), { status: 401 });
const bad = await handler(post(ok, '3.3.3.3'));
assert.equal(bad.status, 502, 'API error passed on as 502');
assert.deepEqual(await bad.json(), { error: 'upstream', status: 401, type: 'authentication_error', detail: 'invalid x-api-key' }, 'with the reason');
globalThis.fetch = async () => { throw new Error('offline'); };
assert.equal((await (await handler(post(ok, '4.4.4.4'))).json()).detail, 'network');

globalThis.fetch = async () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }] }), { status: 200 });
globalThis.fetch = async () => new Response(JSON.stringify({ stop_reason: 'max_tokens', content: [{ type: 'text', text: 'ยาว' }] }), { status: 200 });
assert.equal((await (await handler(post(ok, '5.5.5.5'))).json()).truncated, true, 'cut-off answers are flagged');
globalThis.fetch = async () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }] }), { status: 200 });
let last;
for (let i = 0; i < 31; i++) last = await handler(post(ok, '9.9.9.9'));
assert.equal(last.status, 429, 'rate limited per visitor');
console.log('Chat function checks passed');
