// 넥스트바이오 랜딩페이지 콘텐츠
// 원본 사이트(https://nextbio.co.kr)의 내용을 기반으로 정리한 데이터입니다.
// 텍스트/연락처 등은 이 파일만 수정하면 페이지 전체에 반영됩니다.

export const company = {
  nameKo: "넥스트바이오",
  nameEn: "NEXTBIO",
  legalName: "넥스트바이오(주)",
  tagline: "신뢰와 품질로 인정받는 세계 최고의 콜드브루 전문기업",
  mission:
    "건강과 행복을 담은 최상의 제품으로 모든 사람들의 삶의 질을 향상시키고 더 나은 세상을 만들어갑니다.",
  brand: "Brewzen",
};

export const nav: { label: string; href: string }[] = [
  { label: "회사소개", href: "#about" },
  { label: "기술력", href: "#technology" },
  { label: "생산인프라", href: "#infra" },
  { label: "OEM·ODM", href: "#products" },
  { label: "소식", href: "#news" },
  { label: "오시는 길", href: "#contact" },
];

export const heroStats: { value: string; unit: string; label: string }[] = [
  { value: "300", unit: "톤/월", label: "콜드브루 원액 연속 생산" },
  { value: "20", unit: "Brix", label: "고농도 저온 추출 원액" },
  { value: "24", unit: "시간", label: "무중단 자동화 공정" },
  { value: "1,000", unit: "kg/hr", label: "대량 로스팅 처리량" },
];

export const values: { title: string; desc: string }[] = [
  {
    title: "고객중심",
    desc: "고객의 성공이 곧 넥스트바이오의 성공입니다. 파트너의 요구를 가장 먼저 생각합니다.",
  },
  {
    title: "도전과 혁신",
    desc: "끊임없는 연구개발로 콜드브루 제조 공정의 새로운 표준을 만들어 갑니다.",
  },
  {
    title: "신뢰",
    desc: "철저한 품질관리와 위생 시스템으로 언제나 한결같은 품질을 약속합니다.",
  },
];

export const technologies: { tag: string; title: string; desc: string }[] = [
  {
    tag: "Super Drop Process",
    title: "슈퍼 드롭 프로세스",
    desc: "물방울 단위로 정밀하게 제어하는 저온 점적 추출 공정으로, 잡미 없이 깊고 균일한 풍미의 콜드브루 원액을 안정적으로 생산합니다.",
  },
  {
    tag: "Ultra-fine Cold Grinding",
    title: "초미세 저온 분쇄",
    desc: "열 발생을 억제한 저온 환경에서 원두를 초미세 입자로 분쇄해 향미 손실을 최소화하고 추출 효율을 극대화합니다.",
  },
  {
    tag: "HPP",
    title: "HPP 초고압 살균기술",
    desc: "가열 없이 초고압으로 살균하는 비가열(HPP) 공정으로 신선한 맛과 영양을 그대로 보존하면서 안전한 유통기한을 확보합니다.",
  },
];

export const facilities: {
  title: string;
  metric: string;
  desc: string;
}[] = [
  {
    title: "로스팅 플랜트",
    metric: "1,000 kg/hr",
    desc: "시간당 1,000kg 대량 로스팅이 가능한 자동화 설비로 균일한 배전 품질을 구현합니다.",
  },
  {
    title: "저온 고농도 추출",
    metric: "20 Brix · 1일 10톤",
    desc: "20Brix 이상 고농도 커피 원액을 하루 10톤 규모로 안정적으로 추출합니다.",
  },
  {
    title: "자동 포장 시스템",
    metric: "균질화 & 완전 밀봉",
    desc: "균질화 공정과 완전 밀봉 포장으로 신선도와 위생을 끝까지 책임집니다.",
  },
];

export const products: { name: string; desc: string; items: string[] }[] = [
  {
    name: "커피",
    desc: "콜드브루 원액, RTD 커피, 농축액 등 다양한 형태의 커피 제품을 OEM·ODM으로 제조합니다.",
    items: ["콜드브루 원액", "RTD 커피", "커피 농축액"],
  },
  {
    name: "티·허브",
    desc: "저온 추출 기술을 적용한 티·허브 음료로 원물 본연의 향과 맛을 살립니다.",
    items: ["콜드브루 티", "허브 인퓨전", "블렌딩 티"],
  },
  {
    name: "과채주스 및 기타음료",
    desc: "HPP 비가열 살균으로 신선함을 유지한 과채주스와 다양한 기능성 음료를 생산합니다.",
    items: ["NFC 주스", "기능성 음료", "기타 RTD 음료"],
  },
];

export const services: string[] = [
  "OEM (주문자 상표 부착 생산)",
  "ODM (제조업자 개발 생산)",
  "Toll Processing (임가공)",
];

export const news: { date: string; title: string; tag: string }[] = [
  {
    date: "2026.03.18",
    title:
      "넥스트바이오, 두바이 걸푸드 현장에서 'K-커피 기술력'의 미래를 쓰다!",
    tag: "글로벌",
  },
  {
    date: "2026.02.11",
    title: "넥스트바이오, 중소벤처기업진흥공단 연수사업 우수기업 표창 수상",
    tag: "수상",
  },
  {
    date: "2026.02.11",
    title:
      "2025 서울 카페쇼, 브루젠(Brewzen)이 제안한 콜드브루의 새로운 기준!",
    tag: "전시",
  },
];

export const contact = {
  headquarters: {
    label: "본사 · 공장",
    address:
      "강원특별자치도 횡성군 우천면 우천제2농공단지로 65-10 (법주리 725)",
    tel: "033-345-0026",
    fax: "033-345-0027",
  },
  salesOffice: {
    label: "영업사무소",
    address: "서울시 마포구 마포대로 49 (도화동 51-1) 성우빌딩 901·902호",
    tel: "02-711-6003",
  },
  email: "info@nextbio.co.kr",
};

export const languages = ["KR", "EN", "CH"];
