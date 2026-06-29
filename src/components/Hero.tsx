import { company, heroStats } from "@/lib/content";

export default function Hero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden bg-espresso pt-32 pb-20 sm:pt-40 sm:pb-28"
    >
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 right-[-10%] h-[34rem] w-[34rem] rounded-full bg-caramel/20 blur-3xl animate-float-slow" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[30rem] w-[30rem] rounded-full bg-bio/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-caramel/40 bg-caramel/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-caramel-light">
            <span className="h-1.5 w-1.5 rounded-full bg-bio" />
            Cold Brew Specialist · Since Korea
          </span>

          <h1 className="mt-7 text-4xl font-black leading-[1.18] tracking-tight text-white sm:text-5xl lg:text-6xl">
            신뢰와 품질로 인정받는
            <br />
            <span className="bg-gradient-to-r from-caramel-light via-caramel to-bio bg-clip-text text-transparent">
              세계 최고의 콜드브루
            </span>{" "}
            전문기업
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-relaxed text-cream/70 sm:text-lg">
            {company.legalName}는 24시간 자동화 공정으로 20Brix 기준 콜드브루
            원액을 <strong className="font-bold text-cream">월 300톤</strong>{" "}
            연속 생산합니다. 슈퍼 드롭 프로세스부터 HPP 초고압 살균까지, 한 곳에서
            완성하는 콜드브루 OEM·ODM 파트너입니다.
          </p>

          <div className="mt-9 flex flex-wrap gap-3.5">
            <a
              href="#contact"
              className="rounded-full bg-caramel px-7 py-3.5 text-sm font-bold text-espresso transition-all hover:bg-caramel-light hover:shadow-xl hover:shadow-caramel/30"
            >
              사업 문의하기
            </a>
            <a
              href="#technology"
              className="rounded-full border border-white/25 px-7 py-3.5 text-sm font-bold text-white transition-all hover:border-white/60 hover:bg-white/5"
            >
              핵심 기술 살펴보기
            </a>
          </div>
        </div>

        {/* Stat strip */}
        <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:mt-20 lg:grid-cols-4">
          {heroStats.map((stat) => (
            <div key={stat.label} className="bg-espresso px-6 py-7">
              <dt className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white sm:text-4xl">
                  {stat.value}
                </span>
                <span className="text-sm font-bold text-caramel">
                  {stat.unit}
                </span>
              </dt>
              <dd className="mt-2 text-sm text-cream/55">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
