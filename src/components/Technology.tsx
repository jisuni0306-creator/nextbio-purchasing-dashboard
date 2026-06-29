import { technologies } from "@/lib/content";

const icons = [
  // Super Drop — droplet
  <svg key="drop" viewBox="0 0 24 24" fill="none" className="h-7 w-7">
    <path
      d="M12 3s6 6.5 6 11a6 6 0 11-12 0c0-4.5 6-11 6-11z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>,
  // Cold grinding — gear/snow
  <svg key="grind" viewBox="0 0 24 24" fill="none" className="h-7 w-7">
    <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>,
  // HPP — shield
  <svg key="hpp" viewBox="0 0 24 24" fill="none" className="h-7 w-7">
    <path
      d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M9 12l2 2 4-4"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>,
];

export default function Technology() {
  return (
    <section id="technology" className="relative bg-espresso py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-0 opacity-[0.06]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <span className="text-sm font-bold uppercase tracking-widest text-caramel">
            Technology · 핵심 기술력
          </span>
          <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
            맛과 안전을 동시에 잡는
            <br />
            세 가지 독자 기술
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-cream/65">
            추출부터 살균까지, 콜드브루 품질을 결정하는 모든 단계에 넥스트바이오의
            축적된 공정 기술이 적용됩니다.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {technologies.map((tech, i) => (
            <div
              key={tech.title}
              className="group relative flex flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-8 transition-all hover:-translate-y-1 hover:border-caramel/40 hover:bg-white/[0.07]"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-caramel to-bean text-espresso transition-transform group-hover:scale-105">
                {icons[i]}
              </span>
              <span className="mt-6 text-xs font-bold uppercase tracking-wider text-caramel-light">
                {tech.tag}
              </span>
              <h3 className="mt-2 text-xl font-bold text-white">
                {tech.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-cream/60">
                {tech.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
