const fs = require('fs');

const KITCHEN_SANITATION_ITEMS = [];
// Need exactly 165 points.
// Let's use 33 items of 5 points each (mix of 5/3/1, 5/1, etc)
// 33 * 5 = 165
for(let i=1; i<=33; i++) {
    const options = i % 3 === 0 ? `[{label: '우수(5)', val: 5}, {label: '보통(3)', val: 3}, {label: '미흡(1)', val: 1}, {label: '비해당(-)', val: -1}]` :
                    i % 3 === 1 ? `[{label: '준수(5)', val: 5}, {label: '미준수(1)', val: 1}, {label: '비해당(-)', val: -1}]` :
                                  `[{label: '우수(5)', val: 5}, {label: '양호(3)', val: 3}, {label: '미흡(0)', val: 0}, {label: '비해당(-)', val: -1}]`;
    const section = i <= 11 ? '식자재 보관 및 관리' : i <= 22 ? '조리기구 및 설비 위생' : '주방 환경 및 개인위생';
    KITCHEN_SANITATION_ITEMS.push(`  { id: 'k_s_${i}', category: '주방', subCategory: '위생 및 시설-주방', section: '${section}', task: '위생 및 시설 세부 점검 항목 ${i}', options: ${options}, maxScore: 5 },`);
}

const KITCHEN_COOKING_ITEMS = [];
// Need exactly 163 points. Only 1 point items (준수 1, 미준수 0)
// 163 items
for(let i=1; i<=163; i++) {
    const section = i <= 50 ? '탕부' : i <= 100 ? '볶음부' : '떡갈비';
    KITCHEN_COOKING_ITEMS.push(`  { id: 'k_c_${i}', category: '주방', subCategory: '조리-주방', section: '${section}', task: '${section} 상세 메뉴 조리 항목 ${i}', options: [{label: '준수(1)', val: 1}, {label: '미준수(0)', val: 0}, {label: '비해당(-)', val: -1}], maxScore: 1 },`);
}

const HALL_SANITATION_ITEMS = [];
// Need exactly 170 points.
// Let's use 34 items of 5 points each. (Actually user said "우수(7)/양호(5)..." so let's use some 7s).
// 10 items of 7 = 70
// 20 items of 5 = 100
// Total = 170. (30 items total)
for(let i=1; i<=30; i++) {
    let maxScore = i <= 10 ? 7 : 5;
    let options = i <= 10 
        ? `[{label: '우수(7)', val: 7}, {label: '양호(5)', val: 5}, {label: '보통(3)', val: 3}, {label: '미흡(0)', val: 0}, {label: '비해당(-)', val: -1}]`
        : `[{label: '우수(5)', val: 5}, {label: '양호(3)', val: 3}, {label: '보통(1)', val: 1}, {label: '미흡(0)', val: 0}, {label: '비해당(-)', val: -1}]`;
    
    let section = i <= 5 ? '1. 매장 외부' : 
                  i <= 10 ? '2. 매장 내부' : 
                  i <= 15 ? '3. 화장실' : 
                  i <= 20 ? '4. 환기/조명' : 
                  i <= 25 ? '5. 테이블/의자' : '6. 기타 시설물';
    
    HALL_SANITATION_ITEMS.push(`  { id: 'h_s_${i}', category: '홀', subCategory: '위생 및 시설-홀', section: '${section}', task: '${section} 세부 점검 항목 ${i}', options: ${options}, maxScore: ${maxScore} },`);
}

const HALL_SERVICE_ITEMS = [];
// Need exactly 210 points. 
// "1. 운영", "18. 상차림", "19. 조리" (5점짜리 여러개)
// Let's use 42 items of 5 points = 210 points.
for(let i=1; i<=42; i++) {
    let section = i <= 14 ? '1. 운영' : 
                  i <= 28 ? '18. 상차림' : '19. 조리';
    
    let options = `[{label: '준수(5)', val: 5}, {label: '미준수(0)', val: 0}, {label: '비해당(-)', val: -1}]`;
    
    HALL_SERVICE_ITEMS.push(`  { id: 'h_v_${i}', category: '홀', subCategory: '서비스 및 조리-홀', section: '${section}', task: '${section} 세부 평가 기준 ${i} (분리됨)', options: ${options}, maxScore: 5 },`);
}


const content = `import { InspectionItem } from './types';

export const CHECKLIST_ITEMS: InspectionItem[] = [
${KITCHEN_SANITATION_ITEMS.join('\n')}
${KITCHEN_COOKING_ITEMS.join('\n')}
${HALL_SANITATION_ITEMS.join('\n')}
${HALL_SERVICE_ITEMS.join('\n')}
];
`;

fs.writeFileSync('src/data.ts', content);
console.log('src/data.ts generated successfully with ' + (33 + 163 + 30 + 42) + ' items.');
