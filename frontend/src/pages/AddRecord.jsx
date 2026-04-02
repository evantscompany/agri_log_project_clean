// frontend/src/pages/AddRecord.jsx
/**
 * 정비 이력 추가 페이지
 * - 수동으로 정비 이력 입력 및 등록
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Calendar, DollarSign, FileText, Wrench } from 'lucide-react';
import { createMaintenanceRecord } from '../services/api';

const recordTypes = ['정비', '유류', '부품교체', '검사'];

export default function AddRecord() {
  const navigate = useNavigate();
  const { id } = useParams(); // URL에서 VIN 추출
  
  // 폼 데이터 상태 관리
  const [formData, setFormData] = useState({
    type: '정비',
    date: new Date().toISOString().split('T')[0],
    description: '',
    cost: '',
    mileage: '',
  });
  
  // 제출 중 상태 관리
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 폼 제출 처리
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 입력값 검증
    if (!formData.description.trim()) {
      alert('작업 내용을 입력해주세요');
      return;
    }
    
    if (!formData.cost || Number(formData.cost) <= 0) {
      alert('비용을 입력해주세요');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // API 요청 데이터 구성
      const recordData = {
        vin: id,
        date: formData.date,
        type: formData.type,
        description: formData.description,
        cost: Number(formData.cost),
      };
      
      // 주행시간이 입력된 경우에만 포함
      if (formData.mileage && Number(formData.mileage) > 0) {
        recordData.mileage = Number(formData.mileage);
      }
      
      // 백엔드 API 호출
      await createMaintenanceRecord(recordData);
      
      alert('이력이 등록되었습니다!');
      navigate(`/machine/${id}`);
    } catch (error) {
      console.error('이력 등록 실패:', error);
      alert(error.message || '이력 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <button
        onClick={() => navigate(`/machine/${id}`)}
        className="flex items-center gap-3 text-gray-700 hover:text-green-600 mb-6 text-xl font-semibold transition-colors"
      >
        <ArrowLeft className="w-8 h-8" strokeWidth={2.5} />
        <span>돌아가기</span>
      </button>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">정비 이력 추가</h1>
        <p className="text-xl text-gray-600 mb-8">정비 내용을 입력해주세요</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-8">
            <label className="block text-xl font-bold text-gray-900 mb-4">
              <Wrench className="w-6 h-6 inline mr-2" strokeWidth={2.5} />
              작업 유형
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recordTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`py-4 px-6 rounded-xl text-xl font-bold transition-all border-2 ${
                    formData.type === type
                      ? 'bg-green-600 text-white border-green-600 shadow-lg'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label htmlFor="date" className="block text-xl font-bold text-gray-900 mb-4">
              <Calendar className="w-6 h-6 inline mr-2" strokeWidth={2.5} />
              날짜
            </label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-6 py-5 text-xl border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
              required
            />
          </div>

          <div className="mb-8">
            <label htmlFor="description" className="block text-xl font-bold text-gray-900 mb-4">
              <FileText className="w-6 h-6 inline mr-2" strokeWidth={2.5} />
              작업 내용
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="예: 엔진 오일 교환, 필터 교체"
              rows={4}
              className="w-full px-6 py-5 text-xl border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none transition-colors resize-none"
              required
            />
            <p className="text-base text-gray-500 mt-2">
              어떤 작업을 했는지 자세히 적어주세요
            </p>
          </div>

          <div className="mb-8">
            <label htmlFor="cost" className="block text-xl font-bold text-gray-900 mb-4">
              <DollarSign className="w-6 h-6 inline mr-2" strokeWidth={2.5} />
              비용 (원)
            </label>
            <input
              id="cost"
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              placeholder="85000"
              className="w-full px-6 py-5 text-xl border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
              required
              min="0"
              step="1000"
            />
            {formData.cost && Number(formData.cost) > 0 && (
              <p className="text-lg text-green-600 mt-2 font-semibold">
                {Number(formData.cost).toLocaleString()}원
              </p>
            )}
          </div>

          <div className="mb-8">
            <label htmlFor="mileage" className="block text-xl font-bold text-gray-900 mb-4">
              주행시간 (시간) <span className="text-base font-normal text-gray-500">(선택사항)</span>
            </label>
            <input
              id="mileage"
              type="number"
              value={formData.mileage}
              onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
              placeholder="1250"
              className="w-full px-6 py-5 text-xl border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
              min="0"
            />
            <p className="text-base text-gray-500 mt-2">
              현재까지의 총 사용 시간을 입력하세요
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(`/machine/${id}`)}
              className="bg-gray-600 hover:bg-gray-700 text-white py-5 rounded-xl text-xl font-bold transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white py-5 rounded-xl text-xl font-bold transition-colors flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Save className="w-6 h-6" strokeWidth={2.5} />
              {isSubmitting ? '등록 중...' : '저장'}
            </button>
          </div>
        </form>

        <div className="mt-8 bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
          <h3 className="text-xl font-bold text-blue-900 mb-3">💡 작성 팁</h3>
          <ul className="space-y-2 text-lg text-blue-800">
            <li>• 작업 내용은 나중에 찾기 쉽게 자세히 적어주세요</li>
            <li>• 부품을 교체한 경우 부품명을 꼭 기록하세요</li>
            <li>• 정기적으로 이력을 업데이트하면 관리가 쉬워집니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
