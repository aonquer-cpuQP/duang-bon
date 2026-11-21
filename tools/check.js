#!/usr/bin/env node
/* ตรวจแอปหลัง build — เปิด duang-bon.html จริงด้วย Playwright ทั้งธีมสว่างและมืด
   ใช้:  node tools/check.js [--home "Liverpool" --away "Manchester United" --date 2026-11-22 --time 23:30]
                             [--expect "ชื่อ1;ชื่อ2"]   ชื่อที่ต้องเห็นในหน้า (เช่นตัวจริงที่เพิ่งใส่)
   --date/--time เป็นวันและเวลาไทยตาม FIXTURES
   หาช่องเลือกจากตัวเลือกข้างใน ไม่พึ่งลำดับ และกางทุกหัวข้อที่พับไว้ก่อนอ่านข้อความ
   ออก 0 = ผ่าน · 1 = มี error หรือหัวข้อ/ชื่อที่คาดว่าต้องเห็นหายไป */
const path = require('path');
const { chromium } = require('playwright');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const HOME = arg('home', 'Manchester United'), AWAY = arg('away', 'Aston Villa');
const DATE = arg('date', ''), TIME = arg('time', '');
const EXPECT = (arg('expect', '') || '').split(';').map(s => s.trim()).filter(Boolean);
const FILE = 'file://' + path.resolve(__dirname, '..', 'duang-bon.html');
const HEADINGS = ['สรุปนัดนี้', 'คะแนนแต่ละศาสตร์', 'ใบเหลือง-แดง และเตะมุม', 'ปัจจัยรายด้าน', 'ตัวจริง 11 คน',
  'Elo และบันทึกคำทำนาย', 'ผู้จัดการทีม', 'วันและฤกษ์', 'อัตราต่อรองเต็ม', 'รายละเอียดแต่ละศาสตร์'];

async function selectsWith(p, pred) {
  const out = [];
  for (const s of await p.$$('select')) {
    const opts = await s.$$eval('option', os => os.map(o => o.textContent.trim()));
    if (pred(opts)) out.push(s);
  }
  return out;
}

(async () => {
  const b = await chromium.launch();
  let bad = 0;
  for (const scheme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: 400, height: 860 }, colorScheme: scheme });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(FILE); await p.waitForTimeout(1200);
    const isTeam = o => o.includes('Aston Villa') && o.includes('Liverpool');
    await (await selectsWith(p, isTeam))[0].selectOption({ label: HOME }); await p.waitForTimeout(400);
    await (await selectsWith(p, isTeam))[1].selectOption({ label: AWAY }); await p.waitForTimeout(600);
    if (DATE) { await (await p.$('input[type=date]')).fill(DATE); await p.waitForTimeout(700); }
    if (TIME) {
      const [hh, mm] = TIME.split(':');
      const h = (await selectsWith(p, o => o.includes('23') && o.includes('00') && !o.includes('45')))[0];
      if (h) await h.selectOption(hh);
      const m = (await selectsWith(p, o => o.includes('30') && o.includes('45')))[0];
      if (m) await m.selectOption(mm);
      await p.waitForTimeout(1200);
    }
    await p.$$eval('details', ds => ds.forEach(d => { d.open = true; }));
    await p.waitForTimeout(500);
    const txt = await p.evaluate(() => document.body.innerText);
    const miss = HEADINGS.filter(h => !txt.includes(h));
    if (!/คาดผลจาก(ราคาต่อรอง|สถิติ)/.test(txt)) miss.push('คาดผลจาก…');
    const notSeen = EXPECT.filter(n => !txt.includes(n));
    for (const t of ['ฤดูกาล', 'UCL', 'สถิติ', 'จัดการทีม', 'เปรียบเทียบ']) {
      await p.locator('nav button', { hasText: t }).first().click(); await p.waitForTimeout(500);
    }
    const ok = !errs.length && !miss.length && !notSeen.length;
    if (!ok) bad++;
    console.log(`${scheme}: ${ok ? 'ผ่าน' : 'ไม่ผ่าน'} · error ${errs.length}` +
      (errs.length ? ' → ' + errs.slice(0, 3).join(' | ') : '') +
      (miss.length ? ` · หัวข้อหาย: ${miss.join(', ')}` : '') +
      (notSeen.length ? ` · ไม่เห็นชื่อ: ${notSeen.join(', ')}` : ''));
    await p.close();
  }
  await b.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('ตรวจไม่สำเร็จ:', e.message); process.exit(1); });
