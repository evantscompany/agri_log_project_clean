// src/components/machine/MachineInfoCard.jsx
export default function MachineInfoCard({ data }) {
  return (
    <div className="space-y-4">
      {/* 상단 헤더 */}
      <div className="bg-white p-6 rounded-t-2xl shadow-sm border-b-4 border-green-600">
        <div className="flex justify-between items-end">
          <div>
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded uppercase">{data.기종}</span>
            <h1 className="text-3xl font-black mt-2 text-gray-900">{data.모델명}</h1>
          </div>
          <p className="text-gray-500 font-mono">{data.기대번호}</p>
        </div>
      </div>

      {/* 정보 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoItem label="제조사" value={data.제조사} />
        <InfoItem label="생산연식" value={data.연식} />
        <InfoItem label="데이터 신뢰도" value="High (Certified)" isHighlight />
      </div>
    </div>
  );
}

function InfoItem({ label, value, isHighlight }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${isHighlight ? 'text-blue-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}