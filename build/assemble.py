"""ประกอบ duang-bon.html: ใช้ไฟล์เดิมเป็นแม่แบบ แทนเนื้อใน <style> และ <script> ก้อนสุดท้าย
ต้อง escape แท็ก script ในโค้ด ไม่งั้นเบราว์เซอร์ตัด <script> ทิ้งกลางทางแล้วหน้าเว็บพัง"""
import re, sys
html_path, css_path, js_path = sys.argv[1:4]
h = open(html_path, encoding='utf-8').read()
s1 = h.index('<style>'); e1 = h.index('</style>')
m = None
for m in re.finditer(r'<script(?![^>]*src=)[^>]*>', h): pass
s2 = m.end(); e2 = h.index('</script>', s2)
css = open(css_path, encoding='utf-8').read()
js = open(js_path, encoding='utf-8').read().replace('</script>', r'<\/script>').replace('<script', r'\x3cscript')
out = h[:s1+7] + css + h[e1:s2] + js + h[e2:]
open(html_path, 'w', encoding='utf-8').write(out)
