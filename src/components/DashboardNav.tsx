"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "종합 현황", sub: "홈" },
  { href: "/inventory", label: "적정재고", sub: "모듈 ①" },
  { href: "/purchase-order", label: "자동발주", sub: "모듈 ②" },
  { href: "/warehouse", label: "적치대", sub: "Lot 현황" },
  { href: "/partners", label: "거래처", sub: "관리대장" },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const [toc, setToc] = useState<{ id: string; label: string }[]>([]);

  // 현재 페이지의 소제목(main h2)을 모아 목차로 (페이지 이동·동적 섹션 반영)
  useEffect(() => {
    const scan = () => {
      const hs = Array.from(document.querySelectorAll<HTMLElement>("main h2"));
      const list = hs
        .map((h, i) => {
          if (!h.id) h.id = `sec-${i}`;
          h.classList.add("scroll-mt-6");
          const f = h.firstChild;
          const label = (f && f.nodeType === 3 ? f.textContent : h.textContent) || "";
          return { id: h.id, label: label.trim() };
        })
        .filter((x) => x.label);
      setToc((prev) => (JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
    };
    scan();
    const obs = new MutationObserver(scan);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-30 border-b border-cream-deep bg-cream/90 backdrop-blur md:h-screen md:w-52 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center gap-1.5 overflow-x-auto p-3 md:h-full md:flex-col md:items-stretch md:gap-1 md:overflow-y-auto md:overflow-x-visible">
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

        {/* 현재 페이지 목차 (사이드바 하단, 데스크톱) */}
        {toc.length >= 2 && (
          <div className="mt-3 hidden border-t border-cream-deep pt-3 md:block">
            <p className="px-2 pb-1 text-[10px] font-bold tracking-wide text-bean/50">목차</p>
            <div className="flex flex-col gap-0.5">
              {toc.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className="truncate rounded-md px-3 py-1 text-xs font-medium text-bean/90 transition hover:bg-cream-deep hover:text-roast"
                  title={t.label}
                >
                  {t.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
