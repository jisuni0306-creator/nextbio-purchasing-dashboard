// 창고 적치대(랙) · Lot 적재 현황 모델 (모듈 ③: 실시간 재고·Lot)
// 적치대 = 구역(라인) × 적치대번호(bay) × 단(level 1~4). 각 칸에 Lot/제품 적재.
import { parseCsv } from "./inventory";

export const LEVELS = 4; // 적치대 기본 4단
export const ZONES = ["A라인", "B라인", "C라인", "D라인"];
export const BAYS_PER_ZONE = 8;

export interface RackProduct {
  code: string;
  name: string;
  unit: string;
  shelfLifeDays: number; // 유효기간(일)
  color: string; // 제품별 색상(맵 시각화)
}

export const RACK_PRODUCTS: RackProduct[] = [
  { code: "GB-001", name: "콜롬비아 생두", unit: "kg", shelfLifeDays: 180, color: "#8d6e63" },
  { code: "GB-002", name: "브라질 생두", unit: "kg", shelfLifeDays: 180, color: "#a1887f" },
  { code: "PK-101", name: "PET병 500ml", unit: "EA", shelfLifeDays: 1095, color: "#4fc3f7" },
  { code: "PK-102", name: "병 캡", unit: "EA", shelfLifeDays: 1095, color: "#4dd0e1" },
  { code: "PK-103", name: "라벨", unit: "EA", shelfLifeDays: 730, color: "#ba68c8" },
  { code: "PK-107", name: "HPP 파우치", unit: "EA", shelfLifeDays: 730, color: "#81c784" },
  { code: "PK-104", name: "종이박스", unit: "EA", shelfLifeDays: 1825, color: "#ffb74d" },
  { code: "AD-201", name: "액상과당", unit: "kg", shelfLifeDays: 240, color: "#f06292" },
];

export interface Slot {
  zone: string;
  bay: number; // 적치대 번호 (1~)
  level: number; // 단 (1~4)
  lotNo: string; // Lot 번호 (빈 칸이면 "")
  code: string;
  name: string;
  unit: string;
  qty: number;
  inDate: string; // 입고일 (YYYY-MM-DD)
  expiry: string; // 유효기간 (YYYY-MM-DD)
}

const addDays = (base: string, n: number) => {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// 결정적(deterministic) 샘플 — SSR/CSR 동일하도록 난수 미사용
export const SAMPLE_SLOTS: Slot[] = (() => {
  const out: Slot[] = [];
  let idx = 0;
  ZONES.forEach((zone, zi) => {
    for (let bay = 1; bay <= BAYS_PER_ZONE; bay++) {
      for (let level = LEVELS; level >= 1; level--) {
        idx++;
        const empty = { zone, bay, level, lotNo: "", code: "", name: "", unit: "", qty: 0, inDate: "", expiry: "" };
        if (idx % 10 >= 7) { out.push(empty); continue; } // ~70% 적재
        const p = RACK_PRODUCTS[(zi * 3 + bay + level) % RACK_PRODUCTS.length];
        const inDate = addDays("2026-01-05", (idx * 11) % 175);
        const expiry = addDays(inDate, p.shelfLifeDays);
        const seq = String((idx % 9) + 1).padStart(2, "0");
        const lotNo = `${p.code}-${inDate.replace(/-/g, "").slice(2)}-${seq}`;
        const qty = p.unit === "kg" ? 50 + (idx % 40) * 5 : 1000 + (idx % 50) * 200;
        out.push({ zone, bay, level, lotNo, code: p.code, name: p.name, unit: p.unit, qty, inDate, expiry });
      }
    }
  });
  return out;
})();

export const isOccupied = (s: Slot) => !!s.lotNo;

export const daysToExpiry = (expiry: string, todayStr: string) => {
  if (!expiry) return Infinity;
  const a = new Date(expiry + "T00:00:00Z").getTime();
  const b = new Date(todayStr + "T00:00:00Z").getTime();
  return Math.round((a - b) / 86400000);
};

export const productColor = (code: string) =>
  RACK_PRODUCTS.find((p) => p.code === code)?.color ?? "#bdbdbd";

// 유효기간 임박 색상(잔여일 기준)
export const expiryColor = (d: number) => {
  if (d <= 0) return "#e53935"; // 만료
  if (d <= 30) return "#fb8c00"; // 임박
  if (d <= 90) return "#fdd835"; // 주의
  return "#66bb6a"; // 양호
};

export const slotKey = (s: Slot) => `${s.zone}-${s.bay}-${s.level}`;

// ── CSV ──
export const SLOT_CSV_HEADERS = ["구역", "적치대", "단", "Lot번호", "품목코드", "품목명", "수량", "단위", "입고일", "유효기간"];

export function slotsToCsv(slots: Slot[]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = slots
    .filter(isOccupied)
    .map((s) => [s.zone, s.bay, s.level, s.lotNo, s.code, s.name, s.qty, s.unit, s.inDate, s.expiry].map(esc).join(","));
  return "﻿" + SLOT_CSV_HEADERS.join(",") + "\n" + body.join("\n");
}

const ALIAS: Record<string, keyof Slot> = {
  구역: "zone", 창고: "zone", 라인: "zone", zone: "zone",
  적치대: "bay", bay: "bay",
  단: "level", 레벨: "level", level: "level",
  lot번호: "lotNo", lot: "lotNo", lotno: "lotNo",
  품목코드: "code", code: "code",
  품목명: "name", name: "name",
  수량: "qty", qty: "qty",
  단위: "unit", unit: "unit",
  입고일: "inDate", indate: "inDate",
  유효기간: "expiry", expiry: "expiry",
};

function fieldKey(h: string): keyof Slot | null {
  const t = h.trim();
  if (ALIAS[t]) return ALIAS[t];
  const n = t.toLowerCase().replace(/\(.*?\)/g, "").replace(/\s/g, "");
  return ALIAS[n] ?? null;
}

export function rowsToSlots(rows: Record<string, unknown>[]): Slot[] {
  const num = (x: unknown) => {
    const v = Number(String(x ?? "").replace(/[, ]/g, ""));
    return isFinite(v) ? v : 0;
  };
  const out: Slot[] = [];
  for (const r of rows) {
    const o: Partial<Record<keyof Slot, unknown>> = {};
    for (const [h, v] of Object.entries(r)) {
      const k = fieldKey(h);
      if (k) o[k] = v;
    }
    const zone = String(o.zone ?? "").trim();
    const bay = num(o.bay);
    const level = num(o.level) || 1;
    if (!zone || !bay) continue;
    out.push({
      zone,
      bay,
      level,
      lotNo: String(o.lotNo ?? "").trim(),
      code: String(o.code ?? "").trim(),
      name: String(o.name ?? "").trim(),
      unit: String(o.unit ?? "").trim() || "EA",
      qty: num(o.qty),
      inDate: String(o.inDate ?? "").trim(),
      expiry: String(o.expiry ?? "").trim(),
    });
  }
  return out;
}

export const parseSlotCsv = (text: string) => rowsToSlots(parseCsv(text));
