import React, { useState, useEffect, useRef } from 'react';
import { Plus, Camera, FileText, TrendingUp, QrCode, X, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FloatingActionButtons = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAllQRCodes, setShowAllQRCodes] = useState(true);
  const [position, setPosition] = useState({ bottom: 24, right: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);
  const navigate = useNavigate();

  // QR 모달 이벤트 수신
  useEffect(() => {
    const handleOpenQRModal = (event) => {
      const { machineId, vin } = event.detail || {};
      setShowQRModal(true);
      setIsOpen(false);
      setShowAllQRCodes(false); // 개별 농기계 모드
      loadQRCodes(vin); // 특정 VIN 필터링
    };

    window.addEventListener('openQRModal', handleOpenQRModal);
    return () => window.removeEventListener('openQRModal', handleOpenQRModal);
  }, []);

  // QR 코드 로드 (전체 또는 개별)
  async function loadQRCodes(targetVin = null) {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/machines/qr-codes/all');
      const data = await response.json();
      
      if (data.qr_codes && data.qr_codes.length > 0) {
        // 특정 VIN이 있으면 필터링
        const filteredQRCodes = targetVin 
          ? data.qr_codes.filter(qr => qr.vin === targetVin)
          : data.qr_codes;
        
        if (filteredQRCodes.length > 0) {
          setQrCodes(filteredQRCodes);
        } else {
          alert(targetVin ? '해당 농기계의 QR 코드를 찾을 수 없습니다.' : '등록된 농기계가 없습니다.');
          setShowQRModal(false);
        }
      } else {
        alert('등록된 농기계가 없습니다.');
        setShowQRModal(false);
      }
    } catch (error) {
      console.error('QR 코드 로드 실패:', error);
      alert('QR 코드를 불러오는 중 오류가 발생했습니다.');
      setShowQRModal(false);
    } finally {
      setLoading(false);
    }
  }

  const actions = [
    {
      icon: Plus,
      label: '농기계 추가',
      color: 'bg-emerald-600 hover:bg-emerald-700',
      onClick: () => navigate('/add-machine')
    },
    {
      icon: Camera,
      label: '영수증 스캔',
      color: 'bg-blue-600 hover:bg-blue-700',
      onClick: () => navigate('/scan')
    },
    {
      icon: FileText,
      label: '직접 입력',
      color: 'bg-slate-700 hover:bg-slate-800',
      onClick: () => navigate('/select-machine')
    },
    {
      icon: TrendingUp,
      label: '중고시세 보기',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      onClick: () => navigate('/price-prediction')
    },
    {
      icon: QrCode,
      label: 'QR 코드',
      color: 'bg-slate-600 hover:bg-slate-700',
      onClick: handleQRCodeClick
    }
  ];

  async function handleQRCodeClick() {
    setShowAllQRCodes(true); // 모든 농기계 모드
    await loadQRCodes(); // 전체 QR 코드 로드
  }

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // 드래그 기능 핸들러
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.right,
      y: e.clientY - position.bottom
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newRight = window.innerWidth - e.clientX + dragStart.x;
    const newBottom = window.innerHeight - e.clientY + dragStart.y;
    
    // 화면 경계 제한
    const maxRight = window.innerWidth - 80; // 버튼 크기 고려
    const maxBottom = window.innerHeight - 80;
    
    setPosition({
      right: Math.max(0, Math.min(newRight, maxRight)),
      bottom: Math.max(0, Math.min(newBottom, maxBottom))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 전역 마우스 이벤트 리스너
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <>
      {/* 모바일에서만 표시 */}
      <div 
        ref={buttonRef}
        className="lg:hidden fixed z-50"
        style={{ 
          bottom: `${position.bottom}px`, 
          right: `${position.right}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {/* 메뉴 버튼들 */}
        <div className={`relative ${isOpen ? 'space-y-3' : ''}`}>
          {isOpen && (
            <div className="absolute bottom-16 right-0 space-y-3">
              {actions.map((action, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 bg-white rounded-full shadow-lg px-4 py-3 transition-all duration-300 ${
                    isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
                  }`}
                  style={{
                    transitionDelay: `${(actions.length - index - 1) * 50}ms`
                  }}
                >
                  {/* 아이콘 버튼 */}
                  <button
                    onClick={action.onClick}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-300 ${action.color}`}
                  >
                    <action.icon size={18} />
                  </button>
                  
                  {/* 라벨 */}
                  <span className="text-gray-800 font-medium text-sm whitespace-nowrap pr-2">
                    {action.label}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {/* 메인 FAB 버튼 */}
          <div className="relative group">
            {/* 툴팁 */}
            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap">
                <div className="font-semibold">빠른 메뉴</div>
                <div className="text-xs text-gray-300">농기계 관리 기능</div>
                <div className="absolute -bottom-1 right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
            
            {/* 드래그 핸들 */}
            <div 
              className="absolute -top-2 -left-2 w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={handleMouseDown}
            >
              <GripVertical size={12} className="text-white" />
            </div>
            
            <button
              onClick={toggleMenu}
              className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-300 ${
                isOpen 
                  ? 'bg-red-600 hover:bg-red-700 rotate-45 scale-110' 
                  : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-110'
              }`}
            >
              {isOpen ? <X size={24} /> : <Plus size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* QR 코드 모달 */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {showAllQRCodes ? '모든 농기계 QR 코드' : '농기계 QR 코드'}
              </h2>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {qrCodes.map((qr, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex flex-col items-center space-y-4">
                      {/* QR 코드 이미지 */}
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <img 
                          src={qr.qr_code} 
                          alt={`${qr.vin} QR 코드`}
                          className="w-32 h-32 object-contain"
                        />
                      </div>
                      
                      {/* 농기계 정보 */}
                      <div className="text-center space-y-1 w-full">
                        <p className="font-bold text-gray-900 text-lg">{qr.vin}</p>
                        <p className="text-sm text-gray-700 font-medium">{qr.machine_info.base_model_name}</p>
                        <p className="text-xs text-gray-500">
                          {qr.machine_info.mfg_name} • {qr.machine_info.cat_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {qr.machine_info.production_year}년 • {qr.machine_info.total_hours}시간
                        </p>
                      </div>
                      
                      {/* 다운로드 버튼 */}
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = qr.qr_code;
                          link.download = `${qr.vin}_qr.png`;
                          link.click();
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                        다운로드
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingActionButtons;
