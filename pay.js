/* =========================================================================
   사주꿈 — 토스페이먼츠 결제 + 프리미엄(상세 풀이) 잠금 + AI 전문가 풀이
   - 결제 2,900원 → 서버(/api/confirm) 승인 → 상세 풀이 해제
   - 해제 후: /api/reading (Claude)로 "깊이 있는 AI 전문가 풀이"를
     사용자가 선택한 언어(50+개)로 생성해 보여준다.
   =========================================================================
   [설정] 아래 TOSS_CLIENT_KEY 를 회원님 토스 "클라이언트 키"로 교체하세요.
          (테스트: test_ck_... / 실결제: live_ck_...)  ※ 시크릿 키는 여기 넣지 말 것!
          AI 풀이용 ANTHROPIC_API_KEY / TOSS_SECRET_KEY 는 서버(환경변수)에만!
   ========================================================================= */
const TOSS_CLIENT_KEY = "test_ck_YOUR_TOSS_CLIENT_KEY"; // ← 교체 필요
const PRICE = 2900;
const CONFIRM_URL = "/api/confirm";
const READING_URL = "/api/reading";

const PAY_I18N = {
  ko: {
    lockTitle: "🔒 프리미엄 상세 풀이",
    sajuDesc: "AI 전문가가 당신의 오행·일간·띠를 종합해 성격·재물·애정·직업·올해의 흐름까지 깊이 있게 풀어드립니다.",
    dreamDesc: "당신이 직접 쓴 꿈을 AI 전문가가 심층 분석 — 감정의 핵심·상징·현재 삶의 메시지·행동 지침까지.",
    buy: "2,900원 결제하고 자세히 보기",
    orderSaju: "사주 상세 풀이", orderDream: "꿈 상세 풀이",
    paid: "✨ 결제 완료 — 상세 풀이",
    needKey: "결제 키(TOSS_CLIENT_KEY)가 아직 설정되지 않았습니다.",
    color: "유리한 색", dir: "유리한 방향", job: "어울리는 계열",
    advice: "맞춤 조언", flow: "올해의 흐름",
    dreamDeep: "심층 의미", dreamAct: "행동 지침", dreamItem: "행운의 아이템",
    aiTitle: "AI 전문가 풀이", aiLoading: "AI 전문가가 당신만을 위한 풀이를 쓰는 중…",
    aiFail: "AI 풀이를 불러오지 못했습니다.", aiRetry: "다시 시도",
    aiNoCtx: "먼저 사주/꿈을 입력해 주세요.",
    aiLang: "선택한 언어로 생성됩니다."
  },
  en: {
    lockTitle: "🔒 Premium Detailed Reading",
    sajuDesc: "An AI master weaves your Five Elements, Day Master and zodiac into a deep reading — personality, wealth, love, career and this year's flow.",
    dreamDesc: "An AI master deeply interprets the dream you wrote — its emotional core, symbols, message for your life now, and guidance.",
    buy: "Unlock for ₩2,900",
    orderSaju: "Saju Detailed Reading", orderDream: "Dream Detailed Reading",
    paid: "✨ Unlocked — Detailed Reading",
    needKey: "Payment key (TOSS_CLIENT_KEY) is not set yet.",
    color: "Lucky color", dir: "Favorable direction", job: "Suited fields",
    advice: "Tailored advice", flow: "This year",
    dreamDeep: "Deep meaning", dreamAct: "Guidance", dreamItem: "Lucky item",
    aiTitle: "AI Expert Reading", aiLoading: "An AI master is writing your personal reading…",
    aiFail: "Couldn't load the AI reading.", aiRetry: "Try again",
    aiNoCtx: "Please enter your Saju/dream first.",
    aiLang: "Generated in your selected language."
  },
  ja: {
    lockTitle: "🔒 プレミアム詳細鑑定",
    sajuDesc: "AIの専門家が五行・日干・干支を総合し、性格・財・恋愛・仕事・今年の流れまで深く鑑定します。",
    dreamDesc: "あなたが書いた夢をAIの専門家が深層分析 — 感情の核・象徴・今の人生へのメッセージ・行動指針まで。",
    buy: "2,900ウォンで詳しく見る",
    orderSaju: "四柱 詳細鑑定", orderDream: "夢 詳細鑑定",
    paid: "✨ 決済完了 — 詳細鑑定",
    needKey: "決済キー(TOSS_CLIENT_KEY)が未設定です。",
    color: "有利な色", dir: "有利な方角", job: "向いている分野",
    advice: "個別の助言", flow: "今年の流れ",
    dreamDeep: "深層の意味", dreamAct: "行動指針", dreamItem: "ラッキーアイテム",
    aiTitle: "AI専門家の鑑定", aiLoading: "AIの専門家があなただけの鑑定を執筆中…",
    aiFail: "AI鑑定を読み込めませんでした。", aiRetry: "もう一度",
    aiNoCtx: "先に四柱／夢を入力してください。",
    aiLang: "選択した言語で生成されます。"
  },
  zh: {
    lockTitle: "🔒 高级详细解读",
    sajuDesc: "AI 大师综合你的五行·日主·生肖，深度解读性格·财运·感情·事业与今年走势。",
    dreamDesc: "AI 大师深度解析你亲手写下的梦 — 情感核心·象征·当下人生的讯息与行动指引。",
    buy: "支付 2,900 韩元查看详情",
    orderSaju: "四柱详细解读", orderDream: "解梦详细解读",
    paid: "✨ 支付完成 — 详细解读",
    needKey: "支付密钥(TOSS_CLIENT_KEY)尚未设置。",
    color: "幸运色", dir: "有利方位", job: "适合领域",
    advice: "定制建议", flow: "今年走势",
    dreamDeep: "深层含义", dreamAct: "行动指引", dreamItem: "幸运物品",
    aiTitle: "AI 专家解读", aiLoading: "AI 大师正在为你撰写专属解读…",
    aiFail: "无法加载 AI 解读。", aiRetry: "重试",
    aiNoCtx: "请先输入你的四柱／梦境。",
    aiLang: "将以你选择的语言生成。"
  }
};

// 오행별 유리 정보(간단 매핑) — 무료 요약 카드용
const EL_LUCK = {
  wood:  { color:{ko:'초록·청록',en:'Green/Teal',ja:'緑・青緑',zh:'绿·青绿'}, dir:{ko:'동쪽',en:'East',ja:'東',zh:'东'}, job:{ko:'교육·기획·출판',en:'Education/Planning',ja:'教育・企画',zh:'教育·策划'} },
  fire:  { color:{ko:'빨강·분홍',en:'Red/Pink',ja:'赤・ピンク',zh:'红·粉'}, dir:{ko:'남쪽',en:'South',ja:'南',zh:'南'}, job:{ko:'방송·예술·IT',en:'Media/Arts/IT',ja:'放送・芸術',zh:'传媒·艺术'} },
  earth: { color:{ko:'노랑·베이지',en:'Yellow/Beige',ja:'黄・ベージュ',zh:'黄·米'}, dir:{ko:'중앙',en:'Center',ja:'中央',zh:'中央'}, job:{ko:'부동산·중개·요식',en:'Realty/Mediation',ja:'不動産・仲介',zh:'房产·中介'} },
  metal: { color:{ko:'흰색·금색',en:'White/Gold',ja:'白・金',zh:'白·金'}, dir:{ko:'서쪽',en:'West',ja:'西',zh:'西'}, job:{ko:'금융·법률·기계',en:'Finance/Law',ja:'金融・法律',zh:'金融·法律'} },
  water: { color:{ko:'검정·파랑',en:'Black/Blue',ja:'黒・青',zh:'黒·蓝'}, dir:{ko:'북쪽',en:'North',ja:'北',zh:'北'}, job:{ko:'무역·유통·연구',en:'Trade/Research',ja:'貿易・研究',zh:'贸易·研究'} }
};

(function () {
  const E = window.SajuEngine, I = window.I18N;
  const selLang = () => localStorage.getItem('sk_lang') || 'ko';       // 선택 언어(AI용)
  const uiLang  = () => I.uiCode(selLang());                            // UI 문구용(ko/en/ja/zh)
  const P = () => PAY_I18N[uiLang()] || PAY_I18N.ko;

  const aiCache = {};     // key -> text
  const inflight = {};    // key -> true

  function isPaid(kind) { return localStorage.getItem('sk_paid_' + kind) === '1'; }
  function makeOrderId(kind) { return 'sk_' + kind + '_' + Date.now() + '_' + Math.floor(Math.random() * 1e6); }

  /* ---------- 간단 마크다운 → HTML (안전) ---------- */
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function mdToHtml(md) {
    const blocks = esc(md).replace(/\r/g,'').split(/\n{2,}/);
    return blocks.map(b => {
      b = b.trim(); if (!b) return '';
      const h = b.match(/^#{1,6}\s+(.*)$/);
      if (h) return `<h5 class="ai-h">${inline(h[1])}</h5>`;
      return `<p>${inline(b).replace(/\n/g,'<br>')}</p>`;
    }).join('');
  }
  function inline(s) {
    return s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*]+?)\*/g, '$1<i>$2</i>');
  }

  /* ---------- 무료 요약 카드 콘텐츠 ---------- */
  function premiumSajuHtml() {
    const raw = localStorage.getItem('sk_last_saju');
    if (!raw) return '';
    const inp = JSON.parse(raw);
    const r = E.computeSaju(inp.y, inp.m, inp.d, inp.hour);
    const lang = uiLang(), pk = P(), pack = I.packs[lang];
    const entries = Object.entries(r.count);
    const lack = entries.filter(([, v]) => v === 0).map(([k]) => k);
    const strong = entries.filter(([, v]) => v === Math.max(...entries.map(e => e[1]))).map(([k]) => k);
    const focus = (lack[0] || strong[0]);
    const L = EL_LUCK[focus];
    return `
      <div class="prem-grid">
        <div class="prem-item"><b>${pk.color}</b><span>${L.color[lang]}</span></div>
        <div class="prem-item"><b>${pk.dir}</b><span>${L.dir[lang]}</span></div>
        <div class="prem-item"><b>${pk.job}</b><span>${L.job[lang]}</span></div>
      </div>`;
  }

  /* ---------- AI 풀이용 컨텍스트 ---------- */
  function sajuContext() {
    const raw = localStorage.getItem('sk_last_saju');
    if (!raw) return null;
    const inp = JSON.parse(raw);
    const r = E.computeSaju(inp.y, inp.m, inp.d, inp.hour);
    const en = I.packs.en;
    const pil = {};
    ['year','month','day','hour'].forEach(k => {
      const p = r.pillars[k];
      if (p) pil[k] = { hanja: E.GAN_H[p.gan] + E.JI_H[p.ji], el: E.GAN_EL[p.gan] + '/' + E.JI_EL[p.ji] };
    });
    return {
      name: inp.name || '',
      gender: inp.genderKey === 'female' ? 'female' : 'male',
      birth: `${inp.y}-${String(inp.m).padStart(2,'0')}-${String(inp.d).padStart(2,'0')}` +
             (inp.hour === null ? ' (time unknown)' : ` ${String(inp.hour).padStart(2,'0')}:00`),
      pillars: pil,
      count: r.count,
      dayMaster: E.GAN_H[r.dayMaster] + ' (' + E.GAN_EL[r.dayMaster] + ')',
      zodiac: en.animals[r.animalIndex]
    };
  }
  function dreamContext() {
    const text = (localStorage.getItem('sk_dream_text') || '').trim();
    const idxRaw = localStorage.getItem('sk_last_dream');
    let symbols = '', fallback = '';
    if (idxRaw != null && I.dreams[idxRaw]) {
      symbols = I.dreams[idxRaw].tag.en || '';
      fallback = (I.dreams[idxRaw].t.en || '') + ': ' + (I.dreams[idxRaw].m.en || '');
    }
    const body = text || fallback;
    if (!body) return null;
    return { text: body, symbols };
  }
  function ctxSig(kind, ctx) {
    if (kind === 'saju') return [ctx.birth, ctx.gender, ctx.dayMaster].join('|');
    return (ctx.text || '').slice(0, 60);
  }

  /* ---------- AI 풀이 렌더 ----------
     비동기 응답은 항상 '현재' DOM 노드에 다시 그린다(카드가 재렌더되어
     노드가 교체돼도 결과가 사라지지 않도록 id로 재조회). */
  function renderAI(kind) {
    const box = document.getElementById('ai-' + kind);
    if (!box) return;
    const pk = P(), lang = selLang();
    const ctx = kind === 'saju' ? sajuContext() : dreamContext();
    const head = `<h4 class="ai-title">🤖 ${pk.aiTitle}</h4>`;
    box.dir = I.isRTL(lang) ? 'rtl' : 'ltr';
    if (!ctx) { box.innerHTML = head + `<p class="ai-note">${pk.aiNoCtx}</p>`; return; }

    const key = kind + '|' + lang + '|' + ctxSig(kind, ctx);
    if (aiCache[key]) { box.innerHTML = head + `<div class="ai-body">${mdToHtml(aiCache[key])}</div>`; return; }

    box.innerHTML = head + `<div class="ai-loading"><span class="ai-spin"></span>${pk.aiLoading}</div>`;
    if (inflight[key]) return;   // 이미 요청 중 — 완료되면 아래 콜백이 현재 노드에 그림
    inflight[key] = true;

    const paint = (inner) => {
      const cur = document.getElementById('ai-' + kind);   // 현재 노드로 재조회
      if (!cur) return;
      cur.dir = I.isRTL(selLang()) ? 'rtl' : 'ltr';
      cur.innerHTML = `<h4 class="ai-title">🤖 ${P().aiTitle}</h4>` + inner;
      const b = cur.querySelector('[data-airetry]');
      if (b) b.addEventListener('click', () => renderAI(kind));
    };

    fetch(READING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind, langName: I.langName(lang), langCode: lang,
        paymentKey: localStorage.getItem('sk_pk_' + kind) || '',
        context: ctx
      })
    })
    .then(r => r.json())
    .then(d => {
      inflight[key] = false;
      if (d && d.ok && d.text) {
        aiCache[key] = d.text;
        paint(`<div class="ai-body">${mdToHtml(d.text)}</div>`);
      } else {
        const msg = (d && d.message) ? esc(d.message) : P().aiFail;
        paint(`<p class="ai-note ai-err">${msg}</p><button class="btn prem-btn" data-airetry="${kind}">${P().aiRetry}</button>`);
      }
    })
    .catch(() => {
      inflight[key] = false;
      paint(`<p class="ai-note ai-err">${P().aiFail}</p><button class="btn prem-btn" data-airetry="${kind}">${P().aiRetry}</button>`);
    });
  }

  /* ---------- 프리미엄 카드 렌더(잠금/해제) ---------- */
  function renderCard(elId, kind) {
    const el = document.getElementById(elId);
    if (!el) return;
    const pk = P();
    if (isPaid(kind)) {
      const quick = kind === 'saju' ? premiumSajuHtml() : '';
      el.className = 'prem-card unlocked';
      el.innerHTML = `<h3>${pk.paid}</h3>${quick}<div class="ai-reading" id="ai-${kind}"></div>`;
      renderAI(kind);
    } else {
      const desc = kind === 'saju' ? pk.sajuDesc : pk.dreamDesc;
      el.className = 'prem-card locked';
      el.innerHTML = `<div class="prem-lock">🔒</div>
        <h3>${pk.lockTitle}</h3>
        <p class="prem-sub">${desc}</p>
        <p class="prem-langnote">🌐 ${pk.aiLang}</p>
        <button class="btn prem-btn" data-pay="${kind}">${pk.buy}</button>`;
      el.querySelector('[data-pay]').addEventListener('click', () => startPayment(kind));
    }
    el.style.display = 'block';
  }

  /* ---------- 결제 시작 ---------- */
  async function startPayment(kind) {
    const pk = P();
    if (!TOSS_CLIENT_KEY || TOSS_CLIENT_KEY.indexOf('YOUR_TOSS') >= 0) { alert(pk.needKey); return; }
    if (typeof TossPayments === 'undefined') { alert('TossPayments SDK 로드 실패'); return; }
    const orderId = makeOrderId(kind);
    localStorage.setItem('sk_order_kind', kind);
    try {
      const tossPayments = TossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: TossPayments.ANONYMOUS });
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: PRICE },
        orderId,
        orderName: kind === 'saju' ? pk.orderSaju : pk.orderDream,
        successUrl: window.location.origin + '/success.html?kind=' + kind,
        failUrl: window.location.origin + '/fail.html',
        card: { flowMode: 'DEFAULT', useEscrow: false, useCardPoint: false, useAppCardOnly: false }
      });
    } catch (e) {
      console.warn('payment cancelled/failed', e);
    }
  }

  // 외부(메인 스크립트/꿈 스크립트)에서 호출할 훅
  window.SajuPay = {
    onSajuComputed(inp) {
      localStorage.setItem('sk_last_saju', JSON.stringify(inp));
      renderCard('s-premium', 'saju');
    },
    onDreamContext(idx) {
      if (idx != null) localStorage.setItem('sk_last_dream', String(idx));
      renderCard('d-premium', 'dream');
    },
    onDreamText(text) {                       // 사용자가 쓴 꿈 텍스트 저장 후 카드 갱신
      if (text) localStorage.setItem('sk_dream_text', text);
      renderCard('d-premium', 'dream');
    },
    refresh() {
      if (localStorage.getItem('sk_last_saju')) renderCard('s-premium', 'saju');
      renderCard('d-premium', 'dream');
    },
    isPaid, startPayment
  };
})();
