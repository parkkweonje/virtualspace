/* =========================================================================
   사주꿈 — 내 꿈 자유서술 풀이 + 꿈 연계 로또번호(6/45) 자동추첨
   순수 클라이언트. 입력한 꿈 텍스트에서 상징 키워드를 찾아 풀이를 조합하고,
   그 텍스트를 시드로 행운의 번호를 뽑는다. (재미로 보는 콘텐츠)
   ========================================================================= */
const DREAM_TELL_I18N = {
  ko: {
    h2:'🌙 내 꿈 풀이 + 로또번호', sub:'꿈 내용을 자유롭게 적으면 풀이와 행운의 로또번호를 뽑아드립니다.',
    ph:'예: 커다란 돼지가 집으로 들어와 품에 안겼어요',
    run:'🔮 꿈 풀이 + 로또번호 뽑기', lottoTitle:'🍀 꿈이 뽑은 행운의 번호', redraw:'다시 뽑기',
    empty:'꿈 내용을 입력해 주세요.',
    found:'당신의 꿈에서 이런 상징이 보입니다', synth:'종합하면',
    synthTail:'의 기운이 함께 흐릅니다. 좋은 흐름을 놓치지 마세요.',
    none:'뚜렷한 상징은 찾지 못했지만, 낯선 꿈은 대개 새로운 변화의 신호입니다. 마음이 오래 머무는 장면이 곧 메시지예요.'
  },
  en: {
    h2:'🌙 Dream Reading + Lotto', sub:'Describe your dream freely to get a reading and lucky lotto numbers.',
    ph:'e.g. A big pig came into my house and I held it in my arms',
    run:'🔮 Read dream + draw lotto', lottoTitle:'🍀 Lucky numbers from your dream', redraw:'Draw again',
    empty:'Please describe your dream.',
    found:'Your dream shows these symbols', synth:'In sum,',
    synthTail:' energy flows together. Don’t miss the good current.',
    none:'No clear symbol was found, but an unfamiliar dream usually signals new change. The scene your mind lingers on is the message.'
  },
  ja: {
    h2:'🌙 夢の鑑定 + ロト番号', sub:'夢の内容を自由に書くと、鑑定と幸運のロト番号をお出しします。',
    ph:'例：大きな豚が家に入り、腕に抱きました',
    run:'🔮 夢を占う + ロトを引く', lottoTitle:'🍀 夢が選んだ幸運の番号', redraw:'もう一度引く',
    empty:'夢の内容を入力してください。',
    found:'あなたの夢にはこんな象徴が見えます', synth:'総合すると、',
    synthTail:'の気が共に流れています。良い流れを逃さないで。',
    none:'はっきりした象徴は見つかりませんでしたが、慣れない夢はたいてい新しい変化の兆しです。心が長く留まる場面こそメッセージです。'
  },
  zh: {
    h2:'🌙 解梦 + 乐透号码', sub:'自由描述你的梦，即可获得解读与幸运乐透号码。',
    ph:'例：一头大猪进了家门，被我抱在怀里',
    run:'🔮 解梦 + 抽乐透', lottoTitle:'🍀 梦为你选的幸运号码', redraw:'再抽一次',
    empty:'请输入梦境内容。',
    found:'你的梦中出现了这些象征', synth:'综合来看，',
    synthTail:'之气一同流动。别错过好的走势。',
    none:'虽未找到明确象征，但陌生的梦通常预示新的变化。你心中久久停留的画面，正是讯息。'
  }
};

(function () {
  const I = window.I18N;
  const $ = id => document.getElementById(id);
  // 무료 콘텐츠는 완역 팩(ko/en/ja/zh)으로 폴백. 50+ 언어는 유료 AI 풀이에서 원어 지원.
  const curLang = () => I.uiCode(localStorage.getItem('sk_lang') || 'ko');
  const T = () => DREAM_TELL_I18N[curLang()] || DREAM_TELL_I18N.ko;

  let drawIndex = 0;
  let lastText = '';

  /* --- 시드 해시 & PRNG --- */
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function drawLotto(text, idx) {
    const rng = mulberry32(hashStr(text + '#' + idx));
    const pool = [];
    for (let n = 1; n <= 45; n++) pool.push(n);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    return pool.slice(0, 6).sort((a, b) => a - b);
  }
  function ballColor(n) {
    if (n <= 10) return '#fbc400';
    if (n <= 20) return '#69c8f2';
    if (n <= 30) return '#ff7272';
    if (n <= 40) return '#b0b0b8';
    return '#b0d840';
  }

  /* --- 꿈 상징 분석 --- */
  function analyze(text) {
    const t = text.toLowerCase();
    const langs = ['ko', 'en', 'ja', 'zh'];
    return I.dreams.filter(dr =>
      langs.some(L =>
        (dr.k[L] || []).some(k => k && t.includes(k.toLowerCase())) ||
        (dr.t[L] && t.includes(dr.t[L].toLowerCase()))
      )
    );
  }

  function renderLotto() {
    const nums = drawLotto(lastText || 'sajukkum', drawIndex);
    $('dt-balls').innerHTML = nums.map(n =>
      `<span class="lotto-ball" style="background:${ballColor(n)}">${n}</span>`
    ).join('');
  }

  function run() {
    const lang = curLang(), t = T();
    const text = $('dt-input').value.trim();
    if (!text) { alert(t.empty); return; }
    lastText = text;
    drawIndex = 0;
    // 사용자가 쓴 꿈 → AI 전문가 풀이 컨텍스트로 저장하고 프리미엄 카드 갱신
    try { localStorage.setItem('sk_dream_text', text); } catch (e) {}
    if (window.SajuPay) window.SajuPay.onDreamText(text);

    // 풀이
    const matches = analyze(text);
    let html = '';
    if (matches.length) {
      html += `<p class="dt-lead">${t.found}:</p>`;
      html += matches.slice(0, 5).map(dr =>
        `<div class="dt-sym"><b>${dr.t[lang]}</b> <span class="dt-tag">${dr.tag[lang]}</span><br>${dr.m[lang]}</div>`
      ).join('');
      const tags = [...new Set(matches.map(dr => dr.tag[lang]))].slice(0, 3);
      html += `<p class="dt-synth">${t.synth} <b>${tags.join(', ')}</b>${t.synthTail}</p>`;
    } else {
      html += `<p class="dt-synth">${t.none}</p>`;
    }
    $('dt-interp').innerHTML = html;

    renderLotto();
    $('dt-result').style.display = 'block';
    $('dt-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* --- 정적 문구(언어) 적용 --- */
  function applyText() {
    const t = T();
    $('dtH2').textContent = t.h2;
    $('dtSub').textContent = t.sub;
    $('dt-input').placeholder = t.ph;
    $('dt-run').textContent = t.run;
    $('dtLottoTitle').textContent = t.lottoTitle;
    $('dt-redraw').textContent = t.redraw;
    // 결과가 떠 있으면 언어에 맞춰 다시 풀이
    if ($('dt-result').style.display !== 'none' && lastText) run();
  }

  /* --- 이벤트 --- */
  $('dt-run').addEventListener('click', run);
  $('dt-redraw').addEventListener('click', () => { drawIndex++; renderLotto(); });
  const langSel = $('langSel');
  if (langSel) langSel.addEventListener('change', () => setTimeout(applyText, 0));

  applyText();
})();
