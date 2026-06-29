// 적정재고 계산 코어 + 샘플 데이터
// 계획서 모듈 ① 적정재고 자동 체크 / ② 발주서 자동 생성의 계산 기준(ROP·안전재고·발주량)을 구현.
// 데이터 원천(위하고·구글시트) 대신 샘플을 쓰며, 실제 연동 시 SAMPLE_ITEMS를 통합 기준 시트로 교체하면 됨.

export type ABC = "A" | "B" | "C";
export type StockStatus = "부족" | "정상" | "과잉";

export interface Item {
  code: string; // 품목코드 (단일 기준 키)
  name: string; // 품목명
  supplier: string; // 공급사
  warehouse: string; // 창고
  location: string; // 적치대(로케이션) 코드
  unit: string; // 단위 (EA/kg/BOX 등)
  unitPrice: number; // 단가(원)
  onHand: number; // 현재고
  avgDailyOut: number; // 일평균 출고량
  leadTimeDays: number; // 리드타임(일)
  safetyStock: number; // 안전재고
  moq: number; // 최소발주수량(MOQ)
  abc: ABC; // ABC 등급
  monthlyIn?: number; // 월 입고수량(구매) — ERP 업로드 시
  monthlyOut?: number; // 월 출고수량 — 수요 산정에 사용
}

// 발주 주기(검토 주기): 적정재고(목표재고) 상한 산정에 사용
export const REVIEW_PERIOD_DAYS = 7;
// 과잉 판정 배수: 목표재고의 N배를 넘으면 과잉
export const OVERSTOCK_FACTOR = 1.5;
// 발주서 1건 금액 한도(원): 초과 시 추가 결재 플래그
export const APPROVAL_LIMIT = 5_000_000;
// ERP 월 데이터에서 일평균출고/안전재고를 직접 산정할 때 쓰는 기준값
export const PERIOD_DAYS = 30; // 월 출고 → 일평균출고 환산
export const LEAD_TIME_DEFAULT = 7; // 리드타임 미지정 시 기본(일)
export const SAFETY_DAYS = 7; // 안전재고 = 일평균출고 × SAFETY_DAYS

// 재주문점(ROP) = 일평균출고 × 리드타임 + 안전재고
export const rop = (it: Item) =>
  Math.round(it.avgDailyOut * it.leadTimeDays + it.safetyStock);

// 목표재고(Order-up-to) = 일평균출고 × (리드타임 + 발주주기) + 안전재고
export const targetStock = (it: Item) =>
  Math.round(it.avgDailyOut * (it.leadTimeDays + REVIEW_PERIOD_DAYS) + it.safetyStock);

// 과잉 상한 = 목표재고 × 배수
export const overstockLevel = (it: Item) =>
  Math.round(targetStock(it) * OVERSTOCK_FACTOR);

// 재고 보유일수 = 현재고 / 일평균출고
export const daysOfStock = (it: Item) =>
  it.avgDailyOut > 0 ? +(it.onHand / it.avgDailyOut).toFixed(1) : Infinity;

export const statusOf = (it: Item): StockStatus => {
  // 적정/안전재고 기준(또는 ROP)이 0인 품목은 판정 근거가 없으므로 '정상'으로 둔다.
  if (rop(it) > 0 && it.onHand <= rop(it)) return "부족";
  if (targetStock(it) > 0 && it.onHand >= overstockLevel(it)) return "과잉";
  return "정상";
};

// 발주 제안 수량: 부족 품목을 목표재고까지 채우되 MOQ 배수로 올림
export const suggestedQty = (it: Item) => {
  if (statusOf(it) !== "부족") return 0;
  const need = targetStock(it) - it.onHand;
  if (need <= 0) return 0;
  const moq = it.moq > 0 ? it.moq : 1;
  return Math.max(1, Math.ceil(need / moq)) * moq;
};

// 발주 제안 금액
export const suggestedAmount = (it: Item) => suggestedQty(it) * it.unitPrice;

// 부족으로 인한 발주 필요 총액
export const totalReorderAmount = (items: Item[]) =>
  items.reduce((s, it) => s + suggestedAmount(it), 0);

export const won = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR");
export const num = (n: number) => Math.round(n).toLocaleString("ko-KR");

// 창고 마스터 (실제 창고별 재고현황 export 기준 · 창고코드/창고명/재고 합계)
export interface WarehouseRec {
  code: string;
  name: string;
  total: number; // 재고 합계(시스템 export 값)
}

export const WAREHOUSE_LIST: WarehouseRec[] = [
  { code: "14", name: "포장(신관1층)", total: 626613.29 },
  { code: "15", name: "MRC팀(신관3층)", total: 5902.3 },
  { code: "16", name: "SD/과립팀(신관1층)", total: 2659.28 },
  { code: "1A", name: "생두창고", total: 205132.3 },
  { code: "1B", name: "외부 원두창고", total: 3756.8 },
  { code: "1C", name: "로스팅실(본관1층)", total: 222.3 },
  { code: "20", name: "임시창고(가상)", total: -2 },
  { code: "2A", name: "추출(본관3층,사일로)", total: 3495.4 },
  { code: "2B", name: "추출(본관2층)", total: 1470 },
  { code: "2C", name: "추출(본관1층)", total: 3180.09 },
  { code: "2D", name: "추출 제품(신관1층 냉장4)", total: 8800 },
  { code: "3C", name: "포장(별관)", total: 526829 },
  { code: "3E", name: "포장 분말 (신관1층)", total: 45121.9 },
  { code: "40", name: "외주창고(보헤미안 박이추)", total: 560 },
  { code: "50", name: "외부창고(에이투지)", total: 7867 },
  { code: "60", name: "농협냉동창고(70평)", total: 109662.5 },
  { code: "A2", name: "브루젠 제품 (본관1층)", total: 13678.6 },
  { code: "B1", name: "신관 PET(신관1층)", total: 290743 },
  { code: "B3", name: "신관 냉장3(신관1층)", total: 7181.85 },
  { code: "B5", name: "신관 2F 허브(신관2층)", total: 5.1 },
  { code: "C1", name: "외부 자재(천막창고)", total: 839969.2 },
  { code: "D1", name: "별관 냉장창고", total: 410 },
  { code: "D2", name: "별관 냉동창고", total: 3947.4 },
  { code: "D3", name: "별관 급냉창고", total: 2913 },
];

// 품목의 창고 선택지(창고명)
export const WAREHOUSES: string[] = WAREHOUSE_LIST.map((w) => w.name);

// ── CSV / 엑셀 가져오기·내보내기 ──
export const CSV_HEADERS = [
  "품목코드", "품목명", "공급사", "창고", "적치대", "단위",
  "단가", "현재고", "일평균출고", "리드타임", "안전재고", "MOQ", "ABC",
];

export function itemsToCsv(items: Item[]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = items.map((i) =>
    [i.code, i.name, i.supplier, i.warehouse, i.location, i.unit, i.unitPrice, i.onHand, i.avgDailyOut, i.leadTimeDays, i.safetyStock, i.moq, i.abc]
      .map(esc)
      .join(","),
  );
  return "﻿" + CSV_HEADERS.join(",") + "\n" + body.join("\n");
}

// 간단한 CSV 파서 (따옴표·콤마·개행 처리)
export function parseCsv(text: string): Record<string, string>[] {
  text = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { cur.push(field); field = ""; }
    else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => {
      const o: Record<string, string> = {};
      header.forEach((h, idx) => (o[h] = (r[idx] ?? "").trim()));
      return o;
    });
}

const ALIAS: Record<string, keyof Item> = {
  품목코드: "code", code: "code",
  품목명: "name", name: "name",
  공급사: "supplier", supplier: "supplier",
  창고: "warehouse", 창고명: "warehouse", warehouse: "warehouse",
  적치대: "location", 로케이션: "location", 창고코드: "location", location: "location",
  단위: "unit", 재고단위: "unit", unit: "unit",
  단가: "unitPrice", unitprice: "unitPrice",
  현재고: "onHand", 재고수량: "onHand", 재고: "onHand", onhand: "onHand",
  일평균출고: "avgDailyOut", avgdailyout: "avgDailyOut",
  리드타임: "leadTimeDays", leadtime: "leadTimeDays", leadtimedays: "leadTimeDays",
  안전재고: "safetyStock", safetystock: "safetyStock",
  입고수량: "monthlyIn", 입고: "monthlyIn",
  출고수량: "monthlyOut", 출고: "monthlyOut",
  moq: "moq",
  abc: "abc",
};

function fieldKey(header: string): keyof Item | null {
  const t = header.trim();
  if (ALIAS[t]) return ALIAS[t];
  const norm = t.toLowerCase().replace(/\(.*?\)/g, "").replace(/\s/g, "");
  return ALIAS[norm] ?? ALIAS[t.replace(/\(.*?\)/g, "").trim()] ?? null;
}

// CSV/엑셀에서 읽은 행 배열 → Item[] (헤더 한글/영문 모두 허용)
export function rowsToItems(rows: Record<string, unknown>[]): Item[] {
  const toNum = (x: unknown) => {
    const v = Number(String(x ?? "").replace(/[, ]/g, ""));
    return isFinite(v) ? v : 0;
  };
  const out: Item[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const o: Partial<Record<keyof Item, unknown>> = {};
    for (const [h, v] of Object.entries(r)) {
      const k = fieldKey(h);
      if (k) o[k] = v;
    }
    const baseCode = String(o.code ?? "").trim();
    if (!baseCode) continue;
    const location = String(o.location ?? "").trim();
    // 같은 품목코드가 여러 창고에 존재할 수 있으므로 키를 고유하게 만든다(코드·창고코드).
    let code = baseCode;
    if (seen.has(code)) {
      code = location ? `${baseCode}·${location}` : `${baseCode}#${out.length}`;
      while (seen.has(code)) code += "_";
    }
    seen.add(code);
    const abcRaw = String(o.abc ?? "").trim().toUpperCase();

    const monthlyIn = toNum(o.monthlyIn);
    const monthlyOut = toNum(o.monthlyOut);
    // 일평균출고: 명시값이 있으면 사용, 없으면 월 출고수량 ÷ 기준일수로 직접 산정.
    const avgDailyOut =
      o.avgDailyOut !== undefined && toNum(o.avgDailyOut) > 0
        ? toNum(o.avgDailyOut)
        : monthlyOut > 0
          ? +(monthlyOut / PERIOD_DAYS).toFixed(2)
          : 0;
    // 리드타임: 명시값 없으면 수요가 있는 품목에 기본 리드타임 적용.
    const givenLead = toNum(o.leadTimeDays);
    const leadTimeDays = givenLead > 0 ? givenLead : avgDailyOut > 0 ? LEAD_TIME_DEFAULT : 0;
    // 안전재고: 명시값(안전재고)이 있으면 사용, 없으면 일평균출고 × SAFETY_DAYS로 직접 산정.
    const safetyStock =
      o.safetyStock !== undefined && String(o.safetyStock).trim() !== ""
        ? toNum(o.safetyStock)
        : Math.round(avgDailyOut * SAFETY_DAYS);

    out.push({
      code,
      name: String(o.name ?? "").trim() || baseCode,
      supplier: String(o.supplier ?? "").trim(),
      warehouse: String(o.warehouse ?? "").trim() || WAREHOUSES[0],
      location,
      unit: String(o.unit ?? "").trim() || "EA",
      unitPrice: toNum(o.unitPrice),
      onHand: toNum(o.onHand),
      avgDailyOut,
      leadTimeDays,
      safetyStock,
      moq: Math.max(1, toNum(o.moq)),
      abc: (["A", "B", "C"].includes(abcRaw) ? abcRaw : "B") as ABC,
      monthlyIn,
      monthlyOut,
    });
  }
  return out;
}

// ── 샘플 통합 기준 시트 (넥스트바이오 콜드브루 생산 기준 예시) ──
export const SAMPLE_ITEMS: Item[] = [
  { code: "GB-001", name: "콜롬비아 수프리모 생두", supplier: "그린빈무역", warehouse: "생두창고", location: "1A-01-01", unit: "kg", unitPrice: 9800, onHand: 1200, avgDailyOut: 80, leadTimeDays: 14, safetyStock: 400, moq: 300, abc: "A" },
  { code: "GB-002", name: "브라질 산토스 생두", supplier: "그린빈무역", warehouse: "생두창고", location: "1A-01-02", unit: "kg", unitPrice: 8200, onHand: 4200, avgDailyOut: 100, leadTimeDays: 12, safetyStock: 500, moq: 300, abc: "A" },
  { code: "GB-003", name: "에티오피아 예가체프 생두", supplier: "그린빈무역", warehouse: "외부 원두창고", location: "1B-02-01", unit: "kg", unitPrice: 13500, onHand: 1100, avgDailyOut: 40, leadTimeDays: 18, safetyStock: 250, moq: 120, abc: "B" },
  { code: "AD-201", name: "액상과당", supplier: "한국당류", warehouse: "외부 자재(천막창고)", location: "C1-03-01", unit: "kg", unitPrice: 1750, onHand: 300, avgDailyOut: 60, leadTimeDays: 6, safetyStock: 200, moq: 100, abc: "B" },
  { code: "PK-101", name: "PET병 500ml", supplier: "한솔패키징", warehouse: "신관 PET(신관1층)", location: "B1-01-01", unit: "EA", unitPrice: 95, onHand: 42000, avgDailyOut: 5000, leadTimeDays: 7, safetyStock: 20000, moq: 10000, abc: "A" },
  { code: "PK-102", name: "병 캡(뚜껑)", supplier: "한솔패키징", warehouse: "신관 PET(신관1층)", location: "B1-01-02", unit: "EA", unitPrice: 38, onHand: 88000, avgDailyOut: 5200, leadTimeDays: 7, safetyStock: 20000, moq: 10000, abc: "A" },
  { code: "PK-103", name: "라벨 스티커", supplier: "대원라벨", warehouse: "포장(별관)", location: "3C-02-01", unit: "EA", unitPrice: 22, onHand: 210000, avgDailyOut: 5000, leadTimeDays: 10, safetyStock: 15000, moq: 20000, abc: "B" },
  { code: "PK-107", name: "HPP용 파우치", supplier: "신성플렉스", warehouse: "신관 PET(신관1층)", location: "B1-03-01", unit: "EA", unitPrice: 120, onHand: 70000, avgDailyOut: 2000, leadTimeDays: 10, safetyStock: 8000, moq: 10000, abc: "B" },
  { code: "PK-104", name: "종이 포장박스", supplier: "동방포장", warehouse: "포장(신관1층)", location: "14-01-01", unit: "EA", unitPrice: 340, onHand: 2800, avgDailyOut: 450, leadTimeDays: 5, safetyStock: 1500, moq: 500, abc: "B" },
  { code: "PK-105", name: "부직포 필터", supplier: "클린필터", warehouse: "외부 자재(천막창고)", location: "C1-01-02", unit: "EA", unitPrice: 14, onHand: 15000, avgDailyOut: 800, leadTimeDays: 9, safetyStock: 3000, moq: 5000, abc: "C" },
  { code: "PK-106", name: "골판지 트레이", supplier: "동방포장", warehouse: "포장(신관1층)", location: "14-02-01", unit: "EA", unitPrice: 180, onHand: 980, avgDailyOut: 300, leadTimeDays: 7, safetyStock: 1000, moq: 200, abc: "C" },
  { code: "PK-108", name: "박스 봉함 테이프", supplier: "동방포장", warehouse: "포장(신관1층)", location: "14-02-02", unit: "EA", unitPrice: 850, onHand: 600, avgDailyOut: 50, leadTimeDays: 4, safetyStock: 150, moq: 100, abc: "C" },
];
