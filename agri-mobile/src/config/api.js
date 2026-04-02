// API 설정
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.90:8000/api/v1',
  TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT) || 30000,
};

export const ENDPOINTS = {
  // 농기계 관리
  MACHINES: '/machines',
  MACHINE_DETAIL: (vin) => `/machines/${vin}`,
  
  // 정비 이력
  HISTORY: '/history',
  HISTORY_BY_MACHINE: (vin) => `/history/machine/${vin}`,
  HISTORY_DETAIL: (id) => `/history/${id}`,
  
  // OCR
  OCR_UPLOAD: '/ocr/upload-image',
  OCR_GOOGLE_VISION: '/ocr/google-vision-ocr',
  OCR_PROCESS: '/ocr/process-ocr',
  
  // AI 예측
  AI_PREDICT: '/price/predict',
};
