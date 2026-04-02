// frontend/src/pages/MechanicServiceEntry.jsx
/**
 * 정비사용 정비 입력 폼
 * - 가동시간 대형 숫자 키패드
 * - 부품 멀티 셀렉트
 * - OCR 미리보기 모달
 * - 정비 기록 저장
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  Save, 
  Plus, 
  Minus, 
  X,
  Clock,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  LogOut,
  Home
} from 'lucide-react';
import { 
  getMachineByQRScan, 
  createMaintenanceLog,
  searchParts 
} from '../services/mechanic-api';

export default function MechanicServiceEntry() {
  const navigate = useNavigate();
  const { vin } = useParams();
  
  // 로그아웃 기능
  const handleLogout = () => {
    localStorage.removeItem('agrilog_user_type');
    navigate('/');
  };

  // 대시보드로 이동
  const handleGoToDashboard = () => {
    navigate('/mechanic/dashboard');
  };
  
  // 폼 데이터
  const [machineData, setMachineData] = useState(null);
  const [currentHours, setCurrentHours] = useState('');
  const [selectedParts, setSelectedParts] = useState([]);
  const [serviceCompany, setServiceCompany] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalCost, setTotalCost] = useState('');
  const [notes, setNotes] = useState('');
  
  // OCR 관련
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [processingOCR, setProcessingOCR] = useState(false);
  
  // 상태
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showNumberPad, setShowNumberPad] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (vin) {
      loadMachineData(vin);
    }
  }, [vin]);

  const loadMachineData = async (vin) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getMachineByQRScan(vin);
      setMachineData(data);
      setCurrentHours(data.machine_info.total_hours.toString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 부품 추가
  const addPart = () => {
    setSelectedParts([...selectedParts, {
      id: Date.now(),
      part_name: '',
      quantity: 1,
      unit_cost: 0,
      total_cost: 0
    }]);
  };

  // 부품 제거
  const removePart = (id) => {
    setSelectedParts(selectedParts.filter(part => part.id !== id));
  };

  // 부품 정보 업데이트
  const updatePart = (id, field, value) => {
    setSelectedParts(selectedParts.map(part => {
      if (part.id === id) {
        const updated = { ...part, [field]: value };
        if (field === 'quantity' || field === 'unit_cost') {
          updated.total_cost = updated.quantity * updated.unit_cost;
        }
        return updated;
      }
      return part;
    }));
  };

  // 총 비용 계산
  const calculateTotalCost = () => {
    const partsTotal = selectedParts.reduce((sum, part) => sum + part.total_cost, 0);
    return partsTotal;
  };

  useEffect(() => {
    setTotalCost(calculateTotalCost().toString());
  }, [selectedParts]);

  // OCR 처리
  const handleOCRProcessing = async () => {
    setProcessingOCR(true);
    setError(null);

    try {
      // 이미지 파일이 있는 경우
      if (!selectedImage) {
        setError('OCR 처리를 위해 이미지를 선택해주세요.');
        return;
      }

      // Google Vision API로 OCR 처리
      const { processGoogleVisionOCR } = await import('../services/api');
      const ocrData = await processGoogleVisionOCR(selectedImage);
      
      // OCR 결과 저장
      setOcrResult({
        text: ocrData.text,
        confidence: ocrData.confidence,
        blocks: ocrData.blocks || [],
      });
      
      // 추출된 정보로 폼 데이터 자동 채우기
      const extracted = extractReceiptInfo(ocrData.text);
      
      console.log('OCR 추출 결과:', extracted);
      
      // OCR 결과를 폼에 적용
      if (extracted.vendor) {
        setServiceCompany(extracted.vendor);
      }
      if (extracted.cost) {
        setTotalCost(extracted.cost.toString());
      }
      if (extracted.date) {
        setServiceDate(extracted.date);
      }
      if (extracted.description) {
        setNotes(extracted.description);
      }
      
      // 부품 정보가 있는 경우 적용
      if (extracted.parts && extracted.parts.length > 0) {
        const newParts = extracted.parts.map(part => ({
          id: Date.now() + Math.random(),
          part_name: part.name,
          quantity: part.quantity || 1,
          unit_cost: part.cost / (part.quantity || 1),
          total_cost: part.cost
        }));
        setSelectedParts(newParts);
      }
      
      setShowOCRModal(true);
      
    } catch (err) {
      console.error('OCR 처리 실패:', err);
      setError('OCR 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessingOCR(false);
    }
  };

  // OCR 이미지 업로드 처리
  const handleOCRUpload = async (file) => {
    setSelectedImage(file);
    
    // 이미지 미리보기 설정
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result);
    };
    reader.readAsDataURL(file);
    
    // 자동으로 OCR 처리 실행
    await handleOCRProcessing();
  };

  /**
   * OCR 텍스트에서 정보 추출 (OCRScanner.jsx와 동일한 로직)
   */
  const extractReceiptInfo = (text) => {
    console.log('=== OCR 텍스트 파싱 시작 ===');
    console.log('원본 텍스트:', text);
    
    // 기대번호 추출 (DI0060240001, DI 006024000 등)
    let extractedVin = '';
    
    // 1. 일반 패턴: DI0060240001 (9-13자리)
    const vinMatch = text.match(/[A-Z]{2}\d{9,13}/i);
    if (vinMatch) {
      extractedVin = vinMatch[0].toUpperCase();
    } else {
      // 2. 공백 포함 패턴: DI 0060240001
      const vinMatchWithSpace = text.match(/([A-Z]{2})\s*(\d{9,13})/i);
      if (vinMatchWithSpace) {
        extractedVin = vinMatchWithSpace[1].toUpperCase() + vinMatchWithSpace[2];
      } else {
        // 3. 라인별 패턴: 기대 번호: DI 0060240001
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.includes('기대') && line.includes('번호')) {
            const lineMatch = line.match(/([A-Z]{2})\s*(\d{9,13})/i);
            if (lineMatch) {
              extractedVin = lineMatch[1].toUpperCase() + lineMatch[2];
              break;
            }
          }
        }
      }
    }
    console.log('추출된 기대번호:', extractedVin);
    
    // 날짜 추출 (YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD)
    const dateMatch = text.match(/(\d{4}[-./]\d{2}[-./]\d{2})/);
    const extractedDate = dateMatch ? dateMatch[1].replace(/[./]/g, '-') : '';
    console.log('추출된 날짜:', extractedDate);
    
    // 금액 추출 - "수리비", "최종 합계" 또는 큰 금액 찾기
    const lines = text.split('\n');
    let cost = '';
    
    // 1. 수리비 패턴: 수리비: 1000000
    for (const line of lines) {
      if (line.includes('수리비') || line.includes('비용') || line.includes('금액')) {
        const match = line.match(/(\d{1,3}(?:,\d{3})+|\d{6,})/);
        if (match) {
          cost = match[1].replace(/,/g, '');
          console.log('수리비에서 추출:', cost);
          break;
        }
      }
    }
    
    // 2. 최종 합계 라인 찾기
    if (!cost) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('최종') && line.includes('합계')) {
          console.log('최종 합계 라인 발견:', line);
          
          // 현재 라인에서 금액 찾기
          let amounts = line.match(/(\d{1,3}(?:,\d{3})+)/g);
          if (amounts && amounts.length > 0) {
            cost = amounts[amounts.length - 1].replace(/,/g, '');
            console.log('현재 라인에서 추출:', cost);
            break;
          }
          
          // 다음 라인에서 금액 찾기
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            amounts = nextLine.match(/(\d{1,3}(?:,\d{3})+)/g);
            if (amounts && amounts.length > 0) {
              cost = amounts[amounts.length - 1].replace(/,/g, '');
              console.log('다음 라인에서 추출:', cost);
              break;
            }
          }
        }
      }
    }
    
    // 3. 가장 큰 금액 찾기 (6자리 이상)
    if (!cost) {
      const allAmounts = text.match(/(\d{1,3}(?:,\d{3})+|\d{6,})/g);
      if (allAmounts && allAmounts.length > 0) {
        // 6자리 이상 숫자만 필터링
        const validAmounts = allAmounts.filter(amount => amount.replace(/,/g, '').length >= 6);
        if (validAmounts.length > 0) {
          cost = validAmounts[validAmounts.length - 1].replace(/,/g, '');
          console.log('가장 큰 금액 추출:', cost);
        }
      }
    }
    
    // 작업 내용 추출 - "정비사 소견" 또는 키워드 포함 라인
    let description = '';
    
    // 1. 정비사 소견 찾기
    const opinionIndex = lines.findIndex(line => line.includes('정비사') && line.includes('소견'));
    if (opinionIndex !== -1 && opinionIndex < lines.length - 1) {
      description = lines[opinionIndex + 1].trim();
      console.log('정비사 소견에서 추출:', description);
    }
    
    // 2. 소견이 없으면 키워드 기반 추출
    if (!description) {
      const keywords = ['정비', '수리', '교체', '교환', '점검', '오일', '필터', '타이어', '부품', '동력', '유압'];
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && keywords.some(kw => trimmedLine.includes(kw)) && trimmedLine.length > 5) {
          description = trimmedLine;
          console.log('키워드에서 추출:', description);
          break;
        }
      }
    }
    
    // 서비스 업체명 추출
    let vendor = '';
    
    // 1. "서비스센터", "정비소" 등 키워드가 포함된 라인 찾기
    const vendorKeywords = ['서비스센터', '정비소', '농기계', '대동', 'LS', '두산', '현대', 'Yanmar', 'Kubota'];
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && vendorKeywords.some(kw => trimmedLine.includes(kw)) && trimmedLine.length > 3) {
        vendor = trimmedLine;
        console.log('서비스 업체명 추출:', vendor);
        break;
      }
    }
    
    // 2. 상단 라인에서 업체명 찾기 (보통 상단에 위치)
    if (!vendor && lines.length > 0) {
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i].trim();
        if (line && line.length > 5 && !line.match(/\d{4}[-./]\d{2}[-./]\d{2}/) && !line.includes('수리비')) {
          vendor = line;
          console.log('상단 라인에서 서비스 업체명 추출:', vendor);
          break;
        }
      }
    }
    
    // 부품 정보 추출 (간단한 패턴 기반)
    let parts = [];
    
    // 부품 관련 키워드가 포함된 라인에서 부품 정보 추출
    const partKeywords = ['오일', '필터', '부품', '타이어', '벨트', '와이퍼', '전구', '밧데리'];
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && partKeywords.some(kw => trimmedLine.includes(kw))) {
        // 간단한 부품명 추출
        const partName = trimmedLine.split(' ')[0] || trimmedLine;
        
        // 금액 정보 추출
        const amountMatch = trimmedLine.match(/(\d{1,3}(?:,\d{3})+|\d{4,})/);
        const partCost = amountMatch ? parseInt(amountMatch[1].replace(/,/g, '')) : 0;
        
        if (partName && partCost > 0) {
          parts.push({
            name: partName,
            quantity: 1,
            cost: partCost
          });
        }
      }
    }
    
    const result = {
      vin: extractedVin,
      date: extractedDate,
      cost: cost,
      description: description,
      vendor: vendor,
      parts: parts,
      fullText: text,
    };
    
    console.log('=== 최종 추출 결과 ===', result);
    return result;
  };

  // OCR 결과 적용
  const applyOCRResult = () => {
    if (ocrResult) {
      setServiceCompany(ocrResult.vendor);
      setTotalCost(ocrResult.cost.toString());
      setServiceDate(ocrResult.date);
      setNotes(ocrResult.description);
      
      // 부품 정보 적용
      if (ocrResult.parts && ocrResult.parts.length > 0) {
        const newParts = ocrResult.parts.map(part => ({
          id: Date.now() + Math.random(),
          part_name: part.name,
          quantity: part.quantity,
          unit_cost: part.cost / part.quantity,
          total_cost: part.cost
        }));
        setSelectedParts(newParts);
      }
      
      setShowOCRModal(false);
    }
  };

  // 저장
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setError(null);

    try {
      const maintenanceData = {
        vin: vin,
        service_date: serviceDate,
        service_company: serviceCompany,
        total_hours: parseInt(currentHours),
        total_cost: parseInt(totalCost) || 0,
        notes: notes,
        parts: selectedParts.map(part => ({
          part_name: part.part_name,
          quantity: part.quantity,
          unit_cost: part.unit_cost
        }))
      };

      const result = await createMaintenanceLog(maintenanceData);
      
      alert('정비 기록이 성공적으로 저장되었습니다.');
      navigate('/mechanic/dashboard');
      
    } catch (err) {
      setError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const validateForm = () => {
    if (!currentHours || isNaN(currentHours)) {
      setError('가동시간을 올바르게 입력해주세요.');
      return false;
    }

    if (!serviceCompany.trim()) {
      setError('정비업체명을 입력해주세요.');
      return false;
    }

    if (selectedParts.length === 0) {
      setError('최소 하나 이상의 부품을 추가해주세요.');
      return false;
    }

    const invalidParts = selectedParts.filter(part => 
      !part.part_name.trim() || part.quantity <= 0 || part.unit_cost <= 0
    );

    if (invalidParts.length > 0) {
      setError('부품 정보를 올바르게 입력해주세요.');
      return false;
    }

    return true;
  };

  // 숫자 키패드
  const NumberPad = ({ value, onChange, onClose }) => {
    const handleNumber = (num) => {
      onChange(value + num);
    };

    const handleDelete = () => {
      onChange(value.slice(0, -1));
    };

    const handleClear = () => {
      onChange('');
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">가동시간 입력</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4 mb-6 text-center">
            <div className="text-3xl font-bold text-white">{value || '0'}</div>
            <div className="text-sm text-gray-400 mt-1">시간</div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleNumber(num.toString())}
                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-xl font-semibold transition-colors"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="p-4 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 font-semibold transition-colors"
            >
              C
            </button>
            <button
              onClick={() => handleNumber('0')}
              className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-xl font-semibold transition-colors"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="p-4 bg-yellow-600/20 hover:bg-yellow-600/30 rounded-lg text-yellow-400 font-semibold transition-colors"
            >
              ←
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="w-full p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-xl text-gray-300">장비 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* 헤더 */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/mechanic/dashboard')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg mr-4"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">정비 기록 등록</h1>
                  <p className="text-sm text-gray-400">{machineData?.machine_info?.vin}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleGoToDashboard}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                title="대시보드"
              >
                <Home className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                title="로그아웃"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 장비 정보 요약 */}
        {machineData && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">장비 정보</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-400">모델명</div>
                <div className="text-white font-semibold">{machineData.machine_info.model_name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">제조사</div>
                <div className="text-white font-semibold">{machineData.machine_info.manufacturer}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">생산연식</div>
                <div className="text-white font-semibold">{machineData.machine_info.production_year}년</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">현재 가동시간</div>
                <div className="text-white font-semibold">{machineData.machine_info.total_hours}시간</div>
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-xl p-6 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-3 mt-1" />
              <div>
                <h3 className="text-red-400 font-semibold mb-1">오류</h3>
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 정비 정보 입력 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <h3 className="text-lg font-semibold text-white mb-6">정비 정보</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 가동시간 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                가동시간 *
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowNumberPad(true)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-left hover:bg-gray-600 transition-colors flex items-center justify-between"
                >
                  <span className="text-2xl font-bold">{currentHours || '0'}</span>
                  <Clock className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">현재 가동시간: {machineData?.machine_info?.total_hours}시간</p>
            </div>

            {/* 정비업체 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                정비업체 *
              </label>
              <input
                type="text"
                value={serviceCompany}
                onChange={(e) => setServiceCompany(e.target.value)}
                placeholder="정비업체명을 입력하세요"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 정비일자 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                정비일자 *
              </label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 총 비용 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                총 비용
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">부품 비용 자동 계산됨</p>
            </div>
          </div>

          {/* 비고 */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              비고
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="추가적인 정비 내용을 입력하세요"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 부품 목록 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">사용 부품</h3>
            <button
              onClick={addPart}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              부품 추가
            </button>
          </div>

          {selectedParts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400">부품을 추가해주세요</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedParts.map((part) => (
                <div key={part.id} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">부품명</label>
                      <input
                        type="text"
                        value={part.part_name}
                        onChange={(e) => updatePart(part.id, 'part_name', e.target.value)}
                        placeholder="부품명"
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">수량</label>
                      <div className="flex items-center">
                        <button
                          onClick={() => updatePart(part.id, 'quantity', Math.max(1, part.quantity - 1))}
                          className="p-1 bg-gray-600 hover:bg-gray-500 rounded text-white"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={part.quantity}
                          onChange={(e) => updatePart(part.id, 'quantity', parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-center text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <button
                          onClick={() => updatePart(part.id, 'quantity', part.quantity + 1)}
                          className="p-1 bg-gray-600 hover:bg-gray-500 rounded text-white"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">단가</label>
                      <input
                        type="number"
                        value={part.unit_cost}
                        onChange={(e) => updatePart(part.id, 'unit_cost', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-400">합계</div>
                        <div className="text-lg font-bold text-green-400">
                          {part.total_cost.toLocaleString()}원
                        </div>
                      </div>
                      <button
                        onClick={() => removePart(part.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* OCR 스캔 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">정비명세서 스캔</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-6 py-4 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white font-semibold transition-colors flex items-center justify-center"
            >
              <Upload className="w-5 h-5 mr-2" />
              이미지 업로드
            </button>
            <button
              onClick={() => setShowOCRModal(true)}
              className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors flex items-center justify-center"
            >
              <Camera className="w-5 h-5 mr-2" />
              카메라 촬영
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleOCRUpload(file);
            }}
            className="hidden"
          />
        </div>

        {/* 저장 버튼 */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/mechanic/dashboard')}
            className="flex-1 px-6 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                정비 기록 저장
              </>
            )}
          </button>
        </div>
      </div>

      {/* 숫자 키패드 모달 */}
      {showNumberPad && (
        <NumberPad
          value={currentHours}
          onChange={setCurrentHours}
          onClose={() => setShowNumberPad(false)}
        />
      )}

      {/* OCR 결과 모달 */}
      {showOCRModal && ocrResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">OCR 스캔 결과</h3>
              <button
                onClick={() => setShowOCRModal(false)}
                className="p-2 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewImage && (
              <div className="mb-6">
                <img
                  src={previewImage}
                  alt="Scanned receipt"
                  className="w-full h-64 object-contain bg-gray-700 rounded-lg"
                />
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">정비업체</div>
                <div className="text-white font-semibold">{ocrResult.vendor}</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">총 비용</div>
                <div className="text-white font-semibold">{ocrResult.cost.toLocaleString()}원</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">정비일자</div>
                <div className="text-white font-semibold">{ocrResult.date}</div>
              </div>
              {ocrResult.parts && ocrResult.parts.length > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">추출된 부품</div>
                  <div className="space-y-2">
                    {ocrResult.parts.map((part, index) => (
                      <div key={index} className="flex justify-between text-white">
                        <span>{part.name}</span>
                        <span>{part.quantity}개 × {part.cost.toLocaleString()}원</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowOCRModal(false)}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors"
              >
                취소
              </button>
              <button
                onClick={applyOCRResult}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
              >
                결과 적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
