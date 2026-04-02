# backend/app/services/enhanced_ocr.py
"""
고도화된 OCR 서비스 (정비사용)
- 정비업체명 추출 개선
- 더 정확한 데이터 파싱
- 정비명세서 특화
"""

import re
from typing import Dict, List, Optional, Any

class EnhancedOCRParser:
    """고도화된 OCR 파서"""
    
    def __init__(self):
        # 정비업체명 패턴 (더 정확하게)
        self.service_company_patterns = [
            # 대동 관련
            r'(?:대동|DAEDONG)\s*([가-힣A-Za-z0-9\s]*(?:서비스|기술|공업|자동차|모터스|테크))',
            r'([가-힣A-Za-z0-9\s]*(?:서비스|기술|공업|자동차|모터스|테크))\s*(?:대동|DAEDONG)',
            r'\(?(?:주|Ltd\.|Co\.)\s*([가-힣A-Za-z0-9\s]*(?:서비스|기술|공업|자동차|모터스|테크))\)?',
            
            # 일반 패턴
            r'정비업체\s*[:\s]*([^\n\r]+)',
            r'서비스\s*[:\s]*([^\n\r]+)',
            r'공급자\s*[:\s]*([^\n\r]+)',
            r'판매자\s*[:\s]*([^\n\r]+)',
            
            # 기타 패턴
            r'([가-힣]+)\s*(?:서비스센터|Service Center)',
            r'([A-Za-z\s]+Service)',
            r'([A-Za-z\s]+Motors)',
            r'([A-Za-z\s]+Tech)',
        ]
        
        # 제외할 단어
        self.exclude_words = [
            '정비업체', '서비스', '사업자번호', 'INV', 'VAT', '주소', '전화', '팩스', 
            '번호', '고객', '차량', '모델', 'VIN', '년식', 'km', '원', '(', ')',
            '수리비', '부품비', '공임', '합계', '세액', '현금', '카드', '계좌이체'
        ]
        
        # 부품명 패턴
        self.part_patterns = [
            r'(엔진|오일|필터|에어|클리너|플러그|벨트|호스|패드|디스크|타이어|배터리)',
            r'(브레이크|클러치|미션|기어|오일|액체|부동|펌프|라디에이터|워터펌프)',
            r'(베어링|씰|가스켓|오링|실링트|볼트|너트|와셔|스프링)',
            r'(램프|전구|미러|와이퍼|블레이드|캡|바디|도어|트렁크)',
        ]
        
        # 금액 패턴 (더 정확하게)
        self.amount_patterns = [
            r'수리비\s*[:\s]*([\d,]+)',
            r'부품비\s*[:\s]*([\d,]+)',
            r'공임\s*[:\s]*([\d,]+)',
            r'합계\s*[:\s]*([\d,]+)',
            r'총액\s*[:\s]*([\d,]+)',
            r'결제금액\s*[:\s]*([\d,]+)',
            r'([\d,]+)\s*원',
            r'₩\s*([\d,]+)',
        ]

    def parse_service_company(self, text: str) -> Optional[str]:
        """정비업체명 추출 (개선된 버전)"""
        lines = text.split('\n')
        candidates = []
        
        for pattern in self.service_company_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                candidate = match.group(1) if match.groups() else match.group(0)
                candidate = candidate.strip()
                
                # 후처리
                candidate = re.sub(r'[^\w\s가-힣]', '', candidate)
                
                # 유효성 검사
                if self._is_valid_service_company(candidate):
                    candidates.append(candidate)
        
        # 가장 적합한 후보 선택
        if candidates:
            return self._select_best_candidate(candidates)
        
        return None

    def _is_valid_service_company(self, name: str) -> bool:
        """정비업체명 유효성 검사"""
        if not name or len(name) < 2:
            return False
        
        # 제외 단어 확인
        for word in self.exclude_words:
            if word in name:
                return False
        
        # 숫자만 있는 경우 제외
        if re.match(r'^[\d\s]+$', name):
            return False
        
        # 너무 긴 경우 제외
        if len(name) > 30:
            return False
        
        return True

    def _select_best_candidate(self, candidates: List[str]) -> str:
        """가장 적합한 후보 선택"""
        # 점수 기반 선택
        scored_candidates = []
        
        for candidate in candidates:
            score = 0
            
            # '서비스', '기술', '공업' 등 포함 시 가산
            if any(keyword in candidate for keyword in ['서비스', '기술', '공업', '자동차', '모터스']):
                score += 3
            
            # '대동' 포함 시 가산
            if '대동' in candidate:
                score += 2
            
            # 길이 적절성 (5-15자)
            if 5 <= len(candidate) <= 15:
                score += 1
            
            scored_candidates.append((candidate, score))
        
        # 점수가 가장 높은 후보 선택
        if scored_candidates:
            return max(scored_candidates, key=lambda x: x[1])[0]
        
        return candidates[0]

    def parse_parts(self, text: str) -> List[Dict[str, Any]]:
        """부품 정보 추출 (개선된 버전)"""
        parts = []
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # 부품명 패턴 검색
            part_name = None
            for pattern in self.part_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    part_name = match.group(0)
                    break
            
            if part_name:
                # 수량과 금액 추출
                quantity = self._extract_quantity(line)
                cost = self._extract_cost(line)
                
                parts.append({
                    'part_name': part_name,
                    'quantity': quantity,
                    'cost': cost
                })
        
        return parts

    def _extract_quantity(self, line: str) -> int:
        """수량 추출"""
        # 수량 패턴
        patterns = [
            r'(\d+)\s*개',
            r'(\d+)\s*EA',
            r'수량\s*[:\s]*(\d+)',
            r'Qty\s*[:\s]*(\d+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                return int(match.group(1))
        
        return 1

    def _extract_cost(self, line: str) -> int:
        """비용 추출"""
        # 금액 패턴
        for pattern in self.amount_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                amount_str = match.group(1)
                amount = re.sub(r'[^\d]', '', amount_str)
                try:
                    return int(amount)
                except ValueError:
                    continue
        
        return 0

    def parse_vehicle_info(self, text: str) -> Dict[str, str]:
        """차량 정보 추출"""
        info = {}
        
        # VIN 추출
        vin_patterns = [
            r'VIN\s*[:\s]*([A-Z0-9]+)',
            r'차량번호\s*[:\s]*([A-Z0-9]+)',
            r'기대번호\s*[:\s]*([A-Z0-9]+)',
            r'([A-Z]{2}\d{9,13})',
        ]
        
        for pattern in vin_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                info['vin'] = match.group(1)
                break
        
        # 모델명 추출
        model_patterns = [
            r'모델\s*[:\s]*([^\n\r]+)',
            r'차종\s*[:\s]*([^\n\r]+)',
            r'기종\s*[:\s]*([^\n\r]+)',
        ]
        
        for pattern in model_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                info['model'] = match.group(1).strip()
                break
        
        return info

    def parse_receipt(self, ocr_text: str) -> Dict[str, Any]:
        """정비명세서 전체 파싱"""
        result = {
            'service_company': self.parse_service_company(ocr_text),
            'parts': self.parse_parts(ocr_text),
            'vehicle_info': self.parse_vehicle_info(ocr_text),
            'total_cost': self._extract_total_cost(ocr_text),
            'service_date': self._extract_service_date(ocr_text),
            'raw_text': ocr_text
        }
        
        return result

    def _extract_total_cost(self, text: str) -> int:
        """총비용 추출"""
        # 합계, 총액 등 패턴
        patterns = [
            r'합계\s*[:\s]*([\d,]+)\s*원',
            r'총액\s*[:\s]*([\d,]+)\s*원',
            r'결제금액\s*[:\s]*([\d,]+)\s*원',
            r'최종\s*[:\s]*([\d,]+)\s*원',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount_str = match.group(1)
                amount = re.sub(r'[^\d]', '', amount_str)
                try:
                    return int(amount)
                except ValueError:
                    continue
        
        # 부품비 + 수리비 계산
        parts_cost = 0
        labor_cost = 0
        
        for line in text.split('\n'):
            line = line.strip()
            if '부품비' in line:
                match = re.search(r'([\d,]+)', line)
                if match:
                    parts_cost = int(re.sub(r'[^\d]', '', match.group(1)))
            
            elif '수리비' in line or '공임' in line:
                match = re.search(r'([\d,]+)', line)
                if match:
                    labor_cost = int(re.sub(r'[^\d]', '', match.group(1)))
        
        return parts_cost + labor_cost

    def _extract_service_date(self, text: str) -> Optional[str]:
        """서비스 날짜 추출"""
        date_patterns = [
            r'(\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})',
            r'(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4})',
            r'서비스일\s*[:\s]*(\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})',
            r'정비일\s*[:\s]*(\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})',
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                date_str = match.group(1)
                # 날짜 형식 정규화
                date_str = re.sub(r'[/.]', '-', date_str)
                
                # YYYY-MM-DD 형식으로 변환
                if re.match(r'\d{1,2}-\d{1,2}-\d{4}', date_str):
                    parts = date_str.split('-')
                    date_str = f'{parts[2]}-{parts[0].zfill(2)}-{parts[1].zfill(2)}'
                
                return date_str
        
        return None
