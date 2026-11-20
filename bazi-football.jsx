import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

/* ═══════════ แกนคำนวณปฏิทินจีน (干支) ═══════════ */

const STEMS = "甲乙丙丁戊己庚辛壬癸".split("");
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥".split("");
const STEM_TH = ["เกี้ย","อิก","เปี้ย","เต็ง","โบ่ว","กี่","แก","ซิม","หยิม","กุ่ย"];
const BRANCH_TH = ["จื้อ","ทิ่ว","อิ๊ง","เบ้า","ซิ้ง","จี๋","โง่ว","บี่","ซิง","อิ้ว","สุก","ไห"];
const ZODIAC = ["หนู","วัว","เสือ","กระต่าย","มังกร","งู","ม้า","แพะ","ลิง","ไก่","สุนัข","หมู"];
const ZODIAC_FULL = ["ชวด","ฉลู","ขาล","เถาะ","มะโรง","มะเส็ง","มะเมีย","มะแม","วอก","ระกา","จอ","กุน"];

const EL = { wood:"ไม้", fire:"ไฟ", earth:"ดิน", metal:"ทอง", water:"น้ำ" };
const EL_HEX = { wood:"#4F9B72", fire:"#D8322C", earth:"#C08A3E", metal:"#CFC6B4", water:"#3A5B94" };
const STEM_EL = ["wood","wood","fire","fire","earth","earth","metal","metal","water","water"];
const BRANCH_EL = ["water","earth","wood","wood","earth","fire","fire","earth","metal","metal","earth","water"];
const CONTROLS = { wood:"earth", earth:"water", water:"fire", fire:"metal", metal:"wood" };
const PRODUCES = { wood:"fire", fire:"earth", earth:"metal", metal:"water", water:"wood" };
const PRODUCED_BY = { fire:"wood", earth:"fire", metal:"earth", water:"metal", wood:"water" };
const HIDDEN = [[9],[5,9,7],[0,2,4],[1],[4,1,9],[2,6,4],[3,5],[5,3,1],[6,8,4],[7],[4,7,3],[8,0]];

const jdn = (y,m,d) => { const a=Math.floor((14-m)/12), yy=y+4800-a, mm=m+12*a-3;
  return d+Math.floor((153*mm+2)/5)+365*yy+Math.floor(yy/4)-Math.floor(yy/100)+Math.floor(yy/400)-32045; };

const jdFromMs = (ms) => { const dt=new Date(ms); let Y=dt.getUTCFullYear(), M=dt.getUTCMonth()+1;
  const d=dt.getUTCDate()+(dt.getUTCHours()+dt.getUTCMinutes()/60)/24;
  if(M<=2){Y-=1;M+=12;} const A=Math.floor(Y/100), B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(Y+4716))+Math.floor(30.6001*(M+1))+d+B-1524.5; };

const sunLong = (jd) => { const T=(jd-2451545)/36525;
  const L0=(280.46646+36000.76983*T+0.0003032*T*T)%360;
  const M=((357.52911+35999.05029*T-0.0001537*T*T)*Math.PI)/180;
  const C=(1.914602-0.004817*T-0.000014*T*T)*Math.sin(M)+(0.019993-0.000101*T)*Math.sin(2*M)+0.000289*Math.sin(3*M);
  const om=((125.04-1934.136*T)*Math.PI)/180;
  return (((L0+C-0.00569-0.00478*Math.sin(om))%360)+360)%360; };

const TERMS = [[315,2,2],[345,3,3],[15,4,4],[45,5,5],[75,6,6],[105,7,7],[135,8,8],[165,9,9],[195,10,10],[225,11,11],[255,12,0],[285,1,1]];
const termCache = new Map();
const termMs = (year, deg, mon) => {
  const key = year+":"+deg;
  if (termCache.has(key)) return termCache.get(key);
  const diff = (ms) => ((((sunLong(jdFromMs(ms))-deg+180)%360)+360)%360)-180;
  const lo = Date.UTC(year, mon-1, 1)-7*864e5, hi = Date.UTC(year, mon-1, 1)+32*864e5;
  let prev = diff(lo), found = null;
  for (let ms=lo+864e5; ms<hi; ms+=864e5) { const c=diff(ms);
    if (prev<0 && c>=0) { let a=ms-864e5, b=ms;
      for (let i=0;i<34;i++){const md=(a+b)/2; if(diff(md)<0)a=md; else b=md;} found=a; break; }
    prev=c; }
  termCache.set(key, found); return found;
};

function fourPillars(dateStr, timeStr) {
  if (!dateStr) return null;
  const [y,m,d] = dateStr.split("-").map(Number);
  if (!y||!m||!d) return null;
  const hasTime = !!timeStr;
  const [hh,mi] = hasTime ? timeStr.split(":").map(Number) : [12,0];
  const t = Date.UTC(y, m-1, d, hh, mi);
  const cy = t < termMs(y,315,2) ? y-1 : y;
  const yS = (((cy-4)%10)+10)%10, yB = (((cy-4)%12)+12)%12;
  const marks = [];
  for (const [deg,mon,br] of TERMS) for (const yr of [cy, cy+1]) marks.push({ ms: termMs(yr,deg,mon), br });
  marks.sort((a,b)=>a.ms-b.ms);
  let mB = 1;
  for (const k of marks) if (k.ms <= t) mB = k.br;
  const mS = ((yS%5)*2 + 2 + (((mB-2)%12)+12)%12) % 10;
  const j = jdn(y,m,d);
  const dS = (j+9)%10, dB = (j+1)%12;
  let h = null;
  if (hasTime) { const hB = Math.floor((((hh*60+mi+60)%1440))/120); h = [((dS%5)*2+hB)%10, hB]; }
  return { y:[yS,yB], m:[mS,mB], d:[dS,dB], h, dateStr };
}

/* ช่วงเวลาแข่งคาบกี่ยาม — คืนสัดส่วนของแต่ละยาม */
const DURATIONS = [[90,"90 นาที (เวลาปกติ)"],[115,"115 นาที (รวมพักครึ่ง+ทดเวลา)"],[145,"145 นาที (ต่อเวลาพิเศษ)"]];
function hourSegments(dayStem, timeStr, minutes) {
  if (!timeStr) return null;
  const [hh, mi] = timeStr.split(":").map(Number);
  if (!Number.isFinite(hh)) return null;
  let t = hh*60 + mi, rem = minutes || 115;
  const total = rem;
  const acc = new Map();
  while (rem > 0) {
    const shifted = (t + 60) % 1440;      // ยามจื้อเริ่ม 23:00
    const b = Math.floor(shifted / 120);
    const take = Math.min(120 - (shifted % 120), rem);
    acc.set(b, (acc.get(b) || 0) + take);
    t += take; rem -= take;
  }
  return [...acc].map(([b, mins]) => ({
    b, mins, share: mins/total,
    stem: ((dayStem % 5) * 2 + b) % 10,
  })).sort((x,y) => y.mins - x.mins);
}

/* 三合 สามประสาน — ตัวกลาง (子午卯酉) คือแกนของชุด ถ้าจับคู่กับแกนจะแรงกว่า */
const SANHE = [[8,0,4,"water",0],[11,3,7,"wood",3],[2,6,10,"fire",6],[5,9,1,"metal",9]];
const XING = [[2,5,8],[1,10,7],[0,3]];        // 三刑 เสือ-งู-ลิง · วัว-สุนัข-แพะ · หนู-กระต่าย
const SELF_XING = [4,6,9,11];                  // 自刑 มะโรง มะเมีย ระกา กุน
const PO = [[0,9],[6,3],[8,5],[2,11],[4,1],[10,7]];  // 六破 แรงเบาที่สุด

/* ลำดับความแรงตามตำรา: 沖 > 合 > 刑 > 害 > 破 */
function branchRelation(a, b) {
  if (a === b) return SELF_XING.includes(a)
    ? { key:"xing", label:"ลงโทษตัวเอง", w:-2 }
    : { key:"fuyin", label:"ซ้ำเสา", w:-0.5 };
  if ((a-b+12)%12 === 6) return { key:"chong", label:"ชง", w:-4 };
  if ((a+b)%12 === 1) return { key:"liuhe", label:"คู่ธาตุ", w:3 };
  for (const g of SANHE) {
    if (g.slice(0,3).includes(a) && g.slice(0,3).includes(b)) {
      const withCore = a === g[4] || b === g[4];
      return withCore
        ? { key:"sanhe", label:"สามประสาน", w:2.5, el:g[3] }
        : { key:"banhe", label:"ประสานอ่อน", w:1.2, el:g[3] };
    }
  }
  for (const g of XING) if (g.includes(a) && g.includes(b))
    return { key:"xing", label:"ลงโทษ", w:-2 };
  if ((a+b)%12 === 7) return { key:"hai", label:"เบียน", w:-1.5 };
  for (const g of PO) if (g.includes(a) && g.includes(b))
    return { key:"po", label:"ทำลาย", w:-0.5 };
  return { key:"none", label:"เป็นกลาง", w:0 };
}

const gz = (p) => STEMS[p[0]] + BRANCHES[p[1]];
const gzTh = (p) => STEM_TH[p[0]] + BRANCH_TH[p[1]];
const TONE = { good:"#4E9C7A", mid:"#8B7C6C", bad:"#C0453D" };

/* สีของทีมบางสีเข้มเกินกว่าจะอ่านบนพื้นดำ — ดันความสว่างขึ้นเฉพาะตอนใช้เป็นตัวอักษรหรือแถบ */
/* สีชุดสว่างมาก (ขาว เหลือง ฟ้าอ่อน) ต้องใช้ตัวอักษรสีเข้มทับ */
function lightKit(hex) {
  const h = (hex || "#888").replace("#","");
  const f = (i) => { const c = parseInt(h.substr(i,2),16)/255; return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4); };
  return 0.2126*f(0) + 0.7152*f(2) + 0.0722*f(4) > 0.42;
}

function readable(hex, minL = 60, minS = 45) {
  const h = (hex || "#888888").replace("#", "");
  let r = parseInt(h.slice(0,2),16)/255, g = parseInt(h.slice(2,4),16)/255, b = parseInt(h.slice(4,6),16)/255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx - mn;
  let L = (mx+mn)/2, S = d === 0 ? 0 : d/(1 - Math.abs(2*L - 1)), H = 0;
  if (d) {
    H = mx === r ? ((g-b)/d + (g<b?6:0)) : mx === g ? ((b-r)/d + 2) : ((r-g)/d + 4);
    H *= 60;
  }
  L = Math.max(L, minL/100);
  if (S > 0.08) S = Math.max(S, minS/100);
  const c = (1 - Math.abs(2*L - 1)) * S, x = c * (1 - Math.abs(((H/60) % 2) - 1)), m = L - c/2;
  let [R,G,B] = H<60?[c,x,0]:H<120?[x,c,0]:H<180?[0,c,x]:H<240?[0,x,c]:H<300?[x,0,c]:[c,0,x];
  const hx = (v) => Math.round((v+m)*255).toString(16).padStart(2,"0");
  return "#" + hx(R) + hx(G) + hx(B);
}
const tierOf = (raw) => raw >= 1 ? "good" : raw <= -1 ? "bad" : "mid";
const REL_HEX = { chong:"#E0574C", xing:"#D4703A", hai:"#C8863B", po:"#9C8258", fuyin:"#8E8A6B",
  liuhe:"#5FB08A", sanhe:"#4E9C7A", banhe:"#6FA88C", none:"#6B5D50" };

/* ═══════════ สีชุดแข่ง → ธาตุ ═══════════ */
const KITS = [
  { id:"red",   name:"แดง",       el:"fire",  hex:"#D8322C" },
  { id:"white", name:"ขาว",       el:"metal", hex:"#EDE7DA" },
  { id:"blue",  name:"น้ำเงิน",   el:"water", hex:"#2F4F8F" },
  { id:"black", name:"ดำ",        el:"water", hex:"#22201E" },
  { id:"green", name:"เขียว",     el:"wood",  hex:"#3E8C63" },
  { id:"gold",  name:"เหลืองทอง", el:"earth", hex:"#C79A3C" },
];
const kitById = (id) => KITS.find((k) => k.id === id) || KITS[0];

/* สีชุดเทียบก้านฟ้าของวัน — สิบเทพย่อ */
function kitVerdict(kitEl, dayEl) {
  if (kitEl === CONTROLS[dayEl]) return { w:3, label:"สีเฮงประจำวัน", note:"ธาตุทรัพย์ของวัน" };
  if (kitEl === PRODUCED_BY[dayEl]) return { w:2, label:"เสริมกำลัง", note:"ธาตุที่ผลิตให้วัน" };
  if (kitEl === dayEl) return { w:1, label:"เสมอตัว", note:"ธาตุเดียวกับวัน" };
  if (kitEl === PRODUCES[dayEl]) return { w:-1, label:"เปลืองแรง", note:"วันต้องผลิตให้ธาตุนี้" };
  return { w:-2, label:"ถูกกดดัน", note:"ธาตุที่ควบคุมวัน" };
}

/* ═══════════ คะแนนผู้เล่น ═══════════ */

/* ═══ 月令旺衰 — ฤดูกำหนดว่าธาตุไหนแรงหรืออ่อน ═══
   ตำราว่า "當令者旺 令生者相 生令者休 剋令者囚 令剋者死"
   月令 หรือ 提綱 คือตัวชี้ขาดความแรงของธาตุในโป๊ยยี่ */
const SEASON_EL = { 2:"wood",3:"wood", 5:"fire",6:"fire", 8:"metal",9:"metal", 11:"water",0:"water",
                    4:"earth",7:"earth",10:"earth",1:"earth" };
const SEASON_STATE = [
  ["旺","วั่ง","ได้ฤดู แรงที่สุด", 1],
  ["相","เซี่ยง","ฤดูหนุน แรงรอง", 0.5],
  ["休","ซิว","พักตัว", 0],
  ["囚","ฉิว","ถูกกักขัง", -0.5],
  ["死","สื่อ","หมดแรง", -1],
];
function seasonStatus(myEl, monthBranch) {
  const ruler = SEASON_EL[monthBranch];
  let i;
  if (myEl === ruler) i = 0;
  else if (myEl === PRODUCES[ruler]) i = 1;
  else if (PRODUCES[myEl] === ruler) i = 2;
  else if (CONTROLS[myEl] === ruler) i = 3;
  else i = 4;
  const [zh, th, note, w] = SEASON_STATE[i];
  return { ruler, zh, th, note, w };
}

/* ═══ น้ำหนักระดับทีม — ตั้งจากส่วนเบี่ยงเบนจริงของผู้เล่น 567 คน ═══ */
const W_SQUAD   = 0.75;  /* ตัวจริงไม่ได้ลงครบ 90 นาที มีเปลี่ยนตัวระหว่างเกม */
const W_MGR     = 0.4;
const W_KIT     = 0.5;
const W_HARMONY = 1.5;   /* ค่าเฉลี่ยคู่แกว่งแค่ ±0.24 จึงต้องคูณขึ้น */
const W_TRIPLE  = 0.3;   /* ชุดสามตัว แปรตามจำนวนคนที่อยู่ในชุด */
const W_TRAVEL  = 0.2;
const W_HOME    = 0.5;
const W_LUCK    = 0.5;   /* เสาโชค 10 ปี — ให้น้ำหนักครึ่งหนึ่งของสาขาปี */
const HARMONY_WEIGHT = W_HARMONY;

/* ═══ ชุดสามตัว — ตรวจได้เฉพาะตอนมีผู้เล่นหลายคน ═══
   三會方局 แรงกว่า 三合局 เพราะเป็นธาตุเดียวกันทั้งทิศ */
const TRIPLES = [
  { key:"hui", zh:"三會", th:"สามประชุมทิศ", b:[2,3,4],  el:"wood",  dir:"ตะวันออก", w:3   },
  { key:"hui", zh:"三會", th:"สามประชุมทิศ", b:[5,6,7],  el:"fire",  dir:"ใต้",       w:3   },
  { key:"hui", zh:"三會", th:"สามประชุมทิศ", b:[8,9,10], el:"metal", dir:"ตะวันตก",  w:3   },
  { key:"hui", zh:"三會", th:"สามประชุมทิศ", b:[11,0,1], el:"water", dir:"เหนือ",     w:3   },
  { key:"he",  zh:"三合", th:"สามประสาน",    b:[8,0,4],  el:"water", dir:"",          w:2.2 },
  { key:"he",  zh:"三合", th:"สามประสาน",    b:[11,3,7], el:"wood",  dir:"",          w:2.2 },
  { key:"he",  zh:"三合", th:"สามประสาน",    b:[2,6,10], el:"fire",  dir:"",          w:2.2 },
  { key:"he",  zh:"三合", th:"สามประสาน",    b:[5,9,1],  el:"metal", dir:"",          w:2.2 },
];

/* หาชุดสามที่ครบในหมู่ตัวจริง — คืนชุดที่แรงที่สุดก่อน */
function findTriples(field) {
  const have = {};
  for (const x of field) {
    const b = x.s.pil.y[1];
    (have[b] = have[b] || []).push(x);
  }
  const out = [];
  for (const t of TRIPLES) {
    if (t.b.every(b => have[b]?.length)) {
      out.push({ ...t, members: t.b.map(b => have[b][0]), count: t.b.reduce((a,b)=>a+have[b].length, 0) });
    }
  }
  return out.sort((a,b)=>b.w-a.w);
}

/* ความกลมกลืนภายในทีม — จับคู่ปีเกิดของตัวจริงทุกคู่ */
function teamHarmony(field) {
  if (field.length < 2) return { pairs:[], avg:0, w:0, best:null, worst:null };
  const pairs = [];
  for (let i = 0; i < field.length; i++)
    for (let j = i + 1; j < field.length; j++) {
      const rel = branchRelation(field[i].s.pil.y[1], field[j].s.pil.y[1]);
      if (rel.key !== "none") pairs.push({ a:field[i], b:field[j], rel });
    }
  const all = [];
  for (let i = 0; i < field.length; i++)
    for (let j = i + 1; j < field.length; j++)
      all.push(branchRelation(field[i].s.pil.y[1], field[j].s.pil.y[1]).w);
  const avg = all.length ? all.reduce((x,y)=>x+y,0)/all.length : 0;
  const sorted = pairs.slice().sort((x,y)=>y.rel.w-x.rel.w);
  /* ชุดสามตัวครบ นับเฉพาะชุดที่แรงที่สุดของแต่ละธาตุ ไม่ให้นับซ้ำ */
  const triples = findTriples(field);
  const seen = new Set();
  const counted = triples.filter(t => { if (seen.has(t.el)) return false; seen.add(t.el); return true; });
  /* ครบสามตัวแค่เปิดประตู ความแรงอยู่ที่มีคนในชุดกี่คนจาก 11
     3 คนคือขั้นต่ำ ให้โบนัสน้อย ยิ่งกระจุกยิ่งแรง
     ถ้ายังไม่ได้เลือกตัวจริงจะคิดจากทั้งทีม ต้องย่อกลับมาเป็นฐาน 11 คนก่อน
     ไม่งั้นทีมที่มีรายชื่อในระบบเยอะจะได้โบนัสฟรี เพราะชุดธาตุครบง่ายกว่ามาก */
  const scale = field.length ? 11 / field.length : 1;
  for (const t of counted) t.strength = t.w * Math.max(0, (t.count * scale - 3)) / 4;
  const tripleW = counted.reduce((a,t)=>a+t.strength, 0) * W_TRIPLE;
  return {
    pairs, avg, triples: counted, tripleW,
    w: avg * HARMONY_WEIGHT + tripleW,
    best: sorted[0]?.rel.w > 0 ? sorted[0] : null,
    worst: sorted[sorted.length-1]?.rel.w < 0 ? sorted[sorted.length-1] : null,
    good: pairs.filter(x=>x.rel.w>0).length,
    bad: pairs.filter(x=>x.rel.w<0).length,
  };
}

/* ═══════════ ข้อ 3+1 — ความแข็งอ่อนของธาตุประจำตัว และธาตุที่เป็นคุณ ═══════════
   ตำราตัดสิน 身強/身弱 จาก เดือนเกิด (月令) เป็นหลัก แล้วนับก้านสวรรค์กับธาตุซ่อนในกิ่ง
   แล้วธาตุที่เป็นคุณ (用神) จะกลับด้านกันระหว่างคนดวงแข็งกับดวงอ่อน
   — ของเดิมให้ค่าเดียวกับทุกคน ซึ่งใส่เครื่องหมายผิดให้คนราวครึ่งหนึ่ง */
const HIDDEN_W = [1, 0.4, 0.25];          /* 本氣 · 中氣 · 餘氣 */

function chartStrength(pil) {
  if (!pil) return null;
  const me = STEM_EL[pil.d[0]];
  const helps = (el) => el === me || el === PRODUCED_BY[me];
  let support = 0, drain = 0;

  /* ก้านสวรรค์ ปี-เดือน-ยาม (ก้านวันคือตัวเอง ไม่นับ) */
  const stems = [pil.y[0], pil.m[0]];
  if (pil.h) stems.push(pil.h[0]);
  for (const st of stems) (helps(STEM_EL[st]) ? support++ : drain++);

  /* ธาตุซ่อนในกิ่งทุกเสา ถ่วงตามลำดับ 本氣 > 中氣 > 餘氣 */
  const branches = [pil.y[1], pil.m[1], pil.d[1]];
  if (pil.h) branches.push(pil.h[1]);
  const hid = [];
  for (const br of branches)
    (HIDDEN[br] || []).forEach((st, i) => {
      const el = STEM_EL[st], w = HIDDEN_W[i] != null ? HIDDEN_W[i] : 0.25;
      hid.push({ br, st, el, w, helps: helps(el) });
      if (helps(el)) support += w; else drain += w;
    });

  /* 月令 มีน้ำหนักตัดสินมากที่สุดตามตำรา */
  const ruler = SEASON_EL[pil.m[1]];
  const seasonBoost = ruler === me ? 2
                    : ruler === PRODUCED_BY[me] ? 1.2
                    : PRODUCES[me] === ruler ? -0.6
                    : CONTROLS[ruler] === me ? -0.6 : -1;

  const score = support - drain + seasonBoost;
  return { me, support:+support.toFixed(2), drain:+drain.toFixed(2),
           seasonBoost, score:+score.toFixed(2), strong: score > 0, hidden: hid };
}

/* สิบเทพแบบย่อ — วันแข่งเป็นอะไรกับธาตุประจำตัวเรา */
const tenGodOf = (me, el) =>
    el === PRODUCED_BY[me] ? "yin"   /* 印  หนุนเรา */
  : el === me              ? "bi"    /* 比劫 ธาตุเดียวกัน */
  : el === PRODUCES[me]    ? "shi"   /* 食傷 เราผลิตให้ */
  : el === CONTROLS[me]    ? "cai"   /* 財  เราคุมได้ */
  :                          "guan"; /* 官殺 คุมเรา */

const GOD_TH = { yin:"印 วันหนุนธาตุตัวเอง", bi:"比劫 ธาตุเดียวกับวัน",
                 shi:"食傷 ต้องผลิตให้วัน", cai:"財 วันเป็นทรัพย์ของตัวเอง",
                 guan:"官殺 วันกดธาตุตัวเอง" };
/* ดวงอ่อนต้องการตัวหนุน ดวงแข็งต้องการตัวระบาย */
const GOD_W_WEAK   = { yin: 1,   bi: 0.5,  shi:-0.25, cai:-0.5,  guan:-1   };
const GOD_W_STRONG = { yin:-1,   bi:-0.5,  shi: 0.5,  cai: 1,    guan: 0.75 };

function elementBonus(me, dayEl, strong) {
  const g = tenGodOf(me, dayEl);
  const w = (strong ? GOD_W_STRONG : GOD_W_WEAK)[g];
  return { god:g, w, note: GOD_TH[g] + (strong ? " · ดวงแข็ง" : " · ดวงอ่อน") };
}

/* ═══════════ ข้อ 2 — เสาโชค 大運 ═══════════
   ตำรา: ชายเกิดปีก้านหยาง เดินหน้า · ชายเกิดปีก้านอิน เดินถอย (หญิงกลับกัน)
   เริ่มนับจากวันเกิดถึง 節 ที่ใกล้ที่สุดตามทิศที่เดิน 3 วัน = 1 ปี
   แล้วเปลี่ยนเสาใหม่ทุก 10 ปี  — ฐานข้อมูลเราเป็นนักเตะชายทั้งหมด */
function luckPillar(birthStr, pil, onDateStr, male = true) {
  if (!birthStr || !pil || !onDateStr) return null;
  const [by, bm, bd] = birthStr.split("-").map(Number);
  const bt = Date.UTC(by, bm - 1, bd, 12, 0);
  const yangYear = pil.y[0] % 2 === 0;
  const forward = male ? yangYear : !yangYear;

  /* หา 節 ที่ขนาบวันเกิด */
  const marks = [];
  for (const [deg, mon] of TERMS) for (const yr of [by - 1, by, by + 1])
    marks.push(termMs(yr, deg, mon));
  marks.sort((a, b) => a - b);
  const nxt = marks.find(ms => ms > bt);
  const prv = [...marks].reverse().find(ms => ms <= bt);
  if (nxt == null || prv == null) return null;

  const diffDays = Math.abs((forward ? nxt - bt : bt - prv)) / 86400000;
  const startAge = diffDays / 3;                       /* 3 วัน = 1 ปี */

  const [oy, om, od] = onDateStr.split("-").map(Number);
  const age = (Date.UTC(oy, om - 1, od) - bt) / (365.2425 * 86400000);
  if (age < startAge) return { startAge:+startAge.toFixed(2), age:+age.toFixed(1),
                               idx:-1, pillar:null, note:"ยังไม่เข้าเสาโชคแรก" };
  const idx = Math.floor((age - startAge) / 10);       /* เสาที่เท่าไหร่ */
  const step = (idx + 1) * (forward ? 1 : -1);
  const ps = (((pil.m[0] + step) % 10) + 10) % 10;
  const pb = (((pil.m[1] + step) % 12) + 12) % 12;
  return { startAge:+startAge.toFixed(2), age:+age.toFixed(1), idx, forward,
           pillar:[ps, pb], from:+(startAge + idx * 10).toFixed(1),
           to:+(startAge + idx * 10 + 10).toFixed(1) };
}

function scorePlayer(p, day, segs) {
  const pil = fourPillars(p.b, p.time || null);
  if (!pil) return null;
  const relY = branchRelation(pil.y[1], day.d[1]);
  const relD = branchRelation(pil.d[1], day.d[1]);
  const relT = branchRelation(pil.y[1], day.y[1]);   /* 太歲 เทพเจ้าประจำปี */
  const relM = branchRelation(pil.y[1], day.m[1]);   /* 月建 เดือนที่แข่ง */
  const myEl = STEM_EL[pil.d[0]];
  const dayEl = STEM_EL[day.d[0]];

  /* ── ข้อ 3+1 — ธาตุที่เป็นคุณขึ้นกับว่าดวงแข็งหรืออ่อน ──
     เก็บค่าแบบเดิมไว้คู่ขนาน (elBonusOld) เพื่อเทียบความแม่นเมื่อจบฤดูกาล */
  let elBonusOld = 0;
  if (dayEl === PRODUCED_BY[myEl])      elBonusOld =  1;
  else if (dayEl === myEl)              elBonusOld =  0.5;
  else if (dayEl === CONTROLS[myEl])    elBonusOld =  0.5;
  else if (dayEl === PRODUCES[myEl])    elBonusOld = -0.25;
  else                                  elBonusOld = -1;

  const strength = chartStrength(pil);
  const eb = elementBonus(myEl, dayEl, strength ? strength.strong : false);
  const elBonus = eb.w, elNote = eb.note;

  let hourW = 0, hourParts = null;
  if (segs && segs.length) {
    hourParts = segs.map(sg => ({ ...sg, rel: branchRelation(pil.y[1], sg.b) }));
    hourW = hourParts.reduce((a, x) => a + x.rel.w * x.share, 0) * 0.3;
  }
  const relH = hourParts ? hourParts[0].rel : null;
  const season = seasonStatus(myEl, day.m[1]);      /* 月令旺衰 */

  /* ── ข้อ 2 — เสาโชค 大運 เทียบกับวันแข่ง ──
     ทำให้คนเกิดปีเดียวกันแต่คนละเดือน/คนละอายุ ได้คะแนนต่างกันจริง */
  let luck = null, relL = null, luckW = 0;
  if (day.dateStr) {
    luck = luckPillar(p.b, pil, day.dateStr, true);
    if (luck && luck.pillar) {
      relL = branchRelation(luck.pillar[1], day.d[1]);
      luckW = relL.w * W_LUCK;
    }
  }

  const base = relY.w + relT.w * 0.5 + relM.w * 0.4 + relD.w * 0.5
             + season.w * 0.8 + hourW;
  const raw = base + elBonus + luckW;
  /* คะแนนแบบเดิมก่อนปรับข้อ 1-3 — เก็บไว้เทียบคู่ขนาน ไม่เอาไปใช้ตัดสิน */
  const rawClassic = base + elBonusOld;
  return { pil, relY, relD, relT, relM, relH, hourParts, hourW, myEl,
           elBonus, elBonusOld, elNote, god:eb.god, strength, luck, relL, luckW,
           season, raw, rawClassic };
}

/* ═══════════ พื้นที่จัดเก็บ (ห่อกันพัง) ═══════════
   ไล่จากที่เชื่อถือได้มากสุดลงมา  localStorage → window.storage → IndexedDB → หน่วยความจำ
   เดิมใช้ window.storage อย่างเดียว ซึ่งมีเฉพาะในแซนด์บ็อกซ์
   เปิดใน Chrome บนมือถือจึงบันทึกไม่ติดเลย ข้อมูลหายทุกครั้งที่ปิดแอป */
const mem = new Map();
let storageDown = false;
let backend = "mem";
const BACKEND_TH = { local:"เครื่องนี้", host:"ระบบโฮสต์", idb:"ฐานข้อมูลในเครื่อง", mem:"ชั่วคราว" };
const withTimeout = (pr, ms = 8000) =>
  Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

const PFX = "bzf:";
/* ลองเขียนจริงหนึ่งครั้ง เพราะบางโหมดมีตัวแปรอยู่แต่เขียนไม่ได้ */
const LS = (() => {
  try {
    const k = PFX + "__t";
    window.localStorage.setItem(k, "1");
    const ok = window.localStorage.getItem(k) === "1";
    window.localStorage.removeItem(k);
    return ok ? window.localStorage : null;
  } catch (e) { return null; }
})();

let idbP = null;
const idb = () => (idbP = idbP || new Promise((res, rej) => {
  try {
    const rq = indexedDB.open("duangbon", 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error || new Error("idb"));
  } catch (e) { rej(e); }
}));
const idbDo = (mode, fn) => idb().then(db => new Promise((res, rej) => {
  try {
    const rq = fn(db.transaction("kv", mode).objectStore("kv"));
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error || new Error("idb"));
  } catch (e) { rej(e); }
}));

const store = {
  async get(key) {
    if (LS) { try { const v = LS.getItem(PFX + key); if (v !== null) { backend = "local"; return v; } } catch (e) {} }
    if (window.storage) { try { const r = await withTimeout(window.storage.get(key), 4000);
      if (r?.value != null) { backend = "host"; return r.value; } } catch (e) {} }
    try { const v = await withTimeout(idbDo("readonly", st => st.get(PFX + key)), 4000);
      if (v != null) { backend = "idb"; return v; } } catch (e) {}
    return mem.has(key) ? mem.get(key) : null;
  },
  async set(key, value) {
    mem.set(key, value);
    if (LS) { try { LS.setItem(PFX + key, value); backend = "local"; storageDown = false; return true; } catch (e) {} }
    if (window.storage) { try { await withTimeout(window.storage.set(key, value), 4000);
      backend = "host"; storageDown = false; return true; } catch (e) {} }
    try { await withTimeout(idbDo("readwrite", st => st.put(value, PFX + key)), 4000);
      backend = "idb"; storageDown = false; return true; } catch (e) {}
    storageDown = true; backend = "mem"; return false;
  },
  async del(key) {
    mem.delete(key);
    if (LS) { try { LS.removeItem(PFX + key); } catch (e) {} }
    if (window.storage) { try { await withTimeout(window.storage.delete(key), 4000); } catch (e) {} }
    try { await withTimeout(idbDo("readwrite", st => st.delete(PFX + key)), 4000); } catch (e) {}
  },
  /* สำรอง/กู้คืน — เผื่อล้างแคชหรือย้ายเครื่อง */
  async dump(keys) {
    const o = {};
    for (const k of keys) { const v = await store.get(k); if (v != null) o[k] = v; }
    return o;
  },
  async load(obj) {
    let n = 0;
    for (const k of Object.keys(obj || {})) { if (await store.set(k, String(obj[k]))) n++; }
    return n;
  },
};
const readJson = async (key, fallback) => {
  const v = await store.get(key);
  if (!v) return fallback;
  try { return JSON.parse(v); } catch (e) { return fallback; }
};

const RENAME = { "แมนยู":"Manchester United", "แมนฯซิตี้":"Manchester City" };
const PRESET_VERSION = 24;   // เพิ่มเลขนี้ทุกครั้งที่เพิ่มทีมสำเร็จรูป
                             // 23 = Pochettino คุมแมนยู · 24 = Thomas Frank คุมพาเลซ + แก้วันเกิด ผจก. 3 คน
const IDX = "bazi:index";
const teamKey = (slug) => "bazi:team:" + slug;
const OLD = "manutd-bazi-v1";
const slugify = (s) => "t" + Math.abs([...s].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0)).toString(36) + s.replace(/[^a-z0-9]/gi,"").slice(0,6).toLowerCase();
const todayISO = () => new Date().toISOString().slice(0,10);


/* ═══════════ ชุดแข่งพรีเมียร์ลีก 2026/27 ═══════════ */
/* el = ธาตุของสีหลัก · ชุดสองสีเป็นการตัดสินจากสีเด่น ปรับเองได้ในหน้าจัดการทีม */
const KIT_DB = {
  "Arsenal": { home:["แดง-แขนขาว","fire","#C8102E"], away:["น้ำเงินเข้ม-ลายกราฟิก","water","#1B2A4A"], third:["เหลืองอ่อน","earth","#E8DFA0"] },
  "Liverpool": { home:["แดงเพลิง","fire","#C8102E"], away:["ขาว-เทา","metal","#E4E2DD"], third:["เขียวมิ้นต์","wood","#5CC9A7"] },
  "Manchester United": { home:["แดง","fire","#DA291C"], away:["น้ำเงินไฟฟ้า","water","#1F6FEB"], third:["ขาวขลิบแดง-น้ำเงิน","metal","#F2EFE9"] },
  "Nottingham Forest": { home:["แดง","fire","#DD0000"], away:["เขียวเข้ม-ไหล่แดง","wood","#14452F"], third:["ส้ม/ฟ้าพาสเทล","fire","#E8804A"] },
  "Bournemouth": { home:["ลายทางแดง-ดำ","fire","#B50E12"], away:["ม่วง-ลายเรขาคณิต","fire","#5B2A6B"], third:["ครีมขลิบดำ-ทอง","earth","#E8DCC0"] },
  "Brentford": { home:["ลายทางแดง-ขาว","fire","#D20000"], away:["กรมท่าลายเข้ม","water","#1C2740"], third:["เขียวเข้มขลิบมิ้นต์","wood","#174630"] },
  "Manchester City": { home:["ฟ้าอ่อน","water","#6CABDD"], away:["ดำ-ขลิบเมทัลลิก","water","#1A1A1A"], third:["เขียวสะท้อนแสง/เทา","wood","#A6E22E"] },
  "Chelsea": { home:["น้ำเงินเข้มขลิบฟ้า","water","#034694"], away:["ดำ-ขลิบทอง","water","#1A1A1A"], third:["ขาว/ชมพูอ่อน","metal","#F5EFEF"] },
  "Everton": { home:["น้ำเงิน","water","#003399"], away:["เทา/ดำ ดีไซน์เฉียง","metal","#6E7175"], third:["ขาวขลิบน้ำเงิน","metal","#F0F2F5"] },
  "Tottenham Hotspur": { home:["ขาว-กางเกงน้ำเงินเข้ม","metal","#F7F7F7"], away:["ฟ้า/น้ำเงินอ่อน","water","#6E8FCF"], third:["เขียวเข้ม/ตองอ่อน","wood","#1D4B36"] },
  "Crystal Palace": { home:["ขาว พาดแถบเฉียงแดง-น้ำเงิน","metal","#F4F2EE"], away:["ดำ อินทรีดำ","water","#141414"], third:["ลายทางแดง-น้ำเงิน","fire","#C4122E"] },
  "Brighton": { home:["ลายทางน้ำเงิน-ขาว","water","#0057B8"], away:["ขาว-ลายทางน้ำเงิน","metal","#EDEAE4"], third:["เขียวอมฟ้าเข้ม","wood","#0E4F53"] },
  "Ipswich Town": { home:["น้ำเงิน","water","#3A64A3"], away:["แดงเปลือกมังคุด","fire","#6E1728"], third:["ขาว/ฟ้าพาสเทล","metal","#EAF1F8"] },
  "Coventry City": { home:["ฟ้าอ่อนล้วน","water","#78BEEA"], away:["ขาว/เทาอ่อน","metal","#E9E7E2"], third:["ดำขลิบฟ้าอ่อน","water","#171717"] },
  "Aston Villa": { home:["เลือดหมู-แขนฟ้าอ่อน","fire","#670E36"], away:["เทาเข้ม-ลายคลื่นน้ำ","metal","#4A4E52"], third:["ฟ้าอ่อน-ขลิบเลือดหมู","water","#9BD3F0"] },
  "Hull City": { home:["ลายทางส้ม-ดำ","fire","#F5A12D"], away:["ขาวขลิบดำ","metal","#F0EEEA"], third:["เทาเข้ม/ดำล้วน","metal","#3A3A3A"] },
  "Sunderland": { home:["ลายทางแดง-ขาว","fire","#E12E36"], away:["ขาว-เทา ลายกราฟิก","metal","#EDEBE6"], third:["ฟ้า/น้ำเงินเข้ม","water","#1E3A6E"] },
  "Newcastle United": { home:["ลายทางดำ-ขาว","metal","#EDEAE4"], away:["น้ำเงิน/เทาเทเลอร์","water","#2C4A6E"], third:["ม่วง/ลาเวนเดอร์","fire","#8E7CC3"] },
  "Fulham": { home:["ขาว-กางเกงดำ","metal","#FAFAFA"], away:["ดำ/น้ำเงินเหลือบน้ำมัน","water","#14161A"], third:["แดงเข้ม/มารูน","fire","#7A1F2B"] },
  "Como": { home:["น้ำเงิน ริ้วโทนเดียว ขลิบขาว","water","#1B4C9B"], away:["ขาว ปกและไหล่น้ำเงินเข้ม","metal","#F2F2F0"], third:["ดำ-เทาถ่าน ลายคลื่น (ยังไม่ยืนยัน)","water","#1E1E20"] },
  "AS Roma": { home:["แดงเลือดหมู ขลิบเหลือง","fire","#8E1F2F"], away:["ครีม แถบอกแดง-เหลือง กางเกงแดง","earth","#EDE4D3"], third:["เทาเข้ม ลายดอกไม้ ขลิบแดง-เหลือง","metal","#4A4A4D"] },
  "Sporting CP": { home:["เขียว-ขาว ลายขวาง กางเกงดำ","wood","#1B7A3D"], away:["ทอง ขลิบดำ","earth","#C9A227"], third:["ทอง ขลิบดำ (ชุด 3 ยังไม่เปิดตัว ใช้ชุดเยือนแทน)","earth","#C9A227"] },
  "RB Leipzig": { home:["ขาว ขลิบแดง กางเกงแดง","metal","#F4F4F4"], away:["แดง ขลิบเหลือง-กรมท่า","fire","#D2112B"], third:["กรมท่า ลายฟ้า-แดง","water","#1A2A4F"] },
  "Bayern München": { home:["แดง ริ้วโทนเดียว ขลิบขาว","fire","#DC052D"], away:["ขาว ขลิบกรมท่า-แดง","metal","#F5F5F3"], third:["กรมท่าอมม่วง ลายแดง-ชมพู","water","#2A2048"] },
  "Villarreal": { home:["เหลือง ขลิบน้ำเงิน","earth","#FFE500"], away:["เทาเงิน ไหล่น้ำเงิน","metal","#C8CBD0"], third:["เขียวมิ้นต์ ขลิบเหลืองนีออน","wood","#2FBFA6"] },
  "Atlético Madrid": { home:["แดง-ขาว ลายทางตั้ง กางเกงกรมท่า","fire","#CB3524"], away:["ดำ-ขลิบเขียวนีออน","water","#16181A"], third:["เทาอ่อน-ริ้วแดงกรมท่า","metal","#D6D2CB"] },
  "Leeds United": { home:["ขาวล้วนขลิบเหลือง","metal","#FAFAF5"], away:["เหลืองสว่าง","earth","#F0E13A"], third:["น้ำเงินกรมท่า","water","#1D2951"] },
};
const SLOTS = [["home","เหย้า"],["away","เยือน"],["third","ชุดที่ 3"]];
const POS_ORDER = ["GK","DF","MF","FW"];
const kitsFor = (name) => {
  const d = KIT_DB[name];
  if (!d) return null;
  const o = {};
  for (const [k] of SLOTS) o[k] = { label:d[k][0], el:d[k][1], hex:d[k][2] };
  return o;
};
/* ชุดที่ทีมนั้นใส่จริงในนัดนี้ */
const wornKit = (team, slot, matchDate) => {
  /* ถ้าตรวจสีเสื้อที่ใส่จริงมาแล้วและผูกกับวันของนัดนี้ ให้ใช้ชุดนั้น
     ไม่งั้นเดาจากช่องเหย้า-เยือน ซึ่งอาจไม่ตรงกับที่ใส่จริง */
  const lu = team?.lineup;
  const rec = (lu && lu.kit && (!matchDate || !lu.forDate || lu.forDate === matchDate)) ? lu.kit : null;
  const k = team?.kits?.[rec || slot];
  if (k) return { ...k, slot: rec || slot, checked: !!rec };
  const legacy = kitById(team?.kit);
  return { label: legacy.name, el: legacy.el, hex: legacy.hex, slot: rec || slot, checked: !!rec };
};

/* ═══════════ เวลาไทย → เวลาท้องถิ่นสนาม ═══════════ */
const TZ_OPTIONS = [
  ["Europe/London","อังกฤษ"], ["Europe/Madrid","สเปน"], ["Europe/Berlin","เยอรมนี"],
  ["Europe/Rome","อิตาลี"], ["Europe/Lisbon","โปรตุเกส"], ["Europe/Amsterdam","เนเธอร์แลนด์"],
  ["Europe/Istanbul","ตุรกี"], ["Asia/Riyadh","ซาอุฯ"], ["America/New_York","สหรัฐฯ ตอ."],
  ["Asia/Bangkok","ไทย"],
];
const THAI_OFFSET = 7 * 3600e3;

function zoneParts(ms, tz) {
  try {
    const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year:"numeric", month:"2-digit",
      day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false });
    const p = Object.fromEntries(f.formatToParts(new Date(ms)).map(x=>[x.type, x.value]));
    const h = p.hour === "24" ? "00" : p.hour;
    return { date:`${p.year}-${p.month}-${p.day}`, time:`${h}:${p.minute}` };
  } catch (e) { return null; }
}

/* แปลงวัน-เวลาไทยที่ผู้ใช้กรอก เป็นวัน-เวลาที่สนาม */
function localAtVenue(dateStr, timeStr, tz) {
  if (!timeStr) return { date: dateStr, time: null, shifted: false, tz: tz || "Europe/London" };
  const zone = tz || "Europe/London";
  const [Y,M,D] = dateStr.split("-").map(Number);
  const [h,mi] = timeStr.split(":").map(Number);
  const utc = Date.UTC(Y, M-1, D, h, mi) - THAI_OFFSET;
  const got = zoneParts(utc, zone);
  if (!got) return { date: dateStr, time: timeStr, shifted: false, tz: zone };
  return { ...got, shifted: got.date !== dateStr, tz: zone };
}

/* ═══════════ สนามและทิศทาง ═══════════ */
const RAD = Math.PI / 180;
const DIR_TH = ["เหนือ","เหนือค่อนตะวันออก","ตะวันออกเฉียงเหนือ","ตะวันออก","ตะวันออกค่อนใต้",
  "ตะวันออกเฉียงใต้","ใต้","ใต้ค่อนตะวันตก","ตะวันตกเฉียงใต้","ตะวันตก","ตะวันตกค่อนเหนือ","ตะวันตกเฉียงเหนือ"];

function bearingOf(a, b) {
  const y = Math.sin((b.lng-a.lng)*RAD) * Math.cos(b.lat*RAD);
  const x = Math.cos(a.lat*RAD)*Math.sin(b.lat*RAD) - Math.sin(a.lat*RAD)*Math.cos(b.lat*RAD)*Math.cos((b.lng-a.lng)*RAD);
  return (Math.atan2(y, x)/RAD + 360) % 360;
}
function distOf(a, b) {
  const dLat = (b.lat-a.lat)*RAD, dLng = (b.lng-a.lng)*RAD;
  const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*RAD)*Math.cos(b.lat*RAD)*Math.sin(dLng/2)**2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
const branchOfBearing = (deg) => Math.floor(((deg + 15) % 360) / 30);
const hasVenue = (t) => t?.venue && Number.isFinite(+t.venue.lat) && Number.isFinite(+t.venue.lng)
  && (t.venue.lat !== "" && t.venue.lng !== "");

/* การเดินทางของทีมเยือน: ทิศจากสนามตัวเองไปสนามแข่ง เทียบกับกิ่งดินของวัน */
function travelRead(awayTeam, homeTeam, day) {
  if (!hasVenue(awayTeam) || !hasVenue(homeTeam)) return null;
  const a = { lat:+awayTeam.venue.lat, lng:+awayTeam.venue.lng };
  const b = { lat:+homeTeam.venue.lat, lng:+homeTeam.venue.lng };
  const km = distOf(a, b);
  if (km < 0.5) return null;
  const deg = bearingOf(a, b);
  const br = branchOfBearing(deg);
  const rel = branchRelation(br, day.d[1]);
  const scale = Math.min(1, km / 150);          // ทางไกลยิ่งมีผลมาก
  return { deg, br, km, rel, effect: rel.w * W_TRAVEL * scale };
}

const VENUES = {
  "Manchester United": { name:"Old Trafford", lat:53.4631, lng:-2.2913, tz:"Europe/London" },
  "Manchester City": { name:"Etihad Stadium", lat:53.4831, lng:-2.2004, tz:"Europe/London" },
  "Chelsea": { name:"Stamford Bridge", lat:51.4817, lng:-0.1910, tz:"Europe/London" },
  "Arsenal": { name:"Emirates Stadium", lat:51.5549, lng:-0.1084, tz:"Europe/London" },
  "Liverpool": { name:"Anfield", lat:53.4308, lng:-2.9608, tz:"Europe/London" },
  "Newcastle United": { name:"St James' Park", lat:54.9756, lng:-1.6217, tz:"Europe/London" },
  "Tottenham Hotspur": { name:"Tottenham Hotspur Stadium", lat:51.6043, lng:-0.0665, tz:"Europe/London" },
  "Everton": { name:"Everton Stadium", lat:53.4160, lng:-3.0010, tz:"Europe/London" },
  "Ipswich Town": { name:"Portman Road", lat:52.0550, lng:1.1450, tz:"Europe/London" },
  "Brighton": { name:"Amex Stadium", lat:50.8616, lng:-0.0836, tz:"Europe/London" },
  "Leeds United": { name:"Elland Road", lat:53.7778, lng:-1.5722, tz:"Europe/London" },
  "Brentford": { name:"Gtech Community Stadium", lat:51.4907, lng:-0.2887, tz:"Europe/London" },
  "Hull City": { name:"MKM Stadium", lat:53.7460, lng:-0.3676, tz:"Europe/London" },
  "Crystal Palace": { name:"Selhurst Park", lat:51.3983, lng:-0.0855, tz:"Europe/London" },
  "Nottingham Forest": { name:"City Ground", lat:52.9400, lng:-1.1327, tz:"Europe/London" },
  "Bournemouth": { name:"Vitality Stadium", lat:50.7348, lng:-1.8383, tz:"Europe/London" },
  "Aston Villa": { name:"Villa Park", lat:52.5092, lng:-1.8850, tz:"Europe/London" },
  "Sunderland": { name:"Stadium of Light", lat:54.9145, lng:-1.3882, tz:"Europe/London" },
  "Fulham": { name:"Craven Cottage", lat:51.4749, lng:-0.2217, tz:"Europe/London" },
  "Como": { name:"Stadio Giuseppe Sinigaglia", lat:45.8139, lng:9.0722, tz:"Europe/Rome" },
  "AS Roma": { name:"Stadio Olimpico", lat:41.9339, lng:12.4547, tz:"Europe/Rome" },
  "Sporting CP": { name:"Estádio José Alvalade", lat:38.7611, lng:-9.1608, tz:"Europe/Lisbon" },
  "RB Leipzig": { name:"Red Bull Arena", lat:51.3458, lng:12.3483, tz:"Europe/Berlin" },
  "Bayern München": { name:"Allianz Arena", lat:48.2189, lng:11.6247, tz:"Europe/Berlin" },
  "Villarreal": { name:"Estadio de la Cerámica", lat:39.9442, lng:-0.1036, tz:"Europe/Madrid" },
  "Atlético Madrid": { name:"Riyadh Air Metropolitano", lat:40.4361, lng:-3.5995, tz:"Europe/Madrid" },
  "Coventry City": { name:"Coventry Building Society Arena", lat:52.4480, lng:-1.4956, tz:"Europe/London" },
};

/* ═══════════ ชุดรายชื่อสำเร็จรูป (จากความจำ ยังไม่ยืนยัน) ═══════════ */
const PRESETS = {
  "Como": { kit:"blue", rows:[
    ["Cesc Fàbregas","ผจก.","1987-05-04"],
    ["Jean Butez","GK","1995-06-08"],["Robert Sánchez","GK","1997-11-18"],["Mauro Vigorito","GK","1990-05-22"],
    ["Marc-Oliver Kempf","DF","1995-01-28"],["Álex Valle","DF","2004-04-25"],["Jacobo Ramón","DF","2005-01-06"],
    ["Alberto Dossena","DF","1998-10-13"],["Kaiki Bruno","DF","2003-03-08"],["Yan Couto","DF","2002-06-03"],
    ["Ivan Smolčić","DF","2000-08-17"],["Trevoh Chalobah","DF","1999-07-05"],
    ["Máximo Perrone","MF","2003-01-07"],["Luis Milla","MF","1994-10-07"],["Lucas Da Cunha","MF","2001-06-09"],
    ["Maxence Caqueret","MF","2000-02-15"],["Nico Paz","MF","2004-09-08"],["Martin Baturina","MF","2003-02-16"],
    ["Samuele Ricci","MF","2001-08-21"],
    ["Anastasios Douvikas","FW","1999-08-02"],["Assane Diao","FW","2005-09-07"],["Jesús Rodríguez","FW","2005-11-21"],
    ["Jayden Addai","FW","2005-08-26"],["Moise Kean","FW","2000-02-28"]
  ] },
  "AS Roma": { kit:"red", rows:[
    ["Gian Piero Gasperini","ผจก.","1958-01-26","v"],
    ["Mile Svilar","GK","1999-08-27"],["Pierluigi Gollini","GK","1995-03-18"],["Giorgio De Marzi","GK","2007-04-18"],
    ["Devis Vásquez","GK","1998-05-12"],
    ["Devyne Rensch","DF","2003-01-18"],["Konstantinos Koulierakis","DF","2003-11-28"],["Evan Ndicka","DF","1999-08-20"],
    ["Nahuel Molina","DF","1998-04-06"],["Mario Hermoso","DF","1995-06-18"],["Gianluca Mancini","DF","1996-04-17"],
    ["Leonardo Balerdi","DF","1999-01-26"],["Jan Ziółkowski","DF","2005-06-05"],["Wesley","DF","2003-09-06"],
    ["Daniele Ghilardi","DF","2003-01-06"],
    ["Emanuele Lulli","DF","2007-08-17"],
    ["Bryan Cristante","MF","1995-03-03"],["Lorenzo Pellegrini","MF","1996-06-19"],["Manu Koné","MF","2001-05-17"],
    ["Niccolò Pisilli","MF","2004-09-23"],["Rodrigo Mora","MF","2007-05-05"],
    ["Marten de Roon","MF","1991-03-29"],
    ["Santiago Castro","FW","2004-09-18"],["Donyell Malen","FW","1999-01-19"],["Matías Soulé","FW","2003-04-15"],
    ["Paulo Dybala","FW","1993-11-15"],["Robinio Vaz","FW","2007-02-17"]
  ] },
  "Sporting CP": { kit:"green", rows:[
    ["Rui Borges","ผจก.","1981-07-07","v"],
    ["Rui Silva","GK","1994-02-07","v"],["João Virgínia","GK","1999-10-10"],["Diego Callai","GK","2004-07-18"],
    ["Zeno Debast","DF","2003-10-24"],["Gonçalo Inácio","DF","2001-08-25"],
    ["Maximiliano Araújo","MF","2000-02-15"],["Flávio Gonçalves","MF","2007-05-30"],["Giorgi Kochorashvili","MF","1999-06-29"],
    ["Geny Catamo","FW","2001-01-26"]
  ] },
  "RB Leipzig": { kit:"white", rows:[
    ["Martín Demichelis","ผจก.","1980-12-20"],
    ["Ørjan Nyland","GK","1990-09-10","v"],["Maarten Vandevoordt","GK","2002-02-26","v"],["Leopold Zingerle","GK","1994-04-10","v"],
    ["Willi Orbán","DF","1992-11-03","v"],["Maxime Estève","DF","2002-05-26","v"],["Lukas Klostermann","DF","1996-06-03","v"],
    ["Ridle Baku","DF","1998-04-08","v"],["David Raum","DF","1998-04-22","v"],["Castello Lukeba","DF","2002-12-17","v"],
    ["Max Finkgräfe","DF","2004-03-27","v"],["Benjamin Henrichs","DF","1997-02-23","v"],["Abdoul Koné","DF","2005-04-22"],
    ["Christoph Baumgartner","MF","1999-08-01","v"],["Neil El Aynaoui","MF","2001-07-02","v"],["Ezechiel Banzuzi","MF","2005-02-16"],
    ["Assan Ouédraogo","MF","2006-05-09"],["Brajan Gruda","MF","2004-05-31"],["Nicolas Seiwald","MF","2001-05-04"],
    ["Rocco Reitz","MF","2002-05-29"],["Andrija Maksimović","MF","2007-06-05"],
    ["Tidiam Gomis","FW","2006-08-08","v"],["Samba Konaté","FW","2009-02-27","v"]
  ] },
  "Bayern München": { kit:"red", rows:[
    ["Vincent Kompany","ผจก.","1986-04-10"],
    ["Manuel Neuer","GK","1986-03-27","v"],["Sven Ulreich","GK","1988-08-03","v"],["Jonas Urbig","GK","2003-08-08","v"],
    ["Dayot Upamecano","DF","1998-10-27","v"],["Kim Min-jae","DF","1996-11-15","v"],["Jonathan Tah","DF","1996-02-11","v"],
    ["Nathaniel Brown","DF","2003-06-16","v"],["Alphonso Davies","DF","2000-11-02","v"],["Hiroki Itō","DF","1999-05-12","v"],
    ["Sacha Boey","DF","2000-09-13","v"],["Josip Stanišić","DF","2000-04-02","v"],["Konrad Laimer","DF","1997-05-27","v"],
    ["Joshua Kimmich","MF","1995-02-08"],["Tom Bischof","MF","2005-06-28","v"],["Jamal Musiala","MF","2003-02-26"],
    ["Aleksandar Pavlović","MF","2004-05-03"],["Ismael Saibari","MF","2001-01-28"],["Lennart Karl","MF","2008-02-22"],
    ["Harry Kane","FW","1993-07-28"],["Michael Olise","FW","2001-12-12"],["Luis Díaz","FW","1997-01-13"],
    ["Serge Gnabry","FW","1995-07-14"]
  ] },
  "Villarreal": { kit:"yellow", rows:[
    ["Iñigo Pérez","ผจก.","1988-01-18","v"],
    ["Péter Gulácsi","GK","1990-05-06","v"],["Luiz Júnior","GK","2001-01-14"],["Rubén Gómez","GK","2002-01-24"],
    ["Pau Navarro","DF","2005-04-25","v"],["Renato Veiga","DF","2003-07-29","v"],["Carlos Romero","DF","2001-10-29","v"],
    ["Logan Costa","DF","2001-04-01"],["Alex Freeman","DF","2004-08-09"],["Juan Foyth","DF","1998-01-12"],
    ["Santiago Mouriño","DF","2002-02-13"],["Sergi Cardona","DF","1999-07-08"],
    ["Alberto Moleiro","MF","2003-09-30","v"],["Santi Comesaña","MF","1996-10-05","v"],["Carlos Maciá","MF","2008-09-01","v"],
    ["Pape Gueye","MF","1999-01-24","v"],["Alassane Diatta","MF","2005-05-14"],["Nathan Saliba","MF","2004-02-07"],
    ["Ayoze Pérez","FW","1993-07-29","v"],["Nicolas Pépé","FW","1995-05-29"],["Georges Mikautadze","FW","2000-10-31"]
  ] },
  "Atlético Madrid": { kit:"red", rows:[
    ["Diego Simeone","ผจก.","1970-04-28","v"],
    ["Jan Oblak","GK","1993-01-07","v"],
    ["Marcos Llorente","DF","1995-01-30","v"],
    ["Cristian Romero","DF","1998-04-27","v"],
    ["Robin Le Normand","DF","1996-11-11","v"],
    ["Álex Grimaldo","DF","1995-09-20","v"],
    ["Koke","MF","1992-01-08","v"],
    ["Johnny Cardoso","MF","2001-09-20","v"],
    ["Giuliano Simeone","MF","2002-12-18","v"],
    ["Pablo Barrios","MF","2003-06-15","v"],
    ["Ademola Lookman","FW","1997-10-20","v"],
    ["Jonathan David","FW","2000-01-14","v"]
  ] },
  "Manchester United": { kit:"red", rows:[
    ["Mauricio Pochettino","ผจก.","1972-03-02","w"],
    ["Senne Lammens","GK","2002-07-07","v"],
    ["Karl Darlow","GK","1990-10-08"],
    ["Tom Heaton","GK","1986-04-15"],
    ["Dermot Mee","GK","2002-11-20","v"],
    ["Diogo Dalot","DF","1999-03-18"],
    ["Noussair Mazraoui","DF","1997-11-14"],
    ["Matthijs de Ligt","DF","1999-08-12"],
    ["Harry Maguire","DF","1993-03-05"],
    ["Lisandro Martínez","DF","1998-01-18"],
    ["Leny Yoro","DF","2005-11-13"],
    ["Luke Shaw","DF","1995-07-12"],
    ["Ayden Heaven","DF","2006-09-21","v"],
    ["Harry Amass","DF","2007-03-16","v"],
    ["Mason Mount","MF","1999-01-10"],
    ["Bruno Fernandes","MF","1994-09-08"],
    ["Patrick Dorgu","MF","2004-12-26"],
    ["Andrey Santos","MF","2004-05-03"],
    ["Youri Tielemans","MF","1997-05-07"],
    ["Carlos Baleba","MF","2004-01-03"],
    ["Manuel Ugarte","MF","2001-04-11"],
    ["Shea Lacey","MF","2007-04-14","v"],
    ["Kobbie Mainoo","MF","2005-04-19"],
    ["Jack Fletcher","MF","2007-03-19","v"],
    ["Tyler Fletcher","MF","2007-03-19","v"],
    ["Marcus Rashford","FW","1997-10-31"],
    ["Matheus Cunha","FW","1999-05-27"],
    ["Joshua Zirkzee","FW","2001-05-22"],
    ["Amad Diallo","FW","2002-07-11"],
    ["Bryan Mbeumo","FW","1999-08-07"],
    ["Benjamin Šeško","FW","2003-05-31"],
  ]},
  "Arsenal": { kit:"red", rows:[
    ["Mikel Arteta","ผจก.","1982-03-26"],
    ["David Raya","GK","1995-09-15"],
    ["Kepa Arrizabalaga","GK","1994-10-03"],
    ["Illan Meslier","GK","2000-03-02"],
    ["William Saliba","DF","2001-03-24"],
    ["Cristhian Mosquera","DF","2004-06-27"],
    ["Ben White","DF","1997-10-08"],
    ["Piero Hincapié","DF","2002-01-09"],
    ["Gabriel Magalhães","DF","1997-12-19"],
    ["Jurriën Timber","DF","2001-06-17"],
    ["Ezri Konsa","DF","1997-10-23"],
    ["Riccardo Calafiori","DF","2002-05-19"],
    ["Martin Ødegaard","MF","1998-12-17"],
    ["Mikel Merino","MF","1996-06-22"],
    ["Martín Zubimendi","MF","1999-02-02"],
    ["Bruno Guimarães","MF","1997-11-16"],
    ["Declan Rice","MF","1999-01-14"],
    ["Myles Lewis-Skelly","MF","2006-09-26"],
    ["Max Dowman","MF","2009-12-31","v"],
    ["Bukayo Saka","FW","2001-09-05"],
    ["Eberechi Eze","FW","1998-06-29"],
    ["Viktor Gyökeres","FW","1998-06-04"],
    ["Christos Tzolis","FW","2002-01-30"],
    ["Noni Madueke","FW","2002-03-10"],
    ["Kai Havertz","FW","1999-06-11"],
  ]},
  "Liverpool": { kit:"red", rows:[
    ["Andoni Iraola","ผจก.","1982-06-22"],
    ["Alisson","GK","1992-10-02"],
    ["Giorgi Mamardashvili","GK","2000-09-29"],
    ["Freddie Woodman","GK","1997-03-04"],
    ["Vitezslav Jaros","GK","2001-07-23","v"],
    ["Harvey Davies","GK","2003-09-03","v"],
    ["Lucca Kiaba Brughmans","GK","2008-06-27","v"],
    ["Joe Gomez","DF","1997-05-23"],
    ["Virgil van Dijk","DF","1991-07-08"],
    ["Jeremy Jacquet","DF","2005-07-13","v"],
    ["Milos Kerkez","DF","2003-11-07"],
    ["Conor Bradley","DF","2003-07-09"],
    ["Giovanni Leoni","DF","2006-12-21","v"],
    ["Kostas Tsimikas","DF","1996-05-12"],
    ["Jeremie Frimpong","DF","2000-12-10"],
    ["Ronald Araújo","DF","1999-03-07"],
    ["Ifeanyi Ndukwe","DF","2008-03-03","v"],
    ["Wataru Endo","MF","1993-02-09"],
    ["Florian Wirtz","MF","2003-05-03"],
    ["Dominik Szoboszlai","MF","2000-10-25"],
    ["Alexis Mac Allister","MF","1998-12-24"],
    ["Federico Chiesa","MF","1997-10-25"],
    ["Ryan Gravenberch","MF","2002-05-16"],
    ["Treymaurice Nyoni","MF","2007-06-30","v"],
    ["Alexander Isak","FW","1999-09-21"],
    ["Cody Gakpo","FW","1999-05-07"],
    ["Hugo Ekitike","FW","2002-06-20"],
    ["Victor Munoz","FW","2003-07-13","v"],
    ["Bradley Barcola","FW","2002-09-02"],
    ["Rio Ngumoha","FW","2008-08-29","v"],
    ["Lewis Koumas","FW","2005-09-27"]
  ]},
  "Newcastle United": { kit:"metal", rows:[
    ["Matthias Jaissle","ผจก.","1988-04-05"],
    ["Nick Pope","GK","1992-04-19"],
    ["Lukas Hornicek","GK","2002-07-13","v"],
    ["Ewen Jaouen","GK","2005-12-29","v"],
    ["Mark Gillespie","GK","1992-03-27"],
    ["Tino Livramento","DF","2002-11-12"],
    ["Lewis Hall","DF","2004-09-08"],
    ["Sven Botman","DF","2000-01-12"],
    ["Fabian Schär","DF","1991-12-20"],
    ["Malick Thiaw","DF","2001-08-08"],
    ["Dan Burn","DF","1992-05-09"],
    ["Amar Dedić","DF","2002-10-05"],
    ["Nico González","MF","2002-01-03"],
    ["Joelinton","MF","1996-08-14"],
    ["Aladji Bamba","MF","2006-07-14","v"],
    ["Sean Steur","MF","2008-01-11","v"],
    ["Jacob Murphy","MF","1995-02-24"],
    ["Joe Willock","MF","1999-08-20"],
    ["Jacob Ramsey","MF","2001-05-28"],
    ["Alfie Harrison","MF","2005-11-28","v"],
    ["Lewis Miley","MF","2006-05-01"],
    ["Yoane Wissa","FW","1996-09-03"],
    ["William Osula","FW","2003-08-04"],
    ["Harvey Barnes","FW","1997-12-09"],
    ["Bazoumana Toure","FW","2006-03-02","v"],
    ["Anthony Elanga","FW","2002-04-27"],
    ["Matias Fernandez-Pardo","FW","2005-02-03","v"],
    ["Nick Woltemade","FW","2002-02-14"],
  ]},
  "Tottenham Hotspur": { kit:"metal", rows:[
    ["Roberto De Zerbi","ผจก.","1979-06-06"],
    ["Antonin Kinsky","GK","2003-05-02"],
    ["Martin Dúbravka","GK","1989-01-15"],
    ["Brandon Austin","GK","1999-01-08"],
    ["Andy Robertson","DF","1994-03-11"],
    ["Tosin Adarabioyo","DF","1997-09-24"],
    ["Marcos Senesi","DF","1997-05-10"],
    ["Jan Paul van Hecke","DF","2000-06-08"],
    ["Destiny Udogie","DF","2002-11-28"],
    ["Pedro Porro","DF","1999-09-13"],
    ["Ben Davies","DF","1993-04-24"],
    ["Micky van de Ven","DF","2001-04-19"],
    ["Xavi Simons","MF","2003-04-21"],
    ["Conor Gallagher","MF","2000-02-06"],
    ["James Maddison","MF","1996-11-23"],
    ["Archie Gray","MF","2006-03-12"],
    ["Lucas Bergvall","MF","2006-02-02"],
    ["Sandro Tonali","MF","2000-05-08"],
    ["Savinho","MF","2004-04-10"],
    ["Mateus Fernandes","MF","2004-07-10","v"],
    ["Mohammed Kudus","MF","2000-08-02"],
    ["Dejan Kulusevski","MF","2000-04-25"],
    ["Rodrigo Bentancur","MF","1997-06-25"],
    ["Richarlison","FW","1997-05-10"],
    ["Mathys Tel","FW","2005-04-27"],
    ["Dominic Solanke","FW","1997-09-14"],
    ["Omar Marmoush","FW","1999-02-07"],
    ["Mykhailo Mudryk","FW","2001-01-05"],
    ["Wilson Odobert","FW","2004-11-28"],
    ["Sávio","FW","2004-04-10"],
  ]},
  "Everton": { kit:"water", rows:[
    ["David Moyes","ผจก.","1963-04-25"],
    ["Jordan Pickford","GK","1994-03-07"],
    ["Mark Travers","GK","1999-05-18"],
    ["Tom King","GK","1995-03-09"],
    ["Jarrad Branthwaite","DF","2002-06-27"],
    ["Michael Keane","DF","1993-01-11"],
    ["James Tarkowski","DF","1992-11-19"],
    ["Jake O'Brien","DF","2001-05-15"],
    ["Vitaliy Mykolenko","DF","1999-05-29"],
    ["Ainsley Maitland-Niles","MF","1997-08-29"],
    ["Kiernan Dewsbury-Hall","MF","1998-09-06"],
    ["Jack Grealish","MF","1995-09-10"],
    ["Brennan Johnson","MF","2001-05-23"],
    ["Christian Nørgaard","MF","1994-03-10"],
    ["Carlos Alcaraz","MF","2002-11-30"],
    ["Hayden Hackney","MF","2002-04-15"],
    ["Merlin Rohl","MF","2002-07-05"],
    ["James Garner","MF","2001-03-13"],
    ["Harrison Armstrong","MF","2007-01-19","v"],
    ["Thierno Barry","FW","2002-10-21","v"],
    ["Tyrique George","FW","2006-01-04"],
    ["Tyler Dibling","FW","2006-02-17"],
  ]},
  "Ipswich Town": { kit:"water", rows:[
    ["Gary O'Neil","ผจก.","1983-05-18"],
    ["Alex Palmer","GK","1996-08-10"],
    ["David Button","GK","1989-02-27"],
    ["Christian Walton","GK","1995-11-09"],
    ["Kjell Scherpen","GK","2000-01-23"],
    ["Kayne Van Oevelen","GK","2003-08-08","v"],
    ["Darnell Furlong","DF","1995-10-31"],
    ["Leif Davis","DF","1999-12-07"],
    ["Cédric Kipré","DF","1996-12-09","v"],
    ["Issa Diop","DF","1997-01-09"],
    ["Jacob Greaves","DF","2000-09-19"],
    ["Dara O'Shea","DF","1999-03-04"],
    ["Azor Matusiwa","MF","1998-02-28"],
    ["Sindre Walle Egeli","MF","2006-06-21","v"],
    ["Zian Flemming","MF","1998-09-16"],
    ["Jaden Philogene","MF","2002-02-04"],
    ["Florentino Luis","MF","1999-08-19"],
    ["Jack Taylor","MF","1998-06-23","v"],
    ["Kasey McAteer","MF","2001-11-22","v"],
    ["Saša Lukić","MF","1996-08-13"],
    ["Exequiel Palacios","MF","1998-10-05"],
    ["Marcelino Núñez","MF","2000-02-01"],
    ["Abdoul Ouattara","MF","2005-10-22","v"],
    ["Charlie Compton","MF",""],
    ["Abdul Fatawu","FW","2004-03-06"],
    ["Julio Enciso","FW","2004-01-23"],
    ["Emersonn Da Silva","FW","2004-07-16","v"],
    ["Chuba Akpom","FW","1995-10-09"],
    ["Anis Mehmeti","FW","2001-03-11"],
    ["Daizen Maeda","FW","1997-10-20"],
    ["Jack Clarke","FW","2000-11-23"],
    ["Emersonn","FW","2004-07-16"],
  ]},
  "Brighton": { kit:"blue", rows:[
    ["Fabian Hürzeler","ผจก.","1993-02-26","w"],
    ["Bart Verbruggen","GK","2002-08-18"],
    ["Jason Steele","GK","1990-08-18"],
    ["Tom McGill","GK","2000-03-25"],
    ["Jaouen Hadjam","DF","2003-03-08"],
    ["Pascal Struijk","DF","1999-08-11"],
    ["Lewis Dunk","DF","1991-11-21"],
    ["Costinha","DF","2000-03-26","v"],
    ["Olivier Boscagli","DF","1997-11-18"],
    ["Michael Svoboda","DF","1998-10-15","v"],
    ["Luka Vuskovic","DF","2007-02-24"],
    ["Jack Hinshelwood","MF","2005-04-11"],
    ["Pascal Groß","MF","1991-06-15"],
    ["Kaoru Mitoma","MF","1997-05-20"],
    ["Ferdi Kadıoğlu","MF","1999-10-07"],
    ["Yasin Ayari","MF","2003-10-06"],
    ["Mats Wieffer","MF","1999-11-16"],
    ["Maxime De Cuyper","MF","2000-12-22"],
    ["Matt O'Riley","MF","2000-11-21"],
    ["Malick Yalcouyé","MF","2005-11-18","v"],
    ["Zadok Yohanna","MF","2007-06-29","v"],
    ["Matias Orozco","MF","2007-01-12","v"],
    ["Stefanos Tzimas","FW","2006-01-14"],
    ["Georginio Rutter","FW","2002-04-20"],
    ["Yankuba Minteh","FW","2004-07-22"],
    ["Promise David","FW","2001-07-03","v"],
    ["Ibrahim Osman","FW","2004-11-04"],
    ["Charalampos Kostoulas","FW","2007-05-30","v"],
    ["Evan Ferguson","FW","2004-10-19"],
    ["Femi Azeez","FW","2001-06-05","v"],
    ["Rodrigo Rego","FW","2005-01-03","v"],
    ["Diego Gómez","MF","2003-03-27"],
    ["Chema Andrés","MF","2005-04-25"],
  ]},
  "Leeds United": { kit:"metal", rows:[
    ["Daniel Farke","ผจก.","1976-10-30"],
    ["James Trafford","GK","2002-10-10"],
    ["Michael Zetterer","GK","1995-07-12"],
    ["Alex Cairns","GK","1993-01-04","v"],
    ["Jayden Bogle","DF","2000-07-27"],
    ["Gabriel Gudmundsson","DF","1999-04-29"],
    ["Tarik Muharemović","DF","2003-02-28","v"],
    ["Joe Rodon","DF","1997-10-22"],
    ["James Justin","DF","1998-02-23"],
    ["Melvin Bard","DF","2000-11-06"],
    ["Nico Elvedi","DF","1996-09-30"],
    ["Ethan Ampadu","MF","2000-09-14"],
    ["Daniel James","MF","1997-11-10"],
    ["Sean Longstaff","MF","1997-10-30"],
    ["Harry Wilson","MF","1997-03-22"],
    ["Brenden Aaronson","MF","2000-10-22"],
    ["Jaka Bijol","MF","1999-02-05"],
    ["Anton Stach","MF","1998-11-15"],
    ["Ao Tanaka","MF","1998-09-10"],
    ["Jean Matteo Bahoya","MF","2005-05-07","v"],
    ["Ilia Gruev","MF","2000-05-06"],
    ["Dominic Calvert-Lewin","FW","1997-03-16"],
    ["Lukas Nmecha","FW","1998-12-14"],
    ["Noah Okafor","FW","2000-05-24"],
    ["Mateo Joseph","FW","2003-08-19"],
  ]},
  "Brentford": { kit:"red", rows:[
    ["Keith Andrews","ผจก.","1980-09-13"],
    ["Caoimhin Kelleher","GK","1998-11-23"],
    ["Hakon Valdimarsson","GK","2001-10-13","v"],
    ["Ellery Balcombe","GK","1999-10-15","v"],
    ["Aaron Hickey","DF","2002-06-10"],
    ["Rico Henry","DF","1997-07-08"],
    ["Sepp van den Berg","DF","2001-12-20"],
    ["Kristoffer Ajer","DF","1998-04-17"],
    ["Nathan Collins","DF","2001-04-30"],
    ["Michael Kayode","DF","2004-07-10"],
    ["Kim Ji-soo","DF","2004-12-24"],
    ["Jannik Schuster","DF","2006-05-16","v"],
    ["Benjamin Fredrick","DF","2005-05-28","v"],
    ["Yehor Yarmoliuk","MF","2004-03-01"],
    ["Mathias Jensen","MF","1996-01-01"],
    ["Josh Da Silva","MF","1999-02-23"],
    ["Antoni Milambo","MF","2005-04-03","v"],
    ["Mamadou Sangare","MF","2002-06-26","v"],
    ["Mikkel Damsgaard","MF","2000-07-03"],
    ["Malick Diouf","MF","2004-12-28","v"],
    ["Vitaly Janelt","MF","1998-05-10"],
    ["Kevin Schade","FW","2001-11-22"],
    ["Igor Thiago","FW","2001-06-26"],
    ["Dango Ouattara","FW","2002-02-11"],
    ["Callum Wilson","FW","1992-02-27"],
    ["Fábio Carvalho","FW","2002-08-30"],
    ["Jaidon Anthony","FW","1999-12-01"],
    ["Keane Lewis-Potter","FW","2001-02-22"],
    ["Gustavo Nunes","FW","2005-11-20","v"],
  ]},
  "Hull City": { kit:"gold", rows:[
    ["Sergej Jakirovic","ผจก.","1976-12-23","w"],
    ["Jack Butland","GK","1993-03-10"],
    ["Dillon Phillips","GK","1995-06-11"],
    ["Konstantinos Tzolakis","GK","2002-11-08","v"],
    ["Lewie Coyle","DF","1995-10-15"],
    ["Ryan Giles","DF","1999-11-26"],
    ["Charlie Hughes","DF","2003-10-16","v"],
    ["Semi Ajayi","DF","1993-11-09"],
    ["John Egan","DF","1992-10-20"],
    ["Paddy McNair","DF","1995-04-27"],
    ["Brooke Norton-Cuffy","DF","2004-01-12","v"],
    ["Lucas Herrington","DF","2007-03-06","v"],
    ["Matt Targett","DF","1995-09-18"],
    ["Nobel Mendy","DF","2004-08-16","v"],
    ["Hidemasa Morita","MF","1995-05-10"],
    ["Sorba Thomas","MF","1999-01-25","v"],
    ["Eliot Matazo","MF","2002-02-15"],
    ["Jens Hjerto-Dahl","MF","2005-10-31","v"],
    ["Oscar Zambrano","MF","2004-04-20","v"],
    ["Elliot Stroud","MF","2002-06-22","v"],
    ["Darko Gyabi","MF","2004-02-18","v"],
    ["Matt Crooks","MF","1994-01-20","v"],
    ["Kieran Dowell","MF","1997-10-10"],
    ["Regan Slater","MF","1999-09-11","v"],
    ["Lucas Gourna-Douath","MF","2003-08-05"],
    ["Abdülkadir Ömür","MF","1999-06-25"],
    ["Christos Mouzakitis","MF","2006-12-25","v"],
    ["Tim Iroegbunam","MF","2003-06-30"],
    ["Oli McBurnie","FW","1996-06-04"],
    ["Mohamed Belloumi","FW","2002-06-01","v"],
    ["Joe Gelhardt","FW","2002-05-04"],
    ["David Akintola","FW","1996-01-13","v"],
    ["Robinio Vaz","FW","2007-02-17","v"],
    ["Mohamed-Ali Cho","FW","2004-01-19","v"],
    ["Ilyas Ansah","FW","2004-11-08","v"],
    ["Cody Drameh","DF","2001-12-08"],
    ["Liam Millar","FW","1999-09-27"],
  ]},
  "Crystal Palace": { kit:"blue", rows:[
    ["Thomas Frank","ผจก.","1973-10-09","w"],
    ["Dean Henderson","GK","1997-03-12"],
    ["Remi Matthews","GK","1994-02-10"],
    ["Walter Benítez","GK","1993-01-19"],
    ["Owen Goodman","GK","2003-11-27","v"],
    ["Tyrick Mitchell","DF","1999-09-01"],
    ["Chadi Riad","DF","2003-06-17"],
    ["Axel Disasi","DF","1998-03-11"],
    ["Jaydee Canvot","DF","2006-07-29","v"],
    ["Takehiro Tomiyasu","DF","1998-11-05"],
    ["Chris Richards","DF","2000-03-28"],
    ["Óscar Mingueza","DF","1999-05-13"],
    ["Ben Chilwell","DF","1996-12-21"],
    ["Honest Ahanor","DF","2008-02-23","v"],
    ["Jefferson Lerma","MF","1994-10-25"],
    ["Daichi Kamada","MF","1996-08-05"],
    ["Will Hughes","MF","1995-04-17"],
    ["Adam Wharton","MF","2004-02-06"],
    ["Quinten Timber","MF","2001-06-17"],
    ["Darío Osorio","MF","2004-01-24","v"],
    ["Cheick Doucouré","MF","2000-01-08"],
    ["Ismaila Sarr","FW","1998-02-25"],
    ["Eddie Nketiah","FW","1999-05-30"],
    ["Yéremy Pino","FW","2002-10-20"],
    ["Dwight McNeil","FW","1999-11-22"],
    ["Zavier Gozo","FW","2007-03-22","v"],
    ["Jean-Philippe Mateta","FW","1997-06-28"],
    ["Jørgen Strand Larsen","FW","2000-02-06"],
    ["Anan Khalaili","FW","2004-09-03","v"],
    ["Evann Guessand","FW","2001-07-01"],
  ]},
  "Nottingham Forest": { kit:"red", rows:[
    ["Oliver Glasner","ผจก.","1974-08-28"],
    ["Steven Benda","GK","1998-10-01"],
    ["John Victor","GK","1996-03-11"],
    ["Matz Sels","GK","1992-02-26"],
    ["Ousmane Diomande","DF","2003-12-04"],
    ["Neco Williams","DF","2001-04-13"],
    ["Murillo","DF","2002-05-27"],
    ["Jair Cunha","DF","2005-03-07","v"],
    ["Luca Netz","DF","2003-05-15"],
    ["Daniel Muñoz","DF","1996-05-26"],
    ["Nikola Milenković","DF","1997-10-12"],
    ["Ola Aina","DF","1996-10-08"],
    ["Nicolo Savona","DF","2003-03-19","v"],
    ["Grady McDonnell","DF","2008-02-17","v"],
    ["Ibrahim Sangaré","MF","1997-12-02"],
    ["Nicolás Domínguez","MF","1998-06-28"],
    ["Morgan Gibbs-White","MF","2000-01-27"],
    ["Xaver Schlager","MF","1997-09-28"],
    ["Ryan Yates","MF","1997-11-21"],
    ["James McAtee","MF","2002-10-18"],
    ["Gustavo Sa","MF","2004-11-11","v"],
    ["Callum Hudson-Odoi","FW","2000-11-07"],
    ["Chris Wood","FW","1991-12-07"],
    ["Igor Jesus","FW","2001-01-05"],
    ["Dan Ndoye","FW","2000-10-25"],
    ["Arnaud Kalimuendo","FW","2002-01-20"],
    ["Liam Delap","FW","2003-02-08"],
  ]},
  "Bournemouth": { kit:"red", rows:[
    ["Marco Rose","ผจก.","1976-09-11"],
    ["Đorđe Petrović","GK","1999-10-08"],
    ["Fraser Forster","GK","1988-03-17"],
    ["Michele Di Gregorio","GK","1997-07-27"],
    ["Julián Araujo","DF","2001-08-13"],
    ["Adrien Truffert","DF","2001-11-20"],
    ["James Hill","DF","2002-01-10"],
    ["Julio Soler","DF","2005-05-01"],
    ["António Silva","DF","2003-10-30"],
    ["Adam Smith","DF","1991-04-29"],
    ["Bafode Diakite","DF","2001-01-06"],
    ["Juanlu Sánchez","DF","2003-08-15","v"],
    ["Max Aarons","DF","2000-01-04"],
    ["Alejandro Jimenez","DF","2005-05-08","v"],
    ["Lewis Cook","MF","1997-02-03"],
    ["David Brooks","MF","1997-07-08"],
    ["Alex Scott","MF","2003-08-21"],
    ["Ryan Christie","MF","1995-02-22"],
    ["Tyler Adams","MF","1999-02-14"],
    ["Marcus Tavernier","MF","1999-03-22"],
    ["Alex Toth","MF",""],
    ["Veljko Milosavljevic","MF","2007-06-28","v"],
    ["Ben Winterburn","MF","2004-09-04","v"],
    ["Evanilson","FW","1999-10-06"],
    ["Ben Gannon Doak","FW","2005-11-11"],
    ["Justin Kluivert","FW","1999-05-05"],
    ["Amine Adli","FW","2000-05-10"],
    ["Eli Junior Kroupi","FW","2006-06-23","v"],
    ["Daniel Jebbison","FW","2003-07-11"],
    ["Alvaro Rodriguez","FW","2004-07-14"],
    ["Rayan","FW","2006-08-03","v"],
  ]},
  "Aston Villa": { kit:"red", rows:[
    ["Unai Emery","ผจก.","1971-11-03"],
    ["Zion Suzuki","GK","2002-08-21"],
    ["Marco Bizot","GK","1991-03-10"],
    ["Matty Cash","DF","1997-08-07"],
    ["Victor Lindelöf","DF","1994-07-17"],
    ["Taylor Harwood-Bellis","DF","2002-01-30"],
    ["Tyrone Mings","DF","1993-03-13"],
    ["Pau Torres","DF","1997-01-16"],
    ["Ian Maatsen","DF","2002-03-10"],
    ["Lamare Bogarde","DF","2004-01-05","v"],
    ["Aaron Wan-Bissaka","DF","1997-11-26"],
    ["Samuel Iling-Junior","DF","2003-10-04"],
    ["Ross Barkley","MF","1993-12-05"],
    ["John McGinn","MF","1994-10-18"],
    ["Boubacar Kamara","MF","1999-11-23"],
    ["Emiliano Buendía","MF","1996-12-25"],
    ["Matteo Ruggeri","MF","2002-07-11"],
    ["Amadou Onana","MF","2001-08-16"],
    ["Leon Goretzka","MF","1995-02-06"],
    ["João Gomes","MF","2001-02-12"],
    ["Johan Manzambi","MF","2005-10-14","v"],
    ["Modou Keba Cisse","MF","2005-08-04","v"],
    ["George Hemmings","MF","2007-03-04","v"],
    ["Nicolas Jackson","FW","2001-06-20"],
    ["Alejandro Garnacho","FW","2004-07-01"],
    ["Tammy Abraham","FW","1997-10-02"],
    ["Ibrahim Mbaye","FW","2008-01-24","v"],
    ["Brian Madjo","FW","2009-01-12","v"],
    ["Alysson Edward","FW","2006-05-05","v"],
    ["Alysson","FW","2006-05-05"],
  ]},
  "Sunderland": { kit:"red", rows:[
    ["Régis Le Bris","ผจก.","1975-12-06","w"],
    ["Simon Moore","GK","1990-05-19"],
    ["Robin Roefs","GK","2003-01-17","v"],
    ["Melker Ellborg","GK","2003-05-22","v"],
    ["Kevin Danso","DF","1998-09-19"],
    ["Daniel Ballard","DF","1999-09-22"],
    ["Dayann Methalie","DF","2006-02-15","v"],
    ["Luke O'Nien","DF","1994-11-21"],
    ["Omar Alderete","DF","1996-12-26"],
    ["Reinildo Mandava","DF","1994-01-21"],
    ["Nordi Mukiele","DF","1997-11-01"],
    ["Trai Hume","DF","2002-03-05"],
    ["Aji Alese","DF","2001-01-17","v"],
    ["Alan Browne","MF","1995-04-15"],
    ["Chris Rigg","MF","2007-06-18","v"],
    ["Thomas Meunier","MF","1991-09-12"],
    ["Habib Diarra","MF","2004-01-03","v"],
    ["Noah Sadiki","MF","2005-02-07"],
    ["Enzo Le Fée","MF","2000-02-03"],
    ["Jules Ahoka","MF",""],
    ["Granit Xhaka","MF","1992-09-27"],
    ["Abdoullah Ba","MF","2003-07-31","v"],
    ["Chemsdine Talbi","FW","2005-05-09","v"],
    ["Brian Brobbey","FW","2002-02-01"],
    ["Nilson Angulo","FW","2003-06-19","v"],
    ["Romaine Mundle","FW","2003-04-24","v"],
    ["Wilson Isidor","FW","2000-08-27"],
    ["Malick Fofana","FW","2005-03-31"],
    ["Juan Angulo","FW",""],
    ["Jocelin Ta Bi","FW","2005-02-09"],
    ["Timur Tutierov","FW","2005-06-11"],
  ]},
  "Fulham": { kit:"metal", rows:[
    ["Alvaro Arbeloa","ผจก.","1983-01-17"],
    ["Bernd Leno","GK","1992-03-04"],
    ["Benjamin Lecomte","GK","1991-04-26"],
    ["Kenny Tete","DF","1995-10-09"],
    ["Calvin Bassey","DF","1999-12-31"],
    ["Jorge Cuenca","DF","1999-11-17"],
    ["Joachim Andersen","DF","1996-05-31"],
    ["Timothy Castagne","DF","1995-12-05"],
    ["David Affengruber","DF","2001-01-24"],
    ["Antonee Robinson","DF","1997-08-08"],
    ["Harrison Reed","MF","1995-01-27"],
    ["Cesar Palacios","MF","2004-11-11","v"],
    ["Tom Cairney","MF","1991-01-20"],
    ["Kevin","MF","2003-01-04","v"],
    ["Oscar Bobb","MF","2003-07-12"],
    ["Hugo Larsson","MF","2004-06-27"],
    ["Sander Berge","MF","1998-02-14"],
    ["Shea Charles","MF","2003-11-05"],
    ["Joshua King","MF","2007-01-03","v"],
    ["Ryan Sessegnon","MF","2000-05-18"],
    ["Emile Smith Rowe","MF","2000-07-28"],
    ["Gonzalo García","FW","2004-03-24","v"],
    ["Rodrigo Muniz","FW","2001-05-04"],
    ["Alex Iwobi","FW","1996-05-03"],
    ["Jonah Kusi Asare","FW","2007-07-04","v"],
    ["Manuel Ángel","MF","2004-03-15"],
  ]},
  "Coventry City": { kit:"blue", rows:[
    ["Frank Lampard","ผจก.","1978-06-20"],
    ["Ben Wilson","GK","1992-08-09"],
    ["Carl Rushworth","GK","2001-07-02","v"],
    ["Daniel Bentley","GK","1993-07-13"],
    ["Ethan Pinnock","DF","1993-05-29"],
    ["Jay Dasilva","DF","1998-04-22"],
    ["Bobby Thomas","DF","2001-06-30","v"],
    ["Kaine Kesler-Hayden","DF","2002-10-23","v"],
    ["Jake Bidwell","DF","1993-03-21"],
    ["Joel Latibeaudiere","DF","2000-01-06"],
    ["Aurele Amenda","DF","2003-07-31","v"],
    ["Luke Woolfenden","DF","1998-10-21"],
    ["Milan van Ewijk","DF","2000-09-08","v"],
    ["Jack Rudoni","MF","2001-05-17"],
    ["Matt Grimes","MF","1995-07-15"],
    ["Tatsuhiro Sakamoto","MF","1996-10-22","v"],
    ["Caleb Yirenkyi","MF","2006-01-15","v"],
    ["Frank Onyeka","MF","1998-01-01"],
    ["Josh Eccles","MF","2000-06-04","v"],
    ["Victor Torp","MF","1999-07-30","v"],
    ["Gustavo Hamer","MF","1997-06-24"],
    ["Ellis Simms","FW","2001-01-05"],
    ["Ephron Mason-Clark","FW","1999-08-25","v"],
    ["Haji Wright","FW","1998-03-27"],
    ["Taiwo Awoniyi","FW","1997-08-12"],
    ["Loum Tchaouna","FW","2003-09-08","v"],
    ["Brandon Thomas-Asante","FW","1998-12-29"],
    ["Sidiki Cherif","FW","2006-12-15","v"],
    ["Yann Gboho","FW","2001-01-14","v"],
    ["Stephen Mfuni","DF","2008-01-16"],
  ]},
  "Chelsea": { kit:"blue", rows:[
    ["Xabi Alonso","ผจก.","1981-11-25"],
    ["Emiliano Martínez","GK","1992-09-02"],
    ["Teddy Sharman-Lowe","GK","2003-03-30","v"],
    ["Mike Penders","GK","2005-07-31","v"],
    ["Gaga Slonina","GK","2004-05-15"],
    ["Marco Palestra","DF","2005-03-03","v"],
    ["Wesley Fofana","DF","2000-12-17"],
    ["Valentín Barco","DF","2004-07-23"],
    ["Maxence Lacroix","DF","2000-04-06"],
    ["Levi Colwill","DF","2003-02-26"],
    ["Jorrel Hato","DF","2006-03-07"],
    ["Reece James","DF","1999-12-08"],
    ["Malo Gusto","DF","2003-05-19"],
    ["Pep Chavarría","DF","1998-04-10","v"],
    ["Aaron Anselmino","DF","2005-04-29","v"],
    ["Joshua Acheampong","DF","2006-05-05","v"],
    ["Cole Palmer","MF","2002-05-06"],
    ["Jamie Gittens","MF","2004-08-31"],
    ["Jordan Henderson","MF","1990-06-17"],
    ["Moisés Caicedo","MF","2001-11-02"],
    ["Roméo Lavia","MF","2004-01-06"],
    ["Pedro Neto","FW","2000-03-09"],
    ["João Pedro","FW","2001-09-26"],
    ["Morgan Rogers","FW","2002-07-26"],
    ["Danny Welbeck","FW","1990-11-26"],
    ["Emanuel Emegha","FW","2003-02-03"],
    ["Geovany Quenda","FW","2007-04-30","v"],
    ["Dastan Satpaev","FW","2008-08-12","v"],
    ["Estêvão","FW","2007-04-24"],
    ["Mahdi Nicoll-Jazuli","MF","2010-01-06"],
  ]},
  "Manchester City": { kit:"blue", rows:[
    ["Enzo Maresca","ผจก.","1980-02-10"],
    ["Gianluigi Donnarumma","GK","1999-02-25"],
    ["Marcus Bettinelli","GK","1992-05-24"],
    ["Gerónimo Rulli","GK","1992-05-20"],
    ["Pierce Charles","GK","2005-07-21","v"],
    ["Rúben Dias","DF","1997-05-14"],
    ["Marc Guéhi","DF","2000-07-13"],
    ["Rayan Aït-Nouri","DF","2001-06-06"],
    ["Vitor Reis","DF","2006-03-13"],
    ["Joško Gvardiol","DF","2002-01-23"],
    ["Abdukodir Khusanov","DF","2004-02-29"],
    ["Rico Lewis","DF","2004-11-21"],
    ["Josh Wilson-Esbrand","DF","2002-12-26"],
    ["Elliot Anderson","MF","2002-11-06"],
    ["Mateo Kovačić","MF","1994-05-06"],
    ["Rayan Cherki","MF","2003-08-17"],
    ["Jérémy Doku","MF","2002-05-27"],
    ["Enzo Fernández","MF","2001-01-17"],
    ["Matheus Nunes","MF","1998-08-27"],
    ["Ayyoub Bouaddi","MF","2007-10-02","v"],
    ["Nico O'Reilly","MF","2005-03-21","v"],
    ["Phil Foden","MF","2000-05-28"],
    ["Ryan McAidoo","MF","2008-06-24","v"],
    ["Iliman Ndiaye","FW","2000-03-06"],
    ["Erling Haaland","FW","2000-07-21"],
    ["Allan","FW",""],
    ["Antoine Semenyo","FW","2000-01-07"],
    ["Jeremy Monga","FW","2009-07-10","v"],
    ["Mathys Detourbet","FW","2007-04-29","v"],
    ["Kaden Braithwaite","DF","2008-02-08"],
  ]},
};
/* รหัสผูกกับชื่อ เพื่อให้ตัวจริงที่บันทึกไว้ไม่หลุดเวลาแก้รายชื่อ */
const playerId = (name) => "p" + Math.abs([...(name||"")].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0)).toString(36);
/* w = ตรวจจากเว็บในแชท แยกจาก v ที่อ้นยืนยันเอง จะได้รู้ว่าใครเป็นคนเช็ค */
const SRC_LABEL = { v:"อ้นยืนยันเอง", w:"ตรวจจากเว็บ" };
const presetPlayers = (key) => (PRESETS[key]?.rows||[]).map(([n,pos,b,v])=>
  ({ id:playerId(n), n, pos, b, time:"", ok: v==="v" || v==="w",
     src: SRC_LABEL[v] || "รายชื่อตั้งต้น ยังไม่ตรวจสอบ" }));



/* เติมตัวจริงที่ประกาศแล้ว ให้ครั้งเดียวต่อรุ่น */
function applySeedLineups(list, c) {
  let touched = false;
  buildLineupHistory(c);
  const next = list.map(t => {
    const raw = SEED_LINEUPS[t.name];
    if (!raw) return t;
    /* รับได้สองแบบ — แถวชื่อเฉยๆ คือตัวจริงคาดการณ์
       ส่วน { start, confirmed, forDate } คือตัวจริงที่ประกาศจริงของนัดนั้น */
    const xi = Array.isArray(raw) ? raw : (raw.start || []);
    const pool = c[t.slug] || [];
    const ids = xi.map(n => pool.find(x => (x.n||x.th) === n)?.id).filter(Boolean);
    if (ids.length !== xi.length) return t;
    touched = true;
    return { ...t, lineupAt:new Date().toISOString(),
      lineup:{ start:ids,
        kit: Array.isArray(raw) ? null : (raw.kit || null),
        confirmed: Array.isArray(raw) ? false : !!raw.confirmed,
        forDate:   Array.isArray(raw) ? null  : (raw.forDate || null) } };
  });
  return { list: next, touched };
}

/* ═══════════ แอป ═══════════ */
export default function App() {
  const [teams, setTeams] = useState([]);          // [{slug,name,kit}]
  const [cache, setCache] = useState({});          // slug -> players[]
  const [fx, setFx] = useState({ home:null, away:null, date:todayISO(), time:"", dur:115, homeSlot:"home", awaySlot:"away" });
  const [tab, setTab] = useState("compare");
  const [editSlug, setEditSlug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [results, setResults] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [cards, setCards] = useState([]);
  const [ratings, setRatings] = useState([]);

  const flash = (m) => { setToast(m); setTimeout(()=>setToast(""), 2200); };

  useEffect(() => { (async () => {
    try {
      {
        let rl = await readJson(RATINGS_KEY, []);
        if (await readJson("bazi:ratingseed", 0) < RATING_SEED_VERSION) {
          const have = new Set(rl.map(x=>x.id));
          const add = SEED_RATINGS.filter(x=>!have.has(x.id));
          if (add.length) { rl = [...rl, ...add]; await store.set(RATINGS_KEY, JSON.stringify(rl)); }
          await store.set("bazi:ratingseed", JSON.stringify(RATING_SEED_VERSION));
        }
        setRatings(rl);
      }
      {
        let cl = await readJson(CARDS_KEY, []);
        if (await readJson("bazi:cardseed", 0) < CARD_SEED_VERSION) {
          const have = new Set(cl.map(x=>x.id));
          const add = SEED_CARDS.filter(x=>!have.has(x.id));
          if (add.length) { cl = [...cl, ...add]; await store.set(CARDS_KEY, JSON.stringify(cl)); }
          await store.set("bazi:cardseed", JSON.stringify(CARD_SEED_VERSION));
        }
        setCards(cl);
      }
      const pj = await readJson(PREDICT_KEY, []);
      setPredictions(Array.isArray(pj) ? pj : []);
      const rj = await readJson(RESULTS_KEY, null);
      const seedDone = await readJson("bazi:seedv", 0);
      let rlist = Array.isArray(rj) ? rj.filter(g => g && g.home && g.away) : [];
      if (seedDone < SEED_VERSION) {
        const have = new Set(rlist.map(g => `${g.date}|${g.home}|${g.away}`));
        const add = SEED_RESULTS.filter(g => !have.has(`${g.date}|${g.home}|${g.away}`));
        if (add.length) { rlist = [...rlist, ...add]; await store.set(RESULTS_KEY, JSON.stringify(rlist)); }
        await store.set("bazi:seedv", JSON.stringify(SEED_VERSION));
      }
      setResults(rlist);
      const idx = await readJson(IDX, null);
      if (idx?.teams?.length) {
        let list = idx.teams.map(t => RENAME[t.name] ? { ...t, name: RENAME[t.name] } : t);
        list = list.map(t => t.kits ? t : { ...t, kits: kitsFor(t.name) });
        const c = {};
        for (const t of list) c[t.slug] = await readJson(teamKey(t.slug), []);

        // ย้ายรหัสผู้เล่นเก่าให้เป็นรหัสที่ผูกกับชื่อ แล้วย้ายรายชื่อตัวจริงตามไปด้วย
        list = list.map(t => {
          const cur = c[t.slug] || [];
          if (!cur.length || cur.every(x => x.id === playerId(x.n))) return t;
          const map = {};
          for (const x of cur) { const nid = playerId(x.n); map[x.id] = nid; x.id = nid; }
          c[t.slug] = cur;
          if (!t.lineup) return t;
          return { ...t, lineup: {
            start: (t.lineup.start||[]).map(id => map[id] || id),
          } };
        });

        // ชุดข้อมูลรุ่นใหม่ — เติมวันเกิดที่ยังว่าง และเพิ่มผู้เล่นใหม่ โดยไม่ทับของที่แก้เอง
        let filled = 0;
        if (idx.v !== PRESET_VERSION) {
          for (const t of list) {
            const preset = presetPlayers(t.name);
            if (!preset.length) continue;
            let cur = c[t.slug] || [];
            let changed = false;
            /* ผจก. เปลี่ยนคนได้ และการรวมด้านล่างมีแต่ "เพิ่ม" ไม่เคย "เอาออก"
               ถ้าไม่เขี่ยคนเก่าทิ้งก่อน จะเหลือ ผจก. สองคนแล้ว find() หยิบคนเก่ามาใช้ */
            const mgrNow = preset.filter(p => p.pos === "ผจก.").map(p => (p.n||"").toLowerCase());
            if (mgrNow.length) {
              const keep = cur.filter(x => x.pos !== "ผจก." || mgrNow.includes((x.n||"").toLowerCase()));
              if (keep.length !== cur.length) {
                const gone = cur.filter(x => !keep.includes(x)).map(x => x.id);
                cur = keep; changed = true;
                /* ถ้า ผจก. คนเก่าติดอยู่ในรายชื่อตัวจริงที่บันทึกไว้ ให้ถอดออกด้วย */
                if (t.lineup?.start?.some(id => gone.includes(id)))
                  t.lineup = { ...t.lineup, start: t.lineup.start.filter(id => !gone.includes(id)) };
              }
            }
            const byName = new Map(cur.map(x => [(x.n||"").toLowerCase(), x]));
            for (const pp of preset) {
              const ex = byName.get((pp.n||"").toLowerCase());
              if (!ex) { cur.push(pp); changed = true; filled++; continue; }
              if (!ex.b && pp.b) { ex.b = pp.b; ex.ok = pp.ok; ex.src = pp.src; changed = true; filled++; }
              /* วันเกิดที่ยังไม่ตรวจสอบ ถ้าชุดตั้งต้นมีของที่ตรวจแล้ว ให้ทับได้ — ไม่งั้นวันเกิดผิด
                 ที่เคยแจกไปจะค้างในเครื่องตลอด ส่วนของที่อ้นยืนยันเอง (ok) ไม่แตะ */
              else if (pp.ok && !ex.ok) {
                if (ex.b !== pp.b) filled++;
                ex.b = pp.b; ex.ok = true; ex.src = pp.src; changed = true;
              }
            }
            if (changed) { c[t.slug] = cur; await store.set(teamKey(t.slug), JSON.stringify(cur)); }
          }
        }

        // ทีมสำเร็จรูปที่ยังไม่มี ให้สร้างให้เลย
        const missing = Object.keys(PRESETS).filter(n => !list.some(t => t.name === n));
        for (const name of missing) {
          const slug = slugify(name);
          const players = presetPlayers(name);
          list = [...list, { slug, name, kit: PRESETS[name].kit, venue: VENUES[name] || null, kits: kitsFor(name) }];
          c[slug] = players;
          await store.set(teamKey(slug), JSON.stringify(players));
        }
        // ตัวจริงที่ประกาศแล้ว
        let seededXI = false;
        if (await readJson("bazi:lineupseed", 0) < LINEUP_SEED_VERSION) {
          const r = applySeedLineups(list, c);
          list = r.list; seededXI = r.touched;
          await store.set("bazi:lineupseed", JSON.stringify(LINEUP_SEED_VERSION));
        }

        const f = { home: idx.home ?? list[0]?.slug, away: idx.away ?? null, date: idx.date || todayISO(), time: idx.time || "", dur: idx.dur || 115, homeSlot: idx.homeSlot || "home", awaySlot: idx.awaySlot || "away" };
        setTeams(list); setCache(c); setFx(f);
        if (missing.length || seededXI || idx.v !== PRESET_VERSION) {
          await store.set(IDX, JSON.stringify({ teams:list, ...f, v:PRESET_VERSION }));
          if (seededXI) flash("อัปเดตตัวจริงที่ประกาศแล้ว");
          else if (missing.length) flash(`เพิ่มทีมใหม่ ${missing.length} ทีม`);
          else if (filled) flash(`เติมข้อมูลผู้เล่น ${filled} รายการ`);
        }
      } else {
        const legacy = await readJson(OLD, null);
        const t = [], c = {};
        for (const name of Object.keys(PRESETS)) {
          const slug = slugify(name);
          const pl = (name === "Manchester United" && legacy?.squad?.length) ? legacy.squad : presetPlayers(name);
          t.push({ slug, name, kit: PRESETS[name].kit, venue: VENUES[name] || null, kits: kitsFor(name) });
          c[slug] = pl;
          await store.set(teamKey(slug), JSON.stringify(pl));
        }
        const seeded = applySeedLineups(t, c).list;
        await store.set("bazi:lineupseed", JSON.stringify(LINEUP_SEED_VERSION));
        const f = { home:seeded[0]?.slug, away:seeded[1]?.slug ?? null, date:todayISO(), time:"", dur:115, homeSlot:"home", awaySlot:"away" };
        setTeams(seeded); setCache(c); setFx(f);
        await store.set(IDX, JSON.stringify({ teams:seeded, ...f, v:PRESET_VERSION }));
      }
    } catch (e) {
      // เปิดด้วยข้อมูลตั้งต้น ดีกว่าค้างหน้าโหลด
      const t = Object.keys(PRESETS).map(name => ({ slug:slugify(name), name, kit:PRESETS[name].kit, venue:VENUES[name]||null, kits:kitsFor(name) }));
      const c = {};
      for (const x of t) c[x.slug] = presetPlayers(x.name);
      setTeams(t); setCache(c);
      setFx({ home:t[0]?.slug, away:t[1]?.slug ?? null, date:todayISO(), time:"", dur:115, homeSlot:"home", awaySlot:"away" });
    } finally {
      setLoading(false);
    }
  })(); }, []);

  const saveIndex = useCallback(async (t, f) => {
    await store.set(IDX, JSON.stringify({ teams: t ?? teams, ...(f ?? fx), v: PRESET_VERSION }));
  }, [teams, fx]);

  const saveTeam = useCallback(async (slug, players) => {
    setCache((c) => ({ ...c, [slug]: players }));
    const ok = await store.set(teamKey(slug), JSON.stringify(players));
    flash(ok ? "บันทึกแล้ว" : "บันทึกลงเครื่องไม่ได้ ข้อมูลอยู่ชั่วคราว");
  }, []);

  const addTeam = async (name, preset) => {
    const slug = slugify(name);
    if (teams.some(t=>t.slug===slug)) { flash("มีทีมชื่อนี้แล้ว"); return slug; }
    const players = preset ? presetPlayers(preset) : [];
    const kit = preset ? (PRESETS[preset]?.kit || "blue") : "blue";
    const t = [...teams, { slug, name, kit, venue:null, kits: kitsFor(name) }];
    setTeams(t); setCache((c)=>({ ...c, [slug]: players }));
    await store.set(teamKey(slug), JSON.stringify(players));
    await saveIndex(t, null);
    flash(preset ? `เพิ่ม ${name} ${players.length} คน — ยังต้องตรวจสอบ` : `เพิ่ม ${name} แล้ว`);
    return slug;
  };

  const setTeamMeta = async (slug, patch) => {
    const t = teams.map(x=>x.slug===slug?{...x,...patch}:x);
    setTeams(t); await saveIndex(t, null);
  };

  const dropTeam = async (slug) => {
    const t = teams.filter(x=>x.slug!==slug);
    const f = { ...fx, home: fx.home===slug?null:fx.home, away: fx.away===slug?null:fx.away };
    setTeams(t); setFx(f); setEditSlug(null);
    await store.del(teamKey(slug));
    await saveIndex(t, f);
  };


  /* ── บันทึกคำทำนายอัตโนมัติ ──
     บันทึกเฉพาะนัดที่ "ยืนยัน 11 ตัวจริงครบทั้งสองทีมแล้ว" เท่านั้น
     1. ต้องติ๊กว่าเป็นตัวจริงที่ประกาศ ไม่ใช่ตัวจริงคาดการณ์
     2. การยืนยันต้องผูกกับวันของนัดนั้น ไม่ใช่ชุดที่ค้างมาจากนัดก่อน
        ไม่งั้นชุดเดิมจะถูกนับเป็น "ยืนยันแล้ว" ไปตลอดทั้งที่เป็นแค่ชุดล่าสุด
     3. ยังไม่เตะเท่านั้น เตะแล้วห้ามแตะต้อง ไม่งั้นเท่ากับทายย้อนหลัง */
  const autoRef = useRef("");
  useEffect(() => {
    if (!teams.length || !Object.keys(cache).length) return;
    const now = Date.now();
    const bySlug = {}; for (const t of teams) bySlug[t.name] = t;
    const okXI = (t, date) => !!(t?.lineup?.confirmed && t.lineup.forDate === date
                                 && (t.lineup.start||[]).length === 11);
    const upcoming = [...FIXTURES, ...UCL_FIXTURES]
      .filter(f => { const k = kickoffMs(f.date, f.time); return Number.isFinite(k) && k > now; });
    const elo = computeElo(results, teams);
    const rate = OMEN_RATE_DEFAULT;

    const todo = [];
    for (const f of upcoming) {
      const H = bySlug[f.home], A2 = bySlug[f.away];
      if (!H || !A2 || !H.venue) continue;
      if (!okXI(H, f.date) || !okXI(A2, f.date)) continue;
      const id = `${f.date}|${f.home}|${f.away}`;
      if (predictions.some(x => x.id === id && x.lineupSource === "confirmed")) continue;
      const r = analyseMatch(H, A2, { date:f.date, time:f.time, dur:115 }, cache);
      if (!r) continue;
      todo.push({ ...makePrediction({ ...r, thaiDate:f.date, thaiTime:f.time,
        elo: eloPack(elo, f.home, f.away, r.gap, rate), rate, auto:true }),
        lineupSource: "confirmed" });
    }
    if (!todo.length) return;
    const sig = todo.map(x=>x.id).join(",");
    if (autoRef.current === sig) return;
    autoRef.current = sig;
    (async () => {
      const keep = predictions.filter(p => !todo.some(t => t.id === p.id));
      const next = [...keep, ...todo].sort((a,b)=>a.date.localeCompare(b.date));
      setPredictions(next);
      await store.set(PREDICT_KEY, JSON.stringify(next));
      flash(`บันทึกคำทำนายจากตัวจริงที่ประกาศแล้ว ${todo.length} นัด`);
    })();
  }, [teams, cache, predictions, results]);

  /* ลบคำทำนายที่ไม่ได้มาจากตัวจริงที่ประกาศ */
  const purgeUnconfirmed = async () => {
    const next = predictions.filter(p => p.lineupSource === "confirmed" || !p.auto);
    setPredictions(next);
    await store.set(PREDICT_KEY, JSON.stringify(next));
    flash(`ลบแล้ว ${predictions.length - next.length} รายการ`);
  };

  const savePredict = async (rec) => {
    const next = [...predictions.filter(p=>p.id!==rec.id), rec];
    setPredictions(next);
    await store.set(PREDICT_KEY, JSON.stringify(next));
    flash("บันทึกคำทำนายแล้ว");
  };
  const removePredict = async (id) => {
    const next = predictions.filter(p=>p.id!==id);
    setPredictions(next);
    await store.set(PREDICT_KEY, JSON.stringify(next));
  };

  const addCard = async (c) => { const next = [...cards, c]; setCards(next);
    await store.set(CARDS_KEY, JSON.stringify(next)); flash("บันทึกใบแล้ว"); };
  const removeCard = async (id) => { const next = cards.filter(c=>c.id!==id); setCards(next);
    await store.set(CARDS_KEY, JSON.stringify(next)); };

  const addResult = async (g) => { const next = [...results, g]; setResults(next);
    await store.set(RESULTS_KEY, JSON.stringify(next));
    const linked = linkResults(predictions, next);
    if (JSON.stringify(linked) !== JSON.stringify(predictions)) {
      setPredictions(linked); await store.set(PREDICT_KEY, JSON.stringify(linked));
    }
    flash("บันทึกผลแล้ว"); };
  const removeResult = async (id) => { const next = results.filter(g=>g.id!==id); setResults(next);
    await store.set(RESULTS_KEY, JSON.stringify(next)); };

  const setFixture = async (patch) => { const f = { ...fx, ...patch }; setFx(f); await saveIndex(null, f); };

  /* ซิงก์ทีมสำเร็จรูปด้วยมือ เผื่อข้อมูลเดิมค้าง */
  const syncPresets = async () => {
    const missing = Object.keys(PRESETS).filter(n => !teams.some(t => t.name === n));
    if (!missing.length) { flash(`ครบแล้ว ${teams.length} ทีม`); return; }
    let list = [...teams];
    const c = { ...cache };
    for (const name of missing) {
      const slug = slugify(name);
      const players = presetPlayers(name);
      list.push({ slug, name, kit: PRESETS[name].kit, venue: VENUES[name] || null, kits: kitsFor(name) });
      c[slug] = players;
      await store.set(teamKey(slug), JSON.stringify(players));
    }
    setTeams(list); setCache(c);
    await store.set(IDX, JSON.stringify({ teams:list, ...fx, v:PRESET_VERSION }));
    flash(`เพิ่ม ${missing.map(n=>n).join(", ")}`);
  };

  /* ส่วนต่างคะแนนดวงของคู่ที่เลือก ใช้เอียงตารางราคาตลาดในแท็บสถิติ
     ต้องอยู่เหนือ early return ทุกตัว ไม่งั้น React นับ hooks ไม่เท่ากันแล้วพังทั้งแอป */
  const lastGap = useMemo(() => {
    const h = teams.find(t=>t.slug===fx.home);
    const a = teams.find(t=>t.slug===fx.away);
    if (!h || !a) return 0;
    try { const r = analyseMatch(h, a, fx, cache); return r ? r.gap : 0; }
    catch (e) { return 0; }
  }, [teams, cache, fx.home, fx.away, fx.date, fx.time]);

  if (loading) return <Shell><p className="text-stone-500 p-10 text-center text-sm">กำลังเปิดสมุดบันทึก…</p></Shell>;

  const homeT = teams.find(t=>t.slug===fx.home);
  const local = localAtVenue(fx.date, fx.time, homeT?.venue?.tz);
  const day = fourPillars(local.date, local.time);
  const home = teams.find(t=>t.slug===fx.home);
  const away = teams.find(t=>t.slug===fx.away);

  return (
    <Shell>
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-stone-100 text-[17px]">ดวงจีนบอล</h1>
        <p className="text-[11px] text-stone-500 mt-0.5">ฐานข้อมูล {teams.length} ทีม</p>
        {storageDown && (
          <p className="text-[11px] mt-2 px-2.5 py-1.5 rounded-sm" style={{ background:"#3A2A10", color:"#D8A94A" }}>
            เบราว์เซอร์นี้ไม่ยอมให้บันทึกถาวร ข้อมูลจะหายเมื่อปิดแอป
            — ลองเปิดไฟล์ตรงๆ ใน Chrome (ไม่ผ่านแอปจัดการไฟล์) หรือเลิกใช้โหมดไม่ระบุตัวตน
          </p>
        )}
      </header>

      {tab==="compare" && (
        <Compare day={day} local={local} fx={fx} setFixture={setFixture} teams={teams} cache={cache} results={results} predictions={predictions} onSavePredict={savePredict}
          home={home} away={away} onGoTeams={()=>setTab("teams")}
          onLineup={(slug, lineup)=>{ setTeamMeta(slug, { lineup, lineupAt: new Date().toISOString() }); flash('บันทึกตัวจริงแล้ว'); }} />
      )}

      {tab==="stats" && (
        <StatsTab teams={teams} fx={fx} cache={cache} results={results} ratings={ratings} cards={cards} onAddCard={addCard} onRemoveCard={removeCard} onAdd={addResult} onRemove={removeResult}
          predictions={predictions} onRemovePredict={removePredict} onPurge={purgeUnconfirmed} omenGap={lastGap} />
      )}

      {tab==="season" && (
        <SeasonTab teams={teams} results={results} predictions={predictions}
          onPick={async (f)=>{ await setFixture(f); setTab("compare"); }} />
      )}

      {tab==="ucl" && (
        <SeasonTab teams={teams} results={results} predictions={predictions}
          fixtures={UCL_FIXTURES} label="UCL 2026/27 รอบลีกเฟส"
          onPick={async (f)=>{ await setFixture(f); setTab("compare"); }} />
      )}

      {tab==="teams" && (
        <TeamsTab teams={teams} cache={cache}
          onAdd={addTeam} onOpen={setEditSlug} onMeta={setTeamMeta} onSync={syncPresets} />
      )}

      {editSlug && (
        <SquadEditor
          team={teams.find(t=>t.slug===editSlug)}
          players={cache[editSlug]||[]}
          day={day}
          onSave={(pl)=>saveTeam(editSlug, pl)}
          onMeta={(patch)=>setTeamMeta(editSlug, patch)}
          onDelete={()=>dropTeam(editSlug)}
          onClose={()=>setEditSlug(null)} />
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-[12px] z-50"
          style={{ bottom:"calc(72px + env(safe-area-inset-bottom, 0px))", background:"#2A2320", color:"#E9E1D0" }}>
          {toast}
        </div>
      )}

      {/* แถบแท็บล่าง */}
      <nav className="fixed bottom-0 left-0 right-0 z-30"
        style={{ background:"#1C1714", borderTop:"1px solid #302823",
          paddingBottom:"env(safe-area-inset-bottom, 0px)" }}>
        <div className="max-w-md mx-auto flex">
          {[["compare","เปรียบเทียบ","⚖"],["season","ฤดูกาล 2026","◲"],["ucl","UCL","✦"],["stats","สถิติ","▤"],["teams","จัดการทีม","☰"]].map(([k,label,icon])=>{
            const on = tab===k;
            return (
              <button key={k} onClick={()=>setTab(k)}
                className="flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2.5 relative">
                {on && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5" style={{ background:"#8E1418" }} />}
                <span className="text-[16px] leading-none" style={{ color: on?"#D8322C":"#5A4E44" }}>{icon}</span>
                <span className="text-[9.5px] whitespace-nowrap" style={{ color: on?"#E9E1D0":"#6B5D50" }}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </Shell>
  );
}

const OPT = { background:"#211B17", color:"#E9E1D0" };
const HOURS = Array.from({length:24}, (_,i)=>String(i).padStart(2,"0"));
const MINUTES = Array.from({length:12}, (_,i)=>String(i*5).padStart(2,"0"));
const MINUTES_ALL = Array.from({length:60}, (_,i)=>String(i).padStart(2,"0"));

/* ช่องเลือกเวลาแบบ 24 ชม. ไม่ขึ้นกับภาษาของเบราว์เซอร์ */
function TimePick({ value, onChange, fine }) {
  const [h, m] = (value || "").split(":");
  const set = (nh, nm) => onChange(nh && nm ? `${nh}:${nm}` : "");
  const cls = "bg-transparent text-[12.5px] outline-none";
  return (
    <span className="flex items-center gap-0.5 shrink-0" style={{ color:"#C8A24A" }}>
      <select value={h || ""} onChange={e=>set(e.target.value, m || "00")} className={cls}>
        <option value="" style={OPT}>--</option>
        {HOURS.map(x=><option key={x} value={x} style={OPT}>{x}</option>)}
      </select>
      <span style={{ color:"#6B5D50" }}>:</span>
      <select value={m || ""} onChange={e=>set(h || "00", e.target.value)} className={cls}>
        <option value="" style={OPT}>--</option>
        {(fine ? MINUTES_ALL : MINUTES).map(x=><option key={x} value={x} style={OPT}>{x}</option>)}
      </select>
      <span className="text-[10.5px] ml-0.5" style={{ color:"#6B5D50" }}>น.</span>
    </span>
  );
}

/* เรียงทีมตามตัวอักษร */
const sortTeams = (list) => [...list].sort((a,b)=>a.name.localeCompare(b.name, "en"));

const Shell = ({ children }) => (
  <div className="w-full"
    style={{ minHeight:"100dvh", background:"#171310", colorScheme:"dark",
      fontFamily:"'IBM Plex Sans Thai','Noto Sans Thai',system-ui,sans-serif" }}>
    <style>{`
      select { color-scheme: dark; }
      select option { background:#211B17 !important; color:#E9E1D0 !important; }
      select option:checked, select option:hover { background:#8E1418 !important; color:#FFF8EC !important; }
      select optgroup { background:#171310; color:#C8A24A; }
      input[type=date], input[type=time] { color-scheme: dark; }
      input::placeholder { color:#5A4E44; }
    `}</style>
    <div className="max-w-md mx-auto" style={{ paddingBottom:"calc(76px + env(safe-area-inset-bottom, 0px))" }}>{children}</div>
  </div>
);

/* ═══════════ บันทึกคำทำนาย ═══════════
   คีย์ใช้ "วันที่ไทย" ของตารางแข่ง ไม่ใช่วันที่ที่สนาม
   เพราะผลการแข่งที่บันทึกไว้ใช้วันที่ไทย ถ้าใช้วันที่สนามคู่ที่เตะหลังเที่ยงคืน
   (18% ของทั้งฤดูกาล) จะจับคู่กับผลไม่ติดเลยตลอดไป */
function makePrediction({ A, B, day, local, gap, travel, thaiDate, thaiTime, elo, rate, auto }) {
  const bothXI = A.hasLineup && B.hasLineup;
  return {
    id: `${thaiDate}|${A.team.name}|${B.team.name}`,
    savedAt: new Date().toISOString(),
    auto: !!auto,
    quality: bothXI ? "xi" : (A.hasLineup || B.hasLineup ? "half" : "squad"),
    date: thaiDate, kickoff: thaiTime,
    venueDate: local.date, venueTime: local.time,
    home: A.team.name, away: B.team.name,
    homeKit: A.kit.label, awayKit: B.kit.label,
    kitChecked: { home: !!A.kit.checked, away: !!B.kit.checked },
    kitSlot: { home: A.kit.slot || "home", away: B.kit.slot || "away" },
    pillars: { y:gz(day.y), m:gz(day.m), d:gz(day.d), h: day.h?gz(day.h):null },
    lineup: { home: A.field.map(x=>x.p.n||x.p.th), away: B.field.map(x=>x.p.n||x.p.th) },
    gap: +gap.toFixed(4),
    /* เก็บคะแนนแบบตัดดวงผู้เล่นออกคู่ขนานทุกนัด เพื่อเทียบความแม่นสองแบบเมื่อจบฤดูกาล */
    gapNoSquad: +((A.totalNoSquad ?? A.total) - (B.totalNoSquad ?? B.total)).toFixed(4),
    totals: { home:+A.total.toFixed(4), away:+B.total.toFixed(4) },
    totalsNoSquad: { home:+(A.totalNoSquad ?? A.total).toFixed(4), away:+(B.totalNoSquad ?? B.total).toFixed(4) },
    comps: snapshotComponents(A, B, travel),
    schools: Object.fromEntries(schoolResults(A,B,day,local,gap).map(x=>[x.id,{a:+x.a.toFixed(4),b:+x.b.toFixed(4)}])),
    elo: elo ? { ra:+elo.ra.toFixed(1), rb:+elo.rb.toFixed(1),
      pure:{home:+elo.pure.home.toFixed(4),draw:+elo.pure.draw.toFixed(4),away:+elo.pure.away.toFixed(4)},
      mixed:{home:+elo.mixed.home.toFixed(4),draw:+elo.mixed.draw.toFixed(4),away:+elo.mixed.away.toFixed(4)} } : null,
    rate,
    weights: { squad:W_SQUAD, mgr:W_MGR, kit:W_KIT, harmony:W_HARMONY, triple:W_TRIPLE, travel:W_TRAVEL, home:W_HOME },
    version: PRESET_VERSION,
    result: null,
  };
}

/* เวลาเตะเป็นมิลลิวินาที จากวันเวลาไทย */
const kickoffMs = (date, time) => {
  const t = new Date(`${date}T${(time||"21:00")}:00+07:00`).getTime();
  return Number.isFinite(t) ? t : NaN;
};

const eloPack = (elo, aName, bName, gap, rate) => {
  const ra = elo.rating[aName] ?? ELO_START, rb = elo.rating[bName] ?? ELO_START;
  const shift = Math.max(-OMEN_CAP, Math.min(OMEN_CAP, gap * rate));
  return { ra, rb,
    pure: eloForecast(elo.rating, aName, bName),
    mixed: eloForecast({ ...elo.rating, [aName]: ra + shift }, aName, bName) };
};

/* ═══════════ แกนคำนวณกลาง ═══════════
   หน้าเปรียบเทียบกับการบันทึกคำทำนายอัตโนมัติต้องใช้โค้ดชุดเดียวกัน
   ไม่งั้นตัวเลขบนจอกับตัวเลขที่บันทึกไว้จะค่อยๆ เพี้ยนออกจากกัน */
/* วันที่ตามเวลาสนามของนัดในตาราง (ตารางเก็บเป็นเวลาไทย)
   ใช้เป็นกุญแจเดียวของผล ตัวจริง ใบ และประวัติรายนัด */
function matchKeyDate(fx, teamsByName) {
  const tz = (teamsByName && teamsByName[fx.home] && teamsByName[fx.home].tz) || "Europe/London";
  const L = localAtVenue(fx.date, fx.time || "21:00", tz);
  return L ? L.date : fx.date;
}

/* ═══════════ ประวัติตัวจริงรายนัด ═══════════
   ปัญหาเดิม: SEED_LINEUPS เก็บทีมละรายการเดียว พอบันทึกตัวจริงนัดใหม่
   ตัวจริงชุดนั้นก็ถูกใช้ย้อนไปคิดคะแนนนัดเก่าทั้งฤดูกาล ทำให้สถิติความแม่น
   ถูกเขียนทับเงียบ ๆ ทุกครั้งที่อัพเดทตัวจริง — วัดอะไรก็ไม่นิ่ง

   โครงใหม่สองชั้น
   ชั้น 1  คนที่มีคะแนนรายบุคคลในนัดนั้น = คนที่ลงสนามจริง (ตัวจริง + ตัวสำรองที่ได้ลง)
           ได้มาฟรีจาก SEED_RATINGS ไม่ต้องเก็บข้อมูลซ้ำ  ครอบคลุมทุกนัดที่เก็บคะแนนไว้
   ชั้น 2  SEED_XI — ตัวจริง 11 คนที่ประกาศจริง ถ้ามีให้ทับชั้น 1
           นัดใหม่ตั้งแต่นี้ไปจะมีชั้น 2 ครบ เพราะเราบันทึกตอนอัพเดทตัวจริงอยู่แล้ว

   ผลคือคะแนนของนัดที่จบแล้วนิ่งถาวร ไม่ขยับตามการอัพเดทตัวจริงนัดใหม่อีก */
let LINEUP_HIST = {};
function buildLineupHistory(c) {
  const out = {};
  const resolve = (slug, names) => {
    const pool = c[slug] || [];
    return (names||[]).map(n => pool.find(x => (x.n||x.th) === n)?.id).filter(Boolean);
  };
  /* ชั้น 1 — จากคะแนนรายบุคคล */
  const seen = {};
  for (const r of SEED_RATINGS) {
    const k = r.date + "|" + slugify(r.team);
    (seen[k] = seen[k] || []).push(r.player);
  }
  for (const k of Object.keys(seen)) {
    const ids = resolve(k.split("|")[1], seen[k]);
    if (ids.length >= 9) out[k] = { start: ids, kit: null, src: "played", n: ids.length };
  }
  /* ชั้น 2 — ตัวจริงที่ประกาศจริง ทับชั้น 1 */
  for (const key of Object.keys(SEED_XI)) {
    const [date, team] = key.split("|");
    const rec = SEED_XI[key];
    const ids = resolve(slugify(team), rec.start || rec);
    if (ids.length >= 9) out[date + "|" + slugify(team)] =
      { start: ids, kit: rec.kit || null, src: "xi", n: ids.length };
  }
  LINEUP_HIST = out;
  return out;
}

function teamSide(team, slot, day, segs, dayEl, cache, matchDate) {
  if (!team) return null;
  const players = (cache[team.slug]||[]).map(p=>({ p, s:scorePlayer(p, day, segs) })).filter(x=>x.s);
  /* นัดที่จบแล้วใช้ตัวจริงของนัดนั้น ไม่ใช่ตัวจริงชุดล่าสุด */
  const hist = matchDate ? LINEUP_HIST[matchDate + "|" + team.slug] : null;
  const lu = hist
    ? { start:hist.start, kit:hist.kit, confirmed:true, forDate:matchDate, src:hist.src }
    : (team.lineup || null);
  const kit = wornKit(hist ? { ...team, lineup:lu } : team, slot, matchDate);
  const kv = kitVerdict(kit.el, dayEl);
  const mgr = players.find(x=>x.p.pos==="ผจก.") || null;
  const all = players.filter(x=>x.p.pos!=="ผจก.");
  const pickIds = (ids) => (ids||[]).map(id=>all.find(x=>x.p.id===id)).filter(Boolean);
  const starters = lu ? pickIds(lu.start) : [];
  const hasLineup = starters.length > 0;
  const field = hasLineup ? starters : all;
  const avg = field.length ? field.reduce((a,x)=>a+x.s.raw,0)/field.length : 0;
  const byPos = {};
  for (const pos of POS_ORDER) {
    const g = field.filter(x=>x.p.pos===pos);
    byPos[pos] = g.length ? { n:g.length, avg:g.reduce((a,x)=>a+x.s.raw,0)/g.length } : null;
  }
  const harm = teamHarmony(field);
  const total = avg*W_SQUAD + kv.w*W_KIT + (mgr ? mgr.s.raw*W_MGR : 0) + harm.w;
  /* คะแนนอีกแบบ ตัดดวงผู้เล่นออก เก็บคู่ขนานไว้เทียบความแม่นเมื่อจบฤดูกาล */
  const totalNoSquad = total - avg*W_SQUAD;
  const sorted = field.slice().sort((x,y)=>y.s.raw-x.s.raw);
  const tiers = { good:[], mid:[], bad:[] };
  for (const x of sorted) tiers[tierOf(x.s.raw)].push(x);
  return { team, players, all, field, starters, hasLineup, kit, kv, mgr, avg, byPos, total, totalNoSquad, harm, tiers,
    lineupSrc: hist ? hist.src : (team.lineup ? "current" : "squad"),
    missing:(cache[team.slug]||[]).length-players.length };
}

function buildSides(home, away, fx, day, segs, dayEl, cache, local) {
  /* วันที่ใช้เป็นกุญแจของนัด = วันตามเวลาสนาม ไม่ใช่วันตามเวลาไทย
     คู่ที่เตะ 00:30 เวลาไทย คือคู่ของเย็นวันก่อนหน้าที่สนาม
     ผล ตัวจริง และประวัติรายนัด เก็บด้วยวันสนามทั้งหมด จึงต้องค้นด้วยวันเดียวกัน
     ถ้าใช้วันไทยจะหาประวัติไม่เจอใน 61 นัดของฤดูกาลที่เตะข้ามเที่ยงคืน */
  const key = (local && local.date) || fx.date;
  let A = teamSide(home, fx.homeSlot||"home", day, segs, dayEl, cache, key);
  let B = teamSide(away, fx.awaySlot||"away", day, segs, dayEl, cache, key);
  const travel = (A && B) ? travelRead(B.team, A.team, day) : null;
  if (A && B) {
    A = { ...A, homeEdge: W_HOME, total: A.total + W_HOME, totalNoSquad: A.totalNoSquad + W_HOME };
    B = { ...B, homeEdge: 0, travel, total: B.total + (travel ? travel.effect : 0),
          totalNoSquad: B.totalNoSquad + (travel ? travel.effect : 0) };
  }
  return { A, B, travel };
}

/* วิเคราะห์นัดใดก็ได้โดยไม่ต้องผ่านหน้าจอ ใช้ตอนบันทึกอัตโนมัติ */
function analyseMatch(homeTeam, awayTeam, fxLike, cache) {
  if (!homeTeam || !awayTeam) return null;
  const local = localAtVenue(fxLike.date, fxLike.time || "21:00", homeTeam.venue?.tz);
  const day = fourPillars(local.date, local.time);
  if (!day) return null;
  const segs = hourSegments(day.d[0], local.time, fxLike.dur || 115);
  const dayEl = STEM_EL[day.d[0]];
  const { A, B, travel } = buildSides(homeTeam, awayTeam, fxLike, day, segs, dayEl, cache, local);
  if (!A || !B) return null;
  return { A, B, travel, day, local, segs, dayEl, gap: A.total - B.total };
}

/* ═══════════ หน้าเปรียบเทียบ ═══════════ */
function Compare({ day, local, fx, setFixture, teams, cache, results, predictions, onSavePredict, home, away, onGoTeams, onLineup }) {
  const [pick, setPick] = useState(null);
  const dayEl = STEM_EL[day.d[0]];
  const luckyEl = CONTROLS[dayEl];
  const clashB = (day.d[1]+6)%12;

  const segs = hourSegments(day.d[0], local.time, fx.dur || 115);
  const { A, B, travel } = buildSides(home, away, fx, day, segs, dayEl, cache, local);

  if (!A || !B) return (
    <div className="px-4 space-y-3">
      <Step n="1" title="เลือกทีม">
        <div className="flex items-start gap-2">
          {[["home","เจ้าบ้าน"],["away","ทีมเยือน"]].map(([key,role],i)=>(
            <div key={key} className={"flex-1 min-w-0 "+(i?"text-right":"")}>
              <p className="text-[10px]" style={{ color:"#6B5D50" }}>{role}</p>
              <select value={fx[key]||""} onChange={e=>setFixture({[key]:e.target.value})}
                className={"w-full bg-transparent text-[13.5px] text-stone-100 outline-none "+(i?"text-right":"")}>
                <option value="" style={OPT}>— เลือก —</option>
                {sortTeams(teams).map(t=><option key={t.slug} value={t.slug} style={OPT}>{t.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      </Step>
      <div className="p-5 rounded-sm text-center" style={{ background:"#211B17", border:"1px dashed #3A302A" }}>
        <p className="text-[13px] text-stone-400">เลือกครบสองทีมแล้วขั้นตอนที่เหลือจะขึ้นมาเอง</p>
        <button onClick={onGoTeams} className="mt-3 px-4 py-2 rounded-sm text-[12.5px]" style={{ background:"#8E1418", color:"#FBF3E2" }}>
          ไปเพิ่มทีมคู่แข่ง
        </button>
      </div>
    </div>
  );

  const gap = A.total - B.total;
  const lean = Math.max(-1, Math.min(1, gap/4));
  const predId = `${local.date}|${A?.team.name}|${B?.team.name}`;
  const saved = (predictions||[]).some(p => p.id === predId);
  const V = buildVerdict(A, B, day, gap, travel);
  const cA = readable(A.kit.hex), cB = readable(B.kit.hex);
  const P = buildPoints(A, B, day, travel);
  const ready = A.hasLineup && B.hasLineup;

  return (
    <div className="px-4 space-y-3">

      <Step n="1" title="เลือกทีม">
        <div className="flex items-start gap-2">
          {[[fx.home,"home","เจ้าบ้าน",false],[fx.away,"away","ทีมเยือน",true]].map(([slug,key,role,right],i)=>(
            <React.Fragment key={key}>
              {i===1 && (
                <button onClick={()=>setFixture({ home:fx.away, away:fx.home, homeSlot:"home", awaySlot:"away" })}
                  className="shrink-0 w-8 h-8 mt-3 rounded-sm text-[13px]" style={{ background:"#2A2320", color:"#C8A24A" }}>⇄</button>
              )}
              <div className={"flex-1 min-w-0 "+(right?"text-right":"")}>
                <p className="text-[10px]" style={{ color:"#6B5D50" }}>{role}</p>
                <select value={slug||""} onChange={e=>setFixture({[key]:e.target.value})}
                  className={"w-full bg-transparent text-[13.5px] text-stone-100 outline-none "+(right?"text-right":"")}>
                  {sortTeams(teams).map(t=><option key={t.slug} value={t.slug} style={OPT}>{t.name}</option>)}
                </select>
              </div>
            </React.Fragment>
          ))}
        </div>
      </Step>

      <Step n="2" title="เลือกชุดที่ใส่">
        {[[A,"homeSlot"],[B,"awaySlot"]].map(([S,key],i)=>(
          <div key={key} className="py-2" style={{ borderTop: i?"1px solid #2A2320":"none" }}>
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-sm shrink-0 border" style={{ background:S.kit.hex, borderColor:"rgba(255,255,255,.2)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px]" style={{ color:"#6B5D50" }}>{S.team.name}</p>
                <p className="text-[12.5px] text-stone-200 truncate">{S.kit.label}</p>
              </div>
              <select value={fx[key] || (key==="homeSlot"?"home":"away")}
                onChange={e=>setFixture({ [key]: e.target.value })}
                className="bg-transparent text-[12px] outline-none shrink-0" style={{ color:"#C8A24A" }}>
                {SLOTS.map(([v,l])=><option key={v} value={v} style={OPT}>{l}</option>)}
              </select>
            </div>
            <div className="flex items-baseline gap-2 mt-1 ml-[38px]">
              <span className="text-[11px]" style={{ color:"#7A6A57" }}>ธาตุ{EL[S.kit.el]} · {S.kv.note}</span>
              <span className="text-[11.5px] ml-auto" style={{ color: S.kv.w>0?TONE.good:S.kv.w<0?TONE.bad:TONE.mid }}>
                {S.kv.w>0?"+":""}{S.kv.w} {S.kv.label}
              </span>
            </div>
          </div>
        ))}
      </Step>

      <Step n="3" title="เลือกวันและเวลา">
        <div className="flex items-center gap-2 pb-2">
          <span className="text-[10.5px] shrink-0" style={{ color:"#6B5D50" }}>เวลาไทย</span>
          <input type="date" value={fx.date} onChange={e=>setFixture({date:e.target.value})}
            className="flex-1 bg-transparent text-[12.5px] outline-none" style={{ color:"#C8A24A" }} />
          <TimePick value={fx.time||""} onChange={v=>setFixture({time:v})} />
          {fx.time && <button onClick={()=>setFixture({time:""})} className="text-[11px]" style={{ color:"#6B5D50" }}>ล้าง</button>}
        </div>
        {fx.time && (
          <div className="flex items-center gap-2 pb-2">
            <span className="text-[10.5px] shrink-0" style={{ color:"#6B5D50" }}>ช่วงแข่ง</span>
            <select value={fx.dur || 115} onChange={e=>setFixture({dur:Number(e.target.value)})}
              className="flex-1 bg-transparent text-[12px] outline-none" style={{ color:"#C8A24A" }}>
              {DURATIONS.map(([v,l])=><option key={v} value={v} style={OPT}>{l}</option>)}
            </select>
          </div>
        )}
        <p className="text-[11px] leading-relaxed pb-2" style={{ color: local.shifted ? "#D8A94A" : "#6B5D50" }}>
          {local.time
            ? `เวลาที่สนาม ${local.date} ${local.time} น.${local.shifted ? " (คนละวันกับเวลาไทย ระบบคิดจากวันที่สนาม)" : ""}`
            : "ยังไม่ใส่เวลา ระบบจะคิดจากวันที่ที่กรอกโดยตรง"}
        </p>

        <div className="rounded-sm flex items-stretch overflow-hidden" style={{ background:"#E9E1D0" }}>
          <div className="px-4 py-3 text-center" style={{ background:"#8E1418" }}>
            <div style={{ fontFamily:"'Songti SC','Noto Serif SC','SimSun',serif", fontSize:"34px", lineHeight:1, color:"#F2D89A" }}>
              <div>{STEMS[day.d[0]]}</div><div>{BRANCHES[day.d[1]]}</div>
            </div>
          </div>
          <div className="flex-1 px-3 py-2.5 text-[11.5px]" style={{ color:"#3A2E24" }}>
            <p className="text-[13px] mb-1">วัน{gzTh(day.d)} · ปี{ZODIAC[day.d[1]]} ธาตุ{EL[dayEl]}</p>
            <p style={{ color:"#7A6A57" }}>{gz(day.y)} {gz(day.m)}</p>
            {segs && (
              <p className="mt-1" style={{ color:"#3A2E24" }}>
                คาบ{segs.length>1?" 2 ยาม":"ยามเดียว"} — {segs.map(sg=>
                  `${STEMS[sg.stem]}${BRANCHES[sg.b]} ยาม${ZODIAC[sg.b]} ${Math.round(sg.share*100)}%`).join(" · ")}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full border" style={{ background:EL_HEX[luckyEl], borderColor:"rgba(0,0,0,.3)" }} />
                สีเฮง {EL[luckyEl]}
              </span>
              <span style={{ color:"#8E1418" }}>ชงปี{ZODIAC[clashB]}</span>
            </div>
          </div>
        </div>

        <div className="mt-2 pt-2 text-[11.5px] leading-relaxed" style={{ borderTop:"1px solid #2A2320", color:"#A79684" }}>
          {travel
            ? <>สนาม {A.team.venue?.name} · {B.team.name} เดินทางไปทาง{DIR_TH[travel.br]} {travel.km.toFixed(0)} กม. —
                ทิศนี้ <span style={{ color:REL_HEX[travel.rel.key] }}>{travel.rel.label}</span>กับวัน
                ({travel.effect>0?"+":""}{travel.effect.toFixed(2)})</>
            : "ใส่พิกัดสนามทั้งสองทีมในหน้าจัดการทีม เพื่อคำนวณทิศเดินทาง"}
        </div>
      </Step>

      <Step n="4" title="เลือก 11 ตัวจริง">
        <LineupRow A={A} B={B} cA={cA} cB={cB} onPick={setPick} />
      </Step>


      {/* ── 6 ผลการคำนวณ ── */}
      <div className="rounded-sm overflow-hidden" style={{ background:"#211B17", border:"1px solid #302823" }}>
        <div className="flex items-center gap-2 px-3 py-2" style={{ background:"#2A2320" }}>
          <span className="w-5 h-5 rounded-full text-[11px] flex items-center justify-center shrink-0"
            style={{ background:"#8E1418", color:"#FBF3E2" }}>6</span>
          <span className="text-[12px]" style={{ color:"#C8A24A" }}>ผลการคำนวณ</span>
          {!ready && <span className="text-[10.5px] ml-auto text-right" style={{ color:"#D8A94A" }}>
            {[A,B].filter(x=>!x.hasLineup).map(x=>x.team.name).join(" · ")} ยังไม่จัดตัว คิดจากทั้งทีม</span>}
        </div>

        <div className="px-3 py-3" style={{ background: V.tie ? "#211B17" : (V.winner===A ? A.kit.hex : B.kit.hex) }}>
          <p className="text-[15px]" style={{ color: V.tie ? "#C9BCAB" : (lightKit(V.winner.kit.hex) ? "#1A1512" : "#FFF8EC") }}>
            {V.tie ? "สูสี ฤกษ์ไม่เข้าข้างใคร" : `วันนี้เข้าทาง ${V.winner.team.name}`}
          </p>
          <p className="text-[11.5px] mt-0.5" style={{ color: V.tie ? "#8B7C6C" : (lightKit(V.winner.kit.hex) ? "rgba(26,21,18,.75)" : "rgba(255,248,236,.85)") }}>
            ห่างกัน {Math.abs(gap).toFixed(2)} แต้ม
          </p>
        </div>

        <div className="px-3 py-3" style={{ borderTop:"1px solid #2A2320" }}>
          <div className="flex items-end justify-between mb-2 gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] truncate" style={{ color:"#8B7C6C" }}>{A.team.name}</p>
              <p className="text-[19px] leading-tight" style={{ color:cA }}>{A.total>0?"+":""}{A.total.toFixed(2)}</p>
            </div>
            <span className="text-[10px] shrink-0 pb-1" style={{ color:"#6B5D50" }}>คะแนนรวม</span>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[10.5px] truncate" style={{ color:"#8B7C6C" }}>{B.team.name}</p>
              <p className="text-[19px] leading-tight" style={{ color:cB }}>{B.total>0?"+":""}{B.total.toFixed(2)}</p>
            </div>
          </div>

          <div className="relative h-7 rounded-sm overflow-hidden"
            style={{ background:"#0E0B09", border:"1px solid #3A302A" }}>
            <div className="absolute inset-y-0 transition-all duration-500"
              style={{ background: lean>=0?cA:cB,
                left: lean>=0 ? `${50-lean*50}%` : "50%", width:`${Math.abs(lean)*50}%` }} />
            <div className="absolute inset-y-0 left-1/2 w-0.5 z-20" style={{ background:"#F0E6D2" }} />
            <div className="absolute inset-0 flex items-center justify-center z-30">
              <span className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background:"rgba(14,11,9,.82)", color:"#E9E1D0" }}>
                {Math.abs(gap) < 0.4 ? "สูสี" : `${gap>0?A.team.name:B.team.name} นำ ${Math.abs(gap).toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        <OmenElo A={A} B={B} gap={gap} teams={teams} results={results}
          rate={fx.omenRate ?? OMEN_RATE_DEFAULT} onRate={(v)=>setFixture({omenRate:v})} cA={cA} cB={cB}
          saved={saved}
          onSave={(elo)=>onSavePredict(makePrediction({
            A, B, day, local, gap, travel,
            thaiDate: fx.date, thaiTime: fx.time,
            elo, rate: fx.omenRate ?? OMEN_RATE_DEFAULT, auto:false,
          }))} />

        {V.rows.map((r,idx)=>(
          <div key={idx} className="flex items-center gap-2 px-3 py-2" style={{ borderTop:"1px solid #2A2320" }}>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[12px] truncate" style={{ color: TONE[r.a.tone] }}>{r.a.text}</p>
            </div>
            <div className="w-[62px] shrink-0 text-center">
              <p className="text-[10.5px]" style={{ color:"#6B5D50" }}>{r.head}</p>
              <p className="text-[11px]" style={{ color: r.win===0 ? "#6B5D50" : (r.win<0 ? cA : cB) }}>
                {r.win===0 ? "เสมอ" : (r.win<0 ? "◀" : "▶")}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] truncate" style={{ color: TONE[r.b.tone] }}>{r.b.text}</p>
            </div>
          </div>
        ))}

      <div style={{ borderTop:"1px solid #2A2320" }}>
        <p className="px-3 py-1.5 text-[10.5px]" style={{ color:"#6B5D50" }}>ผู้จัดการทีม</p>
        <div className="flex items-stretch gap-px" style={{ background:"#2A2320" }}>
          {[[A,cA],[B,cB]].map(([S,col],i)=>(
            <div key={i} className="flex-1 min-w-0 p-3 text-center" style={{ background:"#211B17" }}>
              {S.mgr ? (<>
                <p className="text-[12px] truncate" style={{ color:col }}>{S.mgr.p.n||S.mgr.p.th}</p>
                <div className="my-1" style={{ fontFamily:"'Songti SC','Noto Serif SC',serif", fontSize:"30px", lineHeight:1.1, color:EL_HEX[STEM_EL[S.mgr.s.pil.y[0]]] }}>
                  {gz(S.mgr.s.pil.y)}
                </div>
                <p className="text-[11px]" style={{ color:"#8B7C6C" }}>ปี{ZODIAC[S.mgr.s.pil.y[1]]} · {S.mgr.p.b}</p>
                <p className="text-[11px] mt-1" style={{ color:REL_HEX[S.mgr.s.relY.key] }}>{S.mgr.s.relY.label}กับวัน</p>
                <p className="text-[10.5px] mt-1" style={{ color:"#6B5D50" }}>
                  เสาวัน {gz(S.mgr.s.pil.d)} · ธาตุ{EL[S.mgr.s.myEl]}
                </p>
                <p className="text-[10.5px]" style={{ color:REL_HEX[S.mgr.s.relD.key] }}>วันเกิด{S.mgr.s.relD.label}</p>
                <p className="text-[13px] mt-1.5"
                  style={{ color: S.mgr.s.raw>0?TONE.good : S.mgr.s.raw<0?TONE.bad : TONE.mid }}>
                  {S.mgr.s.raw>0?"+":""}{(S.mgr.s.raw*0.5).toFixed(2)}
                </p>
              </>) : <p className="text-[11px] py-8" style={{ color:"#5A4E44" }}>ยังไม่มีข้อมูลโค้ช</p>}
            </div>
          ))}
        </div>
        {A.mgr && B.mgr && (() => {
          const h2h = branchRelation(A.mgr.s.pil.y[1], B.mgr.s.pil.y[1]);
          const dd = (A.mgr.s.raw - B.mgr.s.raw) * 0.5;
          return (
            <div className="px-3 py-2.5 text-[11.5px] leading-relaxed" style={{ borderTop:"1px solid #2A2320", color:"#A79684" }}>
              โค้ชต่อโค้ช ปี{ZODIAC[A.mgr.s.pil.y[1]]} เจอปี{ZODIAC[B.mgr.s.pil.y[1]]} —{" "}
              <span style={{ color:REL_HEX[h2h.key] }}>{h2h.label}</span>
              {Math.abs(dd) < 0.15
                ? " · ดวงพอกัน ไม่มีใครได้เปรียบข้างสนาม"
                : ` · ${dd>0?A.team.name:B.team.name} ได้เปรียบ ${Math.abs(dd).toFixed(2)} แต้ม`}
            </div>
          );
        })()}
      </div>


        {/* จุดเด่น จุดด้อย */}
        <div className="grid grid-cols-2 gap-px" style={{ background:"#2A2320", borderTop:"1px solid #2A2320" }}>
          {[[A,P.a],[B,P.b]].map(([S,pt],i)=>(
            <div key={i} className="p-3" style={{ background:"#211B17" }}>
              <p className="text-[12px] mb-2 truncate" style={{ color:readable(S.kit.hex) }}>{S.team.name}</p>
              <p className="text-[10px] mb-1" style={{ color:TONE.good }}>จุดเด่น</p>
              {pt.good.length ? pt.good.map((t,k)=>(
                <p key={k} className="text-[11px] leading-relaxed mb-1" style={{ color:"#A79684" }}>· {t}</p>
              )) : <p className="text-[11px] mb-1" style={{ color:"#5A4E44" }}>· ไม่มีจุดเด่นชัดเจน</p>}
              <p className="text-[10px] mt-2 mb-1" style={{ color:TONE.bad }}>จุดด้อย</p>
              {pt.bad.length ? pt.bad.map((t,k)=>(
                <p key={k} className="text-[11px] leading-relaxed mb-1" style={{ color:"#A79684" }}>· {t}</p>
              )) : <p className="text-[11px]" style={{ color:"#5A4E44" }}>· ไม่มีจุดด้อยชัดเจน</p>}
            </div>
          ))}
        </div>

        <p className="px-3 py-2.5 text-[12px] leading-relaxed"
          style={{ borderTop:"1px solid #2A2320", background:"#1A1512", color:"#A79684" }}>
          {V.advice}
        </p>
      </div>

      {pick && (
        <LineupPicker
          team={teams.find(t=>t.slug===pick)}
          rows={(pick===A.team.slug?A:B).all}
          onClose={()=>setPick(null)}
          onSave={(lu)=>{ onLineup(pick, { ...lu, forDate: lu.confirmed ? fx.date : null }); setPick(null); }} />
      )}


      <OddsPanel A={A} B={B} fx={fx} local={local} gap={gap} results={results} cA={cA} cB={cB} />

      <SchoolPanel A={A} B={B} day={day} local={local} gap={gap} cA={cA} cB={cB} />

      {/* ที่มาของคะแนน */}
      <div className="rounded-sm overflow-hidden" style={{ background:"#211B17", border:"1px solid #302823" }}>
        <p className="px-3 py-2 text-[11px]" style={{ background:"#2A2320", color:"#C8A24A" }}>ที่มาของคะแนน</p>
        {[
          ["ปีเกิด × วันแข่ง","ชง −4 · ลงโทษ −2 · เบียน −1.5 · ทำลาย −0.5 · ซ้ำเสา −0.5 · ประสานอ่อน +1.2 · สามประสาน +2.5 · คู่ธาตุ +3 · ค่าเฉลี่ยทั้ง 11 คนถ่วง × 0.75 เพราะมีเปลี่ยนตัว","น้ำหนักเต็ม","tradition"],
          ["ปีเกิด × ปีที่แข่ง","太歲 เทพเจ้าประจำปี — ตำราถือว่าชงปีใหญ่กว่าชงวัน แต่คงที่ทั้งปี จึงถ่วงครึ่ง","× 0.5","tradition"],
          ["ปีเกิด × เดือนที่แข่ง","月建 เดือนที่แข่ง เกณฑ์เดียวกับชงวัน","× 0.4","tradition"],
          ["วันเกิด × วันแข่ง","เกณฑ์เดียวกัน เสาวันคือตัวตน ส่วนเสาปีคือสิ่งที่ตำรานิยมใช้ดูชง","× 0.5","tradition"],
          ["ธาตุประจำตัว × ธาตุวัน","印 +1 · 比 +0.5 · 財 +0.5 · 食傷 −0.25 · 官殺 −1 (มองจากธาตุผู้เล่น)","น้ำหนักเต็ม","tradition"],
          ["ธาตุประจำตัว × ฤดู","月令旺衰 — ตำราว่า 當令者旺 令生者相 生令者休 剋令者囚 令剋者死 · 旺 +1 · 相 +0.5 · 休 0 · 囚 −0.5 · 死 −1","× 0.8","tradition"],
          ["ยามที่เตะ","เกณฑ์เดียวกับปีเกิด ถ่วงตามนาทีที่อยู่ในแต่ละยาม","× 0.3","tradition"],
          ["เคมีในทีม","จับคู่ปีเกิดของ 11 ตัวจริงครบ 55 คู่ แล้วเฉลี่ย — คู่ธาตุและสามประสานทำให้ทีมกลมกลืน ชงกันเองทำให้แตก","× 1.5","tradition"],
          ["ชุดธาตุรวมพลัง","三會方局 ครบสามทิศ (+3) แรงกว่า 三合局 (+2.2) · ครบสามตัวแค่เปิดประตู ความแรงแปรตามจำนวนคนที่อยู่ในชุด","× 0.3","tradition"],
          ["สีชุดแข่ง","財 +3 · 印 +2 · 比 +1 · 食傷 −1 · 官殺 −2 (มองจากก้านฟ้าของวัน)","× 0.5","tradition"],
          ["ผู้จัดการทีม","คิดคะแนนเหมือนผู้เล่นหนึ่งคน เทียบเท่าผู้เล่นราว 6 คนจาก 11","× 0.4","tradition"],
          ["ทิศเดินทางทีมเยือน","ทิศจากสนามตัวเองไปสนามแข่ง แปลงเป็นกิ่งดิน แล้วเทียบกับวัน","× 0.2 × ระยะทาง","approx"],
          ["ได้เปรียบเจ้าบ้าน","ไม่ใช่หลักจีน เป็นปัจจัยฟุตบอลล้วน","+0.5 คงที่","house"]
        ].map((r,i)=>(
          <div key={i} className="px-3 py-2" style={{ borderTop:"1px solid #2A2320" }}>
            <div className="flex items-baseline gap-2">
              <span className="text-[12px] flex-1" style={{ color:"#E9E1D0" }}>{r[0]}</span>
              <span className="text-[11px] shrink-0" style={{ color:"#C8A24A" }}>{r[2]}</span>
            </div>
            <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color:"#8B7C6C" }}>{r[1]}</p>
            <span className="text-[9.5px]" style={{ color: r[3]==="tradition"?TONE.good : r[3]==="approx"?"#C8863B" : TONE.bad }}>
              {r[3]==="tradition" ? "ตามตำรา" : r[3]==="approx" ? "ประมาณจากตำรา" : "ผมกำหนดเอง"}
            </span>
          </div>
        ))}
        <p className="px-3 py-2.5 text-[11px] leading-relaxed"
          style={{ borderTop:"1px solid #2A2320", background:"#1A1512", color:"#6B5D50" }}>
          ตัวเลขน้ำหนักคูณทั้งหมดเป็นการเทียบสัดส่วนที่ผมกำหนดเอง ตำราจีนบอกแค่ว่าอะไรแรงกว่าอะไร ไม่ได้ให้ตัวเลข
        </p>
      </div>

      {/* คำอธิบายความสัมพันธ์ */}
      <div className="rounded-sm overflow-hidden" style={{ background:"#211B17", border:"1px solid #302823" }}>
        <p className="px-3 py-2 text-[11px]" style={{ background:"#2A2320", color:"#C8A24A" }}>
          ความสัมพันธ์ระหว่างปีเกิดกับวันแข่ง
        </p>
        {[
          { k:"liuhe", name:"คู่ธาตุ", cn:"\u516D\u5408", w:"+3",
            what:"นักษัตรสองตัวที่จับคู่กันแล้วกลมกลืน ดีที่สุดในบรรดาความสัมพันธ์",
            pairs:"หนู-วัว · เสือ-หมู · กระต่าย-สุนัข · มังกร-ไก่ · งู-ลิง · ม้า-แพะ" },
          { k:"sanhe", name:"สามประสาน", cn:"\u4E09\u5408", w:"+2.5",
            what:"เข้าคู่กับตัวแกนของชุดสามประสาน (หนู ม้า กระต่าย ไก่) รวมเป็นธาตุเดียวกันเต็มกำลัง",
            pairs:"ลิง-หนู-มังกร (น้ำ) · หมู-กระต่าย-แพะ (ไม้) · เสือ-ม้า-สุนัข (ไฟ) · งู-ไก่-วัว (ทอง)" },
          { k:"banhe", name:"ประสานอ่อน", cn:"\u62F1\u5408", w:"+1.2",
            what:"อยู่ชุดสามประสานเดียวกันแต่ไม่มีตัวแกน พลังเหลือไม่ถึงครึ่ง",
            pairs:"ลิง-มังกร · หมู-แพะ · เสือ-สุนัข · งู-วัว" },
          { k:"none", name:"เป็นกลาง", cn:"\u2014", w:"0",
            what:"ไม่มีความสัมพันธ์ตามตำรา ผู้เล่นส่วนใหญ่จะอยู่กลุ่มนี้", pairs:"" },
          { k:"po", name:"ทำลาย", cn:"\u516D\u7834", w:"\u22120.5",
            what:"เบาที่สุดในฝั่งลบ ตำราหลายสำนักไม่นับด้วยซ้ำ",
            pairs:"หนู-ไก่ · ม้า-กระต่าย · มังกร-วัว" },
          { k:"fuyin", name:"ซ้ำเสา", cn:"\u4F0F\u541F", w:"\u22120.5",
            what:"นักษัตรตรงกับวันพอดี ตำราถือว่าพลังซ้อนจนอึดอัด ไม่ใช่เรื่องดี",
            pairs:"เช่น คนปีแพะเจอวันแพะ" },
          { k:"hai", name:"เบียน", cn:"\u516D\u5BB3", w:"\u22121.5",
            what:"บั่นทอนกันแบบเงียบๆ มักออกเป็นความติดขัดมากกว่าปะทะตรงๆ",
            pairs:"หนู-แพะ · วัว-ม้า · เสือ-งู · กระต่าย-มังกร · ลิง-หมู · ไก่-สุนัข" },
          { k:"xing", name:"ลงโทษ", cn:"\u4E09\u5211", w:"\u22122",
            what:"ทำโทษกันตามตำรา มักออกเป็นเรื่องวินัย บาดเจ็บ หรือทะเลาะกันเอง",
            pairs:"เสือ-งู-ลิง · วัว-สุนัข-แพะ · หนู-กระต่าย — และมังกร ม้า ระกา กุน เจอปีตัวเองคือลงโทษตัวเอง" },
          { k:"chong", name:"ชง", cn:"\u516D\u51B2", w:"\u22124",
            what:"อยู่ตรงข้ามกันพอดีในวงกลม 12 ตัว แรงที่สุดและเป็นข้อห้ามหลักของการดูฤกษ์",
            pairs:"หนู-ม้า · วัว-แพะ · เสือ-ลิง · กระต่าย-ไก่ · มังกร-สุนัข · งู-หมู" },
        ].map(r=>(
          <div key={r.k} className="px-3 py-2.5" style={{ borderTop:"1px solid #2A2320" }}>
            <div className="flex items-baseline gap-2">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:REL_HEX[r.k] }} />
              <span className="text-[13px]" style={{ color:REL_HEX[r.k] }}>{r.name}</span>
              <span style={{ fontFamily:"'Songti SC','Noto Serif SC',serif", fontSize:"12px", color:"#6B5D50" }}>{r.cn}</span>
              <span className="ml-auto text-[12px]" style={{ color:REL_HEX[r.k] }}>{r.w}</span>
            </div>
            <p className="text-[11.5px] mt-1 ml-3.5 leading-relaxed" style={{ color:"#A79684" }}>{r.what}</p>
            {r.pairs && <p className="text-[11px] mt-1 ml-3.5 leading-relaxed" style={{ color:"#6B5D50" }}>{r.pairs}</p>}
          </div>
        ))}
      </div>

      <p className="text-[10.5px] text-stone-600 leading-relaxed pb-4">
        คะแนน = ปีเกิดเทียบวันแข่ง + วันเกิดเทียบวันแข่ง (ครึ่งน้ำหนัก) + ธาตุประจำตัว
        ทีมรวม = เฉลี่ยผู้เล่น + สีชุด + ผู้จัดการ ดูสนุกได้ แต่อย่าใช้ตัดสินใจอะไรที่เสียเงิน
      </p>
    </div>
  );
}

/* ═══════════ บทสรุป ═══════════ */
const toneOf = (w) => w > 0 ? "good" : w < 0 ? "bad" : "mid";


/* จุดเด่น จุดด้อย ของแต่ละทีม */
function buildPoints(A, B, day, travel) {
  const clashB = (day.d[1]+6)%12;
  const nm = (x) => x.p.n || x.p.th;

  const one = (S, other, isHome) => {
    const good = [], bad = [];
    if (S.kv.w >= 2) good.push(`ชุด${S.kit.label} ธาตุ${EL[S.kit.el]} ${S.kv.label} (${S.kv.w>0?"+":""}${S.kv.w})`);
    if (S.kv.w < 0) bad.push(`ชุด${S.kit.label} ${S.kv.label} (${S.kv.w})`);

    const help = S.field.filter(x=>x.s.relY.w>0);
    const hurt = S.field.filter(x=>x.s.relY.w<0);
    if (help.length) good.push(`ผู้เล่นดวงหนุน ${help.length} คน นำโดย ${nm(help.slice().sort((a,b)=>b.s.raw-a.s.raw)[0])}`);
    if (hurt.length) bad.push(`ดวงฝืน ${hurt.length} คน — ${hurt.slice(0,3).map(nm).join(", ")}`);

    const cl = S.field.filter(x=>x.s.pil.y[1]===clashB);
    if (cl.length) bad.push(`คนปี${ZODIAC[clashB]}ชงกับวันนี้ ${cl.length} คน`);

    for (const pos of POS_ORDER) {
      const a = S.byPos[pos], b = other.byPos[pos];
      if (!a || !b) continue;
      const d = a.avg - b.avg;
      if (d >= 0.8) good.push(`${pos} ดวงดีกว่าคู่แข่ง ${d.toFixed(1)} แต้ม`);
      if (d <= -0.8) bad.push(`${pos} ดวงเป็นรองคู่แข่ง ${Math.abs(d).toFixed(1)} แต้ม`);
    }

    if (S.mgr) {
      if (S.mgr.s.relY.w > 0) good.push(`โค้ช ${nm(S.mgr)} ${S.mgr.s.relY.label}กับวัน`);
      if (S.mgr.s.relY.w < 0) bad.push(`โค้ช ${nm(S.mgr)} ${S.mgr.s.relY.label}กับวัน`);
    }

    if (isHome) good.push(`เล่นในถิ่นตัวเอง ได้เปรียบ +0.5`);
    else if (travel) {
      const t = `เดินทาง ${travel.km.toFixed(0)} กม. ไปทาง${DIR_TH[travel.br]} ทิศ${travel.rel.label}กับวัน`;
      if (travel.effect > 0.05) good.push(t); else if (travel.effect < -0.05) bad.push(t);
    }

    if (S.club) {
      const t = `สโมสรตั้งปี${ZODIAC[S.club.pil.y[1]]} ${S.club.relY.label}กับวันแข่ง`;
      if (S.club.effect > 0.05) good.push(t); else if (S.club.effect < -0.05) bad.push(t);
    }

    return { good: good.slice(0,5), bad: bad.slice(0,5) };
  };

  return { a: one(A, B, true), b: one(B, A, false) };
}

function buildVerdict(A, B, day, gap, travel) {
  const dayEl = STEM_EL[day.d[0]];
  const luckyEl = CONTROLS[dayEl];
  const clashB = (day.d[1] + 6) % 12;
  const nm = (x) => x.p.n || x.p.th;
  const rows = [];

  const ca = A.field.filter(x=>x.s.pil.y[1]===clashB).length;
  const cb = B.field.filter(x=>x.s.pil.y[1]===clashB).length;
  rows.push({ head:"คนปีชง",
    a:{ text:`${ca} คน`, tone: ca===cb?"mid":(ca<cb?"good":"bad") },
    b:{ text:`${cb} คน`, tone: ca===cb?"mid":(cb<ca?"good":"bad") },
    win: ca===cb?0:(ca<cb?-1:1) });

  const wa = A.mgr?.s.raw, wb = B.mgr?.s.raw;
  const mwin = (wa==null||wb==null) ? 0 : (Math.abs(wa-wb)<0.3 ? 0 : (wa>wb?-1:1));
  rows.push({ head:"โค้ช",
    a:{ text: A.mgr ? `${nm(A.mgr)} · ${A.mgr.s.relY.label}` : "ไม่มีข้อมูล", tone: A.mgr?toneOf(A.mgr.s.relY.w):"mid" },
    b:{ text: B.mgr ? `${nm(B.mgr)} · ${B.mgr.s.relY.label}` : "ไม่มีข้อมูล", tone: B.mgr?toneOf(B.mgr.s.relY.w):"mid" },
    win: mwin });

  const te = travel ? travel.effect : 0;
  rows.push({ head:"สนาม",
    a:{ text:`เหย้า · ${A.team.venue?.name || "ไม่ระบุ"}`, tone:"good" },
    b:{ text: travel ? `เยือน ${travel.km.toFixed(0)} กม. ทาง${DIR_TH[travel.br]}` : "เยือน · ไม่มีพิกัด",
        tone: te>0.05?"good":te<-0.05?"bad":"mid" },
    win: te >= 0.5 ? 1 : -1 });

  const hw = (S) => S.field.length ? S.field.reduce((a,x)=>a+(x.s.hourW||0),0)/S.field.length : 0;
  const hwa = hw(A), hwb = hw(B);
  if (A.field.some(x=>x.s.hourParts) || B.field.some(x=>x.s.hourParts)) {
    const cnt = (S) => S.field.filter(x=>(x.s.hourW||0) > 0.05).length;
    rows.push({ head:"ยามที่เตะ",
      a:{ text:`เข้ายาม ${cnt(A)} คน (${hwa>0?"+":""}${hwa.toFixed(2)})`, tone: hwa>hwb?"good":hwa<hwb?"bad":"mid" },
      b:{ text:`เข้ายาม ${cnt(B)} คน (${hwb>0?"+":""}${hwb.toFixed(2)})`, tone: hwb>hwa?"good":hwb<hwa?"bad":"mid" },
      win: Math.abs(hwa-hwb)<0.02 ? 0 : (hwa>hwb?-1:1) });
  }

  /* บอกให้ชัดว่าสีเสื้อนี้ตรวจมาแล้วหรือแค่เดาจากช่องเหย้า-เยือน
     เพราะสีเสื้อเป็นองค์ประกอบที่น้ำหนักสูง ถ้าเดาผิดคะแนนจะเพี้ยนโดยไม่รู้ตัว */
  const kitMark = (S) => S.kit.checked ? "" : " · ยังไม่ได้ตรวจ";
  rows.push({ head:"สีเสื้อ",
    a:{ text:`${A.kit.label} · ${A.kv.label}${kitMark(A)}`, tone: toneOf(A.kv.w) },
    b:{ text:`${B.kit.label} · ${B.kv.label}${kitMark(B)}`, tone: toneOf(B.kv.w) },
    win: A.kv.w===B.kv.w?0:(A.kv.w>B.kv.w?-1:1) });

  const na = A.tiers.good.length - A.tiers.bad.length;
  const nb = B.tiers.good.length - B.tiers.bad.length;
  rows.push({ head:"ผู้เล่น",
    a:{ text:`ดีเด่น ${A.tiers.good.length} · แย่ ${A.tiers.bad.length}`, tone: na>0?"good":na<0?"bad":"mid" },
    b:{ text:`ดีเด่น ${B.tiers.good.length} · แย่ ${B.tiers.bad.length}`, tone: nb>0?"good":nb<0?"bad":"mid" },
    win: na===nb?0:(na>nb?-1:1) });

  const bestA = A.tiers.good[0], bestB = B.tiers.good[0];
  const worstA = A.tiers.bad[A.tiers.bad.length-1], worstB = B.tiers.bad[B.tiers.bad.length-1];
  rows.push({ head:"ตัวเด่น",
    a:{ text: bestA ? nm(bestA) : "ไม่มี", tone: bestA?"good":"mid" },
    b:{ text: bestB ? nm(bestB) : "ไม่มี", tone: bestB?"good":"mid" }, win:0 });
  rows.push({ head:"ตัวเสี่ยง",
    a:{ text: worstA ? nm(worstA) : "ไม่มี", tone: worstA?"bad":"mid" },
    b:{ text: worstB ? nm(worstB) : "ไม่มี", tone: worstB?"bad":"mid" }, win:0 });

  const tie = Math.abs(gap) < 0.4;
  const winner = gap > 0 ? A : B;
  const loser = gap > 0 ? B : A;
  const hint = day.h ? ` · ยามหลัก${gzTh(day.h)}ชงกับปี${ZODIAC[(day.h[1]+6)%12]}` : "";
  const advice = (tie
    ? `ทั้งสองฝั่งได้เปรียบคนละด้าน ไม่มีใครกินขาด`
    : `${loser.team.name} แก้เกมได้ด้วยการใส่ชุดสีธาตุ${EL[luckyEl]} และเลี่ยงส่งตัวปี${ZODIAC[clashB]} ลงเป็นตัวจริง`) + hint;

  return { rows, tie, winner, advice };
}


/* ═══════════ จัดตัวผู้เล่น ═══════════ */
function LineupPicker({ team, rows, onClose, onSave }) {
  const init = team?.lineup || { start:[], sub:[] };
  const [start, setStart] = useState(init.start || []);
  const [confirmed, setConfirmed] = useState(!!init.confirmed);
  const stateOf = (id) => start.includes(id) ? "start" : "out";
  const cycle = (id) => {
    if (stateOf(id) === "out") {
      if (start.length < 11) setStart([...start, id]);
    } else {
      setStart(start.filter(x=>x!==id));
    }
  };
  const auto = () => {
    const need = { GK:1, DF:4, MF:4, FW:2 };
    const st = [];
    for (const pos of POS_ORDER) {
      const g = rows.filter(x=>x.p.pos===pos).sort((a,b)=>b.s.raw-a.s.raw);
      g.slice(0, need[pos]).forEach(x => st.push(x.p.id));
    }
    setStart(st);
  };
  const over = start.length > 11;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background:"#171310" }}>
      <div className="max-w-md mx-auto pb-24">
        <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-2"
          style={{ background:"#171310", borderBottom:"1px solid #2A2320" }}>
          <button onClick={onClose} className="text-[13px]" style={{ color:"#8B7C6C" }}>ยกเลิก</button>
          <p className="flex-1 text-center text-[13.5px] text-stone-100 truncate">จัดตัว {team?.name}</p>
          <button onClick={()=>onSave({ start, sub:[], confirmed })} className="text-[13px]" style={{ color:"#C8A24A" }}>บันทึก</button>
        </div>

        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px]" style={{ color: over?TONE.bad:(start.length===11?TONE.good:"#8B7C6C") }}>
              ตัวจริง {start.length}/11
            </span>

            <button onClick={auto} className="ml-auto px-3 py-1.5 rounded-sm text-[11.5px]"
              style={{ background:"#2A2320", color:"#C8A24A" }}>จัดอัตโนมัติตามดวง</button>
          </div>
          <div className="px-3 pb-2">
            <button onClick={()=>setConfirmed(!confirmed)}
              className="w-full px-3 rounded-sm text-[12px] text-left flex items-center gap-2"
              style={{ minHeight:"44px", background: confirmed?"#25402F":"#2A2320",
                border:"1px solid "+(confirmed?"#3E6B4F":"#362D27"), color: confirmed?"#7FCBA3":"#8B7C6C" }}>
              <span className="text-[14px]">{confirmed ? "☑" : "☐"}</span>
              <span className="flex-1">
                {confirmed ? "ตัวจริงที่ประกาศแล้ว" : "ตัวจริงคาดการณ์ (ยังไม่ประกาศ)"}
                <span className="block text-[10px] mt-0.5" style={{ color:"#6B5D50" }}>
                  ติ๊กเฉพาะตอนได้ใบรายชื่อจริง · แอปจะบันทึกคำทำนายอัตโนมัติให้เมื่อครบทั้งสองทีม
                </span>
              </span>
            </button>
          </div>
          {over && <p className="text-[11px] mb-2" style={{ color:TONE.bad }}>เกิน 11 คน แตะชื่อเพื่อเอาออก</p>}
          {team?.lineupAt && (
            <p className="text-[10.5px] mb-2" style={{ color:"#5A4E44" }}>
              เริ่มจากชุดที่บันทึกไว้เมื่อ {new Date(team.lineupAt).toLocaleString("th-TH",{day:"numeric",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"})}
            </p>
          )}

          {POS_ORDER.map(pos=>{
            const g = rows.filter(x=>x.p.pos===pos);
            if (!g.length) return null;
            return (
              <div key={pos} className="mb-3">
                <p className="text-[11px] mb-1" style={{ color:"#6B5D50" }}>{pos}</p>
                <div className="space-y-1">
                  {g.map(x=>{
                    const st = stateOf(x.p.id);
                    const bg = st==="start" ? "#25402F" : "#1A1512";
                    const fg = st==="start" ? "#7FCBA3" : "#5A4E44";
                    return (
                      <button key={x.p.id} onClick={()=>cycle(x.p.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-sm text-left"
                        style={{ background:bg, border:"1px solid #302823" }}>
                        <span className="text-[10px] w-[38px] shrink-0" style={{ color:fg }}>
                          {st==="start"?"✓":"—"}
                        </span>
                        <span className="flex-1 min-w-0 text-[12.5px] text-stone-200 truncate">{x.p.n||x.p.th}</span>
                        <span className="text-[10.5px] shrink-0" style={{ color:REL_HEX[x.s.relY.key] }}>{x.s.relY.label}</span>
                        <span className="text-[11px] w-9 text-right shrink-0"
                          style={{ color: x.s.raw>=1?TONE.good : x.s.raw<=-1?TONE.bad : TONE.mid }}>
                          {x.s.raw>0?"+":""}{x.s.raw.toFixed(1)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <p className="text-[10.5px] leading-relaxed pb-4" style={{ color:"#6B5D50" }}>
            แตะชื่อเพื่อสลับ ไม่ลง ↔ ตัวจริง
          </p>
        </div>
      </div>
    </div>
  );
}



/* ═══════════ ศาสตร์อื่น ═══════════ */
const rad = Math.PI/180;
const norm360 = (x) => ((x%360)+360)%360;
const jdNoon = (dateStr) => { const [y,m,d]=dateStr.split("-").map(Number);
  let Y=y, M=m; if(M<=2){Y-=1;M+=12;}
  const A=Math.floor(Y/100), B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(Y+4716))+Math.floor(30.6001*(M+1))+d+0.5+B-1524.5; };
const dowOf = (dateStr) => { const [y,m,d]=dateStr.split("-").map(Number);
  return new Date(Date.UTC(y,m-1,d)).getUTCDay(); };

/* ---- ทักษา: เกณฑ์ที่เพิ่มตามตำราทักษาปกรณ์/มหาทักษา ---- */
/* กำลังพระเคราะห์ รวมกันได้ 108 ค่ากลางคือ 13.5 */
const PLANET_POWER = { 0:6, 1:15, 2:8, 3:17, 4:19, 5:21, 6:10, 7:12 };
const POWER_MEAN = 13.5;
const powerMult = (pl) => (PLANET_POWER[pl] || POWER_MEAN) / POWER_MEAN;

/* ═══════════ กาลโยค — วันธงชัย อธิบดี อุบาทว์ โลกาวินาศ ═══════════
   ตำราไทยกำหนดให้แต่ละปีจุลศักราชมี "วันประจำ" สี่ชนิด เปลี่ยนทุก 16 เมษายน
   ธงชัย = วันแห่งชัยชนะ เหมาะกับการแข่งขันโดยตรง · อธิบดี = ความมั่นคง อำนาจ
   อุบาทว์ = อัปมงคล · โลกาวินาศ = วันพินาศ
   สูตรตรวจกับ จ.ศ.1369 และ จ.ศ.1386 แล้วตรงทั้งเจ็ดจุด */
function chulasakarat(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const be = y + 543;
  /* ปีจุลศักราชเปลี่ยนวันที่ 16 เมษายน */
  const after = (m > 4) || (m === 4 && d >= 16);
  return (be - 1181) - (after ? 0 : 1);
}
const KALAYOK_TH = { thongchai:"ธงชัย", athibodi:"อธิบดี", ubat:"อุบาทว์", lokawinat:"โลกาวินาศ" };
/* ค่าของแต่ละชนิด — ธงชัยเด่นที่สุดเพราะตำราผูกกับการแข่งขันและชัยชนะโดยตรง */
const KALAYOK_W = { thongchai: 1.5, athibodi: 1, ubat: -1, lokawinat: -1.5 };

function kalayok(dateStr) {
  const cs = chulasakarat(dateStr);
  const r7 = (n) => (n % 7) || 7;            /* 1 = อาทิตย์ … 7 = เสาร์ */
  const r8 = (n) => (n % 8) || 8;            /* ยามที่ 1-8 */
  const mk = (n) => ({ day: r7(n) - 1, yam: r8(n) });   /* day 0-6 ให้ตรงกับ getUTCDay */
  return { cs,
    thongchai:  mk(cs * 10 + 3),
    athibodi:   mk(cs % 498),
    ubat:       mk(cs * 10 + 2),
    lokawinat:  mk(cs + 1120) };
}

/* ยามที่เตะ — กลางวันเริ่มนับ 06:00 กลางคืนเริ่ม 18:00 ยามละ 1 ชม. 30 นาที */
function yamOf(timeStr) {
  const m = String(timeStr || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const mins = (+m[1]) * 60 + (+m[2]);
  const base = (mins >= 360 && mins < 1080) ? 360 : (mins >= 1080 ? 1080 : -60);
  return Math.floor(((mins - base + 1440) % 1440) / 90) + 1;
}

/* ดาวเกิดของผู้เล่นตรงกับวันกาลโยคชนิดใด */
function kalayokHit(star, kal) {
  if (star == null || !kal) return null;
  /* ราหู (7) ใช้วันพุธเป็นฐาน เพราะเป็นพุธกลางคืน */
  const dow = star === 7 ? 3 : star;
  for (const k of ["thongchai", "athibodi", "ubat", "lokawinat"])
    if (kal[k].day === dow) return { key: k, label: KALAYOK_TH[k], w: KALAYOK_W[k] };
  return null;
}

/* ภูมิทักษา — ทิศประจำดาวแต่ละดวง (องศาเข็มทิศ) */
const THAKSA_DIR = {
  0:{ th:"อีสาน",   deg: 45 },  1:{ th:"บูรพา",  deg: 90 },
  2:{ th:"อาคเนย์", deg:135 },  3:{ th:"ทักษิณ", deg:180 },
  6:{ th:"หรดี",    deg:225 },  4:{ th:"ประจิม", deg:270 },
  7:{ th:"พายัพ",   deg:315 },  5:{ th:"อุดร",   deg:  0 },
};
const dirPlanetOf = (deg) => {
  let best = null, bd = 999;
  for (const pl of Object.keys(THAKSA_DIR)) {
    let d = Math.abs(((deg - THAKSA_DIR[pl].deg + 540) % 360) - 180);
    if (d < bd) { bd = d; best = +pl; }
  }
  return best;
};

/* ค่าประจำตำแหน่งทักษา — การแข่งขันต้องการอำนาจ เดชจึงมาก่อนศรี */
/* ═══════════ มหาทักษา — เทวดาเสวยอายุ ═══════════
   ตำราแบ่งอายุคนออกเป็น 8 ช่วง เรียงตามวงทักษาจากดาวเกิด
   ช่วงหนึ่งกินปีเท่ากำลังพระเคราะห์ของดาวที่ครองช่วงนั้น รวมทั้งวง 108 ปี
   ดาวที่ครองอยู่คือ "เทวดาเสวยอายุ" ตำแหน่งของมันในวงทักษาบอกคุณภาพของช่วงชีวิต
   เกณฑ์นี้ขึ้นกับทั้งดาวเกิดและอายุ จึงแยกผู้เล่นออกจากกันได้มากกว่าเกณฑ์คงที่ */
function mahaThaksa(birthStr, star, onDateStr) {
  if (star == null || !birthStr || !onDateStr) return null;
  const b = new Date(birthStr + "T12:00:00Z"), o = new Date(onDateStr + "T12:00:00Z");
  if (isNaN(b) || isNaN(o)) return null;
  const age = (o - b) / 86400000 / 365.2422;
  if (age < 0) return null;
  const start = WHEEL.indexOf(star);
  let acc = 0;
  for (let i = 0; i < 8; i++) {
    const pl = WHEEL[(start + i) % 8], span = PLANET_POWER[pl];
    if (age < acc + span) {
      const pos = THAKSA_POS[i];
      return { pos, planet: pl, span, from: +acc.toFixed(1), to: +(acc + span).toFixed(1),
               age: +age.toFixed(1), w: THAKSA_W[pos] };
    }
    acc += span;
  }
  return null;
}

const THAKSA_W = { "กาลกิณี":-2, "เดช":2, "ศรี":1.5, "บริวาร":1, "มนตรี":1,
                   "อุตสาหะ":0.5, "มูละ":0.5, "อายุ":0.5 };
const STAR_TH = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์","พุธกลางคืน (ราหู)"];

/* ดาวประจำวันแบบโหราศาสตร์ไทย
   — วันทางโหราศาสตร์เริ่ม 06:00 เกิดก่อนหกโมงเช้ายังนับเป็นวันก่อนหน้า
   — วันพุธ 18:00-05:59 เป็นพุธกลางคืน ใช้ราหูแทนพุธ */
function thaksaStar(dateStr, timeStr) {
  if (!dateStr) return null;
  const [y,m,d] = dateStr.split("-").map(Number);
  const hm = String(timeStr||"").match(/^(\d{1,2}):(\d{2})/);
  const hh = hm ? +hm[1] : null;
  let t = Date.UTC(y, m-1, d);
  if (hh !== null && hh < 6) t -= 86400000;
  const dw = new Date(t).getUTCDay();
  const night = hh !== null && (hh >= 18 || hh < 6);
  if (dw === 3 && night) return 7;
  return dw;
}
const posOfPlanet = (wheel, pl) => {
  for (const k of THAKSA_POS) if (wheel[k] === pl) return k;
  return null;
};

/* ภูมิทักษา — ทิศที่ทีมเยือนเดินทางไป เทียบวงทักษาของวันแข่ง */
function thaksaTravel(dayStar, deg, km) {
  if (dayStar == null || deg == null) return null;
  const wheel = thaksaOf(dayStar), pl = dirPlanetOf(deg), pos = posOfPlanet(wheel, pl);
  if (!pos) return null;
  const scale = Math.min(1, (km||0) / 150);
  const w = THAKSA_W[pos] * powerMult(pl) * scale;
  return { pl, pos, dir: THAKSA_DIR[pl].th, w: Math.max(-2, Math.min(2, w)) };
}

function sunLon(jd){ const T=(jd-2451545)/36525;
  const L0=norm360(280.46646+36000.76983*T), M=norm360(357.52911+35999.05029*T)*rad;
  return norm360(L0+(1.914602-0.004817*T)*Math.sin(M)+0.019993*Math.sin(2*M)+0.000289*Math.sin(3*M)); }

function keplerE(M,e){ let E=M; for(let i=0;i<8;i++) E=E-(E-e*Math.sin(E)-M)/(1-e*Math.cos(E)); return E; }
function helioXY(el,T){
  const a=el.a, e=el.e+el.de*T, I=(el.I+el.dI*T)*rad;
  const L=norm360(el.L+el.dL*T), w=norm360(el.w+el.dw*T)*rad, O=norm360(el.O+el.dO*T)*rad;
  const E=keplerE(norm360(L-w/rad)*rad,e);
  const xv=a*(Math.cos(E)-e), yv=a*Math.sqrt(1-e*e)*Math.sin(E);
  const v=Math.atan2(yv,xv), r=Math.sqrt(xv*xv+yv*yv), u=v+w-O;
  return { x:r*(Math.cos(O)*Math.cos(u)-Math.sin(O)*Math.sin(u)*Math.cos(I)),
           y:r*(Math.sin(O)*Math.cos(u)+Math.cos(O)*Math.sin(u)*Math.cos(I)) }; }
const EL_EARTH={a:1.00000261,e:0.01671123,de:-0.00004392,I:-0.00001531,dI:-0.01294668,L:100.46457166,dL:35999.37244981,w:102.93768193,dw:0.32327364,O:0,dO:0};
const EL_MARS={a:1.52371034,e:0.09339410,de:0.00007882,I:1.84969142,dI:-0.00813131,L:-4.55343205,dL:19140.30268499,w:-23.94362959,dw:0.44441088,O:49.55953891,dO:-0.29257343};
function marsLon(jd){ const T=(jd-2451545)/36525;
  const e=helioXY(EL_EARTH,T), m=helioXY(EL_MARS,T);
  return norm360(Math.atan2(m.y-e.y,m.x-e.x)/rad); }

/* ── ทักษาไทย ── */
const WHEEL = [0,1,2,3,6,4,7,5];
const THAKSA_POS = ["บริวาร","อายุ","เดช","ศรี","มูละ","อุตสาหะ","มนตรี","กาลกิณี"];
const PLANET_COLOR_TH = {0:"แดง",1:"ขาว ครีม",2:"ชมพู",3:"เขียว",4:"ส้ม เหลือง ทอง",5:"ฟ้า น้ำเงิน",6:"ดำ ม่วง",7:"เทา ม่วงเข้ม"};
/* คำสีกับดาวประจำสี — เลือกคำที่ปรากฏก่อนในชื่อชุด เพราะสีแรกคือสีหลักของเสื้อ */
const COLOR_WORDS = [
  ["เหลืองอ่อน",1],["ครีม",1],["ขาว",1],
  ["แดง",0],["เพลิง",0],["มารูน",0],["มังคุด",0],["เลือดหมู",0],
  ["ชมพู",2],
  ["เขียว",3],["มิ้นต์",3],["ตอง",3],
  ["ส้ม",4],["เหลือง",4],["ทอง",4],
  ["ฟ้า",5],["น้ำเงิน",5],["กรมท่า",5],
  ["ดำ",6],["ม่วง",6],["ลาเวนเดอร์",6],
  ["เทา",7],
];
function kitPlanet(label) {
  const t = label || "";
  let best = null, at = Infinity;
  for (const [w, pl] of COLOR_WORDS) {
    const i = t.indexOf(w);
    if (i >= 0 && (i < at || (i === at && w.length > 2))) { at = i; best = pl; }
  }
  return best;
}
function thaksaOf(star) { const start = WHEEL.indexOf(star); const o = {};
  for (let i=0;i<8;i++) o[THAKSA_POS[i]] = WHEEL[(start+i)%8]; return o; }
function thaksaScore(p, kitLabel, dayStar, kal, dateStr) {
  if (!p.b) return null;
  const star = thaksaStar(p.b, p.time), t = thaksaOf(star);
  const kp = kitPlanet(kitLabel);
  const clamp = (v) => Math.max(-2, Math.min(2, v));
  const terms = [];

  /* เกณฑ์เดิม — สีเสื้อตกตำแหน่งใดในวงทักษาของผู้เล่น ถ่วงด้วยกำลังพระเคราะห์ */
  let kitPos = null, kitW = 0;
  if (kp != null) {
    kitPos = posOfPlanet(t, kp);
    kitW = clamp(kitPos ? THAKSA_W[kitPos] * powerMult(kp) : 0);
    terms.push(kitW);
  }

  /* เกณฑ์ใหม่ — ดาวประจำวันแข่งตกตำแหน่งใดในวงทักษาของผู้เล่น
     ทำให้ทักษาขึ้นกับวันแข่ง ไม่ใช่ค่าคงที่ตลอดฤดูกาลอย่างเดิม */
  let dayPos = null, dayW = 0;
  if (dayStar != null) {
    dayPos = posOfPlanet(t, dayStar);
    dayW = clamp(dayPos ? THAKSA_W[dayPos] * powerMult(dayStar) : 0);
    terms.push(dayW);
  }

  /* w = คะแนนที่ใช้จริง — คงเดิมตลอดฤดูกาล เพื่อไม่ให้การทดลองคู่ขนานเสียความเทียบเคียง */
  const w = terms.length ? terms.reduce((x,y)=>x+y,0) / terms.length : 0;

  /* ── เกณฑ์ใหม่สามข้อ เก็บแยกเป็น w2 ยังไม่เอาเข้าคะแนนจริง ──
     1. กาลโยค — ดาวเกิดตรงวันธงชัย/อธิบดี/อุบาทว์/โลกาวินาศ ของปีนั้น
     2. เทวดาเสวยอายุ — ช่วงชีวิตที่ผู้เล่นอยู่ตอนลงสนาม
     3. กำลังพระเคราะห์ของดาวเกิดเอง เป็นเทอมของตัวเอง (เดิมใช้เป็นตัวคูณเท่านั้น)
        ข้อ 3 คือข้อที่สถิติหนุนแรงที่สุด — ตั้งไว้ล่วงหน้าเพื่อทดสอบกับข้อมูลใหม่ */
  const kh = kalayokHit(star, kal);
  const mt = mahaThaksa(p.b, star, dateStr);
  const powW = clamp(((PLANET_POWER[star] ?? POWER_MEAN) - POWER_MEAN) / POWER_MEAN * 2);
  const t2 = terms.slice();
  if (kh) t2.push(clamp(kh.w));
  if (mt) t2.push(clamp(mt.w));
  t2.push(powW);
  const w2 = t2.length ? t2.reduce((x,y)=>x+y,0) / t2.length : 0;

  const note = [ kitPos ? `สีชุดตก${kitPos}` : "สีชุดไม่ตรงดาวใด",
                 dayPos ? `วันแข่งตก${dayPos}` : null,
                 kh ? `ดาวเกิดตรงวัน${kh.label}` : null,
                 mt ? `เสวยอายุ${mt.pos} (${STAR_TH[mt.planet]} ปี ${mt.from}-${mt.to})` : null,
                 `กำลัง ${PLANET_POWER[star] ?? POWER_MEAN}`
               ].filter(Boolean).join(" · ");
  return { star, dow:star, t, kp, kitPos, kitW, dayPos, dayW, kal:kh, maha:mt, powW, w, w2, note };
}


/* ── โหราศาสตร์สากล: อาทิตย์และอังคารจร กระทบอาทิตย์กำเนิด ── */
const ASPECTS = [[0,"กุม",0.5,8],[60,"โยค 60",1,5],[90,"เล็ง 90",-1.5,6],[120,"ตรีโกณ 120",2,7],[180,"เล็ง 180",-2,8]];
function aspectOf(a, b) {
  let d = Math.abs(norm360(a-b)); if (d > 180) d = 360 - d;
  for (const [ang,name,w,orb] of ASPECTS) if (Math.abs(d-ang) <= orb)
    return { ang, name, w, orb:Math.abs(d-ang) };
  return null;
}
function westernScore(p, jd) {
  if (!p.b) return null;
  const natal = sunLon(jdNoon(p.b));
  const tSun = sunLon(jd), tMars = marsLon(jd);
  const aS = aspectOf(tSun, natal), aM = aspectOf(tMars, natal);
  const w = (aS ? aS.w : 0) + (aM ? aM.w * 0.7 : 0);
  return { natal, tSun, tMars, aS, aM, w };
}

/* ── 建除十二神 (ฤกษ์ประจำวัน ใช้ร่วมกันทั้งสองทีม) ── */
const JIANCHU = [["建","จิ้น",0.5,"วันตั้งต้น เหมาะเริ่มเรื่องใหม่ แต่ปะทะกับเทพประจำปี"],
  ["除","ตื๋อ",1.5,"วันขจัด เหมาะกำจัดอุปสรรค"],["満","หมั่ว",0.5,"วันเต็ม ได้ผลแต่ล้นเกิน"],
  ["平","เพ้ง",0.5,"วันราบ เสมอตัว"],["定","เตี้ยง",1,"วันมั่นคง เหมาะเรื่องที่ตั้งไว้แล้ว"],
  ["執","จิบ",0,"วันยึด ก้ำกึ่ง"],["破","พั่ว",-2.5,"วันแตกหัก ร้ายที่สุดในรอบ"],
  ["危","อุ๋ย",-2,"วันเสี่ยงภัย"],["成","เซ้ง",2,"วันสำเร็จ ดีที่สุดสำหรับการแข่งขัน"],
  ["收","ซิว",1.5,"วันเก็บเกี่ยว"],["開","คุย",2,"วันเปิด ดีมาก"],["閉","ปี่",-1.5,"วันปิด ไม่เหมาะเริ่มหรือแข่ง"]];
const jianchuOf = (mB, dB) => JIANCHU[((dB - mB)%12+12)%12];


/* ═══════════ สรุปตามศาสตร์ ═══════════ */
function schoolResults(A, B, day, local, gap) {
  const jd = jdNoon(local.date);
  const jc = jianchuOf(day.m[1], day.d[1]);
  const avg = (arr) => arr.length ? arr.reduce((x,y)=>x+y,0)/arr.length : 0;

  /* ใช้เฉพาะตัวจริง (หรือทั้งทีมถ้ายังไม่จัด) เหมือนกับคะแนนรวมหลัก */
  const perTeam = (S, fn) => {
    const rows = S.field.map(x => ({ p:x.p, r:fn(x) })).filter(x => x.r);
    return { rows, score: avg(rows.map(x => x.r.w)) };
  };

  const bazi = {
    id:"bazi", name:"โป๊ยยี่สี่เถ่ง (ดวงจีน)", src:"จีน", lo:-12.6, hi:9.9,
    note:`วัน${gzTh(day.d)} · ${gz(day.d)} — รวมปีเกิด วันเกิด ธาตุ และยามที่เตะเข้าด้วยกัน`,
    a: A.avg, b: B.avg,
    detail: [A,B].map(S => ({ team:S.team.name,
      rows: S.field.map(x => ({ n:x.p.n||x.p.th,
        t:`ปี${ZODIAC[x.s.pil.y[1]]} ${x.s.relY.label} ${x.s.relY.w>0?"+":""}${x.s.relY.w} · วันเกิด ${(x.s.relD.w*0.5>0?"+":"")}${(x.s.relD.w*0.5).toFixed(1)} · ธาตุ${EL[x.s.myEl]} ${x.s.elBonus>0?"+":""}${x.s.elBonus} · ยาม ${x.s.hourW>0?"+":""}${x.s.hourW.toFixed(2)}`,
        w:Number(x.s.raw.toFixed(2)) })) })),
  };

  const dayStar = thaksaStar(local.date, local.time);
  const kal = kalayok(local.date);
  /* คุณภาพของวันแข่งเองตามกาลโยค — ใช้ร่วมกันทั้งสองทีม จึงเป็นบันทึกไว้ดู ไม่ตัดสินใคร */
  const matchDow = new Date(local.date + "T12:00:00Z").getUTCDay();
  const matchKal = ["thongchai","athibodi","ubat","lokawinat"].find(k => kal[k].day === matchDow);
  const matchYam = yamOf(local.time);
  const yamKal = matchYam ? ["thongchai","athibodi","ubat","lokawinat"].find(k => kal[k].yam === matchYam) : null;
  const thk = [A,B].map(S => perTeam(S, x => thaksaScore(x.p, S.kit.label, dayStar, kal, local.date)));
  /* ภูมิทักษา — ทิศที่ทีมเยือนเดินทางไป เทียบวงทักษาของวันแข่ง (เจ้าบ้านไม่เดินทาง จึงเป็น 0) */
  const tvRaw = travelRead(B.team, A.team, day);
  const bhum = tvRaw ? thaksaTravel(dayStar, tvRaw.deg, tvRaw.km) : null;
  const bhumW = bhum ? bhum.w : 0;
  const thaksa = {
    id:"thaksa", name:"ทักษาไทย", src:"ไทย", lo:-4, hi:4,
    note:`ดาววันแข่ง${STAR_TH[dayStar]} · เดช +2 · ศรี +1.5 · กาลกิณี −2 · ถ่วงกำลังพระเคราะห์`
       + ` · กาลโยค จ.ศ.${kal.cs}`
       + (matchKal ? ` วันแข่งเป็นวัน${KALAYOK_TH[matchKal]}` : ` วันแข่งเป็นวันกลาง`)
       + (yamKal ? ` · ยามที่เตะเป็นยาม${KALAYOK_TH[yamKal]}` : ``)
       + (bhum ? ` · ภูมิทักษา เยือนไปทาง${bhum.dir} ตก${bhum.pos} ${bhumW>=0?"+":""}${bhumW.toFixed(2)}` : ``),
    a: thk[0].score, b: thk[1].score + bhumW,
    detail: [A,B].map((S,i) => ({ team:`${S.team.name} · ชุด${S.kit.label}`
        + (i===1 && bhum ? ` · ภูมิทักษา ${bhum.dir} ตก${bhum.pos} ${bhumW>=0?"+":""}${bhumW.toFixed(2)}` : ``),
      rows: thk[i].rows.map(x => ({ n:x.p.n||x.p.th,
        t:`ดาวเกิด${STAR_TH[x.r.star]} · เดช ${PLANET_COLOR_TH[x.r.t["เดช"]]} · กาลกิณี ${PLANET_COLOR_TH[x.r.t["กาลกิณี"]]} — ${x.r.note}`,
        w:x.r.w })) })),
  };

  /* ── ทักษาชุดเกณฑ์ใหม่ — วิ่งคู่ขนาน ไม่เข้าคะแนนรวม ──
     ใช้วัดว่ากาลโยค เสวยอายุ และกำลังพระเคราะห์ ช่วยหรือไม่ บนข้อมูลที่ยังไม่เคยเห็น */
  const thk2 = [A,B].map(S => ({ score: (() => {
    const ws = S.field.map(x => thaksaScore(x.p, S.kit.label, dayStar, kal, local.date))
                      .filter(Boolean).map(r => r.w2);
    return ws.length ? ws.reduce((x,y)=>x+y,0)/ws.length : 0; })() }));
  const thaksa2 = {
    id:"thaksa2", name:"ทักษาไทย + เกณฑ์ใหม่ (ทดลอง)", src:"ไทย", lo:-4, hi:4,
    note:`เพิ่มกาลโยค · เทวดาเสวยอายุ · กำลังพระเคราะห์เป็นเทอมของตัวเอง — ยังไม่เข้าคะแนนรวม`,
    a: thk2[0].score, b: thk2[1].score + bhumW,
    detail: [A,B].map((S,i) => ({ team:S.team.name, rows: thk[i].rows.map(x => ({
      n:x.p.n||x.p.th, t:x.r.note, w:+(x.r.w2||0).toFixed(3) })) })),
  };

  const wst = [A,B].map(S => perTeam(S, x => westernScore(x.p, jd)));
  const western = {
    id:"western", name:"อาทิตย์-อังคารจร (สากล)", src:"ตะวันตก", lo:-3.4, hi:3.4,
    note:`อาทิตย์จร${SIGN_TH[Math.floor(sunLon(jd)/30)]} · อังคารจร${SIGN_TH[Math.floor(marsLon(jd)/30)]} — มีมุมจริง ${wst[0].rows.filter(x=>x.r.aS||x.r.aM).length}/${wst[0].rows.length} กับ ${wst[1].rows.filter(x=>x.r.aS||x.r.aM).length}/${wst[1].rows.length} คน ที่เหลือได้ 0`,
    a: wst[0].score, b: wst[1].score,
    detail: [A,B].map((S,i) => ({ team:S.team.name,
      rows: wst[i].rows.filter(x => x.r.aS || x.r.aM).map(x => ({ n:x.p.n||x.p.th,
        t:`${SIGN_TH[Math.floor(x.r.natal/30)]} — ${[x.r.aS?"อาทิตย์"+x.r.aS.name:null, x.r.aM?"อังคาร"+x.r.aM.name:null].filter(Boolean).join(" · ")}`,
        w:x.r.w })) })),
  };

  const almanac = {
    id:"jianchu", name:"สิบสองฤกษ์ (建除)", src:"จีน", shared:true, lo:-2.5, hi:2,
    note:`เดือน ${gz(day.m)} · วัน ${gz(day.d)} → ${jc[0]} ${jc[1]}`,
    a: jc[2], b: jc[2],
    detail: [{ team:"ใช้ร่วมกันทั้งสองทีม", rows:[{ n:`${jc[0]} (${jc[1]})`, t:jc[3], w:jc[2] }] }],
  };

  return [bazi, thaksa, thaksa2, western, almanac];
}

const DOW_TH = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const SIGN_TH = ["เมษ","พฤษภ","เมถุน","กรกฎ","สิงห์","กันย์","ตุลย์","พิจิก","ธนู","มังกร","กุมภ์","มีน"
];

function SchoolPanel({ A, B, day, local, gap, cA, cB }) {
  const [open, setOpen] = useState(null);
  const list = schoolResults(A, B, day, local, gap);

  /* รวมทุกศาสตร์ — คะแนนดิบเทียบข้ามศาสตร์ไม่ได้ ต้องปรับเป็นสเกล -1..+1 ก่อนเฉลี่ย
     ศาสตร์ที่ให้คะแนนวันร่วมกันทั้งสองทีม (建除) ไม่นับ เพราะไม่ได้ตอบว่าใครได้เปรียบ */
  const scaled = list.map(sc => {
    const nz = (v) => v >= 0 ? v/sc.hi : v/Math.abs(sc.lo);
    return { sc, ia:nz(sc.a), ib:nz(sc.b) };
  });
  const vote = scaled.filter(x => !x.sc.shared);
  const shared = scaled.filter(x => x.sc.shared);
  const mA = vote.length ? vote.reduce((a,x)=>a+x.ia,0)/vote.length : 0;
  const mB = vote.length ? vote.reduce((a,x)=>a+x.ib,0)/vote.length : 0;
  const EPS = 0.01;
  const forA = vote.filter(x => x.ia - x.ib >  EPS);
  const forB = vote.filter(x => x.ib - x.ia >  EPS);
  const evenN = vote.length - forA.length - forB.length;
  const dLead = mA - mB;
  const mLean = Math.max(-1, Math.min(1, dLead * 1.6));
  /* ฝ่ายได้เปรียบตัดสินจากคะแนนเฉลี่ย ให้ตรงกับแถบที่วาด
     ส่วนจำนวนศาสตร์ที่เห็นตรงกันเป็นคนละเรื่อง บอกแค่ว่าสัญญาณหนักแน่นแค่ไหน */
  const lead = Math.abs(dLead) < 0.02 ? null : (dLead > 0 ? A : B);
  const unan  = vote.length > 1 && (forA.length === vote.length || forB.length === vote.length);
  const clash = forA.length > 0 && forB.length > 0;   /* ขัดกันจริง ไม่ใช่แค่เสมอ */

  return (
    <div className="rounded-sm overflow-hidden" style={{ background:"#211B17", border:"1px solid #302823" }}>
      <p className="px-3 py-2 text-[11px]" style={{ background:"#2A2320", color:"#C8A24A" }}>สรุปตามศาสตร์</p>

      {/* ── แถบรวมทุกศาสตร์ ── */}
      <div className="px-3 py-2.5" style={{ background:"#1E1915", borderTop:"1px solid #2A2320" }}>
        <div className="flex items-baseline gap-2">
          <span className="text-[12.5px] flex-1" style={{ color:"#E9E1D0" }}>รวมทุกศาสตร์</span>
          <span className="text-[9.5px] px-1.5 rounded" style={{ background:"#2A2320", color:"#8B7C6C" }}>
            {vote.length} ศาสตร์ · ถ่วงน้ำหนักเท่ากัน
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="w-12 text-right text-[14px] shrink-0" style={{ color:cA }}>{(mA*100).toFixed(0)}%</span>
          <div className="flex-1 relative h-2.5 rounded-sm" style={{ background:"#0E0B09" }}>
            <div className="absolute inset-y-0 left-1/2 w-px z-10" style={{ background:"#4A3F38" }} />
            <div className="absolute inset-y-0 rounded-sm"
              style={{ background: mLean>=0?cA:cB,
                left: mLean>=0?`${50-mLean*50}%`:"50%", width:`${Math.abs(mLean)*50}%` }} />
          </div>
          <span className="w-12 text-[14px] shrink-0" style={{ color:cB }}>{(mB*100).toFixed(0)}%</span>
        </div>
        <p className="text-[11.5px] mt-1.5 leading-relaxed" style={{ color:"#E9E1D0" }}>
          {lead ? `รวมแล้วเข้าทาง ${lead.team.name} · ห่าง ${Math.abs(dLead*100).toFixed(0)} จุด`
                : "รวมแล้วพอกัน ไม่มีฝ่ายไหนได้เปรียบ"}
        </p>
        <p className="text-[10.5px] mt-0.5 leading-relaxed"
          style={{ color: unan ? "#C8A24A" : clash ? "#D8A94A" : "#8B7C6C" }}>
          {unan  ? `ทั้ง ${vote.length} ศาสตร์ชี้ทางเดียวกัน สัญญาณหนักแน่น`
          : clash ? `ศาสตร์ขัดกันเอง — เข้าทาง ${A.team.name} ${forA.length} · เข้าทาง ${B.team.name} ${forB.length}`
                    + (evenN ? ` · เสมอ ${evenN}` : "") + ` · สัญญาณอ่อน เชื่อไม่ได้มาก`
          : evenN === vote.length ? `ทุกศาสตร์ให้สองทีมพอกัน ไม่มีสัญญาณ`
          : `มี ${vote.length - evenN} ศาสตร์ที่เห็นต่าง อีก ${evenN} ศาสตร์พอกัน ไม่มีศาสตร์ไหนค้าน`}
        </p>
        <p className="text-[10px] mt-1 leading-relaxed" style={{ color:"#6B5D50" }}>
          {forA.length>0 && <>เข้าทาง {A.team.name}: {forA.map(x=>x.sc.name.split(" ")[0]).join(", ")}<br/></>}
          {forB.length>0 && <>เข้าทาง {B.team.name}: {forB.map(x=>x.sc.name.split(" ")[0]).join(", ")}<br/></>}
          {shared.map(x=>`${x.sc.name.split(" ")[0]} ให้คะแนนวัน ${x.sc.a>0?"+":""}${x.sc.a} ใช้ร่วมกัน ไม่เข้าข้างใคร`).join(" · ")}
        </p>
      </div>
      {list.map(sc => {
        const nz = (v) => v >= 0 ? v/sc.hi : v/Math.abs(sc.lo);   // ปรับเป็น -1..+1 ตามช่วงของศาสตร์นั้น
        const ia = nz(sc.a), ib = nz(sc.b);
        const lean = Math.max(-1, Math.min(1, (ia - ib) * 1.6));
        const isOpen = open === sc.id;
        return (
          <div key={sc.id} style={{ borderTop:"1px solid #2A2320" }}>
            <button onClick={()=>setOpen(isOpen?null:sc.id)} className="w-full px-3 py-2.5 text-left">
              <div className="flex items-baseline gap-2">
                <span className="text-[12.5px] flex-1" style={{ color:"#E9E1D0" }}>{sc.name}</span>
                <span className="text-[9.5px] px-1.5 rounded" style={{ background:"#2A2320", color:"#8B7C6C" }}>{sc.src}</span>
                <span className="text-[11px]" style={{ color:"#6B5D50" }}>{isOpen?"▲":"▼"}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-12 text-right text-[12px] shrink-0" style={{ color:cA }}>{sc.a>0?"+":""}{sc.a.toFixed(2)}</span>
                <div className="flex-1 relative h-2 rounded-sm" style={{ background:"#0E0B09" }}>
                  <div className="absolute inset-y-0 left-1/2 w-px z-10" style={{ background:"#4A3F38" }} />
                  {!sc.shared && (
                    <div className="absolute inset-y-0 rounded-sm"
                      style={{ background: lean>=0?cA:cB,
                        left: lean>=0?`${50-lean*50}%`:"50%", width:`${Math.abs(lean)*50}%` }} />
                  )}
                </div>
                <span className="w-12 text-[12px] shrink-0" style={{ color:cB }}>{sc.b>0?"+":""}{sc.b.toFixed(2)}</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="w-12 text-right text-[9.5px] shrink-0" style={{ color:"#5A4E44" }}>{(ia*100).toFixed(0)}%</span>
                <span className="flex-1 text-[10px] text-center" style={{ color:"#5A4E44" }}>
                  ช่วงของศาสตร์นี้ {sc.lo} ถึง +{sc.hi}
                </span>
                <span className="w-12 text-[9.5px] shrink-0" style={{ color:"#5A4E44" }}>{(ib*100).toFixed(0)}%</span>
              </div>
              <p className="text-[10.5px] mt-1 leading-relaxed" style={{ color:"#6B5D50" }}>
                {sc.shared ? "ศาสตร์นี้ให้คะแนนวัน ไม่แยกทีม · " : ""}{sc.note}
              </p>
            </button>

            {isOpen && (
              <div className="px-3 pb-3" style={{ background:"#1A1512" }}>
                {sc.detail.map((grp,gi)=>(
                  <div key={gi} className="pt-2">
                    <p className="text-[11px] mb-1" style={{ color: sc.shared?"#8B7C6C":(gi===0?cA:cB) }}>{grp.team}</p>
                    {grp.rows.length ? grp.rows.map((r,ri)=>(
                      <div key={ri} className="flex items-baseline gap-2 py-0.5">
                        <span className="text-[11.5px] shrink-0 w-[92px] truncate" style={{ color:"#C9BCAB" }}>{r.n}</span>
                        <span className="text-[10.5px] flex-1 leading-snug" style={{ color:"#8B7C6C" }}>{r.t}</span>
                        <span className="text-[11px] shrink-0 w-9 text-right"
                          style={{ color: r.w>0?TONE.good : r.w<0?TONE.bad : TONE.mid }}>
                          {r.w>0?"+":""}{r.w}
                        </span>
                      </div>
                    )) : <p className="text-[11px]" style={{ color:"#5A4E44" }}>ไม่มีรายการที่เข้าเกณฑ์</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <p className="px-3 py-2.5 text-[10.5px] leading-relaxed"
        style={{ borderTop:"1px solid #2A2320", background:"#1A1512", color:"#6B5D50" }}>
        แต่ละศาสตร์มีช่วงคะแนนไม่เท่ากัน ตัวเลขดิบจึงเทียบข้ามศาสตร์ไม่ได้ ให้ดูเปอร์เซ็นต์ที่ปรับสเกลแล้วแทน
        และทั้งสามศาสตร์ถามคนละคำถาม — โป๊ยยี่ถามว่าดวงคนกับดวงวันเข้ากันไหม ทักษาถามว่าสีเสื้อถูกโฉลกกับวันเกิดไหม
        ส่วนสากลถามว่าดาวจรทำมุมกับดวงอาทิตย์กำเนิดอย่างไร คนเดียวกันจึงได้คนละผลเป็นเรื่องปกติ
        แถบรวมด้านบนเฉลี่ยเปอร์เซ็นต์ของทุกศาสตร์แบบถ่วงน้ำหนักเท่ากัน เพราะยังไม่มีหลักฐานว่าศาสตร์ไหนแม่นกว่ากัน
        ถ้าศาสตร์ชี้ไปคนละทาง แปลว่าสัญญาณอ่อน ไม่ควรเชื่อมาก ส่วนคะแนนรวมหลักของแอปในส่วนที่ 6 ยังใช้เฉพาะโป๊ยยี่สี่เถ่งเหมือนเดิม
      </p>
    </div>
  );
}

/* ═══════════ ชิ้นส่วนหน้าเปรียบเทียบ ═══════════ */
/* ═══════════ 7 อัตราต่อรอง ═══════════
   แสดงราคาตลาดคู่กับความน่าจะเป็นของเรา เพื่อให้เห็นว่าเราต่างจากตลาดตรงไหน
   แต่ละตลาดบอกที่มาไว้ชัดว่าเป็นราคาจริง ราคาที่ถอดออกมา หรือของเราล้วน */
function OddsPanel({ A, B, fx, local, gap, results, cA, cB }) {
  const hName = A?.team?.name, aName = B?.team?.name;
  const key = hName ? ((local && local.date) || fx.date) + "|" + hName : null;
  const raw = key ? ODDS_BY.get(key) : null;
  const mp = marketProbs(raw);
  const mg = useMemo(() => mp ? marketGrid(mp) : null, [key, mp && mp.pH]);
  const tg = useMemo(() => mg ? tiltedGrid(mg, gap) : null, [mg, gap]);
  const hmg = useMemo(() => mg ? halfTimeGrid(mg) : null, [mg]);
  const htg = useMemo(() => tg ? halfTimeGrid(tg) : null, [tg]);
  const sm = useMemo(() => sideModel(), []);
  const sf = useMemo(() => (hName && aName) ? sideForecast(sm, hName, aName) : null, [sm, hName, aName]);
  const ourPo = useMemo(() => {
    const m = computePoisson(results || []);
    return (hName && aName) ? poissonForecast(m, hName, aName) : null;
  }, [results, hName, aName]);

  const pc = (v) => v == null ? "—" : (v*100).toFixed(1) + "%";
  const toOdds = (p) => (!p || p <= 0) ? "—" : (1/p).toFixed(2);
  const sum = (g, f) => g ? g.grid.filter(f).reduce((a,c)=>a+c.p,0) : null;
  const at = (g, h, a) => g ? (g.grid.find(x=>x.h===h&&x.a===a)?.p ?? null) : null;

  /* แถวหนึ่ง · kind บอกที่มาของคอลัมน์ "ราคา" ไม่ให้สับสนว่าอะไรเป็นราคาเจ้ามือจริง
     real = เจ้ามือเปิดจริง · derived = ถอดจากราคาจริงด้วยปัวซง · ours = โมเดลเราเอง ไม่มีตลาด */
  const Row = ({ label, odds, mkt, ours, kind = "derived", note }) => {
    const d = (mkt != null && ours != null) ? (ours - mkt) * 100 : null;
    const real = kind === "real" && odds;
    const shown = real ? Number(odds).toFixed(2) : "≈" + toOdds(mkt != null ? mkt : ours);
    return (
      <div className="flex items-baseline gap-2 px-3 py-1.5" style={{ borderTop:"1px solid #2A2320" }}>
        <span className="text-[11.5px] flex-1 min-w-0" style={{ color:"#C9BCAB" }}>
          {label}{note && <span className="text-[10px] ml-1" style={{ color:"#5A4E44" }}>{note}</span>}
        </span>
        <span className="text-[11px] w-12 text-right"
          style={{ color: real ? "#C9BCAB" : "#5A4E44" }}>{shown}</span>
        <span className="text-[11.5px] w-12 text-right" style={{ color:"#C8A24A" }}>{pc(mkt)}</span>
        <span className="text-[11.5px] w-12 text-right" style={{ color:"#9FB9A8" }}>{pc(ours)}</span>
        <span className="text-[10.5px] w-12 text-right"
          style={{ color: d == null ? "#5A4E44" : Math.abs(d) < 2 ? "#5A4E44" : d > 0 ? TONE.good : TONE.bad }}>
          {d == null ? "" : (d >= 0 ? "+" : "") + d.toFixed(1)}
        </span>
      </div>
    );
  };
  /* หัวข้อใหญ่ 4 หัวข้อ */
  const Sec = ({ n, t, sub }) => (
    <div className="px-3 pt-3 pb-1.5" style={{ borderTop:"1px solid #3A302A", background:"#1E1915" }}>
      <p className="text-[11.5px]">
        <span style={{ color:"#8B7C6C" }}>{n}. </span><span style={{ color:"#C8A24A" }}>{t}</span>
      </p>
      {sub && <p className="text-[10px] mt-1 leading-relaxed" style={{ color:"#6B5D50" }}>{sub}</p>}
    </div>
  );
  const Grp = ({ t }) => (
    <p className="px-3 pt-2.5 pb-0.5 text-[10.5px]" style={{ color:"#8B7C6C" }}>{t}</p>
  );

  if (!mg && !sf) return null;
  const line = raw && raw.ahLine != null ? raw.ahLine : null;
  /* ต่อรองลูก — ส่วนแบ่งที่ฝั่งเจ้าบ้านได้ เมื่อหักผลเสมอทุนออก
     ราคาเศษ .25 และ .75 คือแทงครึ่งหนึ่งที่เส้นล่าง อีกครึ่งที่เส้นบน
     ถ้าคิดเป็นเส้นเดียวจะได้ตัวเลขผิด เพราะผลที่ "เสมอทุนครึ่งหนึ่ง" จะถูกนับเป็นชนะเต็ม */
  const ahLeg = (g, ln) => {
    let win = 0, push = 0;
    for (const c of g.grid) {
      const m = c.h - c.a + ln;
      if (m > 1e-9) win += c.p; else if (Math.abs(m) < 1e-9) push += c.p;
    }
    return push < 0.9999 ? win / (1 - push) : 0.5;   /* ตัดผลเสมอทุนออกจากตัวหาร */
  };
  const ahProb = (g, ln) => {
    if (!g || ln == null) return null;
    const quarter = Math.abs(ln * 4 - Math.round(ln * 4)) < 1e-9 && Math.abs(ln * 2 - Math.round(ln * 2)) > 1e-9;
    return quarter ? (ahLeg(g, ln - 0.25) + ahLeg(g, ln + 0.25)) / 2 : ahLeg(g, ln);
  };

  return (
    <div className="rounded-sm overflow-hidden" style={{ background:"#211B17", border:"1px solid #302823" }}>
      <p className="px-3 py-2 text-[11px]" style={{ background:"#2A2320", color:"#C8A24A" }}>
        7 · อัตราต่อรอง
      </p>
      {!mg && (
        <p className="px-3 py-2 text-[11px]" style={{ color:"#6B5D50" }}>
          ยังไม่มีราคาตลาดของนัดนี้ — ราคามาจาก football-data.co.uk ซึ่งลงหลังจบนัด ส่วนนัดที่ยังไม่เตะต้องดึงจากไฟล์ fixtures
        </p>
      )}
      <div className="flex items-baseline gap-2 px-3 py-1.5" style={{ background:"#1A1512" }}>
        <span className="text-[10px] flex-1" style={{ color:"#6B5D50" }}>ตลาด</span>
        <span className="text-[10px] w-12 text-right" style={{ color:"#6B5D50" }}>ราคา</span>
        <span className="text-[10px] w-12 text-right" style={{ color:"#6B5D50" }}>ตลาด%</span>
        <span className="text-[10px] w-12 text-right" style={{ color:"#6B5D50" }}>เรา%</span>
        <span className="text-[10px] w-12 text-right" style={{ color:"#6B5D50" }}>ต่าง</span>
      </div>
      <p className="px-3 pb-2 text-[10px] leading-relaxed" style={{ background:"#1A1512", color:"#5A4E44" }}>
        ราคาสีขาวคือราคาที่เจ้ามือเปิดจริง · ราคาที่มี ≈ และสีจางคือราคายุติธรรมที่เราคำนวณเอง ไม่ใช่ราคาของเจ้ามือ
      </p>

      {mg && (<>
        <Sec n="1" t="อัตราต่อรองแต้มต่อเต็มเวลา"
          sub={"ราคาจริงจากเจ้ามือ (เฉลี่ยราคาปิดหลายเจ้า) · ส่วนต่างเจ้ามือ " + (mp.margin*100).toFixed(1)
            + "% ตัดออกแล้ว · คอลัมน์ เรา% คือราคาตลาดเอียงด้วยคะแนนดวง k=" + OMEN_TILT_K}/>
        <Grp t="ผลเต็มเวลา 1X2" />
        <Row label={hName + " ชนะ"} odds={raw.oH} mkt={mg.pH} ours={tg && tg.pH} kind="real" />
        <Row label="เสมอ" odds={raw.oD} mkt={mg.pD} ours={tg && tg.pD} kind="real" />
        <Row label={aName + " ชนะ"} odds={raw.oA} mkt={mg.pA} ours={tg && tg.pA} kind="real" />
        {line != null ? (<>
          <Grp t={"ต่อรองลูก " + (line > 0 ? "เจ้าบ้านรอง " + line : line < 0 ? "เจ้าบ้านต่อ " + Math.abs(line) : "เสมอกัน")} />
          <Row label={hName + " " + (line>=0?"+":"") + line} odds={raw.ahH}
            mkt={ahProb(mg,line)} ours={ahProb(tg,line)} kind="real" />
          <Row label={aName + " " + (line<=0?"+":"-") + Math.abs(line)} odds={raw.ahA}
            mkt={ahProb(mg,line)!=null?1-ahProb(mg,line):null}
            ours={ahProb(tg,line)!=null?1-ahProb(tg,line):null} kind="real" />
        </>) : (
          <p className="px-3 py-2 text-[10.5px]" style={{ color:"#6B5D50" }}>
            นัดนี้ไม่มีเส้นต่อรองลูกในแหล่งข้อมูล
          </p>
        )}

        <Sec n="2" t="ครึ่งแรก สกอร์ สูง-ต่ำ"
          sub={"แหล่งข้อมูลไม่มีราคาครึ่งแรกและราคาสกอร์ จึงถอดจากราคาจริงในหัวข้อ 1 ด้วยปัวซง "
            + "(ประตูคาดครึ่งแรก = เต็มเวลา × " + HT_RATIO_H + " ฝั่งเหย้า และ × " + HT_RATIO_A
            + " ฝั่งเยือน วัดจากผลจริงทั้งฤดูกาล) · เส้นสูง-ต่ำ 2.5 เต็มเวลาเป็นราคาจริง"}/>
        <Grp t="ผลครึ่งแรก" />
        <Row label={hName + " นำพักครึ่ง"} mkt={hmg && hmg.pH} ours={htg && htg.pH} />
        <Row label="เสมอพักครึ่ง" mkt={hmg && hmg.pD} ours={htg && htg.pD} />
        <Row label={aName + " นำพักครึ่ง"} mkt={hmg && hmg.pA} ours={htg && htg.pA} />
        <Grp t="สูง-ต่ำ ครึ่งแรก" />
        <Row label="ครึ่งแรก มีประตู (สูงกว่า 0.5)" mkt={sum(hmg,c=>c.h+c.a>0.5)} ours={sum(htg,c=>c.h+c.a>0.5)} />
        <Row label="ครึ่งแรก สูงกว่า 1.5 ลูก" mkt={sum(hmg,c=>c.h+c.a>1.5)} ours={sum(htg,c=>c.h+c.a>1.5)} />
        <Grp t="สกอร์ครึ่งแรก 4 อันดับแรก" />
        {hmg && hmg.top.slice(0,4).map((c,i)=>(
          <Row key={"h"+i} label={c.h + " – " + c.a} mkt={c.p} ours={at(htg,c.h,c.a)} />
        ))}
        <Grp t="สกอร์เต็มเวลา 6 อันดับแรก" />
        {mg.top.slice(0,6).map((c,i)=>(
          <Row key={"f"+i} label={c.h + " – " + c.a} mkt={c.p} ours={at(tg,c.h,c.a)} />
        ))}
        <Grp t="สูง-ต่ำ เต็มเวลา" />
        <Row label="สูงกว่า 2.5 ลูก" odds={raw.ov25} mkt={mg.over25} ours={tg && tg.over25}
          kind={raw.ov25 ? "real" : "derived"} note={raw.ov25 ? "" : "ไม่มีราคาจริง"} />
        <Row label="ต่ำกว่า 2.5 ลูก" odds={raw.un25} mkt={mg.under25} ours={tg && tg.under25}
          kind={raw.un25 ? "real" : "derived"} note={raw.un25 ? "" : "ไม่มีราคาจริง"} />
        <Row label="สูงกว่า 1.5 ลูก" mkt={sum(mg,c=>c.h+c.a>1.5)} ours={sum(tg,c=>c.h+c.a>1.5)} />
        <Row label="สูงกว่า 3.5 ลูก" mkt={sum(mg,c=>c.h+c.a>3.5)} ours={sum(tg,c=>c.h+c.a>3.5)} />
        <Row label="ยิงกันทั้งคู่" mkt={mg.btts} ours={tg && tg.btts} />
        <Row label={hName + " ไม่เสียประตู"} mkt={mg.csHome} ours={tg && tg.csHome} />
        <Row label={aName + " ไม่เสียประตู"} mkt={mg.csAway} ours={tg && tg.csAway} />
      </>)}

      {sf && (<>
        <Sec n="3" t="จำนวนเตะมุม"
          sub={"แหล่งข้อมูลไม่มีราคาเตะมุม ตัวเลขนี้เป็นของเราล้วน คอลัมน์ ตลาด% จึงว่าง · "
            + "ใช้ค่าเฉลี่ยลีก " + sf.cornerLg.toFixed(2) + " ลูกต่อนัด เพราะทดสอบแล้วโมเดลรายทีมแพ้ค่าเฉลี่ยทุกค่าการหดตัว · จาก " + sf.n + " นัด"}/>
        <Row label="เตะมุมรวม สูงกว่า 8.5" mkt={null} ours={overProb(sf.cornerTot,8.5)} kind="ours" />
        <Row label="เตะมุมรวม สูงกว่า 9.5" mkt={null} ours={overProb(sf.cornerTot,9.5)} kind="ours" />
        <Row label="เตะมุมรวม สูงกว่า 10.5" mkt={null} ours={overProb(sf.cornerTot,10.5)} kind="ours" />
        <Row label="เตะมุมรวม สูงกว่า 11.5" mkt={null} ours={overProb(sf.cornerTot,11.5)} kind="ours" />
        <p className="px-3 py-2 text-[10.5px] leading-relaxed" style={{ color:"#6B5D50" }}>
          คาดเตะมุม {hName} {sf.cornerH.toFixed(1)} · {aName} {sf.cornerA.toFixed(1)} · รวม {sf.cornerTot.toFixed(1)} ลูก
        </p>

        <Sec n="4" t="จำนวนใบเหลือง-แดงทั้งหมด"
          sub={"นับใบเหลืองและใบแดงรวมกันเป็นใบเดียวกัน · ไม่มีราคาตลาดในแหล่งข้อมูล เป็นของเราล้วน · "
            + "ใช้โมเดลรายทีมที่ค่าการหดตัว K=" + CARD_K + " ซึ่งทดสอบแล้วชนะค่าเฉลี่ยลีก · ค่าเฉลี่ยลีก "
            + sf.cardLg.toFixed(2) + " ใบต่อนัด"}/>
        <Row label="ใบรวมทั้งนัด สูงกว่า 2.5" mkt={null} ours={overProb(sf.cardTot,2.5)} kind="ours" />
        <Row label="ใบรวมทั้งนัด สูงกว่า 3.5" mkt={null} ours={overProb(sf.cardTot,3.5)} kind="ours" />
        <Row label="ใบรวมทั้งนัด สูงกว่า 4.5" mkt={null} ours={overProb(sf.cardTot,4.5)} kind="ours" />
        <Row label="ใบรวมทั้งนัด สูงกว่า 5.5" mkt={null} ours={overProb(sf.cardTot,5.5)} kind="ours" />
        <p className="px-3 py-2 text-[10.5px] leading-relaxed" style={{ color:"#6B5D50" }}>
          คาดใบ {hName} {sf.cardH.toFixed(1)} · {aName} {sf.cardA.toFixed(1)} · รวม {sf.cardTot.toFixed(1)} ใบ
          {!sf.teamCards && " · ทีมใดทีมหนึ่งยังไม่มีสถิติพอ ใช้ค่าเฉลี่ยลีกแทน"}
        </p>
      </>)}

      {ourPo && mg && (
        <p className="px-3 py-2 text-[10.5px] leading-relaxed"
          style={{ borderTop:"1px solid #2A2320", background:"#1A1512", color:"#6B5D50" }}>
          เทียบกันตรง ๆ: ปัวซงของเราเองให้ประตูคาด {ourPo.lh.toFixed(2)} – {ourPo.la.toFixed(2)} ส่วนตลาดให้ {mg.lh.toFixed(2)} – {mg.la.toFixed(2)} ·
          ทดสอบเดินหน้า 63 นัดแล้วตลาดแม่นกว่าโมเดลเราชัดเจน คอลัมน์ "เรา%" จึงอิงตลาดเป็นฐาน ไม่ได้ใช้ปัวซงของเราเอง ·
          ตัวเลขทั้งหมดเป็นการวิเคราะห์ ไม่ใช่คำแนะนำการพนัน
        </p>
      )}
    </div>
  );
}

const Step = ({ n, title, children }) => (
  <div className="rounded-sm overflow-hidden" style={{ background:"#211B17", border:"1px solid #302823" }}>
    <div className="flex items-center gap-2 px-3 py-2" style={{ background:"#2A2320" }}>
      <span className="w-5 h-5 rounded-full text-[11px] flex items-center justify-center shrink-0"
        style={{ background:"#3A302A", color:"#C8A24A" }}>{n}</span>
      <span className="text-[12px]" style={{ color:"#C8A24A" }}>{title}</span>
    </div>
    <div className="px-3 py-2">{children}</div>
  </div>
);

function LineupRow({ A, B, cA, cB, onPick }) {
  const la = A.starters, lb = B.starters;
  return (
    <div>
      {(A.team.lineupAt || B.team.lineupAt) && (
        <p className="text-[10px] pb-1.5" style={{ color:"#5A4E44" }}>
          บันทึกไว้ล่าสุด {[A,B].filter(S=>S.team.lineupAt)
            .map(S=>`${S.team.name} ${new Date(S.team.lineupAt).toLocaleDateString("th-TH",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}`)
            .join(" · ")} — ใช้ต่อได้เลย หรือกดปุ่มเพื่อแก้
        </p>
      )}
      <div className="flex items-center gap-2 pb-2">
        <button onClick={()=>onPick(A.team.slug)} className="flex-1 py-1.5 rounded-sm text-[11.5px] truncate"
          style={{ background:"#2A2320", color:cA, borderLeft:`3px solid ${cA}` }}>
          {A.team.name} · {la.length}/11
        </button>
        <button onClick={()=>onPick(B.team.slug)} className="flex-1 py-1.5 rounded-sm text-[11.5px] truncate"
          style={{ background:"#2A2320", color:cB, borderRight:`3px solid ${cB}` }}>
          {B.team.name} · {lb.length}/11
        </button>
      </div>

      {(la.length || lb.length) ? (
        POS_ORDER.map(pos=>{
          const ga = la.filter(x=>x.p.pos===pos), gb = lb.filter(x=>x.p.pos===pos);
          const n = Math.max(ga.length, gb.length);
          if (!n) return null;
          return (
            <div key={pos}>
              <div className="flex items-center gap-2 py-1" style={{ background:"#1A1512" }}>
                <span className="flex-1 text-[10px] text-right pr-1" style={{ color:"#6B5D50" }}>{ga.length}</span>
                <span className="w-[54px] text-center text-[11px]" style={{ color:"#8B7C6C" }}>{pos}</span>
                <span className="flex-1 text-[10px] pl-1" style={{ color:"#6B5D50" }}>{gb.length}</span>
              </div>
              {Array.from({length:n}).map((_,i)=>(
                <div key={i} className="flex items-start gap-2 py-1" style={{ borderTop:"1px solid #241E1A" }}>
                  <div className="flex-1 min-w-0 text-right">{ga[i] && <Cell x={ga[i]} align="right" />}</div>
                  <span className="w-[54px] shrink-0" />
                  <div className="flex-1 min-w-0">{gb[i] && <Cell x={gb[i]} align="left" />}</div>
                </div>
              ))}
            </div>
          );
        })
      ) : (
        <p className="text-[11.5px] py-2" style={{ color:"#6B5D50" }}>
          ยังไม่ได้เลือก กดปุ่มด้านบนเพื่อจัดตัว
        </p>
      )}
    </div>
  );
}


const F = ({ label, ...rest }) => (
  <div>
    <label className="text-[11px] text-stone-500 block mb-1">{label}</label>
    <input {...rest} className="w-full px-2.5 py-2 rounded-sm text-[13px] text-stone-100 outline-none"
      style={{ background:"#171310", border:"1px solid #362D27" }} />
  </div>
);

/* ═══════════ Elo และ Poisson ═══════════ */
const RESULTS_KEY = "bazi:results";

/* ═══════════ คะแนนฟอร์มหลังจบเกม (WhoScored) ═══════════
   ดึงจากเว็บผ่าน Chrome ของอ้น — ใช้ทดสอบว่าคะแนนดวงรายคนสัมพันธ์กับฟอร์มจริงไหม
   1 นัดได้ 22 จุดข้อมูล แทนที่จะได้จุดเดียวจากผลแพ้ชนะ จึงตัดสินได้เร็วกว่ามาก */
const RATINGS_KEY = "bazi:ratings";
const SEED_RATINGS = [
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Senne Lammens",6.4],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Leny Yoro",7.0],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Harry Maguire",6.7],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Ayden Heaven",5.6],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Diogo Dalot",6.8],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Carlos Baleba",6.7],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Kobbie Mainoo",6.9],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Amad Diallo",6.5],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Bruno Fernandes",8.3],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Matheus Cunha",7.8],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Bryan Mbeumo",5.9],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Matthijs de Ligt",6.1],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Lisandro Martínez",6.4],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Mason Mount",6.1],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Youri Tielemans",6.6],
  ["2026-11-03","Manchester United","AS Roma","Manchester United","Shea Lacey",7.4],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Devis Vásquez",6.3],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Gianluca Mancini",5.5],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Leonardo Balerdi",5.4],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Mario Hermoso",6.6],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Devyne Rensch",6.1],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Bryan Cristante",7.1],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Marten de Roon",6.7],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Wesley",6.8],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Rodrigo Mora",7.5],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Matías Soulé",7.2],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Donyell Malen",7.6],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Evan Ndicka",6.0],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Emanuele Lulli",6.1],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Daniele Ghilardi",6.4],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Niccolò Pisilli",6.3],
  ["2026-11-03","Manchester United","AS Roma","AS Roma","Santiago Castro",6.1],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Lukas Hornicek",5.5],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Amar Dedić",6.5],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Fabian Schär",6.6],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Dan Burn",6.4],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Lewis Hall",6.4],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Nico González",6.7],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Joelinton",6.5],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Anthony Elanga",5.9],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Joe Willock",6.7],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Harvey Barnes",6.3],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","William Osula",6.0],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Sean Steur",6.6],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Jacob Ramsey",4.5],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Yoane Wissa",6.8],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Bazoumana Toure",6.4],
  ["2026-11-02","Newcastle United","Everton","Newcastle United","Jacob Murphy",6.7],
  ["2026-11-02","Newcastle United","Everton","Everton","Jordan Pickford",7.7],
  ["2026-11-02","Newcastle United","Everton","Everton","Jake O'Brien",7.1],
  ["2026-11-02","Newcastle United","Everton","Everton","James Tarkowski",7.2],
  ["2026-11-02","Newcastle United","Everton","Everton","Jarrad Branthwaite",7.4],
  ["2026-11-02","Newcastle United","Everton","Everton","Vitaliy Mykolenko",7.0],
  ["2026-11-02","Newcastle United","Everton","Everton","James Garner",7.3],
  ["2026-11-02","Newcastle United","Everton","Everton","Harrison Armstrong",7.0],
  ["2026-11-02","Newcastle United","Everton","Everton","Merlin Rohl",7.0],
  ["2026-11-02","Newcastle United","Everton","Everton","Kiernan Dewsbury-Hall",7.3],
  ["2026-11-02","Newcastle United","Everton","Everton","Tyrique George",7.4],
  ["2026-11-02","Newcastle United","Everton","Everton","Thierno Barry",7.5],
  ["2026-11-02","Newcastle United","Everton","Everton","Michael Keane",6.4],
  ["2026-11-02","Newcastle United","Everton","Everton","Hayden Hackney",6.1],
  ["2026-11-02","Newcastle United","Everton","Everton","Brennan Johnson",6.1],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Alisson",7.1],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Ronald Araújo",6.6],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Jeremy Jacquet",6],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Virgil van Dijk",7.3],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Milos Kerkez",6.8],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Alexis Mac Allister",6.3],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Treymaurice Nyoni",6.5],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Cody Gakpo",5.9],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Florian Wirtz",6.9],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Bradley Barcola",6],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Alexander Isak",5.9],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Kostas Tsimikas",6],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Dominik Szoboszlai",6.5],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Victor Munoz",6.2],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Lewis Koumas",6.1],
  ["2026-11-01","Liverpool","Arsenal","Liverpool","Rio Ngumoha",6.5],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","David Raya",6.2],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","Jurriën Timber",6.9],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","Ezri Konsa",6.8],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","Gabriel Magalhães",7.5],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","Riccardo Calafiori",6.9],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","Declan Rice",7.8],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","Bruno Guimarães",6.4],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","Noni Madueke",7],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","Martin Ødegaard",7],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","Christos Tzolis",6.6],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","Kai Havertz",7.8],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","Piero Hincapié",6.2],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","Myles Lewis-Skelly",6.3],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","Mikel Merino",6.1],
  ["2026-11-01","Liverpool","Arsenal","Arsenal","Viktor Gyökeres",6.1],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","Zion Suzuki",5.9],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","Matty Cash",6.5],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","Victor Lindelöf",6.7],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","Pau Torres",6.6],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","Ian Maatsen",6.6],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","Boubacar Kamara",6.7],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","Leon Goretzka",6.8],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","Alysson Edward",6.2],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","John McGinn",6.2],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","Johan Manzambi",7.4],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","Nicolas Jackson",7.8],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","Ross Barkley",6.2],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","Emiliano Buendía",6.6],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","João Gomes",6.1],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","Alejandro Garnacho",6.3],
  ["2026-10-31","Aston Villa","Fulham","Aston Villa","Ibrahim Mbaye",6.3],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Bernd Leno",7.3],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Timothy Castagne",6.8],
  ["2026-10-31","Aston Villa","Fulham","Fulham","David Affengruber",7.2],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Calvin Bassey",6],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Antonee Robinson",7.1],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Sander Berge",6.6],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Shea Charles",5.8],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Oscar Bobb",6.8],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Joshua King",6.7],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Alex Iwobi",7.2],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Gonzalo García",6.1],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Kenny Tete",6.5],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Cesar Palacios",6.1],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Tom Cairney",6.3],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Hugo Larsson",5.9],
  ["2026-10-31","Aston Villa","Fulham","Fulham","Rodrigo Muniz",6.1],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Antonin Kinsky",6.7],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Archie Gray",7.3],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Jan Paul van Hecke",7.8],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Micky van de Ven",7.2],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Andy Robertson",7.4],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Sandro Tonali",7.1],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Mateus Fernandes",7.1],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Mohammed Kudus",7],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Omar Marmoush",6.9],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Mathys Tel",7],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Dominic Solanke",7.2],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Destiny Udogie",6.2],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Pedro Porro",6.5],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Conor Gallagher",6.7],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Dejan Kulusevski",6.4],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Tottenham Hotspur","Luca Williams-Barnet",6.5],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Dean Henderson",7.8],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Chris Richards",6.7],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Axel Disasi",6.8],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Jaydee Canvot",6.6],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Óscar Mingueza",5.8],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Adam Wharton",6.3],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Daichi Kamada",6.5],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Tyrick Mitchell",6.5],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Dwight McNeil",6.4],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Yéremy Pino",6.1],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Jean-Philippe Mateta",3.8],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Anan Khalaili",6.2],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Jefferson Lerma",5.8],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Will Hughes",5.8],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Darío Osorio",6.3],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace","Crystal Palace","Eddie Nketiah",6],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Caoimhin Kelleher",7.1],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Michael Kayode",6.5],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Kristoffer Ajer",7.2],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Sepp van den Berg",7],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Keane Lewis-Potter",6.8],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Mamadou Sangare",6.9],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Vitaly Janelt",7],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Dango Ouattara",7.2],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Mathias Jensen",7],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Kevin Schade",6.8],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Igor Thiago",7.6],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Aaron Hickey",6.8],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Mikkel Damsgaard",6.4],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Callum Wilson",6],
  ["2026-10-31","Brentford","Nottingham Forest","Brentford","Jaidon Anthony",7.2],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","Matz Sels",6.3],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","Jair Cunha",6.8],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","Nikola Milenković",5.5],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","Murillo",6],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","Ola Aina",6.3],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","James McAtee",6.9],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","Xaver Schlager",5.7],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","Neco Williams",6.8],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","Morgan Gibbs-White",6.5],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","Dan Ndoye",6.4],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","Liam Delap",5.6],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","Daniel Muñoz",6.5],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","Ryan Yates",6.4],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","Chris Wood",6],
  ["2026-10-31","Brentford","Nottingham Forest","Nottingham Forest","Arnaud Kalimuendo",6.1],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","Đorđe Petrović",6.9],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","Adam Smith",6.2],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","James Hill",6.8],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","António Silva",7.2],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","Adrien Truffert",6.7],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","Ryan Christie",6.8],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","Tyler Adams",6.7],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","Rayan",6.3],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","Justin Kluivert",7.4],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","Marcus Tavernier",7.1],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","Evanilson",7.6],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","Bafode Diakite",5.8],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","Lewis Cook",6.6],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","Amine Adli",7.4],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","Eli Junior Kroupi",7.4],
  ["2026-10-31","Bournemouth","Leeds United","Bournemouth","Alvaro Rodriguez",6.4],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","James Trafford",5.5],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","James Justin",6.7],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","Nico Elvedi",6.6],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","Tarik Muharemović",6.6],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","Jayden Bogle",6.5],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","Ethan Ampadu",5.9],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","Ao Tanaka",6.1],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","Gabriel Gudmundsson",6],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","Daniel James",6.7],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","Harry Wilson",6.5],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","Dominic Calvert-Lewin",5.3],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","Sean Longstaff",6.2],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","Brenden Aaronson",6.1],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","Anton Stach",6.3],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","Lukas Nmecha",6.5],
  ["2026-10-31","Bournemouth","Leeds United","Leeds United","Jean Matteo Bahoya",6.2],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Mike Penders",7.4],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Joshua Acheampong",7],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Wesley Fofana",6.5],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Levi Colwill",7.2],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Marco Palestra",6.8],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Roméo Lavia",8],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Moisés Caicedo",6.9],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Estêvão",7.2],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Cole Palmer",7.7],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Morgan Rogers",7.8],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Pedro Neto",6.8],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Malo Gusto",6.3],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Pep Chavarría",6.4],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Valentín Barco",5.7],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Geovany Quenda",6],
  ["2026-10-31","Chelsea","Manchester United","Chelsea","Danny Welbeck",6],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Senne Lammens",7.3],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Leny Yoro",6.7],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Harry Maguire",6],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Lisandro Martínez",3.6],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Diogo Dalot",6.6],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Andrey Santos",6.3],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Carlos Baleba",5.6],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Amad Diallo",6.3],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Bruno Fernandes",5.8],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Matheus Cunha",6.2],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Bryan Mbeumo",6.6],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Ayden Heaven",6.4],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Mason Mount",6.2],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Kobbie Mainoo",6.1],
  ["2026-10-31","Chelsea","Manchester United","Manchester United","Joshua Zirkzee",6.1],
  ["2026-10-31","Coventry City","Sunderland","Coventry City","Carl Rushworth",6.8],
  ["2026-10-31","Coventry City","Sunderland","Coventry City","Milan van Ewijk",7.1],
  ["2026-10-31","Coventry City","Sunderland","Coventry City","Stephen Mfuni",7.1],
  ["2026-10-31","Coventry City","Sunderland","Coventry City","Ethan Pinnock",6.5],
  ["2026-10-31","Coventry City","Sunderland","Coventry City","Jay Dasilva",6.7],
  ["2026-10-31","Coventry City","Sunderland","Coventry City","Caleb Yirenkyi",6],
  ["2026-10-31","Coventry City","Sunderland","Coventry City","Victor Torp",7.2],
  ["2026-10-31","Coventry City","Sunderland","Coventry City","Tatsuhiro Sakamoto",7.5],
  ["2026-10-31","Coventry City","Sunderland","Coventry City","Jack Rudoni",7.9],
  ["2026-10-31","Coventry City","Sunderland","Coventry City","Yann Gboho",6.4],
  ["2026-10-31","Coventry City","Sunderland","Coventry City","Taiwo Awoniyi",7.8],
  ["2026-10-31","Coventry City","Sunderland","Coventry City","Matt Grimes",6.4],
  ["2026-10-31","Coventry City","Sunderland","Coventry City","Brandon Thomas-Asante",6.2],
  ["2026-10-31","Coventry City","Sunderland","Coventry City","Sidiki Cherif",6.3],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Robin Roefs",6.3],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Trai Hume",6.3],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Luke O'Nien",5.8],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Omar Alderete",4.6],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Reinildo Mandava",6.3],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Granit Xhaka",7],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Noah Sadiki",6.5],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Chris Rigg",6.6],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Enzo Le Fée",7.8],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Nilson Angulo",6.2],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Brian Brobbey",5.9],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Thomas Meunier",6.4],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Chemsdine Talbi",6],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Wilson Isidor",6.5],
  ["2026-10-31","Coventry City","Sunderland","Sunderland","Malick Fofana",6.3],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Konstantinos Tzolakis",6.4],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Lewie Coyle",6.8],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Semi Ajayi",6.8],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","John Egan",6.4],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Nobel Mendy",6.6],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Ryan Giles",6.6],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Mohamed Belloumi",6.8],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Tim Iroegbunam",7.3],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Regan Slater",6.6],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Elliot Stroud",5.3],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Oli McBurnie",8.3],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Brooke Norton-Cuffy",6.4],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Hidemasa Morita",6.3],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Matt Crooks",6.3],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Joe Gelhardt",6.1],
  ["2026-10-31","Hull City","Ipswich Town","Hull City","Mohamed-Ali Cho",6.1],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Christian Walton",6.4],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Abdoul Ouattara",7.8],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Issa Diop",6.9],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Dara O'Shea",6.4],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Leif Davis",6.6],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Exequiel Palacios",7],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Florentino Luis",7],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Abdul Fatawu",6.4],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Julio Enciso",8.2],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Jaden Philogene",6.2],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Emersonn Da Silva",6.1],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Azor Matusiwa",7.3],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Zian Flemming",6],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Chuba Akpom",5.8],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Daizen Maeda",6.2],
  ["2026-10-31","Hull City","Ipswich Town","Ipswich Town","Jack Clarke",6.5],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Gianluigi Donnarumma",6.3],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Matheus Nunes",5.6],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Abdukodir Khusanov",7],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Rúben Dias",6.5],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Joško Gvardiol",6.6],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Ayyoub Bouaddi",6.2],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Elliot Anderson",6.4],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Iliman Ndiaye",6.7],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Enzo Fernández",6.5],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Jérémy Doku",7.2],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Erling Haaland",6.2],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Nico O'Reilly",6.6],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Rayan Cherki",6.4],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Phil Foden",6.1],
  ["2026-10-31","Manchester City","Brighton","Manchester City","Allan Elias",6.1],
  ["2026-10-31","Manchester City","Brighton","Brighton","Bart Verbruggen",8.5],
  ["2026-10-31","Manchester City","Brighton","Brighton","Costinha",7.3],
  ["2026-10-31","Manchester City","Brighton","Brighton","Luka Vuskovic",7.3],
  ["2026-10-31","Manchester City","Brighton","Brighton","Lewis Dunk",7.5],
  ["2026-10-31","Manchester City","Brighton","Brighton","Olivier Boscagli",6.9],
  ["2026-10-31","Manchester City","Brighton","Brighton","Pascal Groß",6.9],
  ["2026-10-31","Manchester City","Brighton","Brighton","Chema Andrés",6.6],
  ["2026-10-31","Manchester City","Brighton","Brighton","Diego Gómez",7.1],
  ["2026-10-31","Manchester City","Brighton","Brighton","Yasin Ayari",7.9],
  ["2026-10-31","Manchester City","Brighton","Brighton","Maxime De Cuyper",7.2],
  ["2026-10-31","Manchester City","Brighton","Brighton","Charalampos Kostoulas",6.4],
  ["2026-10-31","Manchester City","Brighton","Brighton","Jaouen Hadjam",6.8],
  ["2026-10-31","Manchester City","Brighton","Brighton","Jack Hinshelwood",6.2],
  ["2026-10-31","Manchester City","Brighton","Brighton","Mats Wieffer",6.6],
  ["2026-10-31","Manchester City","Brighton","Brighton","Malick Yalcouyé",6.7],
  ["2026-10-31","Manchester City","Brighton","Brighton","Georginio Rutter",6.2],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Robin Roefs",7.9],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Trai Hume",6.8],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Nordi Mukiele",6.6],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Luke O'Nien",7.3],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Reinildo Mandava",6.5],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Granit Xhaka",7.1],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Noah Sadiki",6.8],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Chris Rigg",6.7],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Enzo Le Fée",7],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Nilson Angulo",7.1],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Brian Brobbey",6.6],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Omar Alderete",6.8],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Habib Diarra",6],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Chemsdine Talbi",6.4],
  ["2026-10-25","Sunderland","Leeds United","Sunderland","Timur Tutierov",6],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","James Trafford",7.6],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","James Justin",6.9],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","Jaka Bijol",7.3],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","Tarik Muharemović",7.3],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","Jayden Bogle",6.6],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","Ethan Ampadu",6.5],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","Ao Tanaka",6.8],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","Gabriel Gudmundsson",6.6],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","Harry Wilson",6.7],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","Brenden Aaronson",6.5],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","Dominic Calvert-Lewin",6],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","Sean Longstaff",6.3],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","Anton Stach",5.7],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","Lukas Nmecha",6],
  ["2026-10-25","Sunderland","Leeds United","Leeds United","Noah Okafor",5.9],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Walter Benítez",9],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Jefferson Lerma",8.5],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Chris Richards",7.7],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Jaydee Canvot",7.2],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Anan Khalaili",6.5],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Quinten Timber",7.6],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Adam Wharton",7.8],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Tyrick Mitchell",7.1],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Daichi Kamada",8.2],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Yéremy Pino",8.1],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Jørgen Strand Larsen",7.4],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Honest Ahanor",6.7],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Ismaila Sarr",6],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Eddie Nketiah",5.8],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Crystal Palace","Dwight McNeil",5.8],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","Matz Sels",6.3],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","Ola Aina",6],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","Ousmane Diomande",5.7],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","Murillo",6.8],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","Daniel Muñoz",5.8],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","Xaver Schlager",6.1],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","James McAtee",6.2],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","Neco Williams",6.1],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","Morgan Gibbs-White",7.1],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","Dan Ndoye",7.4],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","Liam Delap",5.7],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","Ibrahim Sangaré",6],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","Callum Hudson-Odoi",5.8],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","Chris Wood",5.7],
  ["2026-10-11","Crystal Palace","Nottingham Forest","Nottingham Forest","Arnaud Kalimuendo",5.7],
  ["2026-10-11","Hull City","Everton","Hull City","Konstantinos Tzolakis",6.8],
  ["2026-10-11","Hull City","Everton","Hull City","Lewie Coyle",6.7],
  ["2026-10-11","Hull City","Everton","Hull City","Semi Ajayi",6.8],
  ["2026-10-11","Hull City","Everton","Hull City","John Egan",6.8],
  ["2026-10-11","Hull City","Everton","Hull City","Nobel Mendy",6.7],
  ["2026-10-11","Hull City","Everton","Hull City","Ryan Giles",6.1],
  ["2026-10-11","Hull City","Everton","Hull City","Joe Gelhardt",7.9],
  ["2026-10-11","Hull City","Everton","Hull City","Matt Crooks",5.7],
  ["2026-10-11","Hull City","Everton","Hull City","Regan Slater",6.3],
  ["2026-10-11","Hull City","Everton","Hull City","Sorba Thomas",7],
  ["2026-10-11","Hull City","Everton","Hull City","Oli McBurnie",6],
  ["2026-10-11","Hull City","Everton","Hull City","Hidemasa Morita",6.2],
  ["2026-10-11","Hull City","Everton","Hull City","Elliot Stroud",7.4],
  ["2026-10-11","Hull City","Everton","Hull City","Tim Iroegbunam",6.2],
  ["2026-10-11","Hull City","Everton","Hull City","Mohamed Belloumi",8],
  ["2026-10-11","Hull City","Everton","Hull City","Robinio Vaz",5.8],
  ["2026-10-11","Hull City","Everton","Everton","Jordan Pickford",6],
  ["2026-10-11","Hull City","Everton","Everton","Ainsley Maitland-Niles",6.8],
  ["2026-10-11","Hull City","Everton","Everton","James Tarkowski",7.2],
  ["2026-10-11","Hull City","Everton","Everton","Michael Keane",6.5],
  ["2026-10-11","Hull City","Everton","Everton","Jarrad Branthwaite",6.1],
  ["2026-10-11","Hull City","Everton","Everton","James Garner",6.4],
  ["2026-10-11","Hull City","Everton","Everton","Harrison Armstrong",6.7],
  ["2026-10-11","Hull City","Everton","Everton","Brennan Johnson",6.3],
  ["2026-10-11","Hull City","Everton","Everton","Kiernan Dewsbury-Hall",8.8],
  ["2026-10-11","Hull City","Everton","Everton","Jack Grealish",6.8],
  ["2026-10-11","Hull City","Everton","Everton","Thierno Barry",7.6],
  ["2026-10-11","Hull City","Everton","Everton","Jake O'Brien",5.9],
  ["2026-10-11","Hull City","Everton","Everton","Carlos Alcaraz",5.9],
  ["2026-10-11","Hull City","Everton","Everton","Hayden Hackney",5.9],
  ["2026-10-11","Hull City","Everton","Everton","Tyrique George",5.9],
  ["2026-10-11","Hull City","Everton","Everton","Tyler Dibling",5.8],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Alisson",5.5],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Ronald Araújo",5.8],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Jeremy Jacquet",5.7],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Virgil van Dijk",6],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Milos Kerkez",6.2],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Ryan Gravenberch",4.2],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Alexis Mac Allister",6.1],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Victor Munoz",6.3],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Florian Wirtz",6.1],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Bradley Barcola",6],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Lewis Koumas",5.8],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Joe Gomez",6.1],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Jeremie Frimpong",5.8],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Treymaurice Nyoni",5.8],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Federico Chiesa",5.7],
  ["2026-10-11","Liverpool","Manchester City","Liverpool","Rio Ngumoha",5.8],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Gianluigi Donnarumma",8.3],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Matheus Nunes",7.1],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Rúben Dias",7.7],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Marc Guéhi",7.2],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Nico O'Reilly",6.7],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Elliot Anderson",8.4],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Enzo Fernández",7.1],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Iliman Ndiaye",6.4],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Rayan Cherki",8.2],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Antoine Semenyo",6.8],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Erling Haaland",8.2],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Joško Gvardiol",7.7],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Ayyoub Bouaddi",5.8],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Jérémy Doku",9.1],
  ["2026-10-11","Liverpool","Manchester City","Manchester City","Allan Elias",5.9],
  ["2026-10-25","Crystal Palace","Newcastle United","Crystal Palace","Walter Benítez",6.2],
  ["2026-10-25","Crystal Palace","Newcastle United","Crystal Palace","Chris Richards",6.6],
  ["2026-10-25","Crystal Palace","Newcastle United","Crystal Palace","Axel Disasi",6.8],
  ["2026-10-25","Crystal Palace","Newcastle United","Crystal Palace","Jaydee Canvot",6.6],
  ["2026-10-25","Crystal Palace","Newcastle United","Crystal Palace","Anan Khalaili",6.6],
  ["2026-10-25","Crystal Palace","Newcastle United","Crystal Palace","Adam Wharton",5.1],
  ["2026-10-25","Crystal Palace","Newcastle United","Crystal Palace","Daichi Kamada",6.5],
  ["2026-10-25","Crystal Palace","Newcastle United","Crystal Palace","Tyrick Mitchell",6.6],
  ["2026-10-25","Crystal Palace","Newcastle United","Crystal Palace","Dwight McNeil",6.6],
  ["2026-10-25","Crystal Palace","Newcastle United","Crystal Palace","Yéremy Pino",6.2],
  ["2026-10-25","Crystal Palace","Newcastle United","Crystal Palace","Jean-Philippe Mateta",6.1],
  ["2026-10-25","Crystal Palace","Newcastle United","Crystal Palace","Darío Osorio",6.6],
  ["2026-10-25","Crystal Palace","Newcastle United","Crystal Palace","Eddie Nketiah",5.7],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Lukas Hornicek",8.2],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Amar Dedić",7.7],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Fabian Schär",7.4],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Dan Burn",7.3],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Lewis Hall",7.1],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Nico González",6.8],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Joelinton",6.8],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Jacob Murphy",7.8],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Joe Willock",6.5],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Harvey Barnes",7.6],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","William Osula",7.8],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Malick Thiaw",6],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Sean Steur",6],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Jacob Ramsey",6.1],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Yoane Wissa",6.7],
  ["2026-10-25","Crystal Palace","Newcastle United","Newcastle United","Anthony Elanga",6.4],
  ["2026-10-25","Hull City","Brentford","Hull City","Konstantinos Tzolakis",7],
  ["2026-10-25","Hull City","Brentford","Hull City","Lewie Coyle",6.7],
  ["2026-10-25","Hull City","Brentford","Hull City","Semi Ajayi",7.1],
  ["2026-10-25","Hull City","Brentford","Hull City","John Egan",7.1],
  ["2026-10-25","Hull City","Brentford","Hull City","Lucas Herrington",6.6],
  ["2026-10-25","Hull City","Brentford","Hull City","Ryan Giles",6.2],
  ["2026-10-25","Hull City","Brentford","Hull City","Mohamed Belloumi",6.7],
  ["2026-10-25","Hull City","Brentford","Hull City","Tim Iroegbunam",7.3],
  ["2026-10-25","Hull City","Brentford","Hull City","Regan Slater",6.8],
  ["2026-10-25","Hull City","Brentford","Hull City","Elliot Stroud",6.4],
  ["2026-10-25","Hull City","Brentford","Hull City","Oli McBurnie",7.4],
  ["2026-10-25","Hull City","Brentford","Hull City","Brooke Norton-Cuffy",6.4],
  ["2026-10-25","Hull City","Brentford","Hull City","Hidemasa Morita",6.5],
  ["2026-10-25","Hull City","Brentford","Hull City","Joe Gelhardt",6],
  ["2026-10-25","Hull City","Brentford","Hull City","Robinio Vaz",6],
  ["2026-10-25","Hull City","Brentford","Hull City","Mohamed-Ali Cho",6.8],
  ["2026-10-25","Hull City","Brentford","Brentford","Caoimhin Kelleher",5.9],
  ["2026-10-25","Hull City","Brentford","Brentford","Michael Kayode",7.3],
  ["2026-10-25","Hull City","Brentford","Brentford","Sepp van den Berg",7],
  ["2026-10-25","Hull City","Brentford","Brentford","Kristoffer Ajer",6.9],
  ["2026-10-25","Hull City","Brentford","Brentford","Keane Lewis-Potter",6.4],
  ["2026-10-25","Hull City","Brentford","Brentford","Mamadou Sangare",7],
  ["2026-10-25","Hull City","Brentford","Brentford","Aaron Hickey",5.9],
  ["2026-10-25","Hull City","Brentford","Brentford","Dango Ouattara",7.8],
  ["2026-10-25","Hull City","Brentford","Brentford","Mathias Jensen",6.5],
  ["2026-10-25","Hull City","Brentford","Brentford","Kevin Schade",6.1],
  ["2026-10-25","Hull City","Brentford","Brentford","Igor Thiago",7],
  ["2026-10-25","Hull City","Brentford","Brentford","Malick Diouf",6.3],
  ["2026-10-25","Hull City","Brentford","Brentford","Mikkel Damsgaard",6.7],
  ["2026-10-25","Hull City","Brentford","Brentford","Callum Wilson",6.1],
  ["2026-10-25","Hull City","Brentford","Brentford","Jaidon Anthony",6.8],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Alisson",6.9],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Ronald Araújo",7.5],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Jeremy Jacquet",6.8],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Virgil van Dijk",7.4],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Milos Kerkez",6.2],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Ryan Gravenberch",6.6],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Alexis Mac Allister",6.8],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Cody Gakpo",6.4],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Florian Wirtz",7.2],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Bradley Barcola",7.3],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Alexander Isak",7.8],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Kostas Tsimikas",6.5],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Treymaurice Nyoni",7],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Lewis Koumas",6],
  ["2026-10-25","Liverpool","Brighton","Liverpool","Rio Ngumoha",6],
  ["2026-10-25","Liverpool","Brighton","Brighton","Bart Verbruggen",7.2],
  ["2026-10-25","Liverpool","Brighton","Brighton","Ferdi Kadıoğlu",6],
  ["2026-10-25","Liverpool","Brighton","Brighton","Luka Vuskovic",6.3],
  ["2026-10-25","Liverpool","Brighton","Brighton","Lewis Dunk",6],
  ["2026-10-25","Liverpool","Brighton","Brighton","Olivier Boscagli",5.1],
  ["2026-10-25","Liverpool","Brighton","Brighton","Pascal Groß",6.4],
  ["2026-10-25","Liverpool","Brighton","Brighton","Chema Andrés",6.5],
  ["2026-10-25","Liverpool","Brighton","Brighton","Diego Gómez",6.7],
  ["2026-10-25","Liverpool","Brighton","Brighton","Yasin Ayari",6.7],
  ["2026-10-25","Liverpool","Brighton","Brighton","Maxime De Cuyper",6.8],
  ["2026-10-25","Liverpool","Brighton","Brighton","Charalampos Kostoulas",6.7],
  ["2026-10-25","Liverpool","Brighton","Brighton","Costinha",6.7],
  ["2026-10-25","Liverpool","Brighton","Brighton","Jack Hinshelwood",6.3],
  ["2026-10-25","Liverpool","Brighton","Brighton","Malick Yalcouyé",6.1],
  ["2026-10-25","Liverpool","Brighton","Brighton","Georginio Rutter",6.4],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Senne Lammens",5.3],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Diogo Dalot",5.7],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Leny Yoro",5.3],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Harry Maguire",6.3],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Ayden Heaven",6],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Andrey Santos",6.4],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Carlos Baleba",6.4],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Amad Diallo",6.4],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Youri Tielemans",5.8],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Mason Mount",6.5],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Bryan Mbeumo",6.3],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Lisandro Martínez",6.5],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Matheus Cunha",6.5],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Joshua Zirkzee",6.2],
  ["2026-10-25","Manchester United","Bournemouth","Manchester United","Shea Lacey",6.3],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","Đorđe Petrović",7],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","Adam Smith",7],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","James Hill",7.5],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","António Silva",7.3],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","Adrien Truffert",7.1],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","Tyler Adams",7],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","Lewis Cook",7.4],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","Rayan",7.3],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","Justin Kluivert",7.5],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","Marcus Tavernier",7.8],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","Evanilson",7.9],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","Bafode Diakite",6.1],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","Ryan Christie",6.8],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","Ben Gannon Doak",6],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","Amine Adli",5.9],
  ["2026-10-25","Manchester United","Bournemouth","Bournemouth","Eli Junior Kroupi",6.1],
  ["2026-10-17","Everton","Chelsea","Everton","Tyrique George",6],
  ["2026-10-17","Everton","Chelsea","Everton","Brennan Johnson",5.8],
  ["2026-10-17","Everton","Chelsea","Everton","Christian Nørgaard",5.7],
  ["2026-10-17","Everton","Chelsea","Everton","Jordan Pickford",6.3],
  ["2026-10-17","Everton","Chelsea","Everton","Ainsley Maitland-Niles",6],
  ["2026-10-17","Everton","Chelsea","Everton","James Tarkowski",6.7],
  ["2026-10-17","Everton","Chelsea","Everton","Jarrad Branthwaite",6.1],
  ["2026-10-17","Everton","Chelsea","Everton","Vitaliy Mykolenko",6.9],
  ["2026-10-17","Everton","Chelsea","Everton","James Garner",6],
  ["2026-10-17","Everton","Chelsea","Everton","Harrison Armstrong",6.3],
  ["2026-10-17","Everton","Chelsea","Everton","Merlin Rohl",6.7],
  ["2026-10-17","Everton","Chelsea","Everton","Kiernan Dewsbury-Hall",6.3],
  ["2026-10-17","Everton","Chelsea","Everton","Jack Grealish",6.3],
  ["2026-10-17","Everton","Chelsea","Everton","Thierno Barry",6.4],
  ["2026-10-17","Everton","Chelsea","Chelsea","Emiliano Martínez",7.9],
  ["2026-10-17","Everton","Chelsea","Chelsea","Joshua Acheampong",7.5],
  ["2026-10-17","Everton","Chelsea","Chelsea","Maxence Lacroix",7.2],
  ["2026-10-17","Everton","Chelsea","Chelsea","Levi Colwill",7.1],
  ["2026-10-17","Everton","Chelsea","Chelsea","Jorrel Hato",7],
  ["2026-10-17","Everton","Chelsea","Chelsea","Jordan Henderson",6.9],
  ["2026-10-17","Everton","Chelsea","Chelsea","Moisés Caicedo",7.3],
  ["2026-10-17","Everton","Chelsea","Chelsea","Pedro Neto",9.1],
  ["2026-10-17","Everton","Chelsea","Chelsea","Cole Palmer",7.3],
  ["2026-10-17","Everton","Chelsea","Chelsea","Morgan Rogers",6.9],
  ["2026-10-17","Everton","Chelsea","Chelsea","João Pedro",7],
  ["2026-10-17","Everton","Chelsea","Chelsea","Geovany Quenda",6],
  ["2026-10-17","Everton","Chelsea","Chelsea","Marco Palestra",6.1],
  ["2026-10-17","Everton","Chelsea","Chelsea","Mike Penders",6.4],
  ["2026-10-17","Everton","Chelsea","Chelsea","Roméo Lavia",6.2],
  ["2026-10-17","Everton","Chelsea","Chelsea","Danny Welbeck",6],
  ["2026-10-17","Fulham","Hull City","Fulham","Cesar Palacios",6.6],
  ["2026-10-17","Fulham","Hull City","Fulham","Ryan Sessegnon",5.4],
  ["2026-10-17","Fulham","Hull City","Fulham","Tom Cairney",6.6],
  ["2026-10-17","Fulham","Hull City","Fulham","Bernd Leno",6.5],
  ["2026-10-17","Fulham","Hull City","Fulham","Timothy Castagne",7.6],
  ["2026-10-17","Fulham","Hull City","Fulham","Calvin Bassey",7.3],
  ["2026-10-17","Fulham","Hull City","Fulham","David Affengruber",6.9],
  ["2026-10-17","Fulham","Hull City","Fulham","Antonee Robinson",6.8],
  ["2026-10-17","Fulham","Hull City","Fulham","Sander Berge",7.2],
  ["2026-10-17","Fulham","Hull City","Fulham","Shea Charles",7.3],
  ["2026-10-17","Fulham","Hull City","Fulham","Oscar Bobb",6.8],
  ["2026-10-17","Fulham","Hull City","Fulham","Joshua King",7.3],
  ["2026-10-17","Fulham","Hull City","Fulham","Alex Iwobi",8.5],
  ["2026-10-17","Fulham","Hull City","Fulham","Gonzalo García",6.9],
  ["2026-10-17","Fulham","Hull City","Hull City","Konstantinos Tzolakis",6.3],
  ["2026-10-17","Fulham","Hull City","Hull City","Lewie Coyle",6.1],
  ["2026-10-17","Fulham","Hull City","Hull City","John Egan",6.6],
  ["2026-10-17","Fulham","Hull City","Hull City","Semi Ajayi",5.9],
  ["2026-10-17","Fulham","Hull City","Hull City","Lucas Herrington",6.2],
  ["2026-10-17","Fulham","Hull City","Hull City","Brooke Norton-Cuffy",6],
  ["2026-10-17","Fulham","Hull City","Hull City","Mohamed Belloumi",7],
  ["2026-10-17","Fulham","Hull City","Hull City","Matt Crooks",6.1],
  ["2026-10-17","Fulham","Hull City","Hull City","Regan Slater",6.3],
  ["2026-10-17","Fulham","Hull City","Hull City","Sorba Thomas",6.2],
  ["2026-10-17","Fulham","Hull City","Hull City","Oli McBurnie",6.1],
  ["2026-10-17","Fulham","Hull City","Hull City","Robinio Vaz",6.1],
  ["2026-10-17","Fulham","Hull City","Hull City","Tim Iroegbunam",6],
  ["2026-10-17","Fulham","Hull City","Hull City","Hidemasa Morita",6.4],
  ["2026-10-17","Fulham","Hull City","Hull City","Ryan Giles",6.2],
  ["2026-10-17","Fulham","Hull City","Hull City","Joe Gelhardt",5.8],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Abdukodir Khusanov",6],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Joško Gvardiol",6.2],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Elliot Anderson",6],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Enzo Fernández",6.5],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Antoine Semenyo",5.9],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Gianluigi Donnarumma",5.9],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Matheus Nunes",6.7],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Rúben Dias",6.8],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Marc Guéhi",6.2],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Nico O'Reilly",6],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Mateo Kovačić",7.5],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Ayyoub Bouaddi",6.9],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Iliman Ndiaye",7.5],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Phil Foden",8.1],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Jérémy Doku",7.2],
  ["2026-10-17","Manchester City","Ipswich Town","Manchester City","Erling Haaland",8.8],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Christian Walton",6.4],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Issa Diop",6.7],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Dara O'Shea",6.7],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Jacob Greaves",6.2],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Abdoul Ouattara",6.4],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Leif Davis",6.6],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Exequiel Palacios",6.8],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Florentino Luis",6.2],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Daizen Maeda",6.6],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Julio Enciso",6.1],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Emersonn Da Silva",6],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Abdul Fatawu",7.2],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Jack Clarke",6],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Zian Flemming",6.8],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Azor Matusiwa",6.2],
  ["2026-10-17","Manchester City","Ipswich Town","Ipswich Town","Chuba Akpom",6.5],
  ["2026-10-17","Newcastle United","Aston Villa","Newcastle United","Bazoumana Toure",6.2],
  ["2026-10-17","Newcastle United","Aston Villa","Newcastle United","William Osula",5.8],
  ["2026-10-17","Newcastle United","Aston Villa","Newcastle United","Dan Burn",6.4],
  ["2026-10-17","Newcastle United","Aston Villa","Newcastle United","Lukas Hornicek",6.3],
  ["2026-10-17","Newcastle United","Aston Villa","Newcastle United","Lewis Miley",6.6],
  ["2026-10-17","Newcastle United","Aston Villa","Newcastle United","Sven Botman",7.1],
  ["2026-10-17","Newcastle United","Aston Villa","Newcastle United","Malick Thiaw",6.9],
  ["2026-10-17","Newcastle United","Aston Villa","Newcastle United","Lewis Hall",7.4],
  ["2026-10-17","Newcastle United","Aston Villa","Newcastle United","Joelinton",6.3],
  ["2026-10-17","Newcastle United","Aston Villa","Newcastle United","Nico González",6.4],
  ["2026-10-17","Newcastle United","Aston Villa","Newcastle United","Matias Fernandez-Pardo",6.1],
  ["2026-10-17","Newcastle United","Aston Villa","Newcastle United","Joe Willock",6.1],
  ["2026-10-17","Newcastle United","Aston Villa","Newcastle United","Harvey Barnes",6.1],
  ["2026-10-17","Newcastle United","Aston Villa","Newcastle United","Yoane Wissa",6.4],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","Zion Suzuki",7.5],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","Matty Cash",7.5],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","Victor Lindelöf",7.1],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","Tyrone Mings",6.8],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","Aaron Wan-Bissaka",6.7],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","Boubacar Kamara",7.6],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","João Gomes",7.2],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","Alysson Edward",6.7],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","Johan Manzambi",7.4],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","Emiliano Buendía",7.2],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","Nicolas Jackson",6.8],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","Ibrahim Mbaye",6.7],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","Pau Torres",6.2],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","John McGinn",6.5],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","Leon Goretzka",6.4],
  ["2026-10-17","Newcastle United","Aston Villa","Aston Villa","Ross Barkley",6.7],
  ["2026-10-17","Brentford","Liverpool","Brentford","Mikkel Damsgaard",6.07],
  ["2026-10-17","Brentford","Liverpool","Brentford","Aaron Hickey",6.51],
  ["2026-10-17","Brentford","Liverpool","Brentford","Kevin Schade",6.29],
  ["2026-10-17","Brentford","Liverpool","Brentford","Mamadou Sangare",6.13],
  ["2026-10-17","Brentford","Liverpool","Brentford","Malick Diouf",6.59],
  ["2026-10-17","Brentford","Liverpool","Brentford","Caoimhin Kelleher",6.14],
  ["2026-10-17","Brentford","Liverpool","Brentford","Michael Kayode",7.22],
  ["2026-10-17","Brentford","Liverpool","Brentford","Kristoffer Ajer",7.28],
  ["2026-10-17","Brentford","Liverpool","Brentford","Sepp van den Berg",5.97],
  ["2026-10-17","Brentford","Liverpool","Brentford","Keane Lewis-Potter",6.94],
  ["2026-10-17","Brentford","Liverpool","Brentford","Vitaly Janelt",5.05],
  ["2026-10-17","Brentford","Liverpool","Brentford","Yehor Yarmoliuk",5.2],
  ["2026-10-17","Brentford","Liverpool","Brentford","Dango Ouattara",6.77],
  ["2026-10-17","Brentford","Liverpool","Brentford","Mathias Jensen",6.16],
  ["2026-10-17","Brentford","Liverpool","Brentford","Jaidon Anthony",5.99],
  ["2026-10-17","Brentford","Liverpool","Brentford","Igor Thiago",6.78],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Alisson",6.41],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Ronald Araújo",6.16],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Virgil van Dijk",7.48],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Jeremy Jacquet",8.01],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Milos Kerkez",6.74],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Alexis Mac Allister",7.21],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Dominik Szoboszlai",6.5],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Victor Munoz",7.87],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Florian Wirtz",7.34],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Bradley Barcola",7.27],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Alexander Isak",7.31],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Joe Gomez",6.47],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Jeremie Frimpong",6.17],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Lewis Koumas",6.13],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Treymaurice Nyoni",6.55],
  ["2026-10-17","Brentford","Liverpool","Liverpool","Rio Ngumoha",6.84],
  // 2026-08-22  Arsenal – Coventry City
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Ben White",7.8],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Bukayo Saka",7.8],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Christos Tzolis",7.4],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Cristhian Mosquera",7.1],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","David Raya",6.8],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Declan Rice",6.8],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Eberechi Eze",6.1],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Gabriel Magalhães",6.7],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Kai Havertz",8],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Martin Ødegaard",8.2],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Martín Zubimendi",6.2],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Mikel Merino",6.4],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Myles Lewis-Skelly",7.1],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Noni Madueke",6.6],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Piero Hincapié",6],
  ["2026-08-21","Arsenal","Coventry City","Arsenal","Riccardo Calafiori",7.4],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Aurele Amenda",6.2],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Bobby Thomas",6.8],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Brandon Thomas-Asante",6.3],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Caleb Yirenkyi",5.6],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Carl Rushworth",6.2],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Ellis Simms",6.2],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Frank Onyeka",6],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Gustavo Hamer",6.1],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Jack Rudoni",6.3],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Jay Dasilva",5.8],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Loum Tchaouna",6.1],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Matt Grimes",6.1],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Milan van Ewijk",5.1],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Taiwo Awoniyi",6],
  ["2026-08-21","Arsenal","Coventry City","Coventry City","Victor Torp",6.4],
  // 2026-08-22  Brentford – Tottenham Hotspur
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Aaron Hickey",6],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Callum Wilson",6.2],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Caoimhin Kelleher",7.5],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Dango Ouattara",6.9],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Igor Thiago",6.8],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Jaidon Anthony",6.7],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Keane Lewis-Potter",8.1],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Kevin Schade",8],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Kristoffer Ajer",7.9],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Mamadou Sangare",8],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Mathias Jensen",7.4],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Michael Kayode",8],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Mikkel Damsgaard",6.4],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Nathan Collins",6.8],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Vitaly Janelt",8.8],
  ["2026-08-22","Brentford","Tottenham Hotspur","Brentford","Yehor Yarmoliuk",6.4],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","Andy Robertson",7.2],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","Antonin Kinsky",7],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","Archie Gray",6],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","Conor Gallagher",5.8],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","Destiny Udogie",6],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","Dominic Solanke",6],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","James Maddison",6.1],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","Jan Paul van Hecke",6.3],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","Lucas Bergvall",4.8],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","Marcos Senesi",7],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","Mateus Fernandes",6.5],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","Mathys Tel",6.7],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","Richarlison",5.8],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","Rodrigo Bentancur",5.9],
  ["2026-08-22","Brentford","Tottenham Hotspur","Tottenham Hotspur","Sandro Tonali",5.9],
  // 2026-08-22  Everton – Crystal Palace
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Adam Wharton",6.4],
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Anan Khalaili",7.1],
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Chadi Riad",6.3],
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Chris Richards",7.1],
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Daichi Kamada",6.8],
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Dean Henderson",6.4],
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Dwight McNeil",5.9],
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Eddie Nketiah",6.4],
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Evann Guessand",6.1],
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Jaydee Canvot",6.2],
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Jean-Philippe Mateta",6.1],
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Jørgen Strand Larsen",6.1],
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Takehiro Tomiyasu",6.2],
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Tyrick Mitchell",6.2],
  ["2026-08-22","Everton","Crystal Palace","Crystal Palace","Yéremy Pino",6.1],
  ["2026-08-22","Everton","Crystal Palace","Everton","Brennan Johnson",6.1],
  ["2026-08-22","Everton","Crystal Palace","Everton","Carlos Alcaraz",6.3],
  ["2026-08-22","Everton","Crystal Palace","Everton","Harrison Armstrong",7.3],
  ["2026-08-22","Everton","Crystal Palace","Everton","Hayden Hackney",6.9],
  ["2026-08-22","Everton","Crystal Palace","Everton","James Garner",6.2],
  ["2026-08-22","Everton","Crystal Palace","Everton","James Tarkowski",7.1],
  ["2026-08-22","Everton","Crystal Palace","Everton","Jarrad Branthwaite",7.4],
  ["2026-08-22","Everton","Crystal Palace","Everton","Jordan Pickford",7.4],
  ["2026-08-22","Everton","Crystal Palace","Everton","Kiernan Dewsbury-Hall",8],
  ["2026-08-22","Everton","Crystal Palace","Everton","Merlin Rohl",7],
  ["2026-08-22","Everton","Crystal Palace","Everton","Thierno Barry",7.4],
  ["2026-08-22","Everton","Crystal Palace","Everton","Tyrique George",7.1],
  ["2026-08-22","Everton","Crystal Palace","Everton","Vitaliy Mykolenko",6.9],
  // 2026-08-22  Hull City – Manchester United
  ["2026-08-22","Hull City","Manchester United","Hull City","Cody Drameh",6.4],
  ["2026-08-22","Hull City","Manchester United","Hull City","Elliot Stroud",6.9],
  ["2026-08-22","Hull City","Manchester United","Hull City","John Egan",7.7],
  ["2026-08-22","Hull City","Manchester United","Hull City","Konstantinos Tzolakis",8.2],
  ["2026-08-22","Hull City","Manchester United","Hull City","Lewie Coyle",6.8],
  ["2026-08-22","Hull City","Manchester United","Hull City","Liam Millar",6.1],
  ["2026-08-22","Hull City","Manchester United","Hull City","Lucas Herrington",6.6],
  ["2026-08-22","Hull City","Manchester United","Hull City","Matt Crooks",7.1],
  ["2026-08-22","Hull City","Manchester United","Hull City","Matt Targett",6.1],
  ["2026-08-22","Hull City","Manchester United","Hull City","Mohamed Belloumi",6.9],
  ["2026-08-22","Hull City","Manchester United","Hull City","Nobel Mendy",8.1],
  ["2026-08-22","Hull City","Manchester United","Hull City","Oli McBurnie",7.2],
  ["2026-08-22","Hull City","Manchester United","Hull City","Paddy McNair",6.1],
  ["2026-08-22","Hull City","Manchester United","Hull City","Regan Slater",7.2],
  ["2026-08-22","Hull City","Manchester United","Hull City","Ryan Giles",7.2],
  ["2026-08-22","Hull City","Manchester United","Hull City","Semi Ajayi",8.2],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Andrey Santos",6.3],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Ayden Heaven",5.9],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Benjamin Šeško",6],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Bruno Fernandes",6.6],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Bryan Mbeumo",6.2],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Diogo Dalot",6.4],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Harry Maguire",7.1],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Kobbie Mainoo",6.1],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Luke Shaw",6.7],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Marcus Rashford",6.5],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Matheus Cunha",6.3],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Noussair Mazraoui",6.4],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Patrick Dorgu",5.5],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Senne Lammens",6.2],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Shea Lacey",6],
  ["2026-08-22","Hull City","Manchester United","Manchester United","Youri Tielemans",5.8],
  // 2026-08-22  Ipswich Town – Sunderland
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Abdoul Ouattara",6.3],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Abdul Fatawu",7.2],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Chuba Akpom",6.3],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Daizen Maeda",6.4],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Dara O'Shea",7.9],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Emersonn",7.9],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Issa Diop",6.2],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Jack Clarke",7.2],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Jacob Greaves",6.8],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Julio Enciso",7.5],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Kasey McAteer",6.2],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Kjell Scherpen",6.5],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Leif Davis",6.7],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Marcelino Núñez",7.3],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Saša Lukić",6.8],
  ["2026-08-22","Ipswich Town","Sunderland","Ipswich Town","Sindre Walle Egeli",6.1],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Brian Brobbey",6],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Chemsdine Talbi",5.8],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Chris Rigg",5.9],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Daniel Ballard",6.3],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Enzo Le Fée",6.2],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Granit Xhaka",7],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Habib Diarra",5.9],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Luke O'Nien",5.4],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Nilson Angulo",7],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Noah Sadiki",6.9],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Omar Alderete",5.2],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Reinildo Mandava",7],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Robin Roefs",6.3],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Thomas Meunier",6.8],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Trai Hume",7],
  ["2026-08-22","Ipswich Town","Sunderland","Sunderland","Wilson Isidor",5.8],
  // 2026-08-22  Nottingham Forest – Leeds United
  ["2026-08-22","Nottingham Forest","Leeds United","Leeds United","Anton Stach",8.3],
  ["2026-08-22","Nottingham Forest","Leeds United","Leeds United","Brenden Aaronson",6.8],
  ["2026-08-22","Nottingham Forest","Leeds United","Leeds United","Dominic Calvert-Lewin",6.1],
  ["2026-08-22","Nottingham Forest","Leeds United","Leeds United","Ethan Ampadu",7.2],
  ["2026-08-22","Nottingham Forest","Leeds United","Leeds United","Harry Wilson",6.6],
  ["2026-08-22","Nottingham Forest","Leeds United","Leeds United","Jaka Bijol",8.1],
  ["2026-08-22","Nottingham Forest","Leeds United","Leeds United","James Justin",7.7],
  ["2026-08-22","Nottingham Forest","Leeds United","Leeds United","James Trafford",7.1],
  ["2026-08-22","Nottingham Forest","Leeds United","Leeds United","Jayden Bogle",6.7],
  ["2026-08-22","Nottingham Forest","Leeds United","Leeds United","Joe Rodon",7.5],
  ["2026-08-22","Nottingham Forest","Leeds United","Leeds United","Noah Okafor",6.9],
  ["2026-08-22","Nottingham Forest","Leeds United","Leeds United","Sean Longstaff",6.1],
  ["2026-08-22","Nottingham Forest","Leeds United","Leeds United","Tarik Muharemović",7.1],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","Arnaud Kalimuendo",6],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","Chris Wood",6],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","Dan Ndoye",6.2],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","Ibrahim Sangaré",6.6],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","Igor Jesus",7],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","Jair Cunha",6.2],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","James McAtee",6.8],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","Luca Netz",5.9],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","Matz Sels",6.3],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","Morgan Gibbs-White",6.3],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","Murillo",7.1],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","Neco Williams",6.6],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","Nikola Milenković",6.8],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","Ola Aina",7.1],
  ["2026-08-22","Nottingham Forest","Leeds United","Nottingham Forest","Xaver Schlager",5.9],
  // 2026-08-23  Brighton – Aston Villa
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","Alejandro Garnacho",6],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","Alysson",6.2],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","Boubacar Kamara",5.9],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","Emiliano Buendía",6.3],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","George Hemmings",6.2],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","Ian Maatsen",6],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","John McGinn",6],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","João Gomes",4.2],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","Lamare Bogarde",6.1],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","Marco Bizot",6],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","Matteo Ruggeri",6.2],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","Matty Cash",5.9],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","Pau Torres",4.4],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","Ross Barkley",6.2],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","Tyrone Mings",6.1],
  ["2026-08-23","Brighton","Aston Villa","Aston Villa","Victor Lindelöf",4.8],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Bart Verbruggen",6.7],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Charalampos Kostoulas",6.1],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Costinha",6.8],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Diego Gómez",8],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Georginio Rutter",7.7],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Ibrahim Osman",6.2],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Jack Hinshelwood",8.9],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Lewis Dunk",7.2],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Luka Vuskovic",7.2],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Malick Yalcouyé",6.1],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Mats Wieffer",7.9],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Maxime De Cuyper",8.5],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Olivier Boscagli",7.4],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Pascal Groß",7.4],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Yasin Ayari",6.3],
  ["2026-08-23","Brighton","Aston Villa","Brighton","Zadok Yohanna",6.1],
  // 2026-08-23  Manchester City – Bournemouth
  ["2026-08-23","Manchester City","Bournemouth","Bournemouth","Adam Smith",6.2],
  ["2026-08-23","Manchester City","Bournemouth","Bournemouth","Adrien Truffert",6.8],
  ["2026-08-23","Manchester City","Bournemouth","Bournemouth","Alex Scott",6.4],
  ["2026-08-23","Manchester City","Bournemouth","Bournemouth","António Silva",6.4],
  ["2026-08-23","Manchester City","Bournemouth","Bournemouth","Ben Gannon Doak",5.9],
  ["2026-08-23","Manchester City","Bournemouth","Bournemouth","Daniel Jebbison",6],
  ["2026-08-23","Manchester City","Bournemouth","Bournemouth","Evanilson",7.1],
  ["2026-08-23","Manchester City","Bournemouth","Bournemouth","James Hill",6.2],
  ["2026-08-23","Manchester City","Bournemouth","Bournemouth","Justin Kluivert",7.1],
  ["2026-08-23","Manchester City","Bournemouth","Bournemouth","Lewis Cook",6.6],
  ["2026-08-23","Manchester City","Bournemouth","Bournemouth","Marcus Tavernier",7.2],
  ["2026-08-23","Manchester City","Bournemouth","Bournemouth","Rayan",6.4],
  ["2026-08-23","Manchester City","Bournemouth","Bournemouth","Tyler Adams",6.1],
  ["2026-08-23","Manchester City","Bournemouth","Bournemouth","Đorđe Petrović",7.1],
  ["2026-08-23","Manchester City","Bournemouth","Manchester City","Abdukodir Khusanov",6.7],
  ["2026-08-23","Manchester City","Bournemouth","Manchester City","Antoine Semenyo",6.7],
  ["2026-08-23","Manchester City","Bournemouth","Manchester City","Elliot Anderson",6.4],
  ["2026-08-23","Manchester City","Bournemouth","Manchester City","Erling Haaland",6.7],
  ["2026-08-23","Manchester City","Bournemouth","Manchester City","Gianluigi Donnarumma",7.3],
  ["2026-08-23","Manchester City","Bournemouth","Manchester City","Joško Gvardiol",7.5],
  ["2026-08-23","Manchester City","Bournemouth","Manchester City","Marc Guéhi",8],
  ["2026-08-23","Manchester City","Bournemouth","Manchester City","Mateo Kovačić",6.3],
  ["2026-08-23","Manchester City","Bournemouth","Manchester City","Matheus Nunes",6.3],
  ["2026-08-23","Manchester City","Bournemouth","Manchester City","Nico O'Reilly",6.4],
  ["2026-08-23","Manchester City","Bournemouth","Manchester City","Phil Foden",6.8],
  ["2026-08-23","Manchester City","Bournemouth","Manchester City","Rayan Cherki",7.6],
  ["2026-08-23","Manchester City","Bournemouth","Manchester City","Rico Lewis",6],
  ["2026-08-23","Manchester City","Bournemouth","Manchester City","Rúben Dias",6.8],
  // 2026-08-29  Bournemouth – Everton
  ["2026-08-29","Bournemouth","Everton","Bournemouth","Adam Smith",6.4],
  ["2026-08-29","Bournemouth","Everton","Bournemouth","Adrien Truffert",7.4],
  ["2026-08-29","Bournemouth","Everton","Bournemouth","Alex Scott",8.2],
  ["2026-08-29","Bournemouth","Everton","Bournemouth","Alvaro Rodriguez",6],
  ["2026-08-29","Bournemouth","Everton","Bournemouth","António Silva",6.9],
  ["2026-08-29","Bournemouth","Everton","Bournemouth","David Brooks",5.9],
  ["2026-08-29","Bournemouth","Everton","Bournemouth","Evanilson",7.1],
  ["2026-08-29","Bournemouth","Everton","Bournemouth","James Hill",7.2],
  ["2026-08-29","Bournemouth","Everton","Bournemouth","Justin Kluivert",6.8],
  ["2026-08-29","Bournemouth","Everton","Bournemouth","Lewis Cook",6.7],
  ["2026-08-29","Bournemouth","Everton","Bournemouth","Marcus Tavernier",7],
  ["2026-08-29","Bournemouth","Everton","Bournemouth","Rayan",6.2],
  ["2026-08-29","Bournemouth","Everton","Bournemouth","Ryan Christie",6.1],
  ["2026-08-29","Bournemouth","Everton","Bournemouth","Tyler Adams",5.9],
  ["2026-08-29","Bournemouth","Everton","Bournemouth","Đorđe Petrović",6.9],
  ["2026-08-29","Bournemouth","Everton","Everton","Brennan Johnson",6.1],
  ["2026-08-29","Bournemouth","Everton","Everton","Carlos Alcaraz",6],
  ["2026-08-29","Bournemouth","Everton","Everton","Harrison Armstrong",6.5],
  ["2026-08-29","Bournemouth","Everton","Everton","Hayden Hackney",6.2],
  ["2026-08-29","Bournemouth","Everton","Everton","James Garner",6],
  ["2026-08-29","Bournemouth","Everton","Everton","James Tarkowski",8.2],
  ["2026-08-29","Bournemouth","Everton","Everton","Jarrad Branthwaite",6.8],
  ["2026-08-29","Bournemouth","Everton","Everton","Jordan Pickford",7.2],
  ["2026-08-29","Bournemouth","Everton","Everton","Kiernan Dewsbury-Hall",7.2],
  ["2026-08-29","Bournemouth","Everton","Everton","Merlin Rohl",6.2],
  ["2026-08-29","Bournemouth","Everton","Everton","Thierno Barry",6.4],
  ["2026-08-29","Bournemouth","Everton","Everton","Tyrique George",6.4],
  ["2026-08-29","Bournemouth","Everton","Everton","Vitaliy Mykolenko",7],
  // 2026-08-29  Coventry City – Hull City
  ["2026-08-29","Coventry City","Hull City","Coventry City","Aurele Amenda",6.5],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Bobby Thomas",7],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Brandon Thomas-Asante",6],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Caleb Yirenkyi",6.8],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Carl Rushworth",6.3],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Ephron Mason-Clark",6.2],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Ethan Pinnock",6.2],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Gustavo Hamer",5.8],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Jack Rudoni",6.3],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Jay Dasilva",6.9],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Loum Tchaouna",6.5],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Matt Grimes",6.1],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Milan van Ewijk",6.4],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Taiwo Awoniyi",6.4],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Tatsuhiro Sakamoto",6.2],
  ["2026-08-29","Coventry City","Hull City","Coventry City","Victor Torp",5.8],
  ["2026-08-29","Coventry City","Hull City","Hull City","Cody Drameh",6.4],
  ["2026-08-29","Coventry City","Hull City","Hull City","Elliot Stroud",6],
  ["2026-08-29","Coventry City","Hull City","Hull City","Hidemasa Morita",6.7],
  ["2026-08-29","Coventry City","Hull City","Hull City","John Egan",7.6],
  ["2026-08-29","Coventry City","Hull City","Hull City","Konstantinos Tzolakis",7.6],
  ["2026-08-29","Coventry City","Hull City","Hull City","Lewie Coyle",6.6],
  ["2026-08-29","Coventry City","Hull City","Hull City","Liam Millar",7],
  ["2026-08-29","Coventry City","Hull City","Hull City","Lucas Gourna-Douath",6.6],
  ["2026-08-29","Coventry City","Hull City","Hull City","Lucas Herrington",6.2],
  ["2026-08-29","Coventry City","Hull City","Hull City","Mohamed Belloumi",7.3],
  ["2026-08-29","Coventry City","Hull City","Hull City","Mohamed-Ali Cho",6],
  ["2026-08-29","Coventry City","Hull City","Hull City","Nobel Mendy",7],
  ["2026-08-29","Coventry City","Hull City","Hull City","Oli McBurnie",6.5],
  ["2026-08-29","Coventry City","Hull City","Hull City","Regan Slater",6.5],
  ["2026-08-29","Coventry City","Hull City","Hull City","Ryan Giles",6.5],
  ["2026-08-29","Coventry City","Hull City","Hull City","Semi Ajayi",7.1],
  // 2026-08-29  Crystal Palace – Manchester City
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Adam Wharton",6.6],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Anan Khalaili",7.6],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Axel Disasi",6.2],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Chris Richards",6.1],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Daichi Kamada",6.7],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Dean Henderson",6.3],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Dwight McNeil",5.9],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Eddie Nketiah",6.1],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Evann Guessand",5.9],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Jaydee Canvot",5.9],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Jørgen Strand Larsen",6.5],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Takehiro Tomiyasu",6.1],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Tyrick Mitchell",6.2],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Yéremy Pino",6.9],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Zavier Gozo",5.9],
  ["2026-08-28","Crystal Palace","Manchester City","Crystal Palace","Óscar Mingueza",6],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Abdukodir Khusanov",7.3],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Antoine Semenyo",7.6],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Ayyoub Bouaddi",6.4],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Elliot Anderson",7.8],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Erling Haaland",8.6],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Gianluigi Donnarumma",5.9],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Joško Gvardiol",7.1],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Kaden Braithwaite",6],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Marc Guéhi",7.2],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Mateo Kovačić",6.2],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Nico O'Reilly",6.9],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Phil Foden",8.2],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Rayan Cherki",9],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Ryan McAidoo",6.2],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Rúben Dias",7.4],
  ["2026-08-28","Crystal Palace","Manchester City","Manchester City","Vitor Reis",6],
  // 2026-08-29  Liverpool – Nottingham Forest
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Alexander Isak",7.1],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Alexis Mac Allister",6.4],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Alisson",5.6],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Cody Gakpo",6.8],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Dominik Szoboszlai",7.1],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Florian Wirtz",7.1],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Jeremie Frimpong",6.2],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Jeremy Jacquet",7.3],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Kostas Tsimikas",6.2],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Milos Kerkez",6.5],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Rio Ngumoha",6.3],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Ronald Araújo",6.1],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Ryan Gravenberch",6.2],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Treymaurice Nyoni",6.4],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Victor Munoz",7.6],
  ["2026-08-29","Liverpool","Nottingham Forest","Liverpool","Virgil van Dijk",6.8],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","Callum Hudson-Odoi",5.9],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","Dan Ndoye",7.3],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","Igor Jesus",7.1],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","Jair Cunha",6.4],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","James McAtee",6.6],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","Liam Delap",6.4],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","Luca Netz",6.1],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","Matz Sels",6.3],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","Morgan Gibbs-White",7.5],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","Murillo",6.5],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","Neco Williams",7.8],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","Nicolás Domínguez",6],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","Nikola Milenković",6.8],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","Ola Aina",6.6],
  ["2026-08-29","Liverpool","Nottingham Forest","Nottingham Forest","Xaver Schlager",6.9],
  // 2026-08-29  Tottenham Hotspur – Newcastle United
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Amar Dedić",8.1],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Anthony Elanga",7.7],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Bazoumana Toure",6],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Harvey Barnes",6.8],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Jacob Murphy",6.2],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Jacob Ramsey",6.2],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Joe Willock",6.1],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Lewis Hall",9.2],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Lewis Miley",7.1],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Lukas Hornicek",8],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Malick Thiaw",6.9],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Nick Woltemade",7],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Nico González",6.5],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Sean Steur",6.3],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Sven Botman",6.5],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Newcastle United","Yoane Wissa",7.5],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Tottenham Hotspur","Andy Robertson",6.4],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Tottenham Hotspur","Antonin Kinsky",5.5],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Tottenham Hotspur","Archie Gray",6],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Tottenham Hotspur","Destiny Udogie",6.1],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Tottenham Hotspur","Dominic Solanke",6.2],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Tottenham Hotspur","Jan Paul van Hecke",7],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Tottenham Hotspur","Mateus Fernandes",6.8],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Tottenham Hotspur","Mathys Tel",6.1],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Tottenham Hotspur","Micky van de Ven",6.4],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Tottenham Hotspur","Mohammed Kudus",5.9],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Tottenham Hotspur","Omar Marmoush",7.1],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Tottenham Hotspur","Pedro Porro",6.3],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Tottenham Hotspur","Rodrigo Bentancur",6.3],
  ["2026-08-29","Tottenham Hotspur","Newcastle United","Tottenham Hotspur","Sandro Tonali",6],
  // 2026-08-30  Chelsea – Brighton
  ["2026-08-30","Chelsea","Brighton","Brighton","Bart Verbruggen",4.4],
  ["2026-08-30","Chelsea","Brighton","Brighton","Charalampos Kostoulas",6.6],
  ["2026-08-30","Chelsea","Brighton","Brighton","Costinha",6],
  ["2026-08-30","Chelsea","Brighton","Brighton","Diego Gómez",6.7],
  ["2026-08-30","Chelsea","Brighton","Brighton","Ferdi Kadıoğlu",5.5],
  ["2026-08-30","Chelsea","Brighton","Brighton","Ibrahim Osman",6.2],
  ["2026-08-30","Chelsea","Brighton","Brighton","Lewis Dunk",5.3],
  ["2026-08-30","Chelsea","Brighton","Brighton","Luka Vuskovic",6.3],
  ["2026-08-30","Chelsea","Brighton","Brighton","Malick Yalcouyé",8],
  ["2026-08-30","Chelsea","Brighton","Brighton","Mats Wieffer",6.5],
  ["2026-08-30","Chelsea","Brighton","Brighton","Maxime De Cuyper",6.4],
  ["2026-08-30","Chelsea","Brighton","Brighton","Olivier Boscagli",6.5],
  ["2026-08-30","Chelsea","Brighton","Brighton","Pascal Groß",7.3],
  ["2026-08-30","Chelsea","Brighton","Brighton","Promise David",6.1],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Cole Palmer",7.5],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Emiliano Martínez",7.4],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Jorrel Hato",7.2],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Joshua Acheampong",6.2],
  ["2026-08-30","Chelsea","Brighton","Chelsea","João Pedro",8.4],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Levi Colwill",6.7],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Malo Gusto",6.5],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Maxence Lacroix",6.4],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Moisés Caicedo",6.1],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Morgan Rogers",7.6],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Pedro Neto",7.8],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Pep Chavarría",6.3],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Reece James",6],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Roméo Lavia",7.3],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Valentín Barco",5.9],
  ["2026-08-30","Chelsea","Brighton","Chelsea","Wesley Fofana",6.3],
  // 2026-08-30  Leeds United – Brentford
  ["2026-08-30","Leeds United","Brentford","Brentford","Aaron Hickey",6.2],
  ["2026-08-30","Leeds United","Brentford","Brentford","Callum Wilson",6],
  ["2026-08-30","Leeds United","Brentford","Brentford","Caoimhin Kelleher",6.3],
  ["2026-08-30","Leeds United","Brentford","Brentford","Dango Ouattara",7.2],
  ["2026-08-30","Leeds United","Brentford","Brentford","Igor Thiago",6.4],
  ["2026-08-30","Leeds United","Brentford","Brentford","Jaidon Anthony",6.4],
  ["2026-08-30","Leeds United","Brentford","Brentford","Keane Lewis-Potter",7.1],
  ["2026-08-30","Leeds United","Brentford","Brentford","Kevin Schade",7.4],
  ["2026-08-30","Leeds United","Brentford","Brentford","Kristoffer Ajer",7.1],
  ["2026-08-30","Leeds United","Brentford","Brentford","Mamadou Sangare",7.2],
  ["2026-08-30","Leeds United","Brentford","Brentford","Michael Kayode",6.7],
  ["2026-08-30","Leeds United","Brentford","Brentford","Mikkel Damsgaard",6.9],
  ["2026-08-30","Leeds United","Brentford","Brentford","Nathan Collins",7.6],
  ["2026-08-30","Leeds United","Brentford","Brentford","Rico Henry",6],
  ["2026-08-30","Leeds United","Brentford","Brentford","Vitaly Janelt",7.2],
  ["2026-08-30","Leeds United","Brentford","Brentford","Yehor Yarmoliuk",5.9],
  ["2026-08-30","Leeds United","Brentford","Leeds United","Anton Stach",7],
  ["2026-08-30","Leeds United","Brentford","Leeds United","Ao Tanaka",6.9],
  ["2026-08-30","Leeds United","Brentford","Leeds United","Brenden Aaronson",6],
  ["2026-08-30","Leeds United","Brentford","Leeds United","Daniel James",6.2],
  ["2026-08-30","Leeds United","Brentford","Leeds United","Dominic Calvert-Lewin",7.5],
  ["2026-08-30","Leeds United","Brentford","Leeds United","Ethan Ampadu",6.8],
  ["2026-08-30","Leeds United","Brentford","Leeds United","Harry Wilson",6.6],
  ["2026-08-30","Leeds United","Brentford","Leeds United","Jaka Bijol",6.2],
  ["2026-08-30","Leeds United","Brentford","Leeds United","James Justin",6.9],
  ["2026-08-30","Leeds United","Brentford","Leeds United","James Trafford",7.2],
  ["2026-08-30","Leeds United","Brentford","Leeds United","Jayden Bogle",6.9],
  ["2026-08-30","Leeds United","Brentford","Leeds United","Joe Rodon",6.5],
  ["2026-08-30","Leeds United","Brentford","Leeds United","Lukas Nmecha",6.6],
  ["2026-08-30","Leeds United","Brentford","Leeds United","Nico Elvedi",6.5],
  ["2026-08-30","Leeds United","Brentford","Leeds United","Noah Okafor",6.4],
  ["2026-08-30","Leeds United","Brentford","Leeds United","Tarik Muharemović",7.9],
  // 2026-08-30  Manchester United – Ipswich Town
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Abdoul Ouattara",6],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Abdul Fatawu",6.9],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Chuba Akpom",6.4],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Daizen Maeda",6.2],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Dara O'Shea",5.4],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Darnell Furlong",6.4],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Emersonn",6.2],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Exequiel Palacios",6.6],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Issa Diop",7.1],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Jacob Greaves",5],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Julio Enciso",6.9],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Kasey McAteer",6.1],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Kjell Scherpen",6.9],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Leif Davis",6.6],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Marcelino Núñez",5.1],
  ["2026-08-30","Manchester United","Ipswich Town","Ipswich Town","Saša Lukić",6.3],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Andrey Santos",6.2],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Benjamin Šeško",6.1],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Bruno Fernandes",10],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Bryan Mbeumo",8.3],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Diogo Dalot",7.2],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Harry Maguire",6.7],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Kobbie Mainoo",7.6],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Leny Yoro",6.2],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Lisandro Martínez",5.5],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Luke Shaw",7.2],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Marcus Rashford",7.4],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Matheus Cunha",7.9],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Noussair Mazraoui",5.9],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Patrick Dorgu",6.4],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Senne Lammens",6.7],
  ["2026-08-30","Manchester United","Ipswich Town","Manchester United","Youri Tielemans",7.8],
  // 2026-08-30  Sunderland – Fulham
  ["2026-08-30","Sunderland","Fulham","Fulham","Alex Iwobi",6.7],
  ["2026-08-30","Sunderland","Fulham","Fulham","Antonee Robinson",6.2],
  ["2026-08-30","Sunderland","Fulham","Fulham","Bernd Leno",5.6],
  ["2026-08-30","Sunderland","Fulham","Fulham","Calvin Bassey",6.7],
  ["2026-08-30","Sunderland","Fulham","Fulham","Cesar Palacios",6.5],
  ["2026-08-30","Sunderland","Fulham","Fulham","Emile Smith Rowe",6.2],
  ["2026-08-30","Sunderland","Fulham","Fulham","Gonzalo García",6.3],
  ["2026-08-30","Sunderland","Fulham","Fulham","Joachim Andersen",6.7],
  ["2026-08-30","Sunderland","Fulham","Fulham","Joshua King",6.3],
  ["2026-08-30","Sunderland","Fulham","Fulham","Kevin",6],
  ["2026-08-30","Sunderland","Fulham","Fulham","Oscar Bobb",6.5],
  ["2026-08-30","Sunderland","Fulham","Fulham","Ryan Sessegnon",6.5],
  ["2026-08-30","Sunderland","Fulham","Fulham","Sander Berge",6.1],
  ["2026-08-30","Sunderland","Fulham","Fulham","Shea Charles",6.1],
  ["2026-08-30","Sunderland","Fulham","Fulham","Timothy Castagne",6.4],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Brian Brobbey",6.4],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Chris Rigg",6],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Daniel Ballard",7.3],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Enzo Le Fée",6.9],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Granit Xhaka",7.7],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Habib Diarra",6.8],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Nilson Angulo",6.7],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Noah Sadiki",7],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Nordi Mukiele",7.9],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Reinildo Mandava",7.3],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Robin Roefs",6.8],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Romaine Mundle",6.1],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Thomas Meunier",7.1],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Trai Hume",7.1],
  ["2026-08-30","Sunderland","Fulham","Sunderland","Wilson Isidor",7.1],
  // 2026-09-01  Aston Villa – Arsenal
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Ben White",7.2],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Bruno Guimarães",6],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Bukayo Saka",8.1],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Christos Tzolis",6],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Cristhian Mosquera",6.6],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","David Raya",6.6],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Declan Rice",7.2],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Eberechi Eze",6.3],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Ezri Konsa",6.2],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Gabriel Magalhães",7.2],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Kai Havertz",6.3],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Martin Ødegaard",6.6],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Martín Zubimendi",6.3],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Mikel Merino",6.7],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Myles Lewis-Skelly",6.7],
  ["2026-08-31","Aston Villa","Arsenal","Arsenal","Riccardo Calafiori",7.4],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","Aaron Wan-Bissaka",6.2],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","Alejandro Garnacho",6],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","Alysson",6],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","Boubacar Kamara",6.5],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","Emiliano Buendía",6.4],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","George Hemmings",6],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","Ian Maatsen",6.1],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","John McGinn",5.4],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","Matty Cash",6.6],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","Nicolas Jackson",6.5],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","Pau Torres",6.1],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","Ross Barkley",6.7],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","Tammy Abraham",6.1],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","Victor Lindelöf",6.3],
  ["2026-08-31","Aston Villa","Arsenal","Aston Villa","Zion Suzuki",6.1],
  // 2026-09-05  Brentford – Sunderland
  ["2026-09-05","Brentford","Sunderland","Brentford","Aaron Hickey",6.4],
  ["2026-09-05","Brentford","Sunderland","Brentford","Callum Wilson",6.1],
  ["2026-09-05","Brentford","Sunderland","Brentford","Caoimhin Kelleher",6.9],
  ["2026-09-05","Brentford","Sunderland","Brentford","Dango Ouattara",6.4],
  ["2026-09-05","Brentford","Sunderland","Brentford","Igor Thiago",7.1],
  ["2026-09-05","Brentford","Sunderland","Brentford","Jaidon Anthony",5.9],
  ["2026-09-05","Brentford","Sunderland","Brentford","Jannik Schuster",6.9],
  ["2026-09-05","Brentford","Sunderland","Brentford","Keane Lewis-Potter",6.1],
  ["2026-09-05","Brentford","Sunderland","Brentford","Kevin Schade",6.4],
  ["2026-09-05","Brentford","Sunderland","Brentford","Kristoffer Ajer",6.6],
  ["2026-09-05","Brentford","Sunderland","Brentford","Mamadou Sangare",6.4],
  ["2026-09-05","Brentford","Sunderland","Brentford","Michael Kayode",6.6],
  ["2026-09-05","Brentford","Sunderland","Brentford","Mikkel Damsgaard",6.6],
  ["2026-09-05","Brentford","Sunderland","Brentford","Nathan Collins",6.4],
  ["2026-09-05","Brentford","Sunderland","Brentford","Vitaly Janelt",7.4],
  ["2026-09-05","Brentford","Sunderland","Brentford","Yehor Yarmoliuk",6.1],
  ["2026-09-05","Brentford","Sunderland","Sunderland","Brian Brobbey",7],
  ["2026-09-05","Brentford","Sunderland","Sunderland","Daniel Ballard",7.3],
  ["2026-09-05","Brentford","Sunderland","Sunderland","Enzo Le Fée",7.6],
  ["2026-09-05","Brentford","Sunderland","Sunderland","Granit Xhaka",6.7],
  ["2026-09-05","Brentford","Sunderland","Sunderland","Kevin Danso",6.8],
  ["2026-09-05","Brentford","Sunderland","Sunderland","Malick Fofana",6.3],
  ["2026-09-05","Brentford","Sunderland","Sunderland","Nilson Angulo",6.3],
  ["2026-09-05","Brentford","Sunderland","Sunderland","Noah Sadiki",6.2],
  ["2026-09-05","Brentford","Sunderland","Sunderland","Nordi Mukiele",7.4],
  ["2026-09-05","Brentford","Sunderland","Sunderland","Reinildo Mandava",6.6],
  ["2026-09-05","Brentford","Sunderland","Sunderland","Robin Roefs",6.3],
  ["2026-09-05","Brentford","Sunderland","Sunderland","Thomas Meunier",6.2],
  ["2026-09-05","Brentford","Sunderland","Sunderland","Trai Hume",6.7],
  ["2026-09-05","Brentford","Sunderland","Sunderland","Wilson Isidor",6.8],
  // 2026-09-05  Brighton – Leeds United
  ["2026-09-05","Brighton","Leeds United","Brighton","Bart Verbruggen",7],
  ["2026-09-05","Brighton","Leeds United","Brighton","Charalampos Kostoulas",6.5],
  ["2026-09-05","Brighton","Leeds United","Brighton","Costinha",6.4],
  ["2026-09-05","Brighton","Leeds United","Brighton","Diego Gómez",7],
  ["2026-09-05","Brighton","Leeds United","Brighton","Ferdi Kadıoğlu",6.5],
  ["2026-09-05","Brighton","Leeds United","Brighton","Lewis Dunk",7.8],
  ["2026-09-05","Brighton","Leeds United","Brighton","Luka Vuskovic",7.7],
  ["2026-09-05","Brighton","Leeds United","Brighton","Malick Yalcouyé",6.6],
  ["2026-09-05","Brighton","Leeds United","Brighton","Maxime De Cuyper",6.7],
  ["2026-09-05","Brighton","Leeds United","Brighton","Olivier Boscagli",7.1],
  ["2026-09-05","Brighton","Leeds United","Brighton","Pascal Groß",5.9],
  ["2026-09-05","Brighton","Leeds United","Brighton","Pascal Struijk",6],
  ["2026-09-05","Brighton","Leeds United","Brighton","Promise David",5.6],
  ["2026-09-05","Brighton","Leeds United","Brighton","Yasin Ayari",6.8],
  ["2026-09-05","Brighton","Leeds United","Leeds United","Anton Stach",6.7],
  ["2026-09-05","Brighton","Leeds United","Leeds United","Ao Tanaka",7],
  ["2026-09-05","Brighton","Leeds United","Leeds United","Brenden Aaronson",5.9],
  ["2026-09-05","Brighton","Leeds United","Leeds United","Dominic Calvert-Lewin",6.5],
  ["2026-09-05","Brighton","Leeds United","Leeds United","Ethan Ampadu",6.8],
  ["2026-09-05","Brighton","Leeds United","Leeds United","Gabriel Gudmundsson",6.7],
  ["2026-09-05","Brighton","Leeds United","Leeds United","Harry Wilson",6],
  ["2026-09-05","Brighton","Leeds United","Leeds United","Jaka Bijol",6.2],
  ["2026-09-05","Brighton","Leeds United","Leeds United","James Justin",7],
  ["2026-09-05","Brighton","Leeds United","Leeds United","James Trafford",7.3],
  ["2026-09-05","Brighton","Leeds United","Leeds United","Jayden Bogle",7.2],
  ["2026-09-05","Brighton","Leeds United","Leeds United","Lukas Nmecha",5.9],
  ["2026-09-05","Brighton","Leeds United","Leeds United","Nico Elvedi",7],
  ["2026-09-05","Brighton","Leeds United","Leeds United","Noah Okafor",6.5],
  ["2026-09-05","Brighton","Leeds United","Leeds United","Tarik Muharemović",7.2],
  // 2026-09-05  Fulham – Crystal Palace
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Adam Wharton",6.4],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Anan Khalaili",7.3],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Axel Disasi",7.3],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Ben Chilwell",6.9],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Chris Richards",6.7],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Daichi Kamada",6.5],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Darío Osorio",6.1],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Dean Henderson",7.2],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Eddie Nketiah",6.7],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Jaydee Canvot",5.8],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Jørgen Strand Larsen",6.7],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Quinten Timber",6.2],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Tyrick Mitchell",8.1],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Will Hughes",6.2],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Yéremy Pino",6.8],
  ["2026-09-05","Fulham","Crystal Palace","Crystal Palace","Óscar Mingueza",6.1],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Alex Iwobi",5.9],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Antonee Robinson",6.6],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Bernd Leno",6],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Calvin Bassey",6],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Cesar Palacios",7.3],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Emile Smith Rowe",6],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Gonzalo García",7.3],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Hugo Larsson",6.1],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Joachim Andersen",6.7],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Joshua King",7.7],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Oscar Bobb",7.1],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Rodrigo Muniz",6.3],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Ryan Sessegnon",6.3],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Sander Berge",6],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Shea Charles",6.2],
  ["2026-09-05","Fulham","Crystal Palace","Fulham","Timothy Castagne",6.6],
  // 2026-09-05  Hull City – Aston Villa
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","Aaron Wan-Bissaka",6.1],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","Alejandro Garnacho",6.2],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","Alysson",6],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","Boubacar Kamara",7],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","Emiliano Buendía",5.8],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","George Hemmings",6.9],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","Ian Maatsen",6.9],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","John McGinn",5.8],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","Matteo Ruggeri",6.2],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","Matty Cash",6.4],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","Nicolas Jackson",6.6],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","Ross Barkley",6.9],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","Tammy Abraham",6.1],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","Tyrone Mings",7.1],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","Victor Lindelöf",7],
  ["2026-09-05","Hull City","Aston Villa","Aston Villa","Zion Suzuki",7.5],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Brooke Norton-Cuffy",6.1],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Elliot Stroud",6.3],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Jens Hjerto-Dahl",6],
  ["2026-09-05","Hull City","Aston Villa","Hull City","John Egan",6.9],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Konstantinos Tzolakis",6.9],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Lewie Coyle",6.3],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Lucas Gourna-Douath",6.9],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Lucas Herrington",6.2],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Mohamed Belloumi",8],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Mohamed-Ali Cho",6.2],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Nobel Mendy",7.2],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Oli McBurnie",6.8],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Regan Slater",7.2],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Ryan Giles",7.2],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Semi Ajayi",6.6],
  ["2026-09-05","Hull City","Aston Villa","Hull City","Sorba Thomas",6.2],
  // 2026-09-05  Newcastle United – Bournemouth
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","Adam Smith",6.4],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","Adrien Truffert",6.4],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","Alex Scott",6.9],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","António Silva",7.1],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","Ben Gannon Doak",6.1],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","Daniel Jebbison",6],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","David Brooks",5.9],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","Evanilson",6.6],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","James Hill",6.4],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","Justin Kluivert",6.6],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","Lewis Cook",6],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","Marcus Tavernier",8],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","Rayan",6.7],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","Ryan Christie",6],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","Tyler Adams",6.6],
  ["2026-09-05","Newcastle United","Bournemouth","Bournemouth","Đorđe Petrović",6],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Amar Dedić",6.2],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Anthony Elanga",6.2],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Harvey Barnes",7.2],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Jacob Murphy",6.2],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Jacob Ramsey",7.1],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Joe Willock",6.1],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Lewis Hall",7],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Lewis Miley",5.9],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Lukas Hornicek",6.5],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Malick Thiaw",6.3],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Matias Fernandez-Pardo",6.2],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Nico González",6.2],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Sean Steur",6.1],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Sven Botman",6.1],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Tino Livramento",6],
  ["2026-09-05","Newcastle United","Bournemouth","Newcastle United","Yoane Wissa",6.4],
  // 2026-09-05  Nottingham Forest – Tottenham Hotspur
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","Chris Wood",6.1],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","Dan Ndoye",6.2],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","Daniel Muñoz",6.2],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","Igor Jesus",6.1],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","Jair Cunha",7.3],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","James McAtee",7.5],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","Liam Delap",6.4],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","Matz Sels",6.4],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","Morgan Gibbs-White",6.1],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","Murillo",7.2],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","Neco Williams",6.7],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","Nikola Milenković",7.2],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","Ola Aina",6.8],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","Ousmane Diomande",6],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Nottingham Forest","Xaver Schlager",6.7],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Andy Robertson",6.1],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Antonin Kinsky",6.8],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Conor Gallagher",6.8],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Destiny Udogie",6.6],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Dominic Solanke",5.9],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Jan Paul van Hecke",7],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Mateus Fernandes",5.9],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Mathys Tel",6.5],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Micky van de Ven",7.3],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Mohammed Kudus",6.6],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Mykhailo Mudryk",6],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Omar Marmoush",6.3],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Pedro Porro",6.9],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Rodrigo Bentancur",7.5],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Sandro Tonali",7.5],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur","Tottenham Hotspur","Sávio",6.9],
  // 2026-09-06  Arsenal – Chelsea
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Ben White",6.6],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Bukayo Saka",6.8],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Christos Tzolis",7.7],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","David Raya",7.4],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Declan Rice",7],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Ezri Konsa",7.3],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Gabriel Magalhães",6.8],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Kai Havertz",8.2],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Martin Ødegaard",7.8],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Martín Zubimendi",6.4],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Mikel Merino",5.9],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Myles Lewis-Skelly",5.8],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Noni Madueke",6.1],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Piero Hincapié",6.2],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Riccardo Calafiori",6],
  ["2026-09-06","Arsenal","Chelsea","Arsenal","Viktor Gyökeres",6],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","Cole Palmer",6.2],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","Danny Welbeck",6],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","Emiliano Martínez",7.4],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","Estêvão",6.2],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","Jorrel Hato",7],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","Joshua Acheampong",5.8],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","João Pedro",6.2],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","Malo Gusto",6.3],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","Maxence Lacroix",6.7],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","Morgan Rogers",7],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","Pedro Neto",6.7],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","Pep Chavarría",6.1],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","Reece James",6.5],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","Roméo Lavia",6.3],
  ["2026-09-06","Arsenal","Chelsea","Chelsea","Wesley Fofana",7.1],
  // 2026-09-06  Everton – Manchester United
  ["2026-09-06","Everton","Manchester United","Everton","Ainsley Maitland-Niles",7.1],
  ["2026-09-06","Everton","Manchester United","Everton","Brennan Johnson",6.2],
  ["2026-09-06","Everton","Manchester United","Everton","Harrison Armstrong",6.1],
  ["2026-09-06","Everton","Manchester United","Everton","Hayden Hackney",6.5],
  ["2026-09-06","Everton","Manchester United","Everton","Jack Grealish",6.5],
  ["2026-09-06","Everton","Manchester United","Everton","James Garner",6.5],
  ["2026-09-06","Everton","Manchester United","Everton","James Tarkowski",7.3],
  ["2026-09-06","Everton","Manchester United","Everton","Jarrad Branthwaite",7.4],
  ["2026-09-06","Everton","Manchester United","Everton","Jordan Pickford",5.6],
  ["2026-09-06","Everton","Manchester United","Everton","Kiernan Dewsbury-Hall",7.1],
  ["2026-09-06","Everton","Manchester United","Everton","Merlin Rohl",6.1],
  ["2026-09-06","Everton","Manchester United","Everton","Thierno Barry",6.7],
  ["2026-09-06","Everton","Manchester United","Everton","Tyrique George",8],
  ["2026-09-06","Everton","Manchester United","Everton","Vitaliy Mykolenko",6.7],
  ["2026-09-06","Everton","Manchester United","Manchester United","Andrey Santos",6.3],
  ["2026-09-06","Everton","Manchester United","Manchester United","Benjamin Šeško",6.7],
  ["2026-09-06","Everton","Manchester United","Manchester United","Bruno Fernandes",6.6],
  ["2026-09-06","Everton","Manchester United","Manchester United","Bryan Mbeumo",7.5],
  ["2026-09-06","Everton","Manchester United","Manchester United","Diogo Dalot",6.1],
  ["2026-09-06","Everton","Manchester United","Manchester United","Harry Maguire",6.7],
  ["2026-09-06","Everton","Manchester United","Manchester United","Kobbie Mainoo",7.2],
  ["2026-09-06","Everton","Manchester United","Manchester United","Leny Yoro",6.3],
  ["2026-09-06","Everton","Manchester United","Manchester United","Lisandro Martínez",6.7],
  ["2026-09-06","Everton","Manchester United","Manchester United","Luke Shaw",7.5],
  ["2026-09-06","Everton","Manchester United","Manchester United","Marcus Rashford",6.9],
  ["2026-09-06","Everton","Manchester United","Manchester United","Matheus Cunha",6.3],
  ["2026-09-06","Everton","Manchester United","Manchester United","Noussair Mazraoui",6],
  ["2026-09-06","Everton","Manchester United","Manchester United","Patrick Dorgu",6.3],
  ["2026-09-06","Everton","Manchester United","Manchester United","Senne Lammens",6.7],
  ["2026-09-06","Everton","Manchester United","Manchester United","Youri Tielemans",6.6],
  // 2026-09-12  Bournemouth – Brentford
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","Adam Smith",6.5],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","Adrien Truffert",8],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","Alex Scott",6.8],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","Alvaro Rodriguez",6],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","António Silva",6.8],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","Ben Gannon Doak",6.3],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","David Brooks",6],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","Evanilson",7.3],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","James Hill",6.9],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","Justin Kluivert",7.5],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","Lewis Cook",6.1],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","Marcus Tavernier",8.1],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","Rayan",6.6],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","Ryan Christie",6.5],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","Tyler Adams",6.5],
  ["2026-09-12","Bournemouth","Brentford","Bournemouth","Đorđe Petrović",4.6],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Aaron Hickey",6.4],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Caoimhin Kelleher",7.2],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Dango Ouattara",6.1],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Igor Thiago",6.1],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Jaidon Anthony",6.9],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Jannik Schuster",6.9],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Keane Lewis-Potter",6],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Kevin Schade",8],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Kristoffer Ajer",6.5],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Malick Diouf",6.2],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Mamadou Sangare",7.2],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Michael Kayode",6.3],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Mikkel Damsgaard",6.2],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Vitaly Janelt",7.5],
  ["2026-09-12","Bournemouth","Brentford","Brentford","Yehor Yarmoliuk",7],
  // 2026-09-12  Chelsea – Hull City
  ["2026-09-12","Chelsea","Hull City","Chelsea","Cole Palmer",6.9],
  ["2026-09-12","Chelsea","Hull City","Chelsea","Danny Welbeck",6.1],
  ["2026-09-12","Chelsea","Hull City","Chelsea","Emiliano Martínez",6.1],
  ["2026-09-12","Chelsea","Hull City","Chelsea","Estêvão",6.3],
  ["2026-09-12","Chelsea","Hull City","Chelsea","Jorrel Hato",5.4],
  ["2026-09-12","Chelsea","Hull City","Chelsea","João Pedro",8],
  ["2026-09-12","Chelsea","Hull City","Chelsea","Levi Colwill",6.5],
  ["2026-09-12","Chelsea","Hull City","Chelsea","Malo Gusto",6.4],
  ["2026-09-12","Chelsea","Hull City","Chelsea","Maxence Lacroix",6.3],
  ["2026-09-12","Chelsea","Hull City","Chelsea","Morgan Rogers",7.6],
  ["2026-09-12","Chelsea","Hull City","Chelsea","Pedro Neto",6.9],
  ["2026-09-12","Chelsea","Hull City","Chelsea","Pep Chavarría",6.1],
  ["2026-09-12","Chelsea","Hull City","Chelsea","Reece James",6.7],
  ["2026-09-12","Chelsea","Hull City","Chelsea","Roméo Lavia",6.4],
  ["2026-09-12","Chelsea","Hull City","Chelsea","Valentín Barco",6.1],
  ["2026-09-12","Chelsea","Hull City","Chelsea","Wesley Fofana",7],
  ["2026-09-12","Chelsea","Hull City","Hull City","Brooke Norton-Cuffy",6.1],
  ["2026-09-12","Chelsea","Hull City","Hull City","Elliot Stroud",6.2],
  ["2026-09-12","Chelsea","Hull City","Hull City","John Egan",6.6],
  ["2026-09-12","Chelsea","Hull City","Hull City","Konstantinos Tzolakis",6.5],
  ["2026-09-12","Chelsea","Hull City","Hull City","Lewie Coyle",6],
  ["2026-09-12","Chelsea","Hull City","Hull City","Lucas Herrington",6.1],
  ["2026-09-12","Chelsea","Hull City","Hull City","Matt Crooks",6.3],
  ["2026-09-12","Chelsea","Hull City","Hull City","Mohamed Belloumi",7.9],
  ["2026-09-12","Chelsea","Hull City","Hull City","Mohamed-Ali Cho",6.2],
  ["2026-09-12","Chelsea","Hull City","Hull City","Nobel Mendy",6.6],
  ["2026-09-12","Chelsea","Hull City","Hull City","Oli McBurnie",7.2],
  ["2026-09-12","Chelsea","Hull City","Hull City","Regan Slater",7.3],
  ["2026-09-12","Chelsea","Hull City","Hull City","Robinio Vaz",5.9],
  ["2026-09-12","Chelsea","Hull City","Hull City","Ryan Giles",6.5],
  ["2026-09-12","Chelsea","Hull City","Hull City","Semi Ajayi",6.3],
  ["2026-09-12","Chelsea","Hull City","Hull City","Sorba Thomas",6.1],
  ["2026-09-12","Chelsea","Hull City","Hull City","Tim Iroegbunam",6.2],
  // 2026-09-12  Crystal Palace – Ipswich Town
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Adam Wharton",6.1],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Anan Khalaili",7.1],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Axel Disasi",5.3],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Ben Chilwell",6.1],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Chris Richards",6.8],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Daichi Kamada",6.7],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Honest Ahanor",6.6],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Jefferson Lerma",6],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Jørgen Strand Larsen",7.6],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Quinten Timber",7.5],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Takehiro Tomiyasu",6.5],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Tyrick Mitchell",6.2],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Walter Benítez",6.4],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Will Hughes",5.9],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Yéremy Pino",6],
  ["2026-09-12","Crystal Palace","Ipswich Town","Crystal Palace","Zavier Gozo",5.8],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Abdoul Ouattara",6.2],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Abdul Fatawu",6.9],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Daizen Maeda",5.8],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Dara O'Shea",7.2],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Emersonn",7.4],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Exequiel Palacios",6.7],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Issa Diop",6.7],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Jack Clarke",6.4],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Jacob Greaves",6.3],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Jaden Philogene",6],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Julio Enciso",6.2],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Kjell Scherpen",6.4],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Leif Davis",7.8],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Saša Lukić",6.5],
  ["2026-09-12","Crystal Palace","Ipswich Town","Ipswich Town","Zian Flemming",7.1],
  // 2026-09-12  Tottenham Hotspur – Everton
  ["2026-09-12","Tottenham Hotspur","Everton","Everton","Ainsley Maitland-Niles",7],
  ["2026-09-12","Tottenham Hotspur","Everton","Everton","Brennan Johnson",6.8],
  ["2026-09-12","Tottenham Hotspur","Everton","Everton","Harrison Armstrong",6.4],
  ["2026-09-12","Tottenham Hotspur","Everton","Everton","Hayden Hackney",6.2],
  ["2026-09-12","Tottenham Hotspur","Everton","Everton","Jack Grealish",6.2],
  ["2026-09-12","Tottenham Hotspur","Everton","Everton","Jake O'Brien",6.1],
  ["2026-09-12","Tottenham Hotspur","Everton","Everton","James Garner",7.6],
  ["2026-09-12","Tottenham Hotspur","Everton","Everton","James Tarkowski",7.3],
  ["2026-09-12","Tottenham Hotspur","Everton","Everton","Jarrad Branthwaite",7.3],
  ["2026-09-12","Tottenham Hotspur","Everton","Everton","Jordan Pickford",6.8],
  ["2026-09-12","Tottenham Hotspur","Everton","Everton","Kiernan Dewsbury-Hall",6.9],
  ["2026-09-12","Tottenham Hotspur","Everton","Everton","Thierno Barry",6.7],
  ["2026-09-12","Tottenham Hotspur","Everton","Everton","Tyrique George",6.8],
  ["2026-09-12","Tottenham Hotspur","Everton","Everton","Vitaliy Mykolenko",7.7],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Andy Robertson",6.9],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Antonin Kinsky",7.1],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Archie Gray",6.9],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Dominic Solanke",5.9],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","James Maddison",6.2],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Jan Paul van Hecke",7.7],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Lucas Bergvall",6.5],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Mateus Fernandes",6.6],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Mathys Tel",6.1],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Micky van de Ven",7],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Mohammed Kudus",6.6],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Omar Marmoush",6.2],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Rodrigo Bentancur",7],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Sandro Tonali",6.8],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Sávio",7.1],
  ["2026-09-12","Tottenham Hotspur","Everton","Tottenham Hotspur","Tosin Adarabioyo",6.4],
  // 2026-09-13  Coventry City – Brighton
  ["2026-09-13","Coventry City","Brighton","Brighton","Bart Verbruggen",9],
  ["2026-09-13","Coventry City","Brighton","Brighton","Charalampos Kostoulas",7.9],
  ["2026-09-13","Coventry City","Brighton","Brighton","Chema Andrés",6.7],
  ["2026-09-13","Coventry City","Brighton","Brighton","Costinha",6.2],
  ["2026-09-13","Coventry City","Brighton","Brighton","Diego Gómez",7],
  ["2026-09-13","Coventry City","Brighton","Brighton","Ferdi Kadıoğlu",6.8],
  ["2026-09-13","Coventry City","Brighton","Brighton","Ibrahim Osman",6.4],
  ["2026-09-13","Coventry City","Brighton","Brighton","Lewis Dunk",8.4],
  ["2026-09-13","Coventry City","Brighton","Brighton","Luka Vuskovic",7.4],
  ["2026-09-13","Coventry City","Brighton","Brighton","Malick Yalcouyé",7.8],
  ["2026-09-13","Coventry City","Brighton","Brighton","Matt O'Riley",6.2],
  ["2026-09-13","Coventry City","Brighton","Brighton","Maxime De Cuyper",7.7],
  ["2026-09-13","Coventry City","Brighton","Brighton","Olivier Boscagli",7.3],
  ["2026-09-13","Coventry City","Brighton","Brighton","Pascal Groß",9.5],
  ["2026-09-13","Coventry City","Brighton","Brighton","Pascal Struijk",6.5],
  ["2026-09-13","Coventry City","Brighton","Brighton","Yasin Ayari",8],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Aurele Amenda",6.1],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Bobby Thomas",5.6],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Brandon Thomas-Asante",6.1],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Caleb Yirenkyi",5.7],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Carl Rushworth",4.7],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Ephron Mason-Clark",6.6],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Ethan Pinnock",5.8],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Frank Onyeka",6.2],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Jack Rudoni",6.6],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Jay Dasilva",5.5],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Matt Grimes",5.8],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Milan van Ewijk",6.3],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Sidiki Cherif",5.9],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Taiwo Awoniyi",5],
  ["2026-09-13","Coventry City","Brighton","Coventry City","Victor Torp",5.9],
  // 2026-09-13  Manchester United – Manchester City
  ["2026-09-13","Manchester United","Manchester City","Manchester City","Antoine Semenyo",6.3],
  ["2026-09-13","Manchester United","Manchester City","Manchester City","Elliot Anderson",7],
  ["2026-09-13","Manchester United","Manchester City","Manchester City","Enzo Fernández",7.5],
  ["2026-09-13","Manchester United","Manchester City","Manchester City","Erling Haaland",7.5],
  ["2026-09-13","Manchester United","Manchester City","Manchester City","Gianluigi Donnarumma",7.5],
  ["2026-09-13","Manchester United","Manchester City","Manchester City","Iliman Ndiaye",6.9],
  ["2026-09-13","Manchester United","Manchester City","Manchester City","Joško Gvardiol",7.4],
  ["2026-09-13","Manchester United","Manchester City","Manchester City","Marc Guéhi",6.8],
  ["2026-09-13","Manchester United","Manchester City","Manchester City","Matheus Nunes",7.8],
  ["2026-09-13","Manchester United","Manchester City","Manchester City","Nico O'Reilly",6],
  ["2026-09-13","Manchester United","Manchester City","Manchester City","Phil Foden",5.1],
  ["2026-09-13","Manchester United","Manchester City","Manchester City","Rayan Cherki",6.2],
  ["2026-09-13","Manchester United","Manchester City","Manchester City","Rúben Dias",7],
  ["2026-09-13","Manchester United","Manchester City","Manchester United","Benjamin Šeško",6.2],
  ["2026-09-13","Manchester United","Manchester City","Manchester United","Bruno Fernandes",6.7],
  ["2026-09-13","Manchester United","Manchester City","Manchester United","Bryan Mbeumo",6.3],
  ["2026-09-13","Manchester United","Manchester City","Manchester United","Diogo Dalot",6.4],
  ["2026-09-13","Manchester United","Manchester City","Manchester United","Harry Maguire",6.5],
  ["2026-09-13","Manchester United","Manchester City","Manchester United","Joshua Zirkzee",6.1],
  ["2026-09-13","Manchester United","Manchester City","Manchester United","Kobbie Mainoo",7.5],
  ["2026-09-13","Manchester United","Manchester City","Manchester United","Lisandro Martínez",6.6],
  ["2026-09-13","Manchester United","Manchester City","Manchester United","Marcus Rashford",6.4],
  ["2026-09-13","Manchester United","Manchester City","Manchester United","Matheus Cunha",6.3],
  ["2026-09-13","Manchester United","Manchester City","Manchester United","Patrick Dorgu",6.7],
  ["2026-09-13","Manchester United","Manchester City","Manchester United","Senne Lammens",6.2],
  ["2026-09-13","Manchester United","Manchester City","Manchester United","Youri Tielemans",6.8],
  // 2026-09-13  Sunderland – Arsenal
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Ben White",6.6],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Bruno Guimarães",7.7],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Bukayo Saka",7.7],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Christos Tzolis",6.4],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","David Raya",8.2],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Declan Rice",7.6],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Eberechi Eze",6.1],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Ezri Konsa",7.3],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Gabriel Magalhães",7.9],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Jurriën Timber",6.4],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Kai Havertz",6.6],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Martin Ødegaard",7.5],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Martín Zubimendi",6.4],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Mikel Merino",6],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Myles Lewis-Skelly",6.2],
  ["2026-09-12","Sunderland","Arsenal","Arsenal","Riccardo Calafiori",6.6],
  ["2026-09-12","Sunderland","Arsenal","Sunderland","Brian Brobbey",5.7],
  ["2026-09-12","Sunderland","Arsenal","Sunderland","Daniel Ballard",6.7],
  ["2026-09-12","Sunderland","Arsenal","Sunderland","Enzo Le Fée",6],
  ["2026-09-12","Sunderland","Arsenal","Sunderland","Granit Xhaka",6.9],
  ["2026-09-12","Sunderland","Arsenal","Sunderland","Kevin Danso",6],
  ["2026-09-12","Sunderland","Arsenal","Sunderland","Malick Fofana",5.8],
  ["2026-09-12","Sunderland","Arsenal","Sunderland","Nilson Angulo",5.9],
  ["2026-09-12","Sunderland","Arsenal","Sunderland","Noah Sadiki",6.2],
  ["2026-09-12","Sunderland","Arsenal","Sunderland","Nordi Mukiele",6.3],
  ["2026-09-12","Sunderland","Arsenal","Sunderland","Reinildo Mandava",4.8],
  ["2026-09-12","Sunderland","Arsenal","Sunderland","Robin Roefs",6.3],
  ["2026-09-12","Sunderland","Arsenal","Sunderland","Thomas Meunier",6.2],
  ["2026-09-12","Sunderland","Arsenal","Sunderland","Wilson Isidor",5.8],
  // 2026-09-15  Leeds United – Newcastle United
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Anton Stach",7.5],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Ao Tanaka",7.3],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Brenden Aaronson",5.9],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Daniel James",6.4],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Dominic Calvert-Lewin",9],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Ethan Ampadu",7],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Gabriel Gudmundsson",7.2],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Harry Wilson",6.1],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","James Justin",7],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","James Trafford",7.1],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Jayden Bogle",7.3],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Lukas Nmecha",5.9],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Melvin Bard",6.3],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Nico Elvedi",6.5],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Noah Okafor",8.1],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Sean Longstaff",5.9],
  ["2026-09-14","Leeds United","Newcastle United","Leeds United","Tarik Muharemović",7.8],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Aladji Bamba",6.1],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Amar Dedić",6],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Bazoumana Toure",7.3],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Harvey Barnes",6.4],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Jacob Murphy",5.8],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Joe Willock",6.7],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Lewis Hall",6.8],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Lewis Miley",5.4],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Lukas Hornicek",6.1],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Malick Thiaw",6.2],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Matias Fernandez-Pardo",6],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Nico González",6.2],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Sean Steur",5.4],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Sven Botman",6.4],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Tino Livramento",6.2],
  ["2026-09-14","Leeds United","Newcastle United","Newcastle United","Yoane Wissa",5.8],
  // 2026-09-19  Brentford – Chelsea
  ["2026-09-18","Brentford","Chelsea","Brentford","Aaron Hickey",6.7],
  ["2026-09-18","Brentford","Chelsea","Brentford","Caoimhin Kelleher",7.3],
  ["2026-09-18","Brentford","Chelsea","Brentford","Dango Ouattara",6.3],
  ["2026-09-18","Brentford","Chelsea","Brentford","Fábio Carvalho",6.9],
  ["2026-09-18","Brentford","Chelsea","Brentford","Igor Thiago",7.3],
  ["2026-09-18","Brentford","Chelsea","Brentford","Jaidon Anthony",7.2],
  ["2026-09-18","Brentford","Chelsea","Brentford","Jannik Schuster",8.3],
  ["2026-09-18","Brentford","Chelsea","Brentford","Keane Lewis-Potter",7.2],
  ["2026-09-18","Brentford","Chelsea","Brentford","Kevin Schade",6.8],
  ["2026-09-18","Brentford","Chelsea","Brentford","Kristoffer Ajer",7.3],
  ["2026-09-18","Brentford","Chelsea","Brentford","Malick Diouf",6.3],
  ["2026-09-18","Brentford","Chelsea","Brentford","Mamadou Sangare",6.4],
  ["2026-09-18","Brentford","Chelsea","Brentford","Michael Kayode",6.6],
  ["2026-09-18","Brentford","Chelsea","Brentford","Mikkel Damsgaard",7.3],
  ["2026-09-18","Brentford","Chelsea","Brentford","Vitaly Janelt",7],
  ["2026-09-18","Brentford","Chelsea","Brentford","Yehor Yarmoliuk",7],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Cole Palmer",6.6],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Danny Welbeck",6.3],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Emiliano Martínez",6.3],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Estêvão",5.9],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Geovany Quenda",5.8],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Jordan Henderson",6.2],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Joshua Acheampong",5.9],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Levi Colwill",6],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Mahdi Nicoll-Jazuli",6.3],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Maxence Lacroix",6.4],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Morgan Rogers",6.6],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Pedro Neto",6.3],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Pep Chavarría",6.6],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Valentín Barco",6.5],
  ["2026-09-18","Brentford","Chelsea","Chelsea","Wesley Fofana",7.1],
  // 2026-09-19  Brighton – Arsenal
  ["2026-09-19","Brighton","Arsenal","Arsenal","Bruno Guimarães",5.7],
  ["2026-09-19","Brighton","Arsenal","Arsenal","Bukayo Saka",6.9],
  ["2026-09-19","Brighton","Arsenal","Arsenal","Christos Tzolis",5.9],
  ["2026-09-19","Brighton","Arsenal","Arsenal","David Raya",5.8],
  ["2026-09-19","Brighton","Arsenal","Arsenal","Declan Rice",6.5],
  ["2026-09-19","Brighton","Arsenal","Arsenal","Eberechi Eze",6.3],
  ["2026-09-19","Brighton","Arsenal","Arsenal","Ezri Konsa",5.7],
  ["2026-09-19","Brighton","Arsenal","Arsenal","Gabriel Magalhães",6.5],
  ["2026-09-19","Brighton","Arsenal","Arsenal","Jurriën Timber",5.7],
  ["2026-09-19","Brighton","Arsenal","Arsenal","Kai Havertz",6.2],
  ["2026-09-19","Brighton","Arsenal","Arsenal","Martin Ødegaard",5.7],
  ["2026-09-19","Brighton","Arsenal","Arsenal","Martín Zubimendi",6.3],
  ["2026-09-19","Brighton","Arsenal","Arsenal","Max Dowman",6.1],
  ["2026-09-19","Brighton","Arsenal","Arsenal","Mikel Merino",6.1],
  ["2026-09-19","Brighton","Arsenal","Arsenal","Riccardo Calafiori",6],
  ["2026-09-19","Brighton","Arsenal","Arsenal","Viktor Gyökeres",6.2],
  ["2026-09-19","Brighton","Arsenal","Brighton","Bart Verbruggen",6.8],
  ["2026-09-19","Brighton","Arsenal","Brighton","Charalampos Kostoulas",7.8],
  ["2026-09-19","Brighton","Arsenal","Brighton","Chema Andrés",8],
  ["2026-09-19","Brighton","Arsenal","Brighton","Costinha",6.2],
  ["2026-09-19","Brighton","Arsenal","Brighton","Diego Gómez",7.6],
  ["2026-09-19","Brighton","Arsenal","Brighton","Ferdi Kadıoğlu",6.8],
  ["2026-09-19","Brighton","Arsenal","Brighton","Georginio Rutter",6.3],
  ["2026-09-19","Brighton","Arsenal","Brighton","Luka Vuskovic",7.5],
  ["2026-09-19","Brighton","Arsenal","Brighton","Malick Yalcouyé",6.7],
  ["2026-09-19","Brighton","Arsenal","Brighton","Matt O'Riley",6.1],
  ["2026-09-19","Brighton","Arsenal","Brighton","Maxime De Cuyper",7.7],
  ["2026-09-19","Brighton","Arsenal","Brighton","Michael Svoboda",6.1],
  ["2026-09-19","Brighton","Arsenal","Brighton","Olivier Boscagli",7.3],
  ["2026-09-19","Brighton","Arsenal","Brighton","Pascal Groß",8.6],
  ["2026-09-19","Brighton","Arsenal","Brighton","Pascal Struijk",7.2],
  ["2026-09-19","Brighton","Arsenal","Brighton","Yasin Ayari",6.9],
  // 2026-09-19  Everton – Ipswich Town
  ["2026-09-19","Everton","Ipswich Town","Everton","Ainsley Maitland-Niles",7.8],
  ["2026-09-19","Everton","Ipswich Town","Everton","Brennan Johnson",6.4],
  ["2026-09-19","Everton","Ipswich Town","Everton","Harrison Armstrong",7],
  ["2026-09-19","Everton","Ipswich Town","Everton","Hayden Hackney",5.9],
  ["2026-09-19","Everton","Ipswich Town","Everton","Jack Grealish",6.9],
  ["2026-09-19","Everton","Ipswich Town","Everton","Jake O'Brien",6.1],
  ["2026-09-19","Everton","Ipswich Town","Everton","James Garner",6.3],
  ["2026-09-19","Everton","Ipswich Town","Everton","James Tarkowski",8.3],
  ["2026-09-19","Everton","Ipswich Town","Everton","Jarrad Branthwaite",7.4],
  ["2026-09-19","Everton","Ipswich Town","Everton","Jordan Pickford",7.7],
  ["2026-09-19","Everton","Ipswich Town","Everton","Kiernan Dewsbury-Hall",6.2],
  ["2026-09-19","Everton","Ipswich Town","Everton","Thierno Barry",7.2],
  ["2026-09-19","Everton","Ipswich Town","Everton","Tyler Dibling",6.5],
  ["2026-09-19","Everton","Ipswich Town","Everton","Tyrique George",6.1],
  ["2026-09-19","Everton","Ipswich Town","Everton","Vitaliy Mykolenko",7.1],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Abdoul Ouattara",6.9],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Abdul Fatawu",5.4],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Christian Walton",6.3],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Chuba Akpom",6.1],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Daizen Maeda",6.2],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Dara O'Shea",7.1],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Emersonn",6.2],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Exequiel Palacios",6.2],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Issa Diop",7],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Jack Clarke",6.5],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Jaden Philogene",6.3],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Julio Enciso",6.3],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Leif Davis",6],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Saša Lukić",6.6],
  ["2026-09-19","Everton","Ipswich Town","Ipswich Town","Zian Flemming",6],
  // 2026-09-19  Nottingham Forest – Coventry City
  ["2026-09-19","Nottingham Forest","Coventry City","Coventry City","Bobby Thomas",7.9],
  ["2026-09-19","Nottingham Forest","Coventry City","Coventry City","Brandon Thomas-Asante",7.5],
  ["2026-09-19","Nottingham Forest","Coventry City","Coventry City","Caleb Yirenkyi",6.7],
  ["2026-09-19","Nottingham Forest","Coventry City","Coventry City","Carl Rushworth",6.7],
  ["2026-09-19","Nottingham Forest","Coventry City","Coventry City","Ellis Simms",6.2],
  ["2026-09-19","Nottingham Forest","Coventry City","Coventry City","Ephron Mason-Clark",6.3],
  ["2026-09-19","Nottingham Forest","Coventry City","Coventry City","Ethan Pinnock",8],
  ["2026-09-19","Nottingham Forest","Coventry City","Coventry City","Frank Onyeka",6.7],
  ["2026-09-19","Nottingham Forest","Coventry City","Coventry City","Jack Rudoni",7.2],
  ["2026-09-19","Nottingham Forest","Coventry City","Coventry City","Jay Dasilva",8],
  ["2026-09-19","Nottingham Forest","Coventry City","Coventry City","Joel Latibeaudiere",6.2],
  ["2026-09-19","Nottingham Forest","Coventry City","Coventry City","Loum Tchaouna",6.3],
  ["2026-09-19","Nottingham Forest","Coventry City","Coventry City","Matt Grimes",7.1],
  ["2026-09-19","Nottingham Forest","Coventry City","Coventry City","Stephen Mfuni",7.3],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","Chris Wood",6.2],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","Dan Ndoye",5.9],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","Daniel Muñoz",6.2],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","Ibrahim Sangaré",6],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","Igor Jesus",6.2],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","Jair Cunha",6.4],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","James McAtee",6.5],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","Liam Delap",6.7],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","Luca Netz",6.1],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","Matz Sels",6.2],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","Morgan Gibbs-White",7.1],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","Murillo",7.4],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","Neco Williams",7.1],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","Ousmane Diomande",6.3],
  ["2026-09-19","Nottingham Forest","Coventry City","Nottingham Forest","Xaver Schlager",6.7],
  // 2026-09-20  Bournemouth – Liverpool
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","Adam Smith",5.8],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","Adrien Truffert",6.5],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","Alex Scott",6.4],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","António Silva",7],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","Ben Gannon Doak",6],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","Daniel Jebbison",5.9],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","David Brooks",6.1],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","Evanilson",6.4],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","James Hill",7.1],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","Julián Araujo",7.4],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","Lewis Cook",6.1],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","Marcus Tavernier",6.3],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","Rayan",6.6],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","Ryan Christie",5.6],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","Tyler Adams",6.6],
  ["2026-09-20","Bournemouth","Liverpool","Bournemouth","Đorđe Petrović",6.4],
  ["2026-09-20","Bournemouth","Liverpool","Liverpool","Alexander Isak",6.8],
  ["2026-09-20","Bournemouth","Liverpool","Liverpool","Alexis Mac Allister",7.1],
  ["2026-09-20","Bournemouth","Liverpool","Liverpool","Alisson",8],
  ["2026-09-20","Bournemouth","Liverpool","Liverpool","Bradley Barcola",6.4],
  ["2026-09-20","Bournemouth","Liverpool","Liverpool","Cody Gakpo",7.3],
  ["2026-09-20","Bournemouth","Liverpool","Liverpool","Dominik Szoboszlai",6.7],
  ["2026-09-20","Bournemouth","Liverpool","Liverpool","Florian Wirtz",6.9],
  ["2026-09-20","Bournemouth","Liverpool","Liverpool","Jeremy Jacquet",7.1],
  ["2026-09-20","Bournemouth","Liverpool","Liverpool","Lewis Koumas",6.1],
  ["2026-09-20","Bournemouth","Liverpool","Liverpool","Milos Kerkez",6.8],
  ["2026-09-20","Bournemouth","Liverpool","Liverpool","Ryan Gravenberch",6.1],
  ["2026-09-20","Bournemouth","Liverpool","Liverpool","Treymaurice Nyoni",6.4],
  ["2026-09-20","Bournemouth","Liverpool","Liverpool","Victor Munoz",6.3],
  ["2026-09-20","Bournemouth","Liverpool","Liverpool","Virgil van Dijk",7.6],
  // 2026-09-20  Fulham – Manchester United
  ["2026-09-20","Fulham","Manchester United","Fulham","Alex Iwobi",7.4],
  ["2026-09-20","Fulham","Manchester United","Fulham","Antonee Robinson",7.3],
  ["2026-09-20","Fulham","Manchester United","Fulham","Bernd Leno",7.4],
  ["2026-09-20","Fulham","Manchester United","Fulham","Calvin Bassey",6.9],
  ["2026-09-20","Fulham","Manchester United","Fulham","Cesar Palacios",6.2],
  ["2026-09-20","Fulham","Manchester United","Fulham","David Affengruber",6.6],
  ["2026-09-20","Fulham","Manchester United","Fulham","Gonzalo García",6.5],
  ["2026-09-20","Fulham","Manchester United","Fulham","Hugo Larsson",6],
  ["2026-09-20","Fulham","Manchester United","Fulham","Joachim Andersen",6.3],
  ["2026-09-20","Fulham","Manchester United","Fulham","Joshua King",6.7],
  ["2026-09-20","Fulham","Manchester United","Fulham","Kevin",6.3],
  ["2026-09-20","Fulham","Manchester United","Fulham","Oscar Bobb",6.5],
  ["2026-09-20","Fulham","Manchester United","Fulham","Rodrigo Muniz",5.9],
  ["2026-09-20","Fulham","Manchester United","Fulham","Sander Berge",6.8],
  ["2026-09-20","Fulham","Manchester United","Fulham","Shea Charles",7.1],
  ["2026-09-20","Fulham","Manchester United","Fulham","Timothy Castagne",6.2],
  ["2026-09-20","Fulham","Manchester United","Manchester United","Bruno Fernandes",7.1],
  ["2026-09-20","Fulham","Manchester United","Manchester United","Bryan Mbeumo",7.2],
  ["2026-09-20","Fulham","Manchester United","Manchester United","Diogo Dalot",6.6],
  ["2026-09-20","Fulham","Manchester United","Manchester United","Harry Maguire",6.8],
  ["2026-09-20","Fulham","Manchester United","Manchester United","Joshua Zirkzee",6.2],
  ["2026-09-20","Fulham","Manchester United","Manchester United","Kobbie Mainoo",6.5],
  ["2026-09-20","Fulham","Manchester United","Manchester United","Lisandro Martínez",6.5],
  ["2026-09-20","Fulham","Manchester United","Manchester United","Luke Shaw",6.1],
  ["2026-09-20","Fulham","Manchester United","Manchester United","Marcus Rashford",6.8],
  ["2026-09-20","Fulham","Manchester United","Manchester United","Mason Mount",6.1],
  ["2026-09-20","Fulham","Manchester United","Manchester United","Matheus Cunha",7.8],
  ["2026-09-20","Fulham","Manchester United","Manchester United","Patrick Dorgu",6.6],
  ["2026-09-20","Fulham","Manchester United","Manchester United","Senne Lammens",7.2],
  ["2026-09-20","Fulham","Manchester United","Manchester United","Youri Tielemans",6.8],
  // 2026-09-20  Leeds United – Crystal Palace
  ["2026-09-20","Leeds United","Crystal Palace","Crystal Palace","Adam Wharton",7],
  ["2026-09-20","Leeds United","Crystal Palace","Crystal Palace","Anan Khalaili",6.7],
  ["2026-09-20","Leeds United","Crystal Palace","Crystal Palace","Chris Richards",7.1],
  ["2026-09-20","Leeds United","Crystal Palace","Crystal Palace","Daichi Kamada",6],
  ["2026-09-20","Leeds United","Crystal Palace","Crystal Palace","Eddie Nketiah",6],
  ["2026-09-20","Leeds United","Crystal Palace","Crystal Palace","Ismaila Sarr",6],
  ["2026-09-20","Leeds United","Crystal Palace","Crystal Palace","Jaydee Canvot",7.1],
  ["2026-09-20","Leeds United","Crystal Palace","Crystal Palace","Jefferson Lerma",6.9],
  ["2026-09-20","Leeds United","Crystal Palace","Crystal Palace","Jørgen Strand Larsen",6.5],
  ["2026-09-20","Leeds United","Crystal Palace","Crystal Palace","Quinten Timber",6.6],
  ["2026-09-20","Leeds United","Crystal Palace","Crystal Palace","Takehiro Tomiyasu",6.5],
  ["2026-09-20","Leeds United","Crystal Palace","Crystal Palace","Tyrick Mitchell",7],
  ["2026-09-20","Leeds United","Crystal Palace","Crystal Palace","Walter Benítez",7],
  ["2026-09-20","Leeds United","Crystal Palace","Crystal Palace","Yéremy Pino",6.6],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","Anton Stach",7.1],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","Ao Tanaka",6.3],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","Brenden Aaronson",6.1],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","Daniel James",6],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","Dominic Calvert-Lewin",6.5],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","Ethan Ampadu",7.1],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","Gabriel Gudmundsson",7],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","James Justin",7.5],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","James Trafford",7.5],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","Jayden Bogle",6.1],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","Jean Matteo Bahoya",6.2],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","Lukas Nmecha",6.1],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","Nico Elvedi",7.1],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","Noah Okafor",7.2],
  ["2026-09-20","Leeds United","Crystal Palace","Leeds United","Tarik Muharemović",7.4],
  // 2026-09-20  Manchester City – Sunderland
  ["2026-09-20","Manchester City","Sunderland","Manchester City","Antoine Semenyo",9.2],
  ["2026-09-20","Manchester City","Sunderland","Manchester City","Elliot Anderson",6.9],
  ["2026-09-20","Manchester City","Sunderland","Manchester City","Enzo Fernández",7.3],
  ["2026-09-20","Manchester City","Sunderland","Manchester City","Erling Haaland",7.4],
  ["2026-09-20","Manchester City","Sunderland","Manchester City","Gianluigi Donnarumma",6.1],
  ["2026-09-20","Manchester City","Sunderland","Manchester City","Iliman Ndiaye",6.9],
  ["2026-09-20","Manchester City","Sunderland","Manchester City","Joško Gvardiol",7.7],
  ["2026-09-20","Manchester City","Sunderland","Manchester City","Jérémy Doku",6.4],
  ["2026-09-20","Manchester City","Sunderland","Manchester City","Marc Guéhi",6.7],
  ["2026-09-20","Manchester City","Sunderland","Manchester City","Matheus Nunes",6.7],
  ["2026-09-20","Manchester City","Sunderland","Manchester City","Nico O'Reilly",6.2],
  ["2026-09-20","Manchester City","Sunderland","Manchester City","Rayan Cherki",7.9],
  ["2026-09-20","Manchester City","Sunderland","Manchester City","Rúben Dias",6],
  ["2026-09-20","Manchester City","Sunderland","Sunderland","Brian Brobbey",9.6],
  ["2026-09-20","Manchester City","Sunderland","Sunderland","Daniel Ballard",7.1],
  ["2026-09-20","Manchester City","Sunderland","Sunderland","Dayann Methalie",6.2],
  ["2026-09-20","Manchester City","Sunderland","Sunderland","Enzo Le Fée",7.7],
  ["2026-09-20","Manchester City","Sunderland","Sunderland","Granit Xhaka",6.9],
  ["2026-09-20","Manchester City","Sunderland","Sunderland","Kevin Danso",5.2],
  ["2026-09-20","Manchester City","Sunderland","Sunderland","Malick Fofana",6.4],
  ["2026-09-20","Manchester City","Sunderland","Sunderland","Nilson Angulo",6.7],
  ["2026-09-20","Manchester City","Sunderland","Sunderland","Noah Sadiki",5.9],
  ["2026-09-20","Manchester City","Sunderland","Sunderland","Nordi Mukiele",6.9],
  ["2026-09-20","Manchester City","Sunderland","Sunderland","Robin Roefs",5],
  ["2026-09-20","Manchester City","Sunderland","Sunderland","Thomas Meunier",6.9],
  ["2026-09-20","Manchester City","Sunderland","Sunderland","Trai Hume",6],
  ["2026-09-20","Manchester City","Sunderland","Sunderland","Wilson Isidor",6],
  // 2026-10-10  Arsenal – Leeds United
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Ben White",7],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Bruno Guimarães",7.4],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Bukayo Saka",6.6],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","David Raya",6.8],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Declan Rice",7.4],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Ezri Konsa",7.3],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Gabriel Magalhães",6.2],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Jurriën Timber",6.3],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Kai Havertz",6.3],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Martin Ødegaard",6.4],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Mikel Merino",6],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Myles Lewis-Skelly",6.5],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Noni Madueke",7.3],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Piero Hincapié",6.2],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Riccardo Calafiori",7.5],
  ["2026-10-10","Arsenal","Leeds United","Arsenal","Viktor Gyökeres",6.5],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","Anton Stach",7],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","Ao Tanaka",5.9],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","Brenden Aaronson",6],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","Dominic Calvert-Lewin",6.5],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","Ethan Ampadu",6.9],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","Gabriel Gudmundsson",7.2],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","Harry Wilson",5.9],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","Jaka Bijol",6.4],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","James Justin",6.9],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","James Trafford",6.3],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","Jayden Bogle",6.5],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","Jean Matteo Bahoya",5.9],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","Lukas Nmecha",6],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","Nico Elvedi",6.4],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","Noah Okafor",5.8],
  ["2026-10-10","Arsenal","Leeds United","Leeds United","Tarik Muharemović",6.5],
  // 2026-10-10  Aston Villa – Brentford
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","Aaron Wan-Bissaka",6.5],
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","Alysson",5.9],
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","Boubacar Kamara",6.9],
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","Emiliano Buendía",6.2],
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","Ibrahim Mbaye",6.4],
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","Johan Manzambi",7.1],
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","John McGinn",7.7],
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","João Gomes",6.2],
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","Matteo Ruggeri",6.5],
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","Matty Cash",6.4],
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","Nicolas Jackson",7.5],
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","Ross Barkley",6.1],
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","Tyrone Mings",5.5],
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","Victor Lindelöf",6.6],
  ["2026-10-10","Aston Villa","Brentford","Aston Villa","Zion Suzuki",6.7],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Aaron Hickey",6.5],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Callum Wilson",5.9],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Caoimhin Kelleher",7.4],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Dango Ouattara",6.4],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Igor Thiago",6.8],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Jaidon Anthony",6.9],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Jannik Schuster",6.3],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Keane Lewis-Potter",5.9],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Kevin Schade",6.6],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Kristoffer Ajer",7.3],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Malick Diouf",6.5],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Mamadou Sangare",6.3],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Mathias Jensen",6.3],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Michael Kayode",6.5],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Vitaly Janelt",6.7],
  ["2026-10-10","Aston Villa","Brentford","Brentford","Yehor Yarmoliuk",7.3],
  // 2026-10-10  Chelsea – Bournemouth
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","Adam Smith",5.3],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","Adrien Truffert",6.5],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","Alvaro Rodriguez",6.1],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","António Silva",5],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","Ben Gannon Doak",6.2],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","David Brooks",5.8],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","Evanilson",7.3],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","James Hill",6.2],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","Juanlu Sánchez",6.2],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","Julio Soler",6.1],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","Lewis Cook",6.3],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","Marcus Tavernier",5.6],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","Rayan",6.1],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","Ryan Christie",6.4],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","Tyler Adams",5.5],
  ["2026-10-10","Chelsea","Bournemouth","Bournemouth","Đorđe Petrović",5.2],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Cole Palmer",7.5],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Danny Welbeck",6],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Emiliano Martínez",7.5],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Estêvão",6],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Jordan Henderson",8.9],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Joshua Acheampong",6.8],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","João Pedro",8.9],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Levi Colwill",7],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Malo Gusto",6],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Marco Palestra",6],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Maxence Lacroix",6.7],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Moisés Caicedo",7.4],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Morgan Rogers",8.5],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Pedro Neto",7.3],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Pep Chavarría",7.9],
  ["2026-10-10","Chelsea","Bournemouth","Chelsea","Roméo Lavia",6.5],
  // 2026-10-10  Ipswich Town – Fulham
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Alex Iwobi",7.2],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Bernd Leno",6.1],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Calvin Bassey",6.8],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","David Affengruber",6.5],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Emile Smith Rowe",5.7],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Gonzalo García",6.2],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Hugo Larsson",5.8],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Joshua King",6.5],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Kenny Tete",6.6],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Kevin",6],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Manuel Ángel",5.7],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Oscar Bobb",6.6],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Rodrigo Muniz",6],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Ryan Sessegnon",7],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Sander Berge",6.7],
  ["2026-10-10","Ipswich Town","Fulham","Fulham","Shea Charles",6.7],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Abdoul Ouattara",7.3],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Christian Walton",6.4],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Chuba Akpom",6.5],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Daizen Maeda",6.3],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Dara O'Shea",7.7],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Emersonn",6.7],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Exequiel Palacios",6.8],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Issa Diop",7.1],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Jack Clarke",6.9],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Jaden Philogene",6.2],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Julio Enciso",6.9],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Leif Davis",6.4],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Saša Lukić",6.8],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Sindre Walle Egeli",6.4],
  ["2026-10-10","Ipswich Town","Fulham","Ipswich Town","Zian Flemming",6.2],
  // 2026-10-10  Manchester United – Tottenham Hotspur
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Amad Diallo",6.7],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Ayden Heaven",6.1],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Bruno Fernandes",6.6],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Bryan Mbeumo",7.7],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Carlos Baleba",6.8],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Diogo Dalot",6.6],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Harry Maguire",6.9],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Joshua Zirkzee",6.7],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Kobbie Mainoo",6.6],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Leny Yoro",7.2],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Lisandro Martínez",6.7],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Luke Shaw",7],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Marcus Rashford",6],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Matheus Cunha",7.3],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Senne Lammens",5.9],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Manchester United","Youri Tielemans",6.9],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Antonin Kinsky",6.8],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Archie Gray",6.8],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Conor Gallagher",6.5],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Destiny Udogie",6.5],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Dominic Solanke",6.9],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","James Maddison",6.6],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Jan Paul van Hecke",6.7],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Lucas Bergvall",6.8],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Marcos Senesi",6.4],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Mateus Fernandes",6.1],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Micky van de Ven",6.1],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Mohammed Kudus",6.4],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Omar Marmoush",6.3],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Rodrigo Bentancur",5],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Sandro Tonali",7.3],
  ["2026-10-10","Manchester United","Tottenham Hotspur","Tottenham Hotspur","Sávio",6.9],
  // 2026-10-10  Sunderland – Brighton
  ["2026-10-10","Sunderland","Brighton","Brighton","Bart Verbruggen",7.4],
  ["2026-10-10","Sunderland","Brighton","Brighton","Charalampos Kostoulas",6.7],
  ["2026-10-10","Sunderland","Brighton","Brighton","Chema Andrés",6.7],
  ["2026-10-10","Sunderland","Brighton","Brighton","Costinha",6.2],
  ["2026-10-10","Sunderland","Brighton","Brighton","Diego Gómez",7.7],
  ["2026-10-10","Sunderland","Brighton","Brighton","Ferdi Kadıoğlu",7.5],
  ["2026-10-10","Sunderland","Brighton","Brighton","Georginio Rutter",6.8],
  ["2026-10-10","Sunderland","Brighton","Brighton","Jaouen Hadjam",7],
  ["2026-10-10","Sunderland","Brighton","Brighton","Lewis Dunk",6.8],
  ["2026-10-10","Sunderland","Brighton","Brighton","Luka Vuskovic",7.5],
  ["2026-10-10","Sunderland","Brighton","Brighton","Malick Yalcouyé",6.5],
  ["2026-10-10","Sunderland","Brighton","Brighton","Maxime De Cuyper",7.1],
  ["2026-10-10","Sunderland","Brighton","Brighton","Olivier Boscagli",6.8],
  ["2026-10-10","Sunderland","Brighton","Brighton","Pascal Groß",7.9],
  ["2026-10-10","Sunderland","Brighton","Brighton","Pascal Struijk",5.9],
  ["2026-10-10","Sunderland","Brighton","Brighton","Yasin Ayari",6.1],
  ["2026-10-10","Sunderland","Brighton","Sunderland","Dayann Methalie",6.3],
  ["2026-10-10","Sunderland","Brighton","Sunderland","Enzo Le Fée",6.3],
  ["2026-10-10","Sunderland","Brighton","Sunderland","Granit Xhaka",6.4],
  ["2026-10-10","Sunderland","Brighton","Sunderland","Jocelin Ta Bi",6],
  ["2026-10-10","Sunderland","Brighton","Sunderland","Kevin Danso",6],
  ["2026-10-10","Sunderland","Brighton","Sunderland","Malick Fofana",6.3],
  ["2026-10-10","Sunderland","Brighton","Sunderland","Nilson Angulo",5.9],
  ["2026-10-10","Sunderland","Brighton","Sunderland","Noah Sadiki",7],
  ["2026-10-10","Sunderland","Brighton","Sunderland","Nordi Mukiele",7.5],
  ["2026-10-10","Sunderland","Brighton","Sunderland","Reinildo Mandava",7],
  ["2026-10-10","Sunderland","Brighton","Sunderland","Robin Roefs",5.9],
  ["2026-10-10","Sunderland","Brighton","Sunderland","Thomas Meunier",6.1],
  ["2026-10-10","Sunderland","Brighton","Sunderland","Trai Hume",6],
  ["2026-10-10","Sunderland","Brighton","Sunderland","Wilson Isidor",5.9],
  // 2026-10-13  Coventry City – Newcastle United
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Bobby Thomas",8],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Brandon Thomas-Asante",7.4],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Caleb Yirenkyi",6.6],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Carl Rushworth",6.5],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Ellis Simms",7.1],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Ephron Mason-Clark",6.2],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Ethan Pinnock",6.4],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Frank Onyeka",6.2],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Jack Rudoni",6.9],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Jay Dasilva",6.5],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Matt Grimes",6.4],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Milan van Ewijk",7.4],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Sidiki Cherif",7.4],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Stephen Mfuni",7.5],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Tatsuhiro Sakamoto",6.2],
  ["2026-10-12","Coventry City","Newcastle United","Coventry City","Victor Torp",6.3],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Amar Dedić",6.5],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Bazoumana Toure",6.3],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Dan Burn",6.2],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Harvey Barnes",6.6],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Jacob Murphy",6.2],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Joe Willock",6.1],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Joelinton",5.5],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Lewis Hall",6.2],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Lewis Miley",6.1],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Lukas Hornicek",5.1],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Malick Thiaw",6],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Matias Fernandez-Pardo",6.2],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Nico González",7],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Sven Botman",7.3],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","William Osula",5.8],
  ["2026-10-12","Coventry City","Newcastle United","Newcastle United","Yoane Wissa",6.3],
  // 2026-10-18  Bournemouth – Sunderland
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","Adam Smith",6.9],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","Adrien Truffert",6.8],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","Alvaro Rodriguez",6],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","Amine Adli",5.9],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","António Silva",7.8],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","Bafode Diakite",6.1],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","Ben Gannon Doak",6.1],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","Evanilson",8.7],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","James Hill",7.6],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","Justin Kluivert",6],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","Lewis Cook",7.3],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","Marcus Tavernier",7.6],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","Rayan",7.1],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","Ryan Christie",6.8],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","Tyler Adams",7.1],
  ["2026-10-18","Bournemouth","Sunderland","Bournemouth","Đorđe Petrović",6.5],
  ["2026-10-18","Bournemouth","Sunderland","Sunderland","Chris Rigg",6.3],
  ["2026-10-18","Bournemouth","Sunderland","Sunderland","Enzo Le Fée",6.4],
  ["2026-10-18","Bournemouth","Sunderland","Sunderland","Granit Xhaka",6.6],
  ["2026-10-18","Bournemouth","Sunderland","Sunderland","Habib Diarra",6],
  ["2026-10-18","Bournemouth","Sunderland","Sunderland","Kevin Danso",4],
  ["2026-10-18","Bournemouth","Sunderland","Sunderland","Luke O'Nien",6.4],
  ["2026-10-18","Bournemouth","Sunderland","Sunderland","Noah Sadiki",5.8],
  ["2026-10-18","Bournemouth","Sunderland","Sunderland","Nordi Mukiele",6.8],
  ["2026-10-18","Bournemouth","Sunderland","Sunderland","Omar Alderete",4.9],
  ["2026-10-18","Bournemouth","Sunderland","Sunderland","Reinildo Mandava",6.3],
  ["2026-10-18","Bournemouth","Sunderland","Sunderland","Robin Roefs",6.2],
  ["2026-10-18","Bournemouth","Sunderland","Sunderland","Timur Tutierov",6.1],
  ["2026-10-18","Bournemouth","Sunderland","Sunderland","Trai Hume",6.1],
  // 2026-10-18  Brighton – Crystal Palace
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Bart Verbruggen",7.1],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Charalampos Kostoulas",8.8],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Chema Andrés",7.1],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Diego Gómez",8.2],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Ferdi Kadıoğlu",7.2],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Georginio Rutter",6.2],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Jack Hinshelwood",7],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Jaouen Hadjam",6.1],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Lewis Dunk",7.8],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Luka Vuskovic",8.4],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Malick Yalcouyé",6.3],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Maxime De Cuyper",7.9],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Michael Svoboda",6.2],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Olivier Boscagli",7.7],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Pascal Groß",6.7],
  ["2026-10-18","Brighton","Crystal Palace","Brighton","Yasin Ayari",7.8],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Adam Wharton",5.7],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Anan Khalaili",6.1],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Chris Richards",6.3],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Daichi Kamada",5.9],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Dwight McNeil",5.9],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Eddie Nketiah",5.9],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Honest Ahanor",5.7],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Jaydee Canvot",5.3],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Jean-Philippe Mateta",6.5],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Jefferson Lerma",6.5],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Jørgen Strand Larsen",5.7],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Quinten Timber",5.6],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Tyrick Mitchell",6.1],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Walter Benítez",5.7],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Will Hughes",5.9],
  ["2026-10-18","Brighton","Crystal Palace","Crystal Palace","Yéremy Pino",5.6],
  // 2026-10-18  Leeds United – Manchester United
  ["2026-10-18","Leeds United","Manchester United","Leeds United","Anton Stach",6.6],
  ["2026-10-18","Leeds United","Manchester United","Leeds United","Ao Tanaka",6.6],
  ["2026-10-18","Leeds United","Manchester United","Leeds United","Dominic Calvert-Lewin",7.6],
  ["2026-10-18","Leeds United","Manchester United","Leeds United","Ethan Ampadu",6.2],
  ["2026-10-18","Leeds United","Manchester United","Leeds United","Gabriel Gudmundsson",6],
  ["2026-10-18","Leeds United","Manchester United","Leeds United","James Justin",6.3],
  ["2026-10-18","Leeds United","Manchester United","Leeds United","James Trafford",6.4],
  ["2026-10-18","Leeds United","Manchester United","Leeds United","Jayden Bogle",6.6],
  ["2026-10-18","Leeds United","Manchester United","Leeds United","Lukas Nmecha",6.3],
  ["2026-10-18","Leeds United","Manchester United","Leeds United","Nico Elvedi",7.2],
  ["2026-10-18","Leeds United","Manchester United","Leeds United","Noah Okafor",6.1],
  ["2026-10-18","Leeds United","Manchester United","Leeds United","Sean Longstaff",6.1],
  ["2026-10-18","Leeds United","Manchester United","Leeds United","Tarik Muharemović",7.1],
  ["2026-10-18","Leeds United","Manchester United","Manchester United","Amad Diallo",6.7],
  ["2026-10-18","Leeds United","Manchester United","Manchester United","Andrey Santos",6.3],
  ["2026-10-18","Leeds United","Manchester United","Manchester United","Bruno Fernandes",6.3],
  ["2026-10-18","Leeds United","Manchester United","Manchester United","Bryan Mbeumo",6.8],
  ["2026-10-18","Leeds United","Manchester United","Manchester United","Carlos Baleba",6.5],
  ["2026-10-18","Leeds United","Manchester United","Manchester United","Diogo Dalot",7.7],
  ["2026-10-18","Leeds United","Manchester United","Manchester United","Harry Maguire",7.1],
  ["2026-10-18","Leeds United","Manchester United","Manchester United","Leny Yoro",6.8],
  ["2026-10-18","Leeds United","Manchester United","Manchester United","Lisandro Martínez",6.4],
  ["2026-10-18","Leeds United","Manchester United","Manchester United","Mason Mount",6.5],
  ["2026-10-18","Leeds United","Manchester United","Manchester United","Matheus Cunha",6],
  ["2026-10-18","Leeds United","Manchester United","Manchester United","Noussair Mazraoui",7.2],
  ["2026-10-18","Leeds United","Manchester United","Manchester United","Senne Lammens",6.6],
  ["2026-10-18","Leeds United","Manchester United","Manchester United","Youri Tielemans",7.6],
  // 2026-10-18  Nottingham Forest – Arsenal
  ["2026-10-18","Nottingham Forest","Arsenal","Arsenal","Bruno Guimarães",7.6],
  ["2026-10-18","Nottingham Forest","Arsenal","Arsenal","Bukayo Saka",7.1],
  ["2026-10-18","Nottingham Forest","Arsenal","Arsenal","David Raya",7.3],
  ["2026-10-18","Nottingham Forest","Arsenal","Arsenal","Declan Rice",7.2],
  ["2026-10-18","Nottingham Forest","Arsenal","Arsenal","Eberechi Eze",6.1],
  ["2026-10-18","Nottingham Forest","Arsenal","Arsenal","Ezri Konsa",7.1],
  ["2026-10-18","Nottingham Forest","Arsenal","Arsenal","Gabriel Magalhães",7.8],
  ["2026-10-18","Nottingham Forest","Arsenal","Arsenal","Jurriën Timber",6.4],
  ["2026-10-18","Nottingham Forest","Arsenal","Arsenal","Kai Havertz",6.3],
  ["2026-10-18","Nottingham Forest","Arsenal","Arsenal","Martin Ødegaard",6.5],
  ["2026-10-18","Nottingham Forest","Arsenal","Arsenal","Mikel Merino",6.3],
  ["2026-10-18","Nottingham Forest","Arsenal","Arsenal","Noni Madueke",6.6],
  ["2026-10-18","Nottingham Forest","Arsenal","Arsenal","Riccardo Calafiori",6.4],
  ["2026-10-18","Nottingham Forest","Arsenal","Arsenal","Viktor Gyökeres",6.2],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Arnaud Kalimuendo",6],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Callum Hudson-Odoi",6.1],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Chris Wood",6.1],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Dan Ndoye",5.8],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Daniel Muñoz",6.4],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Ibrahim Sangaré",6.1],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Jair Cunha",6.5],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","James McAtee",6.5],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Liam Delap",6.5],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Matz Sels",5.9],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Morgan Gibbs-White",6.3],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Murillo",7.1],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Neco Williams",6.9],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Nicolás Domínguez",6.6],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Ousmane Diomande",6.8],
  ["2026-10-18","Nottingham Forest","Arsenal","Nottingham Forest","Xaver Schlager",7],
  // 2026-10-19  Tottenham Hotspur – Coventry City
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Bobby Thomas",6.7],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Brandon Thomas-Asante",6.8],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Caleb Yirenkyi",6.1],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Carl Rushworth",4.3],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Ephron Mason-Clark",6.1],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Ethan Pinnock",6.4],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Frank Onyeka",6.4],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Gustavo Hamer",6.3],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Jack Rudoni",6.7],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Jay Dasilva",6.1],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Kaine Kesler-Hayden",6.1],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Matt Grimes",6.1],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Milan van Ewijk",6.7],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Sidiki Cherif",6.4],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Taiwo Awoniyi",5.9],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Coventry City","Tatsuhiro Sakamoto",6.5],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Andy Robertson",6.5],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Antonin Kinsky",6.3],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Archie Gray",7.3],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Ben Davies",7.2],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Conor Gallagher",6.3],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Dejan Kulusevski",6.3],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Dominic Solanke",7],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","James Maddison",7.4],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Jan Paul van Hecke",7.6],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Mateus Fernandes",6.2],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Mathys Tel",6],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Micky van de Ven",7.1],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Mohammed Kudus",7.2],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Omar Marmoush",7.6],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Sandro Tonali",7.2],
  ["2026-10-19","Tottenham Hotspur","Coventry City","Tottenham Hotspur","Tosin Adarabioyo",6.7],
  // 2026-10-21  Como – Manchester United
  ["2026-10-21","Como","Manchester United","Como","Alberto Dossena",6],
  ["2026-10-21","Como","Manchester United","Como","Anastasios Douvikas",7.6],
  ["2026-10-21","Como","Manchester United","Como","Ivan Smolčić",5.8],
  ["2026-10-21","Como","Manchester United","Como","Jacobo Ramón",8],
  ["2026-10-21","Como","Manchester United","Como","Jean Butez",6.8],
  ["2026-10-21","Como","Manchester United","Como","Kaiki Bruno",6.7],
  ["2026-10-21","Como","Manchester United","Como","Lucas Da Cunha",7.4],
  ["2026-10-21","Como","Manchester United","Como","Luis Milla",7.1],
  ["2026-10-21","Como","Manchester United","Como","Marc-Oliver Kempf",6.4],
  ["2026-10-21","Como","Manchester United","Como","Martin Baturina",7.3],
  ["2026-10-21","Como","Manchester United","Como","Maxence Caqueret",6],
  ["2026-10-21","Como","Manchester United","Como","Máximo Perrone",7.2],
  ["2026-10-21","Como","Manchester United","Como","Nico Paz",10],
  ["2026-10-21","Como","Manchester United","Como","Samuele Ricci",5.9],
  ["2026-10-21","Como","Manchester United","Como","Yan Couto",7.2],
  ["2026-10-21","Como","Manchester United","Como","Álex Valle",6.9],
  ["2026-10-21","Como","Manchester United","Manchester United","Amad Diallo",7.9],
  ["2026-10-21","Como","Manchester United","Manchester United","Andrey Santos",6.2],
  ["2026-10-21","Como","Manchester United","Manchester United","Bruno Fernandes",5.9],
  ["2026-10-21","Como","Manchester United","Manchester United","Bryan Mbeumo",5.9],
  ["2026-10-21","Como","Manchester United","Manchester United","Carlos Baleba",5.6],
  ["2026-10-21","Como","Manchester United","Manchester United","Diogo Dalot",6.3],
  ["2026-10-21","Como","Manchester United","Manchester United","Harry Amass",6.1],
  ["2026-10-21","Como","Manchester United","Manchester United","Harry Maguire",6.8],
  ["2026-10-21","Como","Manchester United","Manchester United","Joshua Zirkzee",6.7],
  ["2026-10-21","Como","Manchester United","Manchester United","Mason Mount",6],
  ["2026-10-21","Como","Manchester United","Manchester United","Matheus Cunha",6.1],
  ["2026-10-21","Como","Manchester United","Manchester United","Matthijs de Ligt",5.5],
  ["2026-10-21","Como","Manchester United","Manchester United","Noussair Mazraoui",5.3],
  ["2026-10-21","Como","Manchester United","Manchester United","Senne Lammens",6.4],
  ["2026-10-21","Como","Manchester United","Manchester United","Shea Lacey",6.1],
  ["2026-10-21","Como","Manchester United","Manchester United","Youri Tielemans",6.4],
  // 2026-10-24  Arsenal – Everton
  ["2026-10-24","Arsenal","Everton","Arsenal","Ben White",7.6],
  ["2026-10-24","Arsenal","Everton","Arsenal","Bruno Guimarães",6.3],
  ["2026-10-24","Arsenal","Everton","Arsenal","David Raya",7.4],
  ["2026-10-24","Arsenal","Everton","Arsenal","Declan Rice",7.4],
  ["2026-10-24","Arsenal","Everton","Arsenal","Eberechi Eze",6.5],
  ["2026-10-24","Arsenal","Everton","Arsenal","Ezri Konsa",7.8],
  ["2026-10-24","Arsenal","Everton","Arsenal","Gabriel Magalhães",8.5],
  ["2026-10-24","Arsenal","Everton","Arsenal","Kai Havertz",6.3],
  ["2026-10-24","Arsenal","Everton","Arsenal","Martin Ødegaard",6.9],
  ["2026-10-24","Arsenal","Everton","Arsenal","Martín Zubimendi",6],
  ["2026-10-24","Arsenal","Everton","Arsenal","Max Dowman",6.2],
  ["2026-10-24","Arsenal","Everton","Arsenal","Mikel Merino",6.6],
  ["2026-10-24","Arsenal","Everton","Arsenal","Myles Lewis-Skelly",6.9],
  ["2026-10-24","Arsenal","Everton","Arsenal","Noni Madueke",6.3],
  ["2026-10-24","Arsenal","Everton","Arsenal","Riccardo Calafiori",6.6],
  ["2026-10-24","Arsenal","Everton","Arsenal","Viktor Gyökeres",6.9],
  ["2026-10-24","Arsenal","Everton","Everton","Brennan Johnson",5.9],
  ["2026-10-24","Arsenal","Everton","Everton","Carlos Alcaraz",5.9],
  ["2026-10-24","Arsenal","Everton","Everton","Harrison Armstrong",6.9],
  ["2026-10-24","Arsenal","Everton","Everton","Hayden Hackney",6.2],
  ["2026-10-24","Arsenal","Everton","Everton","Jake O'Brien",6.5],
  ["2026-10-24","Arsenal","Everton","Everton","James Garner",6.3],
  ["2026-10-24","Arsenal","Everton","Everton","James Tarkowski",6.9],
  ["2026-10-24","Arsenal","Everton","Everton","Jordan Pickford",6.1],
  ["2026-10-24","Arsenal","Everton","Everton","Kiernan Dewsbury-Hall",6.1],
  ["2026-10-24","Arsenal","Everton","Everton","Merlin Rohl",6.4],
  ["2026-10-24","Arsenal","Everton","Everton","Thierno Barry",6.9],
  ["2026-10-24","Arsenal","Everton","Everton","Tyler Dibling",6.3],
  ["2026-10-24","Arsenal","Everton","Everton","Tyrique George",6.7],
  ["2026-10-24","Arsenal","Everton","Everton","Vitaliy Mykolenko",5.3],
  // 2026-10-24  Aston Villa – Manchester City
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","Alysson",6.5],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","Boubacar Kamara",7.1],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","Brian Madjo",6],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","Emiliano Buendía",5.7],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","Ian Maatsen",6.7],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","Ibrahim Mbaye",6.7],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","Johan Manzambi",6.7],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","John McGinn",7.6],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","João Gomes",6.6],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","Leon Goretzka",6],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","Matty Cash",7],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","Nicolas Jackson",8.5],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","Pau Torres",6.3],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","Ross Barkley",6.1],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","Victor Lindelöf",6.5],
  ["2026-10-24","Aston Villa","Manchester City","Aston Villa","Zion Suzuki",7.8],
  ["2026-10-24","Aston Villa","Manchester City","Manchester City","Abdukodir Khusanov",8],
  ["2026-10-24","Aston Villa","Manchester City","Manchester City","Elliot Anderson",7.1],
  ["2026-10-24","Aston Villa","Manchester City","Manchester City","Enzo Fernández",6.3],
  ["2026-10-24","Aston Villa","Manchester City","Manchester City","Erling Haaland",7.6],
  ["2026-10-24","Aston Villa","Manchester City","Manchester City","Gianluigi Donnarumma",4.9],
  ["2026-10-24","Aston Villa","Manchester City","Manchester City","Iliman Ndiaye",7.3],
  ["2026-10-24","Aston Villa","Manchester City","Manchester City","Joško Gvardiol",7.1],
  ["2026-10-24","Aston Villa","Manchester City","Manchester City","Jérémy Doku",7.8],
  ["2026-10-24","Aston Villa","Manchester City","Manchester City","Marc Guéhi",5.1],
  ["2026-10-24","Aston Villa","Manchester City","Manchester City","Phil Foden",6.2],
  ["2026-10-24","Aston Villa","Manchester City","Manchester City","Rayan Cherki",6.1],
  ["2026-10-24","Aston Villa","Manchester City","Manchester City","Rico Lewis",6.1],
  ["2026-10-24","Aston Villa","Manchester City","Manchester City","Ryan McAidoo",6.7],
  ["2026-10-24","Aston Villa","Manchester City","Manchester City","Rúben Dias",6.3],
  // 2026-10-24  Chelsea – Tottenham Hotspur
  ["2026-10-24","Chelsea","Tottenham Hotspur","Chelsea","Cole Palmer",5.1],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Chelsea","Danny Welbeck",6],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Chelsea","Estêvão",5.9],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Chelsea","Geovany Quenda",6.4],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Chelsea","Jordan Henderson",6.3],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Chelsea","Jorrel Hato",6.8],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Chelsea","Joshua Acheampong",6],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Chelsea","Levi Colwill",6.6],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Chelsea","Marco Palestra",5.5],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Chelsea","Maxence Lacroix",6.4],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Chelsea","Mike Penders",5.9],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Chelsea","Moisés Caicedo",6.5],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Chelsea","Morgan Rogers",5.7],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Chelsea","Pedro Neto",6.7],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Andy Robertson",6.6],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Antonin Kinsky",7.4],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Archie Gray",6.9],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Ben Davies",6],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Conor Gallagher",6.7],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Dejan Kulusevski",6.3],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Dominic Solanke",6.6],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","James Maddison",6.3],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Jan Paul van Hecke",7.5],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Mateus Fernandes",6.3],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Mathys Tel",8.4],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Micky van de Ven",6.7],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Mohammed Kudus",7.5],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Omar Marmoush",6.3],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Pedro Porro",6.3],
  ["2026-10-24","Chelsea","Tottenham Hotspur","Tottenham Hotspur","Sandro Tonali",7.2],
  // 2026-10-24  Coventry City – Fulham
  ["2026-10-24","Coventry City","Fulham","Coventry City","Bobby Thomas",6.7],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Brandon Thomas-Asante",6.6],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Caleb Yirenkyi",6.4],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Carl Rushworth",6.3],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Ephron Mason-Clark",6.1],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Ethan Pinnock",7.2],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Frank Onyeka",6.2],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Gustavo Hamer",6],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Jack Rudoni",6.9],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Jay Dasilva",6.3],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Matt Grimes",6.3],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Milan van Ewijk",6.6],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Sidiki Cherif",6.1],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Stephen Mfuni",6.3],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Taiwo Awoniyi",5.9],
  ["2026-10-24","Coventry City","Fulham","Coventry City","Tatsuhiro Sakamoto",6.7],
  ["2026-10-24","Coventry City","Fulham","Fulham","Alex Iwobi",6.5],
  ["2026-10-24","Coventry City","Fulham","Fulham","Antonee Robinson",6.9],
  ["2026-10-24","Coventry City","Fulham","Fulham","Bernd Leno",7.3],
  ["2026-10-24","Coventry City","Fulham","Fulham","Calvin Bassey",6.8],
  ["2026-10-24","Coventry City","Fulham","Fulham","Cesar Palacios",6.4],
  ["2026-10-24","Coventry City","Fulham","Fulham","David Affengruber",7.2],
  ["2026-10-24","Coventry City","Fulham","Fulham","Gonzalo García",6.3],
  ["2026-10-24","Coventry City","Fulham","Fulham","Hugo Larsson",6.4],
  ["2026-10-24","Coventry City","Fulham","Fulham","Joshua King",7],
  ["2026-10-24","Coventry City","Fulham","Fulham","Kenny Tete",6.5],
  ["2026-10-24","Coventry City","Fulham","Fulham","Oscar Bobb",8],
  ["2026-10-24","Coventry City","Fulham","Fulham","Rodrigo Muniz",6.3],
  ["2026-10-24","Coventry City","Fulham","Fulham","Sander Berge",6.8],
  ["2026-10-24","Coventry City","Fulham","Fulham","Shea Charles",7.3],
  ["2026-10-24","Coventry City","Fulham","Fulham","Timothy Castagne",7.4],
  ["2026-10-24","Coventry City","Fulham","Fulham","Tom Cairney",6.1],
  // 2026-10-24  Ipswich Town – Nottingham Forest
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Abdoul Ouattara",6.4],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Abdul Fatawu",6],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Azor Matusiwa",6],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Christian Walton",6.8],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Chuba Akpom",6.1],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Daizen Maeda",6.1],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Dara O'Shea",5.7],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Emersonn",6.4],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Exequiel Palacios",6.5],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Issa Diop",6],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Jack Clarke",6.1],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Jaden Philogene",6.3],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Julio Enciso",7.8],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Leif Davis",6.9],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Ipswich Town","Zian Flemming",6.3],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Nottingham Forest","Callum Hudson-Odoi",6.1],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Nottingham Forest","Chris Wood",6],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Nottingham Forest","Dan Ndoye",6.3],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Nottingham Forest","Daniel Muñoz",7.5],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Nottingham Forest","Jair Cunha",6.3],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Nottingham Forest","James McAtee",7.1],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Nottingham Forest","Liam Delap",6.1],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Nottingham Forest","Luca Netz",5.9],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Nottingham Forest","Matz Sels",6.2],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Nottingham Forest","Morgan Gibbs-White",6.9],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Nottingham Forest","Murillo",6.4],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Nottingham Forest","Neco Williams",7.5],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Nottingham Forest","Nikola Milenković",5.8],
  ["2026-10-23","Ipswich Town","Nottingham Forest","Nottingham Forest","Xaver Schlager",7.2],
].map(([date,home,away,team,player,rating]) =>
  ({ id:`r_${date}_${team}_${player}`.replace(/\s+/g,""), date, home, away, team, player, rating }));
const RATING_SEED_VERSION = 19;
const CARDS_KEY = "bazi:cards";
/* ใบที่บันทึกไว้แล้ว — เก็บเป็นข้อมูลดิบ ยังไม่เอาไปคิดคะแนน */
const SEED_CARDS = [
  ["2026-11-03","AS Roma","Matías Soulé",20,"Y"],
  ["2026-11-03","Manchester United","Bruno Fernandes",20,"Y"],
  ["2026-11-03","AS Roma","Emanuele Lulli",35,"Y"],
  ["2026-11-03","AS Roma","Donyell Malen",42,"Y"],
  ["2026-11-03","Manchester United","Ayden Heaven",70,"Y"],
  ["2026-11-03","Manchester United","Harry Maguire",78,"Y"],
  ["2026-11-03","Manchester United","Matheus Cunha",87,"Y"],
  ["2026-11-03","Manchester United","Matheus Cunha",90,"R"],
  ["2026-11-02","Newcastle United","Dan Burn",32,"Y"],
  ["2026-11-02","Everton","Tyrique George",52,"Y"],
  ["2026-11-02","Everton","David Moyes",73,"Y"],
  ["2026-11-02","Newcastle United","Jacob Ramsey",90,"Y"],
  ["2026-11-02","Newcastle United","Jacob Ramsey",90,"R"],
  ["2026-11-02","Everton","Brennan Johnson",90,"Y"],
  ["2026-11-02","Newcastle United","Fabian Schär",90,"Y"],
  ["2026-11-01","Liverpool","Bradley Barcola",45,"Y"],
  ["2026-11-01","Arsenal","Noni Madueke",55,"Y"],
  ["2026-11-01","Liverpool","Milos Kerkez",67,"Y"],
  ["2026-11-01","Arsenal","Myles Lewis-Skelly",72,"Y"],
  ["2026-11-01","Liverpool","Alexis Mac Allister",80,"Y"],
  ["2026-11-01","Arsenal","Jurriën Timber",80,"Y"],
  ["2026-11-01","Arsenal","David Raya",90,"Y"],
  ["2026-11-01","Liverpool","Virgil van Dijk",90,"Y"],
  ["2026-10-31","Fulham","David Affengruber",30,"Y"],
  ["2026-10-31","Fulham","Calvin Bassey",45,"Y"],
  ["2026-10-31","Aston Villa","Matty Cash",76,"Y"],
  ["2026-10-31","Fulham","Tom Cairney",77,"Y"],
  ["2026-10-31","Crystal Palace","Jean-Philippe Mateta",13,"R"],
  ["2026-10-31","Tottenham Hotspur","Archie Gray",15,"Y"],
  ["2026-10-31","Crystal Palace","Óscar Mingueza",53,"Y"],
  ["2026-10-31","Nottingham Forest","Nikola Milenković",36,"Y"],
  ["2026-10-31","Nottingham Forest","Daniel Muñoz",64,"Y"],
  ["2026-10-31","Brentford","Michael Kayode",68,"Y"],
  ["2026-10-31","Nottingham Forest","James McAtee",83,"Y"],
  ["2026-10-31","Leeds United","Nico Elvedi",35,"Y"],
  ["2026-10-31","Leeds United","Daniel Farke",35,"Y"],
  ["2026-10-31","Bournemouth","Ryan Christie",45,"Y"],
  ["2026-10-31","Leeds United","Ethan Ampadu",62,"Y"],
  ["2026-10-31","Bournemouth","Tyler Adams",74,"Y"],
  ["2026-10-31","Manchester United","Lisandro Martínez",59,"Y"],
  ["2026-10-31","Manchester United","Lisandro Martínez",63,"R"],
  ["2026-10-31","Manchester United","Harry Maguire",65,"Y"],
  ["2026-10-31","Manchester United","Kobbie Mainoo",70,"Y"],
  ["2026-10-31","Manchester United","Bryan Mbeumo",81,"Y"],
  ["2026-10-31","Manchester United","Joshua Zirkzee",86,"Y"],
  ["2026-10-31","Chelsea","Mike Penders",90,"Y"],
  ["2026-10-31","Coventry City","Victor Torp",7,"Y"],
  ["2026-10-31","Coventry City","Tatsuhiro Sakamoto",55,"Y"],
  ["2026-10-31","Sunderland","Omar Alderete",90,"Y"],
  ["2026-10-31","Sunderland","Omar Alderete",90,"R"],
  ["2026-10-31","Ipswich Town","Exequiel Palacios",28,"Y"],
  ["2026-10-31","Hull City","Elliot Stroud",52,"Y"],
  ["2026-10-31","Hull City","Matt Crooks",61,"Y"],
  ["2026-10-31","Ipswich Town","Julio Enciso",81,"Y"],
  ["2026-10-31","Hull City","Semi Ajayi",89,"Y"],
  ["2026-10-31","Ipswich Town","Issa Diop",90,"Y"],
  ["2026-10-31","Brighton","Chema Andrés",20,"Y"],
  ["2026-10-31","Brighton","Maxime De Cuyper",49,"Y"],
  ["2026-10-31","Brighton","Pascal Groß",81,"Y"],
  ["2026-10-25","Leeds United","Ethan Ampadu",29,"Y"],
  ["2026-10-25","Sunderland","Reinildo Mandava",39,"Y"],
  ["2026-10-25","Leeds United","Jayden Bogle",67,"Y"],
  ["2026-10-25","Newcastle United","Nico González",36,"Y"],
  ["2026-10-25","Newcastle United","Fabian Schär",45,"Y"],
  ["2026-10-25","Crystal Palace","Yéremy Pino",75,"Y"],
  ["2026-10-25","Newcastle United","Lewis Hall",78,"Y"],
  ["2026-10-25","Crystal Palace","Anan Khalaili",79,"Y"],
  ["2026-10-25","Crystal Palace","Jaydee Canvot",90,"Y"],
  ["2026-10-25","Brentford","Aaron Hickey",23,"Y"],
  ["2026-10-25","Brighton","Olivier Boscagli",45,"Y"],
  ["2026-10-25","Brighton","Costinha",73,"Y"],
  ["2026-10-25","Manchester United","Andrey Santos",22,"Y"],
  ["2026-10-25","Bournemouth","Tyler Adams",27,"Y"],
  ["2026-10-25","Manchester United","Ayden Heaven",37,"Y"],
  ["2026-10-25","Manchester United","Youri Tielemans",40,"Y"],
  ["2026-10-25","Manchester United","Harry Maguire",45,"Y"],
  ["2026-10-24","Manchester City","Marc Guéhi",32,"Y"],
  ["2026-10-24","Manchester City","Rayan Cherki",38,"Y"],
  ["2026-10-24","Aston Villa","Johan Manzambi",54,"Y"],
  ["2026-10-24","Aston Villa","Matty Cash",55,"Y"],
  ["2026-10-24","Manchester City","Elliot Anderson",74,"Y"],
  ["2026-10-24","Manchester City","Ryan McAidoo",76,"Y"],
  ["2026-10-24","Everton","Vitaliy Mykolenko",1,"Y"],
  ["2026-10-24","Arsenal","Myles Lewis-Skelly",59,"Y"],
  ["2026-10-24","Everton","James Garner",66,"Y"],
  ["2026-10-24","Everton","James Tarkowski",79,"Y"],
  ["2026-10-24","Fulham","Shea Charles",36,"Y"],
  ["2026-10-24","Fulham","Antonee Robinson",82,"Y"],
  ["2026-10-24","Tottenham Hotspur","Conor Gallagher",67,"Y"],
  ["2026-10-24","Chelsea","Cole Palmer",71,"Y"],
  ["2026-10-24","Tottenham Hotspur","Micky van de Ven",71,"Y"],
  ["2026-10-24","Tottenham Hotspur","Mateus Fernandes",72,"Y"],
  ["2026-10-24","Chelsea","Pedro Neto",79,"Y"],
  ["2026-10-24","Chelsea","Cole Palmer",80,"Y2"],
  ["2026-10-24","Chelsea","Morgan Rogers",91,"Y"],
  ["2026-10-23","Ipswich Town","Issa Diop",51,"Y"],
  ["2026-10-23","Nottingham Forest","Murillo",54,"Y"],
  ["2026-10-21","Manchester United","Andrey Santos",25,"Y"],
  ["2026-10-21","Manchester United","Carlos Baleba",50,"Y"],
  ["2026-10-21","Como","Marc-Oliver Kempf",84,"Y"],
  ["2026-10-21","Manchester United","Shea Lacey",86,"Y"],
  ["2026-10-19","Coventry City","Caleb Yirenkyi",20,"Y"],
  ["2026-10-19","Tottenham Hotspur","Dominic Solanke",22,"Y"],
  ["2026-10-19","Coventry City","Jay Dasilva",45,"Y"],
  ["2026-10-19","Coventry City","Jack Rudoni",64,"Y"],
  ["2026-10-17","Brentford","Yehor Yarmoliuk",45,"R"],
  ["2026-10-17","Brentford","Vitaly Janelt",90,"Y2"],
  ["2026-10-17","Brentford","Vitaly Janelt",63,"Y"],
  ["2026-10-17","Brentford","Kevin Schade",60,"Y"],
  ["2026-10-17","Brentford","Igor Thiago",46,"Y"],
  ["2026-10-17","Liverpool","Alexis Mac Allister",53,"Y"],
  ["2026-10-17","Liverpool","Jeremy Jacquet",49,"Y"],
  ["2026-10-17","Liverpool","Bradley Barcola",31,"Y"],
  ["2026-10-17","Fulham","Ryan Sessegnon",90,"R"],
  ["2026-10-17","Fulham","Sander Berge",84,"Y"],
  ["2026-10-17","Fulham","Joshua King",27,"Y"],
  ["2026-10-17","Hull City","Regan Slater",27,"Y"],
  ["2026-10-17","Hull City","Lucas Herrington",22,"Y"],
].map(([date,team,player,minute,type]) => ({ id:`c_${date}_${team}_${player}_${minute}`.replace(/\s+/g,""), date, team, player, minute, type }));
const CARD_SEED_VERSION = 14;

const CARD_TYPES = [["Y","ใบเหลือง","#D8A94A"],["Y2","เหลืองใบที่สอง","#C0453D"],["R","ใบแดงตรง","#8E1418"]];


/* ═══════════ ตารางแข่งฤดูกาล 2026/27 (เวลาไทย) ═══════════ */
const FIXTURES = [
  ["2026-08-22","02:00","Arsenal","Coventry City"],
  ["2026-08-25","02:00","Fulham","Chelsea"],
  ["2026-08-29","02:00","Crystal Palace","Manchester City"],
  ["2026-09-01","02:00","Aston Villa","Arsenal"],
  ["2026-09-05","02:00","Ipswich Town","Liverpool"],
  ["2026-09-13","02:00","Sunderland","Arsenal"],
  ["2026-09-15","02:00","Leeds United","Newcastle United"],
  ["2026-09-19","02:00","Brentford","Chelsea"],

  ["2026-09-20","20:00","Bournemouth","Liverpool"],
  ["2026-09-20","20:00","Leeds United","Crystal Palace"],
  ["2026-09-20","20:00","Manchester City","Sunderland"],
  ["2026-09-20","22:30","Fulham","Manchester United"],

  ["2026-10-10","18:30","Arsenal","Leeds United"],
  ["2026-10-10","21:00","Aston Villa","Brentford"],
  ["2026-10-10","21:00","Chelsea","Bournemouth"],
  ["2026-10-10","21:00","Ipswich Town","Fulham"],
  ["2026-10-10","21:00","Sunderland","Brighton"],
  ["2026-10-10","23:30","Manchester United","Tottenham Hotspur"],
  ["2026-10-11","20:00","Crystal Palace","Nottingham Forest"],
  ["2026-10-11","20:00","Hull City","Everton"],
  ["2026-10-11","22:30","Liverpool","Manchester City"],
  ["2026-10-13","02:00","Coventry City","Newcastle United"],

  ["2026-10-17","18:30","Everton","Chelsea"],
  ["2026-10-17","21:00","Brentford","Liverpool"],
  ["2026-10-17","21:00","Fulham","Hull City"],
  ["2026-10-17","21:00","Manchester City","Ipswich Town"],
  ["2026-10-17","23:30","Newcastle United","Aston Villa"],
  ["2026-10-18","20:00","Bournemouth","Sunderland"],
  ["2026-10-18","20:00","Brighton","Crystal Palace"],
  ["2026-10-18","20:00","Leeds United","Manchester United"],
  ["2026-10-18","22:30","Nottingham Forest","Arsenal"],
  ["2026-10-20","02:00","Tottenham Hotspur","Coventry City"],

  ["2026-10-24","02:00","Ipswich Town","Nottingham Forest"],
  ["2026-10-24","18:30","Aston Villa","Manchester City"],
  ["2026-10-24","21:00","Arsenal","Everton"],
  ["2026-10-24","21:00","Coventry City","Fulham"],
  ["2026-10-24","23:30","Chelsea","Tottenham Hotspur"],
  ["2026-10-25","21:00","Crystal Palace","Newcastle United"],
  ["2026-10-25","21:00","Hull City","Brentford"],
  ["2026-10-25","21:00","Liverpool","Brighton"],
  ["2026-10-25","21:00","Manchester United","Bournemouth"],
  ["2026-10-25","23:30","Sunderland","Leeds United"],

  ["2026-10-31","19:30","Chelsea","Manchester United"],
  ["2026-10-31","22:00","Bournemouth","Leeds United"],
  ["2026-10-31","22:00","Brentford","Nottingham Forest"],
  ["2026-10-31","22:00","Coventry City","Sunderland"],
  ["2026-10-31","22:00","Hull City","Ipswich Town"],
  ["2026-10-31","22:00","Manchester City","Brighton"],
  ["2026-11-01","00:30","Tottenham Hotspur","Crystal Palace"],
  ["2026-11-01","03:00","Aston Villa","Fulham"],
  ["2026-11-01","23:30","Liverpool","Arsenal"],
  ["2026-11-03","03:00","Newcastle United","Everton"],

  ["2026-11-07","22:00","Arsenal","Hull City"],
  ["2026-11-07","22:00","Brighton","Brentford"],
  ["2026-11-07","22:00","Crystal Palace","Liverpool"],
  ["2026-11-07","22:00","Everton","Coventry City"],
  ["2026-11-07","22:00","Fulham","Newcastle United"],
  ["2026-11-07","22:00","Ipswich Town","Bournemouth"],
  ["2026-11-07","22:00","Leeds United","Tottenham Hotspur"],
  ["2026-11-07","22:00","Manchester United","Aston Villa"],
  ["2026-11-07","22:00","Nottingham Forest","Manchester City"],
  ["2026-11-07","22:00","Sunderland","Chelsea"],

  ["2026-11-21","22:00","Bournemouth","Nottingham Forest"],
  ["2026-11-21","22:00","Aston Villa","Sunderland"],
  ["2026-11-21","22:00","Brentford","Everton"],
  ["2026-11-21","22:00","Chelsea","Leeds United"],
  ["2026-11-21","22:00","Coventry City","Crystal Palace"],
  ["2026-11-21","22:00","Hull City","Brighton"],
  ["2026-11-22","23:30","Liverpool","Manchester United"],
  ["2026-11-21","22:00","Manchester City","Fulham"],
  ["2026-11-21","22:00","Newcastle United","Arsenal"],
  ["2026-11-21","22:00","Tottenham Hotspur","Ipswich Town"],

  ["2026-11-28","22:00","Arsenal","Manchester City"],
  ["2026-11-28","22:00","Brighton","Newcastle United"],
  ["2026-11-28","22:00","Crystal Palace","Hull City"],
  ["2026-11-28","22:00","Everton","Liverpool"],
  ["2026-11-28","22:00","Fulham","Bournemouth"],
  ["2026-11-28","22:00","Ipswich Town","Aston Villa"],
  ["2026-11-28","22:00","Leeds United","Coventry City"],
  ["2026-11-28","22:00","Manchester United","Brentford"],
  ["2026-11-28","22:00","Nottingham Forest","Chelsea"],
  ["2026-11-28","22:00","Sunderland","Tottenham Hotspur"],

  ["2026-12-03","03:00","Bournemouth","Brighton"],
  ["2026-12-03","03:00","Aston Villa","Everton"],
  ["2026-12-03","03:00","Brentford","Arsenal"],
  ["2026-12-03","03:00","Chelsea","Crystal Palace"],
  ["2026-12-03","03:00","Coventry City","Ipswich Town"],
  ["2026-12-03","03:00","Hull City","Nottingham Forest"],
  ["2026-12-03","03:00","Liverpool","Sunderland"],
  ["2026-12-03","03:00","Manchester City","Leeds United"],
  ["2026-12-03","03:00","Newcastle United","Manchester United"],
  ["2026-12-03","03:00","Tottenham Hotspur","Fulham"],

  ["2026-12-05","22:00","Bournemouth","Hull City"],
  ["2026-12-05","22:00","Aston Villa","Crystal Palace"],
  ["2026-12-05","22:00","Brentford","Manchester City"],
  ["2026-12-05","22:00","Chelsea","Liverpool"],
  ["2026-12-05","22:00","Everton","Fulham"],
  ["2026-12-05","22:00","Leeds United","Ipswich Town"],
  ["2026-12-05","22:00","Manchester United","Coventry City"],
  ["2026-12-05","22:00","Newcastle United","Sunderland"],
  ["2026-12-05","22:00","Nottingham Forest","Brighton"],
  ["2026-12-05","22:00","Tottenham Hotspur","Arsenal"],

  ["2026-12-12","22:00","Arsenal","Bournemouth"],
  ["2026-12-12","22:00","Brighton","Everton"],
  ["2026-12-12","22:00","Coventry City","Aston Villa"],
  ["2026-12-12","22:00","Crystal Palace","Manchester United"],
  ["2026-12-12","22:00","Fulham","Brentford"],
  ["2026-12-12","22:00","Hull City","Tottenham Hotspur"],
  ["2026-12-12","22:00","Ipswich Town","Newcastle United"],
  ["2026-12-12","22:00","Liverpool","Leeds United"],
  ["2026-12-12","22:00","Manchester City","Chelsea"],
  ["2026-12-12","22:00","Sunderland","Nottingham Forest"],

  ["2026-12-19","22:00","Bournemouth","Coventry City"],
  ["2026-12-19","22:00","Arsenal","Manchester United"],
  ["2026-12-19","22:00","Brentford","Newcastle United"],
  ["2026-12-19","22:00","Brighton","Ipswich Town"],
  ["2026-12-19","22:00","Chelsea","Aston Villa"],
  ["2026-12-19","22:00","Leeds United","Fulham"],
  ["2026-12-19","22:00","Liverpool","Tottenham Hotspur"],
  ["2026-12-19","22:00","Manchester City","Hull City"],
  ["2026-12-19","22:00","Nottingham Forest","Everton"],
  ["2026-12-19","22:00","Sunderland","Crystal Palace"],

  ["2026-12-26","19:30","Aston Villa","Leeds United"],
  ["2026-12-26","22:00","Everton","Sunderland"],
  ["2026-12-26","22:00","Fulham","Brighton"],
  ["2026-12-26","22:00","Ipswich Town","Brentford"],
  ["2026-12-26","22:00","Tottenham Hotspur","Bournemouth"],
  ["2026-12-27","00:30","Hull City","Liverpool"],
  ["2026-12-27","03:00","Newcastle United","Manchester City"],
  ["2026-12-27","21:00","Coventry City","Chelsea"],
  ["2026-12-27","23:30","Manchester United","Nottingham Forest"],
  ["2026-12-28","02:00","Crystal Palace","Arsenal"],

  ["2026-12-30","02:30","Hull City","Leeds United"],
  ["2026-12-30","02:30","Tottenham Hotspur","Brighton"],
  ["2026-12-30","03:15","Everton","Manchester City"],
  ["2026-12-31","02:30","Coventry City","Brentford"],
  ["2026-12-31","02:30","Crystal Palace","Bournemouth"],
  ["2026-12-31","02:30","Fulham","Arsenal"],
  ["2026-12-31","02:30","Manchester United","Sunderland"],
  ["2026-12-31","02:30","Newcastle United","Nottingham Forest"],
  ["2026-12-31","03:15","Aston Villa","Liverpool"],
  ["2026-12-31","03:15","Ipswich Town","Chelsea"],

  ["2027-01-02","03:00","Leeds United","Everton"],
  ["2027-01-02","19:30","Brighton","Manchester United"],

  ["2027-01-02","22:00","Arsenal","Ipswich Town"],
  ["2027-01-02","22:00","Brentford","Crystal Palace"],
  ["2027-01-02","22:00","Liverpool","Coventry City"],
  ["2027-01-02","22:00","Nottingham Forest","Fulham"],
  ["2027-01-02","22:00","Sunderland","Hull City"],
  ["2027-01-03","00:30","Bournemouth","Aston Villa"],
  ["2027-01-03","21:00","Chelsea","Newcastle United"],
  ["2027-01-03","23:30","Manchester City","Tottenham Hotspur"],

  ["2027-01-06","02:30","Arsenal","Brentford"],
  ["2027-01-06","02:30","Brighton","Bournemouth"],
  ["2027-01-06","02:30","Everton","Aston Villa"],
  ["2027-01-06","02:30","Nottingham Forest","Hull City"],
  ["2027-01-06","03:15","Sunderland","Liverpool"],
  ["2027-01-07","02:30","Crystal Palace","Chelsea"],
  ["2027-01-07","02:30","Fulham","Tottenham Hotspur"],
  ["2027-01-07","02:30","Ipswich Town","Coventry City"],
  ["2027-01-07","03:15","Leeds United","Manchester City"],
  ["2027-01-08","03:00","Manchester United","Newcastle United"],

  ["2027-01-16","22:00","Bournemouth","Ipswich Town"],
  ["2027-01-16","22:00","Aston Villa","Manchester United"],
  ["2027-01-16","22:00","Brentford","Brighton"],
  ["2027-01-16","22:00","Chelsea","Sunderland"],
  ["2027-01-16","22:00","Coventry City","Everton"],
  ["2027-01-16","22:00","Hull City","Arsenal"],
  ["2027-01-16","22:00","Liverpool","Crystal Palace"],
  ["2027-01-16","22:00","Manchester City","Nottingham Forest"],
  ["2027-01-16","22:00","Newcastle United","Fulham"],
  ["2027-01-16","22:00","Tottenham Hotspur","Leeds United"],

  ["2027-01-23","22:00","Arsenal","Newcastle United"],
  ["2027-01-23","22:00","Brighton","Manchester City"],
  ["2027-01-23","22:00","Crystal Palace","Tottenham Hotspur"],
  ["2027-01-23","22:00","Everton","Brentford"],
  ["2027-01-23","22:00","Fulham","Aston Villa"],
  ["2027-01-23","22:00","Ipswich Town","Hull City"],
  ["2027-01-23","22:00","Leeds United","Chelsea"],
  ["2027-01-23","22:00","Manchester United","Liverpool"],
  ["2027-01-23","22:00","Nottingham Forest","Bournemouth"],
  ["2027-01-23","22:00","Sunderland","Coventry City"],

  ["2027-01-30","22:00","Bournemouth","Fulham"],
  ["2027-01-30","22:00","Aston Villa","Ipswich Town"],
  ["2027-01-30","22:00","Brentford","Manchester United"],
  ["2027-01-30","22:00","Chelsea","Nottingham Forest"],
  ["2027-01-30","22:00","Coventry City","Leeds United"],
  ["2027-01-30","22:00","Hull City","Crystal Palace"],
  ["2027-01-30","22:00","Liverpool","Everton"],
  ["2027-01-30","22:00","Manchester City","Arsenal"],
  ["2027-01-30","22:00","Newcastle United","Brighton"],
  ["2027-01-30","22:00","Tottenham Hotspur","Sunderland"],

  ["2027-02-06","22:00","Arsenal","Liverpool"],
  ["2027-02-06","22:00","Brighton","Hull City"],
  ["2027-02-06","22:00","Crystal Palace","Coventry City"],
  ["2027-02-06","22:00","Everton","Newcastle United"],
  ["2027-02-06","22:00","Fulham","Manchester City"],
  ["2027-02-06","22:00","Ipswich Town","Tottenham Hotspur"],
  ["2027-02-06","22:00","Leeds United","Bournemouth"],
  ["2027-02-06","22:00","Manchester United","Chelsea"],
  ["2027-02-06","22:00","Nottingham Forest","Brentford"],
  ["2027-02-06","22:00","Sunderland","Aston Villa"],

  ["2027-02-11","03:00","Aston Villa","Bournemouth"],
  ["2027-02-11","03:00","Coventry City","Liverpool"],
  ["2027-02-11","03:00","Crystal Palace","Brentford"],
  ["2027-02-11","03:00","Everton","Leeds United"],
  ["2027-02-11","03:00","Fulham","Nottingham Forest"],
  ["2027-02-11","03:00","Hull City","Sunderland"],
  ["2027-02-11","03:00","Ipswich Town","Arsenal"],
  ["2027-02-11","03:00","Manchester United","Brighton"],
  ["2027-02-11","03:00","Newcastle United","Chelsea"],
  ["2027-02-11","03:00","Tottenham Hotspur","Manchester City"],

  ["2027-02-20","22:00","Bournemouth","Crystal Palace"],
  ["2027-02-20","22:00","Arsenal","Fulham"],
  ["2027-02-20","22:00","Brentford","Coventry City"],
  ["2027-02-20","22:00","Brighton","Tottenham Hotspur"],
  ["2027-02-20","22:00","Chelsea","Ipswich Town"],
  ["2027-02-20","22:00","Leeds United","Aston Villa"],
  ["2027-02-20","22:00","Liverpool","Hull City"],
  ["2027-02-20","22:00","Manchester City","Newcastle United"],
  ["2027-02-20","22:00","Nottingham Forest","Manchester United"],
  ["2027-02-20","22:00","Sunderland","Everton"],

  ["2027-02-27","22:00","Aston Villa","Chelsea"],
  ["2027-02-27","22:00","Coventry City","Bournemouth"],
  ["2027-02-27","22:00","Crystal Palace","Sunderland"],
  ["2027-02-27","22:00","Everton","Nottingham Forest"],
  ["2027-02-27","22:00","Fulham","Leeds United"],
  ["2027-02-27","22:00","Hull City","Manchester City"],
  ["2027-02-27","22:00","Ipswich Town","Brighton"],
  ["2027-02-27","22:00","Manchester United","Arsenal"],
  ["2027-02-27","22:00","Newcastle United","Brentford"],
  ["2027-02-27","22:00","Tottenham Hotspur","Liverpool"],

  ["2027-03-04","03:00","Bournemouth","Tottenham Hotspur"],
  ["2027-03-04","03:00","Arsenal","Crystal Palace"],
  ["2027-03-04","03:00","Brentford","Ipswich Town"],
  ["2027-03-04","03:00","Brighton","Fulham"],
  ["2027-03-04","03:00","Chelsea","Coventry City"],
  ["2027-03-04","03:00","Leeds United","Hull City"],
  ["2027-03-04","03:00","Liverpool","Aston Villa"],
  ["2027-03-04","03:00","Manchester City","Everton"],
  ["2027-03-04","03:00","Nottingham Forest","Newcastle United"],
  ["2027-03-04","03:00","Sunderland","Manchester United"],

  ["2027-03-13","22:00","Bournemouth","Newcastle United"],
  ["2027-03-13","22:00","Aston Villa","Hull City"],
  ["2027-03-13","22:00","Chelsea","Arsenal"],
  ["2027-03-13","22:00","Coventry City","Manchester City"],
  ["2027-03-13","22:00","Crystal Palace","Fulham"],
  ["2027-03-13","22:00","Leeds United","Brighton"],
  ["2027-03-13","22:00","Liverpool","Ipswich Town"],
  ["2027-03-13","22:00","Manchester United","Everton"],
  ["2027-03-13","22:00","Sunderland","Brentford"],
  ["2027-03-13","22:00","Tottenham Hotspur","Nottingham Forest"],

  ["2027-03-20","22:00","Arsenal","Sunderland"],
  ["2027-03-20","22:00","Brentford","Bournemouth"],
  ["2027-03-20","22:00","Brighton","Coventry City"],
  ["2027-03-20","22:00","Everton","Tottenham Hotspur"],
  ["2027-03-20","22:00","Fulham","Liverpool"],
  ["2027-03-20","22:00","Hull City","Chelsea"],
  ["2027-03-20","22:00","Ipswich Town","Crystal Palace"],
  ["2027-03-20","22:00","Manchester City","Manchester United"],
  ["2027-03-20","22:00","Newcastle United","Leeds United"],
  ["2027-03-20","22:00","Nottingham Forest","Aston Villa"],

  ["2027-04-10","21:00","Bournemouth","Manchester City"],
  ["2027-04-10","21:00","Aston Villa","Brighton"],
  ["2027-04-10","21:00","Chelsea","Fulham"],
  ["2027-04-10","21:00","Coventry City","Arsenal"],
  ["2027-04-10","21:00","Crystal Palace","Everton"],
  ["2027-04-10","21:00","Leeds United","Nottingham Forest"],
  ["2027-04-10","21:00","Liverpool","Newcastle United"],
  ["2027-04-10","21:00","Manchester United","Hull City"],
  ["2027-04-10","21:00","Sunderland","Ipswich Town"],
  ["2027-04-10","21:00","Tottenham Hotspur","Brentford"],

  ["2027-04-17","21:00","Arsenal","Aston Villa"],
  ["2027-04-17","21:00","Brentford","Leeds United"],
  ["2027-04-17","21:00","Brighton","Chelsea"],
  ["2027-04-17","21:00","Everton","Bournemouth"],
  ["2027-04-17","21:00","Fulham","Sunderland"],
  ["2027-04-17","21:00","Hull City","Coventry City"],
  ["2027-04-17","21:00","Ipswich Town","Manchester United"],
  ["2027-04-17","21:00","Manchester City","Crystal Palace"],
  ["2027-04-17","21:00","Newcastle United","Tottenham Hotspur"],
  ["2027-04-17","21:00","Nottingham Forest","Liverpool"],

  ["2027-04-24","21:00","Bournemouth","Arsenal"],
  ["2027-04-24","21:00","Aston Villa","Coventry City"],
  ["2027-04-24","21:00","Brentford","Fulham"],
  ["2027-04-24","21:00","Chelsea","Manchester City"],
  ["2027-04-24","21:00","Everton","Brighton"],
  ["2027-04-24","21:00","Leeds United","Liverpool"],
  ["2027-04-24","21:00","Manchester United","Crystal Palace"],
  ["2027-04-24","21:00","Newcastle United","Ipswich Town"],
  ["2027-04-24","21:00","Nottingham Forest","Sunderland"],
  ["2027-04-24","21:00","Tottenham Hotspur","Hull City"],

  ["2027-05-01","21:00","Arsenal","Tottenham Hotspur"],
  ["2027-05-01","21:00","Brighton","Nottingham Forest"],
  ["2027-05-01","21:00","Coventry City","Manchester United"],
  ["2027-05-01","21:00","Crystal Palace","Aston Villa"],
  ["2027-05-01","21:00","Fulham","Everton"],
  ["2027-05-01","21:00","Hull City","Bournemouth"],
  ["2027-05-01","21:00","Ipswich Town","Leeds United"],
  ["2027-05-01","21:00","Liverpool","Chelsea"],
  ["2027-05-01","21:00","Manchester City","Brentford"],
  ["2027-05-01","21:00","Sunderland","Newcastle United"],

  ["2027-05-08","21:00","Bournemouth","Manchester United"],
  ["2027-05-08","21:00","Brentford","Aston Villa"],
  ["2027-05-08","21:00","Brighton","Sunderland"],
  ["2027-05-08","21:00","Everton","Hull City"],
  ["2027-05-08","21:00","Fulham","Ipswich Town"],
  ["2027-05-08","21:00","Leeds United","Arsenal"],
  ["2027-05-08","21:00","Manchester City","Liverpool"],
  ["2027-05-08","21:00","Newcastle United","Coventry City"],
  ["2027-05-08","21:00","Nottingham Forest","Crystal Palace"],
  ["2027-05-08","21:00","Tottenham Hotspur","Chelsea"],

  ["2027-05-15","21:00","Arsenal","Nottingham Forest"],
  ["2027-05-15","21:00","Aston Villa","Newcastle United"],
  ["2027-05-15","21:00","Chelsea","Everton"],
  ["2027-05-15","21:00","Coventry City","Tottenham Hotspur"],
  ["2027-05-15","21:00","Crystal Palace","Brighton"],
  ["2027-05-15","21:00","Hull City","Fulham"],
  ["2027-05-15","21:00","Ipswich Town","Manchester City"],
  ["2027-05-15","21:00","Liverpool","Brentford"],
  ["2027-05-15","21:00","Manchester United","Leeds United"],
  ["2027-05-15","21:00","Sunderland","Bournemouth"],

  ["2027-05-23","21:00","Bournemouth","Chelsea"],
  ["2027-05-23","21:00","Brentford","Hull City"],
  ["2027-05-23","21:00","Brighton","Liverpool"],
  ["2027-05-23","21:00","Everton","Arsenal"],
  ["2027-05-23","21:00","Fulham","Coventry City"],
  ["2027-05-23","21:00","Leeds United","Sunderland"],
  ["2027-05-23","21:00","Manchester City","Aston Villa"],
  ["2027-05-23","21:00","Newcastle United","Crystal Palace"],
  ["2027-05-23","21:00","Nottingham Forest","Ipswich Town"],
  ["2027-05-23","21:00","Tottenham Hotspur","Manchester United"],

  ["2027-05-30","22:00","Arsenal","Brighton"],
  ["2027-05-30","22:00","Aston Villa","Tottenham Hotspur"],
  ["2027-05-30","22:00","Chelsea","Brentford"],
  ["2027-05-30","22:00","Coventry City","Nottingham Forest"],
  ["2027-05-30","22:00","Crystal Palace","Leeds United"],
  ["2027-05-30","22:00","Hull City","Newcastle United"],
  ["2027-05-30","22:00","Ipswich Town","Everton"],
  ["2027-05-30","22:00","Liverpool","Bournemouth"],
  ["2027-05-30","22:00","Manchester United","Fulham"],
  ["2027-05-30","22:00","Sunderland","Manchester City"],
].map(([date,time,home,away]) => ({ date, time, home, away, id:`${date}_${home}`.replace(/\s+/g,"") }));

/* ═══════════ ผลการแข่งฤดูกาล 2026/27 ที่ผ่านมา ═══════════ */

const SEED_RESULTS = [
  ["2026-11-08","Sunderland",1,0,"Chelsea"],
  ["2026-11-08","Manchester United",4,4,"Aston Villa"],
  ["2026-11-08","Ipswich Town",1,2,"Bournemouth"],
  ["2026-11-08","Crystal Palace",1,3,"Liverpool"],
  ["2026-11-08","Brighton",2,0,"Brentford"],
  ["2026-11-07","Nottingham Forest",3,1,"Manchester City"],
  ["2026-11-07","Leeds United",1,0,"Tottenham Hotspur"],
  ["2026-11-07","Fulham",1,1,"Newcastle United"],
  ["2026-11-07","Arsenal",1,0,"Hull City"],
  ["2026-11-06","Everton",3,1,"Coventry City"],
  ["2026-11-03","Manchester United",3,2,"AS Roma"],
  ["2026-11-02","Newcastle United",0,1,"Everton"],
  ["2026-11-01","Liverpool",0,1,"Arsenal"],
  ["2026-10-31","Tottenham Hotspur",2,0,"Crystal Palace"],
  ["2026-10-31","Aston Villa",1,1,"Fulham"],
  ["2026-10-31","Chelsea",2,0,"Manchester United"],
  ["2026-10-31","Bournemouth",2,0,"Leeds United"],
  ["2026-10-31","Brentford",2,0,"Nottingham Forest"],
  ["2026-10-31","Coventry City",3,1,"Sunderland"],
  ["2026-10-31","Hull City",2,2,"Ipswich Town"],
  ["2026-10-31","Manchester City",0,1,"Brighton"],
  ["2026-10-25","Sunderland",0,0,"Leeds United"],
  ["2026-10-25","Crystal Palace",0,2,"Newcastle United"],
  ["2026-10-25","Hull City",1,1,"Brentford"],
  ["2026-10-25","Liverpool",2,0,"Brighton"],
  ["2026-10-25","Manchester United",0,3,"Bournemouth"],
  ["2026-10-24","Aston Villa",2,1,"Manchester City"],
  ["2026-10-24","Arsenal",2,0,"Everton"],
  ["2026-10-24","Coventry City",0,1,"Fulham"],
  ["2026-10-24","Chelsea",0,2,"Tottenham Hotspur"],
  ["2026-10-23","Ipswich Town",1,1,"Nottingham Forest"],
  /* UCL — คนละรายการกับพรีเมียร์ลีก ใส่ไว้เพื่อให้ Elo รู้จักโคโม่ */
  ["2026-10-21","Como",4,1,"Manchester United"],
  ["2026-10-19","Tottenham Hotspur",3,1,"Coventry City"],
  ["2026-10-18","Nottingham Forest",0,1,"Arsenal"],
  ["2026-10-18","Bournemouth",2,0,"Sunderland"],
  ["2026-10-18","Brighton",5,0,"Crystal Palace"],
  ["2026-10-18","Leeds United",1,1,"Manchester United"],
  ["2026-08-21","Arsenal",3,0,"Coventry City"],
  ["2026-08-22","Hull City",2,0,"Manchester United"],
  ["2026-08-22","Everton",2,0,"Crystal Palace"],
  ["2026-08-22","Ipswich Town",2,1,"Sunderland"],
  ["2026-08-22","Nottingham Forest",0,1,"Leeds United"],
  ["2026-08-22","Brentford",3,0,"Tottenham Hotspur"],
  ["2026-08-23","Brighton",4,0,"Aston Villa"],
  ["2026-08-23","Manchester City",2,1,"Bournemouth"],
  ["2026-08-23","Newcastle United",2,2,"Liverpool"],
  ["2026-08-24","Fulham",2,3,"Chelsea"],

  ["2026-08-28","Crystal Palace",1,4,"Manchester City"],
  ["2026-08-29","Liverpool",2,2,"Nottingham Forest"],
  ["2026-08-29","Bournemouth",1,1,"Everton"],
  ["2026-08-29","Coventry City",0,1,"Hull City"],
  ["2026-08-29","Tottenham Hotspur",0,2,"Newcastle United"],
  ["2026-08-30","Chelsea",4,3,"Brighton"],
  ["2026-08-30","Leeds United",1,1,"Brentford"],
  ["2026-08-30","Sunderland",1,0,"Fulham"],
  ["2026-08-30","Manchester United",5,2,"Ipswich Town"],
  ["2026-08-31","Aston Villa",0,1,"Arsenal"],

  ["2026-09-04","Ipswich Town",0,2,"Liverpool"],
  ["2026-09-05","Newcastle United",2,2,"Bournemouth"],
  ["2026-09-05","Brentford",1,1,"Sunderland"],
  ["2026-09-05","Brighton",1,1,"Leeds United"],
  ["2026-09-05","Fulham",2,3,"Crystal Palace"],
  ["2026-09-05","Manchester City",1,0,"Coventry City"],
  ["2026-09-05","Nottingham Forest",0,0,"Tottenham Hotspur"],
  ["2026-09-05","Hull City",0,0,"Aston Villa"],
  ["2026-09-06","Everton",2,2,"Manchester United"],
  ["2026-09-06","Arsenal",2,1,"Chelsea"],

  ["2026-09-12","Bournemouth",2,2,"Brentford"],
  ["2026-09-12","Aston Villa",1,2,"Nottingham Forest"],
  ["2026-09-12","Chelsea",2,2,"Hull City"],
  ["2026-09-12","Crystal Palace",2,3,"Ipswich Town"],
  ["2026-09-12","Liverpool",0,0,"Fulham"],
  ["2026-09-12","Tottenham Hotspur",0,0,"Everton"],
  ["2026-09-12","Sunderland",0,2,"Arsenal"],
  ["2026-09-13","Coventry City",0,5,"Brighton"],
  ["2026-09-13","Manchester United",0,1,"Manchester City"],
  ["2026-09-14","Leeds United",4,1,"Newcastle United"],

  ["2026-09-18","Brentford",3,0,"Chelsea"],
  ["2026-09-19","Tottenham Hotspur",2,3,"Aston Villa"],
  ["2026-09-19","Brighton",3,0,"Arsenal"],
  ["2026-09-19","Everton",1,0,"Ipswich Town"],
  ["2026-09-19","Newcastle United",2,1,"Hull City"],
  ["2026-09-19","Nottingham Forest",0,1,"Coventry City"],

  ["2026-09-20","Bournemouth",0,1,"Liverpool"],
  ["2026-09-20","Leeds United",0,0,"Crystal Palace"],
  ["2026-09-20","Manchester City",5,3,"Sunderland"],
  ["2026-09-20","Fulham",1,1,"Manchester United"],

  ["2026-10-10","Arsenal",2,1,"Leeds United"],
  ["2026-10-10","Aston Villa",2,2,"Brentford"],
  ["2026-10-10","Chelsea",5,1,"Bournemouth"],
  ["2026-10-10","Ipswich Town",2,1,"Fulham"],
  ["2026-10-10","Sunderland",0,2,"Brighton"],
  ["2026-10-10","Manchester United",1,1,"Tottenham Hotspur"],

  ["2026-10-11","Crystal Palace",3,1,"Nottingham Forest"],
  ["2026-10-11","Hull City",2,2,"Everton"],
  ["2026-10-11","Liverpool",0,3,"Manchester City"],

  ["2026-10-12","Coventry City",4,1,"Newcastle United"],

  ["2026-10-17","Everton",0,2,"Chelsea"],
  ["2026-10-17","Brentford",1,2,"Liverpool"],
  ["2026-10-17","Fulham",1,0,"Hull City"],
  ["2026-10-17","Manchester City",3,2,"Ipswich Town"],
  ["2026-10-17","Newcastle United",0,1,"Aston Villa"],
].map(([date,home,hg,ag,away]) => ({ id:`s_${date}_${home}`.replace(/\s+/g,""), date, home, away, hg, ag }));
const SEED_VERSION = 21;

/* ═══════════ ตัวจริงที่ประกาศแล้ว ═══════════ */
/* ตัวจริง 11 คนที่ประกาศจริงของแต่ละนัด — key = "วันที่|ชื่อทีม"
   ชั้นที่แม่นที่สุดของประวัติตัวจริง เก็บทุกครั้งที่อัพเดทตัวจริงก่อนเตะ */
const SEED_XI = {
  "2026-11-08|Liverpool": { start:["Alisson", "Milos Kerkez", "Virgil van Dijk", "Jeremy Jacquet", "Ronald Araújo", "Alexis Mac Allister", "Dominik Szoboszlai", "Bradley Barcola", "Florian Wirtz", "Cody Gakpo", "Alexander Isak"] },
  "2026-11-08|Manchester United": { kit:"home", start:["Senne Lammens", "Leny Yoro", "Harry Maguire", "Noussair Mazraoui", "Diogo Dalot", "Kobbie Mainoo", "Youri Tielemans", "Bruno Fernandes", "Amad Diallo", "Matheus Cunha", "Bryan Mbeumo"] },
  "2026-11-03|Manchester United": { kit:"home", start:["Senne Lammens", "Leny Yoro", "Harry Maguire", "Ayden Heaven", "Diogo Dalot", "Carlos Baleba", "Kobbie Mainoo", "Amad Diallo", "Bruno Fernandes", "Matheus Cunha", "Bryan Mbeumo"] },
  "2026-11-03|AS Roma": { kit:"away", start:["Devis Vásquez", "Gianluca Mancini", "Leonardo Balerdi", "Mario Hermoso", "Devyne Rensch", "Bryan Cristante", "Marten de Roon", "Wesley", "Rodrigo Mora", "Matías Soulé", "Donyell Malen"] },
  "2026-11-02|Newcastle United": { kit:"home", start:["Lukas Hornicek", "Amar Dedić", "Fabian Schär", "Dan Burn", "Lewis Hall", "Nico González", "Joelinton", "Anthony Elanga", "Joe Willock", "Harvey Barnes", "William Osula"] },
  "2026-11-02|Everton": { kit:"away", start:["Jordan Pickford", "Jake O'Brien", "James Tarkowski", "Jarrad Branthwaite", "Vitaliy Mykolenko", "James Garner", "Harrison Armstrong", "Merlin Rohl", "Kiernan Dewsbury-Hall", "Tyrique George", "Thierno Barry"] },
  "2026-11-01|Liverpool": { kit:"home", start:["Alisson", "Ronald Araújo", "Jeremy Jacquet", "Virgil van Dijk", "Milos Kerkez", "Treymaurice Nyoni", "Alexis Mac Allister", "Bradley Barcola", "Florian Wirtz", "Cody Gakpo", "Alexander Isak"] },
  "2026-11-01|Arsenal": { kit:"away", start:["David Raya", "Jurriën Timber", "Ezri Konsa", "Gabriel Magalhães", "Riccardo Calafiori", "Declan Rice", "Bruno Guimarães", "Noni Madueke", "Martin Ødegaard", "Christos Tzolis", "Kai Havertz"] },
  "2026-10-31|Aston Villa": { kit:"home", start:["Zion Suzuki", "Matty Cash", "Victor Lindelöf", "Pau Torres", "Ian Maatsen", "Boubacar Kamara", "Leon Goretzka", "Alysson Edward", "John McGinn", "Johan Manzambi", "Nicolas Jackson"] },
  "2026-10-31|Fulham": { kit:"away", start:["Bernd Leno", "Timothy Castagne", "David Affengruber", "Calvin Bassey", "Antonee Robinson", "Sander Berge", "Shea Charles", "Oscar Bobb", "Joshua King", "Alex Iwobi", "Gonzalo García"] },
  "2026-10-31|Tottenham Hotspur": { kit:"home", start:["Antonin Kinsky", "Archie Gray", "Jan Paul van Hecke", "Micky van de Ven", "Andy Robertson", "Sandro Tonali", "Mateus Fernandes", "Mohammed Kudus", "Omar Marmoush", "Mathys Tel", "Dominic Solanke"] },
  "2026-10-31|Crystal Palace": { kit:"away", start:["Dean Henderson", "Chris Richards", "Axel Disasi", "Jaydee Canvot", "Óscar Mingueza", "Adam Wharton", "Daichi Kamada", "Tyrick Mitchell", "Dwight McNeil", "Yéremy Pino", "Jean-Philippe Mateta"] },
  "2026-10-31|Bournemouth": { kit:"home", start:["Đorđe Petrović", "Adam Smith", "James Hill", "António Silva", "Adrien Truffert", "Ryan Christie", "Tyler Adams", "Rayan", "Justin Kluivert", "Marcus Tavernier", "Evanilson"] },
  "2026-10-31|Leeds United": { kit:"home", start:["James Trafford", "James Justin", "Nico Elvedi", "Tarik Muharemović", "Jayden Bogle", "Ethan Ampadu", "Ao Tanaka", "Gabriel Gudmundsson", "Daniel James", "Harry Wilson", "Dominic Calvert-Lewin"] },
  "2026-10-31|Brentford": { kit:"home", start:["Caoimhin Kelleher", "Michael Kayode", "Kristoffer Ajer", "Sepp van den Berg", "Keane Lewis-Potter", "Mamadou Sangare", "Vitaly Janelt", "Dango Ouattara", "Mathias Jensen", "Kevin Schade", "Igor Thiago"] },
  "2026-10-31|Nottingham Forest": { kit:"away", start:["Matz Sels", "Jair Cunha", "Nikola Milenković", "Murillo", "Ola Aina", "James McAtee", "Xaver Schlager", "Neco Williams", "Morgan Gibbs-White", "Dan Ndoye", "Liam Delap"] },
  "2026-10-31|Coventry City": { kit:"home", start:["Carl Rushworth", "Milan van Ewijk", "Stephen Mfuni", "Ethan Pinnock", "Jay Dasilva", "Caleb Yirenkyi", "Victor Torp", "Tatsuhiro Sakamoto", "Jack Rudoni", "Yann Gboho", "Taiwo Awoniyi"] },
  "2026-10-31|Sunderland": { kit:"home", start:["Robin Roefs", "Trai Hume", "Luke O'Nien", "Omar Alderete", "Reinildo Mandava", "Granit Xhaka", "Noah Sadiki", "Nilson Angulo", "Chris Rigg", "Enzo Le Fée", "Brian Brobbey"] },
  "2026-10-31|Hull City": { kit:"home", start:["Konstantinos Tzolakis", "Lewie Coyle", "Semi Ajayi", "John Egan", "Nobel Mendy", "Ryan Giles", "Mohamed Belloumi", "Tim Iroegbunam", "Regan Slater", "Elliot Stroud", "Oli McBurnie"] },
  "2026-10-31|Ipswich Town": { kit:"home", start:["Christian Walton", "Abdoul Ouattara", "Issa Diop", "Dara O'Shea", "Leif Davis", "Exequiel Palacios", "Florentino Luis", "Abdul Fatawu", "Julio Enciso", "Jaden Philogene", "Emersonn Da Silva"] },
  "2026-10-31|Manchester City": { kit:"home", start:["Gianluigi Donnarumma", "Matheus Nunes", "Abdukodir Khusanov", "Rúben Dias", "Joško Gvardiol", "Elliot Anderson", "Ayyoub Bouaddi", "Iliman Ndiaye", "Enzo Fernández", "Jérémy Doku", "Erling Haaland"] },
  "2026-10-31|Brighton": { kit:"away", start:["Bart Verbruggen", "Costinha", "Luka Vuskovic", "Lewis Dunk", "Olivier Boscagli", "Pascal Groß", "Chema Andrés", "Diego Gómez", "Yasin Ayari", "Maxime De Cuyper", "Charalampos Kostoulas"] },
  "2026-10-31|Chelsea": { kit:"home", start:["Mike Penders", "Joshua Acheampong", "Levi Colwill", "Wesley Fofana", "Pedro Neto", "Moisés Caicedo", "Roméo Lavia", "Marco Palestra", "Cole Palmer", "Estêvão", "Morgan Rogers"] },
  "2026-10-31|Manchester United": { kit:"home", start:["Senne Lammens", "Leny Yoro", "Lisandro Martínez", "Harry Maguire", "Diogo Dalot", "Andrey Santos", "Carlos Baleba", "Amad Diallo", "Bruno Fernandes", "Matheus Cunha", "Bryan Mbeumo"] },
  "2026-10-25|Crystal Palace": { kit:"home", start:["Walter Benítez", "Chris Richards", "Axel Disasi", "Jaydee Canvot", "Anan Khalaili", "Adam Wharton", "Daichi Kamada", "Tyrick Mitchell", "Dwight McNeil", "Yéremy Pino", "Jean-Philippe Mateta"] },
  "2026-10-25|Newcastle United": { kit:"away", start:["Lukas Hornicek", "Amar Dedić", "Dan Burn", "Fabian Schär", "Lewis Hall", "Nico González", "Joelinton", "Jacob Murphy", "Joe Willock", "Harvey Barnes", "William Osula"] },
  "2026-10-25|Hull City": { kit:"home", start:["Konstantinos Tzolakis", "Lewie Coyle", "Semi Ajayi", "John Egan", "Lucas Herrington", "Ryan Giles", "Mohamed Belloumi", "Tim Iroegbunam", "Regan Slater", "Elliot Stroud", "Oli McBurnie"] },
  "2026-10-25|Brentford": { kit:"away", start:["Caoimhin Kelleher", "Michael Kayode", "Sepp van den Berg", "Kristoffer Ajer", "Aaron Hickey", "Mathias Jensen", "Mamadou Sangare", "Dango Ouattara", "Kevin Schade", "Keane Lewis-Potter", "Igor Thiago"] },
  "2026-10-25|Liverpool": { kit:"home", start:["Alisson", "Ronald Araújo", "Jeremy Jacquet", "Virgil van Dijk", "Milos Kerkez", "Ryan Gravenberch", "Alexis Mac Allister", "Bradley Barcola", "Florian Wirtz", "Cody Gakpo", "Alexander Isak"] },
  "2026-10-25|Brighton": { kit:"home", start:["Bart Verbruggen", "Ferdi Kadıoğlu", "Luka Vuskovic", "Lewis Dunk", "Olivier Boscagli", "Pascal Groß", "Chema Andrés", "Diego Gómez", "Yasin Ayari", "Maxime De Cuyper", "Charalampos Kostoulas"] },
  "2026-10-25|Manchester United": { kit:"home", start:["Senne Lammens", "Diogo Dalot", "Leny Yoro", "Harry Maguire", "Ayden Heaven", "Andrey Santos", "Carlos Baleba", "Amad Diallo", "Youri Tielemans", "Mason Mount", "Bryan Mbeumo"] },
  "2026-10-25|Bournemouth": { kit:"away", start:["Đorđe Petrović", "Adam Smith", "James Hill", "António Silva", "Adrien Truffert", "Lewis Cook", "Tyler Adams", "Rayan", "Justin Kluivert", "Marcus Tavernier", "Evanilson"] },
  "2026-10-25|Sunderland": { kit:"home", start:["Robin Roefs", "Trai Hume", "Nordi Mukiele", "Luke O'Nien", "Reinildo Mandava", "Granit Xhaka", "Noah Sadiki", "Chris Rigg", "Enzo Le Fée", "Nilson Angulo", "Brian Brobbey"] },
  "2026-10-25|Leeds United": { kit:"away", start:["James Trafford", "James Justin", "Jaka Bijol", "Tarik Muharemović", "Jayden Bogle", "Ethan Ampadu", "Ao Tanaka", "Gabriel Gudmundsson", "Harry Wilson", "Brenden Aaronson", "Dominic Calvert-Lewin"] },
};

const SEED_LINEUPS = {
  "Liverpool": { confirmed:false, forDate:"2026-11-22", kit:"home", start:["Alisson", "Milos Kerkez", "Virgil van Dijk", "Jeremy Jacquet", "Ronald Araújo", "Alexis Mac Allister", "Dominik Szoboszlai", "Bradley Barcola", "Florian Wirtz", "Cody Gakpo", "Alexander Isak"] },
  "Manchester United": { confirmed:false, forDate:"2026-11-22", kit:"third", start:["Senne Lammens", "Leny Yoro", "Harry Maguire", "Noussair Mazraoui", "Diogo Dalot", "Kobbie Mainoo", "Youri Tielemans", "Bruno Fernandes", "Amad Diallo", "Matheus Cunha", "Bryan Mbeumo"] },
  "AS Roma": { confirmed:true, forDate:"2026-11-03", kit:"away", start:["Devis Vásquez", "Gianluca Mancini", "Leonardo Balerdi", "Mario Hermoso", "Devyne Rensch", "Bryan Cristante", "Marten de Roon", "Wesley", "Rodrigo Mora", "Matías Soulé", "Donyell Malen"] },
  "Aston Villa": { confirmed:true, forDate:"2026-10-31", kit:"home", start:["Zion Suzuki", "Matty Cash", "Victor Lindelöf", "Pau Torres", "Ian Maatsen", "Boubacar Kamara", "Leon Goretzka", "Alysson Edward", "John McGinn", "Johan Manzambi", "Nicolas Jackson"] },
  "Manchester City": { confirmed:true, forDate:"2026-10-31", kit:"home", start:["Gianluigi Donnarumma", "Matheus Nunes", "Abdukodir Khusanov", "Rúben Dias", "Joško Gvardiol", "Elliot Anderson", "Ayyoub Bouaddi", "Iliman Ndiaye", "Enzo Fernández", "Jérémy Doku", "Erling Haaland"] },
  "Nottingham Forest": { confirmed:true, forDate:"2026-10-31", kit:"away", start:["Matz Sels", "Jair Cunha", "Nikola Milenković", "Murillo", "Ola Aina", "James McAtee", "Xaver Schlager", "Neco Williams", "Morgan Gibbs-White", "Dan Ndoye", "Liam Delap"] },
  "Arsenal": { confirmed:true, forDate:"2026-11-01", kit:"away", start:["David Raya", "Jurriën Timber", "Ezri Konsa", "Gabriel Magalhães", "Riccardo Calafiori", "Declan Rice", "Bruno Guimarães", "Noni Madueke", "Martin Ødegaard", "Christos Tzolis", "Kai Havertz"] },
  "Sunderland": { confirmed:true, forDate:"2026-10-31", kit:"home", start:["Robin Roefs", "Trai Hume", "Luke O'Nien", "Omar Alderete", "Reinildo Mandava", "Granit Xhaka", "Noah Sadiki", "Nilson Angulo", "Chris Rigg", "Enzo Le Fée", "Brian Brobbey"] },
  "Bournemouth": { confirmed:true, forDate:"2026-10-31", kit:"home", start:["Đorđe Petrović", "Adam Smith", "James Hill", "António Silva", "Adrien Truffert", "Ryan Christie", "Tyler Adams", "Rayan", "Justin Kluivert", "Marcus Tavernier", "Evanilson"] },
  "Brighton": { confirmed:true, forDate:"2026-10-31", kit:"away", start:["Bart Verbruggen", "Costinha", "Luka Vuskovic", "Lewis Dunk", "Olivier Boscagli", "Pascal Groß", "Chema Andrés", "Diego Gómez", "Yasin Ayari", "Maxime De Cuyper", "Charalampos Kostoulas"] },
  "Crystal Palace": { confirmed:true, forDate:"2026-10-31", kit:"away", start:["Dean Henderson", "Chris Richards", "Axel Disasi", "Jaydee Canvot", "Óscar Mingueza", "Adam Wharton", "Daichi Kamada", "Tyrick Mitchell", "Dwight McNeil", "Yéremy Pino", "Jean-Philippe Mateta"] },
  "Leeds United": { confirmed:true, forDate:"2026-10-31", kit:"home", start:["James Trafford", "James Justin", "Nico Elvedi", "Tarik Muharemović", "Jayden Bogle", "Ethan Ampadu", "Ao Tanaka", "Gabriel Gudmundsson", "Daniel James", "Harry Wilson", "Dominic Calvert-Lewin"] },

  "Fulham": { confirmed:true, forDate:"2026-10-31", kit:"away", start:["Bernd Leno", "Timothy Castagne", "David Affengruber", "Calvin Bassey", "Antonee Robinson", "Sander Berge", "Shea Charles", "Oscar Bobb", "Joshua King", "Alex Iwobi", "Gonzalo García"] },
  "Hull City": { confirmed:true, forDate:"2026-10-31", kit:"home", start:["Konstantinos Tzolakis", "Lewie Coyle", "Semi Ajayi", "John Egan", "Nobel Mendy", "Ryan Giles", "Mohamed Belloumi", "Tim Iroegbunam", "Regan Slater", "Elliot Stroud", "Oli McBurnie"] },
  "Everton": { confirmed:true, forDate:"2026-11-02", kit:"away", start:["Jordan Pickford", "Jake O'Brien", "James Tarkowski", "Jarrad Branthwaite", "Vitaliy Mykolenko", "James Garner", "Harrison Armstrong", "Merlin Rohl", "Kiernan Dewsbury-Hall", "Tyrique George", "Thierno Barry"] },
  "Atlético Madrid": ["Jan Oblak","Marcos Llorente","Cristian Romero","Robin Le Normand","Álex Grimaldo",
    "Koke","Johnny Cardoso","Giuliano Simeone","Pablo Barrios","Ademola Lookman","Jonathan David"],
  "Ipswich Town": { confirmed:true, forDate:"2026-10-31", kit:"home", start:["Christian Walton", "Abdoul Ouattara", "Issa Diop", "Dara O'Shea", "Leif Davis", "Exequiel Palacios", "Florentino Luis", "Abdul Fatawu", "Julio Enciso", "Jaden Philogene", "Emersonn Da Silva"] },
  "Chelsea": { confirmed:true, forDate:"2026-10-31", kit:"home", start:["Mike Penders", "Joshua Acheampong", "Levi Colwill", "Wesley Fofana", "Pedro Neto", "Moisés Caicedo", "Roméo Lavia", "Marco Palestra", "Cole Palmer", "Estêvão", "Morgan Rogers"] },
  "Brentford": { confirmed:true, forDate:"2026-10-31", kit:"home", start:["Caoimhin Kelleher", "Michael Kayode", "Kristoffer Ajer", "Sepp van den Berg", "Keane Lewis-Potter", "Mamadou Sangare", "Vitaly Janelt", "Dango Ouattara", "Mathias Jensen", "Kevin Schade", "Igor Thiago"] },
  "Newcastle United": { confirmed:true, forDate:"2026-11-02", kit:"home", start:["Lukas Hornicek", "Amar Dedić", "Fabian Schär", "Dan Burn", "Lewis Hall", "Nico González", "Joelinton", "Anthony Elanga", "Joe Willock", "Harvey Barnes", "William Osula"] },
  "Coventry City": { confirmed:true, forDate:"2026-10-31", kit:"home", start:["Carl Rushworth", "Milan van Ewijk", "Stephen Mfuni", "Ethan Pinnock", "Jay Dasilva", "Caleb Yirenkyi", "Victor Torp", "Tatsuhiro Sakamoto", "Jack Rudoni", "Yann Gboho", "Taiwo Awoniyi"] },
  "Tottenham Hotspur": { confirmed:true, forDate:"2026-10-31", kit:"home", start:["Antonin Kinsky", "Archie Gray", "Jan Paul van Hecke", "Micky van de Ven", "Andy Robertson", "Sandro Tonali", "Mateus Fernandes", "Mohammed Kudus", "Omar Marmoush", "Mathys Tel", "Dominic Solanke"] },
};

const LINEUP_SEED_VERSION = 26;




const ELO_START = 1500, ELO_K = 20, ELO_HOME = 60;
const OMEN_RATE_DEFAULT = 15;
const OMEN_CAP = 60;
const strengthToElo = (v) => 1350 + (Number(v) || 5) * 40;

function computeElo(results, teams) {
  const r = {}, played = {};
  for (const t of teams) r[t.name] = strengthToElo(t.strength);
  const clean = (results||[]).filter(g => g && g.home && g.away && Number.isFinite(+g.hg) && Number.isFinite(+g.ag));
  for (const g of clean.slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")))) {
    if (r[g.home] == null) r[g.home] = ELO_START;
    if (r[g.away] == null) r[g.away] = ELO_START;
    const exp = 1 / (1 + Math.pow(10, (r[g.away] - r[g.home] - ELO_HOME) / 400));
    const act = +g.hg > +g.ag ? 1 : +g.hg === +g.ag ? 0.5 : 0;
    const k = ELO_K * (1 + 0.5 * Math.log(Math.max(1, Math.abs(+g.hg - +g.ag))));
    r[g.home] += k * (act - exp);
    r[g.away] -= k * (act - exp);
    played[g.home] = (played[g.home]||0)+1;
    played[g.away] = (played[g.away]||0)+1;
  }
  return { rating: r, played };
}

function eloForecast(rating, home, away) {
  const ra = rating[home] ?? ELO_START, rb = rating[away] ?? ELO_START;
  const eh = 1 / (1 + Math.pow(10, (rb - ra - ELO_HOME) / 400));
  const draw = Math.max(0.05, 0.30 * (1 - Math.abs(eh - 0.5) * 1.6));
  const rest = 1 - draw;
  return { home: eh*rest, draw, away: (1-eh)*rest, ra, rb };
}

function computePoisson(results) {
  const clean = (results||[]).filter(g => g && g.home && g.away && Number.isFinite(+g.hg) && Number.isFinite(+g.ag));
  if (!clean.length) return null;
  let gh=0, ga=0; const st = {};
  const touch = (t) => st[t] = st[t] || { hs:0, hc:0, as:0, ac:0, hm:0, am:0 };
  for (const g of clean) {
    touch(g.home); touch(g.away);
    gh += +g.hg; ga += +g.ag;
    st[g.home].hs += +g.hg; st[g.home].hc += +g.ag; st[g.home].hm++;
    st[g.away].as += +g.ag; st[g.away].ac += +g.hg; st[g.away].am++;
  }
  const n = clean.length;
  return { st, avgH: Math.max(0.2, gh/n), avgA: Math.max(0.2, ga/n), n };
}

const poissonP = (k, lam) => { let f=1; for(let i=2;i<=k;i++) f*=i; return Math.exp(-lam)*Math.pow(lam,k)/f; };

/* ── หดค่าเข้าหาค่าเฉลี่ยลีก (shrinkage) ──
   ต้นฤดูกาลทีมหนึ่งลงเหย้าแค่สามสี่นัด อัตราบุก/รับที่คำนวณตรง ๆ จึงแกว่งสุดขั้ว
   เคยทำให้ลิเวอร์พูลได้ λ 0.55 และไบรท์ตัน 4.40 ในนัดเดียวกัน ซึ่งเป็นไปไม่ได้
   สูตร: rate_หด = 1 + w·(rate/ค่าเฉลี่ย − 1) โดย w = n/(n+K)
   ทีมที่ลง 3 นัดได้ w=0.33 (เชื่อตัวเองหนึ่งในสาม) · 12 นัดได้ w=0.67 · ครบฤดูกาลเกือบ 1 */
const POIS_K = 6;
const shrinkRate = (sum, n, mean) => {
  if (!n || !mean) return 1;
  const w = n / (n + POIS_K);
  return 1 + w * ((sum / n) / mean - 1);
};

function poissonForecast(model, home, away) {
  if (!model) return null;
  const { st, avgH, avgA } = model;
  const h = st[home], a = st[away];
  if (!h || !a || !h.hm || !a.am || !avgH || !avgA) return null;
  /* บุกของเจ้าบ้าน × รับของเยือน — ทั้งสองเทียบค่าเฉลี่ยประตูเจ้าบ้าน
     บุกของเยือน × รับของเจ้าบ้าน — ทั้งสองเทียบค่าเฉลี่ยประตูเยือน */
  const attH = shrinkRate(h.hs, h.hm, avgH), defA = shrinkRate(a.ac, a.am, avgH);
  const attA = shrinkRate(a.as, a.am, avgA), defH = shrinkRate(h.hc, h.hm, avgA);
  const lh = Math.max(0.15, avgH * attH * defA);
  const la = Math.max(0.15, avgA * attA * defH);
  let pH=0, pD=0, pA=0; const grid=[];
  for (let i=0;i<=8;i++) for (let j=0;j<=8;j++) {
    const p = poissonP(i,lh)*poissonP(j,la);
    if (i>j) pH+=p; else if (i===j) pD+=p; else pA+=p;
    grid.push({ p, h:i, a:j });
  }
  grid.sort((x,y)=>y.p-x.p);
  const best = grid[0];
  return { lh, la, pH, pD, pA, best, top: grid.slice(0,4),
           w: { attH:+attH.toFixed(3), defA:+defA.toFixed(3), attA:+attA.toFixed(3), defH:+defH.toFixed(3),
                nH:h.hm, nA:a.am, k:POIS_K } };
}


/* ═══════════ ราคาตลาด ═══════════
   ราคาปิดเฉลี่ยจากเจ้ามือหลายเจ้า (football-data.co.uk)
   ["วันสนาม","เจ้าบ้าน","ทีมเยือน", ราคาเหย้า, ราคาเสมอ, ราคาเยือน, ปิดแล้ว 1/0]

   ราคาคือความน่าจะเป็นที่ตลาดคิด ผ่านการกลั่นด้วยเงินจริง
   วัดกับผล 89 นัดแล้ว ตลาดทายตัวเต็งถูก 67.2% ส่วนโมเดลเราได้ 60.3%
   จึงใช้ตลาดเป็นฐาน แล้วให้ดวงเป็นตัวเอียงเล็ก ๆ แทนที่จะเชื่อโมเดลตัวเองล้วน */
const SEED_ODDS = [
  ["2026-11-08","Sunderland","Chelsea",3,3.43,2.27,1.82,1.93,0.25,1.82,1.93],
  ["2026-11-08","Manchester United","Aston Villa",1.97,3.95,3.31,1.43,2.72,-0.5,1.92,1.81],
  ["2026-11-08","Ipswich Town","Bournemouth",3.43,3.72,1.99,1.61,2.25,0.5,1.79,1.95],
  ["2026-11-08","Crystal Palace","Liverpool",5.43,4.52,1.52,1.46,2.63,1,1.97,1.79],
  ["2026-11-08","Brighton","Brentford",1.8,3.85,4.09,1.64,2.19,-0.5,1.77,1.98],
  ["2026-11-07","Nottingham Forest","Manchester City",5.02,4.1,1.62,1.59,2.28,0.75,2.04,1.72],
  ["2026-11-07","Leeds United","Tottenham Hotspur",2.75,3.33,2.5,1.89,1.85,0,1.99,1.77],
  ["2026-11-07","Fulham","Newcastle United",1.94,3.81,3.56,1.6,2.26,-0.5,1.9,1.83],
  ["2026-11-07","Arsenal","Hull City",1.14,8,17.72,1.43,2.73,-2.25,1.95,1.8],
  ["2026-11-06","Everton","Coventry City",1.66,4.01,4.83,1.64,2.19,-0.75,1.79,1.96],
  ["2026-11-02","Newcastle United","Everton",2.14,3.47,3.25,1.75,2.03,-0.25,1.82,1.93],
  ["2026-11-01","Liverpool","Arsenal",2.81,3.53,2.37,1.63,2.2,0.25,1.74,2.01],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace",1.63,4.13,4.91,1.63,2.22,-0.75,1.75,2.01],
  ["2026-10-31","Manchester City","Brighton",1.68,4.1,4.36,1.5,2.51,-0.75,1.82,1.93],
  ["2026-10-31","Hull City","Ipswich Town",2.88,3.38,2.35,1.88,1.86,0.25,1.76,2],
  ["2026-10-31","Coventry City","Sunderland",2.94,3.35,2.34,1.85,1.9,0.25,1.79,1.97],
  ["2026-10-31","Chelsea","Manchester United",2.16,3.63,3.07,1.58,2.29,-0.25,1.89,1.86],
  ["2026-10-31","Brentford","Nottingham Forest",2.1,3.61,3.26,1.67,2.14,-0.25,1.8,1.96],
  ["2026-10-31","Bournemouth","Leeds United",2.05,3.42,3.56,1.85,1.9,-0.5,2.01,1.74],
  ["2026-10-31","Aston Villa","Fulham",1.95,3.67,3.61,1.67,2.13,-0.5,1.9,1.83],
  ["2026-10-25","Sunderland","Leeds United",2.64,3.12,2.77,2.07,1.71,0,1.82,1.93],
  ["2026-10-25","Manchester United","Bournemouth",2.4,3.41,2.8,1.75,2.02,0,1.73,2.03],
  ["2026-10-25","Liverpool","Brighton",1.96,3.82,3.45,1.55,2.38,-0.5,1.91,1.83],
  ["2026-10-25","Hull City","Brentford",4.86,4.03,1.64,1.64,2.21,0.75,1.98,1.78],
  ["2026-10-25","Crystal Palace","Newcastle United",2.55,3.47,2.61,1.66,2.16,0,1.88,1.87],
  ["2026-10-24","Coventry City","Fulham",3.29,3.59,2.1,1.66,2.17,0.5,1.73,2.04],
  ["2026-10-24","Chelsea","Tottenham Hotspur",1.86,3.87,3.76,1.52,2.45,-0.5,1.82,1.92],
  ["2026-10-24","Aston Villa","Manchester City",4.47,4.5,1.62,1.34,3.12,1,1.76,1.99],
  ["2026-10-24","Arsenal","Everton",1.34,4.95,8.21,1.66,2.14,-1.5,1.99,1.76],
  ["2026-10-23","Ipswich Town","Nottingham Forest",3.13,3.41,2.23,1.83,1.93,0.25,1.84,1.9],
  ["2026-10-19","Tottenham Hotspur","Coventry City",1.53,4.47,5.43,1.52,2.42,-1,1.83,1.92],
  ["2026-10-18","Nottingham Forest","Arsenal",6.55,4.16,1.49,1.86,1.88,1,1.97,1.78],
  ["2026-10-18","Leeds United","Manchester United",2.49,3.35,2.76,1.89,1.85,0,1.79,1.96],
  ["2026-10-18","Brighton","Crystal Palace",1.42,4.83,6.62,1.52,2.46,-1.25,1.88,1.87],
  ["2026-10-18","Bournemouth","Sunderland",2.05,3.21,3.82,2.27,1.59,-0.5,1.99,1.77],
  ["2026-10-17","Newcastle United","Aston Villa",2.14,3.74,3.05,1.5,2.5,-0.25,1.85,1.9],
  ["2026-10-17","Manchester City","Ipswich Town",1.23,6.72,10.15,1.31,3.3,-1.75,1.76,1.99],
  ["2026-10-17","Fulham","Hull City",1.62,4,5.01,1.7,2.08,-0.75,1.75,1.99],
  ["2026-10-17","Everton","Chelsea",2.84,3.54,2.32,1.65,2.18,0.25,1.78,1.98],
  ["2026-10-17","Brentford","Liverpool",2.67,3.58,2.43,1.54,2.41,0,1.98,1.77],
  ["2026-10-12","Coventry City","Newcastle United",3.54,3.72,1.97,1.58,2.31,0.5,1.82,1.92],
  ["2026-10-11","Liverpool","Manchester City",3.36,3.69,2.05,1.62,2.22,0.5,1.77,1.99],
  ["2026-10-11","Hull City","Everton",4.02,3.36,1.95,2.01,1.75,0.5,1.83,1.9],
  ["2026-10-11","Crystal Palace","Nottingham Forest",2.77,3.34,2.47,1.86,1.88,0,2,1.77],
  ["2026-10-10","Sunderland","Brighton",2.96,3.34,2.33,1.94,1.8,0.25,1.8,1.96],
  ["2026-10-10","Manchester United","Tottenham Hotspur",1.68,4.17,4.43,1.49,2.53,-0.75,1.84,1.91],
  ["2026-10-10","Ipswich Town","Fulham",2.96,3.43,2.33,1.74,2.03,0.25,1.78,1.98],
  ["2026-10-10","Chelsea","Bournemouth",1.8,3.93,3.95,1.54,2.38,-0.5,1.77,1.98],
  ["2026-10-10","Aston Villa","Brentford",2.52,3.56,2.61,1.63,2.21,0,1.84,1.91],
  ["2026-10-10","Arsenal","Leeds United",1.44,4.44,7.02,1.78,1.97,-1.25,1.98,1.76],
  ["2026-09-20","Manchester City","Sunderland",1.34,5.19,8.5,1.61,2.26,-1.5,1.95,1.78],
  ["2026-09-20","Leeds United","Crystal Palace",1.66,3.95,4.93,1.69,2.1,-0.75,1.79,1.96],
  ["2026-09-20","Fulham","Manchester United",3.49,3.74,1.98,1.57,2.33,0.5,1.82,1.91],
  ["2026-09-20","Bournemouth","Liverpool",3.11,3.66,2.15,1.55,2.39,0.25,1.92,1.83],
  ["2026-09-19","Tottenham Hotspur","Aston Villa",1.89,3.77,3.81,1.6,2.29,-0.5,1.82,1.91],
  ["2026-09-19","Nottingham Forest","Coventry City",1.63,3.93,5.21,1.73,2.04,-0.75,1.78,1.98],
  ["2026-09-19","Newcastle United","Hull City",1.59,4.29,5.05,1.55,2.38,-1,1.94,1.8],
  ["2026-09-19","Everton","Ipswich Town",1.74,3.85,4.43,1.67,2.14,-0.75,1.91,1.84],
  ["2026-09-19","Brighton","Arsenal",4.92,3.84,1.68,1.78,1.98,0.75,1.91,1.85],
  ["2026-09-18","Brentford","Chelsea",2.53,3.63,2.58,1.49,2.54,0,1.87,1.88],
  ["2026-09-14","Leeds United","Newcastle United",2.3,3.46,2.98,1.68,2.12,-0.25,1.97,1.79],
  ["2026-09-13","Manchester United","Manchester City",2.95,3.76,2.2,1.45,2.67,0.25,1.85,1.91],
  ["2026-09-13","Coventry City","Brighton",3.71,3.78,1.91,1.61,2.24,0.5,1.88,1.85],
  ["2026-09-12","Tottenham Hotspur","Everton",1.98,3.63,3.59,1.72,2.07,-0.5,1.93,1.8],
  ["2026-09-12","Sunderland","Arsenal",5.89,3.72,1.62,2.08,1.71,0.75,1.98,1.78],
  ["2026-09-12","Liverpool","Fulham",1.5,4.58,5.74,1.47,2.61,-1,1.77,1.98],
  ["2026-09-12","Crystal Palace","Ipswich Town",2.1,3.62,3.27,1.66,2.16,-0.25,1.82,1.94],
  ["2026-09-12","Chelsea","Hull City",1.21,6.67,11.96,1.42,2.78,-1.75,1.76,2],
  ["2026-09-12","Bournemouth","Brentford",2.29,3.59,2.91,1.69,2.17,-0.25,1.93,1.82],
  ["2026-09-12","Aston Villa","Nottingham Forest",2.22,3.43,3.19,1.83,1.92,-0.25,1.89,1.86],
  ["2026-09-06","Everton","Manchester United",3.65,3.82,1.91,1.57,2.34,0.5,1.88,1.85],
  ["2026-09-06","Arsenal","Chelsea",1.7,3.85,4.74,1.71,2.07,-0.75,1.87,1.88],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur",2.64,3.38,2.61,1.84,1.92,0,1.9,1.85],
  ["2026-09-05","Newcastle United","Bournemouth",2.12,3.64,3.22,1.58,2.32,-0.25,1.8,1.94],
  ["2026-09-05","Manchester City","Coventry City",1.19,7.18,12.96,1.38,2.95,-2,1.89,1.86],
  ["2026-09-05","Hull City","Aston Villa",3.92,3.59,1.89,1.8,1.96,0.5,1.9,1.83],
  ["2026-09-05","Fulham","Crystal Palace",2.16,3.39,3.35,1.84,1.92,-0.25,1.84,1.92],
  ["2026-09-05","Brighton","Leeds United",1.94,3.63,3.73,1.76,2.01,-0.5,1.89,1.84],
  ["2026-09-05","Brentford","Sunderland",1.68,3.86,4.89,1.79,1.97,-0.75,1.86,1.89],
  ["2026-09-04","Ipswich Town","Liverpool",4.86,4.34,1.62,1.45,2.66,1,1.79,1.97],
  ["2026-08-31","Aston Villa","Arsenal",6.54,4.41,1.47,1.7,2.08,1,2.05,1.72],
  ["2026-08-30","Sunderland","Fulham",2.22,3.29,3.28,2,1.76,-0.25,1.89,1.86],
  ["2026-08-30","Manchester United","Ipswich Town",1.34,5.39,7.68,1.39,2.86,-1.5,1.88,1.85],
  ["2026-08-30","Leeds United","Brentford",2.74,3.4,2.48,1.78,1.98,0,1.98,1.78],
  ["2026-08-30","Chelsea","Brighton",1.83,3.83,3.89,1.59,2.29,-0.5,1.78,1.95],
  ["2026-08-29","Tottenham Hotspur","Newcastle United",2.15,3.67,3.06,1.6,2.26,-0.25,1.86,1.89],
  ["2026-08-29","Liverpool","Nottingham Forest",1.46,4.7,6.09,1.49,2.55,-1.25,1.95,1.81],
  ["2026-08-29","Coventry City","Hull City",1.72,3.82,4.72,1.7,2.08,-0.75,1.89,1.86],
  ["2026-08-29","Bournemouth","Everton",2.18,3.46,3.24,1.75,2.03,-0.25,1.87,1.88],
  ["2026-08-28","Crystal Palace","Manchester City",4.96,4.13,1.62,1.63,2.21,0.75,1.99,1.76],
  ["2026-08-24","Fulham","Chelsea",3.57,3.5,2.02,1.84,1.91,0.5,1.79,1.95],
  ["2026-08-23","Newcastle United","Liverpool",3.66,3.82,1.92,1.49,2.58,0.5,1.9,1.84],
  ["2026-08-23","Manchester City","Bournemouth",1.44,4.78,6.36,1.52,2.45,-1.25,1.9,1.84],
  ["2026-08-23","Brighton","Aston Villa",2.07,3.41,3.52,1.93,1.82,-0.25,1.76,1.98],
  ["2026-08-22","Nottingham Forest","Leeds United",2.45,3.2,2.94,2.12,1.69,-0.25,2.07,1.7],
  ["2026-08-22","Ipswich Town","Sunderland",2.83,3.22,2.52,2.14,1.67,0,1.99,1.77],
  ["2026-08-22","Hull City","Manchester United",8.49,5.11,1.34,1.55,2.38,1.5,1.82,1.92],
  ["2026-08-22","Everton","Crystal Palace",2.32,3.36,3.05,1.93,1.83,-0.25,1.96,1.79],
  ["2026-08-22","Brentford","Tottenham Hotspur",1.99,3.71,3.39,1.65,2.18,-0.5,1.95,1.79],
  ["2026-08-21","Arsenal","Coventry City",1.2,6.72,14,1.55,2.37,-2,2.02,1.74],
].map(([date, home, away, oH, oD, oA, ov25, un25, ahLine, ahH, ahA]) =>
  ({ id:`o_${date}_${home}`.replace(/\s+/g,""), date, home, away,
     oH, oD, oA, ov25, un25, ahLine, ahH, ahA }));
const ODDS_BY = new Map(SEED_ODDS.map(o => [o.date + "|" + o.home, o]));
const ODDS_SEED_VERSION = 1;

/* ═══════════ เตะมุมและใบเหลือง ═══════════
   ["วันสนาม","เจ้าบ้าน","ทีมเยือน", มุมเหย้า, มุมเยือน, เหลืองเหย้า, เหลืองเยือน]
   ไม่มีราคาตลาดให้เทียบ (ไฟล์ราคามีแค่ 1X2 · สูง-ต่ำ 2.5 · ต่อรองลูก)
   ตัวเลขฝั่งนี้จึงเป็นของเราล้วน ไม่ได้ผ่านการกลั่นด้วยเงินเหมือนราคาบอล

   ทดสอบเดินหน้า 64 นัดแล้ว:
   เตะมุม  โมเดลรายทีมแพ้ค่าเฉลี่ยลีกทุกค่า shrinkage จึงใช้ค่าเฉลี่ยลีกตรง ๆ
           แปลว่าที่ข้อมูลเท่านี้ ทีมไหนเตะมุมมากน้อย ยังแยกไม่ออกจากความบังเอิญ
   ใบเหลือง โมเดลรายทีมชนะเล็กน้อยที่ K=12 (log loss 2.119 เทียบ 2.140) จึงใช้ K=12 */
const SEED_SIDE = [
  ["2026-11-08","Sunderland","Chelsea",2,2,5,4,0,0],
  ["2026-11-08","Manchester United","Aston Villa",8,1,1,1,0,0],
  ["2026-11-08","Ipswich Town","Bournemouth",2,7,2,3,0,0],
  ["2026-11-08","Crystal Palace","Liverpool",4,7,2,4,0,0],
  ["2026-11-08","Brighton","Brentford",7,3,4,2,0,1],
  ["2026-11-07","Nottingham Forest","Manchester City",3,7,0,2,0,0],
  ["2026-11-07","Leeds United","Tottenham Hotspur",6,4,1,2,0,0],
  ["2026-11-07","Fulham","Newcastle United",3,3,0,5,0,0],
  ["2026-11-07","Arsenal","Hull City",7,4,2,3,0,0],
  ["2026-11-06","Everton","Coventry City",2,2,1,1,0,0],
  ["2026-11-02","Newcastle United","Everton",4,5,4,2,1,0],
  ["2026-11-01","Liverpool","Arsenal",7,4,4,4,0,0],
  ["2026-10-31","Tottenham Hotspur","Crystal Palace",19,0,1,1,0,1],
  ["2026-10-31","Manchester City","Brighton",8,2,0,3,0,0],
  ["2026-10-31","Hull City","Ipswich Town",6,3,3,3,0,0],
  ["2026-10-31","Coventry City","Sunderland",4,4,2,2,0,1],
  ["2026-10-31","Chelsea","Manchester United",8,7,1,6,0,1],
  ["2026-10-31","Brentford","Nottingham Forest",3,4,1,3,0,0],
  ["2026-10-31","Bournemouth","Leeds United",4,4,2,2,0,0],
  ["2026-10-31","Aston Villa","Fulham",7,7,1,3,0,0],
  ["2026-10-25","Sunderland","Leeds United",4,5,1,2,0,0],
  ["2026-10-25","Manchester United","Bournemouth",5,4,4,1,0,0],
  ["2026-10-25","Liverpool","Brighton",4,2,0,2,0,0],
  ["2026-10-25","Hull City","Brentford",5,6,0,1,0,0],
  ["2026-10-25","Crystal Palace","Newcastle United",7,4,3,3,0,0],
  ["2026-10-24","Coventry City","Fulham",4,6,0,2,0,0],
  ["2026-10-24","Chelsea","Tottenham Hotspur",4,6,4,3,1,0],
  ["2026-10-24","Aston Villa","Manchester City",4,7,4,4,0,0],
  ["2026-10-24","Arsenal","Everton",12,3,1,3,0,0],
  ["2026-10-23","Ipswich Town","Nottingham Forest",0,5,1,1,0,0],
  ["2026-10-19","Tottenham Hotspur","Coventry City",4,4,1,3,0,0],
  ["2026-10-18","Nottingham Forest","Arsenal",8,6,1,1,0,0],
  ["2026-10-18","Leeds United","Manchester United",2,3,2,2,0,0],
  ["2026-10-18","Brighton","Crystal Palace",8,5,2,1,0,0],
  ["2026-10-18","Bournemouth","Sunderland",5,3,3,2,0,1],
  ["2026-10-17","Newcastle United","Aston Villa",4,5,6,2,0,0],
  ["2026-10-17","Manchester City","Ipswich Town",2,3,1,2,0,0],
  ["2026-10-17","Fulham","Hull City",10,2,2,2,1,0],
  ["2026-10-17","Everton","Chelsea",5,7,3,4,0,0],
  ["2026-10-17","Brentford","Liverpool",3,9,4,3,2,0],
  ["2026-10-12","Coventry City","Newcastle United",2,6,1,1,0,0],
  ["2026-10-11","Liverpool","Manchester City",5,6,4,2,1,0],
  ["2026-10-11","Hull City","Everton",7,6,2,0,0,0],
  ["2026-10-11","Crystal Palace","Nottingham Forest",5,8,2,2,0,0],
  ["2026-10-10","Sunderland","Brighton",7,5,0,1,0,1],
  ["2026-10-10","Manchester United","Tottenham Hotspur",4,4,4,3,0,1],
  ["2026-10-10","Ipswich Town","Fulham",2,5,2,4,0,0],
  ["2026-10-10","Chelsea","Bournemouth",1,7,0,4,0,0],
  ["2026-10-10","Aston Villa","Brentford",2,2,2,5,0,0],
  ["2026-10-10","Arsenal","Leeds United",2,4,1,4,0,0],
  ["2026-09-20","Manchester City","Sunderland",6,5,0,1,0,0],
  ["2026-09-20","Leeds United","Crystal Palace",4,3,2,3,0,0],
  ["2026-09-20","Fulham","Manchester United",3,13,3,0,0,0],
  ["2026-09-20","Bournemouth","Liverpool",3,3,1,2,0,0],
  ["2026-09-19","Tottenham Hotspur","Aston Villa",11,1,1,2,0,0],
  ["2026-09-19","Nottingham Forest","Coventry City",6,2,2,0,0,0],
  ["2026-09-19","Newcastle United","Hull City",4,7,1,4,0,0],
  ["2026-09-19","Everton","Ipswich Town",4,4,2,1,0,1],
  ["2026-09-19","Brighton","Arsenal",5,6,4,1,0,0],
  ["2026-09-18","Brentford","Chelsea",4,12,2,0,0,0],
  ["2026-09-14","Leeds United","Newcastle United",5,5,1,2,0,0],
  ["2026-09-13","Manchester United","Manchester City",6,7,1,2,0,1],
  ["2026-09-13","Coventry City","Brighton",5,3,0,0,1,0],
  ["2026-09-12","Tottenham Hotspur","Everton",5,6,0,2,0,0],
  ["2026-09-12","Sunderland","Arsenal",4,2,6,2,1,0],
  ["2026-09-12","Liverpool","Fulham",5,8,0,1,0,0],
  ["2026-09-12","Crystal Palace","Ipswich Town",6,3,1,3,1,0],
  ["2026-09-12","Chelsea","Hull City",10,4,1,5,0,0],
  ["2026-09-12","Bournemouth","Brentford",2,1,5,1,0,0],
  ["2026-09-12","Aston Villa","Nottingham Forest",6,1,2,5,0,0],
  ["2026-09-06","Everton","Manchester United",4,3,3,3,0,0],
  ["2026-09-06","Arsenal","Chelsea",5,3,2,4,0,0],
  ["2026-09-05","Nottingham Forest","Tottenham Hotspur",2,10,2,2,0,0],
  ["2026-09-05","Newcastle United","Bournemouth",4,3,2,3,0,0],
  ["2026-09-05","Manchester City","Coventry City",4,5,1,2,0,0],
  ["2026-09-05","Hull City","Aston Villa",3,4,2,0,0,0],
  ["2026-09-05","Fulham","Crystal Palace",7,1,0,0,0,0],
  ["2026-09-05","Brighton","Leeds United",7,6,3,3,0,0],
  ["2026-09-05","Brentford","Sunderland",4,3,3,2,0,0],
  ["2026-09-04","Ipswich Town","Liverpool",4,3,1,3,0,0],
  ["2026-08-31","Aston Villa","Arsenal",2,4,3,1,0,0],
  ["2026-08-30","Sunderland","Fulham",3,4,0,2,0,0],
  ["2026-08-30","Manchester United","Ipswich Town",8,4,1,3,0,0],
  ["2026-08-30","Leeds United","Brentford",5,6,0,4,0,0],
  ["2026-08-30","Chelsea","Brighton",4,7,1,3,0,0],
  ["2026-08-29","Tottenham Hotspur","Newcastle United",9,7,1,2,0,0],
  ["2026-08-29","Liverpool","Nottingham Forest",3,5,4,2,0,0],
  ["2026-08-29","Coventry City","Hull City",6,2,1,4,0,0],
  ["2026-08-29","Bournemouth","Everton",10,7,3,2,0,0],
  ["2026-08-28","Crystal Palace","Manchester City",2,6,1,2,0,0],
  ["2026-08-24","Fulham","Chelsea",6,4,2,3,0,0],
  ["2026-08-23","Newcastle United","Liverpool",2,6,5,3,0,0],
  ["2026-08-23","Manchester City","Bournemouth",8,3,1,2,0,0],
  ["2026-08-23","Brighton","Aston Villa",5,2,2,3,0,1],
  ["2026-08-22","Nottingham Forest","Leeds United",3,2,2,1,0,0],
  ["2026-08-22","Ipswich Town","Sunderland",3,5,0,3,0,0],
  ["2026-08-22","Hull City","Manchester United",1,6,2,1,0,0],
  ["2026-08-22","Everton","Crystal Palace",4,0,0,1,0,0],
  ["2026-08-22","Brentford","Tottenham Hotspur",7,3,1,1,0,0],
  ["2026-08-21","Arsenal","Coventry City",8,2,1,1,0,0],
].map(([date, home, away, hc, ac, hy, ay, hr, ar]) =>
  ({ date, home, away, hc, ac, hy, ay, hr: hr || 0, ar: ar || 0 }));
const CARD_K = 12;

function sideModel(rows = SEED_SIDE) {
  let sh=0, sa=0, yh=0, ya=0, n=0; const st={};
  const touch = (t) => st[t] = st[t] || { yf:0, ya:0, hn:0, af:0, aa:0, an:0 };
  for (const g of rows) {
    touch(g.home); touch(g.away);
    /* นับใบแดงรวมกับใบเหลืองเป็น "ใบ" เดียวกัน ตามที่ต้องการดูยอดรวมทุกใบ
       ทั้งฤดูกาลมีใบแดง 17 ใบจาก 89 นัด จึงขยับค่าเฉลี่ยขึ้นราว 0.19 ใบต่อนัด */
    const hcard = g.hy + (g.hr || 0), acard = g.ay + (g.ar || 0);
    sh += g.hc; sa += g.ac; yh += hcard; ya += acard; n++;
    st[g.home].yf += hcard; st[g.home].ya += acard; st[g.home].hn++;
    st[g.away].af += acard; st[g.away].aa += hcard; st[g.away].an++;
  }
  if (!n) return null;
  return { st, cornerH: sh/n, cornerA: sa/n, cardH: yh/n, cardA: ya/n, n };
}
/* เตะมุม: ค่าเฉลี่ยลีก · ใบเหลือง: อัตราของทีม × อัตราที่คู่แข่งทำให้เกิด หดด้วย K=12 */
function sideForecast(m, home, away) {
  if (!m) return null;
  const H = m.st[home], A = m.st[away];
  const sr = (sum, cnt, mean) => (!cnt || !mean) ? 1 : (1 + (cnt/(cnt+CARD_K)) * ((sum/cnt)/mean - 1));
  const cy = (H && A) ? m.cardH * sr(H.yf, H.hn, m.cardH) * sr(A.aa, A.an, m.cardH) : m.cardH;
  const ay = (H && A) ? m.cardA * sr(A.af, A.an, m.cardA) * sr(H.ya, H.hn, m.cardA) : m.cardA;
  return { cornerH: m.cornerH, cornerA: m.cornerA, cornerTot: m.cornerH + m.cornerA,
           cardH: cy, cardA: ay, cardTot: cy + ay, n: m.n,
           cornerLg: m.cornerH + m.cornerA, cardLg: m.cardH + m.cardA,
           teamCards: !!(H && A && H.hn && A.an) };
}
/* ความน่าจะเป็นที่ยอดรวมจะเกินเส้น (ปัวซง) */
function overProb(lambda, line) {
  let under = 0;
  for (let k = 0; k <= Math.floor(line); k++) under += Math.exp(-lambda + k*Math.log(lambda) - LOGF2[k]);
  return 1 - under;
}
const LOGF2 = [0]; for (let i=1;i<=60;i++) LOGF2[i] = LOGF2[i-1] + Math.log(i);

/* ตัดส่วนต่างเจ้ามือออก ให้ผลรวมเป็น 100% */
function marketProbs(o) {
  if (!o) return null;
  const inv = 1/o.oH + 1/o.oD + 1/o.oA;
  return { pH:(1/o.oH)/inv, pD:(1/o.oD)/inv, pA:(1/o.oA)/inv,
           margin: inv - 1, closed:o.closed };
}

/* ── ถอดราคาเป็นตารางสกอร์ ──
   ตลาดบอกแค่สามตัวเลข แต่ถ้าหา λ ที่ทำให้ตารางปัวซงให้สามตัวเลขนั้นพอดี
   เราจะได้ความน่าจะเป็นของทุกสกอร์ รวมถึงสูง-ต่ำ และยิงกันทั้งคู่
   MARKET_RHO คือตัวแก้ Dixon-Coles สำหรับสกอร์ต่ำ หาจากสกอร์จริงทั้งฤดูกาล */
const MARKET_RHO = -0.03;
const GOAL_MAX = 9;
const LOGF = [0]; for (let i=1;i<=GOAL_MAX+1;i++) LOGF[i] = LOGF[i-1] + Math.log(i);
function poisArr(l) { const a=[]; for (let k=0;k<=GOAL_MAX;k++) a[k]=Math.exp(-l + k*Math.log(l) - LOGF[k]); return a; }
function scoreGrid(lh, la, rho = MARKET_RHO) {
  const H = poisArr(lh), A = poisArr(la), grid = [];
  let pH=0, pD=0, pA=0, s=0;
  for (let i=0;i<=GOAL_MAX;i++) for (let j=0;j<=GOAL_MAX;j++) {
    let p = H[i]*A[j];
    if (rho) { if (i===0&&j===0) p *= 1 - lh*la*rho;
      else if (i===0&&j===1) p *= 1 + lh*rho;
      else if (i===1&&j===0) p *= 1 + la*rho;
      else if (i===1&&j===1) p *= 1 - rho; }
    if (p < 0) p = 0;
    grid.push({ h:i, a:j, p }); s += p;
    if (i>j) pH+=p; else if (i===j) pD+=p; else pA+=p;
  }
  for (const c of grid) c.p /= s;
  const sum = (f) => grid.filter(f).reduce((x,c)=>x+c.p, 0);
  return { grid, lh, la, pH:pH/s, pD:pD/s, pA:pA/s,
    top: grid.slice().sort((x,y)=>y.p-x.p).slice(0,6),
    over25: sum(c=>c.h+c.a>2.5), under25: sum(c=>c.h+c.a<2.5),
    btts: sum(c=>c.h>0&&c.a>0), csHome: sum(c=>c.a===0), csAway: sum(c=>c.h===0) };
}
/* นิวตันสองมิติ หา λ ที่ให้ pH และ pA ตรงราคาตลาด */
function marketGrid(mp, rho = MARKET_RHO) {
  if (!mp) return null;
  let lh = 1.45, la = 1.25;
  for (let it=0; it<40; it++) {
    const g0 = scoreGrid(lh, la, rho);
    const f1 = g0.pH - mp.pH, f2 = g0.pA - mp.pA;
    if (Math.abs(f1) < 1e-7 && Math.abs(f2) < 1e-7) break;
    const e = 1e-4;
    const gh = scoreGrid(lh+e, la, rho), ga = scoreGrid(lh, la+e, rho);
    const J11=(gh.pH-g0.pH)/e, J12=(ga.pH-g0.pH)/e;
    const J21=(gh.pA-g0.pA)/e, J22=(ga.pA-g0.pA)/e;
    const det = J11*J22 - J12*J21;
    if (!det || !isFinite(det)) break;
    let dh = -( J22*f1 - J12*f2)/det, da = -(-J21*f1 + J11*f2)/det;
    dh = Math.max(-0.5, Math.min(0.5, dh)); da = Math.max(-0.5, Math.min(0.5, da));
    lh = Math.max(0.05, lh+dh); la = Math.max(0.05, la+da);
  }
  return scoreGrid(lh, la, rho);
}
/* ── เอียงตารางตลาดด้วยคะแนนดวง ──
   k เลือกจากการทดสอบนอกตัวอย่าง: ฝึกครึ่งแรกของฤดูกาล ทดสอบครึ่งหลัง
   ได้ค่าที่ดีที่สุด 0.01 ซึ่งเกือบศูนย์ สอดคล้องกับที่ regression บอกว่า
   ดวงไม่เพิ่มข้อมูลจากที่ตลาดมีอยู่แล้ว ตั้งไว้เล็กโดยตั้งใจ ไม่ใช่ลืมปรับ */
/* ── สัดส่วนประตูครึ่งแรกต่อเต็มเวลา ──
   วัดจาก 89 นัดของฤดูกาลนี้ เหย้ายิงในครึ่งแรก 48.2% ของประตูทั้งหมด เยือนเพียง 33.6%
   (ทีมเยือนมักมาได้ในครึ่งหลัง) ทดสอบแล้วการแยกค่าสองฝั่งแม่นกว่าใช้ค่าเดียว:
   log loss ผลครึ่งแรก 1.0419 เทียบ 1.0528 และคาดสัดส่วนผลได้ 38.0/42.5/19.5
   ขณะที่ของจริงคือ 37.1/42.7/20.2 — ยังเป็นค่าที่ฟิตจากข้อมูลชุดเดียวกัน ต้องวัดซ้ำเมื่อนัดมากขึ้น */
const HT_RATIO_H = 0.4815;
const HT_RATIO_A = 0.3364;
function halfTimeGrid(mg) {
  return mg ? scoreGrid(mg.lh * HT_RATIO_H, mg.la * HT_RATIO_A) : null;
}

const OMEN_TILT_K = 0.01;
const OMEN_Z_SD = 1.456;   /* ส่วนเบี่ยงเบนของคะแนนทักษาจาก 81 นัด */
function tiltedGrid(mg, omenGap, k = OMEN_TILT_K) {
  if (!mg) return null;
  const z = (omenGap || 0) / OMEN_Z_SD;
  return scoreGrid(mg.lh * Math.exp(k*z), mg.la * Math.exp(-k*z));
}

/* ═══════════ บันทึกคำทำนายและวัดความแม่น ═══════════ */
const PREDICT_KEY = "bazi:predictions";

/* ถอดคะแนนออกเป็นรายองค์ประกอบ เพื่อให้ย้อนวิเคราะห์ได้ว่าตัวไหนทายแม่น */
function snapshotComponents(A, B, travel) {
  const mgrRaw = (S) => S.mgr ? S.mgr.s.raw : 0;
  const seasonAvg = (S) => S.field.length ? S.field.reduce((a,x)=>a+x.s.season.w,0)/S.field.length : 0;
  const taiAvg = (S) => S.field.length ? S.field.reduce((a,x)=>a+x.s.relT.w,0)/S.field.length : 0;
  return {
    squad:  +(A.avg*W_SQUAD - B.avg*W_SQUAD).toFixed(4),
    mgr:    +(mgrRaw(A)*W_MGR - mgrRaw(B)*W_MGR).toFixed(4),
    kit:    +(A.kv.w*W_KIT - B.kv.w*W_KIT).toFixed(4),
    harm:   +((A.harm.avg - B.harm.avg)*W_HARMONY).toFixed(4),
    triple: +(A.harm.tripleW - B.harm.tripleW).toFixed(4),
    travel: +(travel ? -travel.effect : 0).toFixed(4),
    home:   W_HOME,
    season: +(seasonAvg(A) - seasonAvg(B)).toFixed(4),
    taisui: +(taiAvg(A) - taiAvg(B)).toFixed(4),
  };
}

/* จับผลแข่งจริงเข้ากับคำทำนาย โดยดูวันที่และคู่ทีม */
function linkResults(preds, results) {
  return preds.map(p => {
    if (p.result) return p;
    const same = (r) => r.home === p.home && r.away === p.away;
    const near = (a, b) => Math.abs(new Date(a+"T00:00:00Z") - new Date(b+"T00:00:00Z")) <= 864e5;
    /* คำทำนายรุ่นเก่าบางรายการเก็บวันที่สนามไว้ จึงยอมให้คลาดกันได้หนึ่งวัน */
    const g = results.find(r => same(r) && r.date === p.date) || results.find(r => same(r) && near(r.date, p.date));
    if (!g) return p;
    return { ...p, result: { hg:+g.hg, ag:+g.ag, y: +g.hg > +g.ag ? 1 : +g.hg === +g.ag ? 0.5 : 0 } };
  });
}

const brier = (p, y) => (p.home - (y===1?1:0))**2 + (p.draw - (y===0.5?1:0))**2 + (p.away - (y===0?1:0))**2;

function pearson(xs, ys) {
  const n = xs.length; if (n < 3) return null;
  const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
  let sxy=0, sxx=0, syy=0;
  for (let i=0;i<n;i++){ const dx=xs[i]-mx, dy=ys[i]-my; sxy+=dx*dy; sxx+=dx*dx; syy+=dy*dy; }
  if (sxx===0 || syy===0) return null;
  return sxy/Math.sqrt(sxx*syy);
}

function analysePredictions(preds) {
  const done = preds.filter(p => p.result);
  if (!done.length) return null;

  /* ฤกษ์ทายถูกไหม: คะแนนสูงกว่าชนะจริงหรือเปล่า (ตัดเสมอออก) */
  const decisive = done.filter(p => p.result.y !== 0.5 && Math.abs(p.gap) > 0.01);
  const omenHit = decisive.filter(p => (p.gap > 0) === (p.result.y === 1)).length;

  /* เทียบคู่ขนาน: คะแนนแบบตัดดวงผู้เล่นออก กับการทายเจ้าบ้านล้วน */
  const gNo = (p) => p.gapNoSquad != null ? p.gapNoSquad
                   : (p.comps && p.comps.squad != null ? p.gap - p.comps.squad : null);
  const decNo = done.filter(p => p.result.y !== 0.5 && gNo(p) != null && Math.abs(gNo(p)) > 0.01);
  const noSquadHit = decNo.filter(p => (gNo(p) > 0) === (p.result.y === 1)).length;
  const decAll = done.filter(p => p.result.y !== 0.5);
  const homeHit = decAll.filter(p => p.result.y === 1).length;

  /* คะแนนบรีเออร์ ยิ่งต่ำยิ่งแม่น */
  const bPure  = done.reduce((a,p)=>a+brier(p.elo.pure,  p.result.y), 0) / done.length;
  const bMixed = done.reduce((a,p)=>a+brier(p.elo.mixed, p.result.y), 0) / done.length;

  /* หาอัตราแปลง Elo ที่แม่นที่สุดจากข้อมูลจริง */
  const sweep = [];
  for (let rate = 0; rate <= 40; rate += 5) {
    let sum = 0;
    for (const p of done) {
      const shift = Math.max(-OMEN_CAP, Math.min(OMEN_CAP, p.gap * rate));
      const eh = 1 / (1 + Math.pow(10, (p.elo.rb - p.elo.ra - shift - ELO_HOME) / 400));
      const d = Math.max(0.05, 0.30 * (1 - Math.abs(eh-0.5)*1.6));
      sum += brier({ home:eh*(1-d), draw:d, away:(1-eh)*(1-d) }, p.result.y);
    }
    sweep.push({ rate, brier: sum/done.length });
  }
  const bestRate = sweep.slice().sort((a,b)=>a.brier-b.brier)[0];

  /* องค์ประกอบไหนสัมพันธ์กับผลจริง */
  const ys = done.map(p => p.result.y);
  const comps = {};
  for (const k of Object.keys(done[0].comps)) {
    const xs = done.map(p => p.comps[k]);
    comps[k] = pearson(xs, ys);
  }

  /* ศาสตร์ไหนทายถูกบ่อย */
  const schools = {};
  if (done[0].schools) {
    for (const k of Object.keys(done[0].schools)) {
      const d2 = decisive.filter(p => p.schools && Math.abs(p.schools[k].a - p.schools[k].b) > 0.01);
      if (!d2.length) { schools[k] = null; continue; }
      const hit = d2.filter(p => ((p.schools[k].a - p.schools[k].b) > 0) === (p.result.y === 1)).length;
      schools[k] = { n: d2.length, hit, pct: hit/d2.length };
    }
  }

  const noise = done.length > 4 ? 1.96 / Math.sqrt(done.length - 3) : 1;
  return { n: done.length, pending: preds.length - done.length, noise,
    omen: { n: decisive.length, hit: omenHit, pct: decisive.length ? omenHit/decisive.length : null },
    noSquad: { n: decNo.length, hit: noSquadHit, pct: decNo.length ? noSquadHit/decNo.length : null },
    homeOnly: { n: decAll.length, hit: homeHit, pct: decAll.length ? homeHit/decAll.length : null },
    bPure, bMixed, sweep, bestRate, comps, schools };
}

/* ═══════════ รวมสถิติกับฤกษ์ ═══════════ */
function OmenElo({ A, B, gap, teams, results, rate, onRate, cA, cB, onSave, saved }) {
  const elo = useMemo(()=>computeElo(results, teams), [results, teams]);
  const ra = elo.rating[A.team.name] ?? ELO_START;
  const rb = elo.rating[B.team.name] ?? ELO_START;
  const pure = eloForecast(elo.rating, A.team.name, B.team.name);
  const shift = Math.max(-OMEN_CAP, Math.min(OMEN_CAP, gap * rate));
  const mixed = eloForecast({ ...elo.rating, [A.team.name]: ra + shift }, A.team.name, B.team.name);

  const Bar = ({ f, dim }) => (
    <div className="flex h-5 rounded-sm overflow-hidden text-[9.5px]"
      style={{ background:"#0E0B09", opacity: dim?0.55:1 }}>
      {[[f.home,cA],[f.draw,"#5A4E44"],[f.away,cB]].map(([v,c],i)=>(
        <div key={i} className="flex items-center justify-center"
          style={{ width:`${v*100}%`, background:c, color:"#141110" }}>
          {v>0.13 ? `${Math.round(v*100)}%` : ""}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ borderTop:"1px solid #2A2320" }}>
      <p className="px-3 pt-2 pb-1 text-[10.5px]" style={{ color:"#6B5D50" }}>
        สถิติเทียบฤกษ์ · Elo {Math.round(ra)} – {Math.round(rb)}
        {results.length ? ` (จาก ${results.length} นัด)` : " (จากความเก่งที่ตั้งไว้)"}
      </p>
      <div className="px-3 pb-2 space-y-1.5">
        <div>
          <p className="text-[10px] mb-1" style={{ color:"#5A4E44" }}>สถิติล้วน</p>
          <Bar f={pure} dim />
        </div>
        <div>
          <p className="text-[10px] mb-1" style={{ color:"#5A4E44" }}>
            รวมฤกษ์ ({gap>0?"+":""}{gap.toFixed(2)} → {shift>0?"+":""}{Math.round(shift)} Elo ให้ {gap>=0?A.team.name:B.team.name})
          </p>
          <Bar f={mixed} />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[10.5px] shrink-0" style={{ color:"#6B5D50" }}>ฤกษ์ 1 แต้ม =</span>
          <input type="range" min="0" max="40" step="5" value={rate}
            onChange={e=>onRate(Number(e.target.value))} className="flex-1" style={{ accentColor:"#8E1418" }} />
          <span className="text-[11.5px] w-12 text-right shrink-0" style={{ color:"#C8A24A" }}>{rate} Elo</span>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color:"#5A4E44" }}>
          แนะนำ 15 · เพดาน ±{OMEN_CAP} Elo เท่ากับความได้เปรียบเจ้าบ้าน · ตั้ง 0 เพื่อดูสถิติล้วน
        </p>
        {onSave && (
          <button onClick={()=>onSave({ ra, rb, pure, mixed })}
            className="w-full py-2 rounded-sm text-[12px] mt-1"
            style={{ background: saved?"#25402F":"#2A2320", color: saved?"#7FCBA3":"#C8A24A" }}>
            {saved ? "บันทึกคำทำนายนัดนี้แล้ว · กดอีกครั้งเพื่อบันทึกทับ" : "บันทึกคำทำนายนัดนี้"}
          </button>
        )}
      </div>
    </div>
  );
}

const Cell = ({ x, align }) => (
  <div className={align==="right" ? "text-right" : ""}>
    <p className="text-[12px] truncate" style={{ color:"#C9BCAB" }}>{x.p.n||x.p.th}</p>
    <div className="flex items-baseline gap-1" style={{ justifyContent: align==="right"?"flex-end":"flex-start" }}>
      <span className="text-[10.5px]" style={{ color:REL_HEX[x.s.relY.key] }}>{x.s.relY.label}</span>
      <span className="text-[11px]" style={{ color: x.s.raw>=1?TONE.good : x.s.raw<=-1?TONE.bad : TONE.mid }}>
        {x.s.raw>0?"+":""}{x.s.raw.toFixed(1)}
      </span>
    </div>
  </div>
);


/* ═══════════ แผงความแม่นยำ ═══════════ */
const COMP_TH = { squad:"ผู้เล่น 11 คน", mgr:"ผู้จัดการ", kit:"สีเสื้อ", harm:"เคมีในทีม",
  triple:"ชุดธาตุรวมพลัง", travel:"เดินทาง", home:"เจ้าบ้าน", season:"ธาตุได้ฤดู", taisui:"ชงปี 太歲" };
const SCHOOL_TH = { bazi:"โป๊ยยี่สี่เถ่ง", thaksa:"ทักษาไทย", thaksa2:"ทักษาไทย + เกณฑ์ใหม่ (ทดลอง)", western:"อาทิตย์-อังคารจร", jianchu:"สิบสองฤกษ์" };

function AccuracyPanel({ predictions, onRemovePredict, onPurge }) {
  const [showRaw, setShowRaw] = useState(false);
  const an = useMemo(()=>analysePredictions(predictions), [predictions]);
  const done = predictions.filter(p=>p.result);

  const copyJson = async () => {
    const txt = JSON.stringify(predictions, null, 1);
    try { await navigator.clipboard.writeText(txt); alert("คัดลอกแล้ว " + predictions.length + " รายการ"); }
    catch { setShowRaw(true); }
  };

  if (!predictions.length) return (
    <div className="rounded-sm p-3" style={{ background:"#211B17", border:"1px solid #302823" }}>
      <p className="text-[11px] mb-1" style={{ color:"#C8A24A" }}>ความแม่นยำของแอป</p>
      <p className="text-[11.5px] leading-relaxed" style={{ color:"#6B5D50" }}>
        ยังไม่มีคำทำนายที่บันทึกไว้ — ไปที่แท็บเปรียบเทียบ เลื่อนลงถึงแผง "สถิติเทียบฤกษ์"
        แล้วกดปุ่มบันทึกก่อนเกมเริ่ม พอกรอกผลจริงในหน้านี้ ระบบจะจับคู่ให้เอง
      </p>
    </div>
  );

  const Pct = ({ v }) => <span style={{ color: v==null?"#5A4E44" : v>0.5?TONE.good : v<0.5?TONE.bad : TONE.mid }}>
    {v==null ? "—" : (v*100).toFixed(0)+"%"}</span>;

  return (
    <div className="rounded-sm overflow-hidden" style={{ background:"#211B17", border:"1px solid #302823" }}>
      <p className="px-3 py-2 text-[11px]" style={{ background:"#2A2320", color:"#C8A24A" }}>
        ความแม่นยำของแอป · บันทึกไว้ {predictions.length} นัด รู้ผลแล้ว {done.length}
        {(() => {
          const conf = predictions.filter(p => p.lineupSource === "confirmed").length;
          const other = predictions.length - conf;
          return <><br/><span style={{ color:"#6B5D50" }}>
            บันทึกอัตโนมัติเฉพาะนัดที่ยืนยัน 11 ตัวจริงครบสองทีม
            · จากตัวจริงที่ประกาศ <span style={{ color:"#7FCBA3" }}>{conf}</span> นัด
            {other ? <> · จากรายชื่อคาดการณ์หรือบันทึกเอง <span style={{ color:"#D8A94A" }}>{other}</span></> : null}
          </span></>; })()}
      </p>

      {onPurge && predictions.some(p => p.auto && p.lineupSource !== "confirmed") && (
        <div className="px-3 pb-2">
          <button onClick={onPurge} className="w-full rounded-sm text-[11.5px]"
            style={{ minHeight:"40px", background:"#3A2A10", color:"#D8A94A" }}>
            ลบคำทำนายอัตโนมัติที่ไม่ได้มาจากตัวจริงที่ประกาศ
            ({predictions.filter(p => p.auto && p.lineupSource !== "confirmed").length} รายการ)
          </button>
        </div>
      )}

      {!an ? (
        <p className="px-3 py-3 text-[11.5px]" style={{ color:"#6B5D50" }}>
          บันทึกไว้ {predictions.length} นัด แต่ยังไม่มีนัดไหนรู้ผล กรอกผลการแข่งด้านบนแล้วระบบจะจับคู่ให้
        </p>
      ) : (<>
        {an.n < 20 && (
          <p className="mx-3 mt-2 text-[11px] px-2 py-1.5 rounded-sm" style={{ background:"#3A2A10", color:"#D8A94A" }}>
            มีแค่ {an.n} นัด ตัวเลขทั้งหมดข้างล่างยังเป็นความบังเอิญได้สูง ต้องมีอย่างน้อย 50 นัดถึงจะเริ่มเชื่อได้
          </p>
        )}

        <div className="px-3 py-2.5" style={{ borderTop:"1px solid #2A2320" }}>
          <p className="text-[10.5px] mb-1.5" style={{ color:"#6B5D50" }}>ฤกษ์ชี้ทีมไหน ทีมนั้นชนะจริงไหม (ตัดนัดเสมอออก)</p>
          <p className="text-[15px]"><Pct v={an.omen.pct} />
            <span className="text-[11.5px] ml-2" style={{ color:"#8B7C6C" }}>
              ถูก {an.omen.hit} จาก {an.omen.n} นัด · เดาสุ่มได้ 50%
            </span>
          </p>
        </div>

        <div className="px-3 py-2.5" style={{ borderTop:"1px solid #2A2320" }}>
          <p className="text-[10.5px] mb-1.5" style={{ color:"#6B5D50" }}>คะแนนบรีเออร์ — ยิ่งต่ำยิ่งแม่น</p>
          <div className="flex gap-4">
            <div><p className="text-[10px]" style={{ color:"#5A4E44" }}>สถิติล้วน</p>
              <p className="text-[14px]" style={{ color:"#C9BCAB" }}>{an.bPure.toFixed(4)}</p></div>
            <div><p className="text-[10px]" style={{ color:"#5A4E44" }}>รวมฤกษ์</p>
              <p className="text-[14px]" style={{ color: an.bMixed<an.bPure?TONE.good:TONE.bad }}>{an.bMixed.toFixed(4)}</p></div>
            <div className="flex-1 text-right">
              <p className="text-[10px]" style={{ color:"#5A4E44" }}>ฤกษ์ช่วยหรือทำให้แย่ลง</p>
              <p className="text-[13px]" style={{ color: an.bMixed<an.bPure?TONE.good:TONE.bad }}>
                {an.bMixed<an.bPure ? "ช่วย" : "แย่ลง"} {Math.abs(an.bMixed-an.bPure).toFixed(4)}
              </p>
            </div>
          </div>
        </div>

        <div className="px-3 py-2.5" style={{ borderTop:"1px solid #2A2320" }}>
          <p className="text-[10.5px] mb-1.5" style={{ color:"#6B5D50" }}>
            อัตราแปลง Elo ที่แม่นที่สุดจากข้อมูลจริง = <span style={{ color:"#C8A24A" }}>{an.bestRate.rate}</span>
          </p>
          <div className="flex items-end gap-0.5 h-12">
            {an.sweep.map(x=>{
              const lo = Math.min(...an.sweep.map(y=>y.brier)), hi = Math.max(...an.sweep.map(y=>y.brier));
              const h = hi>lo ? 6 + (1-(x.brier-lo)/(hi-lo))*40 : 24;
              return <div key={x.rate} className="flex-1 rounded-t-sm" title={`${x.rate}: ${x.brier.toFixed(4)}`}
                style={{ height:h, background: x.rate===an.bestRate.rate?"#C8A24A":"#3A302A" }} />;
            })}
          </div>
          <div className="flex justify-between text-[9px] mt-0.5" style={{ color:"#5A4E44" }}>
            <span>0</span><span>20</span><span>40</span>
          </div>
        </div>

        <div className="px-3 py-2.5" style={{ borderTop:"1px solid #2A2320" }}>
          <p className="text-[10.5px] mb-0.5" style={{ color:"#6B5D50" }}>
            องค์ประกอบไหนสัมพันธ์กับผลจริง
          </p>
          <p className="text-[10px] mb-1.5" style={{ color:"#5A4E44" }}>
            เส้นประคือระดับความบังเอิญที่ {an.n} นัด (±{an.noise.toFixed(2)}) — ตัวที่ไม่ล้ำเส้นยังบอกอะไรไม่ได้
          </p>
          {Object.entries(an.comps).filter(([k,v])=>v!=null)
            .sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).map(([k,v])=>(
            <div key={k} className="flex items-center gap-2 py-0.5">
              <span className="text-[11.5px] w-[104px] shrink-0" style={{ color:"#C9BCAB" }}>{COMP_TH[k]||k}</span>
              <div className="flex-1 relative h-2.5 rounded-sm" style={{ background:"#0E0B09" }}>
                <div className="absolute inset-y-0 left-1/2 w-px" style={{ background:"#4A3F38" }} />
                {[-1,1].map(sgn=>(
                  <div key={sgn} className="absolute inset-y-0 w-px"
                    style={{ left:`${50+sgn*an.noise*50}%`, background:"#6B5D50", opacity:.7,
                      backgroundImage:"repeating-linear-gradient(0deg,#6B5D50 0 2px,transparent 2px 4px)" }} />
                ))}
                <div className="absolute inset-y-0 rounded-sm"
                  style={{ background: Math.abs(v)>an.noise ? (v>0?TONE.good:TONE.bad) : "#4A3F38",
                    left: v>=0?"50%":`${50+v*50}%`, width:`${Math.abs(v)*50}%` }} />
              </div>
              <span className="text-[11px] w-11 text-right shrink-0"
                style={{ color: Math.abs(v)>an.noise?(v>0?TONE.good:TONE.bad):"#5A4E44" }}>
                {v>0?"+":""}{v.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="px-3 py-2.5" style={{ borderTop:"1px solid #2A2320" }}>
          <p className="text-[10.5px] mb-0.5" style={{ color:"#6B5D50" }}>ทดลองคู่ขนาน · รวมดวงผู้เล่น เทียบ ตัดออก</p>
          <p className="text-[10px] mb-1.5" style={{ color:"#5A4E44" }}>
            บันทึกทั้งสองแบบทุกนัดโดยอัตโนมัติ ตัดสินเมื่อจบฤดูกาล ไม่ปรับโมเดลระหว่างทาง
          </p>
          {[["รวมดวงผู้เล่น (ปัจจุบัน)", an.omen],
            ["ตัดดวงผู้เล่นออก", an.noSquad],
            ["ทายเจ้าบ้านล้วน ไม่ใช้ฤกษ์", an.homeOnly]].map(([lb,v])=>(
            <div key={lb} className="flex items-baseline gap-2 py-0.5">
              <span className="text-[11.5px] flex-1" style={{ color:"#C9BCAB" }}>{lb}</span>
              <span className="text-[10.5px]" style={{ color:"#5A4E44" }}>{v&&v.n?`${v.hit}/${v.n}`:"—"}</span>
              <span className="text-[12px] w-11 text-right">{v&&v.pct!=null?<Pct v={v.pct} />:<span style={{color:"#5A4E44"}}>—</span>}</span>
            </div>
          ))}
          {an.omen && an.noSquad && an.omen.n>=20 && an.noSquad.n>=20 && (
            <p className="text-[10px] mt-1.5" style={{ color:"#6B5D50" }}>
              ที่ n≈{Math.round((an.omen.n+an.noSquad.n)/2)} ความผันผวนปกติราว ±{(Math.sqrt(0.25/((an.omen.n+an.noSquad.n)/2))*100).toFixed(0)} จุด
              — ความต่างที่น้อยกว่านี้ยังแยกไม่ออก
            </p>
          )}
        </div>

        {Object.values(an.schools).some(Boolean) && (
          <div className="px-3 py-2.5" style={{ borderTop:"1px solid #2A2320" }}>
            <p className="text-[10.5px] mb-1.5" style={{ color:"#6B5D50" }}>ศาสตร์ไหนทายถูกบ่อยกว่ากัน</p>
            {Object.entries(an.schools).filter(([k,v])=>v).map(([k,v])=>(
              <div key={k} className="flex items-baseline gap-2 py-0.5">
                <span className="text-[11.5px] flex-1" style={{ color:"#C9BCAB" }}>{SCHOOL_TH[k]||k}</span>
                <span className="text-[10.5px]" style={{ color:"#5A4E44" }}>{v.hit}/{v.n}</span>
                <span className="text-[12px] w-11 text-right"><Pct v={v.pct} /></span>
              </div>
            ))}
          </div>
        )}
      </>)}

      <div className="px-3 py-2.5 flex gap-2" style={{ borderTop:"1px solid #2A2320" }}>
        <button onClick={copyJson} className="flex-1 py-2 rounded-sm text-[12px]"
          style={{ background:"#2A2320", color:"#C8A24A" }}>คัดลอกข้อมูลดิบ (JSON)</button>
        <button onClick={()=>setShowRaw(!showRaw)} className="px-3 py-2 rounded-sm text-[12px]"
          style={{ background:"#2A2320", color:"#8B7C6C" }}>{showRaw?"ซ่อน":"ดู"}</button>
      </div>

      {showRaw && (
        <textarea readOnly value={JSON.stringify(predictions, null, 1)}
          onClick={e=>e.target.select()}
          className="w-full h-40 px-2 py-2 text-[9px] outline-none"
          style={{ background:"#0E0B09", color:"#8B7C6C", fontFamily:"ui-monospace,monospace", border:"none" }} />
      )}

      <div style={{ borderTop:"1px solid #2A2320" }}>
        {predictions.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(p=>(
          <div key={p.id} className="flex items-center gap-2 px-3 py-1.5" style={{ borderTop:"1px solid #241E1A" }}>
            <span className="text-[10px] w-[58px] shrink-0" style={{ color:"#5A4E44" }}>{p.date}</span>
            <span className="flex-1 text-[11px] truncate" style={{ color:"#C9BCAB" }}>{p.home} พบ {p.away}</span>
            <span className="text-[10.5px] shrink-0" style={{ color: p.gap>0?TONE.good:TONE.bad }}>
              {p.gap>0?"+":""}{p.gap.toFixed(2)}
            </span>
            <span className="text-[10.5px] w-10 text-right shrink-0"
              style={{ color: !p.result ? "#5A4E44" : ((p.gap>0)===(p.result.y===1) && p.result.y!==0.5) ? TONE.good : p.result.y===0.5 ? TONE.mid : TONE.bad }}>
              {p.result ? `${p.result.hg}-${p.result.ag}` : "รอผล"}
            </span>
            <button onClick={()=>onRemovePredict(p.id)} className="text-[11px] shrink-0" style={{ color:"#8E5A54" }}>ลบ</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════ แท็บสถิติ ═══════════ */

/* ═══════════ บันทึกใบเหลือง-ใบแดง ═══════════
   เก็บดิบๆ ไว้ก่อน ยังไม่สร้างดัชนีหรือเกณฑ์ใดๆ
   เพราะถ้าตั้งเกณฑ์จากใบไม่กี่ใบที่มีตอนนี้ ก็คือการฟิตกับข้อมูลเก่าซ้ำรอยเดิม
   ปล่อยให้สะสมก่อน แล้วค่อยดูว่ามีรูปแบบอะไรโผล่ขึ้นมาจริงไหม */
function cardOmen(card, teams, cache) {
  const tm = teams.find(t => t.name === card.team);
  if (!tm) return null;
  const pl = (cache[tm.slug] || []).find(x => (x.n || x.th) === card.player);
  if (!pl || !pl.b) return null;
  /* หาคู่แข่งของวันนั้นเพื่อเอาสนามกับเวลามาตั้งยาม */
  const fx = FIXTURES.find(f => f.date === card.date && (f.home === card.team || f.away === card.team));
  const homeName = fx ? fx.home : card.team;
  const venue = VENUES[homeName];
  const local = localAtVenue(card.date, fx?.time || "21:00", venue?.tz);
  const day = fourPillars(local.date, local.time);
  if (!day) return null;
  const segs = hourSegments(day.d[0], local.time, 115);
  const s = scorePlayer(pl, day, segs);
  if (!s) return null;
  const flags = [];
  for (const [k, nm] of [["relY","นักษัตร×วัน"],["relD","วันเกิด×วัน"],["relT","ไท้ส่วย"],["relM","เดือน"],["relH","ยาม"]]) {
    const rel = s[k]; if (!rel) continue;
    if (/xing/.test(rel.key)) flags.push("刑 " + nm);
    else if (rel.key === "chong") flags.push("沖 " + nm);
  }
  return { raw: s.raw, flags, day };
}


/* ═══════════ ดวงรายคน เทียบ ฟอร์มจริง ═══════════
   การทดสอบที่ตรงประเด็นที่สุด เพราะศาสตร์เราทำนายดวงรายบุคคล ไม่ได้ทำนายผลทีม */
function ratingStudy(ratings, teams, cache) {
  const byMatch = {};
  for (const r of ratings) (byMatch[r.date+"|"+r.home+"|"+r.away] ||= []).push(r);
  const pts = [];
  for (const key of Object.keys(byMatch)) {
    const [date, home, away] = key.split("|");
    const H = teams.find(t=>t.name===home), A = teams.find(t=>t.name===away);
    if (!H || !A || !H.venue) continue;
    const fx = FIXTURES.find(f=>f.date===date && f.home===home);
    const local = localAtVenue(date, fx?.time || "21:00", H.venue.tz);
    const day = fourPillars(local.date, local.time);
    if (!day) continue;
    const segs = hourSegments(day.d[0], local.time, 115);
    for (const row of byMatch[key]) {
      const tm = row.team === home ? H : A;
      const pl = (cache[tm.slug]||[]).find(x=>(x.n||x.th)===row.player);
      if (!pl || !pl.b) continue;
      const sc = scorePlayer(pl, day, segs);
      if (!sc) continue;
      pts.push({ ...row, omen: sc.raw });
    }
  }
  if (pts.length < 4) return { n: pts.length, pts };
  const X = pts.map(p=>p.omen), Y = pts.map(p=>p.rating);
  const mx = X.reduce((a,b)=>a+b,0)/X.length, my = Y.reduce((a,b)=>a+b,0)/Y.length;
  let sn=0, sx=0, sy=0;
  for (let i=0;i<X.length;i++){ sn+=(X[i]-mx)*(Y[i]-my); sx+=(X[i]-mx)**2; sy+=(Y[i]-my)**2; }
  const r = sn/Math.sqrt(sx*sy||1);
  const thr = 1.96/Math.sqrt(X.length-3);
  /* แบ่งดวงเป็นสามกลุ่มแล้วดูฟอร์มเฉลี่ย เข้าใจง่ายกว่าค่า r */
  const sorted = pts.slice().sort((a,b)=>a.omen-b.omen);
  const k = Math.floor(sorted.length/3);
  const band = (arr) => arr.length ? arr.reduce((a,x)=>a+x.rating,0)/arr.length : 0;
  return { n: pts.length, r, thr, sig: Math.abs(r)>thr, pts,
    lo: band(sorted.slice(0,k)), mid: band(sorted.slice(k, sorted.length-k)), hi: band(sorted.slice(-k)),
    loO: sorted.slice(0,k).reduce((a,x)=>a+x.omen,0)/(k||1), hiO: sorted.slice(-k).reduce((a,x)=>a+x.omen,0)/(k||1) };
}

function RatingPanel({ teams, cache, ratings }) {
  const st = useMemo(()=>ratingStudy(ratings, teams, cache), [ratings, teams, cache]);
  if (!st.n) return null;
  const Row = ({ lbl, o, v, col }) => (
    <div className="flex items-baseline gap-2 py-1">
      <span className="text-[11.5px] w-20 shrink-0" style={{ color:"#8B7C6C" }}>{lbl}</span>
      <span className="text-[10.5px] w-16 shrink-0" style={{ color:"#5A4E44" }}>ดวง {o>0?"+":""}{o.toFixed(2)}</span>
      <div className="flex-1 h-2 rounded-sm" style={{ background:"#0E0B09" }}>
        <div className="h-full rounded-sm" style={{ width:`${Math.max(0,Math.min(100,(v-5.5)/2*100))}%`, background:col }} />
      </div>
      <span className="text-[12px] w-9 text-right shrink-0" style={{ color:"#E9E1D0" }}>{v.toFixed(2)}</span>
    </div>
  );
  return (
    <div className="rounded-sm overflow-hidden" style={{ background:"#211B17", border:"1px solid #302823" }}>
      <p className="px-3 py-2 text-[11px]" style={{ background:"#2A2320", color:"#C8A24A" }}>
        ดวงรายคน เทียบ ฟอร์มจริง · {st.n} คน
      </p>
      {st.n < 20 ? (
        <p className="px-3 py-3 text-[11.5px]" style={{ color:"#6B5D50" }}>
          มีแค่ {st.n} คน ยังน้อยเกินกว่าจะคำนวณอะไรได้
        </p>
      ) : (<>
        <div className="px-3 py-2.5" style={{ borderTop:"1px solid #2A2320" }}>
          <p className="text-[10.5px] mb-1.5" style={{ color:"#6B5D50" }}>
            ถ้าศาสตร์ใช้ได้ แท่งล่างต้องสั้นกว่าแท่งบน (ดวงดี = ฟอร์มดี)
          </p>
          <Row lbl="ดวงแย่สุด" o={st.loO} v={st.lo} col="#C0453D" />
          <Row lbl="กลางๆ" o={(st.loO+st.hiO)/2} v={st.mid} col="#8B7C6C" />
          <Row lbl="ดวงดีสุด" o={st.hiO} v={st.hi} col="#4E9C7A" />
          <p className="text-[11px] mt-1.5" style={{ color: st.hi>st.lo ? TONE.good : TONE.bad }}>
            {st.hi > st.lo
              ? `กลุ่มดวงดีฟอร์มสูงกว่ากลุ่มดวงแย่ ${(st.hi-st.lo).toFixed(2)} แต้ม — ไปทางเดียวกับศาสตร์`
              : `กลุ่มดวงดีฟอร์มต่ำกว่ากลุ่มดวงแย่ ${(st.lo-st.hi).toFixed(2)} แต้ม — สวนทางกับศาสตร์`}
          </p>
        </div>
        <div className="px-3 py-2.5" style={{ borderTop:"1px solid #2A2320" }}>
          <p className="text-[10.5px] mb-1" style={{ color:"#6B5D50" }}>สหสัมพันธ์</p>
          <p className="text-[15px]" style={{ color: st.sig ? (st.r>0?TONE.good:TONE.bad) : "#C9BCAB" }}>
            r = {st.r>=0?"+":""}{st.r.toFixed(3)}
            <span className="text-[11px] ml-2" style={{ color:"#8B7C6C" }}>
              เกณฑ์นัยสำคัญ |r| &gt; {st.thr.toFixed(3)} · {st.sig ? "มีนัยสำคัญ" : "ยังไม่มีนัยสำคัญ"}
            </span>
          </p>
        </div>
        <p className="px-3 py-2.5 text-[10.5px] leading-relaxed"
          style={{ borderTop:"1px solid #2A2320", background:"#1A1512", color:"#6B5D50" }}>
          คะแนนฟอร์มมาจาก WhoScored หนึ่งนัดให้ข้อมูล 22 จุด ต่างจากผลแพ้ชนะที่ให้จุดเดียว
          ตัวเลขจึงนิ่งเร็วกว่ามาก · ถ้า r ติดลบอย่างมีนัยสำคัญ แปลว่าคะแนนดวงทำนายกลับด้าน
          ซึ่งก็เป็นข้อมูลที่ใช้ได้เหมือนกัน ไม่ใช่เรื่องเสียหาย
        </p>
      </>)}
    </div>
  );
}

function CardPanel({ teams, cache, cards, onAdd, onRemove }) {
  const [c, setC] = useState({ date: todayISO(), team: "", player: "", minute: "", type: "Y" });
  const tm = teams.find(t => t.name === c.team);
  const squad = tm ? (cache[tm.slug] || []).filter(p => p.pos !== "ผจก.") : [];
  const list = (cards || []).slice().sort((a,b)=> (b.date+String(b.minute).padStart(3,"0")).localeCompare(a.date+String(a.minute).padStart(3,"0")));
  const nR = list.filter(x => x.type !== "Y").length;

  return (
    <div className="rounded-sm overflow-hidden" style={{ background:"#211B17", border:"1px solid #302823" }}>
      <p className="px-3 py-2 text-[11px]" style={{ background:"#2A2320", color:"#C8A24A" }}>
        บันทึกใบเหลือง-ใบแดง · {list.length} ใบ (แดง {nR})
      </p>

      <div className="px-3 py-2.5 space-y-2" style={{ borderBottom:"1px solid #2A2320" }}>
        <div className="flex gap-2">
          <input type="date" value={c.date} onChange={e=>setC({...c,date:e.target.value})}
            className="flex-1 min-w-0 px-2 rounded-sm text-[12px] text-stone-100 outline-none"
            style={{ minHeight:"40px", background:"#171310", border:"1px solid #362D27" }} />
          <select value={c.type} onChange={e=>setC({...c,type:e.target.value})}
            className="px-1.5 rounded-sm text-[11.5px] text-stone-100 outline-none"
            style={{ minHeight:"40px", background:"#171310", border:"1px solid #362D27" }}>
            {CARD_TYPES.map(([v,l])=><option key={v} value={v} style={OPT}>{l}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <select value={c.team} onChange={e=>setC({...c,team:e.target.value,player:""})}
            className="flex-1 min-w-0 px-1.5 rounded-sm text-[11.5px] text-stone-100 outline-none"
            style={{ minHeight:"40px", background:"#171310", border:"1px solid #362D27" }}>
            <option value="" style={OPT}>เลือกทีม</option>
            {sortTeams(teams).map(t=><option key={t.slug} value={t.name} style={OPT}>{t.name}</option>)}
          </select>
          <input value={c.minute} onChange={e=>setC({...c,minute:e.target.value})} inputMode="numeric" placeholder="นาที"
            className="w-16 px-1 rounded-sm text-[12px] text-center text-stone-100 outline-none"
            style={{ minHeight:"40px", background:"#171310", border:"1px solid #362D27" }} />
        </div>
        <select value={c.player} onChange={e=>setC({...c,player:e.target.value})} disabled={!squad.length}
          className="w-full px-1.5 rounded-sm text-[11.5px] text-stone-100 outline-none"
          style={{ minHeight:"40px", background:"#171310", border:"1px solid #362D27", opacity: squad.length?1:0.5 }}>
          <option value="" style={OPT}>{squad.length ? "เลือกผู้เล่น (ตัวจริงหรือตัวสำรองก็ได้)" : "เลือกทีมก่อน"}</option>
          {squad.map(p=><option key={p.id} value={p.n||p.th} style={OPT}>{p.n||p.th} · {p.pos}</option>)}
        </select>
        <button onClick={()=>{ if(c.team && c.player && c.date){
            onAdd({ id:"c"+Date.now(), date:c.date, team:c.team, player:c.player,
                    minute: c.minute===""? null : Number(c.minute), type:c.type });
            setC({...c, player:"", minute:""}); } }}
          className="w-full rounded-sm text-[12.5px]" style={{ minHeight:"42px", background:"#8E1418", color:"#FBF3E2" }}>
          เพิ่มใบ
        </button>
      </div>

      {list.length === 0 ? (
        <p className="px-3 py-3 text-[11px] leading-relaxed" style={{ color:"#6B5D50" }}>
          ยังไม่มีข้อมูล · บันทึกไว้เฉยๆ ก่อน ยังไม่เอาไปคิดคะแนน
          รอสะสมสัก 30-40 ใบ ค่อยดูว่าคนที่ติดสัญญาณ 刑 หรือ 沖 ได้ใบมากกว่าคนที่ไม่ติดจริงไหม
        </p>
      ) : list.map(x => {
        const o = cardOmen(x, teams, cache);
        const col = (CARD_TYPES.find(t=>t[0]===x.type)||[])[2] || "#8B7C6C";
        return (
          <div key={x.id} className="px-3 py-2" style={{ borderTop:"1px solid #241E1A" }}>
            <div className="flex items-baseline gap-2">
              <span className="w-2.5 h-4 rounded-sm shrink-0" style={{ background:col }} />
              <span className="text-[12.5px] flex-1 min-w-0 truncate" style={{ color:"#E9E1D0" }}>{x.player}</span>
              <span className="text-[10.5px] shrink-0" style={{ color:"#6B5D50" }}>
                {x.minute!=null ? x.minute+"'" : ""} · {thDate(x.date)}
              </span>
              <button onClick={()=>onRemove(x.id)} className="text-[12px] shrink-0 px-1" style={{ color:"#5A4E44" }}>✕</button>
            </div>
            <p className="text-[10.5px] mt-0.5" style={{ color:"#6B5D50" }}>
              {x.team}
              {o ? <> · ดวงวันนั้น <span style={{ color: o.raw>0?TONE.good:TONE.bad }}>{o.raw>0?"+":""}{o.raw.toFixed(2)}</span>
                {o.flags.length ? <> · <span style={{ color:"#D8A94A" }}>{o.flags.join(" · ")}</span></> : <> · ไม่มีสัญญาณ 刑/沖</>}</> : " · คำนวณดวงไม่ได้"}
            </p>
          </div>
        );
      })}

      {list.length > 0 && (
        <p className="px-3 py-2.5 text-[10.5px] leading-relaxed"
          style={{ borderTop:"1px solid #2A2320", background:"#1A1512", color:"#6B5D50" }}>
          ตัวเลขดวงข้างบนเป็นข้อมูลประกอบ ยังไม่ได้เอาไปคิดคะแนนหรือสร้างดัชนีใดๆ
          เพราะในหนึ่งนัดมีคนติดสัญญาณ 刑 หรือ 沖 ราวสามในสี่อยู่แล้ว
          การชี้ย้อนหลังว่าคนได้ใบมีสัญญาณจึงไม่ได้พิสูจน์อะไร ต้องรอข้อมูลมากพอแล้วเทียบกับคนที่ไม่ได้ใบ
        </p>
      )}
    </div>
  );
}

function StatsTab({ teams, fx, cache = {}, results, ratings = [], cards = [], onAddCard, onRemoveCard, onAdd, onRemove, predictions = [], onRemovePredict, omenGap = 0 }) {
  const [f, setF] = useState({ date:todayISO(), home:"", away:"", hg:"", ag:"" });
  const names = sortTeams(teams).map(t=>t.name);
  const elo = useMemo(()=>computeElo(results, teams), [results, teams]);
  const model = useMemo(()=>computePoisson(results), [results]);
  const hName = teams.find(t=>t.slug===fx.home)?.name;
  const aName = teams.find(t=>t.slug===fx.away)?.name;
  const ef = hName && aName ? eloForecast(elo.rating, hName, aName) : null;
  const pf = hName && aName ? poissonForecast(model, hName, aName) : null;
  /* ราคาตลาดของนัดนี้ คีย์เป็นวันตามเวลาสนามเหมือนข้อมูลอื่นทั้งหมด */
  const mktKey = hName ? matchKeyDate({ date:fx.date, time:fx.time||"21:00", home:hName }, VENUES) + "|" + hName : null;
  const mkt = mktKey ? marketProbs(ODDS_BY.get(mktKey)) : null;
  const mg  = useMemo(()=> mkt ? marketGrid(mkt) : null, [mktKey, mkt && mkt.pH]);
  const tg  = useMemo(()=> mg ? tiltedGrid(mg, omenGap) : null, [mg, omenGap]);
  const ranked = Object.entries(elo.rating).sort((a,b)=>b[1]-a[1]);

  const Bar = ({ pH, pD, pA }) => (
    <div className="flex h-6 rounded-sm overflow-hidden text-[10px]" style={{ background:"#0E0B09" }}>
      {[[pH,"#4E9C7A"],[pD,"#8B7C6C"],[pA,"#C0453D"]].map(([v,c],i)=>(
        <div key={i} className="flex items-center justify-center"
          style={{ width:`${v*100}%`, background:c, color:"#141110" }}>
          {v>0.12 ? `${Math.round(v*100)}%` : ""}
        </div>
      ))}
    </div>
  );

  return (
    <div className="px-4 space-y-3">
      <div className="rounded-sm p-3" style={{ background:"#211B17", border:"1px solid #302823" }}>
        <p className="text-[11px] mb-2" style={{ color:"#C8A24A" }}>ทำนายคู่ที่เลือกในแท็บเปรียบเทียบ</p>
        {ef ? (<>
          <p className="text-[13px] mb-2" style={{ color:"#E9E1D0" }}>{hName} พบ {aName}</p>
          {results.length < 10 && (
            <p className="text-[11px] mb-2 px-2 py-1.5 rounded-sm" style={{ background:"#3A2A10", color:"#D8A94A" }}>
              มีผลแข่ง {results.length} นัด ตัวเลขยังเชื่อไม่ได้ — ควรใส่อย่างน้อย 30 นัด
            </p>
          )}
          <p className="text-[11px] mb-1" style={{ color:"#8B7C6C" }}>
            Elo {Math.round(ef.ra)} – {Math.round(ef.rb)} (บวกเจ้าบ้าน {ELO_HOME})
          </p>
          <Bar pH={ef.home} pD={ef.draw} pA={ef.away} />
          {pf ? (<>
            <p className="text-[11px] mt-3 mb-1" style={{ color:"#8B7C6C" }}>
              Poisson คาดประตู {pf.lh.toFixed(2)} – {pf.la.toFixed(2)} · สกอร์น่าจะเป็นที่สุด {pf.best.h}–{pf.best.a} ({(pf.best.p*100).toFixed(1)}%)
            </p>
            <Bar pH={pf.pH} pD={pf.pD} pA={pf.pA} />
          </>) : <p className="text-[11px] mt-3" style={{ color:"#6B5D50" }}>Poisson ต้องมีผลแข่งของทั้งสองทีมก่อน</p>}
        </>) : <p className="text-[12px]" style={{ color:"#6B5D50" }}>เลือกสองทีมในแท็บเปรียบเทียบก่อน</p>}
      </div>

      {mg && (
      <div className="rounded-sm p-3" style={{ background:"#211B17", border:"1px solid #302823" }}>
        <p className="text-[11px] mb-1" style={{ color:"#C8A24A" }}>
          ราคาตลาด {mkt.closed ? "(ราคาปิด)" : "(ราคาก่อนเตะ)"}
        </p>
        <p className="text-[10.5px] mb-2" style={{ color:"#6B5D50" }}>
          ส่วนต่างเจ้ามือ {(mkt.margin*100).toFixed(1)}% · ตัดออกแล้ว · วัดย้อนหลัง 89 นัด ตลาดทายตัวเต็งถูก 67.2% โมเดลเรา 60.3%
        </p>
        <Bar pH={mg.pH} pD={mg.pD} pA={mg.pA} />
        <p className="text-[10.5px] mt-2 mb-1" style={{ color:"#8B7C6C" }}>
          ประตูที่ตลาดคาด {mg.lh.toFixed(2)} – {mg.la.toFixed(2)} · สกอร์ที่น่าจะเป็น
        </p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {mg.top.map((c,i)=>(
            <span key={i} className="px-1.5 py-0.5 rounded-sm text-[11px]"
              style={{ background:"#171310", border:"1px solid #362D27", color:i?"#C9BCAB":"#E9E1D0" }}>
              {c.h}–{c.a} <span style={{ color:"#8B7C6C" }}>{(c.p*100).toFixed(1)}%</span>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color:"#C9BCAB" }}>
          <span>เกิน 2.5 ลูก <b>{(mg.over25*100).toFixed(0)}%</b></span>
          <span>ยิงกันทั้งคู่ <b>{(mg.btts*100).toFixed(0)}%</b></span>
          <span>เจ้าบ้านคลีนชีต <b>{(mg.csHome*100).toFixed(0)}%</b></span>
          <span>เยือนคลีนชีต <b>{(mg.csAway*100).toFixed(0)}%</b></span>
        </div>
        {tg && (<>
          <p className="text-[10.5px] mt-3 mb-1" style={{ color:"#8B7C6C" }}>
            เอียงด้วยดวง k={OMEN_TILT_K} (ค่านี้เลือกจากการทดสอบนอกตัวอย่าง เกือบศูนย์เพราะดวงแทบไม่เพิ่มข้อมูลจากตลาด)
          </p>
          <Bar pH={tg.pH} pD={tg.pD} pA={tg.pA} />
          <p className="text-[10.5px] mt-1" style={{ color:"#6B5D50" }}>
            ต่างจากตลาด {((tg.pH-mg.pH)*100>=0?"+":"")}{((tg.pH-mg.pH)*100).toFixed(2)} จุดฝั่งเจ้าบ้าน
          </p>
        </>)}
      </div>
      )}

      <div className="rounded-sm p-3" style={{ background:"#211B17", border:"1px solid #302823" }}>
        <p className="text-[11px] mb-2" style={{ color:"#C8A24A" }}>บันทึกผลการแข่ง</p>
        <div className="space-y-2">
          <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}
            className="w-full px-2 py-2 rounded-sm text-[12.5px] outline-none"
            style={{ background:"#171310", border:"1px solid #362D27", color:"#C8A24A" }} />
          <div className="flex items-center gap-1.5">
            <select value={f.home} onChange={e=>setF({...f,home:e.target.value})}
              className="flex-1 min-w-0 px-1.5 py-2 rounded-sm text-[11.5px] text-stone-100 outline-none"
              style={{ background:"#171310", border:"1px solid #362D27" }}>
              <option value="" style={OPT}>เจ้าบ้าน</option>
              {names.map(n=><option key={n} value={n} style={OPT}>{n}</option>)}
            </select>
            <input value={f.hg} onChange={e=>setF({...f,hg:e.target.value})} inputMode="numeric" placeholder="0"
              className="w-9 px-1 py-2 rounded-sm text-[13px] text-center text-stone-100 outline-none"
              style={{ background:"#171310", border:"1px solid #362D27" }} />
            <span style={{ color:"#6B5D50" }}>–</span>
            <input value={f.ag} onChange={e=>setF({...f,ag:e.target.value})} inputMode="numeric" placeholder="0"
              className="w-9 px-1 py-2 rounded-sm text-[13px] text-center text-stone-100 outline-none"
              style={{ background:"#171310", border:"1px solid #362D27" }} />
            <select value={f.away} onChange={e=>setF({...f,away:e.target.value})}
              className="flex-1 min-w-0 px-1.5 py-2 rounded-sm text-[11.5px] text-stone-100 outline-none"
              style={{ background:"#171310", border:"1px solid #362D27" }}>
              <option value="" style={OPT}>ทีมเยือน</option>
              {names.map(n=><option key={n} value={n} style={OPT}>{n}</option>)}
            </select>
          </div>
          <button onClick={()=>{ if(f.home && f.away && f.home!==f.away && f.hg!=="" && f.ag!==""){
              onAdd({ id:"g"+Date.now(), date:f.date, home:f.home, away:f.away, hg:Number(f.hg), ag:Number(f.ag) });
              setF({ ...f, hg:"", ag:"" }); } }}
            className="w-full py-2 rounded-sm text-[12.5px]" style={{ background:"#8E1418", color:"#FBF3E2" }}>
            เพิ่มผล
          </button>
        </div>
      </div>

      <RatingPanel teams={teams} cache={cache} ratings={ratings} />

      <CardPanel teams={teams} cache={cache} cards={cards} onAdd={onAddCard} onRemove={onRemoveCard} />

      {ranked.length > 0 && (
        <div className="rounded-sm overflow-hidden" style={{ background:"#211B17", border:"1px solid #302823" }}>
          <p className="px-3 py-2 text-[11px]" style={{ background:"#2A2320", color:"#C8A24A" }}>
            ตาราง Elo ({results.length} นัด)
          </p>
          {ranked.map(([n,v],i)=>(
            <div key={n} className="flex items-center gap-2 px-3 py-1.5" style={{ borderTop:"1px solid #241E1A" }}>
              <span className="w-5 text-[10.5px]" style={{ color:"#5A4E44" }}>{i+1}</span>
              <span className="flex-1 text-[12px] truncate" style={{ color:"#C9BCAB" }}>{n}</span>
              <span className="text-[10.5px] w-10 text-right" style={{ color:"#5A4E44" }}>{elo.played[n]||0} นัด</span>
              <span className="text-[12.5px] w-12 text-right"
                style={{ color: v>ELO_START?TONE.good : v<ELO_START?TONE.bad : TONE.mid }}>{Math.round(v)}</span>
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="rounded-sm overflow-hidden" style={{ background:"#211B17", border:"1px solid #302823" }}>
          <p className="px-3 py-2 text-[11px]" style={{ background:"#2A2320", color:"#C8A24A" }}>ผลที่บันทึกไว้</p>
          {results.slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))).map(g=>(
            <div key={g.id} className="flex items-center gap-2 px-3 py-1.5" style={{ borderTop:"1px solid #241E1A" }}>
              <span className="text-[10px] w-[62px] shrink-0" style={{ color:"#5A4E44" }}>{g.date}</span>
              <span className="flex-1 text-[11.5px] truncate text-right" style={{ color:"#C9BCAB" }}>{g.home}</span>
              <span className="text-[12px] px-1.5 shrink-0" style={{ color:"#C8A24A" }}>{g.hg}–{g.ag}</span>
              <span className="flex-1 text-[11.5px] truncate" style={{ color:"#C9BCAB" }}>{g.away}</span>
              <button onClick={()=>onRemove(g.id)} className="text-[11px] shrink-0" style={{ color:"#8E5A54" }}>ลบ</button>
            </div>
          ))}
        </div>
      )}

      <AccuracyPanel predictions={predictions} onRemovePredict={onRemovePredict} />

      <p className="text-[10.5px] leading-relaxed pb-2" style={{ color:"#6B5D50" }}>
        Elo เริ่มจากความเก่งที่ตั้งไว้ในหน้าจัดการทีม · K={ELO_K} ปรับตามผลต่างประตู · บวกเจ้าบ้าน {ELO_HOME} แต้ม
        · Poisson คำนวณกำลังรุกและกำลังรับจากค่าเฉลี่ยลีก
      </p>
    </div>
  );
}


/* สรุปว่าจัดตัวจริงครบทีมไหนแล้ว ขาดทีมไหน */
function LineupSummary({ teams, onOpen }) {
  const [open, setOpen] = useState(false);
  const all = sortTeams(teams);
  const full    = all.filter(t => (t.lineup?.start?.length || 0) === 11);
  const partial = all.filter(t => { const n = t.lineup?.start?.length || 0; return n > 0 && n < 11; });
  const none    = all.filter(t => !(t.lineup?.start?.length));

  const Group = ({ label, list, color, showCount }) => list.length ? (
    <div className="pt-2">
      <p className="text-[10.5px] mb-1" style={{ color }}>{label} · {list.length} ทีม</p>
      <div className="flex flex-wrap gap-1">
        {list.map(t=>(
          <button key={t.slug} onClick={()=>onOpen(t.slug)}
            className="text-[11px] px-1.5 py-1 rounded-sm"
            style={{ background:"#2A2320", color:"#C9BCAB" }}>
            {t.name}{showCount ? ` ${t.lineup.start.length}/11` : ""}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div className="rounded-sm overflow-hidden" style={{ background:"#211B17", border:"1px solid #302823" }}>
      <button onClick={()=>setOpen(!open)} className="w-full px-3 py-2.5 text-left">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] flex-1" style={{ color:"#C8A24A" }}>จัดตัวจริงแล้วกี่ทีม</span>
          <span className="text-[13px]" style={{ color: full.length===all.length?TONE.good:"#C9BCAB" }}>
            {full.length}/{all.length}
          </span>
          <span className="text-[11px]" style={{ color:"#6B5D50" }}>{open?"▲":"▼"}</span>
        </div>
        <div className="flex h-1.5 rounded-sm overflow-hidden mt-1.5" style={{ background:"#0E0B09" }}>
          <div style={{ width:`${full.length/all.length*100}%`, background:TONE.good }} />
          <div style={{ width:`${partial.length/all.length*100}%`, background:"#C8A24A" }} />
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3" style={{ borderTop:"1px solid #2A2320" }}>
          <Group label="ครบ 11 คน"  list={full}    color={TONE.good} />
          <Group label="ยังไม่ครบ"   list={partial} color="#C8A24A" showCount />
          <Group label="ยังไม่ได้จัด" list={none}    color="#8B7C6C" />
          <p className="text-[10px] mt-2.5 leading-relaxed" style={{ color:"#5A4E44" }}>
            แตะชื่อทีมเพื่อเปิดรายชื่อ · ทีมที่ยังไม่ได้จัด แอปจะคิดคะแนนจากผู้เล่นทั้งทีมแทน
          </p>
        </div>
      )}
    </div>
  );
}


/* ═══════════ แท็บฤดูกาล ═══════════ */
const MON_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const DOW_ABBR = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const thDate = (iso) => { const [y,m,d] = iso.split("-").map(Number);
  const dw = new Date(Date.UTC(y,m-1,d)).getUTCDay();
  return `${DOW_ABBR[dw]} ${d} ${MON_TH[m-1]}`; };

/* ═══ ยูฟ่าแชมเปียนส์ลีก 2026/27 รอบลีกเฟส — นัดที่เหลือของแมนยู (เวลาไทย) ═══ */
const UCL_FIXTURES = [
  [2,"2026-10-14","02:00","Atlético Madrid","Manchester United"],
  [3,"2026-10-21","23:45","Como","Manchester United"],
  [4,"2026-11-04","03:00","Manchester United","AS Roma"],
  [5,"2026-11-26","03:00","Sporting CP","Manchester United"],
  [6,"2026-12-09","03:00","Manchester United","RB Leipzig"],
  [7,"2027-01-21","03:00","Manchester United","Bayern München"],
  [8,"2027-01-28","03:00","Villarreal","Manchester United"],
].map(([md,date,time,home,away]) => ({ md, date, time, home, away, id:`ucl${md}` }));


function SeasonTab({ teams, results, predictions, onPick, fixtures, label }) {
  const FX = fixtures || FIXTURES;
  const today = todayISO();
  const [showPast, setShowPast] = useState(false);
  const [team, setTeam] = useState("");

  const played = new Set((results||[]).map(g=>`${g.date}|${g.home}`));
  const predicted = new Set((predictions||[]).map(p=>`${p.date}|${p.home}`));
  const slugOf = (name) => teams.find(t=>t.name===name)?.slug;

  /* นัดที่แข่งไปแล้วอยู่ในผลการแข่ง ไม่ได้อยู่ในตารางล่วงหน้า จึงต้องรวมเข้ามาเอง */
  const extra = fixtures ? [] : (results||[])
    .filter(g => g && g.home && g.away && !FX.some(f => f.date===g.date && f.home===g.home))
    .map(g => ({ date:g.date, time:"", home:g.home, away:g.away, done:true,
                 id:`r_${g.date}_${g.home}`.replace(/\s+/g,"") }));
  const ALL = [...extra, ...FX].sort((a,b)=>
    a.date===b.date ? String(a.time).localeCompare(String(b.time)) : a.date.localeCompare(b.date));

  const pastCount = ALL.filter(f => f.date < today).length;
  let list = ALL.filter(f => showPast || f.date >= today);
  if (team) list = list.filter(f => f.home===team || f.away===team);

  const days = [];
  for (const f of list) {
    const last = days[days.length-1];
    if (last && last.date === f.date) last.games.push(f);
    else days.push({ date:f.date, games:[f] });
  }

  const kitHex = (name) => { const t = teams.find(x=>x.name===name);
    return (t?.kits || kitsFor(name))?.home?.hex || "#555"; };

  return (
    <div className="px-4 space-y-2">
      <div className="rounded-sm p-3" style={{ background:"#211B17", border:"1px solid #302823" }}>
        <p className="text-[11px] mb-2" style={{ color:"#C8A24A" }}>
          {label || "พรีเมียร์ลีก 2026/27"} · แสดง {list.length} จาก {ALL.length} นัด · เวลาไทย
        </p>
        <select value={team} onChange={e=>setTeam(e.target.value)}
          className="w-full px-2 py-2 rounded-sm text-[12.5px] text-stone-100 outline-none mb-2"
          style={{ background:"#171310", border:"1px solid #362D27" }}>
          <option value="" style={OPT}>ทุกทีม</option>
          {sortTeams(teams).filter(t => !fixtures || FX.some(f=>f.home===t.name||f.away===t.name))
            .map(t=><option key={t.slug} value={t.name} style={OPT}>{t.name}</option>)}
        </select>
        <button onClick={()=>setShowPast(!showPast)} className="w-full py-1.5 rounded-sm text-[11.5px]"
          style={{ background: showPast?"#3A2F26":"#2A2320", color: showPast?"#C8A24A":"#8B7C6C" }}>
          {showPast ? `ซ่อนนัดที่ผ่านไปแล้ว (${pastCount})` : `แสดงนัดที่ผ่านไปแล้วด้วย (${pastCount})`}
        </button>
      </div>

      {days.length === 0 && (
        <p className="text-[12px] py-4 text-center" style={{ color:"#6B5D50" }}>ไม่มีนัดที่ตรงเงื่อนไข</p>
      )}

      {days.map(d=>(
        <div key={d.date} className="rounded-sm overflow-hidden" style={{ background:"#211B17", border:"1px solid #302823" }}>
          <p className="px-3 py-1.5 text-[11px]" style={{ background:"#2A2320", color: d.date===today?"#C8A24A":"#8B7C6C" }}>
            {thDate(d.date)}{d.date===today ? " · วันนี้" : ""}
          </p>
          {d.games.map(g=>{
            const done = played.has(`${g.date}|${g.home}`);
            const pred = predicted.has(`${g.date}|${g.home}`);
            const res = done ? (results||[]).find(r=>r.date===g.date && r.home===g.home) : null;
            return (
              <button key={g.id}
                onClick={()=>onPick({ home:slugOf(g.home), away:slugOf(g.away), date:g.date, time:g.time })}
                className="w-full flex items-center gap-2 px-3 py-2 text-left"
                style={{ borderTop:"1px solid #241E1A", opacity: done?0.5:1 }}>
                <span className="text-[11px] w-10 shrink-0" style={{ color:"#6B5D50" }}>{g.time || "จบ"}</span>
                {g.md && <span className="text-[9.5px] px-1 rounded shrink-0" style={{ background:"#2A2320", color:"#C8A24A" }}>นัด {g.md}</span>}
                <span className="w-1 h-7 rounded-sm shrink-0" style={{ background:kitHex(g.home) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] truncate" style={{ color:"#E9E1D0" }}>{g.home}</p>
                  <p className="text-[12.5px] truncate" style={{ color:"#A79684" }}>{g.away}</p>
                </div>
                {res && <span className="text-[12px] shrink-0" style={{ color:"#8B7C6C" }}>{res.hg}–{res.ag}</span>}
                {pred && <span className="text-[9.5px] px-1 rounded shrink-0" style={{ background:"#25402F", color:"#7FCBA3" }}>ทำนายแล้ว</span>}
                <span className="text-[13px] shrink-0" style={{ color:"#4A3F38" }}>›</span>
              </button>
            );
          })}
        </div>
      ))}

      <p className="text-[10.5px] leading-relaxed pb-2" style={{ color:"#6B5D50" }}>
        แตะคู่ไหนก็ได้เพื่อเปิดในหน้าเปรียบเทียบ พร้อมวันและเวลาที่ตั้งไว้ให้แล้ว
        · เวลาทั้งหมดเป็นเวลาไทย แอปจะแปลงเป็นเวลาสนามเอง
      </p>
    </div>
  );
}

/* ═══════════ แท็บจัดการทีม ═══════════ */

/* ═══════════ สำรองและกู้คืนข้อมูล ═══════════
   เปิดจากไฟล์ในเครื่อง ข้อมูลผูกกับเบราว์เซอร์ตัวนั้น ล้างแคชหรือย้ายเครื่องก็หาย
   จึงต้องมีทางดึงออกเป็นไฟล์และใส่กลับเอง */
const backupKeys = (teams) => [IDX, RESULTS_KEY, PREDICT_KEY, CARDS_KEY, RATINGS_KEY, "bazi:seedv", "bazi:cardseed", "bazi:ratingseed", "bazi:lineupseed",
  ...(teams || []).map(t => teamKey(t.slug))];

function BackupBox({ teams }) {
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);

  const save = async () => {
    try {
      const data = await store.dump(backupKeys(teams));
      const blob = new Blob([JSON.stringify({ app:"duangbon", at:new Date().toISOString(), data }, null, 1)],
        { type:"application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `duangbon-backup-${todayISO()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 4000);
      setMsg(`บันทึกไฟล์สำรองแล้ว ${Object.keys(data).length} รายการ`);
    } catch (e) { setMsg("สำรองไม่สำเร็จ: " + (e?.message || "ไม่ทราบสาเหตุ")); }
  };

  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    try {
      const txt = await f.text();
      const j = JSON.parse(txt);
      const data = j?.data && typeof j.data === "object" ? j.data : j;
      if (!data || typeof data !== "object" || !data[IDX]) { setMsg("ไฟล์นี้ไม่ใช่ไฟล์สำรองของแอป"); return; }
      const n = await store.load(data);
      setMsg(`กู้คืน ${n} รายการแล้ว กำลังโหลดใหม่`);
      setTimeout(()=>window.location.reload(), 700);
    } catch (err) { setMsg("อ่านไฟล์ไม่ได้: " + (err?.message || "ไฟล์เสียหาย")); }
  };

  return (
    <div className="rounded-sm p-3 mt-2" style={{ background:"#211B17", border:"1px solid #302823" }}>
      <p className="text-[11px] mb-1" style={{ color:"#C8A24A" }}>สำรองข้อมูล</p>
      <p className="text-[10.5px] leading-relaxed mb-2" style={{ color:"#6B5D50" }}>
        ตอนนี้บันทึกไว้ที่ {BACKEND_TH[backend] || "ชั่วคราว"} · ข้อมูลผูกกับเบราว์เซอร์เครื่องนี้เท่านั้น
        ถ้าล้างข้อมูลเว็บหรือย้ายเครื่องจะหาย ควรดึงออกเป็นไฟล์เก็บไว้เป็นระยะ
      </p>
      <div className="flex gap-2">
        <button onClick={save} className="flex-1 rounded-sm text-[12px]" style={{ minHeight:"44px", background:"#2A2320", color:"#E9E1D0" }}>
          ดึงออกเป็นไฟล์
        </button>
        <button onClick={()=>fileRef.current?.click()} className="flex-1 rounded-sm text-[12px]" style={{ minHeight:"44px", background:"#2A2320", color:"#E9E1D0" }}>
          ใส่ไฟล์กลับคืน
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={pick} style={{ display:"none" }} />
      {msg && <p className="text-[11px] mt-2" style={{ color:"#D8A94A" }}>{msg}</p>}
    </div>
  );
}

function TeamsTab({ teams, cache, onAdd, onOpen, onMeta, onSync }) {
  const [name, setName] = useState("");
  const [openVenue, setOpenVenue] = useState(null);
  const missing = Object.keys(PRESETS).filter(n => !teams.some(t => t.name === n));

  return (
    <div className="px-4 space-y-2">
      <LineupSummary teams={teams} onOpen={onOpen} />
      <BackupBox teams={teams} />

      <p className="text-[10.5px] leading-relaxed px-1 pb-1" style={{ color:"#6B5D50" }}>
        ความเก่ง 1-10 คือแต้ม Elo ตั้งต้นของทีม ใช้ตอนยังไม่มีผลแข่งในระบบ
        พอกรอกผลในแท็บสถิติแล้ว Elo จะปรับตัวเองจากผลจริงแทน
      </p>

      {missing.length > 0 && (
        <button onClick={onSync} className="w-full py-2 rounded-sm text-[12px]"
          style={{ background:"#3A2A10", color:"#D8A94A" }}>
          เพิ่มทีมที่ยังขาดอีก {missing.length} ทีม
        </button>
      )}

      {sortTeams(teams).map(t=>{
        const pl = cache[t.slug]||[];
        const done = pl.filter(p=>p.b).length;
        const kits = t.kits || kitsFor(t.name);
        const hex = kits?.home?.hex || kitById(t.kit).hex;
        return (
          <div key={t.slug} className="rounded-sm p-3" style={{ background:"#211B17", border:"1px solid #302823" }}>
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-sm shrink-0 border"
                style={{ background:hex, borderColor:"rgba(255,255,255,.15)" }} />
              <button onClick={()=>onOpen(t.slug)} className="flex-1 text-left min-w-0">
                <p className="text-[14px] text-stone-100 truncate">{t.name}</p>
                <p className="text-[11px]" style={{ color:"#6B5D50" }}>
                  {pl.length} คน · มีวันเกิด {done}{t.lineup?.start?.length ? ` · จัดตัวแล้ว ${t.lineup.start.length}/11` : ""}
                </p>
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop:"1px solid #2A2320" }}>
              <span className="text-[10.5px] shrink-0" style={{ color:"#6B5D50" }}>ความเก่ง</span>
              <input type="range" min="1" max="10" step="1" value={t.strength ?? 5}
                onChange={e=>onMeta(t.slug,{ strength:Number(e.target.value) })}
                className="flex-1" style={{ accentColor:"#8E1418" }} />
              <span className="text-[11.5px] w-6 text-center shrink-0" style={{ color:"#C8A24A" }}>{t.strength ?? 5}</span>
              <span className="text-[10px] w-14 text-right shrink-0" style={{ color:"#5A4E44" }}>
                {strengthToElo(t.strength)} Elo
              </span>
            </div>

            <button onClick={()=>setOpenVenue(openVenue===t.slug?null:t.slug)}
              className="w-full mt-2 pt-2 text-left text-[10.5px]"
              style={{ borderTop:"1px solid #2A2320", color:"#6B5D50" }}>
              สนาม {t.venue?.name || "ยังไม่ระบุ"} {openVenue===t.slug ? "▲" : "▼"}
            </button>
            {openVenue===t.slug && (
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                <F label="ชื่อสนาม" value={t.venue?.name||""}
                  onChange={e=>onMeta(t.slug,{ venue:{...(t.venue||{tz:"Europe/London"}), name:e.target.value} })} />
                <F label="ละติจูด" value={t.venue?.lat??""} inputMode="decimal"
                  onChange={e=>onMeta(t.slug,{ venue:{...(t.venue||{tz:"Europe/London"}), lat:e.target.value} })} />
                <F label="ลองจิจูด" value={t.venue?.lng??""} inputMode="decimal"
                  onChange={e=>onMeta(t.slug,{ venue:{...(t.venue||{tz:"Europe/London"}), lng:e.target.value} })} />
              </div>
            )}
          </div>
        );
      })}

      <div className="rounded-sm p-3 mt-1" style={{ background:"#1C1714", border:"1px dashed #3A302A" }}>
        <p className="text-[11px] mb-2" style={{ color:"#6B5D50" }}>เพิ่มทีมเอง</p>
        <div className="flex gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="ชื่อทีม"
            className="flex-1 px-2.5 py-2 rounded-sm text-[13px] text-stone-100 outline-none"
            style={{ background:"#171310", border:"1px solid #362D27" }} />
          <button onClick={()=>{ if(name.trim()){ onAdd(name.trim(), PRESETS[name.trim()] ? name.trim() : null); setName(""); } }}
            className="px-4 py-2 rounded-sm text-[12.5px]" style={{ background:"#8E1418", color:"#FBF3E2" }}>เพิ่ม</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ ตัวแก้ไขรายชื่อ ═══════════ */
function SquadEditor({ team, players, day, onSave, onMeta, onDelete, onClose }) {
  const [list, setList] = useState(players);
  const [open, setOpen] = useState(null);
  const [draft, setDraft] = useState(null);
  useEffect(()=>{ setList(players); }, [players]);

  const commit = (next) => { setList(next); onSave(next); };
  const rows = list.map(p=>({ p, s: scorePlayer(p, day, null) }))
    .sort((a,b)=>(b.s?.raw ?? -99)-(a.s?.raw ?? -99));

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto" style={{ background:"#171310" }}>
      <div className="max-w-md mx-auto pb-24">
        <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-2"
          style={{ background:"#171310", borderBottom:"1px solid #2A2320" }}>
          <button onClick={onClose} className="text-[13px]" style={{ color:"#C8A24A" }}>‹ กลับ</button>
          <p className="flex-1 text-center text-[14px] text-stone-100 truncate">{team?.name}</p>
          <button onClick={()=>setDraft({ n:"", th:"", pos:"MF", b:"", time:"", ok:true })}
            className="text-[13px]" style={{ color:"#C8A24A" }}>เพิ่ม</button>
        </div>

        <div className="px-4 pt-3 space-y-2">
          {rows.map(({p,s})=>(
            <div key={p.id} className="rounded-sm overflow-hidden" style={{ background:"#211B17", border:"1px solid #302823" }}>
              <button onClick={()=>setOpen(open===p.id?null:p.id)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
                <span className="text-[10px] w-8 shrink-0 text-center py-0.5 rounded"
                  style={{ background:"#2A2320", color:"#8B7C6C" }}>{p.pos}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] text-stone-100 truncate">{p.n||p.th}</p>
                  <p className="text-[11px] truncate" style={{ color:"#6B5D50" }}>
                    {p.b||"ยังไม่มีวันเกิด"}{s&&` · ปี${ZODIAC[s.pil.y[1]]}`}
                  </p>
                </div>
                {s && (
                  <div className="text-right shrink-0">
                    <div style={{ fontFamily:"'Songti SC','Noto Serif SC',serif", fontSize:"18px", color:"#C8A24A", lineHeight:1 }}>
                      {gz(s.pil.d)}
                    </div>
                    <span className="text-[10px]" style={{ color:REL_HEX[s.relY.key] }}>{s.relY.label}</span>
                  </div>
                )}
              </button>

              {open===p.id && (
                <div className="px-3 pb-3" style={{ borderTop:"1px solid #302823" }}>
                  {s && (<>
                    <div className="grid grid-cols-4 gap-1.5 my-2">
                      {[["ปี",s.pil.y],["เดือน",s.pil.m],["วัน",s.pil.d],["ยาม",s.pil.h]].map(([lab,pr])=>(
                        <div key={lab} className="text-center rounded-sm py-2" style={{ background:"#1A1512" }}>
                          <p className="text-[10px] mb-1" style={{ color:"#5A4E44" }}>{lab}</p>
                          {pr?(<>
                            <div style={{ fontFamily:"'Songti SC','Noto Serif SC',serif", fontSize:"20px", lineHeight:1.1, color:EL_HEX[STEM_EL[pr[0]]] }}>{STEMS[pr[0]]}</div>
                            <div style={{ fontFamily:"'Songti SC','Noto Serif SC',serif", fontSize:"20px", lineHeight:1.1, color:EL_HEX[BRANCH_EL[pr[1]]] }}>{BRANCHES[pr[1]]}</div>
                          </>):<p className="text-[10px] py-3" style={{ color:"#4A3F38" }}>ไม่ทราบ<br/>เวลา</p>}
                        </div>
                      ))}
                    </div>
                    <div className="text-[11.5px] space-y-1" style={{ color:"#A79684" }}>
                      <p>นักษัตร <span className="text-stone-200">{ZODIAC_FULL[s.pil.y[1]]} ({ZODIAC[s.pil.y[1]]})</span> · ธาตุประจำตัว <span className="text-stone-200">{EL[s.myEl]}</span>{s.elNote&&` · ${s.elNote}`}</p>
                      <p>ปีเกิดกับวันแข่ง <span style={{color:REL_HEX[s.relY.key]}}>{s.relY.label}</span> · วันเกิดกับวันแข่ง <span style={{color:REL_HEX[s.relD.key]}}>{s.relD.label}</span></p>
                      <p>ธาตุซ่อนในกิ่งวัน <span className="text-stone-200">{HIDDEN[s.pil.d[1]].map(x=>STEMS[x]+"("+EL[STEM_EL[x]]+")").join(" ")}</span></p>
                      {p.src && <p style={{ color:"#5A4E44" }}>ที่มา: {p.src}</p>}
                    </div>
                  </>)}
                  <div className="flex gap-2 mt-3">
                    <button onClick={()=>commit(list.map(x=>x.id===p.id?{...x,ok:!x.ok}:x))}
                      className="flex-1 py-1.5 rounded-sm text-[12px]"
                      style={{ background:p.ok?"#25402F":"#2A2320", color:p.ok?"#7FCBA3":"#A79684" }}>
                      {p.ok?"ยืนยันแล้ว":"ทำเครื่องหมายว่าตรวจแล้ว"}
                    </button>
                    <button onClick={()=>setDraft(p)} className="px-4 py-1.5 rounded-sm text-[12px]"
                      style={{ background:"#2A2320", color:"#C8A24A" }}>แก้ไข</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button onClick={onDelete} className="w-full mt-4 py-2 rounded-sm text-[12px]"
            style={{ background:"#2A1416", color:"#B04A44" }}>
            ลบทีม {team?.name} ทั้งชุด
          </button>
        </div>
      </div>

      {draft && (
        <PlayerSheet p={draft} onClose={()=>setDraft(null)}
          onSave={(np)=>{
            const exists = list.some(x=>x.id===np.id);
            commit(exists ? list.map(x=>x.id===np.id?np:x) : [...list, {...np, id: playerId(np.n||np.th)}]);
            setDraft(null);
          }}
          onRemove={list.some(x=>x.id===draft.id) ? ()=>{ commit(list.filter(x=>x.id!==draft.id)); setDraft(null); } : null} />
      )}
    </div>
  );
}

function PlayerSheet({ p, onClose, onSave, onRemove }) {
  const [f, setF] = useState({ ...p });
  const set = (k)=>(e)=>setF({ ...f, [k]:e.target.value });
  const pv = f.b ? fourPillars(f.b, f.time||null) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background:"rgba(0,0,0,.75)" }} onClick={onClose}>
      <div className="w-full max-w-md mx-auto rounded-t-lg p-4 pb-8" style={{ background:"#211B17" }} onClick={e=>e.stopPropagation()}>
        <h3 className="text-stone-100 text-[15px] mb-3">ข้อมูลผู้เล่น</h3>
        <div className="space-y-2.5">
          <F label="ชื่อ" value={f.n||""} onChange={set("n")} placeholder="Bruno Fernandes" />
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] block mb-1" style={{ color:"#6B5D50" }}>ตำแหน่ง</label>
              <select value={f.pos} onChange={set("pos")}
                className="w-full px-2.5 py-2 rounded-sm text-[13px] text-stone-100 outline-none"
                style={{ background:"#171310", border:"1px solid #362D27" }}>
                {["ผจก.","GK","DF","MF","FW"].map(o=><option key={o} value={o} style={OPT}>{o}</option>)}
              </select>
            </div>
            <F label="วันเกิด" type="date" value={f.b||""} onChange={set("b")} />
          </div>
        </div>
        {pv && (
          <p className="mt-3 p-2.5 rounded-sm text-[12px] text-stone-200" style={{ background:"#171310" }}>
            {gz(pv.y)} {gz(pv.m)} {gz(pv.d)} · ปี{ZODIAC[pv.y[1]]}
          </p>
        )}
        <div className="flex gap-2 mt-4">
          {onRemove && <button onClick={onRemove} className="px-4 py-2.5 rounded-sm text-[13px]" style={{ background:"#3A1416", color:"#E0574C" }}>ลบ</button>}
          <button onClick={onClose} className="flex-1 py-2.5 rounded-sm text-[13px]" style={{ background:"#2A2320", color:"#A79684" }}>ยกเลิก</button>
          <button onClick={()=>onSave(f)} className="flex-1 py-2.5 rounded-sm text-[13px]" style={{ background:"#8E1418", color:"#FBF3E2" }}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}
