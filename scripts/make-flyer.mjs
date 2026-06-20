import { chromium } from "@playwright/test";

const STAR =
  "M256 116 C272 214 298 240 396 256 C298 272 272 298 256 396 C240 298 214 272 116 256 C214 240 240 214 256 116 Z";

// Dependency-free pseudo-QR: deterministic module grid with three finder patterns.
function qr(size = 21) {
  const cell = 4;
  const finder = (gx, gy) => {
    let s = "";
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const on =
          x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
        if (on)
          s += `<rect x="${(gx + x) * cell}" y="${(gy + y) * cell}" width="${cell}" height="${cell}"/>`;
      }
    return s;
  };
  let mods = "";
  let seed = 1337;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const inFinder = (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
      if (inFinder) continue;
      if (rnd() > 0.5)
        mods += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"/>`;
    }
  const d = size * cell;
  return `<svg viewBox="0 0 ${d} ${d}" width="118" height="118" style="display:block">
    <rect width="${d}" height="${d}" rx="8" fill="#0A0A0B"/>
    <g fill="#0A0A0B"><rect width="${d}" height="${d}" rx="8" fill="#fff"/></g>
    <g fill="#0A0A0B">${mods}${finder(0, 0)}${finder(size - 7, 0)}${finder(0, size - 7)}</g>
  </svg>`;
}

const icon = {
  feed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
  battle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><polyline points="9.5 17.5 21 6 21 3 18 3 6.5 14.5"/></svg>`,
  coins: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/></svg>`,
  ticket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5 8.5 5 10 6.2 12 8c2-1.8 3.5-3 5.5-3C21 5 23.5 8.5 21.5 12.5 19 16.65 12 21 12 21Z"/></svg>`,
  gift: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/></svg>`,
};

const feature = (i, title) => `
  <div class="feat">
    <span class="featIcon">${i}</span>
    <span class="featTxt">${title}</span>
  </div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  :root{
    --brandA:#27B074; --brandB:#168A5C; --goldA:#FFE0A0; --goldB:#E7A52E;
    --canvas:#0A0A0B; --fg:#fff; --muted:#A7A7Ad;
  }
  html,body{ width:1080px; height:1350px; }
  body{
    font-family: "Helvetica Neue", Arial, system-ui, sans-serif;
    background:
      radial-gradient(900px 600px at 50% -8%, rgba(39,176,116,.30), transparent 60%),
      radial-gradient(700px 500px at 110% 30%, rgba(231,165,46,.16), transparent 55%),
      var(--canvas);
    color:var(--fg); width:1080px; height:1350px; overflow:hidden; position:relative;
    padding:58px 64px 44px;
  }
  /* spotlight cone */
  .cone{ position:absolute; top:-40px; left:50%; transform:translateX(-50%);
    width:760px; height:760px; pointer-events:none;
    background: conic-gradient(from 180deg at 50% 0, transparent 158deg, rgba(255,224,160,.10) 180deg, transparent 202deg);
    filter: blur(2px); }
  header{ display:flex; align-items:center; justify-content:space-between; position:relative; z-index:2; }
  .brand{ display:flex; align-items:center; gap:18px; }
  .mark{ width:74px; height:74px; }
  .word{ font-weight:800; font-size:46px; letter-spacing:-1px; }
  .word .lora{ background:linear-gradient(120deg,var(--goldA),var(--goldB)); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .pill{ border:1px solid rgba(255,255,255,.16); color:#cfcfd4; font-size:20px; font-weight:600;
    padding:10px 18px; border-radius:999px; }

  .hero{ position:relative; z-index:2; margin-top:38px; text-align:center; }
  .kicker{ color:var(--goldB); font-weight:700; letter-spacing:3px; font-size:22px; text-transform:uppercase; }
  h1{ font-size:82px; line-height:.98; font-weight:800; letter-spacing:-2px; margin-top:14px; }
  h1 .hl{ background:linear-gradient(120deg,var(--brandA),#5fe0a8); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .sub{ color:#c7c7cd; font-size:30px; margin-top:20px; font-weight:500; }

  .stage{ position:relative; z-index:2; display:flex; justify-content:center; margin-top:20px; }
  .phone{ width:352px; height:496px; border-radius:46px; padding:12px;
    background:linear-gradient(160deg,#23232a,#0c0c0e); box-shadow:0 40px 90px rgba(0,0,0,.6), 0 0 0 2px rgba(255,255,255,.05);
    transform: rotate(-3deg); }
  .screen{ width:100%; height:100%; border-radius:36px; overflow:hidden; position:relative;
    background:linear-gradient(150deg,#7b2ff7,#2a1763 60%,#10112b); }
  .screen .glow{ position:absolute; inset:0; background:radial-gradient(360px 360px at 60% 28%, rgba(255,255,255,.22), transparent 60%); }
  .topchrome{ position:absolute; top:18px; left:0; right:0; display:flex; align-items:center; justify-content:center; gap:14px; color:#fff; font-weight:700; font-size:18px; }
  .topchrome .on{ opacity:1 } .topchrome .off{ opacity:.55 }
  .playbtn{ position:absolute; top:42%; left:50%; transform:translate(-50%,-50%); width:84px; height:84px; border-radius:999px; background:rgba(255,255,255,.16); backdrop-filter:blur(6px); display:grid; place-items:center; }
  .playbtn svg{ width:34px; height:34px; color:#fff; margin-left:5px; }
  .rail{ position:absolute; right:14px; bottom:96px; display:flex; flex-direction:column; gap:20px; align-items:center; color:#fff; }
  .rail .r{ display:flex; flex-direction:column; align-items:center; gap:4px; font-size:15px; font-weight:700; }
  .rail .r svg{ width:30px; height:30px; }
  .rail .gold{ color:var(--goldA); }
  .creator{ position:absolute; left:16px; bottom:84px; right:78px; color:#fff; }
  .creator .name{ display:flex; align-items:center; gap:6px; font-weight:800; font-size:19px; }
  .creator .cap{ font-size:16px; opacity:.92; margin-top:4px; }
  .badgeV{ width:18px; height:18px; }
  .tabbar{ position:absolute; left:0; right:0; bottom:0; height:60px; background:rgba(10,10,11,.78); border-top:1px solid rgba(255,255,255,.08); display:flex; align-items:center; justify-content:space-around; }
  .tabbar i{ width:22px; height:22px; border-radius:6px; background:rgba(255,255,255,.22); display:block; }
  .tabbar i.act{ background:var(--brandA); }

  .feats{ position:relative; z-index:2; display:grid; grid-template-columns:1fr 1fr; gap:13px 18px; margin-top:22px; }
  .feat{ display:flex; align-items:center; gap:14px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
    padding:16px 18px; border-radius:16px; }
  .featIcon{ width:42px; height:42px; flex:0 0 auto; border-radius:12px; display:grid; place-items:center;
    background:linear-gradient(140deg, rgba(39,176,116,.25), rgba(231,165,46,.18)); color:var(--goldA); }
  .featIcon svg{ width:22px; height:22px; }
  .featTxt{ font-size:23px; font-weight:650; }

  .cta{ position:relative; z-index:2; margin-top:20px; display:flex; align-items:center; gap:22px;
    background:linear-gradient(120deg, rgba(39,176,116,.18), rgba(231,165,46,.12));
    border:1px solid rgba(231,165,46,.35); border-radius:22px; padding:22px 26px; }
  .cta .qr{ background:#fff; padding:8px; border-radius:12px; line-height:0; }
  .cta .ctaTxt .big{ font-size:30px; font-weight:800; }
  .cta .ctaTxt .small{ font-size:21px; color:#cdcdd3; margin-top:4px; }
  .cta .url{ margin-left:auto; text-align:right; }
  .cta .url .u{ font-size:30px; font-weight:800; }
  .cta .url .u .lora{ background:linear-gradient(120deg,var(--goldA),var(--goldB)); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .cta .url .flag{ font-size:20px; color:#cdcdd3; margin-top:4px; }
</style></head><body>
  <div class="cone"></div>

  <header>
    <div class="brand">
      <svg class="mark" viewBox="0 0 512 512">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#27B074"/><stop offset="1" stop-color="#168A5C"/></linearGradient>
          <linearGradient id="st" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE0A0"/><stop offset="1" stop-color="#E7A52E"/></linearGradient>
        </defs>
        <rect width="512" height="512" rx="116" fill="url(#bg)"/>
        <path d="${STAR}" fill="url(#st)"/>
        <circle cx="214" cy="208" r="13" fill="#fff" opacity=".5"/>
      </svg>
      <div class="word">Sky<span class="lora">lora</span></div>
    </div>
    <div class="pill">Naija campus talent</div>
  </header>

  <div class="hero">
    <div class="kicker">The campus talent network</div>
    <h1>Where talent gets <span class="hl">discovered</span>.</h1>
    <div class="sub">Short videos · live battles · get seen, get paid.</div>
  </div>

  <div class="stage">
    <div class="phone"><div class="screen">
      <div class="glow"></div>
      <div class="topchrome"><span class="on">For You</span><span class="off">Following</span></div>
      <div class="playbtn">${icon.feed}</div>
      <div class="rail">
        <div class="r"><span style="color:#ff5a7a">${icon.heart}</span>6.1K</div>
        <div class="r gold">${icon.gift}<span>Gift</span></div>
        <div class="r"><span style="opacity:.9">${icon.feed}</span>48K</div>
      </div>
      <div class="creator">
        <div class="name">@ada.beats
          <svg class="badgeV" viewBox="0 0 24 24" fill="#E7A52E"><path d="M12 2l2.4 1.8 3 .1 1 2.8 2.4 1.7-.9 2.9.9 2.9-2.4 1.7-1 2.8-3 .1L12 22l-2.4-1.8-3-.1-1-2.8L3.2 15l.9-2.9L3.2 9.2l2.4-1.7 1-2.8 3-.1z"/><path d="M9.5 12.5l1.8 1.8 3.5-3.6" stroke="#0A0A0B" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="cap">Freestyle Friday 🎤  ·  #UNILAG</div>
      </div>
      <div class="tabbar"><i class="act"></i><i></i><i></i><i></i><i></i></div>
    </div></div>
  </div>

  <div class="feats">
    ${feature(icon.feed, "Blow up on the For You feed")}
    ${feature(icon.battle, "Battle live & win prizes")}
    ${feature(icon.coins, "Earn Credits, cash out")}
    ${feature(icon.ticket, "Campus events & tickets")}
  </div>

  <div class="cta">
    <div class="qr">${qr()}</div>
    <div class="ctaTxt">
      <div class="big">Scan to join</div>
      <div class="small">Add to your home screen — no download</div>
    </div>
    <div class="url">
      <div class="u">sky<span class="lora">lora</span>.app</div>
      <div class="flag">Built for Nigerian campus creators 🇳🇬</div>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1080, height: 1350 },
  deviceScaleFactor: 2,
});
await page.setContent(html, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
await page.screenshot({ path: "/home/user/DEMO/marketing/skylora-flyer.png" });
await browser.close();
console.log("saved marketing/skylora-flyer.png");
