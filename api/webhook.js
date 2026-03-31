export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body;

  // 飞书验证 challenge
  if (body.challenge) {
    return res.json({ challenge: body.challenge });
  }

  const event = body.event;
  if (!event?.message) {
    return res.json({ ok: true });
  }

  const { chat_id, content, message_type } = event.message;
  if (message_type !== 'text') return res.json({ ok: true });

  const text = JSON.parse(content).text?.trim();

  // 调用 Claude API 回复
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: text }],
    }),
  });

  const data = await response.json();
  const reply = data.content?.[0]?.text ?? '出错了，稍后再试';

  // 发回飞书
  const token = await getToken();
  await fetch('https://open.feishu.cn/open-apis/im/v1/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receive_id: chat_id,
      msg_type: 'text',
      content: JSON.stringify({ text: reply }),
    }),
  });

  res.json({ ok: true });
}

async function getToken() {
  const r = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: process.env.LARK_APP_ID,
      app_secret: process.env.LARK_APP_SECRET,
    }),
  });
  const d = await r.json();
  return d.tenant_access_token;
}
