// frontend/src/pages/MechanicQRScan.jsx
/**
 * 정비사용 QR 스캔 페이지
 * - 카메라로 QR 코드 스캔
 * - VIN 입력 수동 옵션
 * - 장비 정보 즉시 표시
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  QrCode, 
  Camera, 
  Keyboard,
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  LogOut,
  Home
} from 'lucide-react';

export default function MechanicQRScan() {
  const navigate = useNavigate();
  const [scanMode, setScanMode] = useState('camera'); // 'camera' | 'manual'
  const [vinInput, setVinInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [machineData, setMachineData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrScanner, setQrScanner] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  // 로그아웃 기능
  const handleLogout = () => {
    localStorage.removeItem('agrilog_user_type');
    navigate('/');
  };

  // 대시보드로 이동
  const handleGoToDashboard = () => {
    navigate('/mechanic/dashboard');
  };

  // QR 코드 인식 처리 (간단한 구현)
  const handleQRCodeDetected = async (result) => {
    try {
      setScanning(false);
      
      // 간단한 VIN 패턴 검사
      const vinPattern = /^[A-Z]{2}\d{12}$/;
      if (vinPattern.test(result.data)) {
        setScanResult({
          success: true,
          vin: result.data,
          message: 'QR 코드를 성공적으로 인식했습니다.'
        });
        
        // 기계 정보 조회
        await loadMachineData(result.data);
      } else {
        setScanResult({
          success: false,
          error: '지원하지 않는 QR 코드 형식입니다. VIN 번호를 포함한 QR 코드를 스캔해주세요.'
        });
      }
    } catch (error) {
      console.error('QR 코드 처리 오류:', error);
      setScanResult({
        success: false,
        error: 'QR 코드 처리 중 오류가 발생했습니다.'
      });
    }
  };

  // 카메라 관련
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    if (scanMode === 'camera') {
      initializeCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
      if (qrScanner) {
        qrScanner.stop();
      }
    };
  }, [scanMode]);

  const initializeCamera = async () => {
    try {
      setError(null);
      setScanResult(null);
      
      // 카메라 시작
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        
        // 비디오가 시작될 때까지 대기
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startScanning();
        };
      }
      
    } catch (err) {
      console.error('카메라 접근 실패:', err);
      setError('카메라에 접근할 수 없습니다. 수동 입력을 사용해주세요.');
      setScanMode('manual');
    }
  };

  const startScanning = () => {
    setScanning(true);
    
    // 간단한 스캔 시뮬레이션 (실제 QR 라이브러리 없이)
    setTimeout(() => {
      // 테스트용 VIN으로 시뮬레이션
      const testVin = 'DI0060240001';
      handleQRCodeDetected({ data: testVin });
    }, 3000);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (qrScanner) {
      qrScanner.stop();
      setQrScanner(null);
    }
    
    setScanning(false);
  };

  const handleManualSearch = async () => {
    if (!vinInput.trim()) {
      setError('VIN을 입력해주세요.');
      return;
    }

    await loadMachineData(vinInput.trim().toUpperCase());
  };

  const loadMachineData = async (vin) => {
    setLoading(true);
    setError(null);
    setMachineData(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/machines/qr-codes/${vin}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('농기계를 찾을 수 없습니다.');
        } else {
          throw new Error('서버 오류가 발생했습니다.');
        }
      }

      const result = await response.json();
      
      if (result.success) {
        setMachineData(result.data);
      } else {
        throw new Error('데이터 조회에 실패했습니다.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMachineDetail = () => {
    if (machineData) {
      navigate(`/mechanic/machine/${machineData.machine_info.vin}`);
    }
  };

  const handleBack = () => {
    navigate('/mechanic/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* 헤더 */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg mr-4"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">QR 코드 스캔</h1>
                  <p className="text-sm text-gray-400">장비 정보 조회</p>
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
        {/* 스캔 모드 선택 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setScanMode('camera')}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                scanMode === 'camera'
                  ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                  : 'border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              <Camera className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">카메라 스캔</div>
              <div className="text-sm opacity-75">QR 코드를 촬영하여 조회</div>
            </button>
            
            <button
              onClick={() => setScanMode('manual')}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                scanMode === 'manual'
                  ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                  : 'border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              <Keyboard className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">수동 입력</div>
              <div className="text-sm opacity-75">VIN 번호를 직접 입력</div>
            </button>
          </div>
        </div>

        {/* 카메라 스캔 모드 */}
        {scanMode === 'camera' && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-96 object-cover"
              />
              
              {/* 스캔 상태 표시 */}
              {scanning && (
                <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  스캔 중...
                </div>
              )}
              
              {/* 스캔 영역 표시 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-4 border-blue-500 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      {scanning ? (
                        <>
                          <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                          <p className="text-white text-lg font-semibold">QR 코드를 스캔 중...</p>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                          <p className="text-white text-lg font-semibold">QR 코드를 스캔하세요</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 text-center">
              <p className="text-gray-400 mb-4">
                장비의 QR 코드를 카메라에 비추면 자동으로 인식됩니다.
              </p>
              <button
                onClick={() => setScanMode('manual')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                QR 코드가 없다면 수동 입력을 사용하세요
              </button>
            </div>
          </div>
        )}

        {/* 수동 입력 모드 */}
        {scanMode === 'manual' && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="mb-6">
              <label className="block text-lg font-semibold text-white mb-3">
                VIN 번호 입력
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={vinInput}
                  onChange={(e) => {
                    setVinInput(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="예: DT123456789024"
                  className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={20}
                />
                <button
                  onClick={handleManualSearch}
                  disabled={loading || !vinInput.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      조회 중...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      조회
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                농기계에 부착된 VIN 번호를 정확히 입력해주세요.
              </p>
            </div>
          </div>
        )}

        {/* 스캔 결과 메시지 */}
        {scanResult && (
          <div className={`rounded-xl p-6 mb-6 ${
            scanResult.success 
              ? 'bg-green-900/20 border border-green-600' 
              : 'bg-yellow-900/20 border border-yellow-600'
          }`}>
            <div className="flex items-start">
              {scanResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-500 mr-3 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${
                  scanResult.success ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {scanResult.success ? 'QR 코드 인식 성공' : 'QR 코드 인식 실패'}
                </h3>
                <p className="text-sm text-gray-300">
                  {scanResult.success ? scanResult.message : scanResult.error}
                </p>
                {scanResult.success && (
                  <div className="mt-2">
                    <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                      VIN: {scanResult.vin}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-xl p-6 mb-6">
            <div className="flex items-start">
              <XCircle className="w-6 h-6 text-red-500 mr-3 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-400 mb-1">오류</h3>
                <p className="text-sm text-gray-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 로딩 상태 */}
        {loading && (
          <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-xl text-gray-300">장비 정보를 조회하는 중...</p>
          </div>
        )}

        {/* 장비 정보 표시 */}
        {machineData && !loading && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-6 bg-green-900/20 border-b border-green-600">
              <div className="flex items-center">
                <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
                <div>
                  <h3 className="text-green-400 font-semibold">장비 정보 조회 완료</h3>
                  <p className="text-green-300 text-sm">정비 기록을 확인하고 새로운 정비를 등록할 수 있습니다.</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* 기본 정보 */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-4">기본 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">VIN</div>
                    <div className="text-lg font-bold text-white">{machineData.machine_info.vin}</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">모델명</div>
                    <div className="text-lg font-bold text-white">{machineData.machine_info.model_name}</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">제조사</div>
                    <div className="text-lg font-bold text-white">{machineData.machine_info.manufacturer}</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">가동시간</div>
                    <div className="text-lg font-bold text-white">{machineData.machine_info.total_hours}시간</div>
                  </div>
                </div>
              </div>

              {/* 정비 이력 */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-4">최근 정비 이력</h4>
                <div className="space-y-3">
                  {machineData.maintenance_history.slice(0, 3).map((history, index) => (
                    <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm text-gray-400">{history.service_date}</div>
                          <div className="text-white font-semibold">{history.service_company || '미등록'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-400">{(history.total_cost / 10000).toFixed(0)}만원</div>
                          <div className="text-sm text-gray-400">부품 {history.parts_count}개</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setMachineData(null);
                    setVinInput('');
                    setError(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                >
                  다시 조회
                </button>
                <button
                  onClick={handleMachineDetail}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  상세 정보 및 정비 등록
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
