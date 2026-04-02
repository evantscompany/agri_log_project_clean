// frontend/src/pages/Home.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [vin, setVin] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    // 1. 폼 제출 시 페이지 새로고침 방지
    e.preventDefault();

    if (vin.trim()) {
      // 2. 자바스크립트 문법에 맞게 toUpperCase() 사용 (매우 중요!)
      const upperVin = vin.trim().toUpperCase();
      
      // 3. 디버깅용 로그 (브라우저 F12 콘솔에서 확인 가능)
      console.log("이동할 경로:", `/result/${upperVin}`);
      
      // 4. 페이지 이동
      navigate(`/result/${upperVin}`);
    } else {
      alert("기대번호를 입력해주세요.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <h1 className="text-4xl font-bold mb-8">🚜 Agri-Log</h1>
      <p className="mb-6 text-gray-600">기대번호 12자리를 입력하여 이력을 조회하세요.</p>
      
      <form onSubmit={handleSearch} className="w-full max-w-md">
        <input 
          type="text"
          className="w-full p-4 border-2 border-green-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 text-black"
          placeholder="예: DT0300240002"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
        />
        <button 
          type="submit" 
          className="w-full mt-4 bg-green-600 text-white p-4 rounded-lg font-bold hover:bg-green-700 transition shadow-lg active:scale-95"
        >
          데이터 조회하기
        </button>
      </form>
    </div>
  );
}

export default Home;