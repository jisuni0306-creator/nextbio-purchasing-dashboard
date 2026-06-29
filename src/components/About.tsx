import { company, values } from "@/lib/content";

export default function About() {
  return (
    <section id="about" className="bg-cream py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-20">
          {/* Left: heading + mission */}
          <div>
            <span className="text-sm font-bold uppercase tracking-widest text-bio-deep">
              About · 회사소개
            </span>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
              건강과 행복을 담은
              <br />
              최상의 제품을 만듭니다
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-roast/80">
              {company.mission}
            </p>
            <p className="mt-4 leading-relaxed text-roast/65">
              {company.nameKo}는 콜드브루 제조에 필요한 로스팅 · 추출 · 살균 ·
              포장 전 공정을 자체 보유한 일관 생산 체계를 갖추고, 국내외
              파트너에게 안정적인 품질과 공급을 제공합니다.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {["콜드브루 일관 생산", "자체 중앙연구소", "글로벌 수출"].map(
                (chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-bean/20 bg-white px-4 py-2 text-sm font-semibold text-roast"
                  >
                    {chip}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Right: core values */}
          <div>
            <p className="mb-5 text-sm font-bold uppercase tracking-widest text-caramel">
              Core Values · 핵심가치
            </p>
            <div className="space-y-4">
              {values.map((value, i) => (
                <div
                  key={value.title}
                  className="group flex gap-5 rounded-2xl border border-bean/10 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-caramel/40 hover:shadow-xl hover:shadow-bean/5"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-coffee to-roast text-lg font-black text-caramel-light">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-ink">
                      {value.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-roast/70">
                      {value.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
