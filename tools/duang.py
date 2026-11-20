#!/usr/bin/env python3
"""เครื่องมืออัพเดทข้อมูลแอปดวงบอล — ใช้ทั้งตอนสั่งในแชทและงานอัตโนมัติ

  python3 -I tools/duang.py sync-fixtures [--days 21]   แก้วัน/เวลาใน FIXTURES ให้ตรงตารางจริง
  python3 -I tools/duang.py upcoming --from 10 --to 70  นัดที่จะเตะในอีก N นาที (ออก 0 = มี, 3 = ไม่มี)
  python3 -I tools/duang.py prematch-odds               ราคาก่อนเตะจาก fixtures.csv (มักอัพเดทช้า)
  python3 -I tools/duang.py results [--days 10]         ผล + ราคาปิด + เตะมุม/ใบ + เก็บตัวจริงเป็นประวัติรายนัด
  python3 -I tools/duang.py round-status                รอบล่าสุดจบครบหรือยัง
  python3 -I tools/duang.py set-lineup --team T --date วันสนาม --kit home|away|third --players "a;b;...(11)" [--predicted]

เวลา: livescore /0 ให้ Esd เป็น UTC · วันสนาม (คีย์ SEED_*) = วันที่ UTC เพราะพรีเมียร์ลีกเตะ 11:00–20:15 UTC
เสมอ · FIXTURES ในแอปเก็บเวลาไทย = UTC+7 (ไทยไม่มีเวลาออมแสง)
"""
import argparse, csv, datetime as dt, io, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSX = os.path.join(ROOT, "bazi-football.jsx")
LS = "https://prod-cdn-public-api.livescore.com/v1/api/app/date/soccer/{d}/0"
FD_E0 = "https://football-data.co.uk/mmz4281/2627/E0.csv"      # ห้ามใส่ www. — proxy ปฏิเสธ
FD_FIX = "https://football-data.co.uk/fixtures.csv"
BKK = dt.timedelta(hours=7)

LS_NAME = {"AFC Bournemouth": "Bournemouth"}
E0_NAME = {"Man United": "Manchester United", "Man City": "Manchester City",
           "Nott'm Forest": "Nottingham Forest", "Tottenham": "Tottenham Hotspur",
           "Newcastle": "Newcastle United", "Leeds": "Leeds United", "Ipswich": "Ipswich Town",
           "Hull": "Hull City", "Coventry": "Coventry City"}
NOT_PLAYED = ("Postp", "Canc", "Aband", "Susp")

# ── บล็อกข้อมูลในซอร์ส: (หัว, ท้าย) ──
BLOCK = {
    "FIXTURES": ("const FIXTURES = [\n", "\n].map(([date,time,home,away])"),
    "RESULTS":  ("const SEED_RESULTS = [\n", "\n].map(([date,home,hg,ag,away])"),
    "ODDS":     ("const SEED_ODDS = [\n", "\n].map(([date, home, away, oH"),
    "SIDE":     ("const SEED_SIDE = [\n", "\n].map(([date, home, away, hc"),
    "XI":       ("const SEED_XI = {\n", "\n};"),
    "LINEUPS":  ("const SEED_LINEUPS = {\n", "\n};"),
}


def fetch(url):
    r = subprocess.run(["curl", "-sSL", "--max-time", "45", "--fail", url], capture_output=True)
    if r.returncode:
        sys.exit(f"ดึงไม่ได้: {url}\n{r.stderr.decode(errors='replace')[-300:]}")
    return r.stdout


def src():
    return open(JSX, encoding="utf-8").read()


def span(s, name):
    head, tail = BLOCK[name]
    a = s.index(head) + len(head)
    b = s.index(tail, a)
    return a, b


def save(s):
    open(JSX, "w", encoding="utf-8").write(s)


def pl_teams(s):
    a, b = span(s, "FIXTURES")
    return {t for row in re.findall(r'\["[^"]+","[^"]+","([^"]+)","([^"]+)"\]', s[a:b]) for t in row}


def ls_name(n, teams):
    n = LS_NAME.get(n, n)
    if n not in teams:
        sys.exit(f"ชื่อทีมจาก livescore ไม่ตรงกับแอป: {n!r} — เพิ่มใน LS_NAME")
    return n


def e0_name(n, teams):
    n = E0_NAME.get(n, n)
    if n not in teams:
        sys.exit(f"ชื่อทีมจาก football-data ไม่ตรงกับแอป: {n!r} — เพิ่มใน E0_NAME")
    return n


def ls_events(days_back, days_fwd, teams):
    """นัดพรีเมียร์ลีกอังกฤษจาก livescore — กรอง Cnm ด้วย เพราะ Snm อย่างเดียวติดลีกยูเครน"""
    today = dt.datetime.now(dt.timezone.utc).date()
    out = {}
    for k in range(-days_back, days_fwd + 1):
        d = (today + dt.timedelta(days=k)).strftime("%Y%m%d")
        D = json.loads(fetch(LS.format(d=d)))
        for st in D.get("Stages", []):
            if st.get("Cnm") != "England" or st.get("Snm") != "Premier League":
                continue
            for ev in st.get("Events", []):
                utc = dt.datetime.strptime(str(ev["Esd"])[:12], "%Y%m%d%H%M")
                h = ls_name(ev["T1"][0]["Nm"], teams)
                a = ls_name(ev["T2"][0]["Nm"], teams)
                tr1, tr2 = ev.get("Tr1"), ev.get("Tr2")
                out[(h, a)] = dict(home=h, away=a, utc=utc, venue=utc.strftime("%Y-%m-%d"),
                                   bkk=utc + BKK, eps=str(ev.get("Eps", "")),
                                   hg=int(tr1) if str(tr1).isdigit() else None,
                                   ag=int(tr2) if str(tr2).isdigit() else None)
    return list(out.values())


# ─────────────────────────────── คำสั่ง ───────────────────────────────

def cmd_sync_fixtures(a):
    s = src(); teams = pl_teams(s)
    evs = ls_events(0, a.days, teams)
    fa, fb = span(s, "FIXTURES")
    body = s[fa:fb]
    changed, missing, skipped = [], [], []
    for e in evs:
        if any(x in e["eps"] for x in NOT_PLAYED):
            skipped.append(f'{e["home"]} v {e["away"]} ({e["eps"]})'); continue
        nd, nt = e["bkk"].strftime("%Y-%m-%d"), e["bkk"].strftime("%H:%M")
        pat = re.compile(r'\["(\d{4}-\d{2}-\d{2})","(\d{2}:\d{2})","%s","%s"\]'
                         % (re.escape(e["home"]), re.escape(e["away"])))
        m = pat.search(body)
        if not m:
            missing.append(f'{e["home"]} v {e["away"]}'); continue
        if (m.group(1), m.group(2)) != (nd, nt):
            body = body[:m.start()] + f'["{nd}","{nt}","{e["home"]}","{e["away"]}"]' + body[m.end():]
            changed.append(f'{e["home"]} v {e["away"]}: {m.group(1)} {m.group(2)} → {nd} {nt}')
    if changed:
        save(s[:fa] + body + s[fb:])
    print(f"ตรวจ {len(evs)} นัดในอีก {a.days} วัน · แก้ {len(changed)} · ไม่พบในแอป {len(missing)} · เลื่อน/ยกเลิก {len(skipped)}")
    for x in changed: print("  แก้   ", x)
    for x in missing: print("  ไม่พบ ", x)
    for x in skipped: print("  ข้าม  ", x)


def cmd_upcoming(a):
    s = src(); teams = pl_teams(s)
    now = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)
    evs = [e for e in ls_events(0, 1, teams)
           if e["eps"] == "NS" and dt.timedelta(minutes=a.frm) < e["utc"] - now <= dt.timedelta(minutes=a.to)]
    # เทียบกับตารางในแอป ถ้าไม่ตรงให้รายงาน (งานอัตโนมัติจะสั่ง sync-fixtures แก้ให้)
    fa, fb = span(s, "FIXTURES")
    for e in sorted(evs, key=lambda e: e["utc"]):
        nd, nt = e["bkk"].strftime("%Y-%m-%d"), e["bkk"].strftime("%H:%M")
        inapp = f'["{nd}","{nt}","{e["home"]}","{e["away"]}"]' in s[fa:fb]
        mins = int((e["utc"] - now).total_seconds() // 60)
        print(f'{nd} {nt} ไทย | วันสนาม {e["venue"]} | {e["home"]} v {e["away"]} | อีก {mins} นาที'
              + ("" if inapp else " | ตารางในแอปยังไม่ตรง"))
    if not evs:
        print("ไม่มีนัดพรีเมียร์ลีกในช่วงเวลานี้"); sys.exit(3)


def odds_row(date, h, a, r, pre):
    k = (["AvgH", "AvgD", "AvgA", "Avg>2.5", "Avg<2.5", "AHh", "AvgAHH", "AvgAHA"] if pre else
         ["AvgCH", "AvgCD", "AvgCA", "AvgC>2.5", "AvgC<2.5", "AHCh", "AvgCAHH", "AvgCAHA"])
    v = [(r.get(x) or "").strip() for x in k]
    if not all(v[:3]):
        return None
    v = [x if x not in ("", "NA") else "null" for x in v]
    return f'  ["{date}","{h}","{a}",{",".join(v)}],'


def upsert_rows(s, block, rows):
    """ใส่แถวใหม่ไว้บนสุด ถ้าคีย์ date|home ซ้ำให้แทนแถวเดิม"""
    a, b = span(s, block)
    body = s[a:b]
    for key, line in rows:
        pat = re.compile(r'\n?  \["%s","%s",[^\n]*\],' % (re.escape(key[0]), re.escape(key[1])))
        body = pat.sub("", body, count=1).lstrip("\n")
        body = line + "\n" + body
    return s[:a] + body + s[b:]


def cmd_prematch_odds(a):
    s = src(); teams = pl_teams(s)
    rows = list(csv.DictReader(io.StringIO(fetch(FD_FIX).decode("utf-8-sig"))))
    e0 = [r for r in rows if r.get("Div") == "E0"]
    if not e0:
        days = sorted({r.get("Date") for r in rows})
        print(f"fixtures.csv ยังไม่มีพรีเมียร์ลีก (มีวันที่ {days[0] if days else '-'}–{days[-1] if days else '-'}) — ไม่มีราคาก่อนเตะ")
        sys.exit(3)
    up = []
    for r in e0:
        d, m, y = r["Date"].split("/"); date = f"{y}-{m}-{d}"
        h, x = e0_name(r["HomeTeam"], teams), e0_name(r["AwayTeam"], teams)
        line = odds_row(date, h, x, r, pre=True)
        if line: up.append(((date, h), line)); print("  ราคาก่อนเตะ", date, h, "v", x, "|", r["AvgH"], r["AvgD"], r["AvgA"])
    save(upsert_rows(s, "ODDS", up))
    print(f"ใส่ราคาก่อนเตะ {len(up)} นัด (หลังจบนัด คำสั่ง results จะแทนด้วยราคาปิด)")


def cmd_results(a):
    s = src(); teams = pl_teams(s)
    ra, rb = span(s, "RESULTS")
    have = set(re.findall(r'\["(\d{4}-\d{2}-\d{2})","([^"]+)",\d+,\d+,"', s[ra:rb]))
    evs = [e for e in ls_events(a.days, 0, teams) if e["eps"] in ("FT", "AET", "AP") and e["hg"] is not None]
    new = [e for e in evs if (e["venue"], e["home"]) not in have]
    for e in sorted(new, key=lambda e: e["utc"], reverse=True):
        line = f'  ["{e["venue"]}","{e["home"]}",{e["hg"]},{e["ag"]},"{e["away"]}"],'
        ra, rb = span(s, "RESULTS")
        s = s[:ra] + line + "\n" + s[ra:]
        print("  ผล", e["venue"], e["home"], e["hg"], "-", e["ag"], e["away"])

    # ตัวจริงที่ยืนยันแล้วของนัดที่จบ → เก็บเข้า SEED_XI ตามวันสนาม (ประวัติรายนัด ใช้ตอนย้อนทดสอบ)
    moved = 0
    xa, xb = span(s, "XI")
    la, lb = span(s, "LINEUPS")
    for e in evs:
        for t in (e["home"], e["away"]):
            m = re.search(r'\n?  "%s": \{ confirmed:true, forDate:"%s", kit:"(\w+)", start:(\[[^\]]*\]) \},'
                          % (re.escape(t), e["venue"]), s[la:lb])
            k = f'"{e["venue"]}|{t}"'
            if m and k not in s[xa:xb]:
                s = s[:xa] + f'  {k}: {{ kit:"{m.group(1)}", start:{m.group(2)} }},\n' + s[xa:]
                moved += 1
                xa, xb = span(s, "XI"); la, lb = span(s, "LINEUPS")

    # ราคาปิด + เตะมุม/ใบ จาก football-data (มักช้ากว่าผลจริง 1–3 วัน)
    rows = list(csv.DictReader(io.StringIO(fetch(FD_E0).decode("utf-8-sig"))))
    sa, sb = span(s, "SIDE")
    side_have = set(re.findall(r'\["(\d{4}-\d{2}-\d{2})","([^"]+)",', s[sa:sb]))
    oa, ob = span(s, "ODDS")
    odds_txt = s[oa:ob]
    up_o, up_s = [], []
    num = lambda t: [None if v.strip() == "null" else float(v) for v in t.split(",")]
    for r in rows:
        d, m, y = r["Date"].split("/"); date = f"{y}-{m}-{d}"
        h, x = e0_name(r["HomeTeam"], teams), e0_name(r["AwayTeam"], teams)
        line = odds_row(date, h, x, r, pre=False)
        if line:
            # ไม่มีแถว หรือมีแต่ตัวเลขต่าง (เป็นราคาก่อนเตะ) → ใส่/แทนด้วยราคาปิด · เทียบเป็นตัวเลข
            mo = re.search(r'\["%s","%s","[^"]+",([^\]\n]*)\]' % (re.escape(date), re.escape(h)), odds_txt)
            new_v = num(line.split('",')[-1].strip().rstrip(",").rstrip("]"))
            if not mo or any((p is None) != (q is None) or (p is not None and abs(p - q) > 1e-9)
                             for p, q in zip(num(mo.group(1)), new_v)):
                up_o.append(((date, h), line))
        if (date, h) not in side_have and (r.get("HC") or "").strip():
            g = lambda k: (r.get(k) or "0").strip() or "0"
            up_s.append(((date, h), f'  ["{date}","{h}","{x}",{g("HC")},{g("AC")},{g("HY")},{g("AY")},{g("HR")},{g("AR")}],'))
    s = upsert_rows(s, "ODDS", up_o)
    s = upsert_rows(s, "SIDE", up_s)
    save(s)
    last = rows[-1]["Date"] if rows else "-"
    print(f"ผลใหม่ {len(new)} นัด · ตัวจริงเข้าประวัติ {moved} ทีม · ราคาปิด {len(up_o)} · เตะมุม/ใบ {len(up_s)} · E0.csv ล่าสุด {last}")
    pend = [e for e in new if (e["venue"], e["home"]) not in {(k[0], k[1]) for k, _ in up_s}]
    if pend:
        print("  ยังไม่มีราคาปิด/เตะมุม/ใบ:", ", ".join(f'{e["home"]} v {e["away"]}' for e in pend))


def squad(s, team):
    """ชื่อผู้เล่นในชุดตั้งต้นของทีม (ไม่รวมผู้จัดการ)"""
    m = re.search(r'\n  "%s": \{ kit:"[^"]*", rows:\[\n(.*?)\n  \]' % re.escape(team), s, re.S)
    if not m:
        sys.exit(f"ไม่พบทีม {team!r} ใน PRESETS")
    return [n for n, p in re.findall(r'\["([^"]+)","([^"]+)"', m.group(1)) if p != "ผจก."]


def cmd_set_lineup(a):
    """ใส่ตัวจริงของทีม — ลบรายการเดิมของทีมนั้นทุกตัวก่อน เพราะคีย์ซ้ำใน object ของ JS ตัวหลังชนะ
    ตัวที่ใส่ใหม่จะถูกทับเงียบ ๆ · ชื่อต้องสะกดตรงกับชุดตั้งต้นทุกตัว ไม่งั้นแอปทิ้งตัวจริงทั้งชุด"""
    import difflib
    s = src()
    names = [n.strip() for n in a.players.split(";") if n.strip()]
    pool = squad(s, a.team)
    bad = [n for n in names if n not in pool]
    if len(names) != 11 or bad:
        print(f"ไม่บันทึก: ได้ {len(names)} ชื่อ (ต้อง 11)")
        for n in bad:
            print(f"  ไม่พบ {n!r} · ใกล้เคียง: {difflib.get_close_matches(n, pool, n=3, cutoff=0.5)}")
        sys.exit(2)
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", a.date) or a.kit not in ("home", "away", "third"):
        sys.exit("--date ต้องเป็นวันสนาม YYYY-MM-DD และ --kit ต้องเป็น home/away/third")
    la, lb = span(s, "LINEUPS")
    body = re.sub(r'  "%s": \{[^\n]*\},\n' % re.escape(a.team), "", s[la:lb] + "\n")[:-1]
    q = ", ".join(f'"{n}"' for n in names)
    line = (f'  "{a.team}": {{ confirmed:{"false" if a.predicted else "true"}, forDate:"{a.date}", '
            f'kit:"{a.kit}", start:[{q}] }},\n')
    save(s[:la] + line + body + s[lb:])
    print(f'บันทึกตัวจริง {a.team} วันสนาม {a.date} ชุด{a.kit} ({"คาดการณ์" if a.predicted else "ประกาศแล้ว"})')


def cmd_round_status(a):
    """รอบล่าสุดจบหรือยัง: ดูนัดที่เตะไปแล้วใน 7 วันที่ผ่านมา กับนัดที่ยังไม่เตะในอีก 3 วัน"""
    s = src(); teams = pl_teams(s)
    evs = ls_events(7, 3, teams)
    now = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)
    played = [e for e in evs if e["eps"] in ("FT", "AET", "AP")]
    live = [e for e in evs if e["eps"] not in ("FT", "AET", "AP", "NS") and not any(x in e["eps"] for x in NOT_PLAYED)]
    soon = [e for e in evs if e["eps"] == "NS" and e["utc"] - now <= dt.timedelta(hours=60)]
    print(f"จบแล้ว 7 วัน: {len(played)} · กำลังเตะ: {len(live)} · จะเตะใน 60 ชม.: {len(soon)}")
    for e in soon: print("  รอ", (e["bkk"]).strftime("%Y-%m-%d %H:%M"), "ไทย", e["home"], "v", e["away"])
    if live or soon:
        print("รอบนี้ยังไม่จบ"); sys.exit(3)
    print("รอบนี้จบครบแล้ว")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = p.add_subparsers(dest="cmd", required=True)
    x = sp.add_parser("sync-fixtures"); x.add_argument("--days", type=int, default=21); x.set_defaults(f=cmd_sync_fixtures)
    x = sp.add_parser("upcoming"); x.add_argument("--from", dest="frm", type=int, default=10)
    x.add_argument("--to", type=int, default=70); x.set_defaults(f=cmd_upcoming)
    x = sp.add_parser("prematch-odds"); x.set_defaults(f=cmd_prematch_odds)
    x = sp.add_parser("results"); x.add_argument("--days", type=int, default=10); x.set_defaults(f=cmd_results)
    x = sp.add_parser("round-status"); x.set_defaults(f=cmd_round_status)
    x = sp.add_parser("set-lineup"); x.add_argument("--team", required=True); x.add_argument("--date", required=True)
    x.add_argument("--kit", required=True); x.add_argument("--players", required=True, help='คั่นด้วย ; ครบ 11 ชื่อ')
    x.add_argument("--predicted", action="store_true", help="ยังไม่ประกาศ (confirmed:false)"); x.set_defaults(f=cmd_set_lineup)
    a = p.parse_args(); a.f(a)


if __name__ == "__main__":
    main()
