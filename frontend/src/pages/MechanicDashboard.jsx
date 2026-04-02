// frontend/src/pages/MechanicDashboard.jsx
/**
 * 정비사 전용 대시보드
 * - QR 스캔 기능
 * - 최근 작업 목록 (실제 데이터 연동)
 * - 수리한 트랙터 및 이력서 목록
 * - 짙은 네이비/그레이 전문가용 테마
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  QrCode, 
  Wrench, 
  Clock, 
  DollarSign, 
  Activity,
  ArrowRight,
  Settings,
  LogOut,
  Search,
  Filter,
  Home
} from 'lucide-react';

export default function MechanicDashboard() {
  const navigate = useNavigate();
  const [recentWork, setRecentWork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWork, setFilteredWork] = useState([]);

  // 로그아웃 기능
  const handleLogout = () => {
    localStorage.removeItem('agrilog_user_type');
    navigate('/');
  };

  // 대시보드로 이동
  const handleGoToDashboard = () => {
    navigate('/mechanic/dashboard');
  };

  useEffect(() => {
    loadRecentWork();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredWork(recentWork);
    } else {
      const filtered = recentWork.filter(work => 
        work.vin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        work.model_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        work.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        work.service_company?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredWork(filtered);
    }
  }, [searchQuery, recentWork]);

  const loadRecentWork = async () => {
    try {
      // 실제 API 연동 - 모든 농기계와 최신 정비 이력 조회
      const { getMachinesList, getMaintenanceRecords } = await import('../services/api');
      
      // 1. 모든 농기계 목록 조회
      const machinesResponse = await getMachinesList();
      const machines = machinesResponse.machines || [];
      
      // 2. 각 농기계의 최신 정비 이력 조회
      const workData = [];
      
      for (const machine of machines) {
        try {
          // 해당 농기계의 정비 이력 조회
          const maintenanceResponse = await getMaintenanceRecords(machine.vin);
          const maintenanceRecords = maintenanceResponse.records || [];
          
          if (maintenanceRecords.length > 0) {
            // 가장 최신 정비 이력 가져오기
            const latestMaintenance = maintenanceRecords[0];
            
            workData.push({
              vin: machine.vin,
              model_name: machine.model_name,
              manufacturer: machine.manufacturer,
              service_date: latestMaintenance.service_date,
              total_cost: latestMaintenance.total_cost || 0,
              status: latestMaintenance.status || 'completed',
              parts_count: latestMaintenance.parts_count || 0,
              service_company: latestMaintenance.service_company || '미등록',
              service_description: latestMaintenance.service_description || '',
              maintenance_id: latestMaintenance.id,
              total_hours: machine.total_hours || 0,
              machine_id: machine.id
            });
          } else {
            // 정비 이력이 없는 경우 기본 정보만 표시
            workData.push({
              vin: machine.vin,
              model_name: machine.model_name,
              manufacturer: machine.manufacturer,
              service_date: null,
              total_cost: 0,
              status: 'no_maintenance',
              parts_count: 0,
              service_company: '미등록',
              service_description: '정비 이력 없음',
              maintenance_id: null,
              total_hours: machine.total_hours || 0,
              machine_id: machine.id
            });
          }
        } catch (error) {
          console.error(`${machine.vin} 정비 이력 조회 실패:`, error);
          // 정비 이력 조회 실패 시 기본 정보만 추가
          workData.push({
            vin: machine.vin,
            model_name: machine.model_name,
            manufacturer: machine.manufacturer,
            service_date: null,
            total_cost: 0,
            status: 'error',
            parts_count: 0,
            service_company: '조회 실패',
            service_description: '정비 이력 조회 실패',
            maintenance_id: null,
            total_hours: machine.total_hours || 0,
            machine_id: machine.id
          });
        }
      }
      
      // 3. 정비일자 기준 내림차순 정렬 (최신 정비가 위로)
      workData.sort((a, b) => {
        if (!a.service_date) return 1;
        if (!b.service_date) return -1;
        return new Date(b.service_date) - new Date(a.service_date);
      });
      
      setRecentWork(workData);
      setFilteredWork(workData);
      
      console.log('🔧 정비사용 대시보드 데이터 로드 완료:', {
        total_machines: machines.length,
        machines_with_maintenance: workData.filter(w => w.service_date).length,
        latest_work: workData.slice(0, 5)
      });
      
    } catch (error) {
      console.error('최근 작업 목록 로드 실패:', error);
      
      // API 호출 실패 시 모의 데이터로 대체
      const mockData = [
        {
          vin: 'DI0060240001',
          model_name: 'ERP60',
          manufacturer: '대동',
          service_date: '2024-03-15',
          total_cost: 1500000,
          status: 'completed',
          parts_count: 3,
          service_company: '대동농기계 서비스센터',
          service_description: '엔진 오일 교체 및 필터 점검',
          maintenance_id: null,
          total_hours: 1250,
          machine_id: null
        },
        {
          vin: 'DC0001240001',
          model_name: 'R1',
          manufacturer: '대동',
          service_date: '2024-03-14',
          total_cost: 800000,
          status: 'completed',
          parts_count: 2,
          service_company: 'LS농기계 정비소',
          service_description: '타이어 교체',
          maintenance_id: null,
          total_hours: 890,
          machine_id: null
        }
      ];
      
      setRecentWork(mockData);
      setFilteredWork(mockData);
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = () => {
    navigate('/mechanic/qr-scan');
  };

  const handleWorkDetail = (vin) => {
    navigate(`/mechanic/machine/${vin}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'in_progress':
        return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'no_maintenance':
        return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
      case 'error':
        return 'bg-red-600/20 text-red-400 border-red-600/30';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return '정비 완료';
      case 'in_progress':
        return '진행 중';
      case 'no_maintenance':
        return '정비 이력 없음';
      case 'error':
        return '조회 실패';
      default:
        return '알 수 없음';
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* 헤더 */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">AgriLog Mechanic</h1>
                  <p className="text-sm text-gray-400">정비사 전용 포탈</p>
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
        {/* 퀵 스캔 영역 */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <QrCode className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">QR 코드 스캔</h2>
              <p className="text-xl text-blue-100 mb-6">
                장비의 QR 코드를 스캔하여 정비 정보를 즉시 확인하세요
              </p>
              <button
                onClick={handleQRScan}
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors flex items-center mx-auto"
              >
                <QrCode className="w-6 h-6 mr-3" />
                스캔 시작하기
              </button>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-sm text-gray-400">총계</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{recentWork.length}</div>
            <div className="text-sm text-gray-400">등록된 트랙터</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-sm text-gray-400">정비완료</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {recentWork.filter(w => w.service_date).length}
            </div>
            <div className="text-sm text-gray-400">정비 이력</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-sm text-gray-400">총비용</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {recentWork.reduce((sum, w) => sum + w.total_cost, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">정비 비용</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-sm text-gray-400">평균</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {recentWork.length > 0 ? 
                Math.round(recentWork.reduce((sum, w) => sum + w.total_cost, 0) / recentWork.length).toLocaleString() : 0
              }
            </div>
            <div className="text-sm text-gray-400">폄균 비용</div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="VIN, 모델명, 제조사, 서비스업체로 검색..."
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              필터
            </button>
          </div>
        </div>

        {/* 최근 작업 목록 */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-xl font-bold text-white">수리한 트랙터 및 이력서 목록</h3>
            <p className="text-gray-400 mt-1">
              총 {filteredWork.length}대의 트랙터 정비 이력
            </p>
          </div>

          <div className="divide-y divide-gray-700">
            {filteredWork.map((work) => (
              <div 
                key={work.vin} 
                className="p-6 hover:bg-gray-700/50 transition-colors cursor-pointer"
                onClick={() => handleWorkDetail(work.vin)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <div>
                        <h4 className="text-lg font-semibold text-white">{work.model_name}</h4>
                        <p className="text-sm text-gray-400">{work.vin}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(work.status)}`}>
                        {getStatusText(work.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">제조사:</span>
                        <span className="text-white ml-2">{work.manufacturer}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">서비스업체:</span>
                        <span className="text-white ml-2">{work.service_company}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">가동시간:</span>
                        <span className="text-white ml-2">{work.total_hours}시간</span>
                      </div>
                    </div>
                    
                    {work.service_date && (
                      <div className="mt-3">
                        <span className="text-gray-400">최근 정비일:</span>
                        <span className="text-white ml-2">{work.service_date}</span>
                      </div>
                    )}
                    
                    {work.service_description && (
                      <div className="mt-2">
                        <span className="text-gray-400">정비 내용:</span>
                        <span className="text-white ml-2">{work.service_description}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className="text-lg font-bold text-green-400">
                      {(work.total_cost / 10000).toFixed(1)}만원
                    </div>
                    <div className="text-sm text-gray-400">
                      부품 {work.parts_count}개
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredWork.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400 text-lg">검색 결과가 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
