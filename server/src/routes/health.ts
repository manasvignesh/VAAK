import { Router } from 'express';
import { getCapabilities, type ServerConfig } from '../config.js';

export function createHealthRouter(config: ServerConfig): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      capabilities: getCapabilities(config),
    });
  });

  router.get('/capabilities', (_req, res) => {
    res.json(getCapabilities(config));
  });

  return router;
}
