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

window.SajuEngine = {
  GAN_H, JI_H, EL, GAN_EL, JI_EL,
  computeSaju, hourToJi, toJDN,
  seededPick, seededScore, todayStr
};
