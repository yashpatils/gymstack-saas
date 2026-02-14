import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { OAuthRequestedMode } from './oauth.types';

export type OAuthStatePayload = {
  returnTo: string;
  requestedMode: OAuthRequestedMode;
  timestamp: number;
  nonce: string;
};

@Injectable()
export class OAuthStateService {
  sign(payload: OAuthStatePayload, secret: string): string {
    const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = createHmac('sha256', secret).update(data).digest('base64url');
    return `${data}.${signature}`;
  }

  verify(state: string, secret: string, maxAgeMs: number): OAuthStatePayload {
    const [data, signature] = state.split('.');
    if (!data || !signature) {
      throw new UnauthorizedException('Invalid OAuth state');
    }

    const expected = createHmac('sha256', secret).update(data).digest('base64url');
    if (signature.length !== expected.length) {
      throw new UnauthorizedException('Invalid OAuth state');
    }
    const valid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!valid) {
      throw new UnauthorizedException('Invalid OAuth state');
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as OAuthStatePayload;
    if (!payload.timestamp || Date.now() - payload.timestamp > maxAgeMs) {
      throw new UnauthorizedException('Expired OAuth state');
    }

    return payload;
  }

  newNonce(): string {
    return randomBytes(16).toString('hex');
  }
}
