import React, { useState, useRef } from 'react';
import { 
  Building2, User, Calendar, CheckCircle2, 
  RotateCcw, Send, ShieldCheck, ChevronRight 
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

// data.ts의 모든 내보내기 객체를 한 번에 가져와서 자동 처리
import * as DataModule from './data';
import { supabase } from './utils/supabase';

// HALL / KITCHEN 아이템 배열 자동 추출 (이름이 달라도 다 찾아냄)
const HALL_ITEMS: any[] = DataModule.HALL_ITEMS || DataModule.hallItems || DataModule.hall_items || DataModule.items || [];
const KITCHEN_ITEMS: any[] = DataModule.KITCHEN_ITEMS || DataModule.kitchenItems || DataModule.kitchen_items || [];

export default function App() {
  const [activeTab, setActiveTab] = useState<'hall' | 'kitchen' | 'final'>('hall');
  const [branchName, setBranchName] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [scores, setScores] = useState<Record<string, number>>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const managerSigRef = useRef<any>(null);
  const ownerSigRef = useRef<any>(null);

  // 미체크 항목 추출
  const getUncheckedItems = (items: any[]) => {
    return items.filter(item => scores[item.id] === undefined);
  };

  const isHallComplete = HALL_ITEMS.length > 0 && HALL_ITEMS.every(item => scores[item.id] !== undefined);
  const isKitchenComplete = KITCHEN_ITEMS.length > 0 && KITCHEN_ITEMS.every(item => scores[item.id] !== undefined);

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

  const handleHallComplete = () => {
    if (!validateBasicInfo()) return;
    const unchecked = getUncheckedItems(HALL_ITEMS);
    if (unchecked.length > 0) {
      const numbers = unchecked.map(item => `${item.id}번`).join(', ');
      alert(`⚠️ 홀 점검 미체크 항목이 있습니다.\n미체크 항목: [ ${numbers} ]`);
      return;
    }
    setActiveTab('kitchen');
  };

  const handleKitchenComplete = () => {
    if (!validateBasicInfo()) return;
    const unchecked = getUncheckedItems(KITCHEN_ITEMS);
    if (unchecked.length > 0) {
      const numbers = unchecked.map(item => `${item.id}번`).join(', ');
      alert(`⚠️ 주방 점검 미체크 항목이 있습니다.\n미체크 항목: [ ${numbers} ]`);
      return;
    }
    setActiveTab('final');
  };

  const calculateScores = () => {
    const hallTotalMax = HALL_ITEMS.reduce((acc, item) => acc + (item.maxScore || 10), 0);
    const hallCurrent = HALL_ITEMS.reduce((acc, item) => acc + (scores[item.id] || 0), 0);
    const hallScore = hallTotalMax > 0 ? (hallCurrent / hallTotalMax) * 100 : 0;

    const kitchenTotalMax = KITCHEN_ITEMS.reduce((acc, item) => acc + (item.maxScore || 10), 0);
    const kitchenCurrent = KITCHEN_ITEMS.reduce((acc, item) => acc + (scores[item.id] || 0), 0);
    const kitchenScore = kitchenTotalMax > 0 ? (kitchenCurrent / kitchenTotalMax) * 100 : 0;

    const finalScore = (hallScore * 0.5) + (kitchenScore * 0.5);

    const getGrade = (s: number) => (s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : 'D');

    return {
      hallScore: Math.round(hallScore * 10) / 10,
      hallGrade: getGrade(hallScore),
      kitchenScore: Math.round(kitchenScore * 10) / 10,
      kitchenGrade: getGrade(kitchenScore),
      finalScore: Math.round(finalScore * 10) / 10,
      finalGrade: getGrade(finalScore)
    };
  };

  const handleSubmit = async () => {
    if (!validateBasicInfo()) return;

    setIsSubmitting(true);

    try {
      let managerSig = '';
      let ownerSig = '';

      if (managerSigRef.current && typeof managerSigRef.current.isEmpty === 'function' && !managerSigRef.current.isEmpty()) {
        managerSig = managerSigRef.current.getCanvas().toDataURL('image/png');
      }
      if (ownerSigRef.current && typeof ownerSigRef.current.isEmpty === 'function' && !ownerSigRef.current.isEmpty()) {
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
      setScores({});
      setPhotos({});
      setBranchName('');
      setInspectorName('');
      if (managerSigRef.current?.clear) managerSigRef.current.clear();
      if (ownerSigRef.current?.clear) ownerSigRef.current.clear();
      setActiveTab('hall');
    } catch (err: any) {
      console.error(err);
      alert(`⚠️ 저장 중 오류: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
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

        <div className="max-w-7xl mx-auto px-4 flex border-t border-slate-100">
          <button
            onClick={() => setActiveTab('hall')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'hall' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500'
            }`}
          >
            홀 점검 {isHallComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </button>
          <button
            onClick={() => setActiveTab('kitchen')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'kitchen' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500'
            }`}
          >
            주방 점검 {isKitchenComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </button>
          <button
            onClick={() => setActiveTab('final')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'final' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500'
            }`}
          >
            최종 평가 및 서명
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'hall' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">홀 (Hall) 점검 항목</h2>
            {HALL_ITEMS.map((item: any) => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {item.id}번 항목
                    </span>
                    <p className="font-medium text-slate-800 mt-1">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(item.options || []).map((opt: any) => (
                      <button
                        key={opt.label}
                        onClick={() => setScores((prev) => ({ ...prev, [item.id]: opt.score ?? opt.val ?? 0 }))}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          scores[item.id] === (opt.score ?? opt.val ?? 0)
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {opt.label}({opt.score ?? opt.val ?? 0})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleHallComplete}
                className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                  isHallComplete ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isHallComplete ? '홀 점검 완료 (다음 단계)' : '홀 점검 항목 완료 필요'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'kitchen' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">주방 (Kitchen) 점검 항목</h2>
            {KITCHEN_ITEMS.map((item: any) => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {item.id}번 항목
                    </span>
                    <p className="font-medium text-slate-800 mt-1">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(item.options || []).map((opt: any) => (
                      <button
                        key={opt.label}
                        onClick={() => setScores((prev) => ({ ...prev, [item.id]: opt.score ?? opt.val ?? 0 }))}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          scores[item.id] === (opt.score ?? opt.val ?? 0)
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {opt.label}({opt.score ?? opt.val ?? 0})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleKitchenComplete}
                className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                  isKitchenComplete ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isKitchenComplete ? '주방 점검 완료 (최종 서명)' : '주방 점검 항목 완료 필요'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'final' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs font-semibold text-slate-500">홀 점수</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{calculateScores().hallScore}점</p>
                <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded inline-block mt-1">
                  {calculateScores().hallGrade}등급
                </span>
              </div>
              <div className="border-x border-slate-100">
                <p className="text-xs font-semibold text-slate-500">주방 점수</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{calculateScores().kitchenScore}점</p>
                <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded inline-block mt-1">
                  {calculateScores().kitchenGrade}등급
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">최종 점수</p>
                <p className="text-2xl font-black text-blue-600 mt-1">{calculateScores().finalScore}점</p>
                <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded inline-block mt-1">
                  {calculateScores().finalGrade}등급
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-sm font-bold text-slate-700 mb-2">점검자 서명</p>
                <div className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                  <SignatureCanvas ref={managerSigRef} penColor="black" canvasProps={{ className: 'w-full h-32' }} />
                </div>
                <button onClick={() => managerSigRef.current?.clear()} className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> 지우기
                </button>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-sm font-bold text-slate-700 mb-2">점주/매니저 서명</p>
                <div className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                  <SignatureCanvas ref={ownerSigRef} penColor="black" canvasProps={{ className: 'w-full h-32' }} />
                </div>
                <button onClick={() => ownerSigRef.current?.clear()} className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> 지우기
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-400"
            >
              {isSubmitting ? '데이터 저장 중...' : <><Send className="w-5 h-5" /> DB 저장 및 최종 평가 완료</>}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
