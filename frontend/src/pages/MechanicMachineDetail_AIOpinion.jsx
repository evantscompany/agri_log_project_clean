// AI 정비 소견 생성 함수 - 전체 수리 히스토리 기반 분석
export const generateAIOpinion = (records, machine) => {
  if (!records || records.length === 0) {
    return '수리 히스토리가 없어 정비 소견을 생성할 수 없습니다.\n\n정비명세서를 스캔하여 수리 기록을 추가해주세요.';
  }

  // 전체 수리 히스토리에서 사용된 부품 수집
  const allParts = [];
  records.forEach(record => {
    if (record.parts && record.parts.length > 0) {
      record.parts.forEach(part => {
        allParts.push({
          ...part,
          service_date: record.service_date,
          service_company: record.service_company
        });
      });
    }
  });

  if (allParts.length === 0) {
    return '사용된 부품 정보가 없어 정비 소견을 생성할 수 없습니다.';
  }

  // system_group별 고장 빈도 분석
  const systemGroupCount = {};
  const systemGroupParts = {};
  
  allParts.forEach(part => {
    const group = part.system_group || '기타';
    systemGroupCount[group] = (systemGroupCount[group] || 0) + 1;
    if (!systemGroupParts[group]) {
      systemGroupParts[group] = [];
    }
    systemGroupParts[group].push(part.part_name);
  });

  // 가장 많이 고장난 시스템 찾기
  const sortedSystems = Object.entries(systemGroupCount)
    .sort((a, b) => b[1] - a[1]);

  // 정비 소견 생성
  let opinion = '';

  // 1. 전체 개요
  opinion += `📊 전체 정비 이력 분석\n`;
  opinion += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  opinion += `총 정비 횟수: ${records.length}회\n`;
  opinion += `총 교체 부품 수: ${allParts.length}개\n`;
  opinion += `분석 기간: ${records[records.length - 1]?.service_date || 'N/A'} ~ ${records[0]?.service_date || 'N/A'}\n\n`;

  // 2. 고장 패턴 분석
  opinion += `🔍 고장 패턴 분석\n`;
  opinion += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (sortedSystems.length > 0) {
    opinion += `이 기계는 지금까지 다음과 같은 고장 패턴을 보였습니다:\n\n`;
    
    sortedSystems.forEach(([system, count], index) => {
      const percentage = ((count / allParts.length) * 100).toFixed(1);
      opinion += `${index + 1}. ${system} (${count}회, ${percentage}%)\n`;
      
      // 해당 시스템의 주요 부품 나열
      const uniqueParts = [...new Set(systemGroupParts[system])];
      opinion += `   주요 교체 부품: ${uniqueParts.slice(0, 3).join(', ')}`;
      if (uniqueParts.length > 3) {
        opinion += ` 외 ${uniqueParts.length - 3}개`;
      }
      opinion += `\n\n`;
    });
  }

  // 3. 시스템별 상태 진단
  opinion += `⚠️ 시스템별 상태 진단\n`;
  opinion += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  sortedSystems.forEach(([system, count]) => {
    if (system === '동력계통') {
      if (count >= 3) {
        opinion += `🔴 동력계통: 반복적인 고장이 발생하고 있습니다. 동력 전달 장치의 전반적인 점검이 필요합니다.\n`;
        opinion += `   → 권장: 동력 전달 벨트, 클러치 상태 정밀 점검\n\n`;
      } else {
        opinion += `🟡 동력계통: 일부 부품 교체가 있었으나 정상 범위입니다.\n`;
        opinion += `   → 권장: 정기적인 윤활유 교환 및 점검\n\n`;
      }
    } else if (system === '유압계통') {
      if (count >= 3) {
        opinion += `🔴 유압계통: 유압 관련 부품 교체가 잦습니다. 유압 펌프 및 실린더 점검이 필요합니다.\n`;
        opinion += `   → 권장: 유압유 교환 및 유압 라인 누유 점검\n\n`;
      } else {
        opinion += `🟡 유압계통: 일부 유압 부품 교체가 있었습니다.\n`;
        opinion += `   → 권장: 유압유 레벨 및 오염도 정기 점검\n\n`;
      }
    } else if (system === '엔진계통') {
      if (count >= 2) {
        opinion += `🔴 엔진계통: 엔진 관련 부품 교체가 있었습니다. 엔진 성능 저하 가능성이 있습니다.\n`;
        opinion += `   → 권장: 엔진 압축 테스트 및 연료 시스템 점검\n\n`;
      } else {
        opinion += `🟢 엔진계통: 양호한 상태입니다.\n`;
        opinion += `   → 권장: 정기적인 엔진오일 교환 및 필터 교체\n\n`;
      }
    } else if (system === '전기계통') {
      if (count >= 2) {
        opinion += `🟡 전기계통: 전기 부품 교체가 있었습니다. 배터리 및 발전기 상태 확인이 필요합니다.\n`;
        opinion += `   → 권장: 배터리 전압 측정 및 배선 상태 점검\n\n`;
      }
    }
  });

  // 4. 종합 소견 및 권장사항
  opinion += `💡 종합 소견 및 권장사항\n`;
  opinion += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (sortedSystems.length > 0 && sortedSystems[0][1] >= 3) {
    const mainProblem = sortedSystems[0][0];
    opinion += `⚠️ 주의: ${mainProblem}에서 반복적인 고장이 발생하고 있습니다.\n`;
    opinion += `이는 해당 시스템의 근본적인 문제를 나타낼 수 있으므로, 부품 교체뿐만 아니라 시스템 전체의 정밀 점검을 권장합니다.\n\n`;
  }

  opinion += `📌 정비 권장사항:\n`;
  opinion += `1. 정기 점검 주기 준수 (50~100 가동시간마다)\n`;
  opinion += `2. 작업 전후 일상 점검 실시\n`;
  opinion += `3. 이상 징후 발견 시 즉시 전문가 상담\n`;
  opinion += `4. 순정 부품 사용 권장\n`;
  opinion += `5. 작업 환경에 맞는 적절한 사용 및 관리\n\n`;

  const totalCost = records.reduce((sum, record) => sum + (record.total_cost || 0), 0);
  opinion += `📊 누적 정비 비용: ${totalCost.toLocaleString()}원\n`;
  opinion += `📅 마지막 정비일: ${records[0]?.service_date || 'N/A'}\n`;

  return opinion;
};
