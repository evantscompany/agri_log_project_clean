// frontend/src/pages/AddMachine.jsx
/**
 * 농기계 추가 페이지
 * - 기대번호(VIN) 입력 및 검증
 * - 농기계 정보 자동 조회
 * - DB에 농기계 등록
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { registerMachine, getMachineDetail } from '../services/api';

export default function AddMachine() {
  const navigate = useNavigate();
  
  // 상태 관리
  const [vin, setVin] = useState('');
  const [productionYear, setProductionYear] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [machineInfo, setMachineInfo] = useState(null);
  const [error, setError] = useState(null);

  /**
   * 기대번호 검증 및 정보 조회
   */
  const handleCheckVIN = async () => {
    if (!vin.trim()) {
      alert('기대번호를 입력해주세요.');
      return;
    }

    if (vin.length < 10) {
      setError('기대번호가 너무 짧습니다. (최소 10자)');
      return;
    }

    try {
      setIsChecking(true);
      setError(null);
      setMachineInfo(null);

      // 기대번호로 모델 정보 조회
      const info = await getMachineDetail(vin.toUpperCase());
      setMachineInfo(info);
      
      // 연식이 자동으로 추출되었으면 설정
      if (info.연식) {
        setProductionYear(info.연식.toString());
      }

    } catch (err) {
      console.error('기대번호 확인 실패:', err);
      setError(err.message || '기대번호를 확인할 수 없습니다.');
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * 농기계 등록
   */
  const handleRegister = async () => {
    if (!vin.trim()) {
      alert('기대번호를 입력해주세요.');
      return;
    }

    try {
      setIsRegistering(true);
      setError(null);

      const year = productionYear ? parseInt(productionYear) : null;
      const result = await registerMachine(vin.toUpperCase(), year);

      // 복구된 경우와 신규 등록된 경우를 구분하여 메시지 표시
      if (result.restored) {
        alert('농기계가 성공적으로 복구되었습니다! 기존 정비 이력을 확인할 수 있습니다.');
      } else {
        alert('농기계가 성공적으로 등록되었습니다!');
      }
      
      navigate(`/machine/${result.vin}`);

    } catch (err) {
      console.error('농기계 등록 실패:', err);
      setError(err.message || '농기계 등록에 실패했습니다.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-4 md:p-6">
      {/* 뒤로가기 버튼 */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-gray-700 hover:text-green-600 mb-6 text-lg font-semibold transition-colors"
      >
        <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
        <span>돌아가기</span>
      </button>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">농기계 추가</h1>
        <p className="text-lg text-gray-600 mb-6">기대번호를 입력하여 농기계를 등록하세요</p>

        {/* 기대번호 입력 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="mb-6">
            <label className="block text-lg font-bold text-gray-900 mb-3">
              기대번호 (VIN) *
            </label>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={vin}
                onChange={(e) => {
                  setVin(e.target.value.toUpperCase());
                  setError(null);
                  setMachineInfo(null);
                }}
                className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="예: DT123456789024"
              />
              <button
                onClick={handleCheckVIN}
                disabled={isChecking || !vin.trim()}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    확인 중...
                  </>
                ) : (
                  '확인'
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              농기계에 표시된 기대번호를 정확히 입력해주세요
            </p>
          </div>

          {/* 생산연식 (선택) */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-gray-900 mb-3">
              생산연식 (선택)
            </label>
            <input
              type="number"
              value={productionYear}
              onChange={(e) => setProductionYear(e.target.value)}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="예: 2024"
              min="2000"
              max={new Date().getFullYear() + 1}
            />
            <p className="text-sm text-gray-500 mt-2">
              생산연식을 입력하면 더 정확한 관리가 가능합니다
            </p>
          </div>

          {/* 오류 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">오류</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 기계 정보 표시 */}
          {machineInfo && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-2">✅ 기계 정보 확인</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-green-700 mb-1">제조사</p>
                      <p className="font-medium text-green-900">{machineInfo.제조사}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700 mb-1">기종</p>
                      <p className="font-medium text-green-900">{machineInfo.기종}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700 mb-1">모델명</p>
                      <p className="font-medium text-green-900">{machineInfo.모델명}</p>
                    </div>
                    {machineInfo.연식 && (
                      <div>
                        <p className="text-sm text-green-700 mb-1">연식</p>
                        <p className="font-medium text-green-900">{machineInfo.연식}년</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 등록 버튼 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleRegister}
              disabled={isRegistering || !vin.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  등록 중...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  등록하기
                </>
              )}
            </button>
          </div>
        </div>

        {/* 안내 사항 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">💡 등록 안내</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-1">•</span>
              <span className="text-sm">기대번호는 농기계에 부착된 고유 식별번호입니다</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-1">•</span>
              <span className="text-sm">기대번호를 입력하면 자동으로 모델 정보를 조회합니다</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-1">•</span>
              <span className="text-sm">이미 등록된 농기계는 중복 등록할 수 없습니다</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-1">•</span>
              <span className="text-sm">정확한 기대번호를 입력해주세요</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
