"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  SLOT_CSV_HEADERS,
  type Slot,
} from "@/lib/racks";

const APPSHEET_KEY = "appsheet-warehouse-url-v1";
const RELEASE_KEY = "release-log-v1";

interface ReleaseRec {
  date: string; // 불출날짜
  code: string; // 품목코드
  name: string; // 품목명
  qty: number; // 수량
  unit: string;
  lotNo: string; // Lot
  location: string; // 적치대 번호
}
const REL_HEADERS = ["불출날짜", "품목코드", "품목명", "수량", "Lot", "적치대번호"];

type ViewMode = "product" | "expiry" | "occupancy";
const num = (n: number) => Math.round(n).toLocaleString("ko-KR");

export default function WarehouseDashboard() {
  const { slots, setSlots, reset } = useRackSlots();
  const [mode, setMode] = useState<ViewMode>("product");
  const [productFilter, setProductFilter] = useState("전체");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Slot | null>(null);
  const [today, setToday] = useState("");
  const [focusLine, setFocusLine] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const lineStats = useMemo(() => {
    const m: Record<string, { occ: number; total: number }> = {};
    slots.forEach((s) => {
      const r = (m[s.zone] ??= { occ: 0, total: 0 });
      r.total++;
      if (isOccupied(s)) r.occ++;
    });
    return m;
  }, [slots]);

  const focusOn = (name: string) => {
    setFocusLine(name);
    document.getElementById(`line-${name}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  // AppSheet 입고 등록 앱 임베드 URL
  const [appUrl, setAppUrl] = useState("");
  const [appUrlInput, setAppUrlInput] = useState("");
  useEffect(() => {
    try {
      const u = localStorage.getItem(APPSHEET_KEY) || "";
      setAppUrl(u);
      setAppUrlInput(u);
    } catch {
      /* ignore */
    }
  }, []);
  const saveAppUrl = () => {
    const u = appUrlInput.trim();
    setAppUrl(u);
    try { localStorage.setItem(APPSHEET_KEY, u); } catch { /* ignore */ }
  };
  const copyForSheet = async () => {
    const rows = slots.filter(isOccupied);
    const line = (s: Slot) => [s.zone, s.bay, s.pallet, s.level, s.lotNo, s.code, s.name, s.qty, s.unit, s.inDate, s.expiry].join("\t");
    const tsv = [SLOT_CSV_HEADERS.join("\t"), ...rows.map(line)].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      alert("구글시트용 데이터(헤더 포함)를 복사했습니다.\n새 구글시트 A1 셀에 붙여넣기(Ctrl+V) 하세요.");
    } catch {
      alert("클립보드 복사에 실패했습니다. ‘CSV 내보내기’를 이용해주세요.");
    }
  };

  // 불출 등록
  const [relOpen, setRelOpen] = useState(false);
  const emptyRel = { date: "", code: "", name: "", qty: 0, unit: "", lotNo: "", location: "", max: 0 };
  const [rel, setRel] = useState(emptyRel);
  const [releaseLog, setReleaseLog] = useState<ReleaseRec[]>([]);
  const [relHydrated, setRelHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RELEASE_KEY);
      if (raw) setReleaseLog(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setRelHydrated(true);
  }, []);
  useEffect(() => {
    if (!relHydrated) return;
    try {
      localStorage.setItem(RELEASE_KEY, JSON.stringify(releaseLog));
    } catch {
      /* ignore */
    }
  }, [releaseLog, relHydrated]);

  const occupiedLots = useMemo(() => slots.filter(isOccupied), [slots]);
  const openRelease = (preset?: Slot) => {
    if (preset) {
      setRel({ date: today, code: preset.code, name: preset.name, qty: 0, unit: preset.unit, lotNo: preset.lotNo, location: `${preset.zone}-${String(preset.bay).padStart(2, "0")}-${preset.pallet}P-${preset.level}단`, max: preset.qty });
    } else {
      setRel({ ...emptyRel, date: today });
    }
    setRelOpen(true);
  };
  const pickLot = (lotNo: string) => {
    const s = occupiedLots.find((x) => x.lotNo === lotNo);
    if (s) setRel((r) => ({ ...r, lotNo, code: s.code, name: s.name, unit: s.unit, location: `${s.zone}-${String(s.bay).padStart(2, "0")}-${s.pallet}P-${s.level}단`, max: s.qty }));
    else setRel((r) => ({ ...r, lotNo }));
  };
  const saveRelease = () => {
    if (!rel.lotNo.trim()) { alert("Lot을 입력/선택하세요."); return; }
    if (!(rel.qty > 0)) { alert("불출 수량을 입력하세요."); return; }
    // 적치대 현황에서 해당 Lot 차감
    setSlots((prev) => prev.map((s) => {
      if (s.lotNo !== rel.lotNo) return s;
      const remain = s.qty - rel.qty;
      return remain <= 0
        ? { ...s, lotNo: "", code: "", name: "", unit: "", qty: 0, inDate: "", expiry: "" }
        : { ...s, qty: remain };
    }));
    setReleaseLog((log) => [{ date: rel.date, code: rel.code, name: rel.name, qty: rel.qty, unit: rel.unit, lotNo: rel.lotNo, location: rel.location }, ...log]);
    setRelOpen(false);
    setSelected(null);
  };
  const exportReleases = () => {
    const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const body = releaseLog.map((r) => [r.date, r.code, r.name, r.qty, r.lotNo, r.location].map(esc).join(","));
    const csv = "﻿" + REL_HEADERS.join(",") + "\n" + body.join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = "불출이력.csv"; a.click();
    URL.revokeObjectURL(url);
  };

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
          <button onClick={() => openRelease()} className="rounded-lg bg-mint px-3 py-2 text-xs font-bold text-white transition hover:brightness-95">📤 불출 등록</button>
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

        {/* 창고 배치도 */}
        <section className="mt-5">
          <h2 className="text-lg font-extrabold text-coffee">창고 배치도 <span className="text-sm font-medium text-bean/70">· 라인 위치 (누르면 해당 라인으로 이동)</span></h2>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-cream-deep bg-white p-4 shadow-sm">
            <div className="min-w-[760px]">
              <div className="text-center text-xs font-bold text-bean">▼ 입고</div>
              <GapDim mm={3140} />
              <LineBar name="A라인" stats={lineStats["A라인"]} active={focusLine === "A라인"} onClick={() => focusOn("A라인")} />
              <GapDim mm={200} small />
              <LineBar name="B라인" stats={lineStats["B라인"]} active={focusLine === "B라인"} onClick={() => focusOn("B라인")} />
              <GapDim mm={3000} />
              <LineBar name="C라인" stats={lineStats["C라인"]} active={focusLine === "C라인"} onClick={() => focusOn("C라인")} />
              <GapDim mm={200} small />
              <LineBar name="D라인" stats={lineStats["D라인"]} active={focusLine === "D라인"} onClick={() => focusOn("D라인")} />
              <GapDim mm={3050} />
              <div className="flex items-stretch gap-3">
                <div className="flex-1"><LineBar name="E라인" stats={lineStats["E라인"]} active={focusLine === "E라인"} onClick={() => focusOn("E라인")} align="left" /></div>
                <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded bg-cream text-center text-[10px] font-bold leading-tight text-bean/70">↑↓<br />출입구</div>
                <div className="flex-1"><LineBar name="F라인" stats={lineStats["F라인"]} active={focusLine === "F라인"} onClick={() => focusOn("F라인")} align="right" /></div>
              </div>
              <div className="mt-1 text-center text-xs font-bold text-bean">▲ 출고</div>
              <p className="mt-2 text-right text-[10px] text-bean/50">치수(mm): 적치대 폭 2585=2P · 1385=1P · 라인 쌍 간격 200 · 구획 간격 3000/3050 · 상단 3140 · 전체 높이 14740</p>
            </div>
          </div>
        </section>

        {/* 적치대 맵 + 상세 */}
        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            {LINES.map((line) => {
              let bayNo = 0;
              return (
                <div key={line.name} id={`line-${line.name}`} className={`scroll-mt-20 rounded-2xl border bg-white p-4 shadow-sm transition ${focusLine === line.name ? "border-mint ring-2 ring-mint/40" : "border-cream-deep"}`}>
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
                              {String(thisBay).padStart(2, "0")} · {seg.mm}<span className="text-bean/40">·{seg.pallets}P</span>
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
                  <button onClick={() => openRelease(selected)} className="mt-2 w-full rounded-lg bg-mint px-3 py-2 text-xs font-bold text-white transition hover:brightness-95">📤 이 Lot 불출</button>
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

        {/* 불출 이력 */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-coffee">불출 이력 {releaseLog.length > 0 && <span className="text-sm font-medium text-bean/70">· {releaseLog.length}건</span>}</h2>
            <div className="flex gap-2">
              <button onClick={() => openRelease()} className="rounded-lg bg-mint px-3 py-1.5 text-xs font-bold text-white hover:brightness-95">📤 불출 등록</button>
              {releaseLog.length > 0 && <button onClick={exportReleases} className="rounded-lg border border-cream-deep bg-white px-3 py-1.5 text-xs font-medium text-bean hover:bg-cream-deep">⬇ CSV</button>}
            </div>
          </div>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-cream-deep bg-white shadow-sm">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-cream-deep bg-cream text-xs text-bean">
                  <th className="px-3 py-2.5 text-center font-semibold">불출날짜</th>
                  <th className="px-3 py-2.5 text-left font-semibold">품목코드</th>
                  <th className="px-3 py-2.5 text-left font-semibold">품목명</th>
                  <th className="px-3 py-2.5 text-right font-semibold">수량</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Lot</th>
                  <th className="px-3 py-2.5 text-left font-semibold">적치대 번호</th>
                </tr>
              </thead>
              <tbody>
                {releaseLog.map((r, i) => (
                  <tr key={i} className="border-b border-cream-deep/50 last:border-0">
                    <td className="px-3 py-2 text-center text-xs text-bean">{r.date || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-bean">{r.code || "—"}</td>
                    <td className="px-3 py-2 font-semibold text-ink">{r.name || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-roast">{num(r.qty)} <span className="text-[10px] text-bean/50">{r.unit}</span></td>
                    <td className="px-3 py-2 font-mono text-xs text-ink">{r.lotNo}</td>
                    <td className="px-3 py-2 text-xs font-medium text-roast">{r.location || "—"}</td>
                  </tr>
                ))}
                {releaseLog.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-bean/60">불출 등록 내역이 없습니다. ‘📤 불출 등록’으로 기록하면 적치대 수량이 차감됩니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-3 text-xs leading-relaxed text-bean/70">
          · 보기 모드(제품별/유효기간/적재)로 맵 색상이 바뀝니다. 제품 필터·Lot 검색 시 해당 칸만 강조됩니다.
          · 적치대 폭 = 파렛트 수(1385mm=1P, 2585mm=2P), <b className="font-semibold text-bean">1S바이패스 = 통로</b>. 실제 적치 데이터는 <b className="font-semibold text-bean">CSV/엑셀 업로드</b>(라인·적치대·파렛트·단·Lot번호·품목·수량·입고일·유효기간)로 반영할 수 있습니다.
        </p>

        {/* AppSheet 입고 등록 연동 */}
        <section className="mt-10">
          <h2 className="text-lg font-extrabold text-coffee">AppSheet 입고 등록 연동</h2>
          <p className="mt-1 text-sm text-bean/80">입고 시 <b className="font-semibold text-roast">Lot번호와 적치대 위치(라인·적치대·파렛트·단)</b>를 AppSheet 폼으로 등록하면 구글시트(창고 적치 마스터)에 저장되고, 이 현황과 동일한 형식으로 관리됩니다.</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-cream-deep bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-roast">연동 절차</h3>
              <ol className="mt-3 space-y-3">
                {[
                  ["적치 데이터를 구글시트로", "아래 ‘구글시트용 복사’를 눌러 헤더(라인·적치대·파렛트·단·Lot번호·품목·수량·입고일·유효기간)와 함께 복사한 뒤, 새 구글시트 A1에 붙여넣습니다. 이 시트가 창고 적치 마스터가 됩니다."],
                  ["AppSheet 앱 생성", "appsheet.com → Create → App → ‘Start with existing data’ → 위 구글시트를 선택하면 적치 등록 앱이 자동 생성됩니다."],
                  ["입고 등록 폼 사용", "입고 시 폼에서 Lot번호와 적치대 위치(라인·적치대·파렛트·단), 품목·수량·입고일·유효기간을 입력하면 구글시트에 한 행씩 저장됩니다."],
                  ["이 화면에 임베드", "AppSheet 앱의 공유(Share) 링크를 복사해 아래에 붙여넣으면, 이 대시보드 안에서 바로 입고 등록할 수 있습니다."],
                ].map(([t, d], i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-espresso text-xs font-bold text-cream">{i + 1}</span>
                    <div>
                      <p className="text-sm font-bold text-ink">{t}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-bean/80">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={copyForSheet} className="rounded-lg bg-bean px-3 py-2 text-xs font-bold text-cream hover:bg-roast">📋 구글시트용 복사(헤더 포함)</button>
                <button onClick={exportCsv} className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean hover:bg-cream-deep">⬇ CSV 내보내기</button>
                <a href="https://www.appsheet.com/start" target="_blank" rel="noreferrer" className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean hover:bg-cream-deep">↗ AppSheet 열기</a>
              </div>
            </div>

            <div className="rounded-2xl border border-cream-deep bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-roast">AppSheet 입고 등록 앱 임베드</h3>
              <div className="mt-3 flex gap-2">
                <input value={appUrlInput} onChange={(e) => setAppUrlInput(e.target.value)} placeholder="https://www.appsheet.com/start/앱ID  (앱 공유 링크)" className="min-w-0 flex-1 rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs text-roast placeholder:text-bean/50 focus:border-mint focus:outline-none" />
                <button onClick={saveAppUrl} className="shrink-0 rounded-lg bg-espresso px-3 py-2 text-xs font-bold text-cream hover:bg-roast">임베드</button>
                {appUrl && (
                  <button onClick={() => { setAppUrl(""); setAppUrlInput(""); try { localStorage.removeItem(APPSHEET_KEY); } catch {} }} className="shrink-0 rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean hover:bg-cream-deep">해제</button>
                )}
              </div>
              <div className="mt-3 overflow-hidden rounded-xl border border-cream-deep bg-cream">
                {appUrl ? (
                  <iframe src={appUrl} title="AppSheet 입고 등록" className="h-[520px] w-full" />
                ) : (
                  <div className="flex h-[520px] flex-col items-center justify-center gap-2 p-6 text-center">
                    <span className="text-3xl">📥</span>
                    <p className="text-sm font-bold text-bean">AppSheet 앱 링크를 붙여넣으면</p>
                    <p className="text-xs text-bean/70">여기에서 입고 등록 폼(Lot·적치대 입력)이 바로 열립니다.</p>
                  </div>
                )}
              </div>
              <p className="mt-2 text-[11px] text-bean/60">※ 임베드가 빈 화면이면 AppSheet 앱의 공유 설정(Users/Security)에서 접근 권한을 확인하세요. 등록 후 ‘CSV/엑셀 업로드’로 이 현황에 반영할 수 있습니다.</p>
            </div>
          </div>
        </section>
      </div>

      {/* 불출 등록 모달 */}
      {relOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-espresso/40 p-4" onClick={() => setRelOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-extrabold text-coffee">불출 등록</h3>
            <p className="mt-0.5 text-xs text-bean/70">Lot을 선택하면 품목·적치대가 자동 입력되고, 저장 시 적치대 수량이 차감됩니다.</p>
            <datalist id="lot-options">
              {occupiedLots.map((s) => <option key={`${s.zone}-${s.bay}-${s.pallet}-${s.level}`} value={s.lotNo} />)}
            </datalist>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="col-span-2 block">
                <span className="text-xs font-medium text-bean">Lot</span>
                <input list="lot-options" value={rel.lotNo} onChange={(e) => pickLot(e.target.value)} className="rel-in" placeholder="Lot 선택/입력" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-bean">불출날짜</span>
                <input type="date" value={rel.date} onChange={(e) => setRel((r) => ({ ...r, date: e.target.value }))} className="rel-in" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-bean">수량{rel.max > 0 && <span className="text-bean/50"> (재고 {num(rel.max)})</span>}</span>
                <input type="number" min={0} value={rel.qty || ""} onChange={(e) => setRel((r) => ({ ...r, qty: Number(e.target.value) || 0 }))} className="rel-in" placeholder="0" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-bean">품목코드</span>
                <input value={rel.code} onChange={(e) => setRel((r) => ({ ...r, code: e.target.value }))} className="rel-in" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-bean">품목명</span>
                <input value={rel.name} onChange={(e) => setRel((r) => ({ ...r, name: e.target.value }))} className="rel-in" />
              </label>
              <label className="col-span-2 block">
                <span className="text-xs font-medium text-bean">적치대 번호</span>
                <input value={rel.location} onChange={(e) => setRel((r) => ({ ...r, location: e.target.value }))} className="rel-in" placeholder="A라인-03-2P-4단" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRelOpen(false)} className="rounded-lg border border-cream-deep px-4 py-2 text-sm font-medium text-bean hover:bg-cream-deep">취소</button>
              <button onClick={saveRelease} className="rounded-lg bg-mint px-4 py-2 text-sm font-bold text-white hover:brightness-95">불출 저장</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .rel-in { margin-top:0.25rem; width:100%; border:1px solid var(--color-cream-deep); border-radius:0.5rem; padding:0.45rem 0.6rem; font-size:0.875rem; color:var(--color-roast); background:#fff; }
        .rel-in:focus { outline:none; border-color:var(--color-mint); }
      `}</style>
    </main>
  );
}

function GapDim({ mm, small }: { mm: number; small?: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${small ? "py-0.5" : "py-1"} text-[10px] text-bean/55`}>
      <span className="h-px w-10 bg-bean/25" />
      <span className="font-medium">↕ {mm}</span>
      <span className="h-px w-10 bg-bean/25" />
    </div>
  );
}

function BayCell({ mm, pallets }: { mm: number; pallets: number }) {
  return (
    <div className={`flex h-8 shrink-0 flex-col items-center justify-center rounded-sm border border-mint/40 bg-mint/20 leading-none ${pallets === 2 ? "w-16" : "w-10"}`}>
      <span className="text-[10px] font-bold text-mint-deep">{mm}</span>
      <span className="text-[8px] text-mint-deep/70">{pallets}P</span>
    </div>
  );
}

function LineBar({ name, stats, active, onClick, align = "left" }: { name: string; stats?: { occ: number; total: number }; active: boolean; onClick: () => void; align?: "left" | "right" }) {
  const line = LINES.find((l) => l.name === name);
  if (!line) return null;
  const pct = stats && stats.total ? Math.round((stats.occ / stats.total) * 100) : 0;
  const ai = line.segs.findIndex((s) => s.kind === "aisle");
  const hasAisle = ai >= 0;
  const left = hasAisle ? line.segs.slice(0, ai) : line.segs;
  const right = hasAisle ? line.segs.slice(ai + 1) : [];
  const cell = (s: typeof line.segs[number], i: number) => (s.kind === "bay" ? <BayCell key={i} mm={s.mm} pallets={s.pallets} /> : null);
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg border p-1.5 text-left transition ${active ? "border-mint bg-mint/10" : "border-cream-deep bg-cream/30 hover:bg-cream"}`}>
      <span className="w-12 shrink-0 text-xs font-extrabold text-coffee">{name}</span>
      {hasAisle ? (
        // 통로를 가운데 고정 컬럼에 두어 라인 간 1S바이패스가 세로로 일자 정렬
        <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-1">
          <div className="flex justify-end gap-0.5">{left.map(cell)}</div>
          <div title="1S바이패스 · 통로" className="h-8 w-3 rounded-sm bg-[repeating-linear-gradient(45deg,#efe6d6,#efe6d6_3px,#fff_3px,#fff_6px)]" />
          <div className="flex justify-start gap-0.5">{right.map(cell)}</div>
        </div>
      ) : (
        <div className={`flex flex-1 gap-0.5 ${align === "right" ? "justify-end" : "justify-start"}`}>{left.map(cell)}</div>
      )}
      <span className="w-9 shrink-0 text-right text-[10px] font-semibold text-bean">{pct}%</span>
    </button>
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
