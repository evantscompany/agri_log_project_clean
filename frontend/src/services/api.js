// frontend/src/services/api.js
/**
 * 백엔드 API 통신을 위한 서비스 레이어
 * axios를 사용하여 HTTP 요청을 처리하고 에러 핸들링을 수행
 */

import axios from 'axios';

// API 기본 URL 설정 (환경변수 또는 기본값 사용)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// axios 인스턴스 생성 (공통 설정 적용)
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10초 타임아웃
});

// ========== 농기계 관련 API ==========

/**
 * 등록된 모든 농기계 목록 조회
 * @returns {Promise<Object>} { machines: Array, total: number }
 */
export const getMachinesList = async () => {
  try {
    const response = await apiClient.get('/api/v1/machines');
    return response.data;
  } catch (error) {
    console.error('농기계 목록 조회 실패:', error);
    throw handleApiError(error);
  }
};

/**
 * 가격 예측을 위한 모든 농기계 목록 조회 (소프트 삭제된 농기계 포함)
 * @returns {Promise<Object>} { machines: Array, total: number }
 */
export const getAllMachinesForPrediction = async () => {
  try {
    const response = await apiClient.get('/api/v1/machines/all-machines');
    return response.data;
  } catch (error) {
    console.error('전체 농기계 목록 조회 실패:', error);
    throw handleApiError(error);
  }
};

/**
 * 특정 농기계의 상세 정보 조회 (VIN 기반)
 * @param {string} vin - 기대번호
 * @returns {Promise<Object>} 농기계 상세 정보
 */
export const getMachineDetail = async (vin) => {
  try {
    const response = await apiClient.get(`/api/v1/machines/${vin}`);
    return response.data;
  } catch (error) {
    console.error('농기계 상세 조회 실패:', error);
    throw handleApiError(error);
  }
};

/**
 * 새로운 농기계 등록
 * @param {string} vin - 기대번호
 * @param {number} productionYear - 생산연식 (선택)
 * @returns {Promise<Object>} 등록 결과
 */
export const registerMachine = async (vin, productionYear = null) => {
  try {
    const response = await apiClient.post('/api/v1/machines/register', null, {
      params: { vin, production_year: productionYear }
    });
    return response.data;
  } catch (error) {
    console.error('농기계 등록 실패:', error);
    throw handleApiError(error);
  }
};

// ========== 정비 이력 관련 API ==========

/**
 * 특정 농기계의 모든 정비 이력 조회
 * @param {string} vin - 기대번호
 * @returns {Promise<Object>} { records: Array, total: number }
 */
export const getMaintenanceRecords = async (vin) => {
  try {
    const response = await apiClient.get(`/api/v1/history/machine/${vin}`);
    return response.data;
  } catch (error) {
    console.error('정비 이력 조회 실패:', error);
    throw handleApiError(error);
  }
};

/**
 * 새로운 정비 이력 추가
 * @param {Object} recordData - 정비 이력 데이터
 * @returns {Promise<Object>} 생성된 이력 정보
 */
export const createMaintenanceRecord = async (recordData) => {
  try {
    const response = await apiClient.post('/api/v1/maintenance/log', recordData);
    return response.data;
  } catch (error) {
    console.error('정비 이력 추가 실패:', error);
    throw handleApiError(error);
  }
};

/**
 * 기존 정비 이력 수정
 * @param {number} recordId - 이력 ID
 * @param {Object} updateData - 수정할 데이터
 * @returns {Promise<Object>} 수정 결과
 */
export const updateMaintenanceRecord = async (recordId, updateData) => {
  try {
    const response = await apiClient.put(`/api/v1/maintenance/${recordId}`, null, {
      params: updateData
    });
    return response.data;
  } catch (error) {
    console.error('정비 이력 수정 실패:', error);
    throw handleApiError(error);
  }
};

/**
 * 정비 이력 삭제
 * @param {number} recordId - 이력 ID
 * @returns {Promise<Object>} 삭제 결과
 */
export const deleteMaintenanceRecord = async (recordId) => {
  try {
    const response = await apiClient.delete(`/api/v1/history/${recordId}`);
    return response.data;
  } catch (error) {
    console.error('정비 이력 삭제 실패:', error);
    throw handleApiError(error);
  }
};

// ========== 에러 핸들링 ==========

/**
 * API 에러를 사용자 친화적인 메시지로 변환
 * @param {Error} error - axios 에러 객체
 * @returns {Error} 처리된 에러 객체
 */
const handleApiError = (error) => {
  if (error.response) {
    // 서버가 응답을 반환한 경우 (4xx, 5xx)
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return new Error(data.detail || '잘못된 요청입니다.');
      case 404:
        return new Error(data.detail || '요청한 데이터를 찾을 수 없습니다.');
      case 409:
        return new Error(data.detail || '이미 존재하는 데이터입니다.');
      case 422:
        // Pydantic 검증 오류 상세 처리
        if (data.detail && Array.isArray(data.detail)) {
          const errors = data.detail.map(err => 
            `${err.loc?.join('.') || '필드'}: ${err.msg}`
          ).join('\n');
          return new Error(`데이터 검증 오류:\n${errors}`);
        }
        return new Error(data.detail || '요청 데이터 형식이 올바르지 않습니다.');
      case 500:
        return new Error(data.detail || '서버 오류가 발생했습니다.');
      default:
        return new Error(data.detail || `오류가 발생했습니다. (${status})`);
    }
  } else if (error.request) {
    // 요청은 보냈지만 응답을 받지 못한 경우
    return new Error('서버와 연결할 수 없습니다. 네트워크를 확인해주세요.');
  } else {
    // 요청 설정 중 오류가 발생한 경우
    return new Error(error.message || '알 수 없는 오류가 발생했습니다.');
  }
};

// ========== OCR 및 이미지 업로드 관련 API ==========

/**
 * 정비명세서 이미지 업로드
 * @param {File} file - 업로드할 이미지 파일
 * @param {string} vin - 기대번호 (선택)
 * @param {number} logId - 정비 이력 ID (선택)
 * @returns {Promise<Object>} 업로드 결과
 */
export const uploadMaintenanceImage = async (file, vin = null, logId = null) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (vin) formData.append('vin', vin);
    if (logId) formData.append('log_id', logId);

    const response = await apiClient.post('/api/v1/ocr/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('이미지 업로드 실패:', error);
    throw handleApiError(error);
  }
};

/**
 * OCR 처리 및 정비 이력 저장
 * @param {Object} ocrData - OCR 데이터
 * @param {string} ocrData.vin - 기대번호
 * @param {string} ocrData.date - 작업 날짜
 * @param {string} ocrData.description - 작업 내용
 * @param {number} ocrData.cost - 비용
 * @param {number} [ocrData.mileage] - 주행시간
 * @param {string} [ocrData.image_path] - 이미지 경로
 * @param {string} [ocrData.ocr_text] - OCR 원본 텍스트
 * @returns {Promise<Object>} 저장 결과
 */
export const processOCRAndSave = async (ocrData) => {
  try {
    const formData = new FormData();
    formData.append('vin', ocrData.vin);
    formData.append('date', ocrData.date);
    formData.append('description', ocrData.description);
    formData.append('cost', ocrData.cost);
    if (ocrData.mileage) formData.append('mileage', ocrData.mileage);
    if (ocrData.image_path) formData.append('image_path', ocrData.image_path);
    if (ocrData.ocr_text) formData.append('ocr_text', ocrData.ocr_text);

    const response = await apiClient.post('/api/v1/ocr/process-ocr', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('OCR 데이터 저장 실패:', error);
    throw handleApiError(error);
  }
};

/**
 * 정비 이력의 첨부 파일 목록 조회
 * @param {number} logId - 정비 이력 ID
 * @returns {Promise<Object>} 첨부 파일 목록
 */
export const getMaintenanceAttachments = async (logId) => {
  try {
    const response = await apiClient.get(`/api/v1/ocr/attachments/${logId}`);
    return response.data;
  } catch (error) {
    console.error('첨부 파일 조회 실패:', error);
    throw handleApiError(error);
  }
};

/**
 * Google Vision API를 사용한 OCR 처리
 * @param {File} file - OCR 처리할 이미지 파일
 * @returns {Promise<Object>} OCR 결과 (텍스트, 신뢰도, 블록 정보)
 */
export const processGoogleVisionOCR = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/api/v1/ocr/google-vision-ocr', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Google Vision OCR 처리 실패:', error);
    throw handleApiError(error);
  }
};

// ========== 가격 예측 관련 API ==========

/**
 * 중고 농기계 가격 예측
 * @param {string} vin - 기대번호 (예: DT4351240001)
 * @param {number} workingHours - 사용시간
 * @returns {Promise<Object>} 예측 결과
 */
export const predictMachinePrice = async (vin, workingHours) => {
  try {
    const response = await apiClient.post('/api/v1/price/predict', {
      vin: vin,
      working_hours: workingHours
    });
    return response.data;
  } catch (error) {
    console.error('가격 예측 실패:', error);
    throw handleApiError(error);
  }
};

/**
 * 가격 예측 모델 상태 확인
 * @returns {Promise<Object>} 모델 상태 정보
 */
export const getPricePredictionModelStatus = async () => {
  try {
    const response = await apiClient.get('/api/v1/price/model-status');
    return response.data;
  } catch (error) {
    console.error('모델 상태 확인 실패:', error);
    throw handleApiError(error);
  }
};

/**
 * 여러 농기계의 가격 예측 (배치 처리)
 * @param {Array<string>} vins - 기대번호 배열
 * @returns {Promise<Object>} 예측 결과 배열
 */
export const predictMachinePrices = async (vins) => {
  try {
    const response = await apiClient.post('/api/v1/price/predict-batch', {
      vins: vins
    });
    return response.data;
  } catch (error) {
    console.error('배치 가격 예측 실패:', error);
    throw handleApiError(error);
  }
};

/**
 * 농기계 삭제
 * @param {string} vin - 기대번호
 * @returns {Promise<Object>} 삭제 결과
 */
export const deleteMachine = async (vin) => {
  try {
    const response = await apiClient.delete(`/api/v1/machines/${vin}`);
    return response.data;
  } catch (error) {
    console.error('농기계 삭제 실패:', error);
    throw handleApiError(error);
  }
};

export const getExpertOpinion = async (vin) => {
  try {
    const response = await apiClient.get(`/api/v1/ai-expert/opinion/${vin}`, {
      timeout: 30000, // 30초 타임아웃 (AI API 호출 시간 고려)
    });
    return response.data;
  } catch (error) {
    console.error('전문가 소견 조회 실패:', error);
    throw handleApiError(error);
  }
};

export default {
  getMachinesList,
  getAllMachinesForPrediction,
  getMachineDetail,
  registerMachine,
  getMaintenanceRecords,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  uploadMaintenanceImage,
  processOCRAndSave,
  getMaintenanceAttachments,
  processGoogleVisionOCR,
  predictMachinePrice,
  predictMachinePrices,
  getPricePredictionModelStatus,
  deleteMachine,
  getExpertOpinion,
};
