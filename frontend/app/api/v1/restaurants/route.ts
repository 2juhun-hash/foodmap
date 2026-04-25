import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const search = req.nextUrl.search;
  const url = `${BACKEND}/api/v1/restaurants${search}`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
