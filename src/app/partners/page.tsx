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
  type Partner,
  type PartnerType,
  type PartnerStatus,
} from "@/lib/partners";

const TYPE_CHIP: Record<PartnerType, string> = {
  매입처: "bg-caramel/25 text-roast",
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
  const fileRef = useRef<HTMLInputElement>(null);

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

      <header className="border-b border-cream-deep bg-gradient-to-br from-white via-cream to-caramel-light/40">
        <div className="mx-auto max-w-6xl px-5 py-9">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-bean shadow-sm ring-1 ring-cream-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-caramel" />
            거래처 관리대장
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
          <Kpi label="매입처" value={counts.매입} unit="개사" tone="caramel" />
          <Kpi label="매출처" value={counts.매출} unit="개사" tone="bio" />
          <Kpi label="활성" value={counts.활성} unit="개사" tone="bio" />
          <Kpi label="거래중단" value={counts.중단} unit="개사" tone="rose" />
        </section>

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
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="거래처·대표·담당·종목 검색" className="min-w-[150px] flex-1 rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs text-roast placeholder:text-bean/50 focus:border-caramel focus:outline-none" />
          <button onClick={openNew} className="rounded-lg bg-espresso px-3 py-2 text-xs font-bold text-cream transition hover:bg-roast">+ 거래처 등록</button>
          <button onClick={() => fileRef.current?.click()} className="rounded-lg bg-bean px-3 py-2 text-xs font-bold text-cream transition hover:bg-roast">⬆ CSV/엑셀</button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFile} className="hidden" />
          <button onClick={exportCsv} className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean transition hover:bg-cream-deep">⬇ CSV</button>
          <button onClick={() => confirm("샘플 데이터로 초기화할까요?") && reset()} className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean transition hover:bg-cream-deep">초기화</button>
        </section>

        {/* Table */}
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
                  className="min-w-0 flex-1 rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs text-roast placeholder:text-bean/50 focus:border-caramel focus:outline-none"
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

      <style>{`
        .input { width:100%; border:1px solid var(--color-cream-deep); border-radius:0.5rem; padding:0.45rem 0.6rem; font-size:0.875rem; color:var(--color-roast); background:#fff; }
        .input:focus { outline:none; border-color:var(--color-caramel); }
        .select { border:1px solid var(--color-cream-deep); border-radius:0.5rem; padding:0.5rem 0.7rem; font-size:0.75rem; font-weight:500; color:var(--color-bean); background:#fff; }
        .select:focus { outline:none; border-color:var(--color-caramel); }
      `}</style>
    </main>
  );
}

function Kpi({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: "ink" | "caramel" | "bio" | "rose" }) {
  const t = { ink: "text-ink", caramel: "text-bean", bio: "text-bio-deep", rose: "text-rose-600" }[tone];
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
