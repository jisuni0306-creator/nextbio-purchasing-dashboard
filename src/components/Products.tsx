import { products, services } from "@/lib/content";

export default function Products() {
  return (
    <section id="products" className="bg-cream py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <span className="text-sm font-bold uppercase tracking-widest text-caramel">
            OEM · ODM · 제품군
          </span>
          <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            아이디어를 제품으로,
            <br />
            처음부터 끝까지 함께합니다
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-roast/75">
            기획 · 배합 · 생산 · 포장까지 원스톱으로 제공하는 OEM·ODM 파트너.
            커피를 넘어 티, 과채주스까지 폭넓은 음료를 제조합니다.
          </p>
        </div>

        {/* Product cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.name}
              className="group flex flex-col rounded-3xl border border-bean/12 bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-bean/10"
            >
              <h3 className="text-xl font-black text-ink">{product.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-roast/70">
                {product.desc}
              </p>
              <ul className="mt-6 space-y-2 border-t border-bean/10 pt-5">
                {product.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-sm font-medium text-roast"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-bio" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Service modes */}
        <div className="mt-6 flex flex-col gap-6 rounded-3xl bg-gradient-to-br from-coffee to-espresso p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h3 className="text-xl font-bold text-white">
              제조 방식도 자유롭게 선택하세요
            </h3>
            <p className="mt-2 text-sm text-cream/60">
              브랜드 상황과 물량에 맞춰 최적의 생산 방식을 제안합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {services.map((service) => (
              <span
                key={service}
                className="rounded-full border border-caramel/40 bg-caramel/10 px-4 py-2 text-sm font-semibold text-caramel-light"
              >
                {service}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
