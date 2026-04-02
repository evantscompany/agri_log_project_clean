# frontend/src/utils/qr-scanner.js
/**
 * QR 코드 스캐너 유틸리티
 * - 카메라에서 QR 코드 인식
 * - 실시간 스캔 기능
 */

// QR 코드 스캐 라이브러리 동적 로드
let qrScannerLoaded = false;
let qrScanner = null;

// QR 코드 스캐 라이브러리 로드
const loadQRScanner = async () => {
  if (qrScannerLoaded) return true;
  
  try {
    // jsQR 라이브러리 로드
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.type = 'text/javascript';
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        qrScannerLoaded = true;
        qrScanner = window.JSQR;
        resolve(true);
      };
      script.onerror = () => {
        reject(new Error('QR 코드 스캐 라이브러리 로드 실패'));
      };
      document.head.appendChild(script);
    });
  } catch (error) {
    console.error('QR 코드 스캐 라이브러리 로드 오류:', error);
    return false;
  }
};

// QR 코드 스캔 함수
export const scanQRCode = async (videoElement, canvasElement) => {
  try {
    // QR 코드 스캐 라이브러리 로드
    await loadQRScanner();
    
    if (!qrScanner) {
      throw new Error('QR 코드 스캐 라이브러리를 로드할 수 없습니다.');
    }
    
    // 비디오에서 이미지 캡처
    const context = canvasElement.getContext('2d');
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    // 이미지 데이터 가져오기
    const imageData = context.getImageData(0, 0, canvasElement.width, canvasElement.height);
    
    // QR 코드 인식
    const code = qrScanner(imageData.data, imageData.width, imageData.height);
    
    if (code) {
      return {
        success: true,
        data: code.data,
        location: code.location
      };
    } else {
      return {
        success: false,
        error: 'QR 코드를 찾을 수 없습니다.'
      };
    }
  } catch (error) {
    console.error('QR 코드 스캔 오류:', error);
    return {
      success: false,
      error: error.message || 'QR 코드 스캔 중 오류가 발생했습니다.'
    };
  }
};

// 실시간 QR 코드 스캔 설정
export const setupQRScanner = (videoElement, canvasElement, onQRCodeDetected, options = {}) => {
  const {
    scanInterval = 500, // 스캔 간격 (ms)
    maxAttempts = 100, // 최대 시도 횟수
    onScanStart = () => {},
    onScanEnd = () => {},
    onError = (error) => console.error('QR 스캔 오류:', error)
  } = options;
  
  let isScanning = false;
  let scanCount = 0;
  let scanTimer = null;
  
  const startScanning = async () => {
    if (isScanning) return;
    
    isScanning = true;
    scanCount = 0;
    onScanStart();
    
    const scan = async () => {
      if (!isScanning || scanCount >= maxAttempts) {
        stopScanning();
        return;
      }
      
      try {
        const result = await scanQRCode(videoElement, canvasElement);
        
        if (result.success) {
          // QR 코드 인식 성공
          onQRCodeDetected(result);
          stopScanning();
        } else {
          // 계속 스캔
          scanCount++;
          scanTimer = setTimeout(scan, scanInterval);
        }
      } catch (error) {
        onError(error);
        scanCount++;
        scanTimer = setTimeout(scan, scanInterval);
      }
    };
    
    scan();
  };
  
  const stopScanning = () => {
    isScanning = false;
    if (scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
    onScanEnd();
  };
  
  return {
    start: startScanning,
    stop: stopScanning,
    isScanning: () => isScanning
  };
};

// 카메라 권한 확인
export const checkCameraPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    return { granted: true };
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      return { granted: false, error: '카메라 권한이 거부되었습니다.' };
    } else if (error.name === 'NotFoundError') {
      return { granted: false, error: '카메라를 찾을 수 없습니다.' };
    } else {
      return { granted: false, error: error.message || '카메라 접근 오류' };
    }
  }
};

// 카메라 시작
export const startCamera = async (videoElement, options = {}) => {
  const {
    facingMode = 'environment', // 후면 카메라 우선
    width = { ideal: 1280 },
    height = { ideal: 720 }
  } = options;
  
  try {
    const constraints = {
      video: {
        facingMode,
        width,
        height
      }
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    if (videoElement) {
      videoElement.srcObject = stream;
      
      // 비디오가 시작될 때까지 대기
      return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play();
          resolve(stream);
        };
      });
    }
    
    return stream;
  } catch (error) {
    console.error('카메라 시작 오류:', error);
    throw error;
  }
};

// 카메라 중지
export const stopCamera = (stream) => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
};

// QR 코드 유효성 검사
export const validateQRCode = (qrData) => {
  if (!qrData || typeof qrData !== 'string') {
    return { valid: false, error: '유효하지 않은 QR 코드 데이터입니다.' };
  }
  
  // VIN 번호 패턴 검사 (예: DT123456789024)
  const vinPattern = /^[A-Z]{2}\d{12}$/;
  
  if (vinPattern.test(qrData)) {
    return { valid: true, type: 'VIN', data: qrData };
  }
  
  // 기타 QR 코드 패턴
  if (qrData.length >= 8) {
    return { valid: true, type: 'OTHER', data: qrData };
  }
  
  return { valid: false, error: '지원하지 않는 QR 코드 형식입니다.' };
};

export default {
  loadQRScanner,
  scanQRCode,
  setupQRScanner,
  checkCameraPermission,
  startCamera,
  stopCamera,
  validateQRCode
};
