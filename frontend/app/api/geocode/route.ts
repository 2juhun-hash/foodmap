import { NextRequest, NextResponse } from 'next/server';

// SEC-02: IP당 분당 최대 10회 제한 (Kakao API 쿼터 보호)
const ipBucket = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 10;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipBucket.get(ip);
  if (!entry || now > entry.resetAt) {
    ipBucket.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= LIMIT) return false;
  entry.count++;
  return true;
}

/** Kakao Local API 프록시 — API 키를 클라이언트에 노출하지 않기 위해 서버에서 호출 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  const query = req.nextUrl.searchParams.get('query');
  if (!query) {
    return NextResponse.json({ error: '검색어를 입력해주세요.' }, { status: 400 });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: '서버 설정 오류입니다.' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`,
      { headers: { Authorization: `KakaoAK ${apiKey}` } },
    );
    if (!res.ok) throw new Error('Kakao API 호출 실패');
    const data = await res.json();
    const doc = data.documents?.[0];
    if (!doc) return NextResponse.json({ error: '검색 결과가 없습니다.' }, { status: 404 });

    return NextResponse.json({
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
      address: doc.road_address_name || doc.address_name,
      place_name: doc.place_name,
    });
  } catch {
    return NextResponse.json({ error: '위치 검색에 실패했습니다.' }, { status: 500 });
  }
}
