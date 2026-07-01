"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "종합 현황", sub: "홈" },
  { href: "/inventory", label: "적정재고", sub: "모듈 ①" },
  { href: "/purchase-order", label: "자동발주", sub: "모듈 ②" },
  { href: "/warehouse", label: "적치대", sub: "Lot 현황" },
  { href: "/partners", label: "거래처", sub: "관리대장" },
];

export default function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-30 border-b border-cream-deep bg-cream/90 backdrop-blur md:h-screen md:w-52 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center gap-1.5 overflow-x-auto p-3 md:h-full md:flex-col md:items-stretch md:gap-1 md:overflow-visible">
        <Link href="/" className="mr-2 flex shrink-0 items-center gap-1.5 md:mb-3 md:mr-0 md:px-2 md:py-1">
          <span className="text-lg">☕</span>
          <span className="text-sm font-extrabold leading-tight text-bean">구매물류 자동화</span>
        </Link>
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex shrink-0 items-center justify-between rounded-lg px-3.5 py-1.5 transition md:py-2.5 ${
                active ? "bg-espresso text-cream shadow-sm" : "text-bean hover:bg-cream-deep"
              }`}
            >
              <span className="text-sm font-bold">{l.label}</span>
              <span className={`ml-1.5 text-[10px] font-medium ${active ? "text-mint-light" : "text-bean/60"}`}>{l.sub}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
