"use client";

import { useEffect, useState } from "react";

// 페이지의 소제목(main 내 h2)을 모아 '목차' 칩으로 표시. 누르면 해당 섹션으로 스크롤.
export default function PageTOC() {
  const [items, setItems] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    const scan = () => {
      const hs = Array.from(document.querySelectorAll<HTMLElement>("main h2"));
      const list = hs
        .map((h, i) => {
          if (!h.id) h.id = `sec-${i}`;
          h.classList.add("scroll-mt-6");
          const first = h.firstChild;
          const label = (first && first.nodeType === 3 ? first.textContent : h.textContent) || "";
          return { id: h.id, label: label.trim() };
        })
        .filter((x) => x.label);
      setItems((prev) => (JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
    };
    scan();
    const main = document.querySelector("main");
    const obs = new MutationObserver(scan);
    if (main) obs.observe(main, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  if (items.length < 2) return null;
  return (
    <nav aria-label="목차" className="mt-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-bold text-bean/70">목차</span>
      {items.map((it) => (
        <a
          key={it.id}
          href={`#${it.id}`}
          className="rounded-full border border-cream-deep bg-white px-2.5 py-1 text-xs font-semibold text-bean shadow-sm transition hover:bg-cream-deep hover:text-roast"
        >
          {it.label}
        </a>
      ))}
    </nav>
  );
}
