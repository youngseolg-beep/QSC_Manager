export type RestaurantType = '본가' | '새마을식당';

export type ScoreOption = {
  label: string;
  val: number;
};

export interface InspectionItem {
  id: string;
  category: '주방' | '홀';
  subCategory: string;
  section: string;
  task: string;
  options: ScoreOption[];
  maxScore: number;
}

export type ScoreRecord = Record<string, number>;

