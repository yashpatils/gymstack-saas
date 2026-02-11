import 'express';
import 'http';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
  }
}

declare module 'http' {
  interface IncomingMessage {
    requestId?: string;
  }
}
