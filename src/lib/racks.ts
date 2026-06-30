// 창고 적치대(랙) · Lot 적재 현황 모델 (모듈 ③: 실시간 재고·Lot)
// 도면 기준: 적치대 폭 = 파렛트(plt) 수 (1385mm=1plt, 2585mm=2plt), 1S바이패스=통로, 기본 4단.
import { parseCsv } from "./inventory";

export const LEVELS = 4; // 적치대 기본 4단
export const PALLET_MM = 1385; // 1 파렛트 폭
export const DOUBLE_MM = 2585; // 2 파렛트 폭

export interface RackProduct {
  code: string;
  name: string;
  unit: string;
  shelfLifeDays: number;
  color: string;
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

// 라인(통로 포함) 레이아웃 — 도면 기준
export type Seg =
  | { kind: "bay"; mm: number; pallets: number }
  | { kind: "aisle"; label: string };

export interface LineDef {
  name: string;
  segs: Seg[];
}

const bay = (mm: number): Seg => ({ kind: "bay", mm, pallets: mm >= DOUBLE_MM ? 2 : 1 });
const aisle = (label = "1S바이패스"): Seg => ({ kind: "aisle", label });

export const LINES: LineDef[] = [
  { name: "A라인", segs: [bay(2585), bay(2585), bay(2585), aisle(), bay(2585), bay(2585), bay(2585), bay(1385)] },
  { name: "B라인", segs: [bay(2585), bay(2585), bay(2585), aisle(), bay(2585), bay(2585), bay(2585), bay(1385)] },
  { name: "C라인", segs: [bay(1385), bay(2585), bay(2585), bay(2585), bay(2585), aisle(), bay(2585), bay(2585), bay(2585), bay(1385)] },
  { name: "D라인", segs: [bay(1385), bay(2585), bay(2585), bay(2585), bay(2585), aisle(), bay(2585), bay(2585), bay(2585), bay(1385)] },
  { name: "E라인", segs: [bay(2585), bay(2585), bay(2585), bay(2585), bay(1385)] },
  { name: "F라인", segs: [bay(2585), bay(2585), bay(2585)] },
];

export interface Slot {
  zone: string; // 라인
  bay: number; // 적치대 번호(라인 내 좌→우, 통로 제외)
  pallet: number; // 파렛트 위치(적치대 내 1~2)
  level: number; // 단 (1~4)
  lotNo: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  inDate: string;
  expiry: string;
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
  LINES.forEach((line, li) => {
    let bayNo = 0;
    line.segs.forEach((seg) => {
      if (seg.kind !== "bay") return;
      bayNo++;
      for (let pallet = 1; pallet <= seg.pallets; pallet++) {
        for (let level = LEVELS; level >= 1; level--) {
          idx++;
          const empty: Slot = { zone: line.name, bay: bayNo, pallet, level, lotNo: "", code: "", name: "", unit: "", qty: 0, inDate: "", expiry: "" };
          if (idx % 10 >= 7) { out.push(empty); continue; }
          const p = RACK_PRODUCTS[(li * 3 + bayNo + pallet + level) % RACK_PRODUCTS.length];
          const inDate = addDays("2026-01-05", (idx * 11) % 175);
          const expiry = addDays(inDate, p.shelfLifeDays);
          const seq = String((idx % 9) + 1).padStart(2, "0");
          const lotNo = `${p.code}-${inDate.replace(/-/g, "").slice(2)}-${seq}`;
          const qty = p.unit === "kg" ? 50 + (idx % 40) * 5 : 1000 + (idx % 50) * 200;
          out.push({ zone: line.name, bay: bayNo, pallet, level, lotNo, code: p.code, name: p.name, unit: p.unit, qty, inDate, expiry });
        }
      }
    });
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

export const expiryColor = (d: number) => {
  if (d <= 0) return "#e53935";
  if (d <= 30) return "#fb8c00";
  if (d <= 90) return "#fdd835";
  return "#66bb6a";
};

export const slotKey = (s: Slot) => `${s.zone}-${s.bay}-${s.pallet}-${s.level}`;

// ── CSV ──
export const SLOT_CSV_HEADERS = ["라인", "적치대", "파렛트", "단", "Lot번호", "품목코드", "품목명", "수량", "단위", "입고일", "유효기간"];

export function slotsToCsv(slots: Slot[]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = slots
    .filter(isOccupied)
    .map((s) => [s.zone, s.bay, s.pallet, s.level, s.lotNo, s.code, s.name, s.qty, s.unit, s.inDate, s.expiry].map(esc).join(","));
  return "﻿" + SLOT_CSV_HEADERS.join(",") + "\n" + body.join("\n");
}

const ALIAS: Record<string, keyof Slot> = {
  라인: "zone", 구역: "zone", 창고: "zone", zone: "zone", line: "zone",
  적치대: "bay", bay: "bay",
  파렛트: "pallet", 팔레트: "pallet", 파레트: "pallet", plt: "pallet", pallet: "pallet",
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
    const b = num(o.bay);
    if (!zone || !b) continue;
    out.push({
      zone,
      bay: b,
      pallet: num(o.pallet) || 1,
      level: num(o.level) || 1,
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
