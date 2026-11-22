import { createServer } from 'node:http';
import { readFile, mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const tools = new Set(['refund-reconciliation', 'ai-support-regression', 'vision-error-review']);
const local = path => fileURLToPath(new URL(path, import.meta.url));

async function analyze(request, tool) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2_000_000) throw new Error('数据超过 2 MB');
    chunks.push(chunk);
  }
  const directory = await mkdtemp(join(tmpdir(), 'startup-prototypes-'));
  const file = join(directory, 'input.json');
  try {
    await writeFile(file, Buffer.concat(chunks));
    const { stdout } = await execute(process.execPath, [local(tool + '/index.mjs'), file], {
      timeout: 10000, maxBuffer: 16_000_000, windowsHide: true,
    });
    return stdout;
  } finally {
    await unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await rmdir(directory);
  }
}

createServer(async (request, response) => {
  const [, route, tool] = (request.url ?? '/').split('/');
  let status = 200;
  let type = 'application/json';
  let body;
  try {
    if (request.method === 'GET' && request.url === '/') {
      type = 'text/html';
      body = await readFile(local('index.html'));
    } else if (tools.has(tool) && route === 'sample' && request.method === 'GET') {
      body = await readFile(local(tool + '/sample.json'));
    } else if (tools.has(tool) && route === 'run' && request.method === 'POST') {
      body = await analyze(request, tool);
    } else {
      status = 404;
      body = JSON.stringify({ error: '找不到页面' });
    }
  } catch (error) {
    status = 400;
    body = JSON.stringify({ error: error.stderr?.trim() || error.message });
  }
  response.writeHead(status, { 'Content-Type': type + '; charset=utf-8' });
  response.end(body);
}).listen(Number(process.env.PORT ?? 4173), '127.0.0.1', function () {
  console.log('http://127.0.0.1:' + this.address().port);
});

