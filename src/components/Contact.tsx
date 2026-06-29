import { contact, company } from "@/lib/content";

type Office = { label: string; address: string; tel: string; fax?: string };

export default function Contact() {
  const offices: Office[] = [contact.headquarters, contact.salesOffice];

  return (
    <section id="contact" className="bg-cream py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* CTA band */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-bio-deep via-coffee to-espresso px-8 py-14 sm:px-14 sm:py-20">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-caramel/20 blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
              콜드브루 제조, 넥스트바이오와 시작하세요
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-cream/75">
              제품 기획부터 대량 생산까지, 무엇이든 문의해 주세요. 담당자가
              빠르게 상담을 도와드립니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <a
                href={`mailto:${contact.email}`}
                className="rounded-full bg-caramel px-7 py-3.5 text-sm font-bold text-espresso transition-all hover:bg-caramel-light hover:shadow-xl hover:shadow-black/20"
              >
                {contact.email}
              </a>
              <a
                href={`tel:${contact.headquarters.tel.replace(/-/g, "")}`}
                className="rounded-full border border-white/30 px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/10"
              >
                대표전화 {contact.headquarters.tel}
              </a>
            </div>
          </div>
        </div>

        {/* Locations */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {offices.map((office) => (
            <div
              key={office.label}
              className="rounded-3xl border border-bean/15 bg-white p-8"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-bio/10 text-bio-deep">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="10"
                      r="2.4"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>
                </span>
                <h3 className="text-lg font-bold text-ink">{office.label}</h3>
              </div>
              <p className="mt-5 leading-relaxed text-roast/80">
                {office.address}
              </p>
              <dl className="mt-5 space-y-1.5 border-t border-bean/10 pt-5 text-sm">
                <div className="flex gap-3">
                  <dt className="w-12 font-bold text-bean">TEL</dt>
                  <dd className="text-roast">{office.tel}</dd>
                </div>
                {office.fax && (
                  <div className="flex gap-3">
                    <dt className="w-12 font-bold text-bean">FAX</dt>
                    <dd className="text-roast">{office.fax}</dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-roast/55">
          {company.legalName} · 대표 이메일{" "}
          <a
            href={`mailto:${contact.email}`}
            className="font-semibold text-bio-deep underline-offset-2 hover:underline"
          >
            {contact.email}
          </a>
        </p>
      </div>
    </section>
  );
}
