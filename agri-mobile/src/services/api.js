import axios from 'axios';
import { API_CONFIG, ENDPOINTS } from '../config/api';

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 10000, // 10초로 설정 (빠른 에러 확인)
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('[API Error]', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API 서비스
export const apiService = {
  // 농기계 관리
  getMachines: async () => {
    const response = await apiClient.get(ENDPOINTS.MACHINES);
    return response.data;
  },

  getMachineDetail: async (vin) => {
    const response = await apiClient.get(ENDPOINTS.MACHINE_DETAIL(vin));
    return response.data;
  },

  // 정비 이력
  getMaintenanceHistory: async (vin) => {
    const response = await apiClient.get(ENDPOINTS.HISTORY_BY_MACHINE(vin));
    return response.data;
  },

  getMaintenanceDetail: async (id) => {
    const response = await apiClient.get(ENDPOINTS.HISTORY_DETAIL(id));
    return response.data;
  },

  // OCR 처리
  uploadMaintenanceImage: async (imageUri) => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'maintenance.jpg',
    });

    const response = await apiClient.post('/ocr/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  processGoogleVisionOCR: async (imageUri) => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'maintenance.jpg',
    });

    const response = await apiClient.post('/ocr/google-vision-ocr', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  processOCRAndSave: async (data) => {
    const formData = new FormData();
    formData.append('vin', data.vin);
    formData.append('date', data.date);
    formData.append('description', data.description);
    formData.append('cost', data.cost);
    if (data.mileage) {
      formData.append('mileage', data.mileage);
    }
    if (data.image_path) {
      formData.append('image_path', data.image_path);
    }
    if (data.ocr_text) {
      formData.append('ocr_text', data.ocr_text);
    }

    const response = await apiClient.post('/ocr/process-ocr', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadImage: async (imageUri) => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'maintenance.jpg',
    });

    const response = await apiClient.post(ENDPOINTS.OCR_UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  processOCR: async (imageUri) => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'maintenance.jpg',
    });

    const response = await apiClient.post(ENDPOINTS.OCR_GOOGLE_VISION, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  saveMaintenanceData: async (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });

    const response = await apiClient.post(ENDPOINTS.OCR_PROCESS, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 정비 이력 저장
  saveMaintenanceRecord: async (data) => {
    console.log('=== API 호출 시작 ===');
    console.log('URL: POST /history/');
    console.log('데이터:', data);
    
    const response = await apiClient.post('/history/', {
      vin: data.vin,
      service_date: data.service_date,
      description: data.description,
      cost: data.cost,
      mileage: data.mileage,
      service_company: data.service_company || '직접 입력',
    });
    
    console.log('=== API 응답 수신 ===');
    console.log('응답:', response.data);
    return response.data;
  },

  // 정비 이력 삭제
  deleteMaintenanceRecord: async (recordId) => {
    const response = await apiClient.delete(`/history/${recordId}`);
    return response.data;
  },

  // AI 가격 예측
  predictPrice: async (machineData) => {
    console.log('=== AI 가격 예측 API 호출 ===');
    console.log('요청 데이터:', machineData);
    console.log('API 엔드포인트:', ENDPOINTS.AI_PREDICT);
    
    const response = await apiClient.post(ENDPOINTS.AI_PREDICT, machineData);
    
    console.log('=== AI 가격 예측 API 응답 ===');
    console.log('응답 데이터:', response.data);
    console.log('예측 가격:', response.data.predicted_price);
    console.log('신뢰도:', response.data.confidence);
    
    return response.data;
  },
};

export default apiClient;
