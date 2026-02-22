import 'express';
import 'http';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    activeTenantId?: string;
    activeLocationId?: string;
    membership?: {
      id: string;
      orgId: string;
      gymId: string | null;
      role: string;
      status: string;
      userId: string;
    };
  }
}

declare module 'http' {
  interface IncomingMessage {
    requestId?: string;
  }
}
