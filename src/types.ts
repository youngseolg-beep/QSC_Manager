export interface ScoreOption {
  label: string;
  score: number;
  [key: string]: any;
}

export interface InspectionItem {
  id: any;
  category: string;
  title: string;
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
  details: any;
  evidence_photos?: any;
}
