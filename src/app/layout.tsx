import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "구매물류 자동화 대시보드 | 적정재고·자동발주·거래처 관리",
  description:
    "구매물류팀 업무 자동화 시스템 — 적정재고 자동 체크, 구매발주서 자동 생성, 거래처 관리대장(AppSheet 연동)을 한 곳에서.",
  openGraph: {
    title: "구매물류 자동화 대시보드",
    description: "적정재고 · 자동발주 · 거래처 관리 통합 대시보드",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {children}
      </body>
    </html>
  );
}
