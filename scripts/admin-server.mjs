#!/usr/bin/env node
/**
 * timeblind — local data admin
 *
 * A tiny zero-dependency Node server for editing data/*.json from a browser.
 * It is intentionally local-only (binds to 127.0.0.1) and completely separate
 * from the Next.js app, so it never touches the static-export production build.
 *
 * Workflow: npm run admin -> edit in the browser -> save (writes the JSON file
 * + a timestamped backup) -> git commit & push -> SSG redeploys.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, "data");
const BACKUP_DIR = join(DATA_DIR, ".backups");
const POSTERS_DIR = join(ROOT, "public", "posters");
const PORT = Number(process.env.ADMIN_PORT) || 4100;
const HOST = "127.0.0.1";
const MAX_POSTER_BYTES = 4 * 1024 * 1024;
const POSTER_MIMES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

// Only these files may be read/written. Order defines tab order.
const FILES = ["profile", "timeline", "concerts", "travel"];

function isAllowed(name) {
  return FILES.includes(name);
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString("utf-8");
}

function parsePosterDataUrl(dataUrl) {
  const m = String(dataUrl).match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!m) throw new Error("invalid image data");
  const mime = m[1].toLowerCase();
  if (!POSTER_MIMES.has(mime)) throw new Error("unsupported image type");
  const buf = Buffer.from(m[2], "base64");
  return { mime, buf, ext: POSTER_MIMES.get(mime) };
}

async function handlePosterUpload(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method not allowed" });
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (e) {
    return send(res, 400, { error: `invalid JSON: ${e.message}` });
  }
  const id = String(body.id ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!id) return send(res, 400, { error: "invalid concert id" });
  if (!body.dataUrl) return send(res, 400, { error: "missing image data" });
  let parsed;
  try {
    parsed = parsePosterDataUrl(body.dataUrl);
  } catch (e) {
    return send(res, 400, { error: e.message });
  }
  if (parsed.buf.length > MAX_POSTER_BYTES) {
    return send(res, 400, { error: "image too large (max 4MB)" });
  }
  await mkdir(POSTERS_DIR, { recursive: true });
  const filename = `${id}.${parsed.ext}`;
  await writeFile(join(POSTERS_DIR, filename), parsed.buf);
  return send(res, 200, { path: `/posters/${filename}` });
}

async function servePublicAsset(res, pathname) {
  const rel = pathname.replace(/^\//, "");
  const fp = resolve(ROOT, "public", rel);
  if (!fp.startsWith(resolve(ROOT, "public"))) return false;
  if (!existsSync(fp)) return false;
  const ext = fp.split(".").pop()?.toLowerCase() ?? "";
  const types = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  const body = await readFile(fp);
  res.writeHead(200, {
    "Content-Type": types[ext] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(body);
  return true;
}

async function handleApi(req, res, url) {
  // GET /api/file/:name
  const fileMatch = url.pathname.match(/^\/api\/file\/([a-z]+)$/);
  if (fileMatch) {
    const name = fileMatch[1];
    if (!isAllowed(name)) return send(res, 404, { error: "unknown file" });
    const fp = join(DATA_DIR, `${name}.json`);
    if (!existsSync(fp)) return send(res, 404, { error: "not found" });

    if (req.method === "GET") {
      const raw = await readFile(fp, "utf-8");
      return send(res, 200, raw);
    }

    if (req.method === "PUT") {
      const raw = await readBody(req);
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        return send(res, 400, { error: `invalid JSON: ${e.message}` });
      }
      // backup current content first
      await mkdir(BACKUP_DIR, { recursive: true });
      if (existsSync(fp)) {
        const current = await readFile(fp, "utf-8");
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        await writeFile(join(BACKUP_DIR, `${name}.${stamp}.json`), current);
      }
      const pretty = JSON.stringify(parsed, null, 2) + "\n";
      await writeFile(fp, pretty, "utf-8");
      return send(res, 200, { ok: true, bytes: Buffer.byteLength(pretty) });
    }

    return send(res, 405, { error: "method not allowed" });
  }

  // GET /api/files -> list of available datasets
  if (url.pathname === "/api/files" && req.method === "GET") {
    return send(res, 200, { files: FILES });
  }

  if (url.pathname === "/api/upload/poster") {
    return handlePosterUpload(req, res);
  }

  return send(res, 404, { error: "not found" });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    if (url.pathname.startsWith("/posters/")) {
      if (await servePublicAsset(res, url.pathname)) return;
      res.writeHead(404).end("not found");
      return;
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(PAGE);
    }
    res.writeHead(404).end("not found");
  } catch (err) {
    send(res, 500, { error: String(err && err.message ? err.message : err) });
  }
});

// guard: make sure we are in a project with a data/ dir
if (!existsSync(DATA_DIR)) {
  console.error(
    `\n[admin] No data/ directory found at ${resolve(DATA_DIR)}.\n` +
      `Run this from the project root (npm run admin).\n`,
  );
  process.exit(1);
}

server.listen(PORT, HOST, async () => {
  const list = (await readdir(DATA_DIR)).filter((f) => f.endsWith(".json"));
  console.log(`\n  timeblind data admin`);
  console.log(`  → http://${HOST}:${PORT}`);
  console.log(`  editing: ${DATA_DIR}`);
  console.log(`  datasets: ${list.join(", ") || "(none)"}\n`);
});

// ---------------------------------------------------------------------------
// Client (single self-contained page).
// ---------------------------------------------------------------------------
const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>timeblind // data admin</title>
<style>
  :root {
    --bg:#09090b; --surface:#0c0c0f; --line:#ffffff14; --line2:#ffffff0a;
    --fg:#d4d4d8; --muted:#71717a; --accent:#00ffcc; --danger:#f87171;
    --mono: ui-monospace, "JetBrains Mono", "SFMono-Regular", Menlo, monospace;
    --sans: ui-sans-serif, system-ui, "Inter", sans-serif;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font-family:var(--sans);
    background-image:linear-gradient(var(--line2) 1px,transparent 1px),linear-gradient(90deg,var(--line2) 1px,transparent 1px);
    background-size:24px 24px; }
  header { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:16px;
    padding:14px 22px; border-bottom:1px solid var(--line);
    background:rgba(9,9,11,.8); backdrop-filter:blur(10px); }
  header .dot { width:8px; height:8px; border-radius:99px; background:var(--accent);
    box-shadow:0 0 10px var(--accent); }
  header h1 { font-size:14px; margin:0; font-weight:600; letter-spacing:.02em; }
  header .path { font-family:var(--mono); font-size:11px; color:var(--muted); margin-left:auto; }
  .tabs { display:flex; gap:6px; padding:14px 22px 0; flex-wrap:wrap; }
  .tab { font-family:var(--mono); font-size:12px; padding:7px 14px; border-radius:9px 9px 0 0;
    border:1px solid var(--line); border-bottom:none; background:transparent; color:var(--muted);
    cursor:pointer; }
  .tab.active { color:var(--accent); background:var(--surface); }
  main { padding:0 22px 120px; }
  .panel { display:none; border:1px solid var(--line); border-radius:0 12px 12px 12px;
    background:rgba(12,12,15,.6); padding:18px; }
  .panel.active { display:block; }
  .toolbar { display:flex; align-items:center; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
  button { font-family:var(--mono); font-size:12px; cursor:pointer; border-radius:8px;
    border:1px solid var(--line); background:#ffffff08; color:var(--fg); padding:8px 14px; }
  button:hover { border-color:#00ffcc55; color:var(--accent); }
  button.primary { background:var(--accent); color:#000; border-color:var(--accent); font-weight:600; }
  button.ghost { padding:4px 9px; font-size:11px; }
  button.danger:hover { border-color:#f8717188; color:var(--danger); }
  .field { margin:0 0 12px; }
  .field > label { display:block; font-family:var(--mono); font-size:11px; color:var(--muted);
    margin-bottom:5px; letter-spacing:.04em; }
  .group { border:1px solid var(--line); border-radius:10px; padding:12px; margin:0 0 12px;
    background:#ffffff04; }
  .group > .grp-label { font-family:var(--mono); font-size:11px; color:var(--accent);
    margin-bottom:10px; text-transform:uppercase; letter-spacing:.1em; }
  .arr-item { position:relative; border:1px dashed var(--line); border-radius:10px;
    padding:12px 12px 12px; margin:0 0 10px; background:#ffffff03; }
  .arr-item .item-head { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
  .arr-item .idx { font-family:var(--mono); font-size:10px; color:var(--muted); }
  .arr-item .spacer { flex:1; }
  input, textarea { width:100%; background:#0a0a0c; color:var(--fg); border:1px solid var(--line);
    border-radius:8px; padding:9px 11px; font-size:13px; font-family:var(--sans); }
  input:focus, textarea:focus { outline:none; border-color:#00ffcc66; }
  input[type=number] { font-family:var(--mono); }
  textarea { resize:vertical; min-height:64px; line-height:1.5; }
  .loc { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .loc .sub { }
  .loc .sub label { font-family:var(--mono); font-size:10px; color:var(--muted); display:block; margin-bottom:3px; }
  .chk { display:flex; align-items:center; gap:8px; }
  .chk input { width:auto; }
  .raw textarea { font-family:var(--mono); font-size:12px; min-height:420px; white-space:pre; }
  .toast { position:fixed; bottom:22px; left:50%; transform:translateX(-50%) translateY(40px);
    background:var(--accent); color:#000; font-family:var(--mono); font-size:12px; font-weight:600;
    padding:10px 18px; border-radius:10px; opacity:0; transition:.25s; pointer-events:none; z-index:20; }
  .toast.show { transform:translateX(-50%) translateY(0); opacity:1; }
  .toast.err { background:var(--danger); }
  .hint { font-family:var(--mono); font-size:11px; color:var(--muted); }
  .add-row { display:flex; }
  .poster-field { border:1px solid #00ffcc33; border-radius:10px; padding:12px; margin:4px 0 14px;
    background:#00ffcc08; }
  .poster-field > label { color:var(--accent) !important; text-transform:uppercase; letter-spacing:.12em; }
  .poster-field .poster-preview { margin:6px 0 8px; min-height:48px; }
  .poster-field .poster-preview img { display:block; width:96px; height:96px; object-fit:cover;
    border-radius:8px; border:1px solid var(--line); background:#000; }
  .poster-field input[type=file] { font-size:11px; margin-top:6px; padding:6px; }
  .poster-actions { display:flex; gap:8px; margin-top:8px; flex-wrap:wrap; align-items:center; }
  .poster-hint { font-family:var(--mono); font-size:10px; color:var(--muted); margin-top:4px; }
</style>
</head>
<body>
<header>
  <span class="dot"></span>
  <h1>timeblind // data admin</h1>
  <span class="path" id="path">data/</span>
</header>
<div class="tabs" id="tabs"></div>
<main id="main"></main>
<div class="toast" id="toast"></div>

<script>
const FILES = ${JSON.stringify(FILES)};
const LOC_KEYS = ["en","zh","ja"];
// array fields whose items are Localized<{en,zh,ja}>
const LOCALIZED_ARRAY_KEYS = new Set(["achievements"]);
// object fields that are Localized strings
const LOCALIZED_FIELD_KEYS = new Set([
  "title","summary","role","tagline","location","bio","genre","note",
]);
const state = {};          // file -> parsed object
const rawMode = {};        // file -> bool
let active = FILES[0];

const $ = (s,el=document)=>el.querySelector(s);
const ce = (t,cls)=>{const e=document.createElement(t); if(cls)e.className=cls; return e;};

function emptyLocalized(){
  return { en:"", zh:"", ja:"" };
}

function isLocalized(v){
  return v && typeof v==="object" && !Array.isArray(v) && typeof v.en === "string" &&
    Object.keys(v).every(k=>LOC_KEYS.includes(k));
}

function asLocalized(value, fieldKey){
  if(isLocalized(value)) return value;
  if(LOCALIZED_FIELD_KEYS.has(fieldKey) || LOCALIZED_ARRAY_KEYS.has(fieldKey)){
    if(typeof value==="string") return { en:value, zh:"", ja:"" };
    return emptyLocalized();
  }
  return value;
}

function toast(msg, isErr){
  const t=$("#toast"); t.textContent=msg; t.className="toast show"+(isErr?" err":"");
  setTimeout(()=>{ t.className="toast"+(isErr?" err":""); }, 2200);
}

function isConcertRecord(v){
  return v&&typeof v==="object"&&!Array.isArray(v)&&"id" in v&&"artist" in v&&"tour" in v;
}

function concertRecordKeys(item){
  const order=["id","poster","artist","tour","venue","city","date","time","genre","color","accent","rating","note"];
  const keys=[];
  for(const k of order){
    if(k==="poster"||k in item) keys.push(k);
  }
  if(!keys.includes("poster")) keys.splice(1,0,"poster");
  for(const k of Object.keys(item)){
    if(!keys.includes(k)) keys.push(k);
  }
  return keys;
}

function renderPosterField(parent, key, value, label, ctx){
  const f=ce("div","field poster-field");
  const l=ce("label"); l.textContent=(label||key)+" · upload"; f.appendChild(l);
  const hint=ce("div","poster-hint");
  hint.textContent="saved to public/posters/ · then Save concerts.json";
  f.appendChild(hint);

  const preview=ce("div","poster-preview");
  const img=ce("img");
  img.alt="poster preview";
  if(value){ img.src=value; img.style.display="block"; }
  else { img.style.display="none"; }
  preview.appendChild(img);
  f.appendChild(preview);

  const pathInp=ce("input");
  pathInp.value=value??"";
  pathInp.placeholder="/posters/concert-id.jpg";
  pathInp.oninput=()=>{
    const v=pathInp.value.trim();
    if(v){ parent[key]=v; img.src=v; img.style.display="block"; }
    else { delete parent[key]; img.style.display="none"; }
  };
  f.appendChild(pathInp);

  const fileInp=ce("input");
  fileInp.type="file";
  fileInp.accept="image/jpeg,image/png,image/webp,image/gif";
  f.appendChild(fileInp);

  const actions=ce("div","poster-actions");
  const uploadBtn=ce("button","ghost"); uploadBtn.textContent="upload image";
  uploadBtn.onclick=async()=>{
    const file=fileInp.files?.[0];
    if(!file) return toast("choose an image first", true);
    if(file.size>4*1024*1024) return toast("image too large (max 4MB)", true);
    const reader=new FileReader();
    reader.onload=async()=>{
      try{
        const id=(ctx&&ctx.id)?String(ctx.id):"poster-"+Date.now();
        const r=await fetch("/api/upload/poster",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({ id, dataUrl:reader.result }),
        });
        const j=await r.json();
        if(!r.ok) throw new Error(j.error||r.statusText);
        parent[key]=j.path;
        pathInp.value=j.path;
        img.src=j.path;
        img.style.display="block";
        fileInp.value="";
        toast("uploaded "+j.path+" — click Save to persist");
      }catch(e){ toast("upload failed: "+e.message, true); }
    };
    reader.readAsDataURL(file);
  };
  const clearBtn=ce("button","ghost danger"); clearBtn.textContent="clear";
  clearBtn.onclick=()=>{ delete parent[key]; pathInp.value=""; img.style.display="none"; };
  actions.append(uploadBtn, clearBtn);
  f.appendChild(actions);
  return f;
}

// Recursive renderer. Mutates the object at parent[key] in place.
function renderValue(parent, key, value, label, ctx){
  // localized {en,zh,ja}
  if(isLocalized(value) || LOCALIZED_FIELD_KEYS.has(key)){
    if(!isLocalized(value)){
      value = asLocalized(value, key);
      parent[key] = value;
    }
    const f=ce("div","field");
    if(label){const l=ce("label"); l.textContent=label; f.appendChild(l);}
    const loc=ce("div","loc");
    LOC_KEYS.forEach(lk=>{
      const sub=ce("div","sub");
      const l=ce("label"); l.textContent=lk.toUpperCase(); sub.appendChild(l);
      const ta=ce("textarea"); ta.value=value[lk]??""; ta.style.minHeight="48px";
      ta.oninput=()=>{ if(ta.value==="" && lk!=="en"){ delete value[lk]; } else { value[lk]=ta.value; } };
      sub.appendChild(ta); loc.appendChild(sub);
    });
    f.appendChild(loc);
    return f;
  }
  // arrays
  if(Array.isArray(value)){
    const g=ce("div","group");
    const gl=ce("div","grp-label"); gl.textContent=(label||key)+" ["+value.length+"]"; g.appendChild(gl);
    value.forEach((item,i)=>{
      if(LOCALIZED_ARRAY_KEYS.has(key) && typeof item==="string"){
        item = { en:item, zh:"", ja:"" };
        value[i] = item;
      }
      const it=ce("div","arr-item");
      const head=ce("div","item-head");
      const idx=ce("span","idx"); idx.textContent="#"+i; head.appendChild(idx);
      const sp=ce("span","spacer"); head.appendChild(sp);
      const up=ce("button","ghost"); up.textContent="↑"; up.title="move up";
      up.onclick=()=>{ if(i>0){ [value[i-1],value[i]]=[value[i],value[i-1]]; rerender(); } };
      const dn=ce("button","ghost"); dn.textContent="↓"; dn.title="move down";
      dn.onclick=()=>{ if(i<value.length-1){ [value[i+1],value[i]]=[value[i],value[i+1]]; rerender(); } };
      const rm=ce("button","ghost danger"); rm.textContent="✕"; rm.title="remove";
      rm.onclick=()=>{ value.splice(i,1); rerender(); };
      head.appendChild(up); head.appendChild(dn); head.appendChild(rm);
      it.appendChild(head);
      if(isConcertRecord(item)){
        concertRecordKeys(item).forEach(k=>{
          it.appendChild(renderValue(item,k,item[k]??"",k,item));
        });
      } else {
        it.appendChild(renderValue(value, i, item, null, typeof item==="object"&&item?item:ctx));
      }
      g.appendChild(it);
    });
    const addWrap=ce("div","add-row");
    const add=ce("button","ghost"); add.textContent="+ add item";
    add.onclick=()=>{ value.push(arrayItemTemplate(key, value)); rerender(); };
    addWrap.appendChild(add); g.appendChild(addWrap);
    return g;
  }
  // objects
  if(value && typeof value==="object"){
    const g=ce("div","group");
    if(label){const gl=ce("div","grp-label"); gl.textContent=label; g.appendChild(gl);}
    const keys=isConcertRecord(value)
      ? concertRecordKeys(value)
      : [...Object.keys(value)];
    if(!isConcertRecord(value) && "id" in value && "artist" in value && !keys.includes("poster")){
      keys.push("poster");
    }
    keys.forEach(k=>{
      g.appendChild(renderValue(value, k, value[k]??"", k, value));
    });
    return g;
  }
  // poster image path
  if(key==="poster"){
    return renderPosterField(parent, key, value??"", label, ctx);
  }
  // primitives
  const f=ce("div","field");
  if(typeof value==="boolean"){
    const wrap=ce("label","chk");
    const cb=ce("input"); cb.type="checkbox"; cb.checked=value;
    cb.onchange=()=>{ parent[key]=cb.checked; };
    wrap.appendChild(cb);
    const span=ce("span"); span.textContent=label||key; span.className="hint"; wrap.appendChild(span);
    f.appendChild(wrap); return f;
  }
  if(label!==null){ const l=ce("label"); l.textContent=label; f.appendChild(l); }
  let inp;
  if(typeof value==="number"){
    inp=ce("input"); inp.type="number"; inp.step="any"; inp.value=value;
    inp.oninput=()=>{ const n=inp.value===""?0:Number(inp.value); if(!Number.isNaN(n)) parent[key]=n; };
  } else {
    const long=String(value).length>56 || String(value).includes("\\n");
    inp=ce(long?"textarea":"input"); inp.value=value??"";
    inp.oninput=()=>{ parent[key]=inp.value; };
  }
  f.appendChild(inp);
  return f;
}

function arrayItemTemplate(arrayKey, arr){
  if(LOCALIZED_ARRAY_KEYS.has(arrayKey)) return emptyLocalized();
  const last = arr[arr.length - 1];
  return template(last ?? "", arrayKey);
}

// build a blank-ish template from an existing sibling (keeps structure)
function template(sample, fieldKey){
  if(Array.isArray(sample)) return [];
  if(isLocalized(sample) || (fieldKey && LOCALIZED_FIELD_KEYS.has(fieldKey))){
    return emptyLocalized();
  }
  if(sample && typeof sample==="object"){
    const o={};
    for(const k of Object.keys(sample)) o[k]=template(sample[k], k);
    if("id" in sample && "artist" in sample && !("poster" in o)) o.poster="";
    return o;
  }
  if(typeof sample==="number") return 0;
  if(typeof sample==="boolean") return false;
  return "";
}

function renderPanel(file){
  const panel=ce("div","panel"+(file===active?" active":"")); panel.dataset.file=file;
  const tb=ce("div","toolbar");
  const save=ce("button","primary"); save.textContent="Save → data/"+file+".json";
  save.onclick=()=>doSave(file);
  const reload=ce("button"); reload.textContent="Reload"; reload.onclick=()=>loadFile(file,true);
  const toggle=ce("button"); toggle.textContent=rawMode[file]?"Form view":"Raw JSON";
  toggle.onclick=()=>{ rawMode[file]=!rawMode[file]; rerender(); };
  const hint=ce("span","hint");
  hint.textContent=file==="concerts"
    ? "poster: upload image → Save · images go to public/posters/"
    : "localized fields show EN / ZH / JA · empty ZH/JA fall back to EN";
  tb.append(save, reload, toggle, hint);
  panel.appendChild(tb);

  if(state[file]===undefined){
    const p=ce("div","hint"); p.textContent="loading…"; panel.appendChild(p); return panel;
  }
  if(rawMode[file]){
    const wrap=ce("div","raw field");
    const ta=ce("textarea"); ta.value=JSON.stringify(state[file],null,2);
    ta.dataset.raw="1";
    panel.appendChild(wrap); wrap.appendChild(ta);
  } else {
    panel.appendChild(renderValue({root:state[file]}, "root", state[file], null, state[file]));
  }
  return panel;
}

function rerender(){
  const main=$("#main"); main.innerHTML="";
  FILES.forEach(f=> main.appendChild(renderPanel(f)) );
  $("#path").textContent="data/"+active+".json";
}

function renderTabs(){
  const tabs=$("#tabs"); tabs.innerHTML="";
  FILES.forEach(f=>{
    const b=ce("button","tab"+(f===active?" active":"")); b.textContent=f;
    b.onclick=()=>{ active=f; renderTabs(); rerender(); if(state[f]===undefined) loadFile(f); };
    tabs.appendChild(b);
  });
}

async function loadFile(file, force){
  if(state[file]!==undefined && !force) return;
  try{
    const r=await fetch("/api/file/"+file);
    if(!r.ok) throw new Error((await r.json()).error||r.statusText);
    state[file]=await r.json();
    rerender();
  }catch(e){ toast("load failed: "+e.message, true); }
}

async function doSave(file){
  let payload;
  if(rawMode[file]){
    const ta=document.querySelector('.panel[data-file="'+file+'"] textarea[data-raw]');
    try{ payload=JSON.parse(ta.value); }
    catch(e){ return toast("invalid JSON: "+e.message, true); }
    state[file]=payload;
  } else {
    payload=state[file];
  }
  try{
    const r=await fetch("/api/file/"+file,{method:"PUT",
      headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)});
    const j=await r.json();
    if(!r.ok) throw new Error(j.error||r.statusText);
    toast("saved "+file+".json ("+j.bytes+" bytes) — backup created");
  }catch(e){ toast("save failed: "+e.message, true); }
}

renderTabs();
rerender();
loadFile(active);
</script>
</body>
</html>`;
