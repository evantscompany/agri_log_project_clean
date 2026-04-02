// frontend/src/pages/MachinePricePrediction.jsx
/**
 * 농기계 가격 예측 페이지
 * - 보유한 모든 농기계의 VIN으로 ML 기반 가격 예측
 * - 예측 결과 시각화 및 상세 정보 제공
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Info,
  ArrowLeft,
  Zap,
  Calendar,
  Wrench,
  Activity,
  Tractor,
  AlertTriangle,
  Loader2,
  Calculator
} from 'lucide-react';
import { getMachinesList, predictMachinePrice } from '../services/api';

export default function MachinePricePrediction() {
  const navigate = useNavigate();
  
  // 상태 관리
  const [machines, setMachines] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadMachines();
    const timer = setTimeout(() => setFadeIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  /**
   * 농기계 목록 로드 (대시보드에 표시되는 농기계만)
   */
  const loadMachines = async () => {
    try {
      const data = await getMachinesList();
      setMachines(data.machines || []);
    } catch (err) {
      console.error('농기계 목록 로드 실패:', err);
      setError('농기계 목록을 불러오는데 실패했습니다.');
    }
  };

  /**
   * 모든 농기계 가격 예측
   */
  const handlePredictAllPrices = async () => {
    if (machines.length === 0) {
      alert('예측할 농기계가 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);
    setPredictions([]);

    try {
      // 각 농기계별로 개별 예측 API 호출
      const predictionPromises = machines.map(async (machine) => {
        try {
          // 농기계의 사용시간 정보 가져오기 (totalHours 또는 workingHours)
          const workingHours = machine.totalHours || machine.workingHours || machine.total_working_hours || 0;
          
          console.log(`예측 시도 - VIN: ${machine.vin}, 사용시간: ${workingHours}`);
          
          const result = await predictMachinePrice(machine.vin, workingHours);
          
          // API 응답 데이터 검증
          if (!result || typeof result !== 'object') {
            throw new Error('잘못된 API 응답 형식');
          }

          // 예측 가격 데이터 유효성 검증
          const predictedPrice = result.predicted_price;
          const confidence = result.confidence;
          
          console.log(`예측 결과 - VIN: ${machine.vin}, 결과:`, result);
          
          if (predictedPrice === null || predictedPrice === undefined || isNaN(predictedPrice) || !isFinite(predictedPrice)) {
            console.warn(`농기계 ${machine.vin} 예측 가격 데이터 오류:`, predictedPrice);
            return {
              vin: machine.vin,
              predicted_price: null,
              confidence: null,
              success: false,
              error: '예측 가격 데이터 오류',
              workingHours: workingHours
            };
          }

          // 신뢰도 데이터 처리 (문자열을 숫자로 변환)
          let confidenceValue = null;
          if (confidence) {
            if (typeof confidence === 'string') {
              if (confidence === '보통') confidenceValue = 0.6;
              else if (confidence === '낮음') confidenceValue = 0.4;
              else if (confidence === '높음') confidenceValue = 0.8;
              else if (confidence === '매우 높음') confidenceValue = 0.9;
              else confidenceValue = 0.5; // 기본값
            } else if (typeof confidence === 'number') {
              confidenceValue = confidence;
            }
          }

          if (confidence !== null && confidence !== undefined && typeof confidence !== 'string' && (isNaN(confidence) || !isFinite(confidence))) {
            console.warn(`농기계 ${machine.vin} 신뢰도 데이터 오류:`, confidence);
          }

          return {
            vin: machine.vin,
            predicted_price: Number(predictedPrice),
            confidence: confidenceValue, // 변환된 숫자 값 사용
            success: true,
            workingHours: workingHours,
            machineInfo: {
              model: machine.model,
              year: machine.year,
              manufacturer: machine.manufacturer,
              horsepower: result.horsepower || null,
              machineType: result.machine_type || null
            },
            rawData: result // 디버깅용 원본 데이터 보존
          };
        } catch (error) {
          console.error(`농기계 ${machine.vin} 예측 실패:`, error);
          return {
            vin: machine.vin,
            predicted_price: null,
            confidence: null,
            success: false,
            error: error.message || '예측 실패',
            workingHours: machine.totalHours || machine.workingHours || 0
          };
        }
      });

      const results = await Promise.all(predictionPromises);
      setPredictions(results);
    } catch (err) {
      console.error('가격 예측 실패:', err);
      setError(err.message || '가격 예측에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 포맷된 가격 표시 (만원 단위)
   */
  const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(price) || price === 0) {
      return '예측 불가';
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || !isFinite(numPrice)) {
      return '예측 불가';
    }
    // API는 이미 만원 단위로 반환하므로 그대로 사용
    return `${numPrice.toLocaleString()}만원`;
  };

  /**
   * 신뢰도 색상
   */
  const getConfidenceColor = (confidence) => {
    if (confidence === null || confidence === undefined || isNaN(confidence)) return 'text-gray-500';
    const conf = Number(confidence);
    if (conf >= 0.8) return 'text-green-600';
    if (conf >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * 신뢰도 텍스트
   */
  const getConfidenceText = (confidence) => {
    if (confidence === null || confidence === undefined || isNaN(confidence)) return '신뢰도 정보 없음';
    const conf = Number(confidence);
    if (conf >= 0.8) return '신뢰도 매우 높음';
    if (conf >= 0.6) return '신뢰도 높음';
    return '신뢰도 낮음';
  };

  /**
   * 유효한 예측 결과인지 확인
   */
  const isValidPrediction = (prediction) => {
    return prediction && 
           prediction.success && 
           prediction.predicted_price !== null && 
           prediction.predicted_price !== undefined &&
           !isNaN(prediction.predicted_price) &&
           isFinite(prediction.predicted_price) &&
           prediction.predicted_price > 0;
  };

  // 총 예상 가격 계산 (유효한 예측만 포함)
  const totalPredictedPrice = predictions.reduce((sum, pred) => {
    if (isValidPrediction(pred)) {
      return sum + Number(pred.predicted_price);
    }
    return sum;
  }, 0);

  // 총 예상 가격 (API는 이미 만원 단위로 반환하므로 그대로 사용)
  const totalPredictedPriceManWon = totalPredictedPrice;

  // 성공한 예측 수 계산
  const successfulPredictions = predictions.filter(pred => isValidPrediction(pred)).length;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-4 md:p-6 transition-opacity duration-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      {/* 헤더 */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-700 hover:text-purple-600 text-lg font-semibold transition-colors"
        >
          <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
          <span>돌아가기</span>
        </button>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* 페이지 제목 */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Calculator className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">내 농기계 예상 가격</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            AI 기반 머신러닝 모델로 보유한 {machines.length}대 농기계의 현재 중고 시세를 예측합니다
          </p>
        </div>

        {/* 예측 버튼 */}
        <div className="text-center mb-8">
          <button
            onClick={handlePredictAllPrices}
            disabled={loading || machines.length === 0}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>AI 예측 중...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-6 h-6" />
                <span>전체 가격 예측하기</span>
              </>
            )}
          </button>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">예측 오류</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 총 예상 가격 요약 */}
        {predictions.length > 0 && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 mb-8 shadow-lg text-white">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">총 예상 가격</h3>
              <div className="text-4xl font-bold mb-2">
                {totalPredictedPriceManWon > 0 ? `${totalPredictedPriceManWon.toLocaleString()}만원` : '예측 불가'}
              </div>
              <p className="text-purple-100">
                {successfulPredictions}대 예측 성공 / {predictions.length}대 농기계
              </p>
              {successfulPredictions < predictions.length && (
                <p className="text-xs text-purple-200 mt-2">
                  일부 농기계는 예측이 불가능합니다
                </p>
              )}
            </div>
          </div>
        )}

        {/* 예측 결과 */}
        {predictions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {predictions.map((prediction, index) => {
              const machine = machines.find(m => m.vin === prediction.vin);
              return (
                <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  {/* 농기계 정보 */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      prediction.success ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      <Tractor className={`w-6 h-6 ${prediction.success ? 'text-purple-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">
                        {machine?.model || '알 수 없음'}
                      </h4>
                      <p className="text-sm text-gray-500">{prediction.vin}</p>
                      {!prediction.success && (
                        <p className="text-xs text-red-600 mt-1">예측 실패</p>
                      )}
                    </div>
                  </div>

                  {/* 예측 상태 표시 */}
                  <div className={`${prediction.success && isValidPrediction(prediction) ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} rounded-xl p-3 mb-4 border`}>
                    <div className="flex items-center gap-2">
                      {prediction.success && isValidPrediction(prediction) ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        prediction.success && isValidPrediction(prediction) ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {prediction.success && isValidPrediction(prediction) ? '예측 성공' : '예측 실패'}
                      </span>
                    </div>
                    {!prediction.success && prediction.error && (
                      <p className="text-xs text-red-600 mt-1">{prediction.error}</p>
                    )}
                    {prediction.success && !isValidPrediction(prediction) && (
                      <p className="text-xs text-orange-600 mt-1">데이터 오류로 예측 불가</p>
                    )}
                  </div>

                  {/* 예측 가격 */}
                  <div className={`${prediction.success && isValidPrediction(prediction) ? 'bg-purple-50' : 'bg-gray-100'} rounded-xl p-4 mb-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">
                        {prediction.success && isValidPrediction(prediction) ? '예상 가격' : '예측 불가'}
                      </span>
                      <DollarSign className={`w-4 h-4 ${prediction.success && isValidPrediction(prediction) ? 'text-purple-600' : 'text-gray-400'}`} />
                    </div>
                    <div className={`text-2xl font-bold ${prediction.success && isValidPrediction(prediction) ? 'text-purple-600' : 'text-gray-400'}`}>
                      {prediction.success && isValidPrediction(prediction) ? formatPrice(prediction.predicted_price) : '예측 불가'}
                    </div>
                  </div>

                  {/* 신뢰도 (성공하고 유효한 데이터일 때만) */}
                  {prediction.success && isValidPrediction(prediction) && prediction.confidence !== null && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">예측 신뢰도</span>
                        <span className={`text-sm font-medium ${getConfidenceColor(prediction.confidence)}`}>
                          {prediction.confidence ? `${Math.round(prediction.confidence * 100)}%` : 'N/A'}
                        </span>
                      </div>
                      <div className={`text-xs ${getConfidenceColor(prediction.confidence)}`}>
                        {getConfidenceText(prediction.confidence)}
                      </div>
                    </div>
                  )}

                  {/* 추가 정보 */}
                  {machine && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">연식:</span>
                          <span className="ml-1 font-medium">{machine.year || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">이력:</span>
                          <span className="ml-1 font-medium">{machine.totalRecords || 0}건</span>
                        </div>
                        <div>
                          <span className="text-gray-500">사용시간:</span>
                          <span className="ml-1 font-medium">{prediction.workingHours || 0}시간</span>
                        </div>
                        <div>
                          <span className="text-gray-500">제조사:</span>
                          <span className="ml-1 font-medium">{machine.manufacturer || '-'}</span>
                        </div>
                        {prediction.machineInfo?.horsepower && (
                          <div>
                            <span className="text-gray-500">마력:</span>
                            <span className="ml-1 font-medium">{prediction.machineInfo.horsepower}HP</span>
                          </div>
                        )}
                        {prediction.machineInfo?.machineType && (
                          <div>
                            <span className="text-gray-500">기종:</span>
                            <span className="ml-1 font-medium">{prediction.machineInfo.machineType}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 디버깅 정보 (개발 환경에서만 표시) */}
                  {process.env.NODE_ENV === 'development' && prediction.rawData && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <details className="text-xs text-gray-500">
                        <summary className="cursor-pointer">디버깅 정보</summary>
                        <pre className="mt-2 bg-gray-50 p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(prediction.rawData, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          !loading && machines.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">가격 예측 준비 완료</h3>
              <p className="text-gray-600 mb-6">
                {machines.length}대의 농기계가 예측을 기다리고 있습니다
              </p>
              <p className="text-sm text-gray-500">
                위의 '전체 가격 예측하기' 버튼을 클릭하여 AI 예측을 시작하세요
              </p>
            </div>
          )
        )}

        {/* 농기계가 없는 경우 */}
        {!loading && machines.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <Tractor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">예측할 농기계가 없습니다</h3>
            <p className="text-gray-600 mb-6">
              먼저 농기계를 등록해주세요
            </p>
            <button
              onClick={() => navigate('/add-machine')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
            >
              농기계 추가하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
