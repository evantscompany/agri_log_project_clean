// frontend/src/pages/MachineDetail.jsx
/**
 * 농기계 상세 페이지
 * - 농기계 기본 정보 및 통계 표시
 * - 정비 이력 목록 조회 및 관리
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, DollarSign, FileText, Trash2, Brain, Lightbulb, Image, X } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { getMachineDetail, getMaintenanceRecords, deleteMaintenanceRecord, getExpertOpinion } from '../services/api';

export default function MachineDetail() {
  const navigate = useNavigate();
  const { id } = useParams(); // URL에서 VIN 추출
  
  // 상태 관리
  const [machine, setMachine] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expertOpinion, setExpertOpinion] = useState(null);
  const [loadingOpinion, setLoadingOpinion] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadMachineData();
  }, [id]);

  /**
   * 농기계 정보 및 정비 이력 불러오기
   */
  const loadMachineData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 농기계 상세 정보와 정비 이력을 병렬로 조회
      const [machineData, recordsData] = await Promise.all([
        getMachineDetail(id),
        getMaintenanceRecords(id)
      ]);
      
      setMachine(machineData);
      setRecords(recordsData.records || []);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      setError(err.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * AI 전문가 소견 불러오기
   */
  const loadExpertOpinion = async () => {
    try {
      setLoadingOpinion(true);
      const opinionData = await getExpertOpinion(id);
      setExpertOpinion(opinionData.opinion);
    } catch (err) {
      console.error('전문가 소견 로드 실패:', err);
      // 전문가 소견 로드 실패는 에러로 표시하지 않음
    } finally {
      setLoadingOpinion(false);
    }
  };

  /**
   * 정비 이력 삭제 처리
   */
  const handleDeleteRecord = async (recordId) => {
    if (!confirm('이 이력을 삭제하시겠습니까?')) return;
    
    try {
      await deleteMaintenanceRecord(recordId);
      // 삭제 성공 시 목록에서 제거
      setRecords(records.filter((r) => r.id !== recordId));
      // 농기계 정보 다시 로드 (통계 업데이트)
      loadMachineData();
    } catch (err) {
      alert(err.message || '삭제에 실패했습니다.');
    }
  };

  // 로딩 중 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">농기계 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 또는 농기계를 찾을 수 없는 경우
  if (error || !machine) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {error || '농기계를 찾을 수 없습니다'}
          </h1>
          <button
            onClick={() => navigate('/')}
            className="bg-green-600 text-white px-8 py-4 rounded-xl text-xl font-bold hover:bg-green-700 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 총 비용 계산
  const totalCost = machine.totalCost || records.reduce((sum, record) => sum + (record.cost || 0), 0);

  const getTypeColor = (type) => {
    switch (type) {
      case '정비':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case '유류':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case '부품교체':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case '검사':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-4 md:p-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-gray-700 hover:text-green-600 mb-6 text-lg font-semibold transition-colors"
      >
        <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
        <span>돌아가기</span>
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="relative h-48 md:h-64">
          <ImageWithFallback
            src={machine.image}
            alt={machine.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 text-white">
            <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">{machine.기종 || machine.name}</h1>
            <p className="text-lg md:text-2xl">{machine.모델명 || machine.model} · {machine.연식 || machine.year}</p>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 md:p-6">
              <div className="text-sm md:text-lg text-gray-600 mb-1">총 이력</div>
              <div className="text-xl md:text-3xl font-bold text-blue-600">{machine.totalRecords || records.length}건</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 md:p-6">
              <div className="text-sm md:text-lg text-gray-600 mb-1">총 비용</div>
              <div className="text-xl md:text-3xl font-bold text-orange-600 break-words">
                {totalCost.toLocaleString()}원
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => navigate('/scan')}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-3 md:gap-4"
        >
          <FileText className="w-8 h-8 md:w-10 md:h-10" strokeWidth={2.5} />
          <div className="text-left">
            <div className="text-lg md:text-xl font-bold">영수증 스캔</div>
            <div className="text-sm md:text-base opacity-90">OCR로 빠르게 등록</div>
          </div>
        </button>

        <button
          onClick={() => navigate(`/machine/${id}/add-record`)}
          className="bg-green-600 hover:bg-green-700 text-white rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-3 md:gap-4"
        >
          <Plus className="w-8 h-8 md:w-10 md:h-10" strokeWidth={2.5} />
          <div className="text-left">
            <div className="text-lg md:text-xl font-bold">직접 입력</div>
            <div className="text-sm md:text-base opacity-90">수동으로 이력 추가</div>
          </div>
        </button>
      </div>

      {/* AI 전문가 소견 */}
      {records.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-purple-200 overflow-hidden mb-6">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">AI 전문가 소견</h3>
                  <p className="text-purple-100 text-sm">30년 경력 농기계 베테랑의 종합 분석</p>
                </div>
              </div>
              
              {!expertOpinion && !loadingOpinion && (
                <button
                  onClick={loadExpertOpinion}
                  className="px-6 py-3 bg-white text-purple-600 rounded-xl hover:bg-purple-50 transition-all font-semibold flex items-center gap-2 shadow-lg"
                >
                  <Brain className="w-5 h-5" />
                  분석 시작
                </button>
              )}
            </div>
          </div>
          
          {/* 내용 */}
          <div className="p-6">
            {loadingOpinion ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
                <p className="text-purple-600 font-semibold text-lg">AI가 정비 이력을 분석하고 있습니다...</p>
                <p className="text-gray-500 text-sm">잠시만 기다려주세요</p>
              </div>
            ) : expertOpinion ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border-l-4 border-purple-600">
                  <div className="flex items-start gap-4">
                    <Lightbulb className="w-6 h-6 text-purple-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-gray-800 text-base leading-relaxed whitespace-pre-line">{expertOpinion}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setExpertOpinion(null)}
                    className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <Brain className="w-4 h-4" />
                    다시 분석하기
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-10 h-10 text-purple-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">AI 전문가 분석을 시작하세요</h4>
                <p className="text-gray-600 mb-6">정비 이력을 바탕으로 농기계 상태를 종합 분석해드립니다</p>
                <button
                  onClick={loadExpertOpinion}
                  className="px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold inline-flex items-center gap-2 shadow-lg"
                >
                  <Brain className="w-5 h-5" />
                  AI 분석 받기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">정비 이력</h2>

        {records.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 text-center">
            <FileText className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-4" strokeWidth={2} />
            <p className="text-lg md:text-2xl text-gray-600">아직 등록된 이력이 없습니다</p>
            <p className="text-base md:text-xl text-gray-500 mt-2">첫 정비 이력을 추가해보세요</p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <div
                key={record.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-md transition-shadow relative"
              >
                {/* 삭제 버튼 - 우측 상단 */}
                <button
                  onClick={() => handleDeleteRecord(record.id)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" strokeWidth={2.5} />
                </button>

                {/* 정비 정보 */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 mb-4 pr-12">
                  <div className={`px-3 py-2 md:px-4 md:py-2 rounded-lg border-2 text-base md:text-lg font-bold ${getTypeColor(record.type)}`}>
                    {record.type}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-gray-600 text-base md:text-lg mb-1">
                      <Calendar className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                      <span>{record.date || record.service_date}</span>
                    </div>
                    {(record.service_company || record.mileage || record.total_hours || record.working_hours) && (
                      <div className="text-gray-500 text-sm md:text-base space-y-1">
                        {record.service_company && (
                          <div>정비업체: {record.service_company}</div>
                        )}
                        {(record.mileage || record.total_hours || record.working_hours) && (
                          <div>가동시간: {record.mileage || record.total_hours || record.working_hours}시간</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 정비 내용 */}
                <p className="text-base md:text-xl text-gray-800 mb-4 leading-relaxed break-words whitespace-pre-wrap">
                  {record.description || record.ai_summary || '정비 내용 없음'}
                </p>

                {/* 하단 정보 - 비용 및 명세서 보기 */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <DollarSign className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                    <span className="text-lg md:text-2xl font-bold break-words">{(record.cost || record.total_cost || 0).toLocaleString()}원</span>
                  </div>
                  
                  {/* 정비명세서 보기 버튼 - 항상 표시 */}
                  <button
                    onClick={() => {
                      if (record.attachment_url) {
                        setSelectedImage(record.attachment_url);
                      } else {
                        alert('첨부된 명세서가 없습니다.');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm md:text-base"
                  >
                    <Image className="w-4 h-4 md:w-5 md:h-5" />
                    <span>명세서 보기</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 정비명세서 이미지 모달 */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="bg-white rounded-lg p-2">
              <img
                src={selectedImage}
                alt="정비명세서"
                className="w-full h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  console.error('이미지 로드 실패:', selectedImage);
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><text x="50%" y="50%" text-anchor="middle" fill="red">이미지를 불러올 수 없습니다</text></svg>';
                }}
                onLoad={() => console.log('이미지 로드 성공:', selectedImage)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
