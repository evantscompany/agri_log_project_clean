# backend/app/services/mechanic_ai_advisor.py
"""
정비사 전용 AI 소견 시스템
- 600자 이상 기술 분석
- 과거 데이터 기반 예측
- 정비사 관점 전문 소견
"""

import openai
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from app.database import get_db_connection
from dotenv import load_dotenv

# .env 파일 자동 로드
load_dotenv()

class MechanicAIAdvisor:
    """정비사 전용 AI 어드바이저"""
    
    def __init__(self):
        # OpenAI API 설정
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            print("경고: OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")
            self.openai_client = None
            self.is_available = False
        else:
            try:
                self.openai_client = openai.OpenAI(api_key=api_key)
                self.is_available = True
                print("정비사 AI 어드바이저 초기화 성공")
            except Exception as e:
                print(f"정비사 AI 어드바이저 초기화 실패: {e}")
                self.openai_client = None
                self.is_available = False
        
        # 정비사 전용 시스템 프롬프트
        self.system_prompt = """당신은 20년 경력의 농기계 정비 전문가입니다. 정비사의 관점에서 기술적이고 실용적인 소견을 제공해주세요.

다음 지침을 반드시 따르세요:
1. 항상 정비사의 기술적 관점에서 분석합니다.
2. 구체적인 수치와 기술 용어를 사용합니다.
3. 부품 교체 주기와 정비 시점을 기술적으로 예측합니다.
4. 실용적인 정비 조언과 주의사항을 제공합니다.
5. 최대 600자 이내로 상세하고 전문적으로 응답합니다.
6. 문장이 중간에 끊기지 않고 자연스럽게 마무리됩니다.
7. 번호를 사용하여 명확하게 구분합니다.
8. 각 항목은 완전한 문장으로 작성합니다.
9. 농기계 기술적 특성을 고려한 분석을 제공합니다.
10. 정비사가 실제 현장에서 사용할 수 있는 조언을 포함합니다."""

    def get_maintenance_history(self, vin: str) -> List[Dict]:
        """정비 이력 조회"""
        conn = get_db_connection()
        if not conn:
            return []
        
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        ml.log_id,
                        ml.service_date,
                        ml.total_hours,
                        ml.total_cost,
                        ml.service_company,
                        ml.ai_summary,
                        md.part_name,
                        md.quantity,
                        md.unit_cost
                    FROM maintenance_log ml
                    LEFT JOIN maintenance_detail md ON ml.log_id = md.log_id
                    WHERE ml.vin = %s
                    ORDER BY ml.service_date DESC
                    LIMIT 10
                """, (vin,))
                
                results = cursor.fetchall()
                
                # 데이터 그룹화
                history = {}
                for row in results:
                    log_id = row['log_id']
                    if log_id not in history:
                        history[log_id] = {
                            'service_date': row['service_date'],
                            'total_hours': row['total_hours'],
                            'total_cost': row['total_cost'],
                            'service_company': row['service_company'],
                            'ai_summary': row['ai_summary'],
                            'parts': []
                        }
                    
                    if row['part_name']:
                        history[log_id]['parts'].append({
                            'part_name': row['part_name'],
                            'quantity': row['quantity'],
                            'unit_cost': row['unit_cost']
                        })
                
                return list(history.values())
                
        except Exception as e:
            print(f"정비 이력 조회 오류: {e}")
            return []
        finally:
            conn.close()

    def analyze_parts_usage_pattern(self, history: List[Dict]) -> Dict[str, Any]:
        """부품 사용 패턴 분석"""
        parts_analysis = {
            'frequent_parts': {},
            'costly_parts': {},
            'recent_parts': [],
            'replacement_intervals': {}
        }
        
        # 부품 빈도 분석
        part_frequency = {}
        part_cost = {}
        
        for record in history:
            service_date = record['service_date']
            for part in record['parts']:
                part_name = part['part_name']
                total_cost = part['quantity'] * part['unit_cost']
                
                # 빈도 계산
                if part_name not in part_frequency:
                    part_frequency[part_name] = 0
                    part_cost[part_name] = 0
                
                part_frequency[part_name] += 1
                part_cost[part_name] += total_cost
                
                # 최근 부품 목록
                parts_analysis['recent_parts'].append({
                    'part_name': part_name,
                    'service_date': service_date,
                    'cost': total_cost
                })
        
        # 빈도 높은 부품
        parts_analysis['frequent_parts'] = dict(
            sorted(part_frequency.items(), key=lambda x: x[1], reverse=True)[:5]
        )
        
        # 비용 높은 부품
        parts_analysis['costly_parts'] = dict(
            sorted(part_cost.items(), key=lambda x: x[1], reverse=True)[:5]
        )
        
        return parts_analysis

    def predict_next_maintenance(self, history: List[Dict], current_hours: int) -> Dict[str, Any]:
        """다음 정비 시점 예측"""
        if not history:
            return {}
        
        # 최근 정비 시점
        last_maintenance = history[0]
        last_hours = last_maintenance['total_hours']
        hours_since_last = current_hours - last_hours
        
        # 평균 정비 간격
        intervals = []
        for i in range(len(history) - 1):
            current_record = history[i]
            prev_record = history[i + 1]
            interval = current_record['total_hours'] - prev_record['total_hours']
            intervals.append(interval)
        
        avg_interval = sum(intervals) / len(intervals) if intervals else 0
        
        predictions = {
            'next_maintenance_hours': current_hours + avg_interval,
            'hours_since_last': hours_since_last,
            'avg_interval': avg_interval,
            'urgency_level': self._calculate_urgency(hours_since_last, avg_interval),
            'recommended_parts': self._recommend_parts(history)
        }
        
        return predictions

    def _calculate_urgency(self, hours_since_last: int, avg_interval: int) -> str:
        """긴급도 계산"""
        if avg_interval == 0:
            return 'low'
        
        ratio = hours_since_last / avg_interval
        
        if ratio >= 0.9:
            return 'high'
        elif ratio >= 0.7:
            return 'medium'
        else:
            return 'low'

    def _recommend_parts(self, history: List[Dict]) -> List[str]:
        """교체 추천 부품"""
        part_frequency = {}
        
        for record in history:
            for part in record['parts']:
                part_name = part['part_name']
                if part_name not in part_frequency:
                    part_frequency[part_name] = 0
                part_frequency[part_name] += 1
        
        # 빈도 높은 부품 추천
        frequent_parts = sorted(part_frequency.items(), key=lambda x: x[1], reverse=True)
        return [part[0] for part in frequent_parts[:3]]

    def generate_mechanic_advice(self, vin: str, current_hours: int) -> str:
        """정비사 전용 AI 소견 생성"""
        
        # 서비스 가용성 확인
        if not self.is_available or not self.openai_client:
            return "정비사 AI 어드바이저를 사용할 수 없습니다. OpenAI API 키를 설정해주세요."
        
        # 데이터 수집
        history = self.get_maintenance_history(vin)
        parts_analysis = self.analyze_parts_usage_pattern(history)
        predictions = self.predict_next_maintenance(history, current_hours)
        
        # 기본 정보 구성
        basic_info = f"""
기기 정보:
- 현재 가동시간: {current_hours}시간
- 총 정비 횟수: {len(history)}회
- 마지막 정비: {history[0]['service_date'] if history else '없음'}
"""
        
        # 정비 이력 요약
        history_summary = ""
        if history:
            history_summary = "최근 정비 이력 (최근 3회):\n"
            for i, record in enumerate(history[:3]):
                parts_info = ", ".join([f"{part['part_name']}({part['quantity']}개)" for part in record['parts']])
                history_summary += f"{i+1}. {record['service_date']}: {parts_info} ({record['total_cost']:,}원)\n"
        
        # 부품 분석
        parts_summary = ""
        if parts_analysis['frequent_parts']:
            parts_summary = f"\n주요 사용 부품: {', '.join(list(parts_analysis['frequent_parts'].keys())[:3])}"
        
        # 예측 정보
        prediction_summary = ""
        if predictions:
            prediction_summary = f"""
정비 예측:
- 다음 정비 예상 시점: {predictions['next_maintenance_hours']}시간
- 긴급도: {predictions['urgency_level']}
- 추천 교체 부품: {', '.join(predictions['recommended_parts']) if predictions['recommended_parts'] else '없음'}
"""
        
        # 사용자 프롬프트
        user_prompt = f"""다음 농기계의 정비 이력과 현재 상태를 분석하여 정비사 전문가 소견을 제공해주세요.

{basic_info}

{history_summary}

{parts_summary}

{prediction_summary}

위 정보를 바탕으로 다음 사항에 대한 정비사 전문가 소견을 제공해주세요:
1. 현재 기계 상태의 기술적 평가 (가동시간, 부품 마모도, 성능 등)
2. 주요 부품의 교체 시점과 주기 예측
3. 다음 정비 시점과 긴급도에 따른 조치 사항
4. 정비 시 특히 주의해야 할 기술적 사항
5. 예방 정비를 위한 실용적인 조언

최대 600자 이내로 기술적이고 실용적인 분석을 제공해주세요."""
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=600,
                temperature=0.7
            )
            
            advice = response.choices[0].message.content.strip()
            
            # 600자 제한
            if len(advice) > 600:
                advice = advice[:597] + "..."
            
            return advice
            
        except Exception as e:
            print(f"AI 소견 생성 오류: {e}")
            return "현재 AI 소견 서비스를 이용할 수 없습니다. 나중에 다시 시도해주세요."

    def generate_customer_consultation_advice(self, vin: str, current_hours: int) -> str:
        """대고객 상담용 조언 생성"""
        
        # 서비스 가용성 확인
        if not self.is_available or not self.openai_client:
            return "현재 AI 상담 조언 서비스를 이용할 수 없습니다. OpenAI API 키를 설정해주세요."
        
        # 데이터 수집
        history = self.get_maintenance_history(vin)
        predictions = self.predict_next_maintenance(history, current_hours)
        
        if not history:
            return "아직 정비 이력이 없어 상담 조언을 제공하기 어렵습니다."
        
        # 총 비용 계산
        total_cost = sum(record['total_cost'] for record in history)
        avg_cost = total_cost / len(history)
        
        consultation_prompt = f"""다음 정보를 바탕으로 고객 상담 시 전달할 조언을 제공해주세요:

농기계 정보:
- 현재 가동시간: {current_hours}시간
- 총 정비 횟수: {len(history)}회
- 평균 정비 비용: {avg_cost:,.0f}원
- 다음 정비 예상: {predictions.get('next_maintenance_hours', 'N/A')}시간

고객에게 다음 내용을 상담 시 전달할 조언을 3가지만 제공해주세요:
1. 현재 기계 상태 설명
2. 다음 정비 시점과 준비 사항
3. 비용 예상과 절감 방안

각 조언은 고객이 이해하기 쉽게 50자 이내로 작성해주세요."""
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "당신은 농기계 정비 전문가로서 고객에게 친절하고 이해하기 쉽게 설명합니다."},
                    {"role": "user", "content": consultation_prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )
            
            advice = response.choices[0].message.content.strip()
            return advice
            
        except Exception as e:
            print(f"상담 조언 생성 오류: {e}")
            return "현재 상담 조언 서비스를 이용할 수 없습니다."
