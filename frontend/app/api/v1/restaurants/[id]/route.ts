import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const url = `${BACKEND}/api/v1/restaurants/${params.id}`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
