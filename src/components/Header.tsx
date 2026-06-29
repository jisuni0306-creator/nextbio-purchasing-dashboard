"use client";

import { useEffect, useState } from "react";
import { nav, company, languages } from "@/lib/content";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || open
          ? "bg-espresso shadow-lg shadow-black/30"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* Logo */}
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-caramel to-bio-deep text-sm font-black text-white">
            N
          </span>
          <span className="text-lg font-black tracking-tight text-white">
            {company.nameEn}
            <span className="ml-1 hidden text-sm font-medium text-caramel-light sm:inline">
              {company.nameKo}
            </span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-cream/80 transition-colors hover:text-caramel-light"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {/* Language switch */}
          <div className="hidden items-center gap-1.5 text-xs font-semibold sm:flex">
            {languages.map((lang, i) => (
              <span key={lang} className="flex items-center gap-1.5">
                <button
                  className={`transition-colors ${
                    i === 0
                      ? "text-caramel-light"
                      : "text-cream/50 hover:text-cream"
                  }`}
                >
                  {lang}
                </button>
                {i < languages.length - 1 && (
                  <span className="text-cream/25">·</span>
                )}
              </span>
            ))}
          </div>

          <a
            href="#contact"
            className="hidden rounded-full bg-caramel px-5 py-2.5 text-sm font-bold text-espresso transition-all hover:bg-caramel-light hover:shadow-lg hover:shadow-caramel/30 md:inline-block"
          >
            사업 문의
          </a>

          {/* Mobile toggle */}
          <button
            aria-label="메뉴 열기"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-lg text-white lg:hidden"
          >
            <div className="space-y-1.5">
              <span
                className={`block h-0.5 w-6 bg-current transition-all ${
                  open ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-6 bg-current transition-all ${
                  open ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-6 bg-current transition-all ${
                  open ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t border-white/10 bg-espresso/98 px-5 pb-6 pt-2 lg:hidden">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block border-b border-white/5 py-3.5 text-base font-medium text-cream/85"
            >
              {item.label}
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className="mt-4 block rounded-full bg-caramel py-3 text-center text-sm font-bold text-espresso"
          >
            사업 문의하기
          </a>
        </nav>
      )}
    </header>
  );
}
