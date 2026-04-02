// src/components/machine/HistoryList.jsx
export default function HistoryList({ histories = [] }) {
  return (
    <div className="mt-8 bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
      <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <h3 className="font-bold text-xl text-gray-800">🛠️ 정비 및 관리 이력</h3>
        <span className="text-sm font-medium text-green-600 font-mono">Total: {histories.length}건</span>
      </div>
      
      <div className="divide-y divide-gray-100">
        {histories.length > 0 ? (
          histories.map((log, index) => (
            <div key={index} className="p-4 hover:bg-gray-50 transition">
              <div className="flex justify-between mb-1">
                <span className="font-bold text-gray-700">{log.action}</span>
                <span className="text-sm text-gray-400">{log.date}</span>
              </div>
              <p className="text-sm text-gray-500">{log.note}</p>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-gray-400">
            <p>등록된 정비 이력이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}