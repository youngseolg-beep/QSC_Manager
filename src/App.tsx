import React, { useState, useRef, useEffect } from 'react';
import { Download, Database, Globe, RefreshCw, Camera, X, ArrowRight } from 'lucide-react';
import { CHECKLIST_ITEMS } from './data';
import { ScoreRecord } from './types';
import SignaturePad, { SignaturePadHandle } from './components/SignaturePad';
import { exportToPDF } from './utils/pdf';

const getGrade = (score: number, hasZeroPoint: boolean = false) => {
  if (hasZeroPoint || score < 70) return 'D';
  if (score >= 95) return 'S';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  return 'C';
};

const T = {
  ko: {
    appTitle: 'QSC MANAGER',
    appDesc: 'Store Inspection System',
    branch: '지점',
    inspector: '점검자',
    branchPlaceholder: '지점명 입력',
    inspectorPlaceholder: '점검자 이름',
    tabHall: '홀 (Hall) 점검',
    tabKitchen: '주방 (Kitchen) 점검',
    tabFinal: '최종 평가 및 서명',
    weight: 'WEIGHT 50%',
    reportTitleHall: '점검 결과표_홀',
    reportTitleKitchen: '점검 결과표_주방',
    reportTitleFinal: '점검 결과표_최종',
    colItem: '평가 항목',
    colScore: '획득 점수',
    colMax: '총점',
    colDiv: '구분',
    colHallResult: '홀 점검 결과',
    colKitchenResult: '주방 점검 결과',
    lblSanitation: '위생 및 시설',
    lblService: '서비스 및 조리',
    lblCooking: '조리',
    lblHallFinal: '홀 최종 점수',
    lblKitchenFinal: '주방 최종 점수',
    lblBase100: '(100점 기준)',
    lblFinal: '최종 결과',
    lblSubtotal: '소계',
    evidenceTitle: '현장 점검 특이사항 및 사진 근거',
    signTitle: '최종 확인 및 서명',
    signManager: '더본코리아 담당자',
    signOwner: 'OWNER',
    btnNextToKitchen: '홀 점검 완료',
    btnNextToFinal: '주방 점검 완료',
    btnTempSave: '임시 저장',
    btnSend: 'DB 저장 및 최종 평가 완료',
    btnExport: 'EXPORT PDF',
    btnReset: '평가 초기화',
    alertBranch: '지점명을 입력해주세요.',
    alertInspector: '점검자 이름을 입력해주세요.',
    alertDate: '점검 날짜를 선택해주세요.',
    alertSignTab: '최종 평가 탭에서 서명을 완료한 후 저장해주세요.',
    alertSignReq: '모든 서명란에 서명이 필요합니다.',
    alertSuccess: '데이터가 Supabase에 성공적으로 저장되었습니다.',
    alertResetConfirm: '입력된 모든 평가 점수와 사진, 서명이 초기화됩니다. 계속하시겠습니까?',
    alertPhotoLimit: '사진은 각 항목당 최대 3장까지만 첨부할 수 있습니다.',
    toastAutoSave: '데이터가 임시 저장되었습니다.',
  },
  en: {
    appTitle: 'QSC MANAGER',
    appDesc: 'Store Inspection System',
    branch: 'Branch',
    inspector: 'Inspector',
    branchPlaceholder: 'Enter branch name',
    inspectorPlaceholder: 'Inspector name',
    tabHall: 'Hall Inspection',
    tabKitchen: 'Kitchen Inspection',
    tabFinal: 'Final Evaluation',
    weight: 'WEIGHT 50%',
    reportTitleHall: 'Hall Result Summary',
    reportTitleKitchen: 'Kitchen Result Summary',
    reportTitleFinal: 'Final Inspection Report',
    colItem: 'Category',
    colScore: 'Acquired',
    colMax: 'Total',
    colDiv: 'Div',
    colHallResult: 'Hall Result',
    colKitchenResult: 'Kitchen Result',
    lblSanitation: 'Hygiene & Facilities',
    lblService: 'Service & Cooking',
    lblCooking: 'Cooking',
    lblHallFinal: 'Hall Final Score',
    lblKitchenFinal: 'Kitchen Final Score',
    lblBase100: '(Base 100)',
    lblFinal: 'FINAL SCORE',
    lblSubtotal: 'Subtotal',
    evidenceTitle: 'Inspection Evidence & Photos',
    signTitle: 'Confirmation & Signature',
    signManager: 'Theborn Korea Manager',
    signOwner: 'OWNER',
    btnNextToKitchen: 'Complete Hall',
    btnNextToFinal: 'Complete Kitchen',
    btnTempSave: 'Save Draft',
    btnSend: 'Save to DB & Finalize',
    btnExport: 'EXPORT PDF',
    btnReset: 'Reset',
    alertBranch: 'Please enter the branch name.',
    alertInspector: 'Please enter the inspector name.',
    alertDate: 'Please select an inspection date.',
    alertSignTab: 'Please complete signatures in the Final Evaluation tab.',
    alertSignReq: 'Signatures are required in all fields.',
    alertSuccess: 'Data successfully saved to Supabase.',
    alertResetConfirm: 'All scores, photos, and signatures will be cleared. Continue?',
    alertPhotoLimit: 'You can attach up to 3 photos per item.',
    toastAutoSave: 'Draft saved locally.',
  }
};

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
    };
  });
};

export default function App() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [branch, setBranch] = useState('');
  const [inspector, setInspector] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [scores, setScores] = useState<ScoreRecord>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({}); 
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'홀' | '주방' | '최종'>('홀');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);

  const managerSigRef = useRef<SignaturePadHandle>(null);
  const ownerSigRef = useRef<SignaturePadHandle>(null);

  const t = T[lang];

  // 1. 실수로 창 닫기 방지 (새로고침/뒤로가기 경고)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 폼에 데이터가 조금이라도 입력되어 있다면 경고창 띄우기
      if (branch || inspector || Object.keys(scores).length > 0) {
        e.preventDefault();
        e.returnValue = ''; // 크롬 등에서 기본 경고창을 띄우는 표준 방식
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [branch, inspector, scores]);

  // 2. 로컬 스토리지 데이터 복구 (초기 로드 시)
  useEffect(() => {
    const saved = localStorage.getItem('qsc_autosave');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.branch) setBranch(parsed.branch);
        if (parsed.inspector) setInspector(parsed.inspector);
        if (parsed.date) setDate(parsed.date);
        if (parsed.scores) setScores(parsed.scores);
      } catch (e) {
        console.error('Failed to parse autosave data');
      }
    }
  }, []);

  // 3. 텍스트 및 점수 변경 시 실시간 로컬 자동 저장
  useEffect(() => {
    const dataToSave = { branch, inspector, date, scores };
    localStorage.setItem('qsc_autosave', JSON.stringify(dataToSave));
  }, [branch, inspector, date, scores]);


  const getSubScore = (category: string, subCategory: string) => {
    const items = CHECKLIST_ITEMS.filter(i => i.category === category && i.subCategory === subCategory);
    let score = 0;
    let max = 0;
    items.forEach(i => {
      const val = scores[i.id];
      if (val !== undefined && val >= 0) {
        score += val;
        max += i.maxScore;
      } else if (val === -1) {
        // 비해당
      } else {
        max += i.maxScore;
      }
    });
    return { score, max };
  };

  const hallSanitation = getSubScore('홀', '위생 및 시설-홀');
  const hallService = getSubScore('홀', '서비스 및 조리-홀');
  const kitchenSanitation = getSubScore('주방', '위생 및 시설-주방');
  const kitchenCooking = getSubScore('주방', '조리-주방');

  const hallTotalScore = hallSanitation.score + hallService.score;
  const hallTotalMax = hallSanitation.max + hallService.max;
  const hallConverted = hallTotalMax > 0 ? (hallTotalScore / hallTotalMax) * 100 : 0;

  const kitchenTotalScore = kitchenSanitation.score + kitchenCooking.score;
  const kitchenTotalMax = kitchenSanitation.max + kitchenCooking.max;
  const kitchenConverted = kitchenTotalMax > 0 ? (kitchenTotalScore / kitchenTotalMax) * 100 : 0;

  const hallHasZero = CHECKLIST_ITEMS.filter(i => i.category === '홀').some(i => scores[i.id] === 0);
  const kitchenHasZero = CHECKLIST_ITEMS.filter(i => i.category === '주방').some(i => scores[i.id] === 0);
  const finalHasZero = hallHasZero || kitchenHasZero;

  const finalConverted = (hallConverted + kitchenConverted) / 2;
  const hallGrade = getGrade(hallConverted, hallHasZero);
  const kitchenGrade = getGrade(kitchenConverted, kitchenHasZero);
  const finalGrade = getGrade(finalConverted, finalHasZero);

  const handleScoreChange = (id: string, value: number) => {
    setScores(prev => ({ ...prev, [id]: value }));
  };

  const handleReset = () => {
    if (window.confirm(t.alertResetConfirm)) {
      setScores({});
      setPhotos({});
      setBranch('');
      setInspector('');
      managerSigRef.current?.clear();
      ownerSigRef.current?.clear();
      localStorage.removeItem('qsc_autosave');
      setActiveTab('홀');
    }
  };

  // 임시 저장 (수동)
  const handleTempSave = () => {
    const dataToSave = { branch, inspector, date, scores };
    localStorage.setItem('qsc_autosave', JSON.stringify(dataToSave));
    alert(t.toastAutoSave);
  };

  const triggerPhotoUpload = (id: string) => {
    const currentCount = photos[id]?.length || 0;
    if (currentCount >= 3) {
      alert(t.alertPhotoLimit);
      return;
    }
    setActivePhotoId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activePhotoId) return;
    const files = Array.from(e.target.files || []);
    const currentCount = photos[activePhotoId]?.length || 0;
    
    const allowedFiles = files.slice(0, 3 - currentCount);
    const compressedUrls = await Promise.all(allowedFiles.map(file => compressImage(file)));
    
    setPhotos(prev => ({
      ...prev,
      [activePhotoId]: [...(prev[activePhotoId] || []), ...compressedUrls]
    }));
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    setActivePhotoId(null);
  };

  const handleRemovePhoto = (id: string, index: number) => {
    setPhotos(prev => {
      const updated = [...(prev[id] || [])];
      updated.splice(index, 1);
      if (updated.length === 0) {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      }
      return { ...prev, [id]: updated };
    });
  };

  const handleExportPDF = async () => {
    setIsGeneratingPdf(true);
    const fileName = `QSC_${branch || 'Unknown'}_${date}.pdf`;
    const success = await exportToPDF('checklist-container', fileName);
    setIsGeneratingPdf(false);
    if (!success) alert('PDF Export Failed.');
  };

  // 최종 제출 검증 로직 추가
  const handleSendToSupabase = async () => {
    if (!branch.trim()) return alert(t.alertBranch);
    if (!inspector.trim()) return alert(t.alertInspector);
    if (!date) return alert(t.alertDate);
    
    if (managerSigRef.current?.isEmpty() || ownerSigRef.current?.isEmpty()) {
      return alert(t.alertSignReq);
    }
    
    setIsSubmitting(true);
    
    const payload = {
      language: lang,
      date,
      branch_name: branch,
      inspector_name: inspector,
      kitchen_score: Number(kitchenConverted.toFixed(1)),
      kitchen_grade: kitchenGrade,
      hall_score: Number(hallConverted.toFixed(1)),
      hall_grade: hallGrade,
      final_score: Number(finalConverted.toFixed(1)),
      final_grade: finalGrade,
      manager_signature: managerSigRef.current?.getDataURL() || null,
      owner_signature: ownerSigRef.current?.getDataURL() || null,
      details: scores,
      evidence_photos: photos 
    };
    
    console.log('Sending to Supabase...', payload);
    
    setTimeout(() => {
      alert(t.alertSuccess);
      localStorage.removeItem('qsc_autosave'); // 성공 시 임시저장 삭제
      setIsSubmitting(false);
    }, 800);
  };

  const renderSection = (category: '주방' | '홀') => {
    const items = CHECKLIST_ITEMS.filter(i => i.category === category);
    const subCategories = Array.from(new Set(items.map(i => i.subCategory)));
    const isHall = category === '홀';
    
    let itemCounter = 1;

    return (
      <section className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2 md:pb-3 mb-2 md:mb-4">
          <h3 className="text-[15px] md:text-[16px] font-bold text-[#0F172A]">
            {isHall ? t.tabHall : t.tabKitchen}
          </h3>
          <span className="text-[10px] text-[#475569] bg-[#F1F2F4] px-2 py-1 rounded-[4px] font-bold">
            {t.weight}
          </span>
        </div>
        
        <div className="flex flex-col gap-4 md:gap-5">
          {subCategories.map((sub) => {
            const subItems = items.filter(i => i.subCategory === sub);
            const subEn = (subItems[0] as any).subCategoryEn;
            const displaySub = lang === 'en' && subEn ? subEn : sub;
            const sections = Array.from(new Set(subItems.map(i => i.section)));
            
            return (
              <div key={sub} className="bg-white border border-[#E5E7EB] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.025)] overflow-hidden">
                <div className="bg-[#FBFBFC] p-3 text-[13px] font-bold border-b border-[#E5E7EB] text-[#0F172A]">
                  {displaySub}
                </div>
                
                {sections.map((sectionName, secIdx) => {
                  const sectionItems = subItems.filter(i => i.section === sectionName);
                  const sectionEn = (sectionItems[0] as any).sectionEn;
                  const displaySection = lang === 'en' && sectionEn ? sectionEn : sectionName;

                  const sectionScore = sectionItems.reduce((acc, item) => {
                    const val = scores[item.id];
                    return (val !== undefined && val >= 0) ? acc + val : acc;
                  }, 0);
                  
                  const sectionMax = sectionItems.reduce((acc, item) => {
                    const val = scores[item.id];
                    return val === -1 ? acc : acc + item.maxScore;
                  }, 0);

                  return (
                    <div key={sectionName} className={`${secIdx > 0 ? 'border-t border-[#E5E7EB]' : ''}`}>
                      <div className="bg-[#FBFBFC] px-3 md:px-4 py-2 text-[11px] font-bold text-[#94A3B8] uppercase border-b border-[#F1F2F4]">
                        {displaySection}
                      </div>
                      <table className="w-full text-[11px] md:text-[12px] border-collapse">
                        <tbody>
                          {sectionItems.map((item, itemIdx, arr) => {
                            const currentNum = itemCounter++;
                            const itemPhotos = photos[item.id] || [];

                            return (
                              <tr key={item.id} className={itemIdx < arr.length - 1 ? 'border-b border-[#F1F2F4]' : ''}>
                                <td className="p-3 md:p-4 align-top w-[45%] md:w-1/2">
                                  <div className="flex flex-col gap-2">
                                    <span className="text-[#475569] font-medium leading-snug">
                                      <span className="text-[#94A3B8] font-bold mr-1.5">{currentNum}.</span>
                                      {lang === 'en' && (item as any).taskEn ? (item as any).taskEn : item.task}
                                    </span>
                                    
                                    {itemPhotos.length > 0 && (
                                      <div className="flex gap-2 mt-1">
                                        {itemPhotos.map((url, pIdx) => (
                                          <div key={pIdx} className="relative w-10 h-10 md:w-12 md:h-12 border border-[#E5E7EB] rounded-[4px] overflow-hidden group">
                                            <img src={url} alt="evidence" className="w-full h-full object-cover" />
                                            <button 
                                              onClick={() => handleRemovePhoto(item.id, pIdx)}
                                              className="absolute top-0 right-0 bg-red-500/80 text-white w-4 h-4 flex items-center justify-center rounded-bl-[4px]"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                
                                <td className="p-2 md:p-4 w-[55%] md:w-1/2 text-right align-top">
                                  <div className="flex flex-col items-end gap-2">
                                    <div className="flex justify-end gap-1.5 flex-wrap">
                                      {item.options.map(opt => {
                                        const isSelected = scores[item.id] === opt.val;
                                        const isNA = opt.val === -1;
                                        const btnClass = isSelected
                                          ? isNA 
                                            ? 'bg-[#94A3B8] text-white border-[#94A3B8]' 
                                            : 'bg-[#2563EB] text-white border-[#2563EB]'
                                          : 'bg-white border-[#E5E7EB] text-[#475569] hover:bg-[#F5F6F8]';
                                          
                                        return (
                                          <button
                                            key={opt.val}
                                            onClick={() => handleScoreChange(item.id, opt.val)}
                                            className={`px-2.5 md:px-3 py-1.5 rounded-[6px] text-[10px] md:text-[11px] font-medium border transition-colors ${btnClass}`}
                                          >
                                            {lang === 'en' && (opt as any).labelEn ? (opt as any).labelEn : opt.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <button
                                      onClick={() => triggerPhotoUpload(item.id)}
                                      className="flex items-center gap-1 text-[10px] md:text-[11px] font-bold text-[#64748B] hover:text-[#2563EB] border border-[#E5E7EB] bg-[#FBFBFC] px-2 py-1 rounded-[4px] transition-colors"
                                    >
                                      <Camera className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                      {itemPhotos.length}/3
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      
                      <div className="bg-[#F5F6F8] px-3 md:px-4 py-2 flex justify-end items-center border-t border-[#F1F2F4]">
                        <span className="text-[10px] text-[#94A3B8] font-bold mr-2 uppercase">{t.lblSubtotal}</span>
                        <span className="text-[12px] md:text-[13px] font-mono font-bold text-[#0F172A]">
                          {sectionScore} <span className="text-[#94A3B8] font-normal">/ {sectionMax}</span>
                        </span>
                      </div>
                      
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  // 조건부 하단 버튼 렌더링
  const renderFooterButtons = () => {
    if (activeTab === '홀') {
      return (
        <button
          onClick={() => setActiveTab('주방')}
          className="px-4 md:px-6 py-1.5 md:py-2 bg-[#2563EB] text-white rounded-[6px] md:rounded-[8px] text-[11px] md:text-[12px] font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.025)]"
        >
          {t.btnNextToKitchen} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      );
    }
    if (activeTab === '주방') {
      return (
        <button
          onClick={() => setActiveTab('최종')}
          className="px-4 md:px-6 py-1.5 md:py-2 bg-[#20A66B] text-white rounded-[6px] md:rounded-[8px] text-[11px] md:text-[12px] font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.025)]"
        >
          {t.btnNextToFinal} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      );
    }
    return (
      <button
        onClick={handleSendToSupabase}
        disabled={isSubmitting}
        className="px-4 md:px-6 py-1.5 md:py-2 bg-[#0F172A] text-white rounded-[6px] md:rounded-[8px] text-[11px] md:text-[12px] font-bold hover:bg-black transition-colors flex items-center justify-center gap-1.5 md:gap-2 shadow-[0_1px_2px_rgba(15,23,42,0.025)] disabled:opacity-70"
      >
        {isSubmitting ? (
           <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Database className="w-3.5 h-3.5 md:w-4 md:h-4" />
        )}
        {t.btnSend}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] font-sans text-[#0F172A] bg-[#F5F6F8] overflow-hidden">
      
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        multiple 
        capture="environment"
        className="hidden" 
        onChange={handleFileChange} 
      />

      {/* Top Language Toggle Bar */}
      <div className="bg-white border-b border-[#E5E7EB] py-2 px-4 md:px-6 flex justify-end items-center gap-3 text-[11px] font-bold text-[#475569] shrink-0 z-20">
        <Globe className="w-3.5 h-3.5" />
        <button onClick={() => setLang('ko')} className={`transition-colors ${lang === 'ko' ? 'text-[#2563EB]' : 'hover:text-[#0F172A]'}`}>KOR</button>
        <span className="text-[#E5E7EB]">|</span>
        <button onClick={() => setLang('en')} className={`transition-colors ${lang === 'en' ? 'text-[#2563EB]' : 'hover:text-[#0F172A]'}`}>ENG</button>
      </div>

      <div id="checklist-container" className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-full md:w-[260px] bg-white border-r border-b md:border-b-0 border-[#E5E7EB] flex flex-col p-4 md:p-6 shrink-0 z-10 shadow-[0_1px_2px_rgba(15,23,42,0.025)] overflow-y-auto max-h-[30vh] md:max-h-none">
          <div className="mb-4 md:mb-8 flex md:block justify-between items-center">
            <div>
              <h1 className="text-[18px] md:text-[20px] font-bold tracking-tight text-[#0F172A]">{t.appTitle}</h1>
              <p className="text-[10px] md:text-[11px] text-[#94A3B8] mt-0.5 md:mt-1">{t.appDesc}</p>
            </div>
          </div>
          
          <div className="space-y-4 md:space-y-8 flex-1">
            <section className="hidden md:block">
              <label className="text-[10px] font-bold uppercase text-[#94A3B8] mb-2 block">Information</label>
              <div className="bg-[#FBFBFC] rounded-[12px] p-3 border border-[#F1F2F4]">
                <div className="text-[12px] font-bold mb-1 text-[#0F172A] truncate">{branch || t.branchPlaceholder}</div>
                <div className="text-[11px] text-[#475569] truncate">{inspector || t.inspectorPlaceholder}</div>
                <div className="text-[10px] text-[#94A3B8] mt-1.5">{date}</div>
              </div>
            </section>

            <section>
              <label className="text-[10px] font-bold uppercase text-[#94A3B8] mb-2 md:mb-3 block hidden md:block">Score Summary</label>
              <div className="flex md:flex-col gap-4 md:gap-4 items-center md:items-stretch">
                <div className="flex-1 md:w-full">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] md:text-[11px] text-[#475569]">Hall</span>
                    <span className="text-[11px] md:text-[12px] font-medium text-[#0F172A]">{hallConverted.toFixed(1)}</span>
                  </div>
                  <div className="w-full bg-[#E5E7EB] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#2563EB] h-full transition-all duration-500" style={{ width: `${hallConverted}%` }}></div>
                  </div>
                </div>
                
                <div className="flex-1 md:w-full">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] md:text-[11px] text-[#475569]">Kitchen</span>
                    <span className="text-[11px] md:text-[12px] font-medium text-[#0F172A]">{kitchenConverted.toFixed(1)}</span>
                  </div>
                  <div className="w-full bg-[#E5E7EB] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#20A66B] h-full transition-all duration-500" style={{ width: `${kitchenConverted}%` }}></div>
                  </div>
                </div>
                
                <div className="md:mt-4 md:pt-4 md:border-t border-[#F1F2F4] text-right md:text-center w-[80px] md:w-auto shrink-0">
                  <div className="text-[9px] md:text-[10px] font-bold text-[#94A3B8] mb-0.5 md:mb-1">{t.lblFinal}</div>
                  <div className={`text-[16px] md:text-[24px] font-bold leading-none ${finalGrade === 'D' ? 'text-[#E85B5B]' : 'text-[#0F172A]'}`}>
                    {finalConverted.toFixed(1)}<span className="text-[12px] md:text-[16px]">%</span>
                  </div>
                  <div className={`inline-block mt-1 md:mt-2 px-2 py-0.5 md:px-3 md:py-1 border rounded-[4px] md:rounded-[6px] text-[9px] md:text-[11px] font-bold ${
                    finalGrade === 'D' ? 'bg-[#FEE2E2] border-[#FCA5A5] text-[#B91C1C]' : 'bg-[#F5F6F8] border-[#E5E7EB] text-[#475569]'
                  }`}>
                    {finalGrade}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="hidden md:block mt-6 pt-4 border-t border-[#E5E7EB]">
            <button
              onClick={handleExportPDF}
              disabled={isGeneratingPdf}
              className="w-full bg-white border border-[#E5E7EB] text-[#475569] font-medium py-2 rounded-[8px] text-[11px] hover:bg-[#F5F6F8] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                 <div className="w-3.5 h-3.5 border-2 border-[#94A3B8] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {t.btnExport}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F5F6F8]">
          <header className="bg-white border-b border-[#E5E7EB] flex items-center px-4 md:px-6 h-12 md:h-14 shrink-0 shadow-[0_1px_2px_rgba(15,23,42,0.025)]">
            <div className="flex items-center gap-2 md:gap-4 text-[11px] md:text-[12px] w-full">
              <div className="flex items-center flex-1 md:w-[180px] md:flex-none">
                <span className="hidden md:inline font-bold text-[#94A3B8] uppercase text-[10px] w-12">{t.branch}</span>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder={t.branchPlaceholder}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[6px] md:rounded-[8px] px-2.5 py-1 md:py-1.5 text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-[0_1px_2px_rgba(15,23,42,0.025)]"
                />
              </div>
              <div className="flex items-center flex-1 md:w-[180px] md:flex-none">
                <span className="hidden md:inline font-bold text-[#94A3B8] uppercase text-[10px] w-14">{t.inspector}</span>
                <input
                  type="text"
                  value={inspector}
                  onChange={(e) => setInspector(e.target.value)}
                  placeholder={t.inspectorPlaceholder}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[6px] md:rounded-[8px] px-2.5 py-1 md:py-1.5 text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-[0_1px_2px_rgba(15,23,42,0.025)]"
                />
              </div>
              <div className="ml-auto shrink-0 w-[100px] md:w-[130px]">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[6px] md:rounded-[8px] px-2 py-1 md:py-1.5 text-[#475569] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          </header>

          <div className="flex-1 p-3 md:p-6 flex flex-col overflow-y-auto">
            <div className="bg-white border border-[#E5E7EB] rounded-[12px] md:rounded-[15px] shadow-[0_1px_2px_rgba(15,23,42,0.025)] flex flex-col h-full overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-[#E5E7EB] shrink-0 bg-[#FBFBFC]">
                <button
                  onClick={() => setActiveTab('홀')}
                  className={`flex-1 py-2.5 md:py-3 text-[12px] md:text-[13px] font-medium transition-colors border-b-2 ${
                    activeTab === '홀' 
                      ? 'text-[#2563EB] border-[#2563EB] bg-white' 
                      : 'text-[#475569] border-transparent hover:text-[#0F172A]'
                  }`}
                >
                  {t.tabHall}
                </button>
                <button
                  onClick={() => setActiveTab('주방')}
                  className={`flex-1 py-2.5 md:py-3 text-[12px] md:text-[13px] font-medium transition-colors border-b-2 ${
                    activeTab === '주방' 
                      ? 'text-[#2563EB] border-[#2563EB] bg-white' 
                      : 'text-[#475569] border-transparent hover:text-[#0F172A]'
                  }`}
                >
                  {t.tabKitchen}
                </button>
                <button
                  onClick={() => setActiveTab('최종')}
                  className={`flex-1 py-2.5 md:py-3 text-[12px] md:text-[13px] font-medium transition-colors border-b-2 ${
                    activeTab === '최종' 
                      ? 'text-[#2563EB] border-[#2563EB] bg-white' 
                      : 'text-[#475569] border-transparent hover:text-[#0F172A]'
                  }`}
                >
                  {t.tabFinal}
                </button>
              </div>
              
              <div className="p-4 md:p-6 flex-1 overflow-y-auto">
                {activeTab === '홀' && renderSection('홀')}
                {activeTab === '주방' && renderSection('주방')}

                {activeTab === '최종' && (
                  <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
                    
                    {/* 점수 요약표 */}
                    <div className="bg-white border border-[#E5E7EB] rounded-[12px] md:rounded-[15px] overflow-hidden">
                      <div className="bg-[#FBFBFC] px-4 md:px-5 py-3 md:py-4 border-b border-[#E5E7EB]">
                        <h3 className="text-[13px] md:text-[14px] font-bold text-[#0F172A]">{t.reportTitleFinal}</h3>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] md:text-[12px] text-left border-collapse min-w-[500px]">
                          <thead className="bg-[#F5F6F8]">
                            <tr>
                              <th className="border-b border-r border-[#E5E7EB] p-2 md:p-3 w-10 md:w-12 text-center text-[#475569] font-medium">{t.colDiv}</th>
                              <th className="border-b border-[#E5E7EB] p-2 md:p-3 text-[#475569] font-medium">{t.colHallResult}</th>
                              <th className="border-b border-r border-[#E5E7EB] p-2 md:p-3 text-right text-[#475569] font-medium w-20 md:w-28">{t.colScore}</th>
                              <th className="border-b border-[#E5E7EB] p-2 md:p-3 text-[#475569] font-medium">{t.colKitchenResult}</th>
                              <th className="border-b border-[#E5E7EB] p-2 md:p-3 text-right text-[#475569] font-medium w-20 md:w-28">{t.colScore}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="hover:bg-[#FBFBFC] transition-colors">
                              <td className="border-b border-r border-[#F1F2F4] p-2 md:p-3 text-center text-[#94A3B8]">1</td>
                              <td className="border-b border-[#F1F2F4] p-2 md:p-3 text-[#475569]">{t.lblSanitation} (Max {hallSanitation.max})</td>
                              <td className="border-b border-r border-[#F1F2F4] p-2 md:p-3 text-right font-mono text-[#0F172A]">{hallSanitation.score}</td>
                              <td className="border-b border-[#F1F2F4] p-2 md:p-3 text-[#475569]">{t.lblSanitation} (Max {kitchenSanitation.max})</td>
                              <td className="border-b border-[#F1F2F4] p-2 md:p-3 text-right font-mono text-[#0F172A]">{kitchenSanitation.score}</td>
                            </tr>
                            <tr className="hover:bg-[#FBFBFC] transition-colors">
                              <td className="border-b border-r border-[#F1F2F4] p-2 md:p-3 text-center text-[#94A3B8]">2</td>
                              <td className="border-b border-[#F1F2F4] p-2 md:p-3 text-[#475569]">{t.lblService} (Max {hallService.max})</td>
                              <td className="border-b border-r border-[#F1F2F4] p-2 md:p-3 text-right font-mono text-[#0F172A]">{hallService.score}</td>
                              <td className="border-b border-[#F1F2F4] p-2 md:p-3 text-[#475569]">{t.lblCooking} (Max {kitchenCooking.max})</td>
                              <td className="border-b border-[#F1F2F4] p-2 md:p-3 text-right font-mono text-[#0F172A]">{kitchenCooking.score}</td>
                            </tr>
                            <tr className="bg-[#F5F6F8] font-bold text-[12px] md:text-[13px]">
                              <td className="p-3 md:p-4 text-center text-[#2563EB] border-r border-[#E5E7EB]">{t.lblFinal}</td>
                              <td className="p-3 md:p-4 text-[#2563EB]">{t.lblHallFinal} {t.lblBase100}</td>
                              <td className="p-3 md:p-4 text-right text-[#2563EB] font-mono border-r border-[#E5E7EB]">{hallConverted.toFixed(1)}</td>
                              <td className="p-3 md:p-4 text-[#20A66B]">{t.lblKitchenFinal} {t.lblBase100}</td>
                              <td className="p-3 md:p-4 text-right text-[#20A66B] font-mono">{kitchenConverted.toFixed(1)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 사진 근거 리포트 영역 */}
                    {Object.keys(photos).length > 0 && (
                      <div className="bg-white border border-[#E5E7EB] rounded-[12px] md:rounded-[15px] overflow-hidden">
                        <div className="bg-[#FBFBFC] px-4 md:px-5 py-3 md:py-4 border-b border-[#E5E7EB] flex items-center justify-between">
                          <h3 className="text-[13px] md:text-[14px] font-bold text-[#0F172A] flex items-center gap-2">
                            <Camera className="w-4 h-4 text-[#475569]" />
                            {t.evidenceTitle}
                          </h3>
                        </div>
                        <div className="p-4 md:p-5 flex flex-col gap-4 bg-[#F5F6F8]">
                          {Object.entries(photos).map(([itemId, urls]) => {
                            const item = CHECKLIST_ITEMS.find(i => i.id === itemId);
                            if (!item) return null;
                            const scoreLabel = item.options.find(o => o.val === scores[item.id])?.label || '미체크';

                            return (
                              <div key={itemId} className="bg-white border border-[#E5E7EB] rounded-[8px] p-4 flex flex-col md:flex-row gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.025)]">
                                <div className="flex-1">
                                  <div className="text-[10px] text-[#94A3B8] font-bold mb-1">
                                    {item.category} &gt; {item.subCategory}
                                  </div>
                                  <div className="text-[13px] font-bold text-[#0F172A] leading-snug">
                                    {lang === 'en' && (item as any).taskEn ? (item as any).taskEn : item.task}
                                  </div>
                                  <div className="mt-2 inline-block px-2 py-1 bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-bold rounded-[4px] border border-[#FCA5A5]">
                                    부여 점수: {scoreLabel}
                                  </div>
                                </div>
                                <div className="flex gap-2 shrink-0 overflow-x-auto pb-1">
                                  {urls.map((url, i) => (
                                    <div key={i} className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-[6px] border border-[#E5E7EB] overflow-hidden shadow-sm">
                                      <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="bg-[#FBFBFC] p-4 md:p-6 rounded-[12px] md:rounded-[15px] border border-[#E5E7EB]">
                      <h4 className="text-[12px] md:text-[13px] font-bold text-[#0F172A] mb-3 md:mb-5">{t.signTitle}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="bg-white p-3 md:p-4 rounded-[12px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.025)]">
                          <label className="text-[11px] md:text-[12px] font-bold text-[#475569] mb-2 block text-center">{t.signManager}</label>
                          <SignaturePad ref={managerSigRef} />
                        </div>
                        <div className="bg-white p-3 md:p-4 rounded-[12px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.025)]">
                          <label className="text-[11px] md:text-[12px] font-bold text-[#475569] mb-2 block text-center">{t.signOwner}</label>
                          <SignaturePad ref={ownerSigRef} />
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer (하단 고정바) */}
          <footer className="px-4 md:px-8 py-3 md:py-4 bg-white border-t border-[#E5E7EB] flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-2">
              <span className="hidden md:flex px-2 md:px-3 py-1 md:py-1.5 bg-[#F5F6F8] rounded-[6px] text-[9px] md:text-[10px] font-bold text-[#475569] items-center border border-[#E5E7EB]">
                <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-[#20A66B] rounded-full mr-1.5 md:mr-2"></span>
                DB READY
              </span>
              <button 
                onClick={handleReset} 
                className="px-3 md:px-4 py-1.5 md:py-2 border border-[#E85B5B] bg-white rounded-[6px] md:rounded-[8px] text-[11px] md:text-[12px] font-bold text-[#E85B5B] hover:bg-[#FEE2E2] transition-colors flex items-center gap-1 md:gap-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.025)]"
              >
                <RefreshCw className="w-3 h-3 md:w-3.5 md:h-3.5" />
                {t.btnReset}
              </button>
            </div>
            <div className="flex gap-2 md:gap-3">
              <button 
                onClick={handleTempSave}
                className="hidden sm:block px-4 md:px-5 py-1.5 md:py-2 border border-[#E5E7EB] bg-white rounded-[6px] md:rounded-[8px] text-[11px] md:text-[12px] font-medium text-[#475569] hover:bg-[#F5F6F8] transition-colors"
              >
                {t.btnTempSave}
              </button>
              {renderFooterButtons()}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}