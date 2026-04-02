// frontend/src/services/mechanic-api.js
/**
 * 정비사용 API 서비스
 * - 부품 검색 및 관리
 * - 정비 기록 관리
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// 부품 검색 API
export const searchParts = async (query, limit = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/parts/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('부품 검색에 실패했습니다.');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('부품 검색 오류:', error);
    throw error;
  }
};

// 부품 카테고리 조회
export const getPartCategories = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/parts/categories`);
    
    if (!response.ok) {
      throw new Error('카테고리 조회에 실패했습니다.');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('카테고리 조회 오류:', error);
    throw error;
  }
};

// 인기 부품 조회
export const getPopularParts = async (limit = 20) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/parts/popular?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('인기 부품 조회에 실패했습니다.');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('인기 부품 조회 오류:', error);
    throw error;
  }
};

// 부품 상세 정보 조회
export const getPartDetail = async (partId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/parts/${partId}`);
    
    if (!response.ok) {
      throw new Error('부품 상세 정보 조회에 실패했습니다.');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('부품 상세 정보 조회 오류:', error);
    throw error;
  }
};

// 정비 기록 저장
export const createMaintenanceLog = async (maintenanceData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/maintenance/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(maintenanceData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '정비 기록 저장에 실패했습니다.');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('정비 기록 저장 오류:', error);
    throw error;
  }
};

// 정비 기록 수정
export const updateMaintenanceLog = async (logId, maintenanceData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/maintenance/log/${logId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(maintenanceData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '정비 기록 수정에 실패했습니다.');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('정비 기록 수정 오류:', error);
    throw error;
  }
};

// 농기계별 정비 기록 목록 조회
export const getMaintenanceLogs = async (vin, limit = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/maintenance/log/${vin}?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('정비 기록 목록 조회에 실패했습니다.');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('정비 기록 목록 조회 오류:', error);
    throw error;
  }
};

// 정비 기록 상세 정보 조회
export const getMaintenanceLogDetails = async (logId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/maintenance/log/${logId}/details`);
    
    if (!response.ok) {
      throw new Error('정비 기록 상세 정보 조회에 실패했습니다.');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('정비 기록 상세 정보 조회 오류:', error);
    throw error;
  }
};

// QR 코드 스캔으로 장비 정보 조회
export const getMachineByQRScan = async (vin) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/machines/qr-codes/${vin}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('농기계를 찾을 수 없습니다.');
      } else {
        throw new Error('장비 정보 조회에 실패했습니다.');
      }
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('QR 스캔 장비 정보 조회 오류:', error);
    throw error;
  }
};
