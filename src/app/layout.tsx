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
  title: "넥스트바이오 | 세계 최고의 콜드브루 전문기업",
  description:
    "넥스트바이오는 24시간 자동화 공정으로 20Brix 콜드브루 원액을 월 300톤 연속 생산하는 콜드브루 OEM·ODM 전문기업입니다. 슈퍼 드롭 프로세스, 초미세 저온 분쇄, HPP 초고압 살균기술을 보유하고 있습니다.",
  keywords: [
    "넥스트바이오",
    "콜드브루",
    "OEM",
    "ODM",
    "커피 제조",
    "HPP",
    "Brewzen",
  ],
  openGraph: {
    title: "넥스트바이오 | 세계 최고의 콜드브루 전문기업",
    description:
      "24시간 자동화 공정으로 월 300톤 콜드브루 원액을 생산하는 콜드브루 OEM·ODM 전문기업",
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
