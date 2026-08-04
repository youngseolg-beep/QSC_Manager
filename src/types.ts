export interface ScoreOption {
  label: string;
  labelEn?: string;
  score: number;
  val?: number; // 🔥 data.ts에 들어있는 'val' 속성 허용!
  [key: string]: any; // 기타 유연한 데이터 속성 허용
}

export interface InspectionItem {
  id: number | string; // 🔥 문자열 id(ex: "3521")도 받아들일 수 있도록 수정!
  category: string;
  categoryEn?: string;
  subcategory?: string;
  subcategoryEn?: string;
  title: string;
  titleEn?: string;
  options: ScoreOption[];
  maxScore: number;
  [key: string]: any;
}

export interface InspectionResult {
  id?: string;
  created_at?: string;
  language?: string;
  inspection_date: string;
  branch_name: string;
  inspector_name: string;
  kitchen_score: number;
  kitchen_grade: string;
  hall_score: number;
  hall_grade: string;
  final_score: number;
  final_grade: string;
  manager_signature?: string;
  owner_signature?: string;
  details: Record<string | number, number>;
  evidence_photos?: Record<string | number, string[]>;
}
