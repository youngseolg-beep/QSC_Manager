import type { InspectionRecord } from '../utils/localDb';

/**
 * Supabase를 다시 연결하기 전까지 직접 입력해서 보관할 초기 점검 데이터입니다.
 *
 * - 새 데이터를 추가한 뒤 localDb.ts의 SEED_VERSION 값을 올리면 기존 브라우저에도 다시 반영됩니다.
 * - 사진/서명은 필요할 경우 data:image/...;base64,... 형식으로 넣을 수 있습니다.
 * - 실제 운영 전 임시 백데이터용이며, 필드명은 기존 inspections 테이블 구조를 유지합니다.
 */
export const HARDCODED_INSPECTIONS: InspectionRecord[] = [
  // 예시
  // {
  //   id: 'manual-20260915-001',
  //   created_at: '2026-09-15T09:00:00+09:00',
  //   inspection_date: '2026-09-15 09:00',
  //   country: '한국 (Korea)',
  //   branch_name: '강남 직영점',
  //   inspector_name: '홍길동 매니저',
  //   kitchen_score: 95,
  //   kitchen_grade: 'A',
  //   hall_score: 92,
  //   hall_grade: 'A',
  //   final_score: 93.5,
  //   final_grade: 'A',
  //   manager_signature: '',
  //   owner_signature: '',
  //   manager_comment: '',
  //   owner_comment: '',
  //   details: {},
  //   evidence_photos: {},
  //   language: 'ko',
  // },
];
