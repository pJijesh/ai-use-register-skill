const { chromium } = require('playwright');
const html = `<html><body style="margin:0;width:1280px;height:360px;background:#f6f3ec;color:#1d1d1b;font-family:Georgia,'Times New Roman',serif;position:relative">
<div style="position:absolute;left:80px;top:46px;font-size:54px;font-weight:700;letter-spacing:-1px">ai-use-register-skill</div>
<div style="position:absolute;left:80px;top:122px;font-size:24px;color:#55534e;font-family:Helvetica,Arial,sans-serif">Find where code uses AI. Build a register that cites its evidence.</div>
<div style="position:absolute;left:80px;top:190px;width:1120px;font-family:Menlo,Consolas,monospace;font-size:20px;line-height:1.7">
<div><span style="color:#55534e">AI-001</span>  Customer chat assistant  <b>transparency</b>   <span style="color:#55534e">app/chat.py:17</span></div>
<div><span style="color:#55534e">AI-002</span>  CV screening  <b style="color:#b3261e">high risk (employment)</b>  <span style="color:#55534e">app/cv_screen.py:13</span></div>
<div><span style="color:#55534e">AI-003</span>  Meeting summariser  <b>minimal</b>   <span style="color:#55534e">app/summarise.py:8</span></div></div>
<div style="position:absolute;left:80px;bottom:26px;font-size:17px;color:#55534e;font-family:Helvetica,Arial,sans-serif">EU AI Act tier and ISO/IEC 42001 mapping. Claude Code, Codex, Cursor and OpenCode.</div></body></html>`;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 360 } });
await p.setContent(html); await p.screenshot({ path: process.argv[2] }); await b.close(); })();
