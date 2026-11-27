import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createHealthRouter } from './routes/health.js';
import { createTranslateRouter } from './routes/translate.js';
import { createNotesRouter } from './routes/notes.js';
import { attachTranscriptionWebSocket } from './services/deepgramProxy.js';
import { createGlobalDailyLimiter } from './middleware/rateLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const config = loadConfig();
  const app = express();

  const maxDailyAi = Number.parseInt(process.env.GLOBAL_DAILY_AI_LIMIT ?? '250', 10);
  const globalAiLimiter = createGlobalDailyLimiter({
    maxDailyRequests: Number.isFinite(maxDailyAi) && maxDailyAi > 0 ? maxDailyAi : 250,
    message:
      'Daily public AI usage budget reached. Demo Mode and local basic study notes remain available.',
  });

  app.use(express.json({ limit: '2mb' }));
  app.use('/api', createHealthRouter(config));
  app.use('/api', globalAiLimiter, createTranslateRouter(config));
  app.use('/api', globalAiLimiter, createNotesRouter(config));

  // In production, serve the built Vite client from client/dist
  const clientDistDir = path.resolve(__dirname, '../../../../client/dist');
  if (fs.existsSync(clientDistDir)) {
    app.use(express.static(clientDistDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
        next();
        return;
      }
      res.sendFile(path.join(clientDistDir, 'index.html'));
    });
  }

  const server = createServer(app);
  attachTranscriptionWebSocket(server, config);

  return { app, server, config };
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMainModule) {
  const { server, config } = createApp();
  server.listen(config.port, () => {
    console.log(`[VAAK] Server listening on http://localhost:${config.port}`);
    console.log(
      `[VAAK] Speech-to-Text: ${config.deepgramApiKey ? 'Deepgram Nova-3 configured' : 'Not configured (Demo Mode ready)'}`
    );
    console.log(
      `[VAAK] AI Notes/Translation: ${config.geminiApiKey ? `Gemini (${config.geminiModel}) configured` : 'Not configured (Demo Mode ready)'}`
    );
  });
}
