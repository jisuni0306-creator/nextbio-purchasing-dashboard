"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import DashboardNav from "@/components/DashboardNav";
import { useInventory } from "@/lib/useInventory";
import {
  rop,
  targetStock,
  daysOfStock,
  statusOf,
  suggestedQty,
  suggestedAmount,
  totalReorderAmount,
  won,
  num,
  WAREHOUSES,
  WAREHOUSE_LIST,
  itemsToCsv,
  parseCsv,
  rowsToItems,
  type Item,
  type StockStatus,
  type ABC,
} from "@/lib/inventory";

const STATUS_STYLE: Record<StockStatus, { chip: string; dot: string; row: string }> = {
  부족: { chip: "bg-rose-100 text-rose-700", dot: "bg-rose-500", row: "bg-rose-50/50" },
  정상: { chip: "bg-bio/15 text-bio-deep", dot: "bg-bio", row: "" },
  과잉: { chip: "bg-amber-100 text-amber-800", dot: "bg-amber-500", row: "bg-amber-50/50" },
};

const FILTERS: ("전체" | StockStatus)[] = ["전체", "부족", "정상", "과잉"];

const EMPTY: Item = {
  code: "", name: "", supplier: "", warehouse: WAREHOUSES[0], location: "",
  unit: "EA", unitPrice: 0, onHand: 0, avgDailyOut: 0, leadTimeDays: 7,
  safetyStock: 0, moq: 1, abc: "B",
};

export default function InventoryDashboard() {
  const { items, hydrated, upsert, patch, remove, reset, setItems } = useInventory();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("전체");
  const [supplier, setSupplier] = useState("전체");
  const [warehouse, setWarehouse] = useState("전체");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [isNew, setIsNew] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 월별 구매(입고) 집계 — 업로드한 ERP 파일에서 누적
  type MonthRec = { qty: number; amount: number; items: number };
  const [monthly, setMonthly] = useState<Record<string, MonthRec>>({});
  const [monthlyHydrated, setMonthlyHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("monthly-purchase-v1");
      if (raw) setMonthly(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setMonthlyHydrated(true);
  }, []);
  useEffect(() => {
    if (!monthlyHydrated) return;
    try {
      localStorage.setItem("monthly-purchase-v1", JSON.stringify(monthly));
    } catch {
      /* ignore */
    }
  }, [monthly, monthlyHydrated]);

  const suppliers = useMemo(
    () => ["전체", ...Array.from(new Set(items.map((i) => i.supplier)))],
    [items],
  );

  const counts = useMemo(() => {
    const c = { 부족: 0, 정상: 0, 과잉: 0 } as Record<StockStatus, number>;
    items.forEach((i) => (c[statusOf(i)] += 1));
    return c;
  }, [items]);

  const shortItems = useMemo(() => items.filter((i) => statusOf(i) === "부족"), [items]);
  const reorderTotal = useMemo(() => totalReorderAmount(items), [items]);

  // 창고별 재고현황: 실제 창고 마스터(WAREHOUSE_LIST) + 품목 단위 집계 병합
  const warehouseRows = useMemo(() => {
    const stat = (name: string) => {
      const its = items.filter((i) => (i.warehouse || "미지정") === name);
      const c = { 부족: 0, 정상: 0, 과잉: 0 } as Record<StockStatus, number>;
      its.forEach((i) => (c[statusOf(i)] += 1));
      return { count: its.length, ...c };
    };
    const masterNames = new Set(WAREHOUSE_LIST.map((w) => w.name));
    const rows = WAREHOUSE_LIST.map((w) => ({ ...w, ...stat(w.name) }));
    // 마스터에 없는 창고(직접 입력 등)도 뒤에 추가
    Array.from(new Set(items.map((i) => i.warehouse || "미지정")))
      .filter((n) => !masterNames.has(n))
      .forEach((n) => rows.push({ code: "—", name: n, total: 0, ...stat(n) }));
    return rows.sort((a, b) => b.total - a.total);
  }, [items]);

  const totalStockSum = useMemo(() => WAREHOUSE_LIST.reduce((s, w) => s + w.total, 0), []);
  const maxTotal = useMemo(() => Math.max(...warehouseRows.map((w) => Math.abs(w.total)), 1), [warehouseRows]);
  const itemWarehouses = useMemo(() => warehouseRows.filter((w) => w.count > 0), [warehouseRows]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filter !== "전체" && statusOf(i) !== filter) return false;
      if (supplier !== "전체" && i.supplier !== supplier) return false;
      if (warehouse !== "전체" && (i.warehouse || "미지정") !== warehouse) return false;
      if (q && !(`${i.code} ${i.name} ${i.supplier} ${i.warehouse} ${i.location}`.toLowerCase().includes(q.toLowerCase())))
        return false;
      return true;
    });
  }, [items, filter, supplier, warehouse, q]);

  const openNew = () => { setEditing({ ...EMPTY }); setIsNew(true); };
  const openEdit = (it: Item) => { setEditing({ ...it }); setIsNew(false); };
  const save = () => {
    if (!editing) return;
    if (!editing.code.trim() || !editing.name.trim()) {
      alert("품목코드와 품목명은 필수입니다.");
      return;
    }
    upsert(editing);
    setEditing(null);
  };

  // CSV / 엑셀 업로드
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let rows: Record<string, unknown>[];
      if (/\.csv$/i.test(file.name)) {
        rows = parseCsv(await file.text());
      } else {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      }
      const parsed = rowsToItems(rows);
      if (!parsed.length) {
        alert("인식된 품목이 없습니다. 헤더(품목코드·품목명·공급사·창고·적치대·단가·현재고·일평균출고·리드타임·안전재고·MOQ)를 확인해주세요.");
      } else if (confirm(`${parsed.length}개 품목을 불러옵니다. 현재 목록을 교체할까요?`)) {
        setItems(parsed);
        setFilter("전체"); setSupplier("전체"); setWarehouse("전체"); setQ("");

        // 월별 구매(입고) 집계: 파일명에서 연월 추출(예: ..._20260629 → 2026-06)
        const qty = parsed.reduce((s, i) => s + (i.monthlyIn || 0), 0);
        if (qty > 0) {
          const m = file.name.match(/(20\d{2})[._-]?(0[1-9]|1[0-2])/);
          const month = m ? `${m[1]}-${m[2]}` : "기간미상";
          const amount = parsed.reduce((s, i) => s + (i.monthlyIn || 0) * i.unitPrice, 0);
          setMonthly((prev) => ({ ...prev, [month]: { qty, amount, items: parsed.length } }));
        }
      }
    } catch (err) {
      alert("파일을 읽지 못했습니다: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([itemsToCsv(items)], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "적정재고_양식.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-cream text-ink">
      <DashboardNav />

      {/* Header */}
      <header className="bg-gradient-to-br from-espresso via-coffee to-roast text-cream">
        <div className="mx-auto max-w-6xl px-5 py-9">
          <span className="inline-flex items-center gap-2 rounded-full bg-cream/10 px-3 py-1 text-xs font-medium text-cream-deep ring-1 ring-cream/15">
            <span className="h-1.5 w-1.5 rounded-full bg-caramel" />
            모듈 ① 적정재고 자동 체크
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">적정재고 현황 대시보드</h1>
          <p className="mt-2 max-w-2xl text-sm text-cream-deep/75">
            통합 기준 시트(SSOT)에서 ROP·안전재고를 기준으로 부족/과잉을 자동 판정합니다.
            <span className="text-caramel-light"> ROP = 일평균출고 × 리드타임 + 안전재고</span>
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-7">
        {/* KPI */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="총 품목" value={num(items.length)} unit="SKU" tone="ink" />
          <Kpi label="부족(재주문)" value={num(counts.부족)} unit="품목" tone="rose" />
          <Kpi label="과잉" value={num(counts.과잉)} unit="품목" tone="amber" />
          <Kpi label="정상" value={num(counts.정상)} unit="품목" tone="bio" />
          <Kpi label="발주 필요 금액" value={won(reorderTotal)} unit="제안 합계" tone="caramel" wide />
        </section>

        {/* 창고별 재고현황 */}
        <section className="mt-7">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-lg font-extrabold text-coffee">창고별 재고현황</h2>
            <span className="text-xs text-bean/70">총 {WAREHOUSE_LIST.length}개 창고 · 재고 합계 {fmt(totalStockSum)} · 행을 누르면 해당 창고 품목만 표시</span>
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-cream-deep bg-white shadow-sm">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-cream-deep bg-cream text-xs text-bean">
                    <th className="px-4 py-2.5 text-left font-semibold">코드</th>
                    <th className="px-2 py-2.5 text-left font-semibold">창고명</th>
                    <th className="px-4 py-2.5 text-right font-semibold">재고 합계</th>
                    <th className="px-2 py-2.5 text-center font-semibold">품목</th>
                    <th className="px-4 py-2.5 text-left font-semibold">품목 상태(부족/정상/과잉)</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseRows.map((w) => {
                    const active = warehouse === w.name;
                    const hasItems = w.count > 0;
                    const barW = (Math.abs(w.total) / maxTotal) * 100;
                    return (
                      <tr
                        key={w.code + w.name}
                        onClick={() => hasItems && setWarehouse(active ? "전체" : w.name)}
                        className={`border-b border-cream-deep/50 last:border-0 ${active ? "bg-caramel/10" : ""} ${hasItems ? "cursor-pointer hover:bg-cream" : ""}`}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-bean">{w.code}</td>
                        <td className="px-2 py-2.5 font-bold text-ink">
                          🏬 {w.name}
                          {active && <span className="ml-1.5 rounded bg-caramel/30 px-1.5 py-0.5 text-[10px] font-bold text-roast">선택</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className={`font-bold tabular-nums ${w.total < 0 ? "text-rose-600" : "text-roast"}`}>{fmt(w.total)}</div>
                          <div className="ml-auto mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-cream-deep">
                            <span className={`block h-full rounded-full ${w.total < 0 ? "bg-rose-400" : "bg-bean"}`} style={{ width: `${barW}%` }} />
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-bean">{hasItems ? `${w.count}개` : "—"}</td>
                        <td className="px-4 py-2.5">
                          {hasItems ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-2 w-28 overflow-hidden rounded-full bg-cream-deep">
                                {w.부족 > 0 && <span className="bg-rose-500" style={{ width: `${(w.부족 / w.count) * 100}%` }} />}
                                {w.정상 > 0 && <span className="bg-bio" style={{ width: `${(w.정상 / w.count) * 100}%` }} />}
                                {w.과잉 > 0 && <span className="bg-amber-500" style={{ width: `${(w.과잉 / w.count) * 100}%` }} />}
                              </div>
                              <span className="text-[11px] text-bean/70">
                                <b className="text-rose-600">{w.부족}</b> / <b className="text-bio-deep">{w.정상}</b> / <b className="text-amber-700">{w.과잉}</b>
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-bean/40">품목 데이터 없음</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 월별 구매(입고) 현황 */}
        <section className="mt-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-coffee">월별 구매(입고) 현황</h2>
              <span className="text-xs text-bean/70">엑셀 업로드 시 입고수량 기준으로 월별 누적됩니다.</span>
            </div>
            {Object.keys(monthly).length > 0 && (
              <button onClick={() => confirm("월별 구매 기록을 비울까요?") && setMonthly({})} className="rounded-lg border border-cream-deep bg-white px-3 py-1.5 text-xs font-medium text-bean hover:bg-cream-deep">비우기</button>
            )}
          </div>
          <div className="mt-3 rounded-2xl border border-cream-deep bg-white p-5 shadow-sm">
            {Object.keys(monthly).length === 0 ? (
              <p className="py-6 text-center text-sm text-bean/60">
                아직 집계된 월이 없습니다. ‘CSV/엑셀 업로드’로 월 재고현황(입고수량 포함) 파일을 올리면 월별 구매가 누적됩니다.
              </p>
            ) : (
              (() => {
                const entries = Object.entries(monthly).sort((a, b) => (a[0] < b[0] ? -1 : 1));
                const max = Math.max(...entries.map(([, m]) => m.qty), 1);
                const hasAmount = entries.some(([, m]) => m.amount > 0);
                return (
                  <div className="space-y-3">
                    {entries.map(([month, m]) => (
                      <div key={month} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-sm font-bold text-roast">{month}</span>
                        <div className="h-6 flex-1 overflow-hidden rounded-md bg-cream-deep">
                          <div
                            className="flex h-full items-center justify-end rounded-md bg-bean px-2 text-[11px] font-bold text-cream"
                            style={{ width: `${Math.max(10, (m.qty / max) * 100)}%` }}
                          >
                            {num(m.qty)}
                          </div>
                        </div>
                        <span className="w-28 shrink-0 text-right text-sm font-bold tabular-nums text-ink">
                          {m.amount > 0 ? won(m.amount) : <span className="font-medium text-bean/50">단가 미연동</span>}
                        </span>
                        <span className="w-16 shrink-0 text-right text-[11px] text-bean/60">{num(m.items)}품목</span>
                      </div>
                    ))}
                    {!hasAmount && (
                      <p className="pt-1 text-[11px] text-bean/60">
                        ※ 금액은 품목 단가가 있어야 표시됩니다. 단가가 포함된 품목 마스터를 업로드하면 구매 금액(₩)으로 환산됩니다.
                      </p>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </section>

        {/* 부족 → 발주 CTA */}
        {hydrated && shortItems.length > 0 && (
          <Link
            href="/purchase-order"
            className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-caramel/50 bg-caramel/10 px-5 py-3.5 transition hover:bg-caramel/20"
          >
            <span className="text-sm font-bold text-roast">
              재주문점 미달 {shortItems.length}개 품목 · {won(reorderTotal)} 발주 필요
            </span>
            <span className="shrink-0 rounded-lg bg-espresso px-3 py-1.5 text-xs font-bold text-cream">
              발주서 자동 생성 →
            </span>
          </Link>
        )}

        {/* Toolbar */}
        <section className="mt-6 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-cream-deep bg-white p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  filter === f ? "bg-espresso text-cream" : "text-bean hover:text-roast"
                }`}
              >
                {f}
                {f !== "전체" && <span className="ml-1 opacity-70">{counts[f as StockStatus]}</span>}
              </button>
            ))}
          </div>

          <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="select">
            <option value="전체">전체 창고(품목)</option>
            {itemWarehouses.map((w) => (
              <option key={w.name} value={w.name}>{w.name}</option>
            ))}
          </select>

          <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="select">
            {suppliers.map((s) => (
              <option key={s} value={s}>{s === "전체" ? "전체 공급사" : s}</option>
            ))}
          </select>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="품목·창고·적치대 검색"
            className="min-w-[150px] flex-1 rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs text-roast placeholder:text-bean/50 focus:border-caramel focus:outline-none"
          />

          <button onClick={openNew} className="rounded-lg bg-espresso px-3 py-2 text-xs font-bold text-cream transition hover:bg-roast">
            + 품목 추가
          </button>
          <button onClick={() => fileRef.current?.click()} className="rounded-lg bg-bean px-3 py-2 text-xs font-bold text-cream transition hover:bg-roast">
            ⬆ CSV/엑셀 업로드
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFile} className="hidden" />
          <button onClick={exportCsv} className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean transition hover:bg-cream-deep">
            ⬇ 양식
          </button>
          <button
            onClick={() => confirm("샘플 데이터로 초기화할까요? 편집 내용이 사라집니다.") && reset()}
            className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean transition hover:bg-cream-deep"
          >
            초기화
          </button>
        </section>

        {/* Table */}
        <section className="mt-3 overflow-x-auto rounded-2xl border border-cream-deep bg-white shadow-sm">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-cream-deep bg-cream text-xs text-bean">
                <Th>상태</Th>
                <Th left>품목</Th>
                <Th left>창고 / 적치대</Th>
                <Th left>공급사</Th>
                <Th>현재고</Th>
                <Th>안전재고</Th>
                <Th>ROP</Th>
                <Th>목표재고</Th>
                <Th>재고일수</Th>
                <Th>발주 제안</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const st = statusOf(it);
                const s = STATUS_STYLE[st];
                const sq = suggestedQty(it);
                const dos = daysOfStock(it);
                return (
                  <tr key={it.code} className={`border-b border-cream-deep/60 last:border-0 ${s.row}`}>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${s.chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        {st}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-ink">{it.name}</div>
                      <div className="text-[11px] text-bean/60">{it.code} · {it.abc}등급 · 리드 {it.leadTimeDays}일</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-roast">{it.warehouse || "미지정"}</div>
                      <div className="font-mono text-[11px] text-bean/60">{it.location || "—"}</div>
                    </td>
                    <td className="px-3 py-2.5 text-bean">{it.supplier}</td>
                    <td className="px-2 py-2.5 text-center">
                      <input
                        type="number"
                        value={it.onHand}
                        onChange={(e) => patch(it.code, { onHand: Number(e.target.value) || 0 })}
                        className="w-20 rounded border border-cream-deep bg-white px-1.5 py-1 text-center text-sm font-bold text-ink focus:border-caramel focus:outline-none"
                      />
                      <div className="text-[10px] text-bean/50">{it.unit}</div>
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-bean">{num(it.safetyStock)}</td>
                    <td className="px-2 py-2.5 text-center font-bold tabular-nums text-roast">{num(rop(it))}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-bean">{num(targetStock(it))}</td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={`tabular-nums font-medium ${dos === Infinity ? "text-bean/40" : dos < it.leadTimeDays ? "text-rose-600" : "text-bean"}`}>
                        {dos === Infinity ? "—" : `${dos}일`}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {sq > 0 ? (
                        <div>
                          <div className="font-bold tabular-nums text-rose-600">{num(sq)} {it.unit}</div>
                          <div className="text-[10px] text-bean/60">{won(suggestedAmount(it))}</div>
                        </div>
                      ) : (
                        <span className="text-bean/40">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-center whitespace-nowrap">
                      <button onClick={() => openEdit(it)} className="rounded px-2 py-1 text-xs font-medium text-bean hover:bg-cream-deep">편집</button>
                      <button onClick={() => confirm(`${it.name} 품목을 삭제할까요?`) && remove(it.code)} className="rounded px-2 py-1 text-xs font-medium text-bean/70 hover:bg-rose-50 hover:text-rose-600">삭제</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-sm text-bean/60">조건에 맞는 품목이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <p className="mt-3 text-xs leading-relaxed text-bean/70">
          · 현재고 칸은 바로 수정 가능하며 상태·발주 제안이 즉시 갱신됩니다(브라우저 저장).
          · <b className="font-semibold text-bean">CSV/엑셀 업로드</b>로 창고 데이터를 통째로 교체할 수 있습니다. ‘양식’ 버튼으로 현재 형식을 내려받아 채워 넣으세요.
          · ROP 이하 = <span className="font-medium text-rose-500">부족</span>, 목표재고 × 1.5 이상 = <span className="font-medium text-amber-600">과잉</span>.
        </p>
      </div>

      {/* 편집 모달 */}
      {editing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-espresso/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-extrabold text-coffee">{isNew ? "품목 추가" : "품목 편집"}</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="품목코드">
                <input value={editing.code} disabled={!isNew} onChange={(e) => setEditing({ ...editing, code: e.target.value })} className="input disabled:bg-cream disabled:text-bean/50" />
              </Field>
              <Field label="ABC 등급">
                <select value={editing.abc} onChange={(e) => setEditing({ ...editing, abc: e.target.value as ABC })} className="input">
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                </select>
              </Field>
              <Field label="품목명" span2>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="input" />
              </Field>
              <Field label="공급사">
                <input value={editing.supplier} onChange={(e) => setEditing({ ...editing, supplier: e.target.value })} className="input" />
              </Field>
              <Field label="창고">
                <select value={editing.warehouse} onChange={(e) => setEditing({ ...editing, warehouse: e.target.value })} className="input">
                  {WAREHOUSES.map((w) => (<option key={w} value={w}>{w}</option>))}
                </select>
              </Field>
              <Field label="적치대(로케이션)">
                <input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} className="input" placeholder="A-01-01" />
              </Field>
              <Field label="단위">
                <input value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} className="input" />
              </Field>
              <NumField label="단가(원)" v={editing.unitPrice} on={(n) => setEditing({ ...editing, unitPrice: n })} />
              <NumField label="현재고" v={editing.onHand} on={(n) => setEditing({ ...editing, onHand: n })} />
              <NumField label="일평균 출고" v={editing.avgDailyOut} on={(n) => setEditing({ ...editing, avgDailyOut: n })} />
              <NumField label="리드타임(일)" v={editing.leadTimeDays} on={(n) => setEditing({ ...editing, leadTimeDays: n })} />
              <NumField label="안전재고" v={editing.safetyStock} on={(n) => setEditing({ ...editing, safetyStock: n })} />
              <NumField label="MOQ" v={editing.moq} on={(n) => setEditing({ ...editing, moq: n })} />
            </div>
            <div className="mt-3 rounded-lg bg-cream p-3 text-xs text-bean">
              ROP <b className="text-roast">{num(rop(editing))}</b> · 목표재고 <b className="text-roast">{num(targetStock(editing))}</b> · 판정 <b className="text-roast">{statusOf(editing)}</b>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-cream-deep px-4 py-2 text-sm font-medium text-bean hover:bg-cream-deep">취소</button>
              <button onClick={save} className="rounded-lg bg-espresso px-4 py-2 text-sm font-bold text-cream hover:bg-roast">저장</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input { width:100%; border:1px solid var(--color-cream-deep); border-radius:0.5rem; padding:0.45rem 0.6rem; font-size:0.875rem; color:var(--color-roast); background:#fff; }
        .input:focus { outline:none; border-color:var(--color-caramel); }
        .select { border:1px solid var(--color-cream-deep); border-radius:0.5rem; padding:0.5rem 0.7rem; font-size:0.75rem; font-weight:500; color:var(--color-bean); background:#fff; }
        .select:focus { outline:none; border-color:var(--color-caramel); }
      `}</style>
    </main>
  );
}

/* ---------- 보조 ---------- */

// 재고 합계: 소수점 있는 값은 최대 2자리까지 표시
const fmt = (n: number) => n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });

function Kpi({ label, value, unit, tone, wide }: { label: string; value: string; unit: string; tone: "ink" | "rose" | "amber" | "bio" | "caramel"; wide?: boolean }) {
  const tones = {
    ink: "text-ink",
    rose: "text-rose-600",
    amber: "text-amber-700",
    bio: "text-bio-deep",
    caramel: "text-bean",
  }[tone];
  const card = tone === "caramel" ? "border-caramel/40 bg-caramel/10" : "border-cream-deep bg-white";
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${card} ${wide ? "col-span-2 lg:col-span-1" : ""}`}>
      <p className="text-xs font-medium text-bean">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${tones}`}>{value}</p>
      <p className="text-xs text-bean/60">{unit}</p>
    </div>
  );
}

function Th({ children, left }: { children?: React.ReactNode; left?: boolean }) {
  return <th className={`px-3 py-2.5 font-semibold ${left ? "text-left" : "text-center"}`}>{children}</th>;
}

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <label className={`block ${span2 ? "col-span-2" : ""}`}>
      <span className="text-xs font-medium text-bean">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function NumField({ label, v, on }: { label: string; v: number; on: (n: number) => void }) {
  return (
    <Field label={label}>
      <input type="number" value={v} onChange={(e) => on(Number(e.target.value) || 0)} className="input" />
    </Field>
  );
}
