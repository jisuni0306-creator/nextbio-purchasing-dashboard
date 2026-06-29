import Link from "next/link";
import DashboardNav from "@/components/DashboardNav";

const CARDS = [
  {
    href: "/inventory",
    emoji: "📦",
    title: "적정재고",
    sub: "모듈 ①",
    desc: "ROP·안전재고 기준으로 부족/과잉을 자동 판정하고, 실제 창고별 재고현황을 한눈에.",
    accent: "from-sky-400/15",
  },
  {
    href: "/purchase-order",
    emoji: "🧾",
    title: "자동발주",
    sub: "모듈 ②",
    desc: "부족 품목을 공급사별 발주서로 자동 생성. 검토→승인→발송, 표준 발주서 양식 출력.",
    accent: "from-caramel/20",
  },
  {
    href: "/partners",
    emoji: "🤝",
    title: "거래처 관리대장",
    sub: "AppSheet 연동",
    desc: "매입·매출 거래처를 한 곳에서 관리하고, AppSheet 등록 폼·구글시트와 연동.",
    accent: "from-bio/15",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      <DashboardNav />

      <header className="bg-gradient-to-br from-espresso via-coffee to-roast text-cream">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-cream/10 px-3 py-1 text-xs font-medium text-cream-deep ring-1 ring-cream/15">
            <span className="h-1.5 w-1.5 rounded-full bg-caramel" />
            구매물류팀 업무 자동화 시스템
          </span>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            구매물류 자동화 대시보드
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-deep/80 sm:text-base">
            위하고·구글시트 데이터를 단일 기준으로, 재고 감지 → 발주/품의 → 거래처 관리까지
            하나의 흐름으로 연결하는 통합 자동화 대시보드입니다.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-12">
        <div className="grid gap-5 md:grid-cols-3">
          {CARDS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`group relative overflow-hidden rounded-2xl border border-cream-deep bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.accent} to-transparent opacity-0 transition group-hover:opacity-100`} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{c.emoji}</span>
                  <span className="rounded-full bg-cream-deep px-2.5 py-0.5 text-[11px] font-bold text-bean">{c.sub}</span>
                </div>
                <h2 className="mt-4 text-xl font-extrabold text-coffee">{c.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-bean/80">{c.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-bean transition group-hover:gap-2">
                  열기 <span aria-hidden>→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-xs leading-relaxed text-bean/70">
          상단 메뉴에서 각 대시보드로 이동할 수 있습니다. 데이터는 브라우저에 저장되며, CSV/엑셀 업로드로 실제 데이터를 반영할 수 있습니다.
        </p>
      </div>
    </main>
  );
}
