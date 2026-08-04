import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, User, Calendar, CheckCircle2, AlertCircle, Camera, 
  RotateCcw, Send, ShieldCheck, FileText, ChevronRight, Upload, X 
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { HALL_ITEMS, KITCHEN_ITEMS } from './data';
import { supabase } from './utils/supabase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'hall' | 'kitchen' | 'final'>('hall');
  const [branchName, setBranchName] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  
  // 점검 평가 점수 상태 (itemId: score)
  const [scores, setScores] = useState<Record<number, number>>({});
  
  // 사진 첨부 상태 (itemId: base64 string[])
  const [photos, setPhotos] = useState<Record<number, string[]>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 서명 Canvas Ref
  const managerSigRef = useRef<any>(null);
  const ownerSigRef = useRef<any>(null);

  // ----------------------------------------------------
  // 유효성 검사 관련 함수
  // ----------------------------------------------------

  // 미체크 항목 가져오기
  const getUncheckedItems = (items: typeof HALL_ITEMS) => {
    return items.filter(item => scores[item.id] === undefined);
  };

  // 홀/주방 완료 여부
  const isHallComplete = HALL_ITEMS.every(item => scores[item.id] !== undefined);
  const isKitchenComplete = KITCHEN_ITEMS.every(item => scores[item.id] !== undefined);

  // 기본 정보 입력 체크
  const validateBasicInfo = () => {
    if (!branchName.trim()) {
      alert('⚠️ 지점명을 입력해 주세요.');
      return false;
    }
    if (!inspectorName.trim()) {
      alert('⚠️ 점검자 이름을 입력해 주세요.');
      return false;
    }
    return true;
  };

  // 홀 점검 완료 버튼 클릭 시
  const handleHallComplete = () => {
    if (!validateBasicInfo()) return;

    const unchecked = getUncheckedItems(HALL_ITEMS);
    if (unchecked.length > 0) {
      const uncheckedNumbers = unchecked.map(item => `${item.id}번`).join(', ');
      alert(`⚠️ 홀 점검 미체크 항목이 있습니다.\n미체크 항목: [ ${uncheckedNumbers} ]`);
      return;
    }

    setActiveTab('kitchen');
  };

  // 주방 점검 완료 버튼 클릭 시
  const handleKitchenComplete = () => {
    if (!validateBasicInfo()) return;

    const unchecked = getUncheckedItems(KITCHEN_ITEMS);
    if (unchecked.length > 0) {
      const uncheckedNumbers = unchecked.map(item => `${item.id}번`).join(', ');
      alert(`⚠️ 주방 점검 미체크 항목이 있습니다.\n미체크 항목: [ ${uncheckedNumbers} ]`);
      return;
    }

    setActiveTab('final');
  };

  // ----------------------------------------------------
  // 점수 계산 함수
  // ----------------------------------------------------
  const calculateScores = () => {
    const hallTotalMax = HALL_ITEMS.reduce((acc, item) => acc + item.maxScore, 0);
    const hallCurrent = HALL_ITEMS.reduce((acc, item) => acc + (scores[item.id] || 0), 0);
    const hallScore = hallTotalMax > 0 ? (hallCurrent / hallTotalMax) * 100 : 0;

    const kitchenTotalMax = KITCHEN_ITEMS.reduce((acc, item) => acc + item.maxScore, 0);
    const kitchenCurrent = KITCHEN_ITEMS.reduce((acc, item) => acc + (scores[item.id] || 0), 0);
    const kitchenScore = kitchenTotalMax > 0 ? (kitchenCurrent / kitchenTotalMax) * 100 : 0;

    const finalScore = (hallScore * 0.5) + (kitchenScore * 0.5);

    const getGrade = (score: number) => {
      if (score >= 90) return 'A';
      if (score >= 80) return 'B';
      if (score >= 70) return 'C';
      return 'D';
    };

    return {
      hallScore: Math.round(hallScore * 10) / 10,
      hallGrade: getGrade(hallScore),
      kitchenScore: Math.round(kitchenScore * 10) / 10,
      kitchenGrade: getGrade(kitchenScore),
      finalScore: Math.round(finalScore * 10) / 10,
      finalGrade: getGrade(finalScore)
    };
  };

  // ----------------------------------------------------
  // DB 저장 함수 (에러 수정 완료)
  // ----------------------------------------------------
  const handleSubmit = async () => {
    if (!validateBasicInfo()) return;

    if (!isHallComplete) {
      alert('⚠️ 홀 점검 항목을 모두 완성해 주세요.');
      setActiveTab('hall');
      return;
    }

    if (!isKitchenComplete) {
      alert('⚠️ 주방 점검 항목을 모두 완성해 주세요.');
      setActiveTab('kitchen');
      return;
    }

    setIsSubmitting(true);

    try {
      // 서명 추출 안전 처리 (에러 방지)
      let managerSig = '';
      let ownerSig = '';

      if (managerSigRef.current && !managerSigRef.current.isEmpty()) {
        managerSig = managerSigRef.current.getCanvas().toDataURL('image/png');
      }
      if (ownerSigRef.current && !ownerSigRef.current.isEmpty()) {
        ownerSig = ownerSigRef.current.getCanvas().toDataURL('image/png');
      }

      const calculated = calculateScores();

      const payload = {
        inspection_date: inspectionDate,
        branch_name: branchName,
        inspector_name: inspectorName,
        kitchen_score: calculated.kitchenScore,
        kitchen_grade: calculated.kitchenGrade,
        hall_score: calculated.hallScore,
        hall_grade: calculated.hallGrade,
        final_score: calculated.finalScore,
        final_grade: calculated.finalGrade,
        manager_signature: managerSig,
        owner_signature: ownerSig,
        details: scores,
        evidence_photos: photos
      };

      const { error } = await supabase.from('inspections').insert([payload]);

      if (error) throw error;

      alert('🎉 성공적으로 DB에 저장되었습니다!');
      handleReset();
    } catch (err: any) {
      console.error(err);
      alert(`⚠️ 저장 중 오류가 발생했습니다: ${err.message || '알 수 없는 에러'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setScores({});
    setPhotos({});
    setBranchName('');
    setInspectorName('');
    if (managerSigRef.current) managerSigRef.current.clear();
    if (ownerSigRef.current) ownerSigRef.current.clear();
    setActiveTab('hall');
  };

  // ----------------------------------------------------
  // 화면 레이아웃 및 UI
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* 상단 헤더 및 기본 정보 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              QSC Manager
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-sm">
              <Building2 className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="지점명 입력"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="bg-transparent border-none outline-none w-28 font-medium placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-sm">
              <User className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="점검자 이름"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="bg-transparent border-none outline-none w-24 font-medium placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-sm">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="bg-transparent border-none outline-none font-medium text-slate-600"
              />
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="max-w-7xl mx-auto px-4 flex border-t border-slate-100">
          <button
            onClick={() => setActiveTab('hall')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'hall'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            홀 (Hall) 점검
            {isHallComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </button>
          <button
            onClick={() => setActiveTab('kitchen')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'kitchen'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            주방 (Kitchen) 점검
            {isKitchenComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </button>
          <button
            onClick={() => setActiveTab('final')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'final'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            최종 평가 및 서명
          </button>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 홀 점검 탭 */}
        {activeTab === 'hall' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">홀 (Hall) 점검 항목</h2>
            {HALL_ITEMS.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {item.id}번 항목
                    </span>
                    <p className="font-medium text-slate-800 mt-1">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.options.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => setScores((prev) => ({ ...prev, [item.id]: opt.score }))}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          scores[item.id] === opt.score
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}({opt.score})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* 하단 버튼 (조건부 색상 변경 반영) */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleHallComplete}
                className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                  isHallComplete
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    : 'bg-red-500 hover:bg-red-600 shadow-red-200'
                }`}
              >
                {isHallComplete ? '홀 점검 완료 (다음 단계)' : '홀 점검 항목 완료 필요'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* 주방 점검 탭 */}
        {activeTab === 'kitchen' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">주방 (Kitchen) 점검 항목</h2>
            {KITCHEN_ITEMS.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {item.id}번 항목
                    </span>
                    <p className="font-medium text-slate-800 mt-1">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.options.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => setScores((prev) => ({ ...prev, [item.id]: opt.score }))}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          scores[item.id] === opt.score
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}({opt.score})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* 하단 버튼 (조건부 색상 변경 반영) */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleKitchenComplete}
                className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                  isKitchenComplete
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    : 'bg-red-500 hover:bg-red-600 shadow-red-200'
                }`}
              >
                {isKitchenComplete ? '주방 점검 완료 (최종 서명)' : '주방 점검 항목 완료 필요'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* 최종 평가 및 서명 탭 */}
        {activeTab === 'final' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* 점수 요약 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs font-semibold text-slate-500">홀 점수</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{calculateScores().hallScore}점</p>
                <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded mt-1 inline-block">
                  {calculateScores().hallGrade}등급
                </span>
              </div>
              <div className="border-x border-slate-100">
                <p className="text-xs font-semibold text-slate-500">주방 점수</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{calculateScores().kitchenScore}점</p>
                <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded mt-1 inline-block">
                  {calculateScores().kitchenGrade}등급
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">최종 종합 점수</p>
                <p className="text-2xl font-black text-blue-600 mt-1">{calculateScores().finalScore}점</p>
                <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded mt-1 inline-block">
                  {calculateScores().finalGrade}등급
                </span>
              </div>
            </div>

            {/* 서명란 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-sm font-bold text-slate-700 mb-2">점검자 서명</p>
                <div className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                  <SignatureCanvas
                    ref={managerSigRef}
                    penColor="black"
                    canvasProps={{ className: 'w-full h-32' }}
                  />
                </div>
                <button
                  onClick={() => managerSigRef.current?.clear()}
                  className="mt-2 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> 지우기
                </button>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-sm font-bold text-slate-700 mb-2">점주/매니저 서명</p>
                <div className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                  <SignatureCanvas
                    ref={ownerSigRef}
                    penColor="black"
                    canvasProps={{ className: 'w-full h-32' }}
                  />
                </div>
                <button
                  onClick={() => ownerSigRef.current?.clear()}
                  className="mt-2 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> 지우기
                </button>
              </div>
            </div>

            {/* 제출 버튼 */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:bg-slate-400"
            >
              {isSubmitting ? (
                <>데이터 저장 중...</>
              ) : (
                <>
                  <Send className="w-5 h-5" /> DB 저장 및 최종 평가 완료
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
