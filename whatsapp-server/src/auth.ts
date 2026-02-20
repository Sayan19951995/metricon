import { Request, Response, NextFunction } from 'express';

const SERVER_SECRET = process.env.WA_SERVER_SECRET || 'dev-secret';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-api-key'] || req.query.key;

  if (token !== SERVER_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
