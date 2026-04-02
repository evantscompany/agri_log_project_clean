import { useNavigate } from 'react-router-dom';
import { FileText, Wrench, Clock, DollarSign, Activity, ChevronRight, QrCode, Trash2, AlertTriangle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { deleteMachine } from '../services/api';

export function MachineCard({ machine }) {
  const navigate = useNavigate();

  const handleQRClick = (e) => {
    e.stopPropagation();
    // QR 코드 모달 열기 이벤트 발송
    window.dispatchEvent(new CustomEvent('openQRModal', { 
      detail: { machineId: machine.id, vin: machine.vin } 
    }));
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    
    if (window.confirm(`${machine.model || machine.name} 농기계를 정말 삭제하시겠습니까?\n\n삭제된 데이터는 복구할 수 없습니다.`)) {
      handleDeleteMachine();
    }
  };

  const handleDeleteMachine = async () => {
    try {
      const result = await deleteMachine(machine.vin);
      
      // 성공 메시지 표시 (보존된 이력과 기대번호 정보 포함)
      let message = `${machine.model || machine.name} 농기계가 삭제되었습니다.`;
      if (result.preserved_records > 0) {
        message += `\n\n✅ 정비 이력 ${result.preserved_records}건이 보존되었습니다.`;
        message += `\n✅ 기대번호 정보는 그대로 유지됩니다.`;
      } else {
        message += `\n\n정비 이력이 없는 농기계였습니다.`;
      }
      
      alert(message);
      
      // 성공적으로 삭제되면 페이지 새로고침
      window.location.reload();
    } catch (error) {
      console.error('농기계 삭제 실패:', error);
      alert('농기계 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div
      onClick={() => navigate(`/machine/${machine.id}`)}
      className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-200 hover:border-emerald-500 transition-all cursor-pointer overflow-hidden group"
    >
      {/* 이미지 섹션 */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={machine.image}
          alt={machine.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3">
          <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-white">
            <span className="text-sm font-bold text-emerald-600">{machine.year}년</span>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      {/* 정보 섹션 */}
      <div className="p-5">
        {/* 기대번호와 모델 정보 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{machine.name}</h3>
              <p className="text-lg text-gray-600 mb-1">{machine.model}</p>
              <p className="text-sm text-gray-500">{machine.manufacturer}</p>
            </div>
            <div className="text-right">
              <div className="bg-slate-700 text-white px-3 py-1 rounded-lg shadow-sm">
                <p className="text-xs font-medium mb-1">기대번호</p>
                <p className="text-sm font-bold">{machine.vin}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 통계 정보 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
            <div className="flex items-center justify-center mb-1">
              <FileText className="w-4 h-4 text-slate-700" />
            </div>
            <div className="text-xs text-slate-600">정비 이력</div>
            <div className="text-lg font-bold text-slate-900">{machine.totalRecords}</div>
            <div className="text-xs text-slate-500">건</div>
          </div>
          
          <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
            <div className="flex items-center justify-center mb-1">
              <Clock className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-xs text-amber-600">사용시간</div>
            <div className="text-lg font-bold text-amber-900">{machine.totalHours}h</div>
            <div className="text-xs text-amber-500">시간</div>
          </div>
        </div>

        {/* 추가 정보 */}
        <div className="space-y-2 mb-4">
          {machine.lastMaintenance && (
            <div className="flex items-center justify-between text-sm bg-emerald-50 rounded-lg p-2 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-700">
                <Wrench className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">최근 정비</span>
              </div>
              <span className="font-bold text-emerald-900">{machine.lastMaintenance}</span>
            </div>
          )}
          
          {machine.totalCost > 0 && (
            <div className="flex items-center justify-between text-sm bg-blue-50 rounded-lg p-2 border border-blue-200">
              <div className="flex items-center gap-2 text-blue-700">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span className="font-medium">총 비용</span>
              </div>
              <span className="font-bold text-blue-900">{(machine.totalCost / 10000).toFixed(1)}만원</span>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2 p-4 border-t border-gray-100">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/machine/${machine.id}`);
            }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            상세보기
            <ChevronRight className="w-4 h-4" />
          </button>
          
          <button 
            onClick={handleQRClick}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all flex items-center justify-center shadow-sm"
            title="QR 코드"
          >
            <QrCode className="w-5 h-5" />
          </button>
          
          <button 
            onClick={handleDelete}
            className="w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all flex items-center justify-center shadow-sm"
            title="농기계 삭제"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
