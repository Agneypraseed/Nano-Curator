import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { createGeminiService } from './server/gemini.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

const loadEnvFile = async () => {
  try {
    const raw = await readFile(path.join(root, '.env.local'), 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      if (!line || line.trim().startsWith('#')) {
        return;
      }
      const separatorIndex = line.indexOf('=');
      if (separatorIndex < 0) {
        return;
      }
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch {
    // Ignore missing env file here. The API layer will return a useful error if the key is absent.
  }
};

await loadEnvFile();

const gemini = createGeminiService(process.env.GEMINI_API_KEY || process.env.API_KEY);
const isPreview = process.argv.includes('--preview');
const port = Number(process.env.PORT || 3000);

const sendJson = (res, statusCode, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
};

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const handleApi = async (req, res) => {
  if (!req.url?.startsWith('/api/')) {
    return false;
  }

  try {
    if (req.method === 'POST' && req.url === '/api/generate-session') {
      const { wizardData, isMore, existingLookTitles } = await readJsonBody(req);
      const payload = await gemini.generateStyleSession(
        wizardData,
        Boolean(isMore),
        Array.isArray(existingLookTitles) ? existingLookTitles : [],
      );
      sendJson(res, 200, payload);
      return true;
    }

    if (req.method === 'POST' && req.url === '/api/generate-image') {
      const { identityImage, prompt, isHaircut } = await readJsonBody(req);
      const image = await gemini.generateSingleImage(identityImage, prompt, Boolean(isHaircut));
      sendJson(res, 200, { image });
      return true;
    }

    sendJson(res, 404, { error: 'Unknown API route' });
    return true;
  } catch (error) {
    console.error(error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Unexpected server error',
    });
    return true;
  }
};

const createStaticResponder = async () => {
  const distDir = path.join(root, 'dist');

  return async (req, res) => {
    if (await handleApi(req, res)) {
      return;
    }

    const requestedPath = new URL(req.url || '/', 'http://localhost').pathname;
    const normalizedPath = requestedPath === '/' ? '/index.html' : requestedPath;
    const candidatePath = path.join(distDir, normalizedPath);

    try {
      const fileStats = await stat(candidatePath);
      if (fileStats.isFile()) {
        const extension = path.extname(candidatePath);
        const contents = await readFile(candidatePath);
        res.writeHead(200, {
          'Content-Type': mimeTypes[extension] || 'application/octet-stream',
        });
        res.end(contents);
        return;
      }
    } catch {
      // Fall through to SPA fallback.
    }

    const html = await readFile(path.join(distDir, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  };
};

let requestListener;

if (isPreview) {
  requestListener = await createStaticResponder();
} else {
  const vite = await createViteServer({
    root,
    server: {
      middlewareMode: true,
    },
    appType: 'spa',
  });

  requestListener = async (req, res) => {
    if (await handleApi(req, res)) {
      return;
    }
    vite.middlewares(req, res, () => {
      res.statusCode = 404;
      res.end('Not found');
    });
  };
}

http
  .createServer((req, res) => {
    Promise.resolve(requestListener(req, res)).catch((error) => {
      console.error(error);
      res.statusCode = 500;
      res.end('Server error');
    });
  })
  .listen(port, '0.0.0.0', () => {
    console.log(`Nano Curator running at http://localhost:${port}`);
  });
