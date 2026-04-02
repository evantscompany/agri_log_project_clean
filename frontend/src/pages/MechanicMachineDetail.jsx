// frontend/src/pages/MechanicMachineDetail.jsx
/**
 * 정비사용 농기계 상세 페이지
 * - 정비명세서 스캔 및 이미지 업로드
 * - OCR 파싱 로직 수행
 * - 기계 수리 히스토리 표시
 * - 부품 내역 (OCR 파싱된 부품 + DB 부품)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Wrench, 
  Calendar, 
  DollarSign, 
  FileText, 
  Trash2,
  Upload,
  Camera,
  Home,
  Settings,
  LogOut,
  Sparkles,
  X
} from 'lucide-react';
import { 
  getMachineDetail, 
  getMaintenanceRecords, 
  createMaintenanceRecord,
  deleteMaintenanceRecord,
  getExpertOpinion,
  processGoogleVisionOCR
} from '../services/api';
import { generateAIOpinion } from './MechanicMachineDetail_AIOpinion';
import MechanicChatbot from '../components/MechanicChatbot';
import '../styles/MechanicMobile.css';

export default function MechanicMachineDetail() {
  const navigate = useNavigate();
  const { vin } = useParams(); // URL에서 VIN 추출
  
  // 상태 관리
  const [machine, setMachine] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expertOpinion, setExpertOpinion] = useState(null);
  const [loadingOpinion, setLoadingOpinion] = useState(false);
  
  // OCR 관련 상태
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [ocrParts, setOcrParts] = useState([]); // OCR로 파싱된 부품
  const [dbParts, setDbParts] = useState([]); // DB에 저장된 부품
  
  // AI 정비 소견 상태
  const [showAIOpinion, setShowAIOpinion] = useState(false);
  const [aiOpinion, setAiOpinion] = useState('');
  const [generatingOpinion, setGeneratingOpinion] = useState(false);

  // 로그아웃 기능
  const handleLogout = () => {
    localStorage.removeItem('agrilog_user_type');
    navigate('/');
  };

  // 대시보드로 이동
  const handleGoToDashboard = () => {
    navigate('/mechanic/dashboard');
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadMachineData();
  }, [vin]);

  /**
   * 농기계 정보 및 정비 이력 불러오기
   */
  const loadMachineData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 농기계 상세 정보와 정비 이력을 병렬로 조회
      const [machineData, recordsData] = await Promise.all([
        getMachineDetail(vin),
        getMaintenanceRecords(vin)
      ]);
      
      setMachine(machineData);
      setRecords(recordsData.records || []);
      
      // DB에서 부품 정보 추출
      const allDbParts = [];
      recordsData.records?.forEach(record => {
        // details 필드에서 부품 정보 가져오기
        if (record.details && record.details.length > 0) {
          record.details.forEach(detail => {
            allDbParts.push({
              ...detail,
              maintenance_id: record.id,
              service_date: record.service_date,
              service_company: record.service_company,
              part_name: detail.item_name || detail.part_name || '부품명 없음',
              quantity: detail.quantity || 1,
              unit_cost: detail.part_cost || detail.unit_cost || 0,
              total_cost: detail.total_cost || (detail.part_cost * (detail.quantity || 1))
            });
          });
        }
      });
      setDbParts(allDbParts);
      
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      setError(err.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * AI 전문가 소견 불러오기
   */
  const loadExpertOpinion = async () => {
    try {
      setLoadingOpinion(true);
      const opinionData = await getExpertOpinion(vin);
      setExpertOpinion(opinionData.opinion);
    } catch (err) {
      console.error('전문가 소견 로드 실패:', err);
      // 전문가 소견 로드 실패는 에러로 표시하지 않음
    } finally {
      setLoadingOpinion(false);
    }
  };

  /**
   * 정비 이력 삭제 처리
   */
  const handleDeleteRecord = async (recordId) => {
    if (!confirm('이 이력을 삭제하시겠습니까?')) return;
    
    try {
      await deleteMaintenanceRecord(recordId);
      // 삭제 성공 시 목록에서 제거
      setRecords(records.filter((r) => r.id !== recordId));
      // 농기계 정보 다시 로드 (통계 업데이트)
      loadMachineData();
    } catch (err) {
      alert(err.message || '삭제에 실패했습니다.');
    }
  };

  /**
   * OCR 텍스트에서 정보 추출 (개선된 로직)
   */
  const extractReceiptInfo = (text) => {
    console.log('=== OCR 텍스트 파싱 시작 ===');
    console.log('원본 텍스트:', text);
    
    // 텍스트 정리
    const cleanedText = text.replace(/\s+/g, ' ').trim();
    const textLines = text.split('\n');
    console.log('정리된 텍스트:', cleanedText);
    
    // 기대번호 추출 개선 (라벨 인식)
    let extractedVin = '';
    
    // 1. "기대번호" 라벨 다음에 오는 VIN 찾기
    for (const line of textLines) {
      const vinLabelMatch = line.match(/기대번호\s*[:\s]*([A-Z]{2}\d{9,12})/i);
      if (vinLabelMatch) {
        extractedVin = vinLabelMatch[1].toUpperCase();
        break;
      }
    }
    
    // 2. 패턴 매칭으로 VIN 찾기
    if (!extractedVin) {
      const vinMatch = cleanedText.match(/[Dd][IiCcTt]\d{10}/);
      if (vinMatch) {
        extractedVin = vinMatch[0].toUpperCase();
      } else {
        const altVinMatch = cleanedText.match(/[A-Z]{2}\d{9,13}/i);
        if (altVinMatch) {
          extractedVin = altVinMatch[0].toUpperCase();
        }
      }
    }
    console.log('추출된 기대번호:', extractedVin);
    
    // 날짜 추출 개선 (발행번호에서 추출)
    let extractedDate = '';
    
    // 1. 발행번호 형식: INV-26-01-01 → 2026-01-01
    for (const line of textLines) {
      const invMatch = line.match(/INV[-\s]*(\d{2})[-\s]*(\d{2})[-\s]*(\d{2})/i);
      if (invMatch) {
        const year = '20' + invMatch[1];
        const month = invMatch[2].padStart(2, '0');
        const day = invMatch[3].padStart(2, '0');
        extractedDate = `${year}-${month}-${day}`;
        break;
      }
    }
    
    // 2. 일반 날짜 형식 (VIN과 구분하기 위해 개선)
    if (!extractedDate) {
      // 2024년, 2025년, 2026년 등 실제 연도만 매칭
      const dateMatch = cleanedText.match(/(20\d{2})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/);
      if (dateMatch) {
        const year = dateMatch[1];
        const month = dateMatch[2].padStart(2, '0');
        const day = dateMatch[3].padStart(2, '0');
        // 유효한 날짜인지 검증
        const monthNum = parseInt(month);
        const dayNum = parseInt(day);
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          extractedDate = `${year}-${month}-${day}`;
        }
      }
    }
    
    // 3. 날짜가 없으면 오늘 날짜 사용
    if (!extractedDate) {
      extractedDate = new Date().toISOString().split('T')[0];
    }
    
    console.log('추출된 날짜:', extractedDate);
    
    // 서비스업체 추출 개선
    let vendor = '';
    
    // 1. "정비업체" 라벨 다음에 오는 업체명
    for (const line of textLines) {
      const vendorMatch = line.match(/정비업체\s*[|\s]*([^|\n]+?)(?:\||사업자번호|$)/);
      if (vendorMatch) {
        vendor = vendorMatch[1].trim();
        break;
      }
    }
    
    // 2. (주)대동 대구서비스센터 형식
    if (!vendor) {
      const serviceCenterMatch = cleanedText.match(/\(주\)(.+?)서비스/);
      if (serviceCenterMatch) {
        vendor = '(주)' + serviceCenterMatch[1].trim() + '서비스';
      }
    }
    
    // 3. "농기계 수리소", "서비스센터" 등 키워드 포함
    if (!vendor) {
      const repairShopMatch = cleanedText.match(/([가-힣\s]+(?:농기계|서비스센터|수리소|정비소))/);
      if (repairShopMatch) {
        vendor = repairShopMatch[1].trim();
      }
    }
    
    // 4. 너무 긴 경우 자르기 (최대 50자)
    if (vendor && vendor.length > 50) {
      vendor = vendor.substring(0, 50).trim();
    }
    
    console.log('추출된 서비스업체:', vendor);
    
    // 부품번호만 추출 (간단한 방식)
    const parts = [];
    
    // 전체 텍스트에서 모든 부품번호 추출
    const allPartNumbersInText = text.match(/[A-Z]{2}-[A-Z]-[A-Z]{2}-\d{4}/g) || [];
    console.log('📋 텍스트에서 발견된 모든 부품번호:', allPartNumbersInText);
    
    // 중복 제거
    const uniquePartNumbers = [...new Set(allPartNumbersInText)];
    console.log('✅ 중복 제거 후 부품번호:', uniquePartNumbers);
    
    // 부품번호만 저장 (나머지 정보는 DB에서 가져옴)
    uniquePartNumbers.forEach(partNumber => {
      parts.push({
        part_number: partNumber,
        name: '', // DB에서 채움
        quantity: 1, // 기본값
        unit_cost: 0, // DB에서 채움
        cost: 0 // DB에서 채움
      });
    });
    
    console.log('🔢 추출된 부품 개수:', parts.length);
    
    // 부품 코드 체계 검증
    const validParts = parts.filter(part => {
      // 부품번호 형식 검증: AA-B-CC-DDDD
      const partNumberPattern = /^[A-Z]{2}-[A-Z]-[A-Z]{2}-\d{4}$/;
      return partNumberPattern.test(part.part_number);
    });
    
    console.log('추출된 부품 정보 (원본):', parts);
    console.log('추출된 부품 정보 (검증된):', validParts);
    
    // 부품 정보 매칭 (비동기 처리를 위해 Promise 반환)
    const matchParts = async () => {
      try {
        console.log('🔍 부품 매칭 시작...');
        console.log('검증된 부품 개수:', validParts.length);
        
        // API를 통해 부품 정보 조회
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/maintenance/parts/search?query=`);
        const allParts = response.ok ? await response.json() : [];
        
        console.log('DB 부품 개수:', allParts.length);
        
        // 부품번호 기반 매칭 - DB에서 부품명과 가격 가져오기
        const matchedParts = validParts.map(ocrPart => {
          const matchedPart = allParts.find(dbPart => dbPart.part_number === ocrPart.part_number);
          
          if (matchedPart) {
            console.log(`✅ 매칭 성공: ${ocrPart.part_number} → ${matchedPart.part_name} (가격: ${matchedPart.unit_price}원)`);
            return {
              part_id: matchedPart.part_id,
              part_number: matchedPart.part_number,
              part_name: matchedPart.part_name, // DB의 정식 부품명
              quantity: ocrPart.quantity || 1,
              unit_cost: matchedPart.unit_price || 0, // DB의 가격
              total_cost: (ocrPart.quantity || 1) * (matchedPart.unit_price || 0)
            };
          } else {
            console.log(`❌ 매칭 실패: ${ocrPart.part_number} → DB에 없는 부품`);
            // 매칭되는 부품이 없을 경우
            return {
              part_id: null,
              part_number: ocrPart.part_number,
              part_name: `부품번호: ${ocrPart.part_number}`, // 부품번호 표시
              quantity: ocrPart.quantity || 1,
              unit_cost: 0,
              total_cost: 0
            };
          }
        });
        
        console.log('부품 매칭 결과:', matchedParts);
        return matchedParts;
        
      } catch (error) {
        console.error('부품 매칭 실패:', error);
        // 실패 시 원본 부품 정보 반환
        return validParts.map(part => ({
          part_id: null,
          part_number: part.part_number,
          part_name: part.name,
          quantity: part.quantity,
          unit_cost: part.unit_cost,
          total_cost: part.cost
        }));
      }
    };
    
    // 총비용은 부품 금액 합계로 계산 (OCR에서 추출하지 않음)
    console.log('💰 총비용은 부품 금액 합계로 자동 계산됨');
    
    // 정비사 소견 추출 및 정제
    let extractedDescription = '';
    
    // 1. [정비사 소견] 섹션 찾기
    const opinionMatch = text.match(/\[정비사\s*소견\]\s*(.+?)(?:\n|$)/i);
    if (opinionMatch) {
      extractedDescription = opinionMatch[1].trim();
    }
    
    // 2. 여러 라인에 걸쳐 있는 경우
    if (!extractedDescription) {
      for (let i = 0; i < textLines.length; i++) {
        const line = textLines[i];
        if (line.includes('정비사 소견') || line.includes('[정비사')) {
          const remainingLines = textLines.slice(i + 1).filter(l => {
            const trimmed = l.trim();
            // 숫자만 있는 라인이나 너무 짧은 라인 제외
            return trimmed.length > 0 && !/^\d+$/.test(trimmed);
          });
          if (remainingLines.length > 0) {
            extractedDescription = remainingLines.join(' ').trim();
            break;
          }
        }
      }
    }
    
    // 3. "해당 ... 기종의 ..." 패턴 직접 찾기
    if (!extractedDescription) {
      const summaryMatch = text.match(/해당\s+[가-힣]+\s+기종의\s+[^\n]+/);
      if (summaryMatch) {
        extractedDescription = summaryMatch[0];
      }
    }
    
    // 4. 앞부분의 불필요한 숫자 제거
    if (extractedDescription) {
      extractedDescription = extractedDescription.replace(/^\d+\s+/, '').trim();
    }
    
    console.log('추출된 정비사 소견:', extractedDescription);
    
    const result = {
      vin: extractedVin,
      date: extractedDate,
      vendor: vendor,
      description: extractedDescription,
      parts: validParts,
      matchParts: matchParts // 부품 매칭 함수 포함
    };
    
    console.log('=== 최종 추출 결과 ===', result);
    return result;
  };

  /**
   * OCR 텍스트에서 정보 추출 (간단한 로직)
   */
  const extractReceiptInfoSimple = (text) => {
    console.log('=== OCR 텍스트 파싱 시작 ===');
    console.log('원본 텍스트:', text);
    
    // 텍스트 정리
    const cleanedText = text.replace(/\s+/g, ' ').trim();
    console.log('정리된 텍스트:', cleanedText);
    
    // 기대번호 추출 (대소문자 무시, 12자리)
    let extractedVin = '';
    const vinMatch = cleanedText.match(/[Dd][Ii]\d{10}/);
    if (vinMatch) {
      extractedVin = vinMatch[0].toUpperCase();
    } else {
      // 다른 패턴 시도
      const altVinMatch = cleanedText.match(/[A-Z]{2}\d{9,13}/i);
      if (altVinMatch) {
        extractedVin = altVinMatch[0].toUpperCase();
      }
    }
    console.log('추출된 기대번호:', extractedVin);
    
    // 날짜 추출
    const dateMatch = cleanedText.match(/(\d{4}[-./]\d{2}[-./]\d{2})/);
    const extractedDate = dateMatch ? dateMatch[1].replace(/[./]/g, '-') : '';
    console.log('추출된 날짜:', extractedDate);
    
    // 서비스 업체명 추출
    let vendor = '';
    
    // 1. "서비스센터", "정비소" 등 키워드가 포함된 라인 찾기
    const vendorKeywords = ['서비스센터', '정비소', '농기계', '대동', 'LS', '두산', '현대', 'Yanmar', 'Kubota'];
    for (const line of cleanedText.split('\n')) {
      const trimmedLine = line.trim();
      if (trimmedLine && vendorKeywords.some(kw => trimmedLine.includes(kw)) && trimmedLine.length > 3) {
        vendor = trimmedLine;
        console.log('서비스 업체명 추출:', vendor);
        break;
      }
    }
    
    // 2. 상단 라인에서 업체명 찾기 (보통 상단에 위치)
    if (!vendor && cleanedText.split('\n').length > 0) {
      for (let i = 0; i < Math.min(3, cleanedText.split('\n').length); i++) {
        const line = cleanedText.split('\n')[i].trim();
        if (line && line.length > 5 && !line.match(/\d{4}[-./]\d{2}[-./]\d{2}/) && !line.includes('수리비')) {
          vendor = line;
          console.log('상단 라인에서 서비스 업체명 추출:', vendor);
          break;
        }
      }
    }
    
    // 부품 정보 추출 (간단한 패턴 기반)
    let parts = [];
    let cost = 0;
    let description = 'OCR 자동 추출 정비 내역';
    
    // 부품 관련 키워드가 포함된 라인에서 부품 정보 추출
    const partKeywords = ['오일', '필터', '부품', '타이어', '벨트', '와이퍼', '전구', '밧데리'];
    for (const line of cleanedText.split('\n')) {
      const trimmedLine = line.trim();
      if (trimmedLine && partKeywords.some(kw => trimmedLine.includes(kw))) {
        // 간단한 부품명 추출
        const partName = trimmedLine.split(' ')[0] || trimmedLine;
        
        // 금액 정보 추출
        const amountMatch = trimmedLine.match(/(\d{1,3}(?:,\d{3})+|\d{4,})/);
        const partCost = amountMatch ? parseInt(amountMatch[1].replace(/,/g, '')) : 0;
        
        // 수량 정보 추출
        const quantityMatch = trimmedLine.match(/(\d+)\s*개/);
        const partQuantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
        
        if (partName && partCost > 0) {
          parts.push({
            name: partName,
            quantity: partQuantity,
            cost: partCost,
            unit_cost: Math.round(partCost / partQuantity)
          });
        }
      }
    }
    
    // 총비용 계산
    cost = parts.reduce((sum, part) => sum + part.cost, 0);
    
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

  /**
   * OCR 처리 실행
   */
  const handleOCRProcessing = async () => {
    console.log('🔧 OCR 처리 시작');
    console.log('   selectedImage:', selectedImage);
    console.log('   processingOCR:', processingOCR);
    
    setProcessingOCR(true);
    setError(null);

    try {
      // 이미지 파일이 있는 경우
      if (!selectedImage) {
        console.error('❌ 이미지 파일 없음');
        setError('OCR 처리를 위해 이미지를 선택해주세요.');
        return;
      }

      console.log('🔧 OCR 처리 시작:', selectedImage.name, selectedImage.type, selectedImage.size);
      console.log('   파일 크기:', selectedImage.size, 'bytes');
      console.log('   파일 타입:', selectedImage.type);

      // 이미지 파일 형식 검증
      const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/gif'];
      if (!validTypes.includes(selectedImage.type)) {
        console.error('❌ 지원하지 않는 파일 타입:', selectedImage.type);
        setError('지원하지 않는 파일 형식입니다. (JPEG, PNG, BMP, GIF만 가능)');
        return;
      }

      // 이미지 파일 크기 검증 (10MB 이하)
      if (selectedImage.size > 10 * 1024 * 1024) {
        console.error('❌ 파일 크기 초과:', selectedImage.size);
        setError('파일 크기가 너무 큽니다. (10MB 이하만 가능)');
        return;
      }

      console.log('✅ 이미지 파일 검증 통과');

      // Google Vision API로 OCR 처리
      console.log('📤 Google Vision API 호출 시작...');
      const ocrData = await processGoogleVisionOCR(selectedImage);
      
      console.log('✅ OCR API 응답 수신:', ocrData);
      console.log('   텍스트 길이:', ocrData.text?.length || 0);
      console.log('   신뢰도:', ocrData.confidence);
      console.log('   블록 수:', ocrData.blocks?.length || 0);
      
      // OCR 결과 저장
      setOcrResult({
        text: ocrData.text,
        confidence: ocrData.confidence,
        blocks: ocrData.blocks || [],
      });
      
      // 추출된 정보로 폼 데이터 자동 채우기
      console.log('🔍 텍스트 파싱 시작...');
      const extracted = extractReceiptInfo(ocrData.text);
      
      console.log('🔍 OCR 추출 결과:', extracted);
      
      // OCR로 파싱된 부품 정보 저장
      if (extracted.parts && extracted.parts.length > 0) {
        const newParts = extracted.parts.map(part => ({
          id: Date.now() + Math.random(),
          part_name: part.name,
          quantity: part.quantity || 1,
          unit_cost: part.unit_cost || part.cost,
          total_cost: part.cost,
          is_new: true, // OCR로 새로 파싱된 부품 표시
          source: 'ocr'
        }));
        setOcrParts(newParts);
        console.log('📦 OCR 부품 정보 저장:', newParts);
      } else {
        console.log('⚠️ OCR 부품 정보 없음');
        setOcrParts([]);
      }
      
      setShowOCRModal(true);
      console.log('✅ OCR 처리 완료, 모달 표시');
      
    } catch (err) {
      console.error('❌ OCR 처리 실패:', err);
      console.error('   오류 상세:', err.response?.data || err.message);
      
      const errorMessage = err.response?.data?.detail || err.message || 'OCR 처리 중 오류가 발생했습니다.';
      setError(errorMessage);
      alert(`OCR 처리 오류: ${errorMessage}`);
    } finally {
      setProcessingOCR(false);
      console.log('🔧 OCR 처리 종료, processingOCR:', false);
    }
  };

  // selectedImage 상태 변경 시 자동 OCR 처리
  useEffect(() => {
    if (selectedImage && !processingOCR) {
      console.log('🔄 이미지 상태 변경 감지, OCR 처리 시작:', selectedImage.name);
      handleOCRProcessing();
    }
  }, [selectedImage]);

  /**
   * OCR 이미지 업로드 처리
   */
  const handleOCRUpload = async (file) => {
    if (!file) {
      setError('이미지 파일을 선택해주세요.');
      return;
    }
    
    console.log('📤 이미지 업로드 시작:', file.name, file.type);
    
    // 이미지 미리보기 설정
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result);
    };
    reader.readAsDataURL(file);
    
    // 이미지 상태 설정 (useEffect에서 자동으로 OCR 처리됨)
    setSelectedImage(file);
  };

  /**
   * 수리 히스토리 상세 정보 표시
   */
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  const handleViewRecordDetail = (record) => {
    console.log('🔍 수리 히스토리 상세 정보 클릭:', record);
    setSelectedRecord(record);
  };
  
  const handleCloseRecordDetail = () => {
    setSelectedRecord(null);
  };
  
  /**
   * AI 정비 소견 생성 - 전체 수리 히스토리 기반
   */
  const handleGenerateAIOpinion = () => {
    if (!records || records.length === 0) {
      alert('수리 히스토리가 없습니다. 먼저 정비명세서를 스캔하여 수리 기록을 추가해주세요.');
      return;
    }
    
    setGeneratingOpinion(true);
    
    // 약간의 지연 후 AI 소견 생성 (실제 AI처럼 보이도록)
    setTimeout(() => {
      const opinion = generateAIOpinion(records, machine);
      setAiOpinion(opinion);
      setShowAIOpinion(true);
      setGeneratingOpinion(false);
    }, 2000);
  };
  
  /**
   * OCR 결과로 정비 이력 저장
   */
  const handleSaveMaintenanceRecord = async () => {
    if (!ocrResult) {
      alert('OCR 결과가 없습니다.');
      return;
    }
    
    try {
      const extracted = extractReceiptInfo(ocrResult.text);
      
      // 부품 매칭 실행
      let matchedParts = [];
      if (extracted.matchParts && typeof extracted.matchParts === 'function') {
        matchedParts = await extracted.matchParts();
      } else {
        // 매칭 함수가 없을 경우 기본 부품 정보 사용
        matchedParts = (extracted.parts || []).map(part => ({
          part_id: null,
          part_number: part.part_number || '',
          part_name: part.name || part.part_name || '기타 부품',
          quantity: part.quantity,
          unit_cost: part.unit_cost,
          total_cost: part.cost
        }));
      }
      
      // 부품 정보가 없으면 기본 부품 정보 추가 (백엔드 필수 필드)
      if (matchedParts.length === 0) {
        matchedParts = [{
          part_id: null,
          part_number: '',
          part_name: '기타 부품',
          quantity: 1,
          unit_cost: 0,
          total_cost: 0
        }];
      }
      
      // 총비용 = 부품 금액 합계
      const totalCost = matchedParts.reduce((sum, part) => sum + (part.total_cost || 0), 0);
      
      // 정비내용 = 부품의 system_group 조합 (중복 제거)
      const systemGroups = [...new Set(matchedParts
        .map(part => part.system_group)
        .filter(group => group && group !== ''))];
      const serviceDescription = systemGroups.length > 0 
        ? `${systemGroups.join(', ')} 정비` 
        : (extracted.description || 'OCR 자동 추출');
      
      // 백엔드 API와 맞는 데이터 형식으로 수정
      const recordData = {
        vin: vin,
        service_date: extracted.date || new Date().toISOString().split('T')[0],
        service_company: extracted.vendor || '미등록',
        total_hours: machine?.total_hours || 0,
        total_cost: totalCost,
        service_description: serviceDescription,
        ai_summary: serviceDescription,
        parts: matchedParts.map(part => ({
          part_id: part.part_id,
          part_number: part.part_number || '',
          part_name: part.part_name,
          quantity: part.quantity,
          unit_cost: part.unit_cost,
          part_cost: part.unit_cost
        }))
      };
      
      console.log('📤 정비 이력 저장 데이터:', recordData);
      console.log('🔍 부품 매칭 결과:', matchedParts);
      
      const result = await createMaintenanceRecord(recordData);
      
      console.log('✅ 정비 이력 저장 성공:', result);
      
      // 성공 시 데이터 다시 로드
      await loadMachineData();
      
      // OCR 모달 닫기 및 초기화
      setShowOCRModal(false);
      setOcrResult(null);
      setOcrParts([]);
      setSelectedImage(null);
      setPreviewImage(null);
      
      alert('정비 이력이 성공적으로 저장되었습니다.');
      
    } catch (err) {
      console.error('정비 이력 저장 실패:', err);
      
      // 더 상세한 오류 메시지 표시
      let errorMessage = '정비 이력 저장에 실패했습니다.';
      if (err.response?.data?.detail) {
        errorMessage = `오류: ${err.response.data.detail}`;
      } else if (err.message) {
        errorMessage = `오류: ${err.message}`;
      }
      
      alert(errorMessage);
    }
  };

  // 로딩 중 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-300">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태 표시
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-xl text-red-400 mb-4">오류가 발생했습니다</p>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
          >
            새로고침
          </button>
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
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg mr-3"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">기계 상세 정보</h1>
                  <p className="text-sm text-gray-400">{machine?.vin || vin}</p>
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
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
                <Settings className="w-5 h-5" />
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* OCR 스캔 영역 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">정비명세서 스캔</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleOCRUpload(file);
              }}
              className="hidden"
              id="ocr-upload"
            />
            <label
              htmlFor="ocr-upload"
              className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors flex items-center justify-center cursor-pointer"
            >
              <Upload className="w-5 h-5 mr-2" />
              이미지 업로드
            </label>
            <button
              onClick={() => {
                // 카메라 스캔 기능은 현재 이미지 업로드로 대체
                alert('카메라 스캔 기능은 준비 중입니다. 이미지 업로드를 이용해주세요.');
              }}
              className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition-colors flex items-center justify-center"
            >
              <Camera className="w-5 h-5 mr-2" />
              카메라 스캔
            </button>
          </div>
        </div>

        {/* AI 정비 소견 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-purple-400" />
              AI 정비 소견
            </h3>
            <button
              onClick={handleGenerateAIOpinion}
              disabled={generatingOpinion || !records || records.length === 0}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center ${
                generatingOpinion || !records || records.length === 0
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {generatingOpinion ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  소견 생성
                </>
              )}
            </button>
          </div>
          
          {showAIOpinion && aiOpinion ? (
            <div className="bg-gray-700/50 rounded-lg p-4">
              <pre className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {aiOpinion}
              </pre>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>전체 수리 히스토리를 분석하여 AI 정비 소견을 생성할 수 있습니다.</p>
              <p className="text-sm mt-2">이 기계의 고장 패턴, 시스템별 상태, 정비 권장사항을 확인하세요.</p>
              {(!records || records.length === 0) && (
                <p className="text-sm mt-2 text-yellow-400">※ 수리 히스토리가 없습니다. 정비명세서를 먼저 스캔해주세요.</p>
              )}
            </div>
          )}
        </div>

        {/* 기계 기본 정보 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">기계 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <span className="text-gray-400 text-sm">모델명</span>
              <p className="text-white font-semibold">{machine?.model_name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">제조사</span>
              <p className="text-white font-semibold">
                {(() => {
                  // 기대번호 기반 제조사 추출
                  if (machine?.vin) {
                    const vinPrefix = machine.vin.substring(0, 2).toUpperCase();
                    const manufacturers = {
                      'DI': '대동',
                      'DC': '대동',
                      'DD': '대동',
                      'KU': '국제',
                      'LS': 'LS엠트론',
                      'TY': 'TYM',
                      'KI': '기아'
                    };
                    return manufacturers[vinPrefix] || machine?.manufacturer || 'N/A';
                  }
                  return machine?.manufacturer || 'N/A';
                })()}
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">가동시간</span>
              <p className="text-white font-semibold">
                {machine?.total_hours || 0}시간
              </p>
            </div>
          </div>
        </div>

        {/* 부품 내역 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">부품 내역</h3>
          
          {/* OCR로 파싱된 부품 */}
          {ocrParts.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-blue-400 mb-3">OCR로 파싱된 부품</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-400">부품명</th>
                      <th className="text-left py-2 px-3 text-gray-400">수량</th>
                      <th className="text-left py-2 px-3 text-gray-400">단가</th>
                      <th className="text-left py-2 px-3 text-gray-400">총액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ocrParts.map((part) => (
                      <tr key={part.id} className="border-b border-gray-700">
                        <td className="py-2 px-3 text-blue-300">{part.part_name || '부품명 없음'}</td>
                        <td className="py-2 px-3 text-white">{part.quantity || 0}</td>
                        <td className="py-2 px-3 text-white">{part.unit_cost ? part.unit_cost.toLocaleString() : 0}원</td>
                        <td className="py-2 px-3 text-white font-semibold">
                          {part.total_cost ? part.total_cost.toLocaleString() : 0}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* DB에 저장된 부품 */}
          {dbParts.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-green-400 mb-3">DB에 저장된 부품</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-400">부품명</th>
                      <th className="text-left py-2 px-3 text-gray-400">수량</th>
                      <th className="text-left py-2 px-3 text-gray-400">단가</th>
                      <th className="text-left py-2 px-3 text-gray-400">총액</th>
                      <th className="text-left py-2 px-3 text-gray-400">정비일</th>
                      <th className="text-left py-2 px-3 text-gray-400">서비스업체</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbParts.map((part, index) => (
                      <tr key={index} className="border-b border-gray-700">
                        <td className="py-2 px-3 text-green-300">{part.part_name || '부품명 없음'}</td>
                        <td className="py-2 px-3 text-white">{part.quantity || 0}</td>
                        <td className="py-2 px-3 text-white">{part.unit_cost ? part.unit_cost.toLocaleString() : 0}원</td>
                        <td className="py-2 px-3 text-white font-semibold">
                          {part.total_cost ? part.total_cost.toLocaleString() : 0}원
                        </td>
                        <td className="py-2 px-3 text-white">
                          {part.service_date ? new Date(part.service_date).toLocaleDateString() : '날짜 없음'}
                        </td>
                        <td className="py-2 px-3 text-white">{part.service_company || '업체 미정'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {ocrParts.length === 0 && dbParts.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p>부품 내역이 없습니다.</p>
              <p className="text-sm mt-2">정비명세서를 스캔하여 부품 정보를 추가해주세요.</p>
            </div>
          )}
        </div>

        {/* 수리 히스토리 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">수리 히스토리</h3>
            <span className="text-sm text-gray-400">총 {records.length}건</span>
          </div>
          
          {records.length > 0 ? (
            <div className="space-y-3">
              {records.map((record) => (
                <div 
                  key={record.id} 
                  className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => handleViewRecordDetail(record)}
                >
                  {/* 모바일 최적화: 세로 레이아웃 */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 gap-1">
                        <span className="text-white font-medium text-sm sm:text-base whitespace-nowrap">
                          {record.service_date ? new Date(record.service_date).toLocaleDateString() : '날짜 없음'}
                        </span>
                        <span className="text-gray-400 text-xs sm:text-sm break-words">
                          {record.service_company || '업체 미정'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end space-x-2">
                      <span className="text-green-400 font-semibold text-base sm:text-lg whitespace-nowrap">
                        {record.total_cost ? record.total_cost.toLocaleString() : 0}원
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRecord(record.id);
                        }}
                        className="p-1 text-red-400 hover:text-red-300 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* 정비 내용 - 부품의 system_group으로 표시 */}
                  <p className="text-gray-300 text-sm mb-3 break-words leading-relaxed">
                    {(() => {
                      // 부품의 system_group 추출
                      if (record.parts && record.parts.length > 0) {
                        const systemGroups = [...new Set(record.parts
                          .map(part => part.system_group)
                          .filter(group => group && group !== ''))];
                        if (systemGroups.length > 0) {
                          return `${systemGroups.join(', ')} 정비`;
                        }
                      }
                      return record.service_description || record.ai_summary || '정비 내용 없음';
                    })()}
                  </p>
                  
                  {/* 부품 태그 - 모바일 최적화 */}
                  {record.parts && record.parts.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs sm:text-sm text-gray-400 block mb-2">사용 부품:</span>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-gray-600 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                          {record.parts[0]?.part_name || record.parts[0]?.item_name || '부품명 없음'}
                          {record.parts.length > 1 && ` 외 ${record.parts.length - 1}개`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>수리 히스토리가 없습니다.</p>
              <p className="text-sm mt-2">정비명세서를 스캔하여 수리 기록을 추가해주세요.</p>
            </div>
          )}
        </div>
      </div>

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
                ×
              </button>
            </div>

            {previewImage && (
              <div className="mb-6">
                <img 
                  src={previewImage} 
                  alt="스캔된 이미지" 
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">추출된 텍스트</div>
                <div className="text-white text-sm max-h-32 overflow-y-auto">
                  {ocrResult.text}
                </div>
              </div>
              
              {ocrParts.length > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">추출된 부품</div>
                  <div className="space-y-2">
                    {ocrParts.map((part, index) => (
                      <div key={index} className="flex justify-between text-white">
                        <span>{part.part_name}</span>
                        <span>{part.quantity}개 × {part.unit_cost.toLocaleString()}원</span>
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
                onClick={handleSaveMaintenanceRecord}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
              >
                정비 이력 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수리 히스토리 상세 정보 모달 */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">수리 히스토리 상세 정보</h3>
              <button
                onClick={handleCloseRecordDetail}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 디버깅 정보 */}
            <div className="bg-gray-900 rounded-lg p-3 mb-4 text-xs">
              <h4 className="text-gray-400 mb-2">디버깅 정보:</h4>
              <div className="text-gray-500">
                <p>ID: {selectedRecord.id || 'N/A'}</p>
                <p>VIN: {selectedRecord.vin || 'N/A'}</p>
                <p>Service Date: {selectedRecord.service_date || 'N/A'}</p>
                <p>Service Company: {selectedRecord.service_company || 'N/A'}</p>
                <p>Total Cost: {selectedRecord.total_cost || 'N/A'}</p>
                <p>Description: {selectedRecord.service_description || 'N/A'}</p>
                <p>AI Summary: {selectedRecord.ai_summary || 'N/A'}</p>
                <p>Details Length: {selectedRecord.details ? selectedRecord.details.length : 0}</p>
                <p>Parts Length: {selectedRecord.parts ? selectedRecord.parts.length : 0}</p>
              </div>
            </div>

            {/* 기본 정보 */}
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold text-white mb-3">기본 정보</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400">정비일자:</span>
                  <span className="text-white ml-2">
                    {selectedRecord.service_date ? new Date(selectedRecord.service_date).toLocaleDateString() : '날짜 없음'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">서비스업체:</span>
                  <span className="text-white ml-2">{selectedRecord.service_company || '업체 미정'}</span>
                </div>
                <div>
                  <span className="text-gray-400">총비용:</span>
                  <span className="text-green-400 font-semibold ml-2">
                    {selectedRecord.total_cost ? selectedRecord.total_cost.toLocaleString() : 0}원
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">부품 수:</span>
                  <span className="text-white ml-2">
                    {selectedRecord.details ? selectedRecord.details.length : (selectedRecord.parts?.length || 0)}개
                  </span>
                </div>
              </div>
            </div>

            {/* 정비 내용 */}
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold text-white mb-3">정비 내용</h4>
              <p className="text-gray-300">
                {selectedRecord.ai_summary || selectedRecord.service_description || '정비 내용 없음'}
              </p>
            </div>

            {/* 부품 상세 정보 */}
            {selectedRecord.details && selectedRecord.details.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <h4 className="text-lg font-semibold text-white mb-3">부품 상세 정보</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left py-2 px-3 text-gray-400">부품명</th>
                        <th className="text-left py-2 px-3 text-gray-400">수량</th>
                        <th className="text-left py-2 px-3 text-gray-400">단가</th>
                        <th className="text-left py-2 px-3 text-gray-400">총액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecord.details.map((part, index) => (
                        <tr key={index} className="border-b border-gray-600">
                          <td className="py-2 px-3 text-white">{part.item_name || '부품명 없음'}</td>
                          <td className="py-2 px-3 text-white">{part.quantity || 0}</td>
                          <td className="py-2 px-3 text-white">
                            {part.part_cost ? part.part_cost.toLocaleString() : 0}원
                          </td>
                          <td className="py-2 px-3 text-white font-semibold">
                            {part.total_cost ? part.total_cost.toLocaleString() : 0}원
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 부품 정보가 없을 때 대체 정보 표시 */}
            {(!selectedRecord.details || selectedRecord.details.length === 0) && selectedRecord.parts && selectedRecord.parts.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <h4 className="text-lg font-semibold text-white mb-3">부품 정보</h4>
                <div className="space-y-2">
                  {selectedRecord.parts.map((part, index) => (
                    <div key={index} className="flex justify-between text-white">
                      <span>{part.part_name || '부품명 없음'}</span>
                      <span>{part.quantity || 0}개 × {part.unit_cost ? part.unit_cost.toLocaleString() : 0}원</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 부품 정보가完全没有时 */}
            {(!selectedRecord.details || selectedRecord.details.length === 0) && (!selectedRecord.parts || selectedRecord.parts.length === 0) && (
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <h4 className="text-lg font-semibold text-white mb-3">부품 정보</h4>
                <p className="text-gray-400">부품 정보가 없습니다.</p>
              </div>
            )}

            {/* 작업 버튼 */}
            <div className="flex gap-4">
              <button
                onClick={handleCloseRecordDetail}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => handleDeleteRecord(selectedRecord.id)}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 정비 도우미 챗봇 */}
      <MechanicChatbot machine={machine} records={records} />
    </div>
  );
}
