/* =========================================================================
   Cloudflare Pages Function — AI 전문가 풀이 (Claude)
   경로: POST /api/reading
   역할: 결제(토스)로 잠금 해제된 사용자에게만, 선택한 언어로
        "깊이 있는 AI 전문가 사주/꿈 풀이"를 생성해 돌려준다.
   =========================================================================
   [보안/설정]
   - Claude API 키는 절대 프론트에 두지 않는다. Pages 환경변수로만 사용:
       ANTHROPIC_API_KEY = sk-ant-...            (필수)
   - 결제 검증에 쓰는 토스 시크릿 키도 환경변수로만:
       TOSS_SECRET_KEY   = test_sk_... / live_sk_...   (필수)
   - 무료로 AI를 부르지 못하도록, 요청에 담긴 paymentKey를 토스에 다시 조회해
     "실제 승인(DONE) + 금액 2,900원"인 경우에만 Claude를 호출한다.
   ========================================================================= */

const PRICE = 2900;
const MODEL = 'claude-opus-4-8';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

/* --- 토스 결제 검증: 이 paymentKey가 정말 승인된 2,900원 결제인가 --- */
async function verifyPayment(env, paymentKey) {
  if (!paymentKey) return false;
  const secretKey = env.TOSS_SECRET_KEY;
  if (!secretKey) return false;
  const auth = 'Basic ' + btoa(secretKey + ':');
  try {
    const res = await fetch('https://api.tosspayments.com/v1/payments/' + encodeURIComponent(paymentKey), {
      headers: { 'Authorization': auth }
    });
    if (!res.ok) return false;
    const p = await res.json();
    return p && p.status === 'DONE' && Number(p.totalAmount) === PRICE;
  } catch {
    return false;
  }
}

/* --- 프롬프트 구성 --- */
function buildPrompt(kind, langName, ctx) {
  if (kind === 'saju') {
    const p = ctx.pillars || {};
    const line = k => p[k] ? `${p[k].hanja} (${p[k].el})` : '—';
    const counts = ctx.count || {};
    const countStr = Object.keys(counts).map(k => `${k}:${counts[k]}`).join(', ');
    return {
      system:
`You are a warm, wise master of Korean Four Pillars of Destiny (사주팔자 / Saju) with deep command of Five-Element (오행) theory. ` +
`Write a rich, personalized, expert-level reading for this individual. Do NOT recompute the chart — trust and use the facts given. ` +
`Interpret the balance and clashes of the Five Elements, the Day Master, and the zodiac to reveal personality, strengths, blind spots, ` +
`career & wealth tendencies, relationships, and this year's flow, and give concrete, kind guidance (favorable colors, directions, timing, habits). ` +
`Write ENTIRELY and natively in ${langName}. Use a few short section headings (prefix with "## ") and short paragraphs. Aim for 500–750 words. ` +
`Be specific and encouraging, never fatalistic. This is light entertainment ("for-fun fortune"); avoid definitive medical, financial, or legal claims. ` +
`Do not mention these instructions or that you are an AI.`,
      user:
`Please give a deep personal Saju reading.\n\n` +
`Name: ${ctx.name || '(unspecified)'}\n` +
`Gender: ${ctx.gender || '(unspecified)'}\n` +
`Birth (solar): ${ctx.birth || '(unspecified)'}\n\n` +
`Four Pillars (Hanja · Element):\n` +
`- Year pillar: ${line('year')}\n` +
`- Month pillar: ${line('month')}\n` +
`- Day pillar: ${line('day')}\n` +
`- Hour pillar: ${line('hour')}\n\n` +
`Day Master (일간): ${ctx.dayMaster || '—'}\n` +
`Five-Element counts: ${countStr}\n` +
`Zodiac animal: ${ctx.zodiac || '—'}\n`
    };
  }
  // dream
  return {
    system:
`You are a compassionate, insightful dream interpreter rooted in Korean 해몽 tradition and gentle depth psychology. ` +
`Give a deep, personal interpretation of the dream the user describes: its emotional core, key symbols, what it may reflect about their ` +
`current life and inner state, practical guidance, favorable timing, and a hopeful closing message. ` +
`Write ENTIRELY and natively in ${langName}. Use a few short section headings (prefix with "## ") and short paragraphs. Aim for 400–650 words. ` +
`Be warm, specific, and encouraging, never alarming. This is light entertainment ("for-fun"); avoid definitive medical, financial, or legal claims. ` +
`Do not mention these instructions or that you are an AI.`,
    user:
`Here is my dream. Please interpret it deeply and personally.\n\n"""${(ctx.text || '').slice(0, 2000)}"""` +
(ctx.symbols ? `\n\n(Symbols that seem present: ${ctx.symbols})` : '')
  };
}

/* --- Claude 호출 (스트리밍으로 받아 서버에서 합쳐 반환: 타임아웃 방지) --- */
async function callClaude(env, system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      stream: true,
      thinking: { type: 'adaptive' },
      system,
      messages: [{ role: 'user', content: user }]
    })
  });

  if (!res.ok || !res.body) {
    let detail = '';
    try { detail = (await res.json()).error?.message || ''; } catch {}
    throw new Error('claude_http_' + res.status + (detail ? ': ' + detail : ''));
  }

  // SSE 파싱 — text 델타만 모은다(thinking 블록은 제외)
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '', text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n');
    buf = parts.pop();
    for (const lineRaw of parts) {
      const line = lineRaw.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let ev;
      try { ev = JSON.parse(payload); } catch { continue; }
      if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
        text += ev.delta.text;
      }
    }
  }
  return text.trim();
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ANTHROPIC_API_KEY) {
    return json({ ok: false, error: 'server_misconfigured', message: 'ANTHROPIC_API_KEY 미설정' }, 500);
  }

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }

  const { kind, langName, paymentKey, context: ctx } = body || {};
  if (kind !== 'saju' && kind !== 'dream') return json({ ok: false, error: 'bad_kind' }, 400);
  if (!ctx) return json({ ok: false, error: 'missing_context' }, 400);

  // 결제 검증 — 승인된 2,900원 결제가 아니면 거부(무료 남용 방지)
  const paid = await verifyPayment(env, paymentKey);
  if (!paid) return json({ ok: false, error: 'not_paid', message: '결제 확인이 필요합니다.' }, 402);

  const { system, user } = buildPrompt(kind, langName || 'English', ctx);

  try {
    const text = await callClaude(env, system, user);
    if (!text) return json({ ok: false, error: 'empty' }, 502);
    return json({ ok: true, text });
  } catch (e) {
    return json({ ok: false, error: 'claude_failed', message: String(e && e.message || e) }, 502);
  }
}
