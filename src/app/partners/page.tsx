"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DashboardNav from "@/components/DashboardNav";
import { usePartners } from "@/lib/usePartners";
import {
  PARTNER_TYPES,
  PARTNER_STATUSES,
  PARTNER_CSV_HEADERS,
  partnerToRow,
  partnersToCsv,
  parsePartnerCsv,
  rowsToPartners,
  MGMT_GRADES,
  MGMT_STATUSES,
  EMPTY_MGMT,
  mgmtToCsv,
  EVAL_CRITERIA,
  EVAL_MAX_TOTAL,
  gradeOf,
  emptyEval,
  evalTotal,
  evalsToCsv,
  type Partner,
  type PartnerType,
  type PartnerStatus,
  type PartnerMgmt,
  type SupplierEval,
} from "@/lib/partners";

const EVAL_KEY = "supplier-eval-v1";
const GRADE_CHIP: Record<string, string> = {
  A: "bg-bio/20 text-bio-deep",
  B: "bg-mint/20 text-mint-deep",
  C: "bg-amber-100 text-amber-800",
  D: "bg-rose-100 text-rose-700",
};

const MGMT_KEY = "partner-mgmt-v1";
const MGMT_STATUS_CHIP: Record<string, string> = {
  정상: "bg-bio/15 text-bio-deep",
  주의: "bg-amber-100 text-amber-800",
  검토: "bg-mint/20 text-mint-deep",
  중단: "bg-rose-100 text-rose-700",
};

const TYPE_CHIP: Record<PartnerType, string> = {
  매입처: "bg-mint/25 text-roast",
  매출처: "bg-bio/15 text-bio-deep",
  "매입+매출": "bg-bean/15 text-bean",
};
const STATUS_CHIP: Record<PartnerStatus, string> = {
  활성: "bg-bio/15 text-bio-deep",
  중단: "bg-rose-100 text-rose-700",
};

const EMPTY: Partner = {
  code: "", name: "", bizNo: "", ceo: "", type: "매입처", bizType: "", bizItem: "",
  manager: "", phone: "", email: "", address: "", payTerm: "", status: "활성", note: "",
};

const APPSHEET_KEY = "appsheet-url-v1";

export default function PartnersDashboard() {
  const { partners, upsert, remove, reset, setPartners } = usePartners();
  const [type, setType] = useState<"전체" | PartnerType>("전체");
  const [status, setStatus] = useState<"전체" | PartnerStatus>("전체");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partner | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [view, setView] = useState<"info" | "mgmt" | "eval">("info");
  const fileRef = useRef<HTMLInputElement>(null);

  // 공급업체 평가 (선정 평가서)
  const [evals, setEvals] = useState<Record<string, SupplierEval>>({});
  const [evalHydrated, setEvalHydrated] = useState(false);
  const [evalTarget, setEvalTarget] = useState<Partner | null>(null);
  const [evalDraft, setEvalDraft] = useState<SupplierEval>(emptyEval());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(EVAL_KEY);
      if (raw) setEvals(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setEvalHydrated(true);
  }, []);
  useEffect(() => {
    if (!evalHydrated) return;
    try {
      localStorage.setItem(EVAL_KEY, JSON.stringify(evals));
    } catch {
      /* ignore */
    }
  }, [evals, evalHydrated]);
  const openEval = (p: Partner) => {
    setEvalTarget(p);
    setEvalDraft(evals[p.code] ? { ...evals[p.code], scores: [...evals[p.code].scores] } : emptyEval());
  };
  const setScore = (i: number, v: number, max: number) =>
    setEvalDraft((d) => {
      const scores = [...d.scores];
      scores[i] = Math.max(0, Math.min(max, Math.round(v) || 0));
      return { ...d, scores };
    });
  const saveEval = () => {
    if (!evalTarget) return;
    setEvals((prev) => ({ ...prev, [evalTarget.code]: evalDraft }));
    setEvalTarget(null);
  };
  const exportEvals = () => {
    const url = URL.createObjectURL(new Blob([evalsToCsv(partners, evals)], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = "공급업체_평가결과.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // 관리 시트(별도 관리 레이어) — 거래처코드 기준으로 보관, 전산 재업로드와 무관하게 유지
  const [mgmt, setMgmt] = useState<Record<string, PartnerMgmt>>({});
  const [mgmtHydrated, setMgmtHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MGMT_KEY);
      if (raw) setMgmt(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setMgmtHydrated(true);
  }, []);
  useEffect(() => {
    if (!mgmtHydrated) return;
    try {
      localStorage.setItem(MGMT_KEY, JSON.stringify(mgmt));
    } catch {
      /* ignore */
    }
  }, [mgmt, mgmtHydrated]);
  const mgmtOf = (code: string): PartnerMgmt => mgmt[code] ?? EMPTY_MGMT;
  const patchMgmt = (code: string, partial: Partial<PartnerMgmt>) =>
    setMgmt((prev) => ({ ...prev, [code]: { ...EMPTY_MGMT, ...prev[code], ...partial } }));
  const exportMgmt = () => {
    const url = URL.createObjectURL(new Blob([mgmtToCsv(partners, mgmt)], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = "거래처_관리시트.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // AppSheet 임베드 URL
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

  const counts = useMemo(() => {
    const c = { 매입: 0, 매출: 0, 활성: 0, 중단: 0 };
    partners.forEach((p) => {
      if (p.type !== "매출처") c.매입 += 1;
      if (p.type !== "매입처") c.매출 += 1;
      c[p.status] += 1;
    });
    return c;
  }, [partners]);

  const filtered = useMemo(() => {
    return partners.filter((p) => {
      if (type !== "전체" && p.type !== type) return false;
      if (status !== "전체" && p.status !== status) return false;
      if (q && !`${p.code} ${p.name} ${p.ceo} ${p.manager} ${p.bizItem} ${p.bizNo}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [partners, type, status, q]);

  const openNew = () => { setEditing({ ...EMPTY }); setIsNew(true); };
  const openEdit = (p: Partner) => { setEditing({ ...p }); setIsNew(false); };
  const save = () => {
    if (!editing) return;
    if (!editing.code.trim() || !editing.name.trim()) { alert("거래처코드와 거래처명은 필수입니다."); return; }
    upsert(editing);
    setEditing(null);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let parsed: Partner[];
      if (/\.csv$/i.test(file.name)) {
        parsed = parsePartnerCsv(await file.text());
      } else {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        parsed = rowsToPartners(XLSX.utils.sheet_to_json(ws, { defval: "" }));
      }
      if (!parsed.length) alert("인식된 거래처가 없습니다. 헤더(거래처코드·거래처명·사업자번호·거래유형…)를 확인해주세요.");
      else if (confirm(`${parsed.length}개 거래처를 불러옵니다. 현재 목록을 교체할까요?`)) {
        setPartners(parsed); setType("전체"); setStatus("전체"); setQ("");
      }
    } catch (err) {
      alert("파일을 읽지 못했습니다: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([partnersToCsv(partners)], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = "거래처관리대장.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const copyForSheet = async () => {
    const tsv = [PARTNER_CSV_HEADERS.join("\t"), ...partners.map((p) => partnerToRow(p).join("\t"))].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      alert("구글시트용 데이터(헤더 포함)를 복사했습니다.\n구글시트 A1 셀에 붙여넣기(Ctrl+V) 하세요.");
    } catch {
      alert("클립보드 복사에 실패했습니다. ‘CSV 내보내기’를 이용해주세요.");
    }
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
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-coffee sm:text-3xl">거래처 관리대장</h1>
          <p className="mt-2 max-w-2xl text-sm text-bean">
            매입·매출 거래처 정보를 한 곳에서 관리하고, <span className="font-semibold text-roast">AppSheet 등록 폼</span>과 구글시트로 연동합니다.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-7">
        {/* KPI */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="총 거래처" value={partners.length} unit="개사" tone="ink" />
          <Kpi label="매입처" value={counts.매입} unit="개사" tone="mint" />
          <Kpi label="매출처" value={counts.매출} unit="개사" tone="bio" />
          <Kpi label="활성" value={counts.활성} unit="개사" tone="bio" />
          <Kpi label="거래중단" value={counts.중단} unit="개사" tone="rose" />
        </section>

        {/* 보기 전환 탭 */}
        <section className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap rounded-xl border border-cream-deep bg-white p-1">
            <button onClick={() => setView("info")} className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${view === "info" ? "bg-espresso text-cream" : "text-bean hover:text-roast"}`}>
              거래처 정보 <span className="text-[10px] font-medium opacity-70">전산</span>
            </button>
            <button onClick={() => setView("mgmt")} className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${view === "mgmt" ? "bg-mint text-white" : "text-bean hover:text-roast"}`}>
              관리 시트 <span className="text-[10px] font-medium opacity-70">자체</span>
            </button>
            <button onClick={() => setView("eval")} className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${view === "eval" ? "bg-espresso text-cream" : "text-bean hover:text-roast"}`}>
              공급업체 평가 <span className="text-[10px] font-medium opacity-70">선정 평가서</span>
            </button>
          </div>
          {view === "mgmt" && (
            <button onClick={exportMgmt} className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean transition hover:bg-cream-deep">⬇ 관리시트 CSV</button>
          )}
          {view === "eval" && (
            <button onClick={exportEvals} className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean transition hover:bg-cream-deep">⬇ 평가결과 CSV</button>
          )}
        </section>
        <p className="mt-2 text-xs leading-relaxed text-bean/70">
          {view === "info"
            ? "거래처 기본정보는 전산(ERP)에서 받아 ‘CSV/엑셀’로 업로드합니다. 업로드 시 기본정보만 교체되고, 관리 시트 내용은 그대로 유지됩니다."
            : view === "mgmt"
              ? "전산에 없는 자체 관리 항목(등급·주거래·자사담당·결제메모·관리상태 등)을 거래처별로 관리합니다. 거래처코드 기준으로 저장되어 전산 데이터를 다시 받아도 유지됩니다."
              : `공급업체 선정 평가서(100점 만점) 기준으로 거래처를 평가합니다. 총점 → 등급(A 90~/B 80~/C 60~/D <60) 자동 판정. ‘평가결과 CSV’로 내보내 구글시트·AppSheet 평가 앱과 연동할 수 있습니다.`}
        </p>

        {/* Toolbar */}
        <section className="mt-6 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-cream-deep bg-white p-0.5">
            {(["전체", ...PARTNER_TYPES] as const).map((f) => (
              <button key={f} onClick={() => setType(f)} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${type === f ? "bg-espresso text-cream" : "text-bean hover:text-roast"}`}>{f}</button>
            ))}
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as "전체" | PartnerStatus)} className="select">
            <option value="전체">전체 상태</option>
            {PARTNER_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="거래처·대표·담당·종목 검색" className="min-w-[150px] flex-1 rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs text-roast placeholder:text-bean/50 focus:border-mint focus:outline-none" />
          <button onClick={openNew} className="rounded-lg bg-espresso px-3 py-2 text-xs font-bold text-cream transition hover:bg-roast">+ 거래처 등록</button>
          <button onClick={() => fileRef.current?.click()} className="rounded-lg bg-bean px-3 py-2 text-xs font-bold text-cream transition hover:bg-roast">⬆ CSV/엑셀</button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFile} className="hidden" />
          <button onClick={exportCsv} className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean transition hover:bg-cream-deep">⬇ CSV</button>
          <button onClick={() => confirm("샘플 데이터로 초기화할까요?") && reset()} className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean transition hover:bg-cream-deep">초기화</button>
        </section>

        {/* 거래처 정보 표 (전산) */}
        {view === "info" && (
        <section className="mt-3 overflow-x-auto rounded-2xl border border-cream-deep bg-white shadow-sm">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-cream-deep bg-cream text-xs text-bean">
                <Th left>거래처</Th><Th>유형</Th><Th left>사업자번호</Th><Th left>대표</Th>
                <Th left>업태 / 종목</Th><Th left>담당자·연락처</Th><Th left>결제조건</Th><Th>상태</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.code} className="border-b border-cream-deep/60 last:border-0">
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-ink">{p.name}</div>
                    <div className="text-[11px] text-bean/60">{p.code}{p.address ? ` · ${p.address}` : ""}</div>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TYPE_CHIP[p.type]}`}>{p.type}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-bean">{p.bizNo || "—"}</td>
                  <td className="px-3 py-2.5 text-roast">{p.ceo || "—"}</td>
                  <td className="px-3 py-2.5 text-bean">{[p.bizType, p.bizItem].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="text-roast">{p.manager || "—"}</div>
                    <div className="text-[11px] text-bean/60">{[p.phone, p.email].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-bean">{p.payTerm || "—"}</td>
                  <td className="px-2 py-2.5 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_CHIP[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-2 py-2.5 text-center whitespace-nowrap">
                    <button onClick={() => openEdit(p)} className="rounded px-2 py-1 text-xs font-medium text-bean hover:bg-cream-deep">편집</button>
                    <button onClick={() => confirm(`${p.name} 거래처를 삭제할까요?`) && remove(p.code)} className="rounded px-2 py-1 text-xs font-medium text-bean/70 hover:bg-rose-50 hover:text-rose-600">삭제</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-bean/60">조건에 맞는 거래처가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </section>
        )}

        {/* 관리 시트 (자체 관리 레이어) */}
        {view === "mgmt" && (
        <section className="mt-3 overflow-x-auto rounded-2xl border border-mint/40 bg-white shadow-sm">
          <table className="w-full min-w-[1120px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-cream-deep bg-mint/10 text-xs text-bean">
                <th className="px-3 py-2.5 text-left font-semibold">거래처</th>
                <th className="px-2 py-2.5 text-center font-semibold">관리등급</th>
                <th className="px-2 py-2.5 text-center font-semibold">주거래</th>
                <th className="px-3 py-2.5 text-left font-semibold">자사 담당</th>
                <th className="px-3 py-2.5 text-left font-semibold">결제/단가 메모</th>
                <th className="px-2 py-2.5 text-center font-semibold">최근 접촉일</th>
                <th className="px-2 py-2.5 text-center font-semibold">관리상태</th>
                <th className="px-3 py-2.5 text-left font-semibold">메모</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const m = mgmtOf(p.code);
                return (
                  <tr key={p.code} className="border-b border-cream-deep/60 last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-bold text-ink">{p.name}</div>
                      <div className="text-[11px] text-bean/60">{p.code} · {p.type}</div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <select value={m.grade} onChange={(e) => patchMgmt(p.code, { grade: e.target.value })} className="msel">
                        <option value="">-</option>
                        {MGMT_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <select value={m.mainDeal} onChange={(e) => patchMgmt(p.code, { mainDeal: e.target.value })} className="msel">
                        <option value="">-</option><option value="예">예</option><option value="아니오">아니오</option>
                      </select>
                    </td>
                    <td className="px-3 py-2"><input value={m.ourManager} onChange={(e) => patchMgmt(p.code, { ourManager: e.target.value })} className="minp" placeholder="담당자" /></td>
                    <td className="px-3 py-2"><input value={m.payNote} onChange={(e) => patchMgmt(p.code, { payNote: e.target.value })} className="minp" placeholder="결제/단가 메모" /></td>
                    <td className="px-2 py-2 text-center"><input type="date" value={m.lastContact} onChange={(e) => patchMgmt(p.code, { lastContact: e.target.value })} className="msel" /></td>
                    <td className="px-2 py-2 text-center">
                      <select value={m.mgmtStatus} onChange={(e) => patchMgmt(p.code, { mgmtStatus: e.target.value })} className={`msel font-bold ${MGMT_STATUS_CHIP[m.mgmtStatus] || ""}`}>
                        {MGMT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2"><input value={m.memo} onChange={(e) => patchMgmt(p.code, { memo: e.target.value })} className="minp" placeholder="메모" /></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-bean/60">조건에 맞는 거래처가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </section>
        )}

        {/* 공급업체 평가 요약 */}
        {view === "eval" && (
        <section className="mt-3 overflow-x-auto rounded-2xl border border-cream-deep bg-white shadow-sm">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-cream-deep bg-cream text-xs text-bean">
                <th className="px-3 py-2.5 text-left font-semibold">공급업체</th>
                <th className="px-3 py-2.5 text-center font-semibold">총점</th>
                <th className="px-3 py-2.5 text-center font-semibold">등급</th>
                <th className="px-3 py-2.5 text-center font-semibold">판정</th>
                <th className="px-3 py-2.5 text-center font-semibold">평가일자</th>
                <th className="px-3 py-2.5 text-left font-semibold">평가자</th>
                <th className="px-3 py-2.5 text-center font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const e = evals[p.code];
                const done = !!e;
                const t = done ? evalTotal(e) : 0;
                const g = done ? gradeOf(t) : null;
                return (
                  <tr key={p.code} className="border-b border-cream-deep/60 last:border-0">
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-ink">{p.name}</div>
                      <div className="text-[11px] text-bean/60">{p.code}{p.bizNo ? ` · ${p.bizNo}` : ""}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold tabular-nums text-roast">{done ? `${t} / ${EVAL_MAX_TOTAL}` : <span className="text-bean/40">미평가</span>}</td>
                    <td className="px-3 py-2.5 text-center">{g ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${GRADE_CHIP[g.grade]}`}>{g.grade}</span> : <span className="text-bean/40">—</span>}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-bean">{g ? g.verdict : "—"}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-bean">{e?.date || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-bean">{e?.evaluator || "—"}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => openEval(p)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${done ? "border border-cream-deep bg-white text-bean hover:bg-cream-deep" : "bg-mint text-white hover:brightness-95"}`}>
                        {done ? "재평가" : "평가하기"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-bean/60">조건에 맞는 거래처가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </section>
        )}

        {/* AppSheet 연동 */}
        <section className="mt-10">
          <h2 className="text-lg font-extrabold text-coffee">AppSheet 거래처 등록 연동</h2>
          <p className="mt-1 text-sm text-bean/80">구글시트를 거래처 마스터(SSOT)로 두고, AppSheet 앱에서 모바일·웹으로 거래처를 등록하면 시트에 자동 저장됩니다.</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* 가이드 */}
            <div className="rounded-2xl border border-cream-deep bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-roast">연동 절차</h3>
              <ol className="mt-3 space-y-3">
                {[
                  ["거래처 데이터를 구글시트로", "아래 ‘구글시트용 복사’를 눌러 헤더와 함께 복사한 뒤, 새 구글시트 A1에 붙여넣습니다. 이 시트가 거래처 마스터가 됩니다."],
                  ["AppSheet 앱 생성", "appsheet.com 접속 → Create → App → ‘Start with existing data’ → 위 구글시트를 선택하면 거래처 등록 앱이 자동 생성됩니다."],
                  ["등록 폼 사용", "AppSheet가 만든 폼으로 거래처를 추가/수정하면 구글시트(마스터)에 그대로 반영됩니다."],
                  ["이 화면에 임베드", "AppSheet 앱의 공유(Share) → 링크를 복사해 아래에 붙여넣으면, 이 대시보드 안에서 바로 등록할 수 있습니다."],
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

            {/* 임베드 */}
            <div className="rounded-2xl border border-cream-deep bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-roast">AppSheet 앱 임베드</h3>
              <div className="mt-3 flex gap-2">
                <input
                  value={appUrlInput}
                  onChange={(e) => setAppUrlInput(e.target.value)}
                  placeholder="https://www.appsheet.com/start/앱ID  (앱 공유 링크)"
                  className="min-w-0 flex-1 rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs text-roast placeholder:text-bean/50 focus:border-mint focus:outline-none"
                />
                <button onClick={saveAppUrl} className="shrink-0 rounded-lg bg-espresso px-3 py-2 text-xs font-bold text-cream hover:bg-roast">임베드</button>
                {appUrl && (
                  <button onClick={() => { setAppUrl(""); setAppUrlInput(""); try { localStorage.removeItem(APPSHEET_KEY); } catch {} }} className="shrink-0 rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean hover:bg-cream-deep">해제</button>
                )}
              </div>
              <div className="mt-3 overflow-hidden rounded-xl border border-cream-deep bg-cream">
                {appUrl ? (
                  <iframe src={appUrl} title="AppSheet 거래처 등록" className="h-[520px] w-full" />
                ) : (
                  <div className="flex h-[520px] flex-col items-center justify-center gap-2 p-6 text-center">
                    <span className="text-3xl">📱</span>
                    <p className="text-sm font-bold text-bean">AppSheet 앱 링크를 붙여넣으면</p>
                    <p className="text-xs text-bean/70">여기에서 거래처 등록 폼이 바로 열립니다.</p>
                  </div>
                )}
              </div>
              <p className="mt-2 text-[11px] text-bean/60">※ 임베드가 빈 화면이면 AppSheet 앱의 공유 설정(Users/Security)에서 접근 권한을 확인하세요. 일부 브라우저는 로그인 세션이 필요합니다.</p>
            </div>
          </div>
        </section>

        <p className="mt-6 text-xs leading-relaxed text-bean/70">· 거래처 목록은 이 브라우저에 저장됩니다. CSV/엑셀 업로드로 통째 교체하거나, AppSheet→구글시트로 관리한 데이터를 다시 내려받아 사용할 수 있습니다.</p>
      </div>

      {/* 편집 모달 */}
      {editing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-espresso/40 p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-extrabold text-coffee">{isNew ? "거래처 등록" : "거래처 편집"}</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <F label="거래처코드"><input value={editing.code} disabled={!isNew} onChange={(e) => setEditing({ ...editing, code: e.target.value })} className="input disabled:bg-cream disabled:text-bean/50" /></F>
              <F label="거래처명(상호)"><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="input" /></F>
              <F label="사업자등록번호"><input value={editing.bizNo} onChange={(e) => setEditing({ ...editing, bizNo: e.target.value })} className="input" placeholder="000-00-00000" /></F>
              <F label="대표자"><input value={editing.ceo} onChange={(e) => setEditing({ ...editing, ceo: e.target.value })} className="input" /></F>
              <F label="거래유형"><select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as PartnerType })} className="input">{PARTNER_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}</select></F>
              <F label="거래상태"><select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as PartnerStatus })} className="input">{PARTNER_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}</select></F>
              <F label="업태"><input value={editing.bizType} onChange={(e) => setEditing({ ...editing, bizType: e.target.value })} className="input" /></F>
              <F label="종목"><input value={editing.bizItem} onChange={(e) => setEditing({ ...editing, bizItem: e.target.value })} className="input" /></F>
              <F label="담당자"><input value={editing.manager} onChange={(e) => setEditing({ ...editing, manager: e.target.value })} className="input" /></F>
              <F label="전화번호"><input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} className="input" /></F>
              <F label="이메일"><input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className="input" /></F>
              <F label="결제조건"><input value={editing.payTerm} onChange={(e) => setEditing({ ...editing, payTerm: e.target.value })} className="input" /></F>
              <F label="주소" span2><input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} className="input" /></F>
              <F label="비고" span2><input value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} className="input" /></F>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-cream-deep px-4 py-2 text-sm font-medium text-bean hover:bg-cream-deep">취소</button>
              <button onClick={save} className="rounded-lg bg-espresso px-4 py-2 text-sm font-bold text-cream hover:bg-roast">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 공급업체 평가 모달 */}
      {evalTarget && (() => {
        const total = evalTotal(evalDraft);
        const g = gradeOf(total);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 p-4" onClick={() => setEvalTarget(null)}>
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-coffee">공급업체 선정 평가서</h3>
                  <p className="mt-0.5 text-xs text-bean/70">{evalTarget.name} · {evalTarget.bizNo || "사업자번호 미등록"} · {evalTarget.bizItem || evalTarget.type}</p>
                </div>
                <div className={`shrink-0 rounded-xl px-4 py-2 text-center ${GRADE_CHIP[g.grade]}`}>
                  <div className="text-2xl font-extrabold tabular-nums">{total}<span className="text-sm font-semibold">/{EVAL_MAX_TOTAL}</span></div>
                  <div className="text-xs font-bold">{g.grade}등급 · {g.verdict}</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-bean">평가 일자</span>
                  <div className="mt-1"><input type="date" value={evalDraft.date} onChange={(e) => setEvalDraft((d) => ({ ...d, date: e.target.value }))} className="input" /></div>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-bean">평가자</span>
                  <div className="mt-1"><input value={evalDraft.evaluator} onChange={(e) => setEvalDraft((d) => ({ ...d, evaluator: e.target.value }))} className="input" placeholder="평가자명" /></div>
                </label>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-cream-deep">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-cream-deep bg-cream text-xs text-bean">
                      <th className="px-3 py-2 text-left font-semibold">평가 항목</th>
                      <th className="px-3 py-2 text-left font-semibold">세부 평가 기준</th>
                      <th className="px-2 py-2 text-center font-semibold">배점</th>
                      <th className="px-2 py-2 text-center font-semibold">점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EVAL_CRITERIA.map((c, i) => {
                      const firstOfCat = i === 0 || EVAL_CRITERIA[i - 1].category !== c.category;
                      const catCount = EVAL_CRITERIA.filter((x) => x.category === c.category).length;
                      return (
                        <tr key={i} className="border-b border-cream-deep/50 last:border-0">
                          {firstOfCat && <td rowSpan={catCount} className="border-r border-cream-deep/50 bg-cream/40 px-3 py-2 align-middle text-xs font-bold text-roast">{c.category}</td>}
                          <td className="px-3 py-2 text-xs text-ink">{c.item}</td>
                          <td className="px-2 py-2 text-center text-xs text-bean">{c.max}</td>
                          <td className="px-2 py-2 text-center">
                            <input type="number" min={0} max={c.max} value={evalDraft.scores[i]} onChange={(e) => setScore(i, Number(e.target.value), c.max)} className="w-16 rounded border border-cream-deep px-1.5 py-1 text-center text-sm font-bold text-ink focus:border-mint focus:outline-none" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-mint/10 font-bold text-roast">
                      <td colSpan={2} className="px-3 py-2 text-right">총점 (100점 만점)</td>
                      <td className="px-2 py-2 text-center">{EVAL_MAX_TOTAL}</td>
                      <td className="px-2 py-2 text-center text-mint-deep">{total}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setEvalTarget(null)} className="rounded-lg border border-cream-deep px-4 py-2 text-sm font-medium text-bean hover:bg-cream-deep">취소</button>
                <button onClick={saveEval} className="rounded-lg bg-espresso px-4 py-2 text-sm font-bold text-cream hover:bg-roast">평가 저장</button>
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        .input { width:100%; border:1px solid var(--color-cream-deep); border-radius:0.5rem; padding:0.45rem 0.6rem; font-size:0.875rem; color:var(--color-roast); background:#fff; }
        .input:focus { outline:none; border-color:var(--color-mint); }
        .select { border:1px solid var(--color-cream-deep); border-radius:0.5rem; padding:0.5rem 0.7rem; font-size:0.75rem; font-weight:500; color:var(--color-bean); background:#fff; }
        .select:focus { outline:none; border-color:var(--color-mint); }
        .minp { width:100%; min-width:90px; border:1px solid var(--color-cream-deep); border-radius:0.375rem; padding:0.3rem 0.45rem; font-size:0.75rem; color:var(--color-roast); background:#fff; }
        .minp:focus { outline:none; border-color:var(--color-mint); }
        .msel { border:1px solid var(--color-cream-deep); border-radius:0.375rem; padding:0.3rem 0.4rem; font-size:0.75rem; color:var(--color-roast); background:#fff; }
        .msel:focus { outline:none; border-color:var(--color-mint); }
      `}</style>
    </main>
  );
}

function Kpi({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: "ink" | "mint" | "bio" | "rose" }) {
  const t = { ink: "text-ink", mint: "text-bean", bio: "text-bio-deep", rose: "text-rose-600" }[tone];
  return (
    <div className="rounded-2xl border border-cream-deep bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-bean">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${t}`}>{value}</p>
      <p className="text-xs text-bean/60">{unit}</p>
    </div>
  );
}

function Th({ children, left }: { children?: React.ReactNode; left?: boolean }) {
  return <th className={`px-3 py-2.5 font-semibold ${left ? "text-left" : "text-center"}`}>{children}</th>;
}

function F({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <label className={`block ${span2 ? "col-span-2" : ""}`}>
      <span className="text-xs font-medium text-bean">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
