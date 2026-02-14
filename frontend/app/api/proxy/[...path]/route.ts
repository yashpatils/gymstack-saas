import { NextRequest, NextResponse } from 'next/server';

function resolveBackendUrl(pathname: string, search: string): string {
  const backendUrl = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  if (!backendUrl) {
    throw new Error('Missing API_URL or NEXT_PUBLIC_API_URL for proxy route.');
  }

  return `${backendUrl}/${pathname}${search}`;
}

function filterHeaders(headers: Headers): Headers {
  const forwarded = new Headers();
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'connection' || lower === 'content-length') {
      return;
    }
    forwarded.set(key, value);
  });
  return forwarded;
}

async function proxyRequest(request: NextRequest, path: string[]): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const target = resolveBackendUrl(path.join('/'), requestUrl.search);
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  const response = await fetch(target, {
    method: request.method,
    headers: filterHeaders(request.headers),
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
  });

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}

export async function OPTIONS(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}
