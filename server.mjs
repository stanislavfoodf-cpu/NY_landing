import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { constants as zlibConstants, createBrotliCompress, createGzip } from 'node:zlib';

// Story text lives on the server and is returned only when its date has arrived.
const stories = [
  ['Свои', 'Со своими можно вообще не стараться праздновать правильно.', 'И всё равно будет лучший Новый год.'],
  ['Большая семья', 'Пусть дома будет шумно только от тех, кого любишь.', 'И от вопроса «кто съел последний ролл?»'],
  ['Вдвоём', 'Планы на ночь: спокойствие и любовь.', 'Остальное закажем.'],
  ['Один дома', 'Сегодня никого не ждём. Кроме новогоднего чуда.'],
  ['Все хотят разное', 'Главное новогоднее чудо — никто не спорил, что заказывать.'],
  ['Новый год не 31-го', 'С друзьями любое число может быть 31 декабря.', 'Главное, что все добрались.', '2026-12-20', '20 декабря'],
  ['Новый год на работе', 'Новый год и дедлайны вполне могут ужиться.', 'Особенно если любишь то, что делаешь.'],
  ['На расстоянии', 'Иногда между вами тысячи километров. А Новый год всё равно вместе.', 'Потому что близость расстояниями не измеряется.'],
  ['Кот ждёт', 'Желаем, чтобы дома всегда кто-то очень ждал.', 'Даже если повод — еда.'],
  ['Холодильник', 'Пусть в новом году вопрос «что поесть?» решается быстрее.', 'Хотя бы иногда.'],
  ['Последний кусок', 'Желаем людей, которым можно простить последний кусок.'],
  ['Конец декабря', 'Вы дожили до конца декабря. Уже достижение.', '', '2026-12-28', '28 декабря'],
  ['31 декабря', 'Ну всё. Погнали.', '', '2026-12-31', '31 декабря'],
  ['1 января', 'Доброе утро. Мы всё ещё с вами.', 'С Новым годом. Теперь можно выдохнуть.', '2027-01-01', '1 января'],
];

const projectRoot = dirname(fileURLToPath(import.meta.url));
const exposedFiles = new Set(['index.html', 'src/app.js', 'src/loader.js', 'src/styles.css']);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp', '.mp4':'video/mp4', '.ttf':'font/ttf', '.woff':'font/woff', '.woff2':'font/woff2' };
const moscowFormatter = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Moscow', year:'numeric', month:'2-digit', day:'2-digit'});
const available = (story, date) => !story[3] || date >= story[3];
const compressible = new Set(['.html', '.js', '.css', '.svg']);
const immutableAsset = (path) => /[.-][a-f0-9]{8,64}\.[^.]+$/i.test(basename(path));

// Browsers use byte ranges to stream and seek MP4. Ignore unsupported or malformed
// range units and multiple ranges; valid but unsatisfiable ranges return 416.
function videoRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;
  const length = BigInt(size);
  if (!match[1]) {
    const suffix = BigInt(match[2]);
    if (suffix === 0n || length === 0n) return {unsatisfiable:true};
    return {start:Number(suffix >= length ? 0n : length - suffix),end:size-1};
  }
  const first = BigInt(match[1]);
  const last = match[2] ? BigInt(match[2]) : null;
  if (last !== null && last < first) return null;
  if (first >= length) return {unsatisfiable:true};
  return {start:Number(first),end:Number(last === null || last >= length ? length - 1n : last)};
}

// Honor explicit q=0 and wildcards; do not compress formats that are already compressed.
function selectEncoding(header = '') {
  const choices = new Map();
  for (const entry of header.split(',')) {
    const [token, ...parameters] = entry.trim().toLowerCase().split(';');
    if (!token) continue;
    const quality = parameters.map(part => part.trim()).find(part => part.startsWith('q='));
    const q = quality ? Number(quality.slice(2)) : 1;
    choices.set(token, Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0);
  }
  const q = name => choices.get(name) ?? choices.get('*') ?? 0;
  if (q('br') > 0 && q('br') >= q('gzip')) return 'br';
  if (q('gzip') > 0) return 'gzip';
  return null;
}

function json(res, status, body, head = false) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
  res.end(head ? undefined : JSON.stringify(body));
}

export function createLandingServer({now = () => new Date()} = {}) {
  return createServer(async (req, res) => {
    const head = req.method === 'HEAD';
    if (req.method !== 'GET' && !head) {
      res.writeHead(405, {'Allow':'GET, HEAD', 'Cache-Control':'no-store'});
      return res.end();
    }
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch { return json(res, 400, {error:'bad_request'}, head); }
    if (url.pathname === '/api/windows') {
      const date = moscowFormatter.format(now());
      return json(res, 200, {windows:stories.map((story, index) => {
        const unlocked = available(story, date);
        return {id:index+1, title:unlocked ? story[0] : null, unlockDate:story[3] || null, unlockLabel:story[4] || null, available:unlocked};
      })}, head);
    }
    const storyMatch = /^\/api\/windows\/([1-9]\d*)\/story$/.exec(url.pathname);
    if (storyMatch) {
      const id = Number(storyMatch[1]);
      const story = Number.isSafeInteger(id) ? stories[id-1] : undefined;
      if (!story) return json(res, 404, {error:'not_found'}, head);
      if (!available(story, moscowFormatter.format(now()))) return json(res, 423, {error:'locked',unlockDate:story[3],unlockLabel:story[4]}, head);
      return json(res, 200, {id,title:story[0],line1:story[1],line2:story[2] || '',letterLink:id===14}, head);
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, {error:'not_found'}, head);

    let requestPath;
    try { requestPath = decodeURIComponent(url.pathname); } catch { return json(res, 400, {error:'bad_request'}, head); }
    const file = requestPath === '/' ? 'index.html' : requestPath.replace(/^\//, '');
    if (!(exposedFiles.has(file) || file.startsWith('src/assets/')) || file.includes('\\') || file.split('/').some(part => part === '.' || part === '..' || part.startsWith('.'))) {
      return json(res, 404, {error:'not_found'}, head);
    }
    try {
      const actual = await realpath(join(projectRoot, file));
      const rel = relative(projectRoot, actual);
      if (rel.startsWith('..'+sep) || rel === '..' || (!exposedFiles.has(rel) && !rel.startsWith('src'+sep+'assets'+sep))) return json(res, 404, {error:'not_found'}, head);
      const info = await stat(actual);
      const extension = extname(actual).toLowerCase();
      const contentType = mime[extension];
      if (!info.isFile() || !contentType) return json(res, 404, {error:'not_found'}, head);
      const isAsset = rel.startsWith('src'+sep+'assets'+sep);
      const encoding = compressible.has(extension) ? selectEncoding(req.headers['accept-encoding']) : null;
      const headers = {'Content-Type':contentType, 'Cache-Control':isAsset ? (immutableAsset(rel) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600') : 'no-store', 'X-Content-Type-Options':'nosniff'};
      if (compressible.has(extension)) headers.Vary = 'Accept-Encoding';
      if (encoding) headers['Content-Encoding'] = encoding;
      else headers['Content-Length'] = info.size;
      let range = null;
      if (extension === '.mp4') {
        headers['Accept-Ranges'] = 'bytes';
        // If-Range requires a matching validator; no validator is currently sent.
        if (!head && req.headers.range && !req.headers['if-range']) range = videoRange(req.headers.range, info.size);
        if (range?.unsatisfiable) {
          headers['Content-Range'] = `bytes */${info.size}`;
          headers['Content-Length'] = 0;
          res.writeHead(416, headers);
          return res.end();
        }
        if (range) {
          headers['Content-Range'] = `bytes ${range.start}-${range.end}/${info.size}`;
          headers['Content-Length'] = range.end-range.start+1;
        }
      }
      res.writeHead(range ? 206 : 200, headers);
      if (head) return res.end();
      const stream = createReadStream(actual, range ? {start:range.start,end:range.end} : undefined);
      stream.on('error', () => res.destroy());
      if (encoding) {
        const compressor = encoding === 'br'
          ? createBrotliCompress({params:{[zlibConstants.BROTLI_PARAM_QUALITY]:4}})
          : createGzip({level:4});
        compressor.on('error', () => res.destroy());
        stream.pipe(compressor).pipe(res);
      } else stream.pipe(res);
    } catch { json(res, 404, {error:'not_found'}, head); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4173);
  createLandingServer().listen(port, process.env.HOST || '0.0.0.0', () => console.log(`Landing server listening on port ${port}`));
}
