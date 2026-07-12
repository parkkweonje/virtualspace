/* =========================================================================
   사주꿈 (SajuKkum) — 사주팔자 계산 엔진 (언어 중립 / 인덱스 기반)
   표시 문자열은 i18n.js에서 언어별로 처리. 여기서는 계산만 담당.
   =========================================================================

   [일진 계산 기준]
   day pillar index = (JDN + DAY_GANJI_OFFSET) % 60,  (0 = 甲子)
   앵커: 2000-01-01(양력) = 戊子(index 24), JDN(정오)=2451545.
   2451545 % 60 = 5  →  (5 + 19) % 60 = 24  →  OFFSET = 19.
   검증: 2026-07-11 = 丙辰, 2026년 7월(未월) 월주 = 乙未.
   ※ 특정 만세력과 하루 차이가 나면 DAY_GANJI_OFFSET 한 줄만 조정.
   ========================================================================= */

const DAY_GANJI_OFFSET = 19;

// 천간/지지 한자(모든 언어 공통 표기)
const GAN_H = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const JI_H  = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// 오행 내부 키(언어 중립)
const EL = ['wood','fire','earth','metal','water'];
const GAN_EL = ['wood','wood','fire','fire','earth','earth','metal','metal','water','water'];
const JI_EL  = ['water','earth','wood','wood','earth','fire','fire','earth','metal','metal','earth','water'];

// 절기(월지 경계) 근사치 — [월, 일] 이상이면 해당 월지
const SOLAR_TERMS = [
  { m: 2,  d: 4,  ji: 2  }, { m: 3,  d: 6,  ji: 3  }, { m: 4,  d: 5,  ji: 4  },
  { m: 5,  d: 6,  ji: 5  }, { m: 6,  d: 6,  ji: 6  }, { m: 7,  d: 7,  ji: 7  },
  { m: 8,  d: 8,  ji: 8  }, { m: 9,  d: 8,  ji: 9  }, { m: 10, d: 8,  ji: 10 },
  { m: 11, d: 7,  ji: 11 }, { m: 12, d: 7,  ji: 0  }, { m: 1,  d: 6,  ji: 1  }
];

function hourToJi(hour) {
  if (hour >= 23 || hour < 1) return 0;      // 자시 23:00~00:59
  return Math.floor((hour + 1) / 2) % 12;
}

// 정오 기준 율리우스적일(JDN)
function toJDN(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy
    + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

// 월지(절기 근사) 결정
function getMonthJi(month, day) {
  const cur = SOLAR_TERMS.find(t => t.m === month);
  if (cur && day < cur.d) {
    const idx = SOLAR_TERMS.indexOf(cur);
    return SOLAR_TERMS[(idx - 1 + 12) % 12].ji;
  }
  return cur ? cur.ji : 1;
}

/* -------------------- 사주팔자 계산 -------------------- */
function computeSaju(y, m, d, hour /* 0-23 or null */) {
  // 년주 — 입춘(2/4) 이전은 전년
  let yearForPillar = y;
  if (m < 2 || (m === 2 && d < 4)) yearForPillar = y - 1;
  const yGan = ((yearForPillar - 4) % 10 + 10) % 10;
  const yJi  = ((yearForPillar - 4) % 12 + 12) % 12;

  // 월주 — 월지 + 오호둔(년간→월간)
  const mJi = getMonthJi(m, d);
  const monthOrder = (mJi - 2 + 12) % 12;
  const monthStemStart = ((yGan % 5) * 2 + 2) % 10;
  const mGan = (monthStemStart + monthOrder) % 10;

  // 일주 — JDN
  const jdn = toJDN(y, m, d);
  const dayIndex = ((jdn + DAY_GANJI_OFFSET) % 60 + 60) % 60;
  const dGan = dayIndex % 10;
  const dJi  = dayIndex % 12;

  // 시주 — 오서둔(일간→자시간)
  let hourPillar = null;
  if (hour !== null && hour !== undefined && !Number.isNaN(hour)) {
    const hJi = hourToJi(hour);
    const hourStemStart = ((dGan % 5) * 2) % 10;
    hourPillar = { gan: (hourStemStart + hJi) % 10, ji: hJi };
  }

  const pillars = {
    year:  { gan: yGan, ji: yJi },
    month: { gan: mGan, ji: mJi },
    day:   { gan: dGan, ji: dJi },
    hour:  hourPillar
  };

  const count = { wood:0, fire:0, earth:0, metal:0, water:0 };
  ['year','month','day','hour'].forEach(k => {
    const p = pillars[k];
    if (!p) return;
    count[GAN_EL[p.gan]]++;
    count[JI_EL[p.ji]]++;
  });

  return { pillars, count, animalIndex: yJi, dayMaster: dGan };
}

/* -------------------- 결정론적 시드(오늘의 운세) -------------------- */
function seededPick(seedStr, arr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return arr[Math.abs(h) % arr.length];
}
function seededScore(seedStr, min, max) {
  let h = 5381;
  for (let i = 0; i < seedStr.length; i++) h = (h * 33 + seedStr.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}
function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* -------------------- 음력 → 양력 변환 (1900~2100) --------------------
   표준 음력 데이터표(각 연도 16진수 인코딩).
   - 하위 4비트: 윤달의 월(0이면 윤달 없음)
   - 비트4~15(0x8000~0x10): 1~12월이 큰달(30일)이면 1
   - 비트16(0x10000): 윤달이 큰달(30일)이면 1
   기준: 음력 1900-01-01 = 양력 1900-01-31. */
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
  0x0d520
];
const LUNAR_BASE_JDN = toJDN(1900, 1, 31); // 음력 1900-01-01

function lunarLeapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf; }
function lunarLeapDays(y) { return lunarLeapMonth(y) ? ((LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29) : 0; }
function lunarMonthDays(y, m) { return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
function lunarYearDays(y) {
  let sum = 0;
  for (let m = 1; m <= 12; m++) sum += lunarMonthDays(y, m);
  return sum + lunarLeapDays(y);
}

// JDN → 양력(y,m,d)  (Fliegel 역변환)
function solarFromJDN(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const dd = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * dd / 4);
  const mm = Math.floor((5 * e + 2) / 153);
  return {
    d: e - Math.floor((153 * mm + 2) / 5) + 1,
    m: mm + 3 - 12 * Math.floor(mm / 10),
    y: 100 * b + dd - 4800 + Math.floor(mm / 10)
  };
}

/* 음력(y,m,d, 윤달여부) → 양력 {y,m,d}. 범위를 벗어나면 null. */
function lunarToSolar(y, m, d, isLeap) {
  if (y < 1900 || y > 2100) return null;
  let offset = 0;
  for (let i = 1900; i < y; i++) offset += lunarYearDays(i);
  for (let i = 1; i < m; i++) offset += lunarMonthDays(y, i);
  const leap = lunarLeapMonth(y);
  if (leap > 0) {
    if (leap < m) offset += lunarLeapDays(y);            // 윤달이 이미 지나감
    else if (leap === m && isLeap) offset += lunarMonthDays(y, m); // 요청이 윤달이면 평달 먼저
  }
  offset += (d - 1);
  return solarFromJDN(LUNAR_BASE_JDN + offset);
}
function hasLeapMonth(y, m) { return lunarLeapMonth(y) === m; }

window.SajuEngine = {
  GAN_H, JI_H, EL, GAN_EL, JI_EL,
  computeSaju, hourToJi, toJDN,
  lunarToSolar, hasLeapMonth, lunarLeapMonth,
  seededPick, seededScore, todayStr
};
