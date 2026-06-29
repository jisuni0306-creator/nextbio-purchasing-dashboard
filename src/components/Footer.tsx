import { company, nav, contact } from "@/lib/content";

export default function Footer() {
  return (
    <footer className="bg-espresso pt-16 pb-10 text-cream/60">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 border-b border-white/10 pb-12 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-caramel to-bio-deep text-sm font-black text-white">
                N
              </span>
              <span className="text-lg font-black tracking-tight text-white">
                {company.nameEn}
              </span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed">
              {company.tagline}. 콜드브루 OEM·ODM 전문기업 {company.legalName}.
            </p>
            <p className="mt-4 text-sm">
              브랜드 <span className="font-semibold text-caramel-light">{company.brand}</span>
            </p>
          </div>

          {/* Nav */}
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-white">
              바로가기
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="transition-colors hover:text-caramel-light"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-white">
              연락처
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              <li>본사 {contact.headquarters.tel}</li>
              <li>영업 {contact.salesOffice.tel}</li>
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="transition-colors hover:text-caramel-light"
                >
                  {contact.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-8 text-xs text-cream/40 sm:flex-row">
          <p>Copyright © 2026. NEXTBIO CO.,LTD. All Rights Reserved.</p>
          <p className="flex gap-5">
            <a href="#top" className="hover:text-cream/70">
              개인정보처리방침
            </a>
            <a href="#top" className="hover:text-cream/70">
              이용약관
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
