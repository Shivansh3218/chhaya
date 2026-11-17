// Generate images with FLUX.1-schnell on the public Hugging Face space (Gradio API) and save the PNG/WebP results.
// usage: node gen.mjs <outDir> <jobs.json>   jobs: [{ name, prompt, w, h, seed }]
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://black-forest-labs-flux-1-schnell.hf.space/gradio_api';
// a free Hugging Face token (set HF_TOKEN in your shell) gives far more GPU quota than anonymous use
const AUTH = process.env.HF_TOKEN ? { authorization: `Bearer ${process.env.HF_TOKEN}` } : {};
const [outDir, jobsFile] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

async function one(job) {
  const r = await fetch(`${BASE}/call/infer`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...AUTH },
    body: JSON.stringify({ data: [job.prompt, job.seed ?? 7, job.seed === undefined, job.w, job.h, job.steps ?? 4] }),
  });
  if (!r.ok) throw new Error(`call ${r.status} ${await r.text()}`);
  const { event_id } = await r.json();
  const s = await fetch(`${BASE}/call/infer/${event_id}`, { headers: AUTH });
  const text = await s.text();
  const m = text.match(/event: complete\s*\ndata: (.*)/);
  if (!m) throw new Error('no result: ' + text.slice(0, 400));
  const data = JSON.parse(m[1]);
  const url = data[0].url;
  const img = await fetch(url, { headers: AUTH });
  if (!img.ok) throw new Error(`download ${img.status}`);
  const buf = Buffer.from(await img.arrayBuffer());
  const ext = (img.headers.get('content-type') || '').includes('png') ? 'png' : 'webp';
  const file = path.join(outDir, `${job.name}.${ext}`);
  fs.writeFileSync(file, buf);
  return `${job.name}: ${Math.round(buf.length / 1024)} KB seed ${data[1]}`;
}

for (const job of jobs) {
  if (fs.existsSync(path.join(outDir, `${job.name}.png`)) || fs.existsSync(path.join(outDir, `${job.name}.webp`))) { console.log(`${job.name}: exists`); continue; }
  for (let attempt = 1; attempt <= 12; attempt++) {
    try { console.log(await one(job)); break; }
    catch (e) { console.log(`${job.name}: attempt ${attempt} failed: ${e.message}`); await new Promise((r) => setTimeout(r, 120000)); }
  }
}
