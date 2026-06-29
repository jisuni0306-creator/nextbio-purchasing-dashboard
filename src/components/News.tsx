import { news } from "@/lib/content";

export default function News() {
  return (
    <section id="news" className="bg-espresso py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-sm font-bold uppercase tracking-widest text-caramel">
              News · 넥스트바이오 소식
            </span>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
              현장에서 증명하는 기술력
            </h2>
          </div>
          <a
            href="#contact"
            className="text-sm font-bold text-caramel-light transition-colors hover:text-caramel"
          >
            전체 소식 보기 →
          </a>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {news.map((item) => (
            <article
              key={item.title}
              className="group flex flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition-all hover:-translate-y-1 hover:border-caramel/40 hover:bg-white/[0.07]"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-bio/15 px-3 py-1 text-xs font-bold text-bio">
                  {item.tag}
                </span>
                <time className="text-xs font-medium text-cream/45">
                  {item.date}
                </time>
              </div>
              <h3 className="mt-5 flex-1 text-lg font-bold leading-snug text-white">
                {item.title}
              </h3>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-caramel-light">
                자세히 보기
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
