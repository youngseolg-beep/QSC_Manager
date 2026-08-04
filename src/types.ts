export interface ScoreOption {
  label: string;
  labelEn?: string; // 🔥 labelEn 속성 허용 추가!
  score: number;
}

export interface InspectionItem {
  id: number;
  category: string;
  categoryEn?: string;
  subcategory?: string;
  subcategoryEn?: string;
  title: string;
  titleEn?: string;
  options: ScoreOption[];
  maxScore: number;
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
  details: Record<number, number>;
  evidence_photos?: Record<number, string[]>;
}
