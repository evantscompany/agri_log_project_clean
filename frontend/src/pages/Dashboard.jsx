// frontend/src/pages/Dashboard.jsx
/**
 * 대시보드 페이지
 * - 등록된 농기계 목록 표시
 * - 영수증 스캔 및 직접 입력 기능 제공
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tractor, Plus, Camera, History, Search, TrendingUp, Settings, BarChart3, Wrench, Calendar, Clock, DollarSign, Activity, Info, Calculator } from 'lucide-react';
import { MachineCard } from '../components/MachineCard';
import FloatingActionButtons from '../components/FloatingActionButtons';
import { getMachinesList } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [fadeIn, setFadeIn] = useState(false);
  const [showUserSwitchInfo, setShowUserSwitchInfo] = useState(false);
  
  // 상태 관리
  const [machines, setMachines] = useState([]);
  const [filteredMachines, setFilteredMachines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 컴포넌트 마운트 시 페이드인 효과
  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeIn(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 통계 데이터 계산
  const calculateStats = () => {
    const totalMachines = machines.length;
    const totalRecords = machines.reduce((sum, m) => sum + (m.totalRecords || 0), 0);
    const totalCost = machines.reduce((sum, m) => sum + (m.totalCost || 0), 0);
    const avgHours = machines.length > 0 ? 
      Math.round(machines.reduce((sum, m) => sum + (m.totalHours || 0), 0) / machines.length) : 0;
    
    return {
      totalMachines,
      totalRecords,
      totalCost,
      avgHours
    };
  };

  const stats = calculateStats();

  // 컴포넌트 마운트 시 농기계 목록 조회
  useEffect(() => {
    loadMachines();
  }, []);

  /**
   * 백엔드에서 농기계 목록 불러오기
   */
  const loadMachines = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMachinesList();
      setMachines(data.machines || []);
      setFilteredMachines(data.machines || []);
    } catch (err) {
      console.error('농기계 목록 로드 실패:', err);
      setError(err.message || '농기계 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 검색어 변경 시 필터링
   */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMachines(machines);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = machines.filter(machine => {
      // 기대번호, 이름, 모델명, 제조사로 검색
      return (
        machine.vin?.toLowerCase().includes(query) ||
        machine.name?.toLowerCase().includes(query) ||
        machine.model?.toLowerCase().includes(query) ||
        machine.manufacturer?.toLowerCase().includes(query)
      );
    });
    
    setFilteredMachines(filtered);
  }, [searchQuery, machines]);

  // 로딩 중 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">농기계 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 발생 시 표시
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">{error}</p>
          <button
            onClick={loadMachines}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 p-4 md:p-6 transition-opacity duration-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                <Tractor className="w-8 h-8 text-white" strokeWidth={2} />
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">AgriLog</h1>
              <p className="text-lg text-gray-600 mt-1">농기계 데이터 이력관리 시스템</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <button
                onMouseEnter={() => setShowUserSwitchInfo(true)}
                onMouseLeave={() => setShowUserSwitchInfo(false)}
                onClick={() => {
                  sessionStorage.removeItem('agrilog_visited');
                  localStorage.removeItem('agrilog_user_type');
                  window.location.href = '/';
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                <Tractor className="w-5 h-5" />
                <span className="hidden md:inline font-medium">사용자 전환</span>
                <Info className="w-4 h-4" />
              </button>
              
              {/* 툴팁 */}
              {showUserSwitchInfo && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900 text-white text-sm rounded-lg p-3 z-50 shadow-lg">
                  <div className="font-semibold mb-2">사용자 전환</div>
                  <div className="text-xs text-gray-300">
                    • 트랙터 소유자 ↔ 정비업체 전환<br/>
                    • 초기화 후 다시 사용자 유형 선택<br/>
                    • 모든 설정이 초기화됩니다
                  </div>
                  <div className="absolute -top-2 right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Tractor className="w-4 h-4 text-slate-700" />
              </div>
              <span className="text-xs font-medium text-gray-600">보유 농기계</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold text-gray-900">{stats.totalMachines}</p>
              <p className="text-xs text-gray-500">대</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Wrench className="w-4 h-4 text-emerald-700" />
              </div>
              <span className="text-xs font-medium text-gray-600">총 정비 이력</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold text-gray-900">{stats.totalRecords}</p>
              <p className="text-xs text-gray-500">건</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-700" />
              </div>
              <span className="text-xs font-medium text-gray-600">총 정비 비용</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalCost >= 10000 
                  ? `${(stats.totalCost / 10000).toFixed(0)}만`
                  : `${(stats.totalCost / 1000).toFixed(0)}천`
                }
              </p>
              <p className="text-xs text-gray-500">원</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-700" />
              </div>
              <span className="text-xs font-medium text-gray-600">평균 사용시간</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold text-gray-900">{stats.avgHours}</p>
              <p className="text-xs text-gray-500">시간</p>
            </div>
          </div>
        </div>

        {/* 검색 바 */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="기대번호, 모델명, 제조사로 검색..."
            className="w-full pl-12 pr-4 py-3 text-lg border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm"
          />
        </div>
      </div>

      {/* 웹에서만 보이는 액션 버튼들 */}
      <div className="hidden lg:grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => navigate('/add-machine')}
          className="group bg-white border border-gray-200 hover:border-emerald-500 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <Plus className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">농기계 추가</h3>
          <p className="text-sm text-gray-600">새 농기계 등록</p>
        </button>

        <button
          onClick={() => navigate('/scan')}
          className="group bg-white border border-gray-200 hover:border-blue-500 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">영수증 스캔</h3>
          <p className="text-sm text-gray-600">카메라로 촬영</p>
        </button>

        <button
          onClick={() => {
            if (machines.length === 0) {
              alert('먼저 농기계를 추가해주세요.');
              return;
            }
            if (machines.length === 1) {
              navigate(`/machine/${machines[0].id}/add-record`);
            } else {
              navigate('/select-machine');
            }
          }}
          className="group bg-white border border-gray-200 hover:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <Plus className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">직접 입력</h3>
          <p className="text-sm text-gray-600">수동으로 입력</p>
        </button>

        <button
          onClick={() => navigate('/price-prediction')}
          className="group bg-white border border-gray-200 hover:border-indigo-500 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">중고시세 보기</h3>
          <p className="text-sm text-gray-600">예상 가격 확인</p>
        </button>
      </div>

      {/* 내 농기계 예상 가격 버튼 */}
      {machines.length > 0 && (
        <div className="bg-indigo-600 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-white">
              <h3 className="text-xl md:text-2xl font-bold mb-2">내 농기계 예상 가격은?</h3>
              <p className="text-sm md:text-base text-indigo-100">
                보유한 {machines.length}대 농기계의 현재 시세를 AI로 예측해보세요
              </p>
            </div>
            <button
              onClick={() => navigate('/machine-price-prediction')}
              className="flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <Calculator className="w-5 h-5" />
              <span>가격 예측하기</span>
            </button>
          </div>
        </div>
      )}

      {/* 농기계 목록 */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">내 농기계</h2>
            <p className="text-lg text-gray-600">
              {searchQuery ? `검색 결과 ${filteredMachines.length}대` : `총 ${machines.length}대`}
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <button
              onClick={() => navigate('/add-machine')}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">농기계 추가</span>
            </button>
          </div>
        </div>
        
        {filteredMachines.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tractor className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? '검색 결과가 없습니다' : '등록된 농기계가 없습니다'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? '다른 검색어를 시도해보세요' : '첫 번째 농기계를 추가해보세요'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate('/add-machine')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                농기계 추가하기
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMachines.map((machine) => (
              <MachineCard key={machine.id} machine={machine} />
            ))}
          </div>
        )}
      </div>
      
      {/* 모바일 플로팅 액션 버튼 */}
      <FloatingActionButtons />
    </div>
  );
}
