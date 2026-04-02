// frontend/src/pages/PricePrediction.jsx
/**
 * 중고 농기계 시세 예측 페이지
 * 기대번호와 사용시간을 입력하여 예상 가격을 계산
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Calculator, ArrowLeft, Search } from 'lucide-react';
import { predictMachinePrice } from '../services/api';

export default function PricePrediction() {
  const navigate = useNavigate();
  
  // 상태 관리
  const [vin, setVin] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [loading, setLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [error, setError] = useState(null);

  /**
   * 가격 예측 처리
   */
  const handlePredict = async (e) => {
    e.preventDefault();
    
    // 입력값 검증
    if (!vin.trim()) {
      setError('기대번호를 입력해주세요.');
      return;
    }
    
    if (!workingHours || workingHours < 0) {
      setError('사용시간을 올바르게 입력해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // API 호출
      const result = await predictMachinePrice(vin.trim(), parseFloat(workingHours));
      setPredictionResult(result);
      
    } catch (err) {
      console.error('가격 예측 실패:', err);
      setError(err.message || '가격 예측에 실패했습니다.');
      setPredictionResult(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 결과 초기화
   */
  const handleReset = () => {
    setPredictionResult(null);
    setError(null);
    setVin('');
    setWorkingHours('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <TrendingUp className="w-12 h-12 text-green-600" strokeWidth={2.5} />
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900">중고시세 보기</h1>
            <p className="text-xl text-gray-600 mt-1">기대번호와 사용시간으로 예상 가격을 확인하세요</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* 입력 폼 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <form onSubmit={handlePredict} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 기대번호 입력 */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-2">
                  기대번호
                </label>
                <input
                  type="text"
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  placeholder="예: DT4351240001"
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={loading}
                />
                <p className="text-sm text-gray-500 mt-1">
                  대동 농기계 기대번호 9자리 이상 입력
                </p>
              </div>

              {/* 사용시간 입력 */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-2">
                  사용시간 (시간)
                </label>
                <input
                  type="number"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  placeholder="예: 500"
                  min="0"
                  step="1"
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={loading}
                />
                <p className="text-sm text-gray-500 mt-1">
                  총 사용 시간을 숫자로 입력
                </p>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            )}

            {/* 버튼 그룹 */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>예측 중...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5" />
                    <span>가격 예측하기</span>
                  </>
                )}
              </button>

              {predictionResult && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 px-6 rounded-xl transition-colors"
                >
                  초기화
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 예측 결과 */}
        {predictionResult && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">예측 결과</h2>
              <div className="w-16 h-1 bg-green-500 mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">기대번호</p>
                <p className="text-lg font-bold text-gray-900">{predictionResult.vin}</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">사용시간</p>
                <p className="text-lg font-bold text-gray-900">{predictionResult.working_hours} 시간</p>
              </div>

              {predictionResult.machine_type && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">기종</p>
                  <p className="text-lg font-bold text-gray-900">{predictionResult.machine_type}</p>
                </div>
              )}

              {predictionResult.confidence && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">예측 신뢰도</p>
                  <p className="text-lg font-bold text-gray-900">{predictionResult.confidence}</p>
                </div>
              )}
            </div>

            {/* 예상 가격 */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 text-center">
              <p className="text-lg text-gray-700 mb-2">예상 중고 시세</p>
              <p className="text-4xl font-bold text-green-600">
                {predictionResult.predicted_price.toLocaleString()} 만원
              </p>
              <p className="text-sm text-gray-600 mt-2">
                * 실제 거래가격과 차이가 있을 수 있습니다
              </p>
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mt-6">
          <div className="flex items-start gap-3">
            <Search className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">이용 안내</h3>
              <ul className="text-blue-800 space-y-1">
                <li>• 대동 농기계의 기대번호를 정확히 입력해주세요.</li>
                <li>• 사용시간은 실제 사용 시간을 숫자로 입력하세요.</li>
                <li>• 예측 결과는 학습 데이터를 기반으로 한 참고용 정보입니다.</li>
                <li>• 실제 시장 가격과 차이가 있을 수 있으니 참고용으로 활용하세요.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
