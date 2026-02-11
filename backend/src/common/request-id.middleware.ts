import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';

function generateRequestId(): string {
  return randomUUID();
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const headerValue = req.header(REQUEST_ID_HEADER);
  const requestId =
    typeof headerValue === 'string' && headerValue.trim().length > 0
      ? headerValue.trim()
      : generateRequestId();

  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}
