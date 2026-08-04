import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, User, Calendar, CheckCircle2, 
  RotateCcw, Send, ShieldCheck, ChevronRight, Camera, X, RefreshCw, Globe, FolderArchive, Printer, Eye, Zap, Trash2, Edit3, Save, Clock
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

import { CHECKLIST_ITEMS } from './data';
import { supabase } from './utils/supabase';

const HALL_ITEMS = CHECKLIST_ITEMS.filter(item => item.category === '홀').map((item, idx) => ({ ...item, globalIndex: idx + 1 }));
const KITCHEN_ITEMS = CHECKLIST_ITEMS.filter(item => item.category === '주방').map((item, idx) => ({ ...item, globalIndex: idx + 1 }));

export default function App() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [activeTab, setActiveTab] = useState<'hall' | 'kitchen' | 'final' | 'library'>('hall');
  const [branchName, setBranchName] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [scores, setScores] = useState<Record<string, number>>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [activePhotoModalItem, setActivePhotoModalItem] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [savedInspections, setSavedInspections] = useState<any[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<any | null>(null);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // 수정 모드 관련 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editBranchName, setEditBranchName] = useState('');
  const [editInspectorName, setEditInspectorName] = useState('');
  const [editInspectionDate, setEditInspectionDate] = useState('');
  const [editDetails, setEditDetails] = useState<Record<string, number>>({});

  // 이미지 확대 라이트박스 모달 상태
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const managerSigRef = useRef<any>(null);
  const ownerSigRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEn = lang === 'en';

  const fillDummyData = () => {
    setBranchName(isEn ? 'Gangnam Branch (Test)' : '강남 직영점(테스트)');
    setInspectorName(isEn ? 'Hong Gil-dong' : '홍길동 매니저');
    
    const dummyScores: Record<string, number> = {};
    CHECKLIST_ITEMS.forEach((item) => {
      if (item.options && item.options.length > 0) {
        dummyScores[item.id] = item.options[0].val;
      }
    });
    setScores(dummyScores);
    alert(isEn ? '⚡ Dummy data filled automatically!' : '⚡ 모든 항목이 [우수/준수]로 자동 채워졌습니다!');
  };

  const fetchLibrary = async () => {
    setIsLoadingLibrary(true);
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
      } else {
        setSavedInspections(data || []);
      }
    } catch (err: any) {
      console.error('Library Exception:', err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'library') {
      fetchLibrary();
    }
  }, [activeTab]);

  const getUncheckedItems = (items: any[]) => {
    return items.filter(item => scores[item.id] === undefined);
  };

  const isHallComplete = HALL_ITEMS.length > 0 && HALL_ITEMS.every(item => scores[item.id] !== undefined);
  const isKitchenComplete = KITCHEN_ITEMS.length > 0 && KITCHEN_ITEMS.every(item => scores[item.id] !== undefined);

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

  const handleHallComplete = () => {
    if (!validateBasicInfo()) return;
    const unchecked = getUncheckedItems(HALL_ITEMS);
    if (unchecked.length > 0) {
      const numbers = unchecked.map(item => `${item.globalIndex}번`).join(', ');
      alert(isEn 
        ? `⚠️ Unchecked items in Hall inspection.\nItem Nos: [ ${numbers} ]`
        : `⚠️ 홀 점검 미체크 항목이 있습니다.\n미체크 항목 번호: [ ${numbers} ]`
      );
      return;
    }
    setActiveTab('kitchen');
  };

  const handleKitchenComplete = () => {
    if (!validateBasicInfo()) return;
    const unchecked = getUncheckedItems(KITCHEN_ITEMS);
    if (unchecked.length > 0) {
      const numbers = unchecked.map(item => `${item.globalIndex}번`).join(', ');
      alert(isEn 
        ? `⚠️ Unchecked items in Kitchen inspection.\nItem Nos: [ ${numbers} ]`
        : `⚠️ 주방 점검 미체크 항목이 있습니다.\n미체크 항목 번호: [ ${numbers} ]`
      );
      return;
    }
    setActiveTab('final');
  };

  const calculateScores = (customScores?: Record<string, number>) => {
    const targetScores = customScores || scores;
    const calcGroup = (items: any[]) => {
      let totalMax = 0;
      let totalCurrent = 0;

      items.forEach(item => {
        const selectedVal = targetScores[item.id];
        if (selectedVal !== undefined) {
          if (selectedVal === -1) {
            // 비해당
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
    setScores({});
    setPhotos({});
    setBranchName('');
    setInspectorName('');
    if (managerSigRef.current?.clear) managerSigRef.current.clear();
    if (ownerSigRef.current?.clear) ownerSigRef.current.clear();
    setActiveTab('hall');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activePhotoModalItem || !e.target.files) return;
    const files = Array.from(e.target.files);
    
    files.forEach((file) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

          setPhotos(prev => {
            const current = prev[activePhotoModalItem.id] || [];
            if (current.length >= 3) {
              alert('Max 3 photos allowed.');
              return prev;
            }
            return { ...prev, [activePhotoModalItem.id]: [...current, compressedBase64] };
          });
        };
      };
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = (itemId: string, photoIdx: number) => {
    setPhotos(prev => {
      const current = prev[itemId] || [];
      const updated = current.filter((_, idx) => idx !== photoIdx);
      if (updated.length === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: updated };
    });
  };

  const getWhiteBgSignature = (sigRef: any) => {
    if (!sigRef.current || sigRef.current.isEmpty()) return '';
    const canvas = sigRef.current.getCanvas();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.drawImage(canvas, 0, 0);
    }
    return tempCanvas.toDataURL('image/png');
  };

  // 날짜 + 시간 표기를 위한 헬퍼
  const getFormattedDateTime = (dateStr: string) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}`;
  };

  const handleSubmit = async () => {
    if (!validateBasicInfo()) return;
    setIsSubmitting(true);

    try {
      const managerSig = getWhiteBgSignature(managerSigRef);
      const ownerSig = getWhiteBgSignature(ownerSigRef);

      const calculated = calculateScores();
      const fullInspectionDate = getFormattedDateTime(inspectionDate);

      const payload = {
        inspection_date: fullInspectionDate, // 날짜 + 시간 함께 저장
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
        language: lang // 영문/한글 언어 상태 저장
      };

      const { error } = await supabase.from('inspections').insert([payload]).select();

      if (error) {
        throw error;
      }

      alert(isEn ? '🎉 Saved to Supabase DB successfully!' : '🎉 성공적으로 Supabase DB에 저장되었습니다!');
      handleReset();
      setActiveTab('library');
    } catch (err: any) {
      console.error('Submit Error Catch:', err);
      alert(`⚠️ Supabase DB 저장 실패: ${err.message || '네트워크 통신 오류가 발생했습니다.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInspection = async (id: string, branch: string, date: string) => {
    if (!window.confirm(isEn ? `Delete inspection report [${branch}]?` : `정말 [${branch} (${date})] 리포트를 삭제하시겠습니까?`)) return;

    try {
      const { error } = await supabase.from('inspections').delete().eq('id', id);
      if (error) throw error;

      alert(isEn ? '🗑️ Deleted successfully.' : '🗑️ 성공적으로 삭제되었습니다.');
      if (selectedInspection?.id === id) {
        setSelectedInspection(null);
      }
      fetchLibrary();
    } catch (err: any) {
      alert(`⚠️ Delete failed: ${err.message}`);
    }
  };

  const startEditing = (item: any) => {
    setIsEditing(true);
    setEditBranchName(item.branch_name || '');
    setEditInspectorName(item.inspector_name || '');
    setEditInspectionDate(item.inspection_date || '');
    setEditDetails(item.details || {});
  };

  const handleSaveEdit = async () => {
    if (!selectedInspection) return;

    try {
      const calculated = calculateScores(editDetails);

      const updatePayload = {
        branch_name: editBranchName,
        inspector_name: editInspectorName,
        inspection_date: editInspectionDate,
        details: editDetails,
        kitchen_score: calculated.kitchenScore,
        kitchen_grade: calculated.kitchenGrade,
        hall_score: calculated.hallScore,
        hall_grade: calculated.hallGrade,
        final_score: calculated.finalScore,
        final_grade: calculated.finalGrade,
      };

      const { error } = await supabase
        .from('inspections')
        .update(updatePayload)
        .eq('id', selectedInspection.id);

      if (error) throw error;

      alert(isEn ? '💾 Saved changes successfully!' : '💾 성공적으로 수정되었습니다!');
      
      const updatedItem = { ...selectedInspection, ...updatePayload };
      setSelectedInspection(updatedItem);
      setIsEditing(false);
      fetchLibrary();
    } catch (err: any) {
      alert(`⚠️ Save failed: ${err.message}`);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

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
      <div key={subCatName} className="mb-4 sm:mb-6 bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200 shadow-sm">
        <h3 className="text-sm sm:text-base font-bold text-slate-800 pb-2.5 mb-3 border-b border-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-blue-600"></span>
          {subCatName}
        </h3>

        {Object.entries(sections).map(([secName, itemList]) => {
          return (
            <div key={secName} className="mb-4 last:mb-0">
              <h4 className="text-[11px] sm:text-xs font-bold text-slate-600 mb-2 bg-slate-100 px-2.5 py-1 rounded-md inline-block">
                {secName}
              </h4>

              <div className="space-y-2.5">
                {itemList.map((item) => {
                  const taskText = isEn ? (item.taskEn || item.task) : item.task;
                  const itemPhotos = photos[item.id] || [];

                  return (
                    <div key={item.id} className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-slate-800 leading-snug">
                          <span className="font-bold mr-1 text-blue-600">{item.globalIndex}.</span> {taskText}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {itemPhotos.length > 0 && (
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                            {itemPhotos.map((img, pIdx) => (
                              <img 
                                key={pIdx} 
                                src={img} 
                                alt="첨부" 
                                onClick={() => setEnlargedImage(img)}
                                className="w-6 h-6 object-cover rounded cursor-pointer hover:opacity-80 border border-slate-300"
                              />
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200 overflow-x-auto">
                          {item.options.map((opt: any) => {
                            const val = opt.val;
                            const label = isEn ? (opt.labelEn || opt.label) : opt.label;
                            const isSelected = scores[item.id] === val;
                            return (
                              <button
                                key={opt.label}
                                onClick={() => setScores(prev => ({ ...prev, [item.id]: val }))}
                                className={`px-2 py-1 text-[11px] sm:text-xs font-semibold rounded transition-all whitespace-nowrap ${
                                  isSelected 
                                    ? 'bg-blue-600 text-white shadow-sm font-bold' 
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => setActivePhotoModalItem(item)}
                          className={`flex items-center gap-1 text-[11px] sm:text-xs px-2 py-1 rounded-lg border transition-all ${
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

  // 상세 보고서 테이블 렌더링 (영문 지원 및 모바일 UI 대응)
  const renderDetailReportItems = (details: Record<string, number>, photoData: Record<string, string[]>, reportLanguage?: string) => {
    const isReportEn = reportLanguage === 'en';

    return CHECKLIST_ITEMS.map((item, idx) => {
      const val = isEditing ? editDetails[item.id] : (details ? details[item.id] : undefined);
      const matchedOpt = item.options.find((o: any) => o.val === val);
      
      const label = matchedOpt 
        ? (isReportEn ? (matchedOpt.labelEn || matchedOpt.label) : matchedOpt.label) 
        : (val !== undefined ? `${val} pts` : (isReportEn ? 'Unrated' : '미평가'));

      const taskText = isReportEn ? (item.taskEn || item.task) : item.task;
      const categoryText = isReportEn 
        ? `${item.category === '홀' ? 'Hall' : 'Kitchen'} > ${item.subCategoryEn || item.subCategory}`
        : `${item.category} > ${item.subCategory}`;

      const itemPhotos = photoData ? (photoData[item.id] || []) : [];

      return (
        <tr key={item.id} className="border-b border-slate-200 text-[11px] sm:text-xs">
          <td className="p-1.5 sm:p-2 font-bold text-center border-r border-slate-200 text-slate-500 w-8 sm:w-10">{idx + 1}</td>
          <td className="p-1.5 sm:p-2 border-r border-slate-200 text-slate-600 font-medium min-w-[100px] sm:w-40">{categoryText}</td>
          <td className="p-1.5 sm:p-2 border-r border-slate-200 font-normal text-slate-800 leading-tight">{taskText}</td>
          
          <td className="p-1.5 sm:p-2 border-r border-slate-200 text-center font-bold text-blue-600 bg-slate-50/50 min-w-[65px]">
            {isEditing ? (
              <select
                value={val !== undefined ? val : ''}
                onChange={(e) => {
                  const newVal = Number(e.target.value);
                  setEditDetails(prev => ({ ...prev, [item.id]: newVal }));
                }}
                className="bg-white border border-blue-300 rounded px-1 py-0.5 text-[11px] font-bold text-blue-700 outline-none max-w-[80px]"
              >
                {item.options.map((opt: any) => (
                  <option key={opt.label} value={opt.val}>
                    {isReportEn ? (opt.labelEn || opt.label) : opt.label}
                  </option>
                ))}
              </select>
            ) : (
              label
            )}
          </td>

          <td className="p-1.5 sm:p-2 text-center min-w-[60px]">
            {itemPhotos.length > 0 ? (
              <div className="flex items-center justify-center gap-1 flex-wrap">
                {itemPhotos.map((img, photoIdx) => (
                  <img 
                    key={photoIdx} 
                    src={img} 
                    alt="증빙" 
                    onClick={() => setEnlargedImage(img)}
                    className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded border cursor-pointer hover:scale-105 transition-transform" 
                  />
                ))}
              </div>
            ) : (
              <span className="text-slate-300">-</span>
            )}
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              QSC Manager
            </h1>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={fillDummyData}
              className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg text-[11px] font-bold border border-amber-300 hover:bg-amber-100 shadow-sm transition-all"
            >
              <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
              {isEn ? 'Fill Dummy' : '더미 채우기'}
            </button>

            <button
              onClick={() => setLang(l => l === 'ko' ? 'en' : 'ko')}
              className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-blue-200 hover:bg-blue-100 transition-all"
            >
              <Globe className="w-3 h-3" />
              {isEn ? '한국어' : 'English'}
            </button>

            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder={isEn ? "Branch" : "지점명"}
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="bg-transparent border-none outline-none w-20 sm:w-28 font-medium placeholder:text-slate-400 text-xs"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-xs">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder={isEn ? "Inspector" : "점검자"}
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="bg-transparent border-none outline-none w-16 sm:w-24 font-medium placeholder:text-slate-400 text-xs"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="bg-transparent border-none outline-none font-medium text-slate-600 text-xs w-24 sm:w-auto"
              />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-2 flex border-t border-slate-100">
          <button
            onClick={() => setActiveTab('hall')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 border-b-2 transition-all ${
              activeTab === 'hall' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500'
            }`}
          >
            {isEn ? 'Hall' : '홀 점검'} {isHallComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          </button>
          <button
            onClick={() => setActiveTab('kitchen')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 border-b-2 transition-all ${
              activeTab === 'kitchen' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500'
            }`}
          >
            {isEn ? 'Kitchen' : '주방 점검'} {isKitchenComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          </button>
          <button
            onClick={() => setActiveTab('final')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 border-b-2 transition-all ${
              activeTab === 'final' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500'
            }`}
          >
            {isEn ? 'Final' : '최종 평가'}
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 border-b-2 transition-all ${
              activeTab === 'library' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" /> {isEn ? 'Library' : '보관함'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {activeTab === 'hall' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">{isEn ? 'Hall Audit Items' : '홀 (Hall) 점검 항목'}</h2>
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded">WEIGHT 50%</span>
            </div>
            {renderItemGroups(HALL_ITEMS)}
          </div>
        )}

        {activeTab === 'kitchen' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">{isEn ? 'Kitchen Audit Items' : '주방 (Kitchen) 점검 항목'}</h2>
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded">WEIGHT 50%</span>
            </div>
            {renderItemGroups(KITCHEN_ITEMS)}
          </div>
        )}

        {activeTab === 'final' && (
          <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500">{isEn ? 'Hall Score' : '홀 점수'}</p>
                <p className="text-lg sm:text-2xl font-black text-slate-800 mt-1">{calculateScores().hallScore}점</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded inline-block mt-0.5">
                  Grade {calculateScores().hallGrade}
                </span>
              </div>
              <div className="border-x border-slate-100">
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500">{isEn ? 'Kitchen Score' : '주방 점수'}</p>
                <p className="text-lg sm:text-2xl font-black text-slate-800 mt-1">{calculateScores().kitchenScore}점</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded inline-block mt-0.5">
                  Grade {calculateScores().kitchenGrade}
                </span>
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500">{isEn ? 'Total Score' : '최종 점수'}</p>
                <p className="text-lg sm:text-2xl font-black text-blue-600 mt-1">{calculateScores().finalScore}점</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded inline-block mt-0.5">
                  Grade {calculateScores().finalGrade}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200">
                <p className="text-xs sm:text-sm font-bold text-slate-700 mb-2">{isEn ? 'Inspector Signature' : '점검자 서명'}</p>
                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                  <SignatureCanvas ref={managerSigRef} penColor="black" canvasProps={{ className: 'w-full h-28 sm:h-32' }} />
                </div>
                <button onClick={() => managerSigRef.current?.clear()} className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> {isEn ? 'Clear' : '지우기'}
                </button>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200">
                <p className="text-xs sm:text-sm font-bold text-slate-700 mb-2">{isEn ? 'Owner/Manager Signature' : '점주/매니저 서명'}</p>
                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                  <SignatureCanvas ref={ownerSigRef} penColor="black" canvasProps={{ className: 'w-full h-28 sm:h-32' }} />
                </div>
                <button onClick={() => ownerSigRef.current?.clear()} className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> {isEn ? 'Clear' : '지우기'}
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 sm:py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-400 text-sm sm:text-base"
            >
              {isSubmitting 
                ? (isEn ? 'Saving...' : '데이터 저장 중...') 
                : <><Send className="w-4 h-4 sm:w-5 sm:h-5" /> {isEn ? 'Save to DB & Finish' : 'DB 저장 및 최종 평가 완료'}</>
              }
            </button>
          </div>
        )}

        {/* 보관함(Library) 탭 */}
        {activeTab === 'library' && (
          <div className="max-w-5xl mx-auto space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-1.5">
                <FolderArchive className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                {isEn ? 'QSC Library' : '평가 결과 보관함'}
              </h2>
              <button
                onClick={fetchLibrary}
                className="text-[11px] sm:text-xs bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> {isEn ? 'Refresh' : '새로고침'}
              </button>
            </div>

            {isLoadingLibrary ? (
              <div className="p-12 text-center text-slate-500 text-xs sm:text-sm">{isEn ? 'Loading library...' : 'Supabase DB에서 목록을 불러오는 중입니다...'}</div>
            ) : savedInspections.length === 0 ? (
              <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs sm:text-sm">
                {isEn ? 'No inspection records found.' : '저장된 점검 결과가 없습니다.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {savedInspections.map((item) => (
                  <div key={item.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                      <div>
                        <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                          {item.branch_name || (isEn ? 'Branch N/A' : '지점 미지정')}
                        </span>
                        
                        {/* ⏰ 점검 일시(날짜 + 시간) 표시 */}
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base mt-1 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {item.inspection_date}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">{isEn ? 'Inspector' : '점검자'}: {item.inspector_name}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-0.5">
                        <p className="text-lg sm:text-xl font-black text-blue-600">{item.final_score}점</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                          Grade {item.final_grade}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <div className="text-[11px] text-slate-500">
                        {isEn ? 'Hall' : '홀'} {item.hall_score} | {isEn ? 'Kitchen' : '주방'} {item.kitchen_score}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedInspection(item);
                            setIsEditing(false);
                          }}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> {isEn ? 'Report / PDF' : '상세 보고서 / PDF'}
                        </button>
                        <button
                          onClick={() => handleDeleteInspection(item.id, item.branch_name, item.inspection_date)}
                          className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs transition-all"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2.5 z-20 shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> READY
            </span>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 px-2 py-1 rounded border border-slate-200"
            >
              <RefreshCw className="w-3 h-3" /> {isEn ? 'Reset' : '초기화'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'hall' && (
              <button
                onClick={handleHallComplete}
                className={`px-3.5 py-2 rounded-xl font-bold text-white text-xs sm:text-sm shadow flex items-center gap-1 transition-all ${
                  isHallComplete ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isHallComplete 
                  ? (isEn ? 'Hall Done (Next)' : '홀 완료 (다음)') 
                  : (isEn ? 'Complete Hall Items' : '홀 미완료')}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {activeTab === 'kitchen' && (
              <button
                onClick={handleKitchenComplete}
                className={`px-3.5 py-2 rounded-xl font-bold text-white text-xs sm:text-sm shadow flex items-center gap-1 transition-all ${
                  isKitchenComplete ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isKitchenComplete 
                  ? (isEn ? 'Kitchen Done (Next)' : '주방 완료 (최종서명)') 
                  : (isEn ? 'Complete Kitchen Items' : '주방 미완료')}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* 사진 첨부 모달 */}
      {activePhotoModalItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm truncate pr-2">
                {isEn ? 'Photo Upload' : '사진 첨부'} ({isEn ? (activePhotoModalItem.taskEn || activePhotoModalItem.task) : activePhotoModalItem.task})
              </h3>
              <button onClick={() => setActivePhotoModalItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3">
              <div className="grid grid-cols-3 gap-2 mb-3">
                {(photos[activePhotoModalItem.id] || []).map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                    <img src={img} alt="증빙" className="w-full h-full object-cover" />
                    
                    <button
                      onClick={() => handleDeletePhoto(activePhotoModalItem.id, idx)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-90 hover:opacity-100 shadow"
                      title="사진 삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
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
                <Camera className="w-4 h-4" /> {isEn ? 'Take/Choose Photo' : '사진 촬영 / 앨범 선택'}
              </button>
            </div>

            <button
              onClick={() => setActivePhotoModalItem(null)}
              className="w-full py-2 bg-slate-800 text-white font-bold rounded-xl text-xs"
            >
              {isEn ? 'Close' : '닫기'}
            </button>
          </div>
        </div>
      )}

      {/* 📱 모바일 세로 화면 완벽 지원 상세보기 및 수정/삭제 모달 */}
      {selectedInspection && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-3.5 sm:p-6 shadow-2xl relative my-4 sm:my-8 max-h-[95vh] overflow-y-auto">
            
            {/* 📱 모바일 반응형 상단 헤더 버튼 영역 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 sticky top-0 bg-white z-10 print:hidden gap-2">
              <h3 className="font-bold text-slate-800 text-sm sm:text-lg">
                {isEditing ? (selectedInspection.language === 'en' ? '✏️ Editing Report' : '✏️ 점검 리포트 수정 중') : (selectedInspection.language === 'en' ? 'QSC Inspection Report' : '상세 QSC 점검 리포트')}
              </h3>
              
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {!isEditing ? (
                  <>
                    <button
                      onClick={() => startEditing(selectedInspection)}
                      className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] sm:text-xs font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 shadow"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{selectedInspection.language === 'en' ? 'Edit' : '수정'}</span>
                    </button>
                    <button
                      onClick={handlePrintPDF}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 shadow"
                    >
                      <Printer className="w-3 h-3" />
                      <span>{selectedInspection.language === 'en' ? 'PDF' : 'PDF / 인쇄'}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteInspection(selectedInspection.id, selectedInspection.branch_name, selectedInspection.inspection_date)}
                      className="bg-red-50 text-red-600 hover:bg-red-100 text-[11px] sm:text-xs font-bold px-2 py-1.5 rounded-lg flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{selectedInspection.language === 'en' ? 'Delete' : '삭제'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{selectedInspection.language === 'en' ? 'Save' : '수정 저장'}</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="bg-slate-200 text-slate-700 text-[11px] sm:text-xs font-bold px-2.5 py-1.5 rounded-lg"
                    >
                      {selectedInspection.language === 'en' ? 'Cancel' : '취소'}
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedInspection(null)} className="text-slate-400 hover:text-slate-600 p-1 ml-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="py-3 sm:py-6 space-y-4 sm:space-y-6">
              <div className="text-center border-b pb-3">
                <h2 className="text-lg sm:text-2xl font-black text-slate-900">
                  {selectedInspection.language === 'en' ? 'QSC Audit Evaluation Report' : 'QSC 점검 종합 평가 리포트'}
                </h2>
                
                {/* ⏰ 점검 일시(날짜+시간) 표기 */}
                {isEditing ? (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <span className="text-[11px] font-bold text-slate-500">{selectedInspection.language === 'en' ? 'Date & Time:' : '점검 일시:'}</span>
                    <input
                      type="text"
                      value={editInspectionDate}
                      onChange={(e) => setEditInspectionDate(e.target.value)}
                      className="bg-white border rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 w-36"
                    />
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {selectedInspection.language === 'en' ? 'Inspection Date & Time:' : '점검 일시:'} {selectedInspection.inspection_date}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4 bg-slate-50 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm border border-slate-200">
                <div>
                  <span className="font-bold text-slate-700 mr-1">{selectedInspection.language === 'en' ? 'Branch:' : '지점명:'}</span> 
                  {isEditing ? (
                    <input
                      type="text"
                      value={editBranchName}
                      onChange={(e) => setEditBranchName(e.target.value)}
                      className="bg-white border rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 w-28 sm:w-44"
                    />
                  ) : (
                    selectedInspection.branch_name
                  )}
                </div>
                <div>
                  <span className="font-bold text-slate-700 mr-1">{selectedInspection.language === 'en' ? 'Inspector:' : '점검자:'}</span> 
                  {isEditing ? (
                    <input
                      type="text"
                      value={editInspectorName}
                      onChange={(e) => setEditInspectorName(e.target.value)}
                      className="bg-white border rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 w-24 sm:w-36"
                    />
                  ) : (
                    selectedInspection.inspector_name
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center bg-blue-50/50 p-2.5 sm:p-4 rounded-xl border border-blue-100">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500">{selectedInspection.language === 'en' ? 'Hall Score' : '홀 점수'}</p>
                  <p className="text-sm sm:text-xl font-black text-slate-800 mt-0.5">
                    {isEditing ? calculateScores(editDetails).hallScore : selectedInspection.hall_score} pts
                  </p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500">{selectedInspection.language === 'en' ? 'Kitchen Score' : '주방 점수'}</p>
                  <p className="text-sm sm:text-xl font-black text-slate-800 mt-0.5">
                    {isEditing ? calculateScores(editDetails).kitchenScore : selectedInspection.kitchen_score} pts
                  </p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500">{selectedInspection.language === 'en' ? 'Total Score' : '최종 점수'}</p>
                  <p className="text-sm sm:text-xl font-black text-blue-600 mt-0.5">
                    {isEditing ? calculateScores(editDetails).finalScore : selectedInspection.final_score} pts
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> 
                  {selectedInspection.language === 'en' ? 'Detailed Checklist Items' : '세부 점검 항목 평가 내역'}
                </h4>
                
                {/* 📱 모바일 가로 스크롤 지원 표 */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[340px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-[10px] sm:text-xs font-bold border-b border-slate-200">
                        <th className="p-1.5 text-center w-8 border-r border-slate-200">No.</th>
                        <th className="p-1.5 border-r border-slate-200">{selectedInspection.language === 'en' ? 'Category' : '카테고리'}</th>
                        <th className="p-1.5 border-r border-slate-200">{selectedInspection.language === 'en' ? 'Checklist Item' : '점검 항목 내용'}</th>
                        <th className="p-1.5 text-center border-r border-slate-200">{selectedInspection.language === 'en' ? 'Result' : '평가 결과'}</th>
                        <th className="p-1.5 text-center">{selectedInspection.language === 'en' ? 'Photo' : '첨부 사진'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 🌐 언어 상태(en/ko) 전달 */}
                      {renderDetailReportItems(selectedInspection.details, selectedInspection.evidence_photos, selectedInspection.language)}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                <div className="text-center">
                  <p className="text-[11px] font-bold text-slate-600 mb-1.5">{selectedInspection.language === 'en' ? 'Inspector Sig' : '점검자 서명'}</p>
                  {selectedInspection.manager_signature ? (
                    <img src={selectedInspection.manager_signature} alt="점검자 서명" className="h-16 sm:h-20 mx-auto object-contain border rounded-lg bg-white shadow-sm p-1" />
                  ) : <span className="text-[10px] text-slate-400">N/A</span>}
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-bold text-slate-600 mb-1.5">{selectedInspection.language === 'en' ? 'Owner/Manager Sig' : '점주/매니저 서명'}</p>
                  {selectedInspection.owner_signature ? (
                    <img src={selectedInspection.owner_signature} alt="점주 서명" className="h-16 sm:h-20 mx-auto object-contain border rounded-lg bg-white shadow-sm p-1" />
                  ) : <span className="text-[10px] text-slate-400">N/A</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사진 크게 보기 팝업 */}
      {enlargedImage && (
        <div 
          onClick={() => setEnlargedImage(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 cursor-pointer"
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] flex items-center justify-center">
            <img src={enlargedImage} alt="확대보기" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain bg-white" />
            <button 
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-8 right-0 text-white hover:text-slate-300 font-bold text-xs flex items-center gap-1"
            >
              <X className="w-5 h-5" /> {isEn ? 'Close' : '닫기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
