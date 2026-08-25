import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, User, Calendar, CheckCircle2, 
  RotateCcw, Send, ShieldCheck, ChevronRight, Camera, X, RefreshCw, Globe, FolderArchive, Printer, Eye, Zap, Trash2, Edit3, Save, Clock, MessageSquare, Loader2, Filter, ArrowUpDown, Plus
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

import { CHECKLIST_ITEMS } from './data';
import { supabase, uploadPhotoToStorage, deletePhotosFromStorage } from './utils/supabase';

const HALL_ITEMS = CHECKLIST_ITEMS.filter(item => item.category === '홀').map((item, idx) => ({ ...item, globalIndex: idx + 1 }));
const KITCHEN_ITEMS = CHECKLIST_ITEMS.filter(item => item.category === '주방').map((item, idx) => ({ ...item, globalIndex: idx + 1 }));

// 기본 제공 예시 목록
const DEFAULT_COUNTRIES = ['한국 (Korea)', '미국 (USA)', '일본 (Japan)', '베트남 (Vietnam)', '중국 (China)'];
const DEFAULT_BRANCHES = ['강남 직영점', '홍대점', '성수점', 'LA 1호점', '도쿄 시부야점'];
const DEFAULT_INSPECTORS = ['홍길동 매니저', '김철수 팀장', '이영희 슈퍼바이저'];

export default function App() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [activeTab, setActiveTab] = useState<'hall' | 'kitchen' | 'final' | 'library'>('hall');
  
  // 국가, 지점, 점검자 상태
  const [country, setCountry] = useState('한국 (Korea)');
  const [branchName, setBranchName] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);

  // 커스텀 옵션 목록 상태 (사용자가 직접 추가한 데이터 누적)
  const [countryOptions, setCountryOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('qsc_country_options');
    return saved ? JSON.parse(saved) : DEFAULT_COUNTRIES;
  });
  const [branchOptions, setBranchOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('qsc_branch_options');
    return saved ? JSON.parse(saved) : DEFAULT_BRANCHES;
  });
  const [inspectorOptions, setInspectorOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('qsc_inspector_options');
    return saved ? JSON.parse(saved) : DEFAULT_INSPECTORS;
  });

  // 신규 직접 입력 모드 토글
  const [isCustomCountry, setIsCustomCountry] = useState(false);
  const [isCustomBranch, setIsCustomBranch] = useState(false);
  const [isCustomInspector, setIsCustomInspector] = useState(false);

  // 코멘트 상태
  const [managerComment, setManagerComment] = useState('');
  const [ownerComment, setOwnerComment] = useState('');

  const [scores, setScores] = useState<Record<string, number>>({});
  
  // Storage에 업로드 완료된 사진 URL 모음
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [activePhotoModalItem, setActivePhotoModalItem] = useState<any | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [savedInspections, setSavedInspections] = useState<any[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<any | null>(null);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // 보관함 필터 및 정렬 상태
  const [filterCountry, setFilterCountry] = useState<string>('ALL');
  const [filterBranch, setFilterBranch] = useState<string>('ALL');
  const [filterInspector, setFilterInspector] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'scoreHigh' | 'scoreLow' | 'country' | 'branch'>('latest');

  // 수정 모드 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editCountry, setEditCountry] = useState('');
  const [editBranchName, setEditBranchName] = useState('');
  const [editInspectorName, setEditInspectorName] = useState('');
  const [editInspectionDate, setEditInspectionDate] = useState('');
  const [editManagerComment, setEditManagerComment] = useState('');
  const [editOwnerComment, setEditOwnerComment] = useState('');
  const [editDetails, setEditDetails] = useState<Record<string, number>>({});

  // 라이트박스 확대 모달
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const managerSigRef = useRef<any>(null);
  const ownerSigRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isItemListEn = lang === 'en';

  // 새 옵션 추가 시 localStorage에 저장
  const addOptionIfNew = (type: 'country' | 'branch' | 'inspector', val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;

    if (type === 'country' && !countryOptions.includes(trimmed)) {
      const next = [...countryOptions, trimmed];
      setCountryOptions(next);
      localStorage.setItem('qsc_country_options', JSON.stringify(next));
    } else if (type === 'branch' && !branchOptions.includes(trimmed)) {
      const next = [...branchOptions, trimmed];
      setBranchOptions(next);
      localStorage.setItem('qsc_branch_options', JSON.stringify(next));
    } else if (type === 'inspector' && !inspectorOptions.includes(trimmed)) {
      const next = [...inspectorOptions, trimmed];
      setInspectorOptions(next);
      localStorage.setItem('qsc_inspector_options', JSON.stringify(next));
    }
  };

  const fillDummyData = () => {
    setCountry('한국 (Korea)');
    setBranchName('강남 직영점(테스트)');
    setInspectorName('홍길동 매니저');
    setManagerComment(isItemListEn ? 'Need to replace hall fixtures.' : '홀 집기류 교체 검토 바람.');
    setOwnerComment(isItemListEn ? 'Please check kitchen fridge noise.' : '주방 냉장고 소음 점검 부탁드립니다.');
    
    const dummyScores: Record<string, number> = {};
    CHECKLIST_ITEMS.forEach((item) => {
      if (item.options && item.options.length > 0) {
        dummyScores[item.id] = item.options[0].val;
      }
    });
    setScores(dummyScores);
    alert('⚡ 모든 점수 항목 및 코멘트가 자동 채워졌습니다!');
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
        alert(`⚠️ 데이터 불러오기 실패: ${error.message}`);
      } else {
        const fetchedData = data || [];
        setSavedInspections(fetchedData);

        // DB에 있는 기존 국가/지점/점검자 데이터를 드롭다운 옵션에 자동 등록
        fetchedData.forEach(item => {
          if (item.country) addOptionIfNew('country', item.country);
          if (item.branch_name) addOptionIfNew('branch', item.branch_name);
          if (item.inspector_name) addOptionIfNew('inspector', item.inspector_name);
        });
      }
    } catch (err: any) {
      console.error('Library Exception:', err);
      alert(`⚠️ 네트워크 통신 오류가 발생했습니다.`);
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
    if (!country.trim()) {
      alert('⚠️ 국가를 입력 또는 선택해 주세요.');
      return false;
    }
    if (!branchName.trim()) {
      alert('⚠️ 지점명을 입력 또는 선택해 주세요.');
      return false;
    }
    if (!inspectorName.trim()) {
      alert('⚠️ 점검자 이름을 입력 또는 선택해 주세요.');
      return false;
    }
    return true;
  };

  const handleHallComplete = () => {
    if (!validateBasicInfo()) return;
    const unchecked = getUncheckedItems(HALL_ITEMS);
    if (unchecked.length > 0) {
      const numbers = unchecked.map(item => `${item.globalIndex}번`).join(', ');
      alert(`⚠️ 홀 점검 미체크 항목이 있습니다.\n미체크 항목 번호: [ ${numbers} ]`);
      return;
    }
    setActiveTab('kitchen');
  };

  const handleKitchenComplete = () => {
    if (!validateBasicInfo()) return;
    const unchecked = getUncheckedItems(KITCHEN_ITEMS);
    if (unchecked.length > 0) {
      const numbers = unchecked.map(item => `${item.globalIndex}번`).join(', ');
      alert(`⚠️ 주방 점검 미체크 항목이 있습니다.\n미체크 항목 번호: [ ${numbers} ]`);
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
    setManagerComment('');
    setOwnerComment('');
    if (managerSigRef.current?.clear) managerSigRef.current.clear();
    if (ownerSigRef.current?.clear) ownerSigRef.current.clear();
    setActiveTab('hall');
  };

  // 📷 사진 업로드
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activePhotoModalItem || !e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    
    setIsUploadingPhoto(true);

    try {
      for (const file of files) {
        const currentPhotos = photos[activePhotoModalItem.id] || [];
        if (currentPhotos.length >= 3) {
          alert('사진은 항목당 최대 3장까지만 첨부할 수 있습니다.');
          break;
        }

        const compressedBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              const maxDim = 1600;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > maxDim) {
                  height = Math.round(height * (maxDim / width));
                  width = maxDim;
                }
              } else {
                if (height > maxDim) {
                  width = Math.round(width * (maxDim / height));
                  height = maxDim;
                }
              }

              canvas.width = width;
              canvas.height = height;
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
          };
        });

        const uploadedUrl = await uploadPhotoToStorage(compressedBase64, activePhotoModalItem.id);

        setPhotos(prev => {
          const current = prev[activePhotoModalItem.id] || [];
          return { ...prev, [activePhotoModalItem.id]: [...current, uploadedUrl] };
        });
      }
    } catch (err: any) {
      alert(`⚠️ 사진 업로드 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (itemId: string, photoIdx: number) => {
    const targetUrl = photos[itemId]?.[photoIdx];
    if (targetUrl) {
      deletePhotosFromStorage([targetUrl]);
    }

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
    return tempCanvas.toDataURL('image/jpeg', 0.7);
  };

  const formatDateTimeDisplay = (item: any) => {
    const rawDate = item.inspection_date || '';
    if (rawDate.includes(' ') && rawDate.includes(':')) {
      return rawDate;
    }
    
    if (item.created_at) {
      const dateObj = new Date(item.created_at);
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      return `${rawDate} ${hours}:${minutes}`;
    }

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${rawDate} ${hours}:${minutes}`;
  };

  // DB 제출
  const handleSubmit = async () => {
    if (!validateBasicInfo()) return;
    setIsSubmitting(true);

    try {
      // 신규 입력 옵션 보관함에 등록
      addOptionIfNew('country', country);
      addOptionIfNew('branch', branchName);
      addOptionIfNew('inspector', inspectorName);

      const managerSig = getWhiteBgSignature(managerSigRef);
      const ownerSig = getWhiteBgSignature(ownerSigRef);

      const calculated = calculateScores();
      
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const fullDateTime = `${inspectionDate} ${hours}:${minutes}`;

      const payload = {
        inspection_date: fullDateTime,
        country: country,
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
        manager_comment: managerComment,
        owner_comment: ownerComment,
        details: scores,
        evidence_photos: photos,
        language: lang
      };

      const { error } = await supabase.from('inspections').insert([payload]).select();

      if (error) throw error;

      alert('🎉 성공적으로 Supabase DB에 저장되었습니다!');
      handleReset();
      setActiveTab('library');
    } catch (err: any) {
      console.error('Submit Error Catch:', err);
      alert(`⚠️ Supabase DB 저장 실패: ${err.message || '네트워크 통신 오류가 발생했습니다.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInspection = async (item: any) => {
    if (!window.confirm(`정말 [${item.branch_name} (${item.inspection_date})] 리포트를 삭제하시겠습니까?`)) return;

    try {
      if (item.evidence_photos) {
        const allPhotoUrls: string[] = [];
        Object.values(item.evidence_photos).forEach((arr: any) => {
          if (Array.isArray(arr)) {
            allPhotoUrls.push(...arr);
          }
        });
        await deletePhotosFromStorage(allPhotoUrls);
      }

      const { error } = await supabase.from('inspections').delete().eq('id', item.id);
      if (error) throw error;

      alert('🗑️ 성공적으로 삭제되었습니다.');
      if (selectedInspection?.id === item.id) {
        setSelectedInspection(null);
      }
      fetchLibrary();
    } catch (err: any) {
      alert(`⚠️ 삭제 실패: ${err.message}`);
    }
  };

  const startEditing = (item: any) => {
    setIsEditing(true);
    setEditCountry(item.country || '한국 (Korea)');
    setEditBranchName(item.branch_name || '');
    setEditInspectorName(item.inspector_name || '');
    setEditInspectionDate(formatDateTimeDisplay(item));
    setEditManagerComment(item.manager_comment || '');
    setEditOwnerComment(item.owner_comment || '');
    setEditDetails(item.details || {});
  };

  const handleSaveEdit = async () => {
    if (!selectedInspection) return;

    try {
      const calculated = calculateScores(editDetails);

      const updatePayload = {
        country: editCountry,
        branch_name: editBranchName,
        inspector_name: editInspectorName,
        inspection_date: editInspectionDate,
        manager_comment: editManagerComment,
        owner_comment: editOwnerComment,
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

      alert('💾 성공적으로 수정되었습니다!');
      
      const updatedItem = { ...selectedInspection, ...updatePayload };
      setSelectedInspection(updatedItem);
      setIsEditing(false);
      fetchLibrary();
    } catch (err: any) {
      alert(`⚠️ 수정 저장 실패: ${err.message}`);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // 보관함 필터링 및 정렬 로직
  const getFilteredAndSortedInspections = () => {
    let result = [...savedInspections];

    if (filterCountry !== 'ALL') {
      result = result.filter(item => (item.country || '한국 (Korea)') === filterCountry);
    }
    if (filterBranch !== 'ALL') {
      result = result.filter(item => item.branch_name === filterBranch);
    }
    if (filterInspector !== 'ALL') {
      result = result.filter(item => item.inspector_name === filterInspector);
    }

    result.sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.created_at || b.inspection_date).getTime() - new Date(a.created_at || a.inspection_date).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at || a.inspection_date).getTime() - new Date(b.created_at || b.inspection_date).getTime();
      }
      if (sortBy === 'scoreHigh') {
        return (b.final_score || 0) - (a.final_score || 0);
      }
      if (sortBy === 'scoreLow') {
        return (a.final_score || 0) - (b.final_score || 0);
      }
      if (sortBy === 'country') {
        return (a.country || '').localeCompare(b.country || '');
      }
      if (sortBy === 'branch') {
        return (a.branch_name || '').localeCompare(b.branch_name || '');
      }
      return 0;
    });

    return result;
  };

  const renderItemGroups = (items: any[]) => {
    const categories: { [key: string]: { [key: string]: any[] } } = {};
    
    items.forEach(item => {
      const subCat = isItemListEn ? (item.subCategoryEn || item.subCategory) : item.subCategory;
      const sec = isItemListEn ? (item.sectionEn || item.section) : item.section;
      
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
                  const taskText = isItemListEn ? (item.taskEn || item.task) : item.task;
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
                                loading="lazy"
                                onClick={() => setEnlargedImage(img)}
                                className="w-6 h-6 object-cover rounded cursor-pointer hover:opacity-80 border border-slate-300"
                              />
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200 overflow-x-auto">
                          {item.options.map((opt: any) => {
                            const val = opt.val;
                            const label = isItemListEn ? (opt.labelEn || opt.label) : opt.label;
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

  const renderDetailReportItems = (details: Record<string, number>, photoData: Record<string, string[]>, reportLanguage?: string) => {
    const isReportEn = reportLanguage === 'en';

    return CHECKLIST_ITEMS.map((item, idx) => {
      const val = isEditing ? editDetails[item.id] : (details ? details[item.id] : undefined);
      const matchedOpt = item.options.find((o: any) => o.val === val);
      
      const label = matchedOpt 
        ? (isReportEn ? (matchedOpt.labelEn || matchedOpt.label) : matchedOpt.label) 
        : (val !== undefined ? `${val}pts` : (isReportEn ? 'Unrated' : '미평가'));

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
                    loading="lazy"
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

  const filteredInspections = getFilteredAndSortedInspections();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28">
      <style>{`
        @media print {
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .print\\:hidden { display: none !important; }
          .print-modal-container { 
            position: absolute !important; left: 0 !important; top: 0 !important; 
            width: 100% !important; max-width: 100% !important; height: auto !important; 
            max-height: none !important; overflow: visible !important; box-shadow: none !important; 
            border: none !important; padding: 0 !important; margin: 0 !important;
          }
          .print-modal-overlay { 
            position: static !important; background: white !important; 
            padding: 0 !important; overflow: visible !important;
          }
        }
      `}</style>

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
              더미 채우기
            </button>

            <button
              onClick={() => setLang(l => l === 'ko' ? 'en' : 'ko')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                isItemListEn ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <Globe className="w-3 h-3" />
              {isItemListEn ? '보고서 언어: English' : '보고서 언어: 한국어'}
            </button>

            {/* 🌐 1. 국가 입력/선택 드롭다운 */}
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-xs border border-slate-200">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              {isCustomCountry ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="국가 직접 입력"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="bg-white px-1.5 py-0.5 border rounded outline-none w-24 sm:w-28 font-medium text-xs text-slate-800"
                    autoFocus
                  />
                  <button onClick={() => setIsCustomCountry(false)} className="text-[10px] bg-slate-200 px-1 rounded hover:bg-slate-300 font-bold">선택</button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <select
                    value={country}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        setIsCustomCountry(true);
                        setCountry('');
                      } else {
                        setCountry(e.target.value);
                      }
                    }}
                    className="bg-transparent border-none outline-none font-medium text-slate-700 text-xs cursor-pointer max-w-[100px] sm:max-w-[130px]"
                  >
                    {countryOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="ADD_NEW">+ 직접 입력 추가</option>
                  </select>
                </div>
              )}
            </div>

            {/* 🏢 2. 지점명 입력/선택 드롭다운 */}
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-xs border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              {isCustomBranch ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="지점명 직접 입력"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="bg-white px-1.5 py-0.5 border rounded outline-none w-24 sm:w-28 font-medium text-xs text-slate-800"
                    autoFocus
                  />
                  <button onClick={() => setIsCustomBranch(false)} className="text-[10px] bg-slate-200 px-1 rounded hover:bg-slate-300 font-bold">선택</button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <select
                    value={branchName}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        setIsCustomBranch(true);
                        setBranchName('');
                      } else {
                        setBranchName(e.target.value);
                      }
                    }}
                    className="bg-transparent border-none outline-none font-medium text-slate-700 text-xs cursor-pointer max-w-[100px] sm:max-w-[130px]"
                  >
                    <option value="">-- 지점 선택 --</option>
                    {branchOptions.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="ADD_NEW">+ 직접 입력 추가</option>
                  </select>
                </div>
              )}
            </div>

            {/* 👤 3. 점검자 입력/선택 드롭다운 */}
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-xs border border-slate-200">
              <User className="w-3.5 h-3.5 text-blue-600" />
              {isCustomInspector ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="점검자 직접 입력"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="bg-white px-1.5 py-0.5 border rounded outline-none w-20 sm:w-24 font-medium text-xs text-slate-800"
                    autoFocus
                  />
                  <button onClick={() => setIsCustomInspector(false)} className="text-[10px] bg-slate-200 px-1 rounded hover:bg-slate-300 font-bold">선택</button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <select
                    value={inspectorName}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        setIsCustomInspector(true);
                        setInspectorName('');
                      } else {
                        setInspectorName(e.target.value);
                      }
                    }}
                    className="bg-transparent border-none outline-none font-medium text-slate-700 text-xs cursor-pointer max-w-[90px] sm:max-w-[120px]"
                  >
                    <option value="">-- 점검자 선택 --</option>
                    {inspectorOptions.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                    <option value="ADD_NEW">+ 직접 입력 추가</option>
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-xs border border-slate-200">
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
            홀 점검 {isHallComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          </button>
          <button
            onClick={() => setActiveTab('kitchen')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 border-b-2 transition-all ${
              activeTab === 'kitchen' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500'
            }`}
          >
            주방 점검 {isKitchenComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          </button>
          <button
            onClick={() => setActiveTab('final')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 border-b-2 transition-all ${
              activeTab === 'final' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500'
            }`}
          >
            최종 평가
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 border-b-2 transition-all ${
              activeTab === 'library' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" /> 보관함
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {activeTab === 'hall' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                {isItemListEn ? 'Hall Audit Items' : '홀 (Hall) 점검 항목'}
              </h2>
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded">WEIGHT 50%</span>
            </div>
            {renderItemGroups(HALL_ITEMS)}
          </div>
        )}

        {activeTab === 'kitchen' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                {isItemListEn ? 'Kitchen Audit Items' : '주방 (Kitchen) 점검 항목'}
              </h2>
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded">WEIGHT 50%</span>
            </div>
            {renderItemGroups(KITCHEN_ITEMS)}
          </div>
        )}

        {activeTab === 'final' && (
          <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500">홀 점수</p>
                <p className="text-lg sm:text-2xl font-black text-slate-800 mt-1">{calculateScores().hallScore}점</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded inline-block mt-0.5">
                  Grade {calculateScores().hallGrade}
                </span>
              </div>
              <div className="border-x border-slate-100">
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500">주방 점수</p>
                <p className="text-lg sm:text-2xl font-black text-slate-800 mt-1">{calculateScores().kitchenScore}점</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded inline-block mt-0.5">
                  Grade {calculateScores().kitchenGrade}
                </span>
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500">최종 점수</p>
                <p className="text-lg sm:text-2xl font-black text-blue-600 mt-1">{calculateScores().finalScore}점</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded inline-block mt-0.5">
                  Grade {calculateScores().finalGrade}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-sm">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b pb-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                이슈 및 요청사항 (Issues &amp; Comments)
              </h3>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">담당자 코멘트 (Manager Comment)</label>
                  <textarea
                    rows={2}
                    placeholder="담당자 점검 소감 및 개선 요청사항..."
                    value={managerComment}
                    onChange={(e) => setManagerComment(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">가맹점 코멘트 (Franchise/Owner Comment)</label>
                  <textarea
                    rows={2}
                    placeholder="가맹점주 의견 및 지원 필요사항..."
                    value={ownerComment}
                    onChange={(e) => setOwnerComment(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200">
                <p className="text-xs sm:text-sm font-bold text-slate-700 mb-2">점검자 서명</p>
                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                  <SignatureCanvas ref={managerSigRef} penColor="black" canvasProps={{ className: 'w-full h-28 sm:h-32' }} />
                </div>
                <button onClick={() => managerSigRef.current?.clear()} className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> 지우기
                </button>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200">
                <p className="text-xs sm:text-sm font-bold text-slate-700 mb-2">점주/매니저 서명</p>
                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                  <SignatureCanvas ref={ownerSigRef} penColor="black" canvasProps={{ className: 'w-full h-28 sm:h-32' }} />
                </div>
                <button onClick={() => ownerSigRef.current?.clear()} className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> 지우기
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 sm:py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-400 text-sm sm:text-base"
            >
              {isSubmitting 
                ? <><Loader2 className="w-4 h-4 animate-spin" /> DB 저장 중...</> 
                : <><Send className="w-4 h-4 sm:w-5 sm:h-5" /> DB 저장 및 최종 평가 완료</>
              }
            </button>
          </div>
        )}

        {/* 📂 보관함(Library) 탭 - 필터 및 정렬 제공 */}
        {activeTab === 'library' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base sm:text-lg font-bold text-slate-800">평가 결과 보관함</h2>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                  총 {filteredInspections.length}건
                </span>
              </div>

              <button
                onClick={fetchLibrary}
                className="text-xs bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 flex items-center gap-1 self-end sm:self-auto font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5" /> 새로고침
              </button>
            </div>

            {/* 🔍 국가, 지점, 점검자 필터 & 정렬바 */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-500 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" /> 필터:
                </span>

                {/* 국가 필터 */}
                <select
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 outline-none"
                >
                  <option value="ALL">🌐 전체 국가</option>
                  {countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* 지점 필터 */}
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 outline-none"
                >
                  <option value="ALL">🏢 전체 지점</option>
                  {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                </select>

                {/* 점검자 필터 */}
                <select
                  value={filterInspector}
                  onChange={(e) => setFilterInspector(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 outline-none"
                >
                  <option value="ALL">👤 전체 점검자</option>
                  {inspectorOptions.map(i => <option key={i} value={i}>{i}</option>)}
                </select>

                {(filterCountry !== 'ALL' || filterBranch !== 'ALL' || filterInspector !== 'ALL') && (
                  <button
                    onClick={() => {
                      setFilterCountry('ALL');
                      setFilterBranch('ALL');
                      setFilterInspector('ALL');
                    }}
                    className="text-[11px] text-red-500 hover:underline font-bold"
                  >
                    필터 초기화
                  </button>
                )}
              </div>

              {/* 정렬 드롭다운 */}
              <div className="flex items-center gap-1.5 ml-auto">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="latest">최신순</option>
                  <option value="oldest">과거순</option>
                  <option value="scoreHigh">점수 높은순</option>
                  <option value="scoreLow">점수 낮은순</option>
                  <option value="country">국가명순</option>
                  <option value="branch">지점명순</option>
                </select>
              </div>
            </div>

            {isLoadingLibrary ? (
              <div className="p-12 text-center text-slate-500 text-xs sm:text-sm">Supabase DB에서 목록을 불러오는 중입니다...</div>
            ) : filteredInspections.length === 0 ? (
              <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs sm:text-sm">
                조건에 맞는 점검 결과가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {filteredInspections.map((item) => (
                  <div key={item.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {item.country || '한국 (Korea)'}
                          </span>
                          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                            {item.branch_name || '지점 미지정'}
                          </span>
                          {item.language === 'en' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                              EN
                            </span>
                          )}
                        </div>
                        
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base mt-1.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatDateTimeDisplay(item)}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">점검자: {item.inspector_name}</p>
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
                        홀 {item.hall_score}점 | 주방 {item.kitchen_score}점
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedInspection(item);
                            setIsEditing(false);
                          }}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> 상세 보고서 / PDF
                        </button>
                        <button
                          onClick={() => handleDeleteInspection(item)}
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
              <RefreshCw className="w-3 h-3" /> 초기화
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
                {isHallComplete ? '홀 완료 (다음)' : '홀 미완료'}
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
                {isKitchenComplete ? '주방 완료 (최종서명)' : '주방 미완료'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* 사진 첨부 모달 */}
      {activePhotoModalItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 print:hidden">
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm truncate pr-2">
                사진 첨부 ({isItemListEn ? (activePhotoModalItem.taskEn || activePhotoModalItem.task) : activePhotoModalItem.task})
              </h3>
              <button onClick={() => setActivePhotoModalItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3">
              <div className="grid grid-cols-3 gap-2 mb-3">
                {(photos[activePhotoModalItem.id] || []).map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                    <img src={img} alt="증빙" className="w-full h-full object-cover" loading="lazy" />
                    
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
                disabled={isUploadingPhoto}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 hover:border-blue-500 hover:text-blue-600 transition-all disabled:bg-slate-100"
              >
                {isUploadingPhoto ? (
                  <><Loader2 className="w-4 h-4 animate-spin text-blue-600" /> 고화질 업로드 중...</>
                ) : (
                  <><Camera className="w-4 h-4" /> 사진 촬영 / 앨범 선택</>
                )}
              </button>
            </div>

            <button
              onClick={() => setActivePhotoModalItem(null)}
              className="w-full py-2 bg-slate-800 text-white font-bold rounded-xl text-xs"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 모달 상세보기 및 수정 */}
      {selectedInspection && (() => {
        const isReportEn = selectedInspection.language === 'en';

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto print-modal-overlay">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-3.5 sm:p-6 shadow-2xl relative my-4 sm:my-8 max-h-[95vh] overflow-y-auto print-modal-container">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 sticky top-0 bg-white z-10 print:hidden gap-2">
                <h3 className="font-bold text-slate-800 text-sm sm:text-lg">
                  {isEditing 
                    ? (isReportEn ? '✏️ Editing Report' : '✏️ 점검 리포트 수정 중') 
                    : (isReportEn ? 'QSC Inspection Report' : '상세 QSC 점검 리포트')
                  }
                </h3>
                
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={() => startEditing(selectedInspection)}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] sm:text-xs font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 shadow"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isReportEn ? 'Edit' : '수정'}</span>
                      </button>
                      <button
                        onClick={handlePrintPDF}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 shadow"
                      >
                        <Printer className="w-3 h-3" />
                        <span>{isReportEn ? 'PDF' : 'PDF / 인쇄'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteInspection(selectedInspection)}
                        className="bg-red-50 text-red-600 hover:bg-red-100 text-[11px] sm:text-xs font-bold px-2 py-1.5 rounded-lg flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{isReportEn ? 'Delete' : '삭제'}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isReportEn ? 'Save' : '수정 저장'}</span>
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="bg-slate-200 text-slate-700 text-[11px] sm:text-xs font-bold px-2.5 py-1.5 rounded-lg"
                      >
                        {isReportEn ? 'Cancel' : '취소'}
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
                    {isReportEn ? 'QSC Audit Evaluation Report' : 'QSC 점검 종합 평가 리포트'}
                  </h2>
                  
                  {isEditing ? (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <span className="text-[11px] font-bold text-slate-500">{isReportEn ? 'Date & Time:' : '점검 일시:'}</span>
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
                      {isReportEn ? 'Inspection Date & Time:' : '점검 일시:'} {formatDateTimeDisplay(selectedInspection)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-slate-50 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-700 mr-1">{isReportEn ? 'Country:' : '국가:'}</span> 
                    {isEditing ? (
                      <input
                        type="text"
                        value={editCountry}
                        onChange={(e) => setEditCountry(e.target.value)}
                        className="bg-white border rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 w-full mt-0.5"
                      />
                    ) : (
                      selectedInspection.country || '한국 (Korea)'
                    )}
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 mr-1">{isReportEn ? 'Branch:' : '지점명:'}</span> 
                    {isEditing ? (
                      <input
                        type="text"
                        value={editBranchName}
                        onChange={(e) => setEditBranchName(e.target.value)}
                        className="bg-white border rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 w-full mt-0.5"
                      />
                    ) : (
                      selectedInspection.branch_name
                    )}
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 mr-1">{isReportEn ? 'Inspector:' : '점검자:'}</span> 
                    {isEditing ? (
                      <input
                        type="text"
                        value={editInspectorName}
                        onChange={(e) => setEditInspectorName(e.target.value)}
                        className="bg-white border rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 w-full mt-0.5"
                      />
                    ) : (
                      selectedInspection.inspector_name
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center bg-blue-50/50 p-2.5 sm:p-4 rounded-xl border border-blue-100">
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500">{isReportEn ? 'Hall Score' : '홀 점수'}</p>
                    <p className="text-sm sm:text-xl font-black text-slate-800 mt-0.5">
                      {isEditing ? calculateScores(editDetails).hallScore : selectedInspection.hall_score} {isReportEn ? 'pts' : '점'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500">{isReportEn ? 'Kitchen Score' : '주방 점수'}</p>
                    <p className="text-sm sm:text-xl font-black text-slate-800 mt-0.5">
                      {isEditing ? calculateScores(editDetails).kitchenScore : selectedInspection.kitchen_score} {isReportEn ? 'pts' : '점'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500">{isReportEn ? 'Total Score' : '최종 점수'}</p>
                    <p className="text-sm sm:text-xl font-black text-blue-600 mt-0.5">
                      {isEditing ? calculateScores(editDetails).finalScore : selectedInspection.final_score} {isReportEn ? 'pts' : '점'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> 
                    {isReportEn ? 'Detailed Checklist Items' : '세부 점검 항목 평가 내역'}
                  </h4>
                  
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[340px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 text-[10px] sm:text-xs font-bold border-b border-slate-200">
                          <th className="p-1.5 text-center w-8 border-r border-slate-200">No.</th>
                          <th className="p-1.5 border-r border-slate-200">{isReportEn ? 'Category' : '카테고리'}</th>
                          <th className="p-1.5 border-r border-slate-200">{isReportEn ? 'Checklist Item' : '점검 항목 내용'}</th>
                          <th className="p-1.5 text-center border-r border-slate-200">{isReportEn ? 'Result' : '평가 결과'}</th>
                          <th className="p-1.5 text-center">{isReportEn ? 'Photo' : '첨부 사진'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderDetailReportItems(selectedInspection.details, selectedInspection.evidence_photos, selectedInspection.language)}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> 
                    {isReportEn ? 'Issues & Requests' : '이슈 및 요청사항'}
                  </h4>

                  <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                    <table className="w-full border-collapse">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="w-28 bg-slate-100 font-bold text-slate-700 p-2.5 text-center border-r border-slate-300">
                            {isReportEn ? 'Manager' : '담당자'}
                          </td>
                          <td className="p-2.5 text-slate-800 font-medium bg-white">
                            {isEditing ? (
                              <textarea
                                rows={2}
                                value={editManagerComment}
                                onChange={(e) => setEditManagerComment(e.target.value)}
                                className="w-full p-2 border rounded text-xs outline-none"
                                placeholder={isReportEn ? 'Manager comment...' : '담당자 코멘트...'}
                              />
                            ) : (
                              selectedInspection.manager_comment || <span className="text-slate-300">{isReportEn ? 'N/A' : '내용 없음'}</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="w-28 bg-slate-100 font-bold text-slate-700 p-2.5 text-center border-r border-slate-300">
                            {isReportEn ? 'Franchise' : '가맹점'}
                          </td>
                          <td className="p-2.5 text-slate-800 font-medium bg-white">
                            {isEditing ? (
                              <textarea
                                rows={2}
                                value={editOwnerComment}
                                onChange={(e) => setEditOwnerComment(e.target.value)}
                                className="w-full p-2 border rounded text-xs outline-none"
                                placeholder={isReportEn ? 'Franchise comment...' : '가맹점 코멘트...'}
                              />
                            ) : (
                              selectedInspection.owner_comment || <span className="text-slate-300">{isReportEn ? 'N/A' : '내용 없음'}</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                  <div className="text-center">
                    <p className="text-[11px] font-bold text-slate-600 mb-1.5">{isReportEn ? 'Inspector Sig' : '점검자 서명'}</p>
                    {selectedInspection.manager_signature ? (
                      <img src={selectedInspection.manager_signature} alt="점검자 서명" className="h-16 sm:h-20 mx-auto object-contain border rounded-lg bg-white shadow-sm p-1" />
                    ) : <span className="text-[10px] text-slate-400">N/A</span>}
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-bold text-slate-600 mb-1.5">{isReportEn ? 'Owner/Manager Sig' : '점주/매니저 서명'}</p>
                    {selectedInspection.owner_signature ? (
                      <img src={selectedInspection.owner_signature} alt="점주 서명" className="h-16 sm:h-20 mx-auto object-contain border rounded-lg bg-white shadow-sm p-1" />
                    ) : <span className="text-[10px] text-slate-400">N/A</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 사진 확대 모달 */}
      {enlargedImage && (
        <div 
          onClick={() => setEnlargedImage(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 cursor-pointer print:hidden"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <img src={enlargedImage} alt="확대보기" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain bg-white" />
            <button 
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-8 right-0 text-white hover:text-slate-300 font-bold text-xs flex items-center gap-1"
            >
              <X className="w-5 h-5" /> 닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
