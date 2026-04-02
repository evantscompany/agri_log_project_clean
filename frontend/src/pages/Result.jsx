// src/pages/Result.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMachineInfo } from '../api/machine';
import MachineInfoCard from '../components/machine/MachineInfoCard';
import HistoryList from '../components/machine/HistoryList';

function Result() {
  const { vin } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMachineInfo(vin)
      .then(res => setData(res))
      .catch(err => setError(err.detail || '조회 중 오류 발생'));
  }, [vin]);

  if (error) return <div className="p-20 text-center text-red-500">{error}</div>;
  if (!data) return <div className="p-20 text-center animate-pulse">로딩 중...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* 분리된 디자인 컴포넌트들 호출 */}
      <MachineInfoCard data={data} />
      
      {/* 나중에 histories 데이터를 백엔드에서 받아와서 넘겨주면 끝! */}
      <HistoryList histories={data.histories || []} />

      <button 
        onClick={() => navigate('/')} 
        className="mt-8 w-full py-3 text-gray-400 hover:text-green-600 transition font-medium"
      >
        ← 다른 장비 조회하기
      </button>
    </div>
  );
}

export default Result;