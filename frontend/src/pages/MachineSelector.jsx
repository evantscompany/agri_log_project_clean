// frontend/src/pages/MachineSelector.jsx
/**
 * 농기계 선택 모달 컴포넌트
 * - 여러 농기계 중 하나를 선택하여 정비 이력 추가
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Tractor } from 'lucide-react';
import { getMachinesList } from '../services/api';

export default function MachineSelector() {
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fadeIn, setFadeIn] = useState(false);

  // 컴포넌트 마운트 시 페이드인 효과
  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeIn(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 농기계 목록 조회
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const data = await getMachinesList();
        setMachines(data.machines || []);
      } catch (error) {
        console.error('농기계 목록 조회 실패:', error);
        alert('농기계 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchMachines();
  }, []);

  // 검색 필터링
  const filteredMachines = machines.filter(machine => 
    machine.vin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 농기계 선택 시
  const handleSelectMachine = (vin) => {
    navigate(`/machine/${vin}/add-record`);
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center p-6 transition-opacity duration-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-2xl text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6 transition-opacity duration-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      {/* 헤더 */}
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-lg"
        >
          <ArrowLeft className="w-6 h-6" />
          뒤로 가기
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">농기계 선택</h1>
          <p className="text-xl text-gray-600">정비 이력을 추가할 농기계를 선택하세요</p>
        </div>

        {/* 검색 바 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
            <input
              type="text"
              placeholder="기대번호, 모델명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 농기계 목록 */}
        {filteredMachines.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-2xl text-gray-600">
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 농기계가 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMachines.map((machine) => (
              <button
                key={machine.vin}
                onClick={() => handleSelectMachine(machine.vin)}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all text-left border-2 border-transparent hover:border-green-500"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 rounded-xl p-3">
                    <Tractor className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {machine.model || '모델명 없음'}
                    </h3>
                    <div className="space-y-1 text-gray-600">
                      <p className="text-lg">
                        <span className="font-semibold">기대번호:</span> {machine.vin}
                      </p>
                      <p className="text-lg">
                        <span className="font-semibold">제조사:</span> {machine.manufacturer || '-'}
                      </p>
                      <p className="text-lg">
                        <span className="font-semibold">연식:</span> {machine.year || '-'}년
                      </p>
                      <p className="text-lg">
                        <span className="font-semibold">총 이력:</span> {machine.totalRecords || 0}건
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
