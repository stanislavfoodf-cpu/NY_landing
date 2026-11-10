import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLandingServer } from '../server.mjs';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { get } from 'node:http';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';

async function withServer(clock, run) {
  const server = createLandingServer({now:()=>new Date(clock.current)});
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0,'127.0.0.1',resolve); });
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('stories unlock at Moscow midnight and unavailable content is never returned', async () => {
  const clock={current:'2026-12-19T20:59:59Z'};
  await withServer(clock, async base => {
    let res=await fetch(`${base}/api/windows`);
    assert.equal(res.headers.get('cache-control'),'no-store');
    let {windows}=await res.json();
    assert.equal(windows.length,14);
    assert.deepEqual(windows[5],{id:6,title:null,unlockDate:'2026-12-20',unlockLabel:'20 декабря',available:false});
    res=await fetch(`${base}/api/windows/6/story?date=2028-01-01`, {headers:{'X-Date':'2028-01-01'}});
    assert.equal(res.status,423);
    assert.deepEqual(await res.json(),{error:'locked',unlockDate:'2026-12-20',unlockLabel:'20 декабря'});
    assert.equal((await fetch(`${base}/api/windows/1/story`)).status,200);
    clock.current='2026-12-19T21:00:00Z';
    res=await fetch(`${base}/api/windows/6/story`);
    assert.equal(res.status,200);
    assert.equal((await res.json()).title,'Новый год не 31-го');
    for (const [id,before,after] of [[12,'2026-12-27T20:59:59Z','2026-12-27T21:00:00Z'],[13,'2026-12-30T20:59:59Z','2026-12-30T21:00:00Z'],[14,'2026-12-31T20:59:59Z','2026-12-31T21:00:00Z']]) {
      clock.current=before;assert.equal((await fetch(`${base}/api/windows/${id}/story`)).status,423);
      clock.current=after;assert.equal((await fetch(`${base}/api/windows/${id}/story`)).status,200);
    }
    assert.equal((await fetch(`${base}/api/windows/15/story`)).status,404);
    assert.equal((await fetch(`${base}/api/windows/0/story`)).status,404);
  });
});

test('static server exposes only the site and never server source or tests', async () => {
  await withServer({current:'2026-11-10T00:00:00Z'}, async base => {
    assert.equal((await fetch(`${base}/`)).status,200);
    assert.equal((await fetch(`${base}/src/styles.css`)).status,200);
    assert.equal((await fetch(`${base}/src/assets/figma/raw/lock.png`)).status,200);
    for (const path of ['/server.mjs','/tests/server.test.mjs','/README.md','/.git/config','/src/%2e%2e/server.mjs','/src/assets/%2e%2e/%2e%2e/server.mjs']) assert.equal((await fetch(base+path)).status,404,path);
    assert.equal((await fetch(`${base}/api/windows`,{method:'POST'})).status,405);
  });
});

function rawGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    get(url, {headers}, response => {
      const parts = [];
      response.on('data', part => parts.push(part));
      response.on('end', () => resolve({status:response.statusCode, headers:response.headers, body:Buffer.concat(parts)}));
      response.on('error', reject);
    }).on('error', reject);
  });
}

test('static compression negotiates encoding and immutable cache is limited to fingerprinted assets', async () => {
  const assetsRoot=join(dirname(fileURLToPath(import.meta.url)),'../src/assets');
  const folder=await mkdtemp(join(assetsRoot,'server-test-'));
  const payload='<svg xmlns="http://www.w3.org/2000/svg"><text>'+('Новый год '.repeat(200))+'</text></svg>';
  const fingerprint=createHash('sha256').update(payload).digest('hex').slice(0,12);
  const hashed=`test.${fingerprint}.svg`;
  try {
    await Promise.all([writeFile(join(folder,hashed),payload),writeFile(join(folder,'unversioned.svg'),payload),writeFile(join(folder,'unversioned.webp'),'binary')]);
    await withServer({current:'2026-11-10T00:00:00Z'},async base=>{
      const prefix=`${base}/src/assets/${basename(folder)}`;
      const brotli=await rawGet(`${prefix}/${hashed}`,{'Accept-Encoding':'gzip;q=0.5, br;q=1'});
      assert.equal(brotli.status,200);
      assert.equal(brotli.headers['content-encoding'],'br');
      assert.equal(brotli.headers.vary,'Accept-Encoding');
      assert.equal(brotli.headers['cache-control'],'public, max-age=31536000, immutable');
      assert.equal(brotliDecompressSync(brotli.body).toString(),payload);
      const gzip=await rawGet(`${prefix}/unversioned.svg`,{'Accept-Encoding':'br;q=0, gzip;q=1'});
      assert.equal(gzip.headers['content-encoding'],'gzip');
      assert.equal(gzip.headers['cache-control'],'public, max-age=3600');
      assert.equal(gunzipSync(gzip.body).toString(),payload);
      const identity=await rawGet(`${prefix}/unversioned.svg`,{'Accept-Encoding':'br;q=0, gzip;q=0'});
      assert.equal(identity.headers['content-encoding'],undefined);
      assert.equal(identity.body.toString(),payload);
      const image=await rawGet(`${prefix}/unversioned.webp`,{'Accept-Encoding':'br,gzip'});
      assert.equal(image.headers['content-encoding'],undefined);
      const html=await rawGet(base+'/',{'Accept-Encoding':'gzip'});
      assert.equal(html.headers['cache-control'],'no-store');
      assert.equal(html.headers['content-encoding'],'gzip');
      assert.match(gunzipSync(html.body).toString(),/<!doctype html>/i);
      const head=await fetch(`${prefix}/${hashed}`,{method:'HEAD',headers:{'Accept-Encoding':'br'}});
      assert.equal(head.headers.get('content-encoding'),'br');
      assert.equal(head.headers.get('cache-control'),'public, max-age=31536000, immutable');
      assert.equal((await head.arrayBuffer()).byteLength,0);
    });
  } finally { await rm(folder,{recursive:true,force:true}); }
});
