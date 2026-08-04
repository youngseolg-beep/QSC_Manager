import React, { useState, useRef } from 'react';
import { 
  Building2, User, Calendar, CheckCircle2, 
  RotateCcw, Send, ShieldCheck, ChevronRight, Camera, X, RefreshCw, Save, Globe
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

import { CHECKLIST_ITEMS } from './data';
import { supabase } from './utils/supabase';

// 데이터 카테고리별 분리 (홀 / 주방)
const HALL_ITEMS = CHECKLIST_ITEMS.filter(item => item.category === '홀');
const KITCHEN_ITEMS = CHECKLIST_ITEMS.filter(item => item.category === '주방');

export default function App() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [activeTab, setActiveTab] = useState<'hall' | 'kitchen' | 'final'>('hall');
  const [branchName, setBranchName] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [scores, setScores] = useState<Record<string, number>>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [activePhotoModalItem, setActivePhotoModalItem] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const managerSigRef = useRef<any>(null);
  const ownerSigRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEn = lang === 'en';

  // 미체크 항목 식별
  const getUncheckedItems = (items: any[]) => {
    return items.filter(item => scores[item.id] === undefined);
  };

  const isHallComplete = HALL_ITEMS.length > 0 && HALL_ITEMS.every(item => scores[item.id] !== undefined);
  const isKitchenComplete = KITCHEN_ITEMS.length > 0 && KITCHEN_ITEMS.every(item => scores[item.id] !== undefined);

  // 기본 정보 입력 검증
  const validateBasicInfo = () => {
    if (!branchName.trim()) {
      alert(isEn ? '⚠️ Please enter the branch name.' : '⚠️ 지점명을 입력해 주세요.');
      return false;
    }
    if (!inspectorName.trim()) {
      alert(isEn ? '⚠️ Please enter the inspector name.' : '⚠️ 점검자 이름을 입력해 주세요.');
      return false;
    }
    return true;
  };

  // 홀 완료 진행
  const handleHallComplete = () => {
    if (!validateBasicInfo()) return;
    const unchecked = getUncheckedItems(HALL_ITEMS);
    if (unchecked.length > 0) {
      const numbers = unchecked.map((item, idx) => `${idx + 1}`).join(', ');
      alert(isEn 
        ? `⚠️ Unchecked items in Hall inspection.\nItem Nos: [ ${numbers} ]`
        : `⚠️ 홀 점검 미체크 항목이 있습니다.\n미체크 항목 번호: [ ${numbers} ]`
      );
      return;
    }
    setActiveTab('kitchen');
  };

  // 주방 완료 진행
  const handleKitchenComplete = () => {
    if (!validateBasicInfo()) return;
    const unchecked = getUncheckedItems(KITCHEN_ITEMS);
    if (unchecked.length > 0) {
      const numbers = unchecked.map((item, idx) => `${idx + 1}`).join(', ');
      alert(isEn 
        ? `⚠️ Unchecked items in Kitchen inspection.\nItem Nos: [ ${numbers} ]`
        : `⚠️ 주방 점검 미체크 항목이 있습니다.\n미체크 항목 번호: [ ${numbers} ]`
      );
      return;
    }
    setActiveTab('final');
  };

  // 점수 계산 (val이 -1인 '비해당' 옵션은 만점 및 득점에서 제외 계산)
  const calculateScores = () => {
    const calcGroup = (items: any[]) => {
      let totalMax = 0;
      let totalCurrent = 0;

      items.forEach(item => {
        const selectedVal = scores[item.id];
        if (selectedVal !== undefined) {
          if (selectedVal === -1) {
            // 비해당(-) 선택 시 총점에서 제외
          } else {
            totalMax += (item.maxScore || 0);
            totalCurrent += selectedVal;
          }
        } else {
          totalMax += (item.maxScore || 0);
        }
      });

      return totalMax > 0 ? (totalCurrent / totalMax) * 100 : 0;
    };

    const hallScore = calcGroup(HALL_ITEMS);
    const kitchenScore = calcGroup(KITCHEN_ITEMS);
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

  const handleReset = () => {
    if (confirm(isEn ? 'Reset all evaluation content?' : '평가 내용을 전체 초기화하시겠습니까?')) {
      setScores({});
      setPhotos({});
      setBranchName('');
      setInspectorName('');
      if (managerSigRef.current?.clear) managerSigRef.current.clear();
      if (ownerSigRef.current?.clear) ownerSigRef.current.clear();
      setActiveTab('hall');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activePhotoModalItem || !e.target.files) return;
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotos(prev => {
          const current = prev[activePhotoModalItem.id] || [];
          if (current.length >= 3) {
            alert('Max 3 photos allowed.');
            return prev;
          }
          return { ...prev, [activePhotoModalItem.id]: [...current, base64] };
        });
      };
      reader.readAsDataURL(file);
    });
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
        evidence_photos: photos,
        language: lang
      };

      const { error } = await supabase.from('inspections').insert([payload]);
      if (error) throw error;

      alert(isEn ? '🎉 Saved to DB successfully!' : '🎉 성공적으로 Supabase DB에 저장되었습니다!');
      handleReset();
    } catch (err: any) {
      console.error(err);
      alert(`⚠️ Error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Section 및 subCategory 기준으로 항목 그룹화 렌더링
  const renderItemGroups = (items: any[]) => {
    const categories: { [key: string]: { [key: string]: any[] } } = {};
    
    items.forEach(item => {
      const subCat = isEn ? (item.subCategoryEn || item.subCategory) : item.subCategory;
      const sec = isEn ? (item.sectionEn || item.section) : item.section;
      
      if (!categories[subCat]) categories[subCat] = {};
      if (!categories[subCat][sec]) categories[subCat][sec] = [];
      categories[subCat][sec].push(item);
    });

    return Object.entries(categories).map(([subCatName, sections]) => (
      <div key={subCatName} className="mb-6 bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 pb-3 mb-4 border-b border-slate-100 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          {subCatName}
        </h3>

        {Object.entries(sections).map(([secName, itemList]) => {
          return (
            <div key={secName} className="mb-6 last:mb-0">
              <h4 className="text-xs font-bold text-slate-600 mb-3 bg-slate-100 px-3 py-1.5 rounded-md inline-block">
                {secName}
              </h4>

              <div className="space-y-3">
                {itemList.map((item, idx) => {
                  const taskText = isEn ? item.taskEn : item.task;
                  const itemPhotos = photos[item.id] || [];

                  return (
                    <div key={item.id} className="p-3.5 bg-slate-50/60 rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">
                          <span className="font-bold mr-1">{idx + 1}.</span> {taskText}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {/* 평가 옵션 버튼 */}
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                          {item.options.map((opt: any) => {
                            const val = opt.val;
                            const label = isEn ? opt.labelEn : opt.label;
                            const isSelected = scores[item.id] === val;
                            return (
                              <button
                                key={opt.label}
                                onClick={() => setScores(prev => ({ ...prev, [item.id]: val }))}
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                                  isSelected 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {/* 사진 첨부 버튼 */}
                        <button
                          onClick={() => setActivePhotoModalItem(item)}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                            itemPhotos.length > 0 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-600 font-bold' 
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{itemPhotos.length}/3</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              QSC Manager
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* 한/영 토글 버튼 */}
            <button
              onClick={() => setLang(l => l === 'ko' ? 'en' : 'ko')}
              className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-100 transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
              {isEn ? '한국어' : 'English'}
            </button>

            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-sm">
              <Building2 className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder={isEn ? "Branch Name" : "지점명 입력"}
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="bg-transparent border-none outline-none w-28 font-medium placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-sm">
              <User className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder={isEn ? "Inspector Name" : "점검자 이름"}
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
              activeTab === 'hall' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500'
            }`}
          >
            {isEn ? 'Hall Audit' : '홀 점검'} {isHallComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </button>
          <button
            onClick={() => setActiveTab('kitchen')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'kitchen' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500'
            }`}
          >
            {isEn ? 'Kitchen Audit' : '주방 점검'} {isKitchenComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </button>
          <button
            onClick={() => setActiveTab('final')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'final' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500'
            }`}
          >
            {isEn ? 'Final & Signature' : '최종 평가 및 서명'}
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'hall' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">{isEn ? 'Hall Audit Items' : '홀 (Hall) 점검 항목'}</h2>
              <span className="text-xs font-bold px-2 py-1 bg-slate-200 text-slate-600 rounded">WEIGHT 50%</span>
            </div>
            {renderItemGroups(HALL_ITEMS)}
          </div>
        )}

        {activeTab === 'kitchen' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">{isEn ? 'Kitchen Audit Items' : '주방 (Kitchen) 점검 항목'}</h2>
              <span className="text-xs font-bold px-2 py-1 bg-slate-200 text-slate-600 rounded">WEIGHT 50%</span>
            </div>
            {renderItemGroups(KITCHEN_ITEMS)}
          </div>
        )}

        {activeTab === 'final' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs font-semibold text-slate-500">{isEn ? 'Hall Score' : '홀 점수'}</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{calculateScores().hallScore}점</p>
                <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded inline-block mt-1">
                  Grade {calculateScores().hallGrade}
                </span>
              </div>
              <div className="border-x border-slate-100">
                <p className="text-xs font-semibold text-slate-500">{isEn ? 'Kitchen Score' : '주방 점수'}</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{calculateScores().kitchenScore}점</p>
                <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded inline-block mt-1">
                  Grade {calculateScores().kitchenGrade}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">{isEn ? 'Total Score' : '최종 점수'}</p>
                <p className="text-2xl font-black text-blue-600 mt-1">{calculateScores().finalScore}점</p>
                <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded inline-block mt-1">
                  Grade {calculateScores().finalGrade}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-sm font-bold text-slate-700 mb-2">{isEn ? 'Inspector Signature' : '점검자 서명'}</p>
                <div className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                  <SignatureCanvas ref={managerSigRef} penColor="black" canvasProps={{ className: 'w-full h-32' }} />
                </div>
                <button onClick={() => managerSigRef.current?.clear()} className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> {isEn ? 'Clear' : '지우기'}
                </button>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-sm font-bold text-slate-700 mb-2">{isEn ? 'Owner/Manager Signature' : '점주/매니저 서명'}</p>
                <div className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                  <SignatureCanvas ref={ownerSigRef} penColor="black" canvasProps={{ className: 'w-full h-32' }} />
                </div>
                <button onClick={() => ownerSigRef.current?.clear()} className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> {isEn ? 'Clear' : '지우기'}
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-400"
            >
              {isSubmitting 
                ? (isEn ? 'Saving...' : '데이터 저장 중...') 
                : <><Send className="w-5 h-5" /> {isEn ? 'Save to DB & Finish' : 'DB 저장 및 최종 평가 완료'}</>
              }
            </button>
          </div>
        )}
      </main>

      {/* 하단 액션 바 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> DB READY
            </span>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded border border-slate-200"
            >
              <RefreshCw className="w-3 h-3" /> {isEn ? 'Reset' : '평가 초기화'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="hidden sm:flex items-center gap-1 text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-600">
              <Save className="w-3.5 h-3.5" /> {isEn ? 'Temp Save' : '임시 저장'}
            </button>

            {activeTab === 'hall' && (
              <button
                onClick={handleHallComplete}
                className={`px-5 py-2.5 rounded-xl font-bold text-white text-sm shadow flex items-center gap-1.5 transition-all ${
                  isHallComplete ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isHallComplete 
                  ? (isEn ? 'Hall Done (Next)' : '홀 점검 완료 (다음 단계)') 
                  : (isEn ? 'Complete Hall Items' : '홀 점검 항목 완료 필요')}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {activeTab === 'kitchen' && (
              <button
                onClick={handleKitchenComplete}
                className={`px-5 py-2.5 rounded-xl font-bold text-white text-sm shadow flex items-center gap-1.5 transition-all ${
                  isKitchenComplete ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isKitchenComplete 
                  ? (isEn ? 'Kitchen Done (Next)' : '주방 점검 완료 (최종 서명)') 
                  : (isEn ? 'Complete Kitchen Items' : '주방 점검 항목 완료 필요')}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* 사진 모달 */}
      {activePhotoModalItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                {isEn ? 'Photo Upload' : '사진 첨부'} ({isEn ? activePhotoModalItem.taskEn : activePhotoModalItem.task})
              </h3>
              <button onClick={() => setActivePhotoModalItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4">
              <div className="grid grid-cols-3 gap-2 mb-3">
                {(photos[activePhotoModalItem.id] || []).map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                    <img src={img} alt="증빙" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 hover:border-blue-500 hover:text-blue-600 transition-all"
              >
                <Camera className="w-4 h-4" /> {isEn ? 'Take Photo or Choose File' : '사진 직접 촬영 또는 앨범 선택'}
              </button>
            </div>

            <button
              onClick={() => setActivePhotoModalItem(null)}
              className="w-full py-2.5 bg-slate-800 text-white font-bold rounded-xl text-xs"
            >
              {isEn ? 'Close' : '닫기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
