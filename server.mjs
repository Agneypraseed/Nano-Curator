import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { createGeminiService } from './server/gemini.mjs';
import { createLocalService } from './server/local.mjs';
import { createOpenAIService } from './server/openai.mjs';
import { createShoppingService } from './server/shopping.mjs';

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
      let value = line.slice(separatorIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch {
    // Ignore missing env file here. The API layer will return a useful error if the key is absent.
  }
};

await loadEnvFile();

const localService = createLocalService({
  textApiUrl: process.env.LLM_API_URL || 'http://localhost:11434/v1',
  textModel: process.env.LLM_MODEL || 'gemma4:e4b',
  vtonApiUrl: process.env.VTON_API_URL || 'http://127.0.0.1:7860',
});
const shoppingService = createShoppingService({
  imgbbApiKey: process.env.IMGBB_API_KEY,
  serpApiKey: process.env.SERPAPI_API_KEY,
});

// Inject the local VTON image generator into Gemini so it falls back for target garments
const configuredKeys = {
  gemini: process.env.GEMINI_API_KEY || process.env.API_KEY || '',
  openai: process.env.OPENAI_API_KEY || '',
};

const resolveService = (wizardData = {}, credentials = {}) => {
  if (wizardData.backend === 'local') {
    return createLocalService({
      textApiUrl: credentials.localTextApiUrl || process.env.LLM_API_URL || 'http://localhost:11434/v1',
      textModel: process.env.LLM_MODEL || 'gemma4:e4b',
      vtonApiUrl: credentials.localVtonApiUrl || process.env.VTON_API_URL || 'http://127.0.0.1:7860',
    });
  }
  if (wizardData.backend === 'openai') return createOpenAIService(credentials.apiKey || configuredKeys.openai, 'gpt-5.4-nano');
  return createGeminiService(credentials.apiKey || configuredKeys.gemini, localService.generateSingleImage, wizardData.model || 'gemini-3.5-flash');
};

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
    if (req.method === 'GET' && req.url === '/api/provider-status') {
      sendJson(res, 200, { gemini: Boolean(configuredKeys.gemini), openai: Boolean(configuredKeys.openai) });
      return true;
    }

    if (req.method === 'POST' && req.url === '/api/generate-session') {
      const { wizardData, credentials, isMore, existingLookTitles } = await readJsonBody(req);
      const service = resolveService(wizardData, credentials);
      const payload = await service.generateStyleSession(
        wizardData,
        Boolean(isMore),
        Array.isArray(existingLookTitles) ? existingLookTitles : [],
      );
      sendJson(res, 200, payload);
      return true;
    }

    if (req.method === 'POST' && req.url === '/api/generate-image') {
      const { identityImage, garmentImage, prompt, isHaircut, wizardData, credentials } = await readJsonBody(req);
      const service = resolveService(wizardData, credentials);
      const image = await service.generateSingleImage(identityImage, garmentImage, prompt, Boolean(isHaircut));
      sendJson(res, 200, { image });
      return true;
    }

    if (req.method === 'POST' && req.url === '/api/extract-wardrobe-items') {
      const { image, wizardData, credentials } = await readJsonBody(req);
      if (!image || typeof image !== 'string') {
        sendJson(res, 400, { error: 'An outfit image is required.' });
        return true;
      }
      const service = resolveService(wizardData, credentials);
      if (!service.extractWardrobeItems) {
        throw new Error('This local VTON endpoint can try clothes on a person, but it cannot extract separate garments. Select OpenAI or Gemini for outfit imports.');
      }
      const items = await service.extractWardrobeItems(image);
      sendJson(res, 200, { items });
      return true;
    }

    if (req.method === 'POST' && req.url === '/api/transform-look') {
      const { wizardData, identityImage, garmentImage, style, instruction, credentials } = await readJsonBody(req);
      const service = resolveService(wizardData, credentials);
      const payload = await service.transformLook(wizardData, identityImage, garmentImage, style, instruction);
      sendJson(res, 200, payload);
      return true;
    }

    if (req.method === 'POST' && req.url === '/api/visual-search') {
      const { image } = await readJsonBody(req);
      const shoppingItems = await shoppingService.findShoppingLinks(image);
      sendJson(res, 200, { shoppingItems });
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
