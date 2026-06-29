"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardNav from "@/components/DashboardNav";
import { useInventory } from "@/lib/useInventory";
import { suggestedQty, won, num, APPROVAL_LIMIT, type Item } from "@/lib/inventory";
import { ISSUER, DELIVERY_PLACE, PO_FOOTER, VAT_RATE } from "@/lib/company";

const fmtDate = (d: Date) => `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type POState = "draft" | "approved" | "sent";

interface HistoryEntry {
  poNo: string;
  ts: string;
  supplier: string;
  itemCount: number;
  amount: number;
}

const HISTORY_KEY = "purchase-history-v1";

const STATE_META: Record<POState, { label: string; chip: string }> = {
  draft: { label: "검토 대기", chip: "bg-cream-deep text-bean" },
  approved: { label: "승인됨", chip: "bg-mint/25 text-roast" },
  sent: { label: "발송 완료", chip: "bg-bio/15 text-bio-deep" },
};

function ymd(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

export default function PurchaseOrderDashboard() {
  const { items, hydrated } = useInventory();

  const [qtyOverride, setQtyOverride] = useState<Record<string, number>>({});
  const [poStatus, setPoStatus] = useState<Record<string, POState>>({});
  const [openReason, setOpenReason] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [histHydrated, setHistHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHistHydrated(true);
  }, []);
  useEffect(() => {
    if (!histHydrated) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      /* ignore */
    }
  }, [history, histHydrated]);

  const orders = useMemo(() => {
    const short = items.filter((it) => suggestedQty(it) > 0);
    const bySupplier = new Map<string, Item[]>();
    short.forEach((it) => {
      const arr = bySupplier.get(it.supplier) ?? [];
      arr.push(it);
      bySupplier.set(it.supplier, arr);
    });
    const date = ymd(new Date());
    return Array.from(bySupplier.entries()).map(([supplier, its], idx) => {
      const lines = its.map((it) => {
        const qty = qtyOverride[it.code] ?? suggestedQty(it);
        return { it, qty, amount: qty * it.unitPrice };
      });
      const total = lines.reduce((s, l) => s + l.amount, 0);
      return {
        supplier,
        poNo: `PO-${date}-${String(idx + 1).padStart(3, "0")}`,
        lines,
        total,
        overLimit: total > APPROVAL_LIMIT,
        status: poStatus[supplier] ?? ("draft" as POState),
      };
    });
  }, [items, qtyOverride, poStatus]);

  const summary = useMemo(() => {
    const itemCount = orders.reduce((s, o) => s + o.lines.length, 0);
    const total = orders.reduce((s, o) => s + o.total, 0);
    return { suppliers: orders.length, itemCount, total };
  }, [orders]);

  const reasonText = (o: (typeof orders)[number]) => {
    const top = o.lines.slice(0, 3).map((l) => l.it.name).join(", ");
    const more = o.lines.length > 3 ? ` 외 ${o.lines.length - 3}건` : "";
    return (
      `재주문점(ROP) 미달로 적정재고 확보가 필요한 ${o.lines.length}개 품목에 대해 발주를 요청합니다. ` +
      `대상 품목은 ${top}${more}이며, 공급사는 '${o.supplier}', 총 발주금액은 ${won(o.total)}입니다. ` +
      `본 발주 수량은 목표재고 대비 부족분을 MOQ 단위로 자동 산정한 값이며, 담당자 검토를 완료했습니다.` +
      (o.overLimit ? ` ※ 금액 한도(${won(APPROVAL_LIMIT)}) 초과 건으로 추가 결재가 필요합니다.` : "")
    );
  };

  const setQty = (code: string, qty: number) => setQtyOverride((p) => ({ ...p, [code]: Math.max(0, qty) }));
  const setStatus = (supplier: string, s: POState) => setPoStatus((p) => ({ ...p, [supplier]: s }));

  const send = (o: (typeof orders)[number]) => {
    if (o.overLimit && !confirm(`금액 한도 초과(${won(o.total)}) 건입니다. 추가 결재를 거쳤다고 보고 발송 처리할까요?`)) return;
    const entry: HistoryEntry = {
      poNo: o.poNo,
      ts: new Date().toLocaleString("ko-KR"),
      supplier: o.supplier,
      itemCount: o.lines.length,
      amount: o.total,
    };
    setHistory((h) => [entry, ...h]);
    setStatus(o.supplier, "sent");
  };

  const downloadCsv = (o: (typeof orders)[number]) => {
    const rows = [
      ["발주번호", o.poNo],
      ["공급사", o.supplier],
      ["발주일", new Date().toLocaleDateString("ko-KR")],
      [],
      ["순번", "품목코드", "품목명", "단위", "수량", "단가", "공급가액", "세액"],
      ...o.lines.map((l, i) => [i + 1, l.it.code, l.it.name, l.it.unit, l.qty, l.it.unitPrice, l.amount, Math.round(l.amount * VAT_RATE)]),
      [],
      ["합계", "", "", "", "", "", o.total, Math.round(o.total * VAT_RATE)],
      ["총 금액(공급가액+세액)", "", "", "", "", "", Math.round(o.total * (1 + VAT_RATE)), ""],
    ];
    const csv = "﻿" + rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${o.poNo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPO = (o: (typeof orders)[number]) => {
    const win = window.open("", "_blank", "width=860,height=1040");
    if (!win) return;
    const now = new Date();
    const leadDays = Math.max(0, ...o.lines.map((l) => l.it.leadTimeDays));
    const due = new Date(now.getTime() + leadDays * 86400000);

    let supply = 0;
    let vat = 0;
    const lineRows = o.lines
      .map((l, i) => {
        const v = Math.round(l.amount * VAT_RATE);
        supply += l.amount;
        vat += v;
        return `<tr><td class="c">${i + 1}</td><td>${esc(l.it.name)}</td><td class="c">${esc(l.it.unit)}</td><td class="r">${num(l.qty)}</td><td class="r">${num(l.it.unitPrice)}</td><td class="r">${num(l.amount)}</td><td class="r">${num(v)}</td><td></td></tr>`;
      })
      .join("");
    const pad = Math.max(0, 10 - o.lines.length);
    const padRows = Array.from({ length: pad }, (_, i) =>
      `<tr><td class="c">${o.lines.length + i + 1}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`,
    ).join("");
    const grand = supply + vat;
    const footer = PO_FOOTER.map((t) => `<li>${esc(t)}</li>`).join("");

    win.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>발주서 ${o.poNo}</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:'Malgun Gothic',system-ui,sans-serif;color:#1a1a1a;font-size:12px;padding:26px;}
      .title{text-align:center;font-size:25px;font-weight:800;letter-spacing:18px;border:2px solid #222;padding:9px 0 9px 18px;margin-bottom:14px;}
      table{border-collapse:collapse;width:100%;}
      .head td{border:1px solid #555;padding:5px 8px;height:26px;}
      .head .sup{font-size:15px;font-weight:800;text-align:center;}
      .lbl{background:#eef3fb;font-weight:600;text-align:center;white-space:nowrap;}
      .vlabel{width:24px;text-align:center;font-weight:700;background:#eef3fb;}
      .reg{color:#c0392b;font-weight:700;}
      .items{margin-top:12px;}
      .items th{border:1px solid #555;background:#eef3fb;padding:6px 4px;font-weight:600;}
      .items td{border:1px solid #777;padding:5px 6px;height:25px;}
      .items .c{text-align:center}.items .r{text-align:right}
      .sum td{background:#f4f7fc;font-weight:700;}
      .grand{margin-top:8px;text-align:right;font-size:13px;font-weight:800;}
      .note{margin-top:14px;border:1px solid #555;}
      .note td{border:1px solid #555;padding:8px 10px;vertical-align:top;}
      .note ul{margin:0;padding-left:16px;line-height:1.8;}
      @media print{body{padding:0}}
    </style></head><body>
    <div class="title">발 주 서</div>
    <table class="head">
      <tr>
        <td class="lbl" style="width:72px">상호(수신)</td>
        <td class="sup">${esc(o.supplier)} 귀하</td>
        <td class="vlabel" rowspan="5">발<br>주<br>자</td>
        <td class="lbl" style="width:72px">등록번호</td>
        <td class="reg" colspan="3">${esc(ISSUER.regNo)}</td>
      </tr>
      <tr>
        <td class="lbl">발주일자</td><td>${fmtDate(now)}</td>
        <td class="lbl">상호</td><td>${esc(ISSUER.name)}</td>
        <td class="lbl" style="width:52px">대표</td><td>${esc(ISSUER.ceo)}</td>
      </tr>
      <tr>
        <td class="lbl">납기일자</td><td>${fmtDate(due)}</td>
        <td class="lbl">주소</td><td colspan="3">${esc(ISSUER.address)}</td>
      </tr>
      <tr>
        <td class="lbl">납품장소</td><td>${esc(DELIVERY_PLACE)}</td>
        <td class="lbl">업태</td><td>${esc(ISSUER.bizType)}</td>
        <td class="lbl">종목</td><td>${esc(ISSUER.bizItem)}</td>
      </tr>
      <tr>
        <td class="lbl">발주번호</td><td>${esc(o.poNo)}</td>
        <td class="lbl">전화번호</td><td>${esc(ISSUER.tel)}</td>
        <td class="lbl">팩스</td><td>${esc(ISSUER.fax)}</td>
      </tr>
    </table>

    <table class="items">
      <thead><tr>
        <th style="width:40px">순번</th><th>품목명 / 규격</th><th style="width:50px">단위</th>
        <th style="width:64px">수량</th><th style="width:84px">단가</th>
        <th style="width:96px">공급가액</th><th style="width:84px">세액</th><th style="width:70px">비고</th>
      </tr></thead>
      <tbody>${lineRows}${padRows}</tbody>
      <tfoot><tr class="sum"><td class="c" colspan="5">합 계</td><td class="r">${num(supply)}</td><td class="r">${num(vat)}</td><td></td></tr></tfoot>
    </table>
    <div class="grand">총 금액 (공급가액 + 세액) : ${num(grand)} 원</div>

    <table class="note"><tr>
      <td class="vlabel" style="width:24px">비고</td>
      <td><ul>${footer}</ul></td>
    </tr></table>

    <script>window.onload=()=>window.print()</script>
    </body></html>`);
    win.document.close();
  };

  return (
    <main className="min-h-screen bg-cream text-ink">
      <DashboardNav />

      {/* Header */}
      <header className="border-b border-cream-deep bg-gradient-to-br from-white via-cream to-mint-light/40">
        <div className="mx-auto max-w-6xl px-5 py-9">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-bean shadow-sm ring-1 ring-cream-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
            구매물류팀 업무 자동화 시스템
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-coffee sm:text-3xl">자동 발주서 작성 대시보드</h1>
          <p className="mt-2 max-w-2xl text-sm text-bean">
            적정재고 미달 품목을 공급사별 발주서로 자동 구성합니다. 사람은 <span className="font-semibold text-roast">검토·승인</span>만 하면 됩니다.
          </p>

          {/* 6단계 흐름 */}
          <div className="mt-5 flex flex-wrap items-center gap-1.5 text-[11px]">
            {[
              ["① 부족 감지", false],
              ["② 구매입력 자동", true],
              ["③ 발주서 생성", false],
              ["④ 승인 체크", true],
              ["⑤ PDF·발송·기록", true],
              ["⑥ 품의 자동", true],
            ].map(([label, gate], i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span
                  className={`rounded-md px-2 py-1 font-semibold ring-1 ${
                    gate ? "bg-mint/20 text-roast ring-mint/40" : "bg-white text-bean ring-cream-deep"
                  }`}
                >
                  {label as string}
                </span>
                {i < 5 && <span className="text-bean/50">→</span>}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-7">
        {/* 요약 */}
        <section className="grid grid-cols-3 gap-3">
          <Kpi label="발주서(공급사)" value={num(summary.suppliers)} unit="건" />
          <Kpi label="발주 품목" value={num(summary.itemCount)} unit="품목" />
          <Kpi label="총 발주금액" value={won(summary.total)} unit="자동 산정" money />
        </section>

        {/* 발주서 목록 */}
        {hydrated && orders.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-bio/30 bg-bio/10 p-8 text-center">
            <p className="text-sm font-bold text-bio-deep">현재 재주문점 미달 품목이 없습니다 🎉</p>
            <p className="mt-1 text-xs text-bio-deep/80">적정재고 대시보드에서 현재고를 조정하면 발주서가 자동 생성됩니다.</p>
            <Link href="/inventory" className="mt-3 inline-block rounded-lg bg-bio px-3 py-1.5 text-xs font-bold text-cream">적정재고 보기 →</Link>
          </div>
        ) : (
          <section className="mt-6 space-y-4">
            {orders.map((o) => {
              const sm = STATE_META[o.status];
              const locked = o.status !== "draft";
              return (
                <div key={o.supplier} className="overflow-hidden rounded-2xl border border-cream-deep bg-white shadow-sm">
                  {/* 헤더 */}
                  <div className="flex flex-wrap items-center gap-3 border-b border-cream-deep bg-cream px-5 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-coffee">{o.supplier}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${sm.chip}`}>{sm.label}</span>
                        {o.overLimit && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">한도 초과 · 추가결재</span>}
                      </div>
                      <div className="text-[11px] text-bean/60">발주번호 {o.poNo} · {o.lines.length}개 품목</div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-lg font-extrabold tabular-nums text-ink">{won(Math.round(o.total * (1 + VAT_RATE)))}</div>
                      <div className="text-[11px] text-bean/60">
                        공급가 {won(o.total)} · 세액 {won(Math.round(o.total * VAT_RATE))}
                      </div>
                    </div>
                  </div>

                  {/* 라인 */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-cream-deep text-xs text-bean">
                          <th className="px-4 py-2 text-left font-semibold">품목</th>
                          <th className="px-2 py-2 text-center font-semibold">발주수량</th>
                          <th className="px-2 py-2 text-right font-semibold">단가</th>
                          <th className="px-4 py-2 text-right font-semibold">금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.lines.map((l) => (
                          <tr key={l.it.code} className="border-b border-cream-deep/50 last:border-0">
                            <td className="px-4 py-2.5">
                              <div className="font-bold text-ink">{l.it.name}</div>
                              <div className="text-[11px] text-bean/60">{l.it.code} · {l.it.warehouse} · 현재고 {num(l.it.onHand)} {l.it.unit}</div>
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <input
                                type="number"
                                value={l.qty}
                                disabled={locked}
                                onChange={(e) => setQty(l.it.code, Number(e.target.value) || 0)}
                                className="w-24 rounded border border-cream-deep px-1.5 py-1 text-center text-sm font-bold text-ink focus:border-mint focus:outline-none disabled:bg-cream disabled:text-bean/50"
                              />
                              <span className="ml-1 text-[10px] text-bean/50">{l.it.unit}</span>
                            </td>
                            <td className="px-2 py-2.5 text-right tabular-nums text-bean">{won(l.it.unitPrice)}</td>
                            <td className="px-4 py-2.5 text-right font-bold tabular-nums text-roast">{won(l.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 품의 사유 */}
                  <div className="border-t border-cream-deep px-5 py-3">
                    <button onClick={() => setOpenReason(openReason === o.supplier ? null : o.supplier)} className="flex w-full items-center gap-2 text-left text-xs font-bold text-bean">
                      <span>🤖 품의 사유 자동 작성(초안)</span>
                      <span className="text-bean/50">{openReason === o.supplier ? "−" : "+"}</span>
                    </button>
                    {openReason === o.supplier && <p className="mt-2 rounded-lg bg-cream p-3 text-xs leading-relaxed text-roast">{reasonText(o)}</p>}
                  </div>

                  {/* 액션 */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-cream-deep bg-cream/50 px-5 py-3">
                    {o.status === "draft" && (
                      <button onClick={() => setStatus(o.supplier, "approved")} className="rounded-lg bg-bean px-3.5 py-2 text-xs font-bold text-cream hover:bg-roast">④ 검토 완료 · 승인</button>
                    )}
                    {o.status === "approved" && (
                      <>
                        <button onClick={() => send(o)} className="rounded-lg bg-bio px-3.5 py-2 text-xs font-bold text-cream hover:bg-bio-deep">⑤ 승인 후 발송 · 기록</button>
                        <button onClick={() => setStatus(o.supplier, "draft")} className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean hover:bg-cream-deep">수정으로 되돌리기</button>
                      </>
                    )}
                    {o.status === "sent" && <span className="text-xs font-bold text-bio-deep">✓ 공급사 발송 및 발주이력 기록 완료</span>}
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => printPO(o)} className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean hover:bg-cream-deep">🖨 인쇄/PDF</button>
                      <button onClick={() => downloadCsv(o)} className="rounded-lg border border-cream-deep bg-white px-3 py-2 text-xs font-medium text-bean hover:bg-cream-deep">⬇ CSV</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* 발주 이력 */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-coffee">발주 이력</h2>
            {history.length > 0 && (
              <button onClick={() => confirm("발주 이력을 모두 비울까요?") && setHistory([])} className="rounded-lg border border-cream-deep bg-white px-3 py-1.5 text-xs font-medium text-bean hover:bg-cream-deep">이력 비우기</button>
            )}
          </div>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-cream-deep bg-white shadow-sm">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-cream-deep bg-cream text-xs text-bean">
                  <th className="px-4 py-2.5 text-left font-semibold">발주번호</th>
                  <th className="px-4 py-2.5 text-left font-semibold">공급사</th>
                  <th className="px-4 py-2.5 text-center font-semibold">품목수</th>
                  <th className="px-4 py-2.5 text-right font-semibold">금액</th>
                  <th className="px-4 py-2.5 text-right font-semibold">발송일시</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={`${h.poNo}-${i}`} className="border-b border-cream-deep/50 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-roast">{h.poNo}</td>
                    <td className="px-4 py-2.5 text-roast">{h.supplier}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-bean">{h.itemCount}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-roast">{won(h.amount)}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-bean/60">{h.ts}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-bean/60">아직 발송된 발주서가 없습니다. 발주서를 승인 후 발송하면 여기에 기록됩니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-6 text-xs leading-relaxed text-bean/70">
          · 발주수량은 목표재고까지 부족분을 MOQ 단위로 자동 산정한 값이며 직접 수정할 수 있습니다.
          · 금액 한도({won(APPROVAL_LIMIT)}) 초과 건은 빨간색으로 표시되고 발송 시 추가 확인을 거칩니다.
          · 실제 운영에서는 ⑤ 단계가 Apps Script + Gmail 자동 발송으로 연결됩니다.
        </p>
      </div>
    </main>
  );
}

function Kpi({ label, value, unit, money }: { label: string; value: string; unit: string; money?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${money ? "border-mint/40 bg-mint/10" : "border-cream-deep bg-white"}`}>
      <p className="text-xs font-medium text-bean">{label}</p>
      <p className={`mt-1 text-xl font-extrabold tabular-nums sm:text-2xl ${money ? "text-bean" : "text-ink"}`}>{value}</p>
      <p className="text-xs text-bean/60">{unit}</p>
    </div>
  );
}
