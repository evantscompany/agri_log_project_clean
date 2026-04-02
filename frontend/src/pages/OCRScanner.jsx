// frontend/src/pages/OCRScanner.jsx
/**
 * OCR 스캐너 페이지
 * - 정비명세서 이미지 촬영/업로드
 * - Google Vision API로 OCR 텍스트 추출
 * - 추출된 데이터 검증 및 수정
 * - 기대번호 검증
 * - DB에 정비 이력 저장
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Upload, Loader2, CheckCircle, XCircle, AlertTriangle, Save, Edit2 } from 'lucide-react';
import { uploadMaintenanceImage, processOCRAndSave, processGoogleVisionOCR } from '../services/api';

export default function OCRScanner() {
  const navigate = useNavigate();
  
  // 상태 관리
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState(null);
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedImagePath, setUploadedImagePath] = useState(null);
  
  // 편집 모드 및 폼 데이터
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    vin: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    cost: '',
    mileage: '',
  });
  const [vinError, setVinError] = useState(null);
  const [vinWarning, setVinWarning] = useState(null);
  const [existingMachine, setExistingMachine] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  /**
   * 이미지 파일 처리: 업로드 → OCR 실행
   */
  const processImage = async (file) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setOcrResult(null);
    setUploadedFile(file);

    // 이미지 미리보기 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result);
    };
    reader.readAsDataURL(file);

    try {
      // 1단계: 이미지를 서버에 업로드 및 압축
      setProgress(10);
      const uploadResult = await uploadMaintenanceImage(file);
      setUploadedImagePath(uploadResult.file_info.saved_path);
      
      // 2단계: Google Vision API로 OCR 처리
      setProgress(30);
      const ocrData = await processGoogleVisionOCR(file);
      
      setProgress(100);
      
      // OCR 결과 저장
      setOcrResult({
        text: ocrData.text,
        confidence: ocrData.confidence,
        blocks: ocrData.blocks || [],
      });
      
      // 추출된 정보로 폼 데이터 자동 채우기
      const extracted = extractReceiptInfo(ocrData.text);
      
      // 추출된 데이터를 formData에 설정
      const newFormData = {
        vin: extracted.vin || '',
        date: extracted.date || new Date().toISOString().split('T')[0],
        description: extracted.description || '',
        cost: extracted.cost || '',
        mileage: '',
      };
      
      setFormData(newFormData);
      
      console.log('추출된 데이터:', extracted);
      console.log('폼 데이터 설정:', newFormData);
      
      // 자동으로 편집 모드 활성화
      setIsEditing(true);
      
    } catch (err) {
      console.error('이미지 처리 실패:', err);
      setError(err.message || '이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  /**
   * OCR 텍스트에서 정보 추출
   */
  const extractReceiptInfo = (text) => {
    console.log('=== OCR 텍스트 파싱 시작 ===');
    console.log('원본 텍스트:', text);
    
    // 기대번호 추출 (DI0060240001, DI 006024000 등)
    // 패턴: 영문 2자 + 숫자 8-12자 (공백 포함)
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
    
    const result = {
      vin: extractedVin,
      date: extractedDate,
      cost: cost,
      description: description,
      fullText: text,
    };
    
    console.log('=== 최종 추출 결과 ===', result);
    return result;
  };

  /**
   * 폼 입력값 변경 처리
   */
  const handleFormChange = async (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 기대번호 변경 시 에러 초기화 및 기존 농기계 확인
    if (field === 'vin') {
      setVinError(null);
      setVinWarning(null);
      setExistingMachine(null);
      setModelInfo(null);
      
      // 기대번호가 10자 이상일 때 기존 농기계 확인
      if (value && value.length >= 10) {
        try {
          const { getMachineDetail } = await import('../services/api');
          const machineData = await getMachineDetail(value);
          
          if (machineData && machineData.machine) {
            setExistingMachine(machineData.machine);
            setModelInfo({
              model_name: machineData.machine.model_name,
              manufacturer_name: machineData.machine.manufacturer_name,
              production_year: machineData.machine.production_year
            });
            setVinWarning(`이미 등록된 농기계입니다: ${machineData.machine.model_name || '모델명 없음'}`);
          }
        } catch (error) {
          // 농기계가 없으면 VIN 파싱으로 모델 정보 조회
          console.log('새로운 농기계입니다. VIN 파싱 시도...');
          
          try {
            // VIN 파싱 API 호출
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/machines/parse-vin/${value}`);
            if (response.ok) {
              const vinData = await response.json();
              if (vinData.success && vinData.data) {
                setModelInfo({
                  model_name: vinData.data.model_name,
                  manufacturer_name: vinData.data.manufacturer_name,
                  production_year: vinData.data.production_year
                });
                console.log('VIN 파싱 성공:', vinData.data);
              }
            }
          } catch (vinError) {
            console.log('VIN 파싱 실패:', vinError);
          }
        }
      }
    }
  };

  /**
   * 기대번호 검증
   */
  const validateVIN = (vin) => {
    if (!vin || vin.length < 10) {
      return '기대번호가 너무 짧습니다. (최소 10자)';
    }
    
    // 기본 형식 검증 (영문 2자 + 영숫자)
    const vinPattern = /^[A-Z]{2}[A-Z0-9]+$/i;
    if (!vinPattern.test(vin)) {
      return '기대번호 형식이 올바르지 않습니다.';
    }
    
    return null;
  };

  /**
   * 데이터 저장 처리
   */
  const handleSave = async () => {
    // 입력값 검증
    if (!formData.vin.trim()) {
      alert('기대번호를 입력해주세요.');
      return;
    }
    
    // 기대번호 검증
    const vinValidationError = validateVIN(formData.vin);
    if (vinValidationError) {
      setVinError(vinValidationError);
      const confirmSave = confirm(
        `경고: ${vinValidationError}\n\n그래도 저장하시겠습니까?\n(취소를 누르면 저장되지 않습니다.)`
      );
      if (!confirmSave) {
        return;
      }
    }
    
    if (!formData.description.trim()) {
      alert('작업 내용을 입력해주세요.');
      return;
    }
    
    if (!formData.cost || Number(formData.cost) <= 0) {
      alert('비용을 입력해주세요.');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // OCR 데이터와 함께 저장
      const saveData = {
        vin: formData.vin.toUpperCase(),
        date: formData.date,
        description: formData.description,
        cost: Number(formData.cost),
        image_path: uploadedImagePath,
        ocr_text: ocrResult?.text,
      };
      
      if (formData.mileage && Number(formData.mileage) > 0) {
        saveData.mileage = Number(formData.mileage);
      }
      
      const result = await processOCRAndSave(saveData);
      
      alert('정비 이력이 성공적으로 저장되었습니다!');
      
      // 저장 후 해당 농기계 상세 페이지로 이동
      navigate(`/machine/${result.vin}`);
      
    } catch (err) {
      console.error('저장 실패:', err);
      alert(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 건너뛰기 (OCR 없이 수동 입력)
   */
  const handleSkip = () => {
    const confirmSkip = confirm('OCR 데이터를 사용하지 않고 건너뛰시겠습니까?');
    if (confirmSkip) {
      navigate('/');
    }
  };

  const extractedInfo = ocrResult ? extractReceiptInfo(ocrResult.text) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-3 text-gray-700 hover:text-green-600 mb-6 text-xl font-semibold transition-colors"
      >
        <ArrowLeft className="w-8 h-8" strokeWidth={2.5} />
        <span>돌아가기</span>
      </button>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">영수증 스캔</h1>
        <p className="text-xl text-gray-600 mb-8">카메라로 촬영하거나 이미지를 선택하세요</p>

        {!previewImage && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-12 shadow-lg hover:shadow-xl transition-all"
            >
              <Camera className="w-20 h-20 mx-auto mb-4" strokeWidth={2.5} />
              <div className="text-2xl font-bold">카메라로 촬영</div>
              <div className="text-lg opacity-90 mt-2">지금 바로 촬영하기</div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-green-600 hover:bg-green-700 text-white rounded-2xl p-12 shadow-lg hover:shadow-xl transition-all"
            >
              <Upload className="w-20 h-20 mx-auto mb-4" strokeWidth={2.5} />
              <div className="text-2xl font-bold">갤러리에서 선택</div>
              <div className="text-lg opacity-90 mt-2">저장된 사진 선택</div>
            </button>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {previewImage && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">촬영된 이미지</h2>
            <img
              src={previewImage}
              alt="Preview"
              className="w-full max-h-96 object-contain rounded-xl mb-6"
            />

            {isProcessing && (
              <div className="text-center py-8">
                <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" strokeWidth={2.5} />
                <p className="text-2xl font-bold text-gray-900 mb-2">이미지 분석 중...</p>
                <div className="w-full bg-gray-200 rounded-full h-4 max-w-md mx-auto">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xl text-gray-600 mt-2">{progress}%</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 flex items-start gap-4">
                <XCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" strokeWidth={2.5} />
                <div>
                  <p className="text-xl font-bold text-red-900 mb-1">오류 발생</p>
                  <p className="text-lg text-red-700">{error}</p>
                </div>
              </div>
            )}

            {ocrResult && !isProcessing && (
              <div>
                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 flex items-start gap-4 mb-6">
                  <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" strokeWidth={2.5} />
                  <div className="flex-1">
                    <p className="text-xl font-bold text-green-900 mb-1">스캔 완료!</p>
                    <p className="text-lg text-green-700">
                      정확도: {Math.round(ocrResult.confidence)}%
                    </p>
                  </div>
                </div>

                {extractedInfo && (
                  <div className="bg-blue-50 rounded-xl p-6 mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">추출된 정보</h3>
                    
                    {extractedInfo.date && (
                      <div className="mb-3">
                        <label className="text-base text-gray-600">날짜</label>
                        <div className="text-2xl font-bold text-gray-900">{extractedInfo.date}</div>
                      </div>
                    )}
                    
                    {extractedInfo.amounts && extractedInfo.amounts.length > 0 && (
                      <div>
                        <label className="text-base text-gray-600">금액</label>
                        <div className="space-y-1">
                          {extractedInfo.amounts.map((amount, idx) => (
                            <div key={idx} className="text-2xl font-bold text-green-600">
                              {amount}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">인식된 전체 텍스트</h3>
                  <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-base font-mono text-gray-700">
                      {ocrResult.text}
                    </pre>
                  </div>
                </div>

                {/* 데이터 편집 폼 */}
                {isEditing && (
                  <div className="bg-white rounded-xl p-6 mb-6 border-2 border-blue-300">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Edit2 className="w-6 h-6 text-blue-600" />
                        데이터 확인 및 수정
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      {/* 기대번호 */}
                      <div>
                        <label className="block text-base font-semibold text-gray-700 mb-2">
                          기대번호 (VIN) *
                        </label>
                        <input
                          type="text"
                          value={formData.vin}
                          onChange={(e) => handleFormChange('vin', e.target.value.toUpperCase())}
                          className={`w-full px-4 py-3 text-lg border-2 rounded-lg focus:outline-none focus:ring-2 ${
                            vinError 
                              ? 'border-red-300 focus:ring-red-500' 
                              : 'border-gray-300 focus:ring-blue-500'
                          }`}
                          placeholder={extractedInfo?.vin || "예: DT123456789024"}
                        />
                        {vinError && (
                          <div className="mt-2 flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="text-sm">{vinError}</span>
                          </div>
                        )}
                        {vinWarning && !vinError && (
                          <div className="mt-2 flex items-center gap-2 text-blue-600">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="text-sm">{vinWarning}</span>
                          </div>
                        )}
                        {existingMachine && (
                          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800 font-semibold mb-1">기존 농기계 정보</p>
                            <p className="text-sm text-blue-700">
                              제조사: {existingMachine.manufacturer_name || '-'} | 
                              연식: {existingMachine.production_year || '-'}년 | 
                              총 이력: {existingMachine.total_records || 0}건
                            </p>
                          </div>
                        )}
                        {modelInfo && !existingMachine && (
                          <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-green-800 font-semibold mb-1">조회된 모델 정보</p>
                            <p className="text-sm text-green-700">
                              모델명: {modelInfo.model_name || '-'} | 
                              제조사: {modelInfo.manufacturer_name || '-'} | 
                              연식: {modelInfo.production_year || '-'}년
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* 날짜 */}
                      <div>
                        <label className="block text-base font-semibold text-gray-700 mb-2">
                          작업 날짜 *
                        </label>
                        <input
                          type="date"
                          value={formData.date}
                          onChange={(e) => handleFormChange('date', e.target.value)}
                          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      {/* 작업 내용 */}
                      <div>
                        <label className="block text-base font-semibold text-gray-700 mb-2">
                          작업 내용 *
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => handleFormChange('description', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={extractedInfo?.description || "예: 엔진 오일 교환, 필터 교체"}
                        />
                      </div>
                      
                      {/* 비용 */}
                      <div>
                        <label className="block text-base font-semibold text-gray-700 mb-2">
                          비용 (원) *
                        </label>
                        <input
                          type="number"
                          value={formData.cost}
                          onChange={(e) => handleFormChange('cost', e.target.value)}
                          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={extractedInfo?.cost || "0"}
                        />
                      </div>
                      
                      {/* 주행시간 */}
                      <div>
                        <label className="block text-base font-semibold text-gray-700 mb-2">
                          주행시간 (선택)
                        </label>
                        <input
                          type="number"
                          value={formData.mileage}
                          onChange={(e) => handleFormChange('mileage', e.target.value)}
                          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      setPreviewImage(null);
                      setOcrResult(null);
                      setError(null);
                      setIsEditing(false);
                      setFormData({
                        vin: '',
                        date: new Date().toISOString().split('T')[0],
                        description: '',
                        cost: '',
                        mileage: '',
                      });
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white py-5 rounded-xl text-xl font-bold transition-colors"
                  >
                    다시 촬영
                  </button>
                  <button
                    onClick={handleSkip}
                    className="bg-orange-600 hover:bg-orange-700 text-white py-5 rounded-xl text-xl font-bold transition-colors"
                  >
                    건너뛰기
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white py-5 rounded-xl text-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Save className="w-6 h-6" />
                    {isSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!previewImage && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">촬영 팁</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">•</span>
                <span>영수증을 평평하게 놓고 촬영</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">•</span>
                <span>밝은 조명에서 촬영</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">•</span>
                <span>그림자가 없도록 주의</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">•</span>
                <span>글자가 선명하게 초점 맞추기</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
