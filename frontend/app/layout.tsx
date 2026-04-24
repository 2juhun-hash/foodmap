import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FoodMap — 미슐랭·블루리본·식신 맛집 지도',
  description: '미슐랭, 블루리본, 식신 3대 맛집 가이드를 한 곳에서. 내 주변 최고의 맛집을 찾아보세요.',
  openGraph: {
    title: 'FoodMap',
    description: '미슐랭·블루리본·식신 맛집을 지도로',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* R-09: DM Serif Display + Pretendard */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
      </head>
      <body className="bg-background">
        {children}
      </body>
    </html>
  );
}
