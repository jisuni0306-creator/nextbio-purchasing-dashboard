import { facilities } from "@/lib/content";

export default function Infra() {
  return (
    <section id="infra" className="bg-cream-deep py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="text-sm font-bold uppercase tracking-widest text-bio-deep">
              Infra · 생산 인프라
            </span>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
              월 300톤을 책임지는
              <br />
              일관 생산 라인
            </h2>
          </div>
          <p className="max-w-md text-roast/70">
            로스팅 → 추출 → 균질화 → 살균 → 포장으로 이어지는 전 공정을 한
            공장에서 처리해 품질 편차 없이 대량 공급이 가능합니다.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {facilities.map((facility, i) => (
            <div
              key={facility.title}
              className="relative overflow-hidden rounded-3xl bg-espresso p-8 text-white"
            >
              <span className="absolute right-6 top-6 text-6xl font-black text-white/5">
                0{i + 1}
              </span>
              <h3 className="text-lg font-bold text-caramel-light">
                {facility.title}
              </h3>
              <p className="mt-3 text-2xl font-black">{facility.metric}</p>
              <p className="mt-4 text-sm leading-relaxed text-cream/60">
                {facility.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Quality / certification band */}
        <div className="mt-6 grid gap-6 rounded-3xl border border-bean/15 bg-white p-8 sm:grid-cols-2 sm:p-10 lg:grid-cols-4">
          {[
            { k: "품질관리", v: "전수 모니터링" },
            { k: "인증현황", v: "식품안전 시스템" },
            { k: "중앙연구소", v: "자체 R&D" },
            { k: "위생설비", v: "완전 밀봉 포장" },
          ].map((item) => (
            <div key={item.k}>
              <p className="text-sm font-semibold text-bio-deep">{item.k}</p>
              <p className="mt-1 text-lg font-bold text-ink">{item.v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
