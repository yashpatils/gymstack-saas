import { NextRequest, NextResponse } from 'next/server';

function resolveBackendBaseUrl(): string {
  return (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').trim().replace(/\/+$/, '');
}

export async function GET(request: NextRequest, { params }: { params: { slug: string } }): Promise<NextResponse> {
  const incomingHost = request.headers.get('host') ?? '';
  const backendBaseUrl = resolveBackendBaseUrl();
  const backendUrl = new URL(`${backendBaseUrl}/api/public/gyms/${encodeURIComponent(params.slug)}`);

  const response = await fetch(backendUrl.toString(), {
    cache: 'force-cache',
    headers: {
      host: incomingHost,
      'x-forwarded-host': incomingHost,
    },
  });

  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
      'cache-control': response.headers.get('cache-control') ?? 'public, s-maxage=120, stale-while-revalidate=600',
    },
  });
}
