"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/inventory", label: "적정재고", sub: "모듈 ①" },
  { href: "/purchase-order", label: "자동발주", sub: "모듈 ②" },
  { href: "/warehouse", label: "적치대", sub: "Lot 현황" },
  { href: "/partners", label: "거래처", sub: "관리대장" },
];

export default function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-30 border-b border-cream-deep bg-cream/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-1.5 overflow-x-auto px-3 py-2.5 sm:px-5">
        <span className="mr-2 flex shrink-0 items-center gap-1.5 text-sm font-extrabold text-bean">
          <span className="text-base">☕</span> 구매물류 자동화
        </span>
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                active
                  ? "bg-espresso text-cream shadow-sm"
                  : "text-bean hover:bg-cream-deep"
              }`}
            >
              {l.label}
              <span className={`ml-1.5 text-[10px] font-medium ${active ? "text-mint-light" : "text-bean/60"}`}>
                {l.sub}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
