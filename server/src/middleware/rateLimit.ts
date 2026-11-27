import type { NextFunction, Request, Response } from 'express';

interface RateBucket {
  count: number;
  resetAt: number;
}

export function createIpRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message: string;
}) {
  const buckets = new Map<string, RateBucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const existing = buckets.get(ip);

    if (!existing || now >= existing.resetAt) {
      buckets.set(ip, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (existing.count >= options.maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: options.message,
      });
      return;
    }

    existing.count += 1;
    next();
  };
}
