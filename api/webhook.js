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

  const reply = `收到: ${text}`;

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
