import { CHECKLIST_ITEMS } from '../data';
import type { InspectionRecord } from '../utils/localDb';

type DemoProfile = 'excellent' | 'good' | 'improvement';

/**
 * 각 문항의 실제 옵션값을 기준으로
 * 포트폴리오 데모용 점검 결과를 자동 생성합니다.
 */
const buildDemoDetails = (profile: DemoProfile): Record<string, number> => {
  const details: Record<string, number> = {};

  CHECKLIST_ITEMS.forEach((item, index) => {
    const validValues = (item.options || [])
      .map((option: any) => option.val)
      .filter((value: number) => value !== -1)
      .sort((a: number, b: number) => b - a);

    if (validValues.length === 0) return;

    const best = validValues[0];
    const second = validValues[1] ?? best;
    const third = validValues[2] ?? second;

    if (profile === 'excellent') {
      // 대부분 최고점, 일부 문항만 한 단계 낮게
      details[item.id] = index % 11 === 0 ? second : best;
      return;
    }

    if (profile === 'good') {
      // 전반적으로 양호하되 일부 개선 항목 포함
      if (index % 9 === 0) {
        details[item.id] = third;
      } else if (index % 4 === 0) {
        details[item.id] = second;
      } else {
        details[item.id] = best;
      }
      return;
    }

    // 개선 필요 점포
    if (index % 7 === 0) {
      details[item.id] = third;
    } else if (index % 3 === 0) {
      details[item.id] = second;
    } else {
      details[item.id] = best;
    }
  });

  return details;
};

/**
 * App.tsx와 동일한 기준으로 점수 및 등급을 계산합니다.
 */
const calculateDemoScores = (details: Record<string, number>) => {
  const calculateGroup = (category: '홀' | '주방') => {
    let totalMax = 0;
    let totalCurrent = 0;

    CHECKLIST_ITEMS
      .filter(item => item.category === category)
      .forEach(item => {
        const selectedValue = details[item.id];

        if (selectedValue === undefined || selectedValue === -1) return;

        totalMax += item.maxScore || 0;
        totalCurrent += selectedValue;
      });

    return totalMax > 0 ? (totalCurrent / totalMax) * 100 : 0;
  };

  const hallScore = calculateGroup('홀');
  const kitchenScore = calculateGroup('주방');
  const finalScore = (hallScore * 0.5) + (kitchenScore * 0.5);

  const getGrade = (score: number) =>
    score >= 90 ? 'A' :
    score >= 80 ? 'B' :
    score >= 70 ? 'C' : 'D';

  return {
    hall_score: Math.round(hallScore * 10) / 10,
    hall_grade: getGrade(hallScore),
    kitchen_score: Math.round(kitchenScore * 10) / 10,
    kitchen_grade: getGrade(kitchenScore),
    final_score: Math.round(finalScore * 10) / 10,
    final_grade: getGrade(finalScore),
  };
};

const excellentDetails = buildDemoDetails('excellent');
const goodDetails = buildDemoDetails('good');
const improvementDetails = buildDemoDetails('improvement');

const excellentScores = calculateDemoScores(excellentDetails);
const goodScores = calculateDemoScores(goodDetails);
const improvementScores = calculateDemoScores(improvementDetails);

/**
 * 포트폴리오 최초 접속 시 기본으로 노출되는 데모 점검 데이터입니다.
 *
 * 실제 사용자가 새로 작성한 점검 결과는 IndexedDB에 별도로 저장되며,
 * 아래 데이터와 함께 보관함에 표시됩니다.
 */
export const HARDCODED_INSPECTIONS: InspectionRecord[] = [
  {
    id: 'demo-seoul-001',
    created_at: '2026-09-12T05:30:00.000Z',
    inspection_date: '2026-09-12 14:30',
    country: '한국 (Korea)',
    branch_name: '강남 데모점',
    inspector_name: '김민지 매니저',

    ...excellentScores,

    manager_signature: '',
    owner_signature: '',
    manager_comment: '전반적인 위생 및 서비스 관리 상태가 우수합니다.',
    owner_comment: '현재 관리 수준을 지속적으로 유지하겠습니다.',

    details: excellentDetails,
    evidence_photos: {},
    language: 'ko',
  },

  {
    id: 'demo-singapore-002',
    created_at: '2026-09-08T02:00:00.000Z',
    inspection_date: '2026-09-08 11:00',
    country: '싱가포르 (Singapore)',
    branch_name: 'Singapore Demo Store',
    inspector_name: '이준호 매니저',

    ...goodScores,

    manager_signature: '',
    owner_signature: '',
    manager_comment: 'Overall operation is stable. Some cleanliness items require follow-up.',
    owner_comment: 'We will review the improvement items with the store team.',

    details: goodDetails,
    evidence_photos: {},
    language: 'en',
  },

  {
    id: 'demo-sydney-003',
    created_at: '2026-09-03T06:20:00.000Z',
    inspection_date: '2026-09-03 15:20',
    country: '호주 (Australia)',
    branch_name: 'Sydney Demo Store',
    inspector_name: '박서연 매니저',

    ...improvementScores,

    manager_signature: '',
    owner_signature: '',
    manager_comment: '주방 및 홀 일부 관리 항목에 개선이 필요하며 재점검을 권장합니다.',
    owner_comment: '지적사항을 확인하여 개선 후 재점검을 요청하겠습니다.',

    details: improvementDetails,
    evidence_photos: {},
    language: 'ko',
  },
];
