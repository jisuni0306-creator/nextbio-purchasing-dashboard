"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DashboardNav from "@/components/DashboardNav";
import { useRackSlots } from "@/lib/useRackSlots";
import {
  LEVELS,
  LINES,
  RACK_PRODUCTS,
  isOccupied,
  daysToExpiry,
  productColor,
  expiryColor,
  slotsToCsv,
  parseSlotCsv,
  rowsToSlots,
  type Slot,
} from "@/lib/racks";

type ViewMode = "product" | "expiry" | "occupancy";
const num = (n: number) => Math.round(n).toLocaleString("ko-KR");

export default function WarehouseDashboard() {
  const { slots, setSlots, reset } = useRackSlots();
  const [mode, setMode] = useState<ViewMode>("product");
  const [productFilter, setProductFilter] = useState("전체");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Slot | null>(null);
  const [today, setToday] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  const lookup = useMemo(() => {
    const m = new Map<string, Slot>();
    slots.forEach((s) => m.set(`${s.zone}|${s.bay}|${s.pallet}|${s.level}`, s));
    return m;
  }, [slots]);

  const productsInUse = useMemo(() => {
    const codes = new Set(slots.filter(isOccupied).map((s) => s.code));
    return RACK_PRODUCTS.filter((p) => codes.has(p.code));
  }, [slots]);

  const filterActive = productFilter !== "전체" || q.trim() !== "";
  const matchOf = (s?: Slot) =>
    !!s && isOccupied(s) &&
    (productFilter === "전체" || s.code === productFilter) &&
    (q.trim() === "" || `${s.lotNo} ${s.name} ${s.code}`.toLowerCase().includes(q.toLowerCase()));

  const stats = useMemo(() => {
    const occupied = slots.filter(isOccupied);
    const near = occupied.filter((s) => {
      const d = daysToExpiry(s.expiry, today || "2026-06-30");
      return d <= 30;
    }).length;
    return {
      total: slots.length,
      occ: occupied.length,
      empty: slots.length - occupied.length,
      rate: slots.length ? Math.round((occupied.length / slots.length) * 100) : 0,
      near,
    };
  }, [slots, today]);

  const lotList = useMemo(() => {
    return slots
      .filter((s) => matchOf(s) || (!filterActive && isOccupied(s)))
      .sort((a, b) => a.zone.localeCompare(b.zone) || a.bay - b.bay || b.level - a.level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, productFilter, q]);

  const cellBg = (s?: Slot) => {
    if (!s || !isOccupied(s)) return undefined;
    if (mode === "occupancy") return "#2bb6a0";
    if (mode === "expiry") return expiryColor(daysToExpiry(s.expiry, today || "2026-06-30"));
    return productColor(s.code);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let parsed: Slot[];
      if (/\.csv$/i.test(file.name)) parsed = parseSlotCsv(await file.text());
      else {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        parsed = rowsToSlots(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }));
      }
      if (!parsed.length) alert("인식된 적치 데이터가 없습니다. 헤더(라인·적치대·파렛트·단·Lot번호·품목코드·품목명·수량·입고일·유효기간)를 확인해주세요.");
      else if (confirm(`${parsed.length}건을 불러옵니다. 현재 적치 현황을 교체할까요?`)) {
        setSlots(parsed); setProductFilter("전체"); setQ(""); setSelected(null);
      }
    } catch (err) {
      alert("파일을 읽지 못했습니다: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([slotsToCsv(slots)], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = "적치대_Lot현황.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-cream text-ink">
      <DashboardNav />

      <header className="border-b border-cream-deep bg-gradient-to-br from-white via-cream to-mint-light/40">
        <div className="mx-auto max-w-6xl px-5 py-9">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-bean shadow-sm ring-1 ring-cream-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
            구매물류팀 업무 자동화 시스템
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-coffee sm:text-3xl">적치대 · Lot 현황</h1>
          <p className="mt-2 max-w-2xl text-sm text-bean">
            창고 적치대(기본 <span className="font-semibold text-roast">4단</span>)별 적재 Lot·제품을 한눈에. 칸을 누르면 Lot 상세가 보입니다.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-7">
        {/* KPI */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="총 파렛트" value={num(stats.total)} unit={`${LINES.length}라인 · 4단`} tone="ink" />
          <Kpi label="적재" value={num(stats.occ)} unit="파렛트" tone="mint" />
          <Kpi label="빈 파렛트" value={num(stats.empty)} unit="파렛트" tone="bean" />
          <Kpi label="적재율" value={`${stats.rate}%`} unit="가동률" tone="bean" />
          <Kpi label="유효기간 임박" value={num(stats.near)} unit="30일 이내" tone="rose" />
        </section>

        {/* 컨트롤 */}
        <section className="mt-6 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-cream-deep bg-white p-0.5">
            {([["product", "제품별"], ["expiry", "유효기간"], ["occupancy", "적재"]] as [ViewMode, string][]).map(([m, l]) => (
              <button key={m} onClick={() => setMode(m)} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${mode === m ? "bg-espresso text-cream" : "text-bean hover:text-roast"}`}>{l}</button>
            ))}
          </div>
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean">
            <option value="전체">전체 제품</option>
            {productsInUse.map((p) => (<option key={p.code} value={p.code}>{p.name}</option>))}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Lot번호·제품 검색" className="min-w-[150px] flex-1 rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs text-roast placeholder:text-bean/50 focus:border-mint focus:outline-none" />
          <button onClick={() => fileRef.current?.click()} className="rounded-lg bg-bean px-3 py-2 text-xs font-bold text-cream transition hover:bg-roast">⬆ CSV/엑셀</button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFile} className="hidden" />
          <button onClick={exportCsv} className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean transition hover:bg-cream-deep">⬇ CSV</button>
          <button onClick={() => confirm("샘플 적치 현황으로 초기화할까요?") && reset()} className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean transition hover:bg-cream-deep">초기화</button>
        </section>

        {/* 범례 */}
        <section className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-bean">
          {mode === "product" && productsInUse.map((p) => (
            <span key={p.code} className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded" style={{ background: p.color }} /> {p.name}
            </span>
          ))}
          {mode === "expiry" && [["#e53935", "만료"], ["#fb8c00", "30일 이내"], ["#fdd835", "90일 이내"], ["#66bb6a", "양호"]].map(([c, l]) => (
            <span key={l} className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: c }} /> {l}</span>
          ))}
          {mode === "occupancy" && (<><span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-mint" /> 적재</span><span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-dashed border-bean/40 bg-cream" /> 빈 칸</span></>)}
        </section>

        {/* 적치대 맵 + 상세 */}
        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            {LINES.map((line) => {
              let bayNo = 0;
              return (
                <div key={line.name} className="rounded-2xl border border-cream-deep bg-white p-4 shadow-sm">
                  <div className="mb-2 text-sm font-extrabold text-coffee">🏭 {line.name}</div>
                  <div className="overflow-x-auto pb-1">
                    <div className="flex items-stretch gap-1.5">
                      {line.segs.map((seg, si) => {
                        if (seg.kind === "aisle") {
                          return (
                            <div key={`a${si}`} className="flex w-10 shrink-0 items-center justify-center rounded bg-[repeating-linear-gradient(45deg,#efe6d6,#efe6d6_5px,#fff_5px,#fff_10px)] px-1">
                              <span className="whitespace-nowrap text-[10px] font-bold tracking-tight text-bean/70 [writing-mode:vertical-rl]">{seg.label} · 통로</span>
                            </div>
                          );
                        }
                        bayNo++;
                        const thisBay = bayNo;
                        return (
                          <div key={`b${si}`} className="shrink-0 rounded border border-cream-deep/70 bg-cream/30 p-1">
                            <div className="flex gap-0.5">
                              {Array.from({ length: seg.pallets }, (_, pi) => pi + 1).map((pallet) => (
                                <div key={pallet} className="flex flex-col gap-0.5">
                                  {Array.from({ length: LEVELS }, (_, k) => LEVELS - k).map((level) => {
                                    const s = lookup.get(`${line.name}|${thisBay}|${pallet}|${level}`);
                                    const occ = s && isOccupied(s);
                                    const dim = filterActive && !matchOf(s);
                                    const bg = cellBg(s);
                                    const isSel = selected && s && selected.zone === s.zone && selected.bay === s.bay && selected.pallet === s.pallet && selected.level === s.level;
                                    return (
                                      <button
                                        key={level}
                                        onClick={() => setSelected(s ?? null)}
                                        title={`${line.name} ${thisBay}번 ${pallet}P ${level}단${occ ? ` · ${s!.name} · ${s!.lotNo}` : " · 빈 칸"}`}
                                        className={`flex h-6 w-9 items-center justify-center rounded-sm text-[9px] font-bold transition ${occ ? "text-white" : "border border-dashed border-bean/30 bg-white text-bean/30"} ${dim ? "opacity-20" : ""} ${isSel ? "ring-2 ring-espresso ring-offset-1" : ""}`}
                                        style={bg ? { background: bg } : undefined}
                                      >
                                        {level}
                                      </button>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                            <div className="mt-1 text-center text-[10px] font-medium text-bean/60">
                              {String(thisBay).padStart(2, "0")}<span className="text-bean/40">·{seg.pallets}P</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 상세 패널 */}
          <div className="lg:sticky lg:top-16 lg:self-start">
            <div className="rounded-2xl border border-cream-deep bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-roast">Lot 상세</h3>
              {selected && isOccupied(selected) ? (
                <div className="mt-3 space-y-2 text-sm">
                  <Row k="위치" v={`${selected.zone} · ${String(selected.bay).padStart(2, "0")}번 · ${selected.pallet}P · ${selected.level}단`} />
                  <Row k="Lot 번호" v={selected.lotNo} mono />
                  <Row k="제품" v={`${selected.name} (${selected.code})`} />
                  <Row k="수량" v={`${num(selected.qty)} ${selected.unit}`} />
                  <Row k="입고일" v={selected.inDate || "—"} />
                  <Row k="유효기간" v={selected.expiry || "—"} />
                  {today && selected.expiry && (() => {
                    const d = daysToExpiry(selected.expiry, today);
                    return <Row k="잔여" v={d < 0 ? `만료 ${-d}일 경과` : `D-${d}`} color={d <= 0 ? "text-rose-600" : d <= 30 ? "text-amber-600" : "text-bio-deep"} />;
                  })()}
                </div>
              ) : selected ? (
                <p className="mt-3 text-sm text-bean/60">{selected.zone} {String(selected.bay).padStart(2, "0")}번 {selected.pallet}P {selected.level}단 · <b>빈 칸</b></p>
              ) : (
                <p className="mt-3 text-sm text-bean/60">맵에서 적치 칸을 누르면 Lot 정보가 표시됩니다.</p>
              )}
            </div>
          </div>
        </section>

        {/* Lot 목록 */}
        <section className="mt-6">
          <h2 className="text-lg font-extrabold text-coffee">Lot 목록 {filterActive && <span className="text-sm font-medium text-bean/70">· {lotList.length}건</span>}</h2>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-cream-deep bg-white shadow-sm">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-cream-deep bg-cream text-xs text-bean">
                  <th className="px-3 py-2.5 text-left font-semibold">위치</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Lot 번호</th>
                  <th className="px-3 py-2.5 text-left font-semibold">제품</th>
                  <th className="px-3 py-2.5 text-right font-semibold">수량</th>
                  <th className="px-3 py-2.5 text-center font-semibold">입고일</th>
                  <th className="px-3 py-2.5 text-center font-semibold">유효기간</th>
                  <th className="px-3 py-2.5 text-center font-semibold">잔여</th>
                </tr>
              </thead>
              <tbody>
                {lotList.map((s) => {
                  const d = today && s.expiry ? daysToExpiry(s.expiry, today) : Infinity;
                  return (
                    <tr key={`${s.zone}-${s.bay}-${s.pallet}-${s.level}`} onClick={() => setSelected(s)} className="cursor-pointer border-b border-cream-deep/50 last:border-0 hover:bg-cream">
                      <td className="px-3 py-2 text-xs font-medium text-roast">{s.zone} {String(s.bay).padStart(2, "0")}-{s.pallet}P-{s.level}단</td>
                      <td className="px-3 py-2 font-mono text-xs text-ink">{s.lotNo}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded" style={{ background: productColor(s.code) }} />
                          <span className="font-semibold text-ink">{s.name}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-roast">{num(s.qty)} <span className="text-[10px] text-bean/50">{s.unit}</span></td>
                      <td className="px-3 py-2 text-center text-xs text-bean">{s.inDate || "—"}</td>
                      <td className="px-3 py-2 text-center text-xs text-bean">{s.expiry || "—"}</td>
                      <td className="px-3 py-2 text-center text-xs font-semibold">
                        {d === Infinity ? <span className="text-bean/40">—</span> : d <= 0 ? <span className="text-rose-600">만료</span> : d <= 30 ? <span className="text-amber-600">D-{d}</span> : <span className="text-bio-deep">D-{d}</span>}
                      </td>
                    </tr>
                  );
                })}
                {lotList.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-bean/60">조건에 맞는 Lot이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-3 text-xs leading-relaxed text-bean/70">
          · 보기 모드(제품별/유효기간/적재)로 맵 색상이 바뀝니다. 제품 필터·Lot 검색 시 해당 칸만 강조됩니다.
          · 적치대 폭 = 파렛트 수(1385mm=1P, 2585mm=2P), <b className="font-semibold text-bean">1S바이패스 = 통로</b>. 실제 적치 데이터는 <b className="font-semibold text-bean">CSV/엑셀 업로드</b>(라인·적치대·파렛트·단·Lot번호·품목·수량·입고일·유효기간)로 반영할 수 있습니다.
        </p>
      </div>
    </main>
  );
}

function Kpi({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: "ink" | "mint" | "bean" | "rose" }) {
  const t = { ink: "text-ink", mint: "text-mint-deep", bean: "text-bean", rose: "text-rose-600" }[tone];
  return (
    <div className="rounded-2xl border border-cream-deep bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-bean">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${t}`}>{value}</p>
      <p className="text-xs text-bean/60">{unit}</p>
    </div>
  );
}

function Row({ k, v, mono, color }: { k: string; v: string; mono?: boolean; color?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-xs font-medium text-bean">{k}</span>
      <span className={`text-right text-sm font-semibold ${color || "text-ink"} ${mono ? "font-mono text-xs" : ""}`}>{v}</span>
    </div>
  );
}
