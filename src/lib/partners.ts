// 거래처 관리대장 데이터 모델 + 샘플 + CSV 헬퍼
// 자동화 허브(구글시트) → AppSheet 등록 폼과 연동되는 거래처 마스터.
import { parseCsv } from "./inventory";

export type PartnerType = "매입처" | "매출처" | "매입+매출";
export type PartnerStatus = "활성" | "중단";

export const PARTNER_TYPES: PartnerType[] = ["매입처", "매출처", "매입+매출"];
export const PARTNER_STATUSES: PartnerStatus[] = ["활성", "중단"];

export interface Partner {
  code: string; // 거래처코드
  name: string; // 거래처명(상호)
  bizNo: string; // 사업자등록번호
  ceo: string; // 대표자
  type: PartnerType; // 거래유형
  bizType: string; // 업태
  bizItem: string; // 종목
  manager: string; // 담당자
  phone: string; // 전화번호
  email: string; // 이메일
  address: string; // 주소
  payTerm: string; // 결제조건
  status: PartnerStatus; // 거래상태
  note: string; // 비고
}

export const SAMPLE_PARTNERS: Partner[] = [
  { code: "V-001", name: "그린빈무역", bizNo: "214-81-30015", ceo: "김상호", type: "매입처", bizType: "도매", bizItem: "생두 수입", manager: "이수민 과장", phone: "02-512-3344", email: "sales@greenbean.co.kr", address: "서울 강남구 테헤란로 21", payTerm: "월말마감 익월말 현금", status: "활성", note: "생두 주력" },
  { code: "V-002", name: "한솔패키징", bizNo: "128-86-22014", ceo: "박정우", type: "매입처", bizType: "제조", bizItem: "PET용기·캡", manager: "정다은 대리", phone: "031-446-7788", email: "order@hansolpkg.com", address: "경기 안산시 단원구 산단로 99", payTerm: "현금 (발주 시 50% 선금)", status: "활성", note: "PET·캡 공급" },
  { code: "V-003", name: "대원라벨", bizNo: "135-81-44021", ceo: "최민영", type: "매입처", bizType: "제조", bizItem: "라벨 인쇄", manager: "한지훈", phone: "032-678-1212", email: "print@daewonlabel.kr", address: "인천 남동구 고잔로 12", payTerm: "어음 60일", status: "활성", note: "" },
  { code: "V-004", name: "동방포장", bizNo: "117-85-67890", ceo: "오세훈", type: "매입처", bizType: "제조", bizItem: "골판지·포장재", manager: "김포장 차장", phone: "031-333-4545", email: "info@dongbangpack.co.kr", address: "경기 화성시 향남읍 산단로 7", payTerm: "월말마감 익월 15일", status: "활성", note: "박스·트레이·테이프" },
  { code: "V-005", name: "클린필터", bizNo: "220-87-11223", ceo: "유나래", type: "매입처", bizType: "제조", bizItem: "여과·필터", manager: "서지원", phone: "043-221-8080", email: "cs@cleanfilter.co.kr", address: "충북 청주시 흥덕구 산단로 33", payTerm: "현금", status: "중단", note: "단가 협의 중 일시중단" },
  { code: "V-006", name: "한국당류", bizNo: "312-81-55667", ceo: "장원석", type: "매입처", bizType: "제조", bizItem: "당류·시럽", manager: "문가영 대리", phone: "041-555-9090", email: "sales@koreasugar.co.kr", address: "충남 아산시 둔포면 아산밸리로 5", payTerm: "어음 30일", status: "활성", note: "액상과당" },
  { code: "V-007", name: "신성플렉스", bizNo: "129-86-77881", ceo: "배성민", type: "매입처", bizType: "제조", bizItem: "연포장·파우치", manager: "조현우", phone: "031-988-2323", email: "order@sinsungflex.com", address: "경기 김포시 양촌읍 황금로 50", payTerm: "월말마감 익월말", status: "활성", note: "HPP 파우치" },
  { code: "V-008", name: "데뱅양그랜드", bizNo: "119-86-08099", ceo: "한도윤", type: "매입+매출", bizType: "제조·판매", bizItem: "커피 OEM", manager: "양그랜 팀장", phone: "033-345-1100", email: "biz@debgrand.co.kr", address: "강원 횡성군 우천면 양그랜로 8", payTerm: "월말마감 익월말 현금", status: "활성", note: "OEM 콜드브루" },
  { code: "C-001", name: "브루젠리테일", bizNo: "220-88-33445", ceo: "신예린", type: "매출처", bizType: "도소매", bizItem: "음료 유통", manager: "정유통 과장", phone: "02-777-1234", email: "buy@brewzenretail.com", address: "서울 송파구 올림픽로 300", payTerm: "월말마감 익월말", status: "활성", note: "브루젠 제품 납품" },
  { code: "C-002", name: "지에스리테일", bizNo: "229-81-00012", ceo: "허민호", type: "매출처", bizType: "소매", bizItem: "편의점", manager: "MD 김편의", phone: "02-2006-2000", email: "mdteam@gsretail.com", address: "서울 강남구 논현로 508", payTerm: "월 2회 정산", status: "활성", note: "PB 콜드브루" },
];

export const PARTNER_CSV_HEADERS = [
  "거래처코드", "거래처명", "사업자번호", "대표자", "거래유형", "업태", "종목",
  "담당자", "전화번호", "이메일", "주소", "결제조건", "거래상태", "비고",
];

export const partnerToRow = (p: Partner): (string | number)[] => [
  p.code, p.name, p.bizNo, p.ceo, p.type, p.bizType, p.bizItem,
  p.manager, p.phone, p.email, p.address, p.payTerm, p.status, p.note,
];

export function partnersToCsv(items: Partner[]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = items.map((p) => partnerToRow(p).map(esc).join(","));
  return "﻿" + PARTNER_CSV_HEADERS.join(",") + "\n" + body.join("\n");
}

const ALIAS: Record<string, keyof Partner> = {
  거래처코드: "code", code: "code",
  거래처명: "name", 상호: "name", name: "name",
  사업자번호: "bizNo", 사업자등록번호: "bizNo", bizno: "bizNo",
  대표자: "ceo", 대표: "ceo", ceo: "ceo",
  거래유형: "type", type: "type",
  업태: "bizType", biztype: "bizType",
  종목: "bizItem", bizitem: "bizItem",
  담당자: "manager", manager: "manager",
  전화번호: "phone", 전화: "phone", phone: "phone",
  이메일: "email", email: "email",
  주소: "address", address: "address",
  결제조건: "payTerm", payterm: "payTerm",
  거래상태: "status", 상태: "status", status: "status",
  비고: "note", note: "note",
};

function fieldKey(header: string): keyof Partner | null {
  const t = header.trim();
  if (ALIAS[t]) return ALIAS[t];
  const norm = t.toLowerCase().replace(/\(.*?\)/g, "").replace(/\s/g, "");
  return ALIAS[norm] ?? null;
}

export function rowsToPartners(rows: Record<string, unknown>[]): Partner[] {
  const out: Partner[] = [];
  for (const r of rows) {
    const o: Partial<Record<keyof Partner, unknown>> = {};
    for (const [h, v] of Object.entries(r)) {
      const k = fieldKey(h);
      if (k) o[k] = v;
    }
    const code = String(o.code ?? "").trim();
    const name = String(o.name ?? "").trim();
    if (!code && !name) continue;
    const typeRaw = String(o.type ?? "").trim();
    const statusRaw = String(o.status ?? "").trim();
    out.push({
      code: code || name,
      name: name || code,
      bizNo: String(o.bizNo ?? "").trim(),
      ceo: String(o.ceo ?? "").trim(),
      type: (PARTNER_TYPES as string[]).includes(typeRaw) ? (typeRaw as PartnerType) : "매입처",
      bizType: String(o.bizType ?? "").trim(),
      bizItem: String(o.bizItem ?? "").trim(),
      manager: String(o.manager ?? "").trim(),
      phone: String(o.phone ?? "").trim(),
      email: String(o.email ?? "").trim(),
      address: String(o.address ?? "").trim(),
      payTerm: String(o.payTerm ?? "").trim(),
      status: statusRaw === "중단" ? "중단" : "활성",
      note: String(o.note ?? "").trim(),
    });
  }
  return out;
}

// 업로드 파일(CSV/엑셀 행) 파싱 진입점 (CSV는 parseCsv 재사용)
export const parsePartnerCsv = (text: string) => rowsToPartners(parseCsv(text));

// ── 관리 시트(별도 관리 레이어) ──
// 거래처 기본정보는 전산에서 업로드(교체)하고, 아래 관리 항목은 거래처코드 기준으로 별도 보관해
// 전산 데이터를 다시 받아도 유지된다.
export interface PartnerMgmt {
  grade: string; // 관리등급 (S/A/B/C)
  mainDeal: string; // 주거래 (예/아니오)
  ourManager: string; // 자사 담당자
  payNote: string; // 결제/단가 관리 메모
  lastContact: string; // 최근 접촉일 (YYYY-MM-DD)
  mgmtStatus: string; // 관리상태 (정상/주의/검토/중단)
  memo: string; // 관리 메모
}

export const MGMT_GRADES = ["S", "A", "B", "C"];
export const MGMT_STATUSES = ["정상", "주의", "검토", "중단"];

export const EMPTY_MGMT: PartnerMgmt = {
  grade: "", mainDeal: "", ourManager: "", payNote: "", lastContact: "", mgmtStatus: "정상", memo: "",
};

export const MGMT_CSV_HEADERS = [
  "거래처코드", "거래처명", "관리등급", "주거래", "자사담당", "결제/단가메모", "최근접촉일", "관리상태", "메모",
];

export function mgmtToCsv(partners: Partner[], map: Record<string, PartnerMgmt>): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = partners.map((p) => {
    const m = map[p.code] ?? EMPTY_MGMT;
    return [p.code, p.name, m.grade, m.mainDeal, m.ourManager, m.payNote, m.lastContact, m.mgmtStatus, m.memo].map(esc).join(",");
  });
  return "﻿" + MGMT_CSV_HEADERS.join(",") + "\n" + body.join("\n");
}
