# backend/app/services/ai_expert.py
"""
AI 농기계 전문가 소견 서비스
- OpenAI API를 사용하여 정비 이력 분석
- 농기계 베테랑 전문가 관점에서 소견 제공
"""

import os
import openai
import time
import hashlib
from typing import Optional, List, Dict
from app.database import get_db_connection
from dotenv import load_dotenv

# .env 파일 자동 로드
load_dotenv()

# OpenAI API 설정
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    print("경고: OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")
    print("  - .env 파일에 OPENAI_API_KEY를 설정하거나")
    print("  - 시스템 환경 변수를 설정해주세요.")

# 간단한 메모리 캐시 (30분 유효)
_cache = {}
_cache_timeout = 1800  # 30분

class AIExpertService:
    def __init__(self):
        self.client = None
        self.is_available = bool(api_key)
        if self.is_available:
            try:
                self.client = openai.OpenAI(api_key=api_key)
                print("AI 전문가 서비스 초기화 성공")
            except Exception as e:
                print(f"AI 전문가 서비스 초기화 실패: {e}")
                self.is_available = False
        else:
            print("AI 전문가 서비스 비활성화 (API 키 없음)")
    
    def is_service_available(self) -> bool:
        """서비스 사용 가능 여부 확인"""
        return self.is_available and self.client is not None
    
    def _get_cache_key(self, vin: str) -> str:
        """캐시 키 생성 (농기계 정보와 정비 이력 기반)"""
        try:
            machine_info = self.get_machine_info(vin)
            maintenance_history = self.get_maintenance_history(vin)
            
            # 캐시 키 생성을 위한 데이터 해시
            cache_data = {
                'vin': vin,
                'machine_info': machine_info,
                'maintenance_count': len(maintenance_history),
                'last_maintenance_date': maintenance_history[0]['date'] if maintenance_history else None
            }
            
            return hashlib.md5(str(cache_data).encode()).hexdigest()
        except:
            return hashlib.md5(vin.encode()).hexdigest()
    
    def _get_cached_opinion(self, cache_key: str) -> Optional[str]:
        """캐시된 소견 조회"""
        if cache_key in _cache:
            cached_data = _cache[cache_key]
            if time.time() - cached_data['timestamp'] < _cache_timeout:
                print(f"[DEBUG] 캐시된 소견 사용: {cache_key[:8]}...")
                return cached_data['opinion']
            else:
                # 캐시 만료 시 삭제
                del _cache[cache_key]
        return None
    
    def _cache_opinion(self, cache_key: str, opinion: str):
        """소견 캐시 저장"""
        _cache[cache_key] = {
            'opinion': opinion,
            'timestamp': time.time()
        }
        print(f"[DEBUG] 소견 캐시 저장: {cache_key[:8]}...")
    
    def get_maintenance_history(self, vin: str) -> List[Dict]:
        """
        특정 농기계의 정비 이력 조회
        
        Args:
            vin: 기대번호
            
        Returns:
            정비 이력 목록
        """
        conn = get_db_connection()
        if not conn:
            return []
        
        try:
            with conn.cursor() as cursor:
                # 정비 이력과 부품 정보 조회
                sql = """
                SELECT 
                    ml.log_id,
                    ml.vin,
                    ml.service_date,
                    ml.total_cost,
                    ml.ai_summary,
                    ml.working_hours,
                    ml.service_company,
                    GROUP_CONCAT(
                        CONCAT(
                            md.item_name, '(', 
                            CASE 
                                WHEN md.quantity > 1 THEN CONCAT(md.quantity, '개')
                                ELSE '1개'
                            END,
                            '/', 
                            COALESCE(md.part_cost, 0), 
                            '원)'
                        ) ORDER BY md.detail_id
                        SEPARATOR ', '
                    ) as parts_info
                FROM maintenance_log ml
                LEFT JOIN maintenance_detail md ON ml.log_id = md.log_id
                WHERE ml.vin = %s
                GROUP BY ml.log_id
                ORDER BY ml.service_date DESC, ml.log_id DESC
                """
                cursor.execute(sql, (vin,))
                results = cursor.fetchall()
                
                # 결과 변환
                history = []
                for row in results:
                    history.append({
                        'date': str(row['service_date']),
                        'cost': row['total_cost'] or 0,
                        'description': row['ai_summary'] or '',
                        'working_hours': row['working_hours'],
                        'service_company': row['service_company'] or '',
                        'parts_info': row['parts_info'] or ''
                    })
                
                return history
        
        except Exception as e:
            print(f"정비 이력 조회 실패: {e}")
            return []
        finally:
            conn.close()
    
    def get_maintenance_parts_summary(self, vin: str) -> Dict:
        """
        특정 농기계의 사용된 부품 요약 정보 조회
        
        Args:
            vin: 기대번호
            
        Returns:
            부품 요약 정보
        """
        conn = get_db_connection()
        if not conn:
            return {}
        
        try:
            with conn.cursor() as cursor:
                # 부품 사용 통계 조회
                sql = """
                SELECT 
                    md.item_name,
                    pl.part_number,
                    SUM(md.quantity) as total_quantity,
                    COUNT(md.detail_id) as usage_count,
                    AVG(md.part_cost) as avg_price,
                    MAX(ml.service_date) as last_used_date,
                    pl.system_group,
                    pl.part_name as matched_part_name
                FROM maintenance_detail md
                JOIN maintenance_log ml ON md.log_id = ml.log_id
                LEFT JOIN part_list pl ON md.part_id = pl.part_id
                WHERE ml.vin = %s
                GROUP BY md.item_name, pl.part_number, pl.system_group, pl.part_name
                ORDER BY usage_count DESC, total_quantity DESC
                """
                cursor.execute(sql, (vin,))
                results = cursor.fetchall()
                
                # 부품별 통계
                parts_by_system = {}
                total_parts_cost = 0
                total_parts_count = 0
                
                for row in results:
                    system = row['system_group'] or '기타'
                    if system not in parts_by_system:
                        parts_by_system[system] = []
                    
                    parts_by_system[system].append({
                        'part_name': row['matched_part_name'] or row['item_name'],
                        'part_number': row['part_number'] or '알 수 없음',
                        'total_quantity': row['total_quantity'],
                        'usage_count': row['usage_count'],
                        'avg_price': row['avg_price'],
                        'last_used': str(row['last_used_date'])
                    })
                    
                    total_parts_cost += row['avg_price'] * row['total_quantity']
                    total_parts_count += row['total_quantity']
                
                return {
                    'parts_by_system': parts_by_system,
                    'total_parts_cost': total_parts_cost,
                    'total_parts_count': total_parts_count,
                    'unique_parts_count': len(results)
                }
        
        except Exception as e:
            print(f"부품 요약 정보 조회 실패: {e}")
            return {}
        finally:
            conn.close()
    
    def get_machine_info(self, vin: str) -> Dict:
        """
        농기계 기본 정보 조회
        
        Args:
            vin: 기대번호
            
        Returns:
            농기계 정보
        """
        conn = get_db_connection()
        if not conn:
            return {}
        
        try:
            with conn.cursor() as cursor:
                sql = """
                SELECT 
                    mi.vin,
                    mi.production_year,
                    mi.total_hours,
                    mm.base_model_name,
                    mf.mfg_name,
                    c.cat_name
                FROM machine_instance mi
                LEFT JOIN machine_master mm ON mi.model_id = mm.model_id
                LEFT JOIN manufacturer_codes mf ON mm.mfg_code = mf.mfg_code
                LEFT JOIN category_codes c ON mm.cat_code = c.cat_code
                WHERE mi.vin = %s
                """
                cursor.execute(sql, (vin,))
                result = cursor.fetchone()
                
                if result:
                    return {
                        'vin': result['vin'],
                        'model': result['base_model_name'],
                        'manufacturer': result['mfg_name'],
                        'category': result['cat_name'],
                        'year': result['production_year'],
                        'total_hours': result['total_hours']
                    }
                
                return {}
        
        except Exception as e:
            print(f"농기계 정보 조회 실패: {e}")
            return {}
        finally:
            conn.close()
    
    def generate_expert_opinion(self, vin: str) -> str:
        """
        AI 전문가 소견 생성
        
        Args:
            vin: 기대번호
            
        Returns:
            전문가 소견 (최대 500자)
        """
        if not self.is_service_available():
            return "AI 전문가 서비스를 사용할 수 없습니다. OpenAI API 키를 설정해주세요."
        
        try:
            print(f"[DEBUG] AI 전문가 소견 생성 시작 - VIN: {vin}")
            
            # 캐시 키 생성
            cache_key = self._get_cache_key(vin)
            
            # 캐시된 소견 확인
            cached_opinion = self._get_cached_opinion(cache_key)
            if cached_opinion:
                return cached_opinion
            
            # 농기계 정보 및 정비 이력 조회
            machine_info = self.get_machine_info(vin)
            maintenance_history = self.get_maintenance_history(vin)
            parts_summary = self.get_maintenance_parts_summary(vin)
            
            print(f"[DEBUG] 농기계 정보: {machine_info}")
            print(f"[DEBUG] 정비 이력 수: {len(maintenance_history)}")
            print(f"[DEBUG] 부품 요약: {parts_summary}")
            
            if not machine_info:
                print("[DEBUG] 농기계 정보를 찾을 수 없음")
                return "농기계 정보를 찾을 수 없습니다."
            
            if not maintenance_history:
                print("[DEBUG] 정비 이력이 없음")
                return "정비 이력이 없어 전문가 소견을 제공할 수 없습니다."
            
            # 프롬프트 생성
            prompt = self._create_expert_prompt(machine_info, maintenance_history, parts_summary)
            print(f"[DEBUG] 프롬프트 길이: {len(prompt)}")
            
            # OpenAI API 호출 (최적화된 설정)
            start_time = time.time()
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",  # 더 빠른 모델 사용
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 30년 경력의 농기계 베테랑 전문가입니다. 농기계 정비 이력과 부품 사용 내역을 분석하여 전문적이고 기술적인 소견을 제공해주세요. 다음 지침을 반드시 따르세요:\n1. 항상 전문가적이고 기술적인 관점에서 분석합니다.\n2. 농기계 기술 용어를 정확하게 사용하여 설명합니다.\n3. 최대 600자 이내로 상세하고 전문적으로 응답합니다.\n4. 문장이 중간에 끊기지 않고 자연스럽게 마무리됩니다.\n5. 번호를 사용하여 명확하게 구분합니다.\n6. 각 항목은 완전한 문장으로 작성합니다.\n7. 부품 사용 패턴과 계통별 분석을 반드시 포함합니다.\n8. 기술적인 분석과 구체적인 수치를 바탕으로 소견을 제공합니다.\n9. 농기계 수명 주기와 정비 주기에 대한 전문적인 견해를 제시합니다."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=450,  # 토큰 수 조정 (600자 기준)
                temperature=0.3,  # 더 일관된 응답
                timeout=20.0  # 20초 타임아웃
            )
            
            api_time = time.time() - start_time
            print(f"[DEBUG] OpenAI API 호출 시간: {api_time:.2f}초")
            
            opinion = response.choices[0].message.content.strip()
            print(f"[DEBUG] 생성된 소견: {opinion}")
            
            # 600자 제한 및 문장 완성 처리
            if len(opinion) > 600:
                opinion = opinion[:597] + "..."
            
            # 문장이 중간에 끊기지 않도록 처리
            lines = opinion.split('\n')
            completed_lines = []
            for line in lines:
                line = line.strip()
                if line and not line.endswith(('.', '!', '?', '。')):
                    # 문장이 끝나지 않으면 마침표 추가
                    line += '.'
                completed_lines.append(line)
            
            opinion = '\n'.join(completed_lines)
            
            # 캐시에 저장
            self._cache_opinion(cache_key, opinion)
            
            return opinion
        
        except Exception as e:
            print(f"[ERROR] AI 전문가 소견 생성 실패: {e}")
            return "전문가 소견 생성 중 오류가 발생했습니다."
    
    def chat_with_expert(self, vin: Optional[str], message: str, history: List[Dict]) -> str:
        """
        AI 전문가와 대화
        
        Args:
            vin: 농기계 번호 (선택)
            message: 사용자 메시지
            history: 대화 이력
            
        Returns:
            AI 응답 메시지
        """
        if not self.is_service_available():
            return "⚠️ AI 챗봇 서비스를 사용할 수 없습니다. 관리자에게 문의하세요."
        
        try:
            # 농기계 정보 및 정비 이력 로드
            machine_info_text = ""
            history_text = ""
            
            if vin:
                machine_info = self.get_machine_info(vin)
                if machine_info:
                    machine_info_text = f"""
현재 조회 중인 농기계 정보:
- 모델: {machine_info.get('model', 'N/A')}
- 제조사: {machine_info.get('manufacturer', 'N/A')}
- 연식: {machine_info.get('year', 'N/A')}년식
- 가동시간: {machine_info.get('total_hours', 0)}시간
- VIN: {vin}"""
                
                maintenance_history = self.get_maintenance_history(vin)
                if maintenance_history:
                    history_text = "\n정비 이력 (최근 5개):\n"
                    for idx, record in enumerate(maintenance_history[:5], 1):
                        history_text += f"{idx}. {record['date']}: {record['description']} ({record['cost']:,}원)\n"
                    history_text += f"\n총 정비 횟수: {len(maintenance_history)}건"
                else:
                    history_text = "\n정비 이력이 없습니다."
            
            # 시스템 프롬프트
            system_prompt = f"""당신은 30년 경력의 농기계 정비 전문가입니다. 
농기계(트랙터, 콤바인, 이앙기 등)의 정비, 고장 진단, 부품 교체, 유지보수에 대한 전문 지식을 가지고 있습니다.

{machine_info_text}
{history_text}

주요 전문 분야:
- 엔진계통: 디젤 엔진, 연료 시스템, 냉각 시스템
- 유압계통: 유압 펌프, 실린더, 유압유 관리
- 동력계통: 클러치, 변속기, 동력 전달 장치
- 전기계통: 배터리, 발전기, 배선, 센서
- 일반 정비: 오일 교환, 필터 관리, 정비 주기

답변 스타일:
- 위에 제공된 실제 정비 이력을 기반으로 분석
- 친절하고 이해하기 쉽게 설명
- 구체적인 점검 방법과 해결책 제시
- 안전 주의사항 강조
- 필요시 전문가 상담 권장
- 한국어로 답변"""
            
            # 메시지 구성
            messages = [{"role": "system", "content": system_prompt}]
            
            # 대화 이력 추가 (최근 5개만)
            for msg in history[-5:]:
                messages.append({"role": msg.get("role"), "content": msg.get("content")})
            
            # 현재 메시지 추가
            messages.append({"role": "user", "content": message})
            
            # OpenAI API 호출
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            print(f"[ERROR] AI 챗봇 응답 생성 실패: {e}")
            return f"⚠️ 죄송합니다. 응답 생성 중 오류가 발생했습니다.\n{str(e)}\n\n잠시 후 다시 시도해주세요."
    
    def _create_expert_prompt(self, machine_info: Dict, maintenance_history: List[Dict], parts_summary: Dict) -> str:
        """
        전문가 소견 생성을 위한 프롬프트 생성
        
        Args:
            machine_info: 농기계 정보
            maintenance_history: 정비 이력
            parts_summary: 부품 요약 정보
            
        Returns:
            프롬프트 텍스트
        """
        # 농기계 기본 정보
        basic_info = f"""
농기계 정보:
- 기종: {machine_info.get('category', '알 수 없음')} {machine_info.get('model', '알 수 없음')}
- 제조사: {machine_info.get('manufacturer', '알 수 없음')}
- 연식: {machine_info.get('year', '알 수 없음')}년식
- 총 가동시간: {machine_info.get('total_hours', 0)}시간
"""
        
        # 정비 이력 요약
        history_summary = ""
        total_cost = 0
        recent_repairs = []
        
        for i, record in enumerate(maintenance_history[:5]):  # 최근 5개만 표시
            service_info = f" (정비업체: {record['service_company']})" if record['service_company'] else ""
            parts_info = f" (부품: {record['parts_info']})" if record['parts_info'] else ""
            history_summary += f"\n{i+1}. {record['date']}: {record['description']}{service_info}{parts_info} ({record['cost']:,}원)"
            total_cost += record['cost']
            recent_repairs.append(f"{record['date']}: {record['description']}")
        
        # 정비업체 요약
        service_companies = set()
        for record in maintenance_history:
            if record['service_company']:
                service_companies.add(record['service_company'])
        
        service_summary = ""
        if service_companies:
            service_summary = f"\n\n주요 정비업체: {', '.join(sorted(service_companies))}"
        
        # 부품 사용 분석
        parts_analysis = ""
        if parts_summary and parts_summary.get('parts_by_system'):
            parts_analysis = "\n\n계통별 부품 사용 분석:"
            for system, parts in parts_summary['parts_by_system'].items():
                parts_analysis += f"\n- {system} 계통: {len(parts)}개 부품 사용"
                for part in parts[:3]:  # 각 계통별 상위 3개 부품만
                    parts_analysis += f"\n  • {part['part_name']} ({part['part_number']}) - {part['usage_count']}회, 총 {part['total_quantity']}개"
            
            parts_analysis += f"\n\n총 부품 사용 통계:"
            parts_analysis += f"\n- 총 부품 비용: {parts_summary.get('total_parts_cost', 0):,}원"
            parts_analysis += f"\n- 총 부품 수량: {parts_summary.get('total_parts_count', 0)}개"
            parts_analysis += f"\n- 고유 부품 종류: {parts_summary.get('unique_parts_count', 0)}개"
        
        # 프롬프트 조합
        prompt = f"""
다음 농기계의 정비 이력과 부품 사용 내역을 기술적으로 분석하여 전문가 소견을 제공해주세요.

{basic_info}

정비 이력 (최근 5개):
{history_summary}

총 정비 비용: {total_cost:,}원
{service_summary}
{parts_analysis}

위 정보를 바탕으로 다음 사항에 대한 전문적이고 기술적인 소견을 제공해주세요:
1. 농기계 현재 상태에 대한 기술적 평가 (가동시간, 부품 마모도, 성능 저하 등)
2. 주요 정비 내역의 기술적 분석 (교체된 부품의 기능적 의미와 영향)
3. 계통별 부품 사용 패턴 분석 (엔진, 동력전달, 유압 등 계통별 특징)
4. 수명 주기 기반 정비 예측 (부품 교체 주기, 다음 정비 시점 예측)
5. 기술적 관점에서의 관리 및 운영 방안 (예방 정비, 최적 운영 조건 등)

최대 600자 이내로 전문적이고 기술적인 분석을 제공해주세요.
"""
        
        return prompt


# 전역 인스턴스
ai_expert_service = AIExpertService()
