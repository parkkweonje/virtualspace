/* =========================================================================
   Cloudflare Pages Function — 토스페이먼츠 결제 승인(confirm)
   경로: POST /api/confirm
   역할: 프론트에서 받은 paymentKey/orderId/amount를 토스 서버에 확인 요청.
        시크릿 키는 절대 프론트에 두지 않고, Pages 환경변수(TOSS_SECRET_KEY)로만 사용.
   =========================================================================
   [설정 방법]
   Cloudflare Pages 프로젝트 → Settings → Environment variables 에
   TOSS_SECRET_KEY = (토스 시크릿 키, 예: test_sk_... 또는 live_sk_...)
   ========================================================================= */

const PRICE = 2900; // 상품 금액 고정(위변조 방지)

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

// CORS preflight
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const secretKey = env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return json({ ok: false, error: 'server_misconfigured', message: 'TOSS_SECRET_KEY 미설정' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  const { paymentKey, orderId, amount } = body || {};
  if (!paymentKey || !orderId || typeof amount === 'undefined') {
    return json({ ok: false, error: 'missing_params' }, 400);
  }

  // 금액 위변조 방지 — 서버가 아는 가격과 일치해야 함
  if (Number(amount) !== PRICE) {
    return json({ ok: false, error: 'amount_mismatch' }, 400);
  }

  // 토스 결제 승인 API 호출 (Basic 인증: base64("secretKey:"))
  const auth = 'Basic ' + btoa(secretKey + ':');
  const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) })
  });

  const data = await tossRes.json();

  if (!tossRes.ok) {
    // 토스가 실패를 반환(카드 거절, 이미 처리됨 등)
    return json({ ok: false, error: 'toss_failed', code: data.code, message: data.message }, 400);
  }

  // 승인 성공 — 필요한 정보만 프론트로 (paymentKey는 이후 AI 풀이 결제검증에 사용)
  return json({
    ok: true,
    orderId: data.orderId,
    paymentKey: data.paymentKey || paymentKey,
    approvedAt: data.approvedAt,
    method: data.method,
    totalAmount: data.totalAmount,
    receiptUrl: data.receipt ? data.receipt.url : null
  });
}
