# backend/app/services/ocr_parser.py
"""
OCR 텍스트에서 정비 상세 내역 추출
- Google Vision API로 추출한 텍스트를 파싱
- 부품 번호, 부품명, 수량, 단가, 금액 추출
"""

import re
import pymysql
from typing import List, Dict, Optional
from app.database import get_db_connection

def parse_service_company(ocr_text: str) -> Optional[str]:
    """
    OCR 텍스트에서 정비업체 이름 추출
    
    Args:
        ocr_text: Google Vision API로 추출한 전체 텍스트
    
    Returns:
        정비업체 이름 (영문)
    """
    # 정비업체 패턴 - 더 구체적인 패턴으로 개선
    service_company_patterns = [
        r'정비업체\s*[:\s]*([^\n\r]+)',           # 정비업체: 대동 대구서비스
        r'서비스\s*[:\s]*([^\n\r]+)',             # 서비스: 대동 대구서비스
        r'\(주\)\s*([가-힣A-Za-z\s]+)',           # (주)대동 대구서비스
        r'([가-힣]+)\s*서비스',                  # 대동 서비스
        r'([가-힣]+)\s*공업',                    # 대동 공업
        r'([가-힣]+)\s*자동차',                  # 대동 자동차
        r'([가-힣]+)\s*기술',                    # 대동 기술
        r'([A-Za-z\s]+Service)',                 # Daedong Service
        r'([A-Za-z\s]+Motors)',                  # Daedong Motors
        r'([A-Za-z\s]+Tech)',                   # Daedong Tech
    ]
    
    lines = ocr_text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # 정비업체 관련 키워드가 있는 라인만 확인
        if any(keyword in line for keyword in ['정비업체', '서비스', '대동', '공업', '자동차', '기술', 'Service', 'Motors', 'Tech']):
            
            for pattern in service_company_patterns:
                matches = re.findall(pattern, line, re.IGNORECASE)
                for match in matches:
                    # 불필요한 단어 필터링
                    filtered_match = match.strip()
                    # 최소 2자 이상, 최대 20자 이하
                    if (2 <= len(filtered_match) <= 20 and 
                        not any(skip_word in filtered_match for skip_word in 
                               ['정비업체', '서비스', '사업자번호', 'INV', 'VAT', '주소', '전화', '팩스', '번호', '고객', '차량'])):
                        return filtered_match
    
    return None


def extract_working_hours(ocr_text: str) -> Optional[int]:
    """
    OCR 텍스트에서 가동시간 추출
    
    Args:
        ocr_text: Google Vision API로 추출한 전체 텍스트
    
    Returns:
        가동시간 (시간)
    """
    # 가동시간 패턴
    hour_patterns = [
        r'가동시간\s*[:\s]*(\d+)',      # 가동시간: 1257
        r'사용시간\s*[:\s]*(\d+)',      # 사용시간: 1257
        r'작업시간\s*[:\s]*(\d+)',      # 작업시간: 1257
        r'(\d+)\s*h',                   # 1257h
        r'(\d+)\s*시간',                # 1257시간
    ]
    
    for pattern in hour_patterns:
        matches = re.findall(pattern, ocr_text)
        if matches:
            try:
                hours = int(matches[0])
                if 0 < hours < 50000:  # 합리적인 시간 범위
                    return hours
            except ValueError:
                continue
    
    return None


def parse_maintenance_details(ocr_text: str) -> List[Dict]:
    """
    OCR 텍스트에서 정비 상세 내역 추출
    실제 OCR 형식: 여러 라인에 걸쳐 부품 정보가 분산됨
    
    Args:
        ocr_text: Google Vision API로 추출한 전체 텍스트
    
    Returns:
        [
            {
                'part_number': '부품번호',
                'part_name': '부품명',
                'quantity': 수량,
                'unit_price': 단가,
                'total_price': 금액
            },
            ...
        ]
    """
    details = []
    
    # OCR 텍스트 전처리 - 합쳐진 라인 분리
    processed_lines = preprocess_ocr_lines(ocr_text)
    
    # 부품 내역 섹션 찾기
    in_parts_section = False
    
    for i, line in enumerate(processed_lines):
        line = line.strip()
        if not line:
            continue
        
        # 부품 내역 섹션 시작 감지
        if any(keyword in line for keyword in ['순번', '부품번호', '부품명', '품명', '수량', '단가', '금액', 'NO', 'PART']):
            in_parts_section = True
            continue
        
        # 부품 내역 섹션 종료 감지
        if in_parts_section and any(keyword in line for keyword in ['합계', '총액', '기술료', '공임', 'TOTAL', 'SUM', '세액']):
            break
        
        if not in_parts_section:
            continue
        
        # 다양한 부품번호 패턴 찾기
        part_number = extract_part_number(line)
        if part_number:
            try:
                detail = extract_part_info_multiline(processed_lines, i, part_number)
                if detail:
                    details.append(detail)
            except Exception as e:
                print(f"부품 정보 추출 오류 (라인: {line}): {e}")
                continue
    
    # 추가: 모든 부품번호 추출 (기존 파서가 놓친 부품 보완)
    # 단, part_list에 데이터가 있을 때만 시도
    all_part_numbers = extract_all_part_numbers(ocr_text)
    
    if all_part_numbers:
        for part_number in all_part_numbers:
            # 이미 추출된 부품번호는 건너뛰기
            if part_number not in [d['part_number'] for d in details]:
                part_info = match_part_with_database(part_number)
                if part_info:
                    # part_list 매칭 정보로 부품 정보 생성
                    detail = {
                        'part_number': part_number,
                        'part_name': part_info['part_name'],
                        'quantity': 1,  # 기본값
                        'unit_price': part_info['base_price'],
                        'total_price': part_info['base_price'],
                        'part_id': part_info['part_id'],
                        'matched_part_name': part_info['part_name'],
                        'base_price': part_info['base_price'],
                        'base_labor': part_info.get('base_labor', 0),
                        'system_group': part_info.get('system_group', ''),
                        'source': 'enhanced'  # 추출 출처 표시
                    }
                    details.append(detail)
                    print(f"[DEBUG] 부품번호만으로 추출 성공: {part_number} -> {part_info['part_name']}")
    
    print(f"총 {len(details)}개의 부품 정보 추출됨")
    return details


def extract_all_part_numbers(ocr_text: str) -> List[str]:
    """
    OCR 텍스트에서 모든 형태의 부품번호 추출
    부품번호 형식: DD-T-EN-0125 (대동-기종-계통-시리얼)
    """
    # 부품번호 패턴: DD-XX-YYYY 형태
    part_number_pattern = r'DD-[A-Z]-[A-Z]{2}-\d{4}'
    
    all_parts = []
    matches = re.findall(part_number_pattern, ocr_text)
    
    for match in matches:
        if len(match) >= 8:
            # 기대번호 필터링 (DC0001240001 등)
            if not (match.startswith('DC') and len(match) > 10 and match[2:4].isdigit()):
                all_parts.append(match)
    
    return list(set(all_parts))  # 중복 제거


def parse_part_number_components(part_number: str) -> Dict[str, str]:
    """
    부품번호 컴포넌트 파싱
    DD-T-EN-0125 -> {manufacturer: '대동', machine_type: '트랙터', system: '엔진계통', serial: '0125'}
    """
    components = {
        'manufacturer': '대동',  # DD는 항상 대동
        'machine_type': '',
        'system': '',
        'serial': ''
    }
    
    try:
        parts = part_number.split('-')
        if len(parts) >= 4:
            # DD-T-EN-0125 형식
            components['machine_type'] = parts[1]
            components['system'] = parts[2]
            components['serial'] = parts[3]
            
            # 기종 코드 변환
            machine_type_map = {
                'T': '트랙터',
                'I': '이앙기', 
                'C': '콤바인'
            }
            
            # 계통 코드 변환
            system_map = {
                'EN': '엔진계통',
                'TM': '동력전달',
                'HY': '유압작업',
                'EL': '전기전장',
                'CM': '일반소모'
            }
            
            components['machine_type_name'] = machine_type_map.get(parts[1], parts[1])
            components['system_name'] = system_map.get(parts[2], parts[2])
            
    except Exception as e:
        print(f"부품번호 파싱 오류 ({part_number}): {e}")
    
    return components


def extract_part_number(line: str) -> Optional[str]:
    """
    라인에서 부품번호 추출 (다양한 패턴 지원)
    """
    # 패턴 1: 순번+|+부품번호 (예: "1|DD-C-TM-0175")
    match = re.match(r'^\d+\|[A-Z][A-Z0-9\-]+$', line)
    if match:
        return match.group().split('|')[1]
    
    # 패턴 2: 순번+공백+부품번호 (예: "3 DD-C-CM-0060")
    match = re.match(r'^\d+\s+[A-Z][A-Z0-9\-]+$', line)
    if match:
        return match.group().split()[1]
    
    # 패턴 3: 숫자+영문+숫자+기호+숫자 (예: "1DD-I-EL-0028")
    match = re.match(r'^\d+[A-Z]+-[A-Z]-\d{4}$', line)
    if match:
        return match.group()
    
    # 패턴 4: 숫자+영문+숫자+기호+숫자+영문+숫자 (예: "DD-I-HY-0199")
    match = re.match(r'^[A-Z]{2}-[A-Z]-\d{4}$', line)
    if match:
        return match.group()
    
    # 패턴 5: 영문+숫자+기호+숫자 (예: "DD-C-TM-0175")
    match = re.match(r'^[A-Z]{2}-[A-Z]-\d{4}$', line)
    if match:
        return match.group()
    
    return None


def preprocess_ocr_lines(ocr_text: str) -> List[str]:
    """
    OCR 텍스트 전처리 - 합쳐진 라인을 분리
    """
    lines = ocr_text.split('\n')
    processed_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # 여러 패턴으로 라인 분리
        # 1. 순번+부품번호 패턴으로 분리
        part_matches = re.findall(r'(\d+\|[A-Z][A-Z0-9\-]+)', line)
        if part_matches:
            # 패턴 앞뒤로 분리
            remaining = line
            for match in part_matches:
                idx = remaining.find(match)
                if idx > 0:
                    before = remaining[:idx].strip()
                    if before:
                        processed_lines.append(before)
                processed_lines.append(match)
                remaining = remaining[idx + len(match):].strip()
            if remaining:
                processed_lines.append(remaining)
            continue
        
        # 2. 순번+공백+부품번호 패턴으로 분리
        space_part_matches = re.findall(r'(\d+\s+[A-Z][A-Z0-9\-]+)', line)
        if space_part_matches:
            # 패턴 앞뒤로 분리
            remaining = line
            for match in space_part_matches:
                idx = remaining.find(match)
                if idx > 0:
                    before = remaining[:idx].strip()
                    if before:
                        processed_lines.append(before)
                processed_lines.append(match)
                remaining = remaining[idx + len(match):].strip()
            if remaining:
                processed_lines.append(remaining)
            continue
        
        # 3. | 기호로 시작하는 부품명 분리
        if line.startswith('|'):
            processed_lines.append(line)
        else:
            # 그 외의 경우는 그대로 추가
            processed_lines.append(line)
    
    return processed_lines


def extract_part_info_multiline_alt(lines: List[str], start_idx: int, part_number: str) -> Optional[Dict]:
    """
    여러 라인에 걸쳐진 부품 정보 추출 (대체 형식: "3 DD-C-CM-0060")
    
    Args:
        lines: 전체 라인 목록
        start_idx: 순번+공백+부품번호 라인 인덱스
        part_number: 추출된 부품번호
    
    Returns:
        부품 정보 딕셔너리 또는 None
    """
    
    # 다음 라인들에서 정보 추출
    part_name = ''
    quantity = 1
    unit_price = 0
    total_price = 0
    
    # 다음 10라인까지 확인하며 정보 추출
    for i in range(start_idx + 1, min(start_idx + 11, len(lines))):
        line = lines[i].strip()
        
        # 다음 순번+부품번호 시작이나 섹션 종료 키워드를 만나면 중단
        if re.match(r'^\d+\s+[A-Z][A-Z0-9\-]+$', line):
            break
        if re.match(r'^\d+\|[A-Z][A-Z0-9\-]+$', line):
            break
        if any(keyword in line for keyword in ['합계', '총액', '기술료', '공임', 'TOTAL', 'SUM']):
            break
        
        # 부품명 라인 찾기
        if line and not any(keyword in line for keyword in ['연락처', '부품번호', '부품명', '수량', '단가', '금액']):
            # | 기호로 시작하는 라인은 부품명
            if line.startswith('|'):
                clean_name = line[1:].strip()  # | 제거
                clean_name = re.sub(r'\s+', ' ', clean_name)  # 공백 정리
                if clean_name and len(clean_name) > 1:
                    part_name = clean_name
                    continue
            
            # 숫자가 없는 라인은 부품명
            if not any(char.isdigit() for char in line):
                clean_name = re.sub(r'[|\s]', '', line).strip()
                clean_name = re.sub(r'\s+', ' ', clean_name)
                if clean_name and len(clean_name) > 1:
                    part_name = part_name
                    continue
        
        # 수량, 단가, 금액 라인 찾기
        if line and any(char.isdigit() for char in line):
            # 쉼표 포함 숫자 추출
            numbers = re.findall(r'(\d{1,3}(?:,\d{3})*)', line)
            
            if len(numbers) == 3:
                try:
                    quantity = int(numbers[0].replace(',', ''))
                    unit_price = int(numbers[1].replace(',', ''))
                    total_price = int(numbers[2].replace(',', ''))
                except ValueError:
                    pass
                break
            elif len(numbers) == 2:
                try:
                    quantity = 1
                    unit_price = int(numbers[0].replace(',', ''))
                    total_price = int(numbers[1].replace(',', ''))
                except ValueError:
                    pass
                break
            elif len(numbers) == 1:
                try:
                    quantity = 1
                    unit_price = int(numbers[0].replace(',', ''))
                    total_price = int(numbers[0].replace(',', ''))
                except ValueError:
                    pass
                break
    
    # part_list 테이블에서 매칭 정보 조회
    part_info = match_part_with_database(part_number)
    
    # 유효성 검사
    if not part_name.strip() or total_price == 0:
        return None
    
    # 기본 정보 반환 (part_list 매칭 정보 우선)
    result = {
        'part_number': part_number,
        'part_name': part_name.strip(),
        'quantity': quantity,
        'unit_price': unit_price,
        'total_price': total_price
    }
    
    # part_list 매칭 정보 추가 (OCR 데이터보다 우선)
    if part_info:
        result.update({
            'part_id': part_info['part_id'],
            'part_name': part_info['part_name'],  # 표준 부품명으로 덮어쓰기
            'matched_part_name': part_info['part_name'],
            'base_price': part_info['base_price'],
            'base_labor': part_info.get('base_labor', 0),
            'system_group': part_info.get('system_group', ''),
            # OCR 가격 대신 표준 가격 사용
            'unit_price': part_info['base_price'],
            'total_price': part_info['base_price'] * quantity,
            'ocr_total_price': total_price  # OCR 가격은 백업으로 저장
        })
        print(f"[DEBUG] 부품 매칭 성공: {part_number} -> {part_info['part_name']}")
        print(f"[DEBUG] 표준 가격 적용: {part_info['base_price']:,}원 (OCR: {total_price:,}원)")
    else:
        print(f"[DEBUG] 부품 매칭 실패: {part_number} (OCR 데이터 사용)")
    
    return result


def extract_part_info_multiline(lines: List[str], start_idx: int, part_number: str) -> Optional[Dict]:
    """
    여러 라인에 걸쳐진 부품 정보 추출 및 part_list 매칭
    
    Args:
        lines: 전체 라인 목록
        start_idx: 부품번호 라인 인덱스
        part_number: 추출된 부품번호
    
    Returns:
        부품 정보 딕셔너리 또는 None
    """
    
    # 다음 라인들에서 정보 추출
    part_name = ''
    quantity = 1
    unit_price = 0
    total_price = 0
    
    # 다음 10라인까지 확인하며 정보 추출
    for i in range(start_idx + 1, min(start_idx + 11, len(lines))):
        line = lines[i].strip()
        
        # 다음 순번+부품번호 시작이나 섹션 종료 키워드를 만나면 중단
        if re.match(r'^\d+\|[A-Z][A-Z0-9\-]+$', line):
            break
        if any(keyword in line for keyword in ['합계', '총액', '기술료', '공임', 'TOTAL', 'SUM']):
            break
        
        # 부품명 라인 찾기
        if line and not any(keyword in line for keyword in ['연락처', '부품번호', '부품명', '수량', '단가', '금액']):
            # | 기호로 시작하는 라인은 부품명
            if line.startswith('|'):
                clean_name = line[1:].strip()  # | 제거
                clean_name = re.sub(r'\s+', ' ', clean_name)  # 공백 정리
                if clean_name and len(clean_name) > 1:
                    part_name = clean_name
                    continue
            
            # 숫자가 없는 라인은 부품명
            if not any(char.isdigit() for char in line):
                clean_name = re.sub(r'[|\s]', '', line).strip()
                clean_name = re.sub(r'\s+', ' ', clean_name)
                if clean_name and len(clean_name) > 1:
                    part_name = part_name
                    continue
        
        # 수량, 단가, 금액 라인 찾기
        if line and any(char.isdigit() for char in line):
            # 쉼표 포함 숫자 추출
            numbers = re.findall(r'(\d{1,3}(?:,\d{3})*)', line)
            
            if len(numbers) == 3:
                try:
                    quantity = int(numbers[0].replace(',', ''))
                    unit_price = int(numbers[1].replace(',', ''))
                    total_price = int(numbers[2].replace(',', ''))
                except ValueError:
                    pass
                break
            elif len(numbers) == 2:
                try:
                    quantity = 1
                    unit_price = int(numbers[0].replace(',', ''))
                    total_price = int(numbers[1].replace(',', ''))
                except ValueError:
                    pass
                break
            elif len(numbers) == 1:
                try:
                    quantity = 1
                    unit_price = int(numbers[0].replace(',', ''))
                    total_price = int(numbers[0].replace(',', ''))
                except ValueError:
                    pass
                break
    
    # part_list 테이블에서 매칭 정보 조회
    part_info = match_part_with_database(part_number)
    
    # 다음 라인들에서 정보 추출
    part_name = ''
    quantity = 1
    unit_price = 0
    total_price = 0
    
    # 다음 10라인까지 확인하며 정보 추출
    for i in range(start_idx + 1, min(start_idx + 11, len(lines))):
        line = lines[i].strip()
        
        # 다음 순번+부품번호 시작이나 섹션 종료 키워드를 만나면 중단
        if re.match(r'^\d+\s+[A-Z][A-Z0-9\-]+$', line):
            break
        if re.match(r'^\d+\|[A-Z][A-Z0-9\-]+$', line):
            break
        if any(keyword in line for keyword in ['합계', '총액', '기술료', '공임', 'TOTAL', 'SUM']):
            break
        
        # 부품명 라인 찾기
        if line and not any(keyword in line for keyword in ['연락처', '부품번호', '부품명', '수량', '단가', '금액']):
            # | 기호로 시작하는 라인은 부품명
            if line.startswith('|'):
                clean_name = line[1:].strip()  # | 제거
                clean_name = re.sub(r'\s+', ' ', clean_name)  # 공백 정리
                if clean_name and len(clean_name) > 1:
                    part_name = clean_name
                    continue
            
            # 숫자가 없는 라인은 부품명
            if not any(char.isdigit() for char in line):
                clean_name = re.sub(r'[|\s]', '', line).strip()
                clean_name = re.sub(r'\s+', ' ', clean_name)
                if clean_name and len(clean_name) > 1:
                    part_name = part_name
                    continue
        
        # 수량, 단가, 금액 라인 찾기
        if line and any(char.isdigit() for char in line):
            # 쉼표 포함 숫자 추출
            numbers = re.findall(r'(\d{1,3}(?:,\d{3})*)', line)
            
            if len(numbers) == 3:
                try:
                    quantity = int(numbers[0].replace(',', ''))
                    unit_price = int(numbers[1].replace(',', ''))
                    total_price = int(numbers[2].replace(',', ''))
                except ValueError:
                    pass
                break
            elif len(numbers) == 2:
                try:
                    quantity = 1
                    unit_price = int(numbers[0].replace(',', ''))
                    total_price = int(numbers[1].replace(',', ''))
                except ValueError:
                    pass
                break
            elif len(numbers) == 1:
                try:
                    quantity = 1
                    unit_price = int(numbers[0].replace(',', ''))
                    total_price = int(numbers[0].replace(',', ''))
                except ValueError:
                    pass
                break
    
    # 유효성 검사
    if not part_name.strip() or total_price == 0:
        return None
    
    # 기본 정보 반환 (part_list 매칭 정보 우선)
    result = {
        'part_number': part_number,
        'part_name': part_name.strip(),
        'quantity': quantity,
        'unit_price': unit_price,
        'total_price': total_price
    }
    
    # part_list 매칭 정보 추가 (OCR 데이터보다 우선)
    if part_info:
        result.update({
            'part_id': part_info['part_id'],
            'part_name': part_info['part_name'],  # 표준 부품명으로 덮어쓰기
            'matched_part_name': part_info['part_name'],
            'base_price': part_info['base_price'],
            'base_labor': part_info.get('base_labor', 0),
            'system_group': part_info.get('system_group', ''),
            # OCR 가격 대신 표준 가격 사용
            'unit_price': part_info['base_price'],
            'total_price': part_info['base_price'] * quantity,
            'ocr_total_price': total_price  # OCR 가격은 백업으로 저장
        })
        print(f"[DEBUG] 부품 매칭 성공: {part_number} -> {part_info['part_name']}")
        print(f"[DEBUG] 표준 가격 적용: {part_info['base_price']:,}원 (OCR: {total_price:,}원)")
    else:
        print(f"[DEBUG] 부품 매칭 실패: {part_number} (OCR 데이터 사용)")
    
    return result


def match_part_with_database(part_number: str) -> Optional[Dict]:
    """
    부품번호를 part_list 테이블과 매칭
    
    Args:
        part_number: OCR에서 추출된 부품번호
    
    Returns:
        매칭된 부품 정보 또는 None
    """
    try:
        conn = get_db_connection()
        if not conn:
            return None
        
        with conn.cursor() as cursor:
            # part_list 테이블에 데이터가 있는지 먼저 확인
            cursor.execute("SELECT COUNT(*) as count FROM part_list")
            count_result = cursor.fetchone()
            
            if count_result and count_result['count'] == 0:
                # part_list가 비어있으면 매칭 시도하지 않음
                return None
            
            # 정확한 매칭 시도
            cursor.execute("""
                SELECT part_id, part_number, part_name, base_price, base_labor, system_group
                FROM part_list 
                WHERE part_number = %s
                LIMIT 1
            """, (part_number,))
            
            result = cursor.fetchone()
            
            # 정확한 매칭이 없으면 유사한 부품번호 검색
            if not result:
                # 부품번호 형식 정규화 (숫자 부분 제거)
                normalized_part = re.sub(r'\d+', '', part_number)
                cursor.execute("""
                    SELECT part_id, part_number, part_name, base_price, base_labor, system_group
                    FROM part_list 
                    WHERE part_number LIKE %s
                    LIMIT 1
                """, (f"{normalized_part}%",))
                
                result = cursor.fetchone()
            
        return result
        
    except Exception as e:
        print(f"부품 매칭 오류 ({part_number}): {e}")
        return None
    finally:
        if 'conn' in locals():
            conn.close()


def parse_maintenance_details_enhanced(ocr_text: str) -> List[Dict]:
    """
    강화된 OCR 텍스트 파싱 - 부품번호만 있어도 저장 가능
    
    Args:
        ocr_text: Google Vision API로 추출한 전체 텍스트
    
    Returns:
        부품 정보 목록
    """
    details = []
    
    # 모든 부품번호 패턴 검색
    patterns = [
        r'\d+\|[A-Z][A-Z0-9\-]+',      # 1|DD-C-TM-0175
        r'\d+\s+[A-Z][A-Z0-9\-]+',      # 3 DD-C-CM-0060
        r'\d+[A-Z]+-[A-Z]-\d{4}',        # 1DD-I-EL-0028
        r'[A-Z]{2}-[A-Z]-\d{4}',         # DD-I-HY-0199
        r'[A-Z]{2}-[A-Z]-\d{4}',         # DD-C-TM-0175
        r'[A-Z0-9]{8,12}'                # 기타 부품번호 형식
    ]
    
    found_parts = set()
    
    # 모든 패턴으로 부품번호 검색
    for pattern in patterns:
        matches = re.findall(pattern, ocr_text)
        for match in matches:
            # 분리된 부품번호 합치기 처리
            if '|' in match:
                # 1 DD-C-TM-0175 형태를 DD-C-TM-0175로 변환
                parts = match.split('|')
                if len(parts) == 2 and parts[1].strip():
                    combined = parts[1].strip()
                    if len(combined) >= 8:
                        found_parts.add(combined)
            elif ' ' in match and not match.startswith('INV') and not match.startswith('VAT'):
                # 3 DD-C-CM-0060 형태를 DD-C-CM-0060으로 변환
                parts = match.split()
                if len(parts) == 2 and parts[1].strip():
                    combined = parts[1].strip()
                    if len(combined) >= 8:
                        found_parts.add(combined)
            elif re.match(r'^\d+\s*[A-Z]{2}-[A-Z]-\d{4}$', match):
                # 1DD-C-TM-0175 또는 1 DD-C-TM-0175 형태를 DD-C-TM-0175로 변환
                part_number = re.sub(r'^\d+\s*', '', match)
                if len(part_number) >= 8:
                    found_parts.add(part_number)
            else:
                # 기대번호, 발행번호, 연락처 등 필터링
                # DC로 시작하는 경우는 기대번호 (예: DC0001240001)
                # INV로 시작하는 경우는 발행번호 (예: INV-26-08)
                # XXX로 시작하는 경우는 연락처 (예: XXXX-XXXX)
                # VAT는 세액
                # 8자 미만은 너무 짧음
                if not (match.startswith('DC') and len(match) > 10 and match[2:4].isdigit()):
                    if not match.startswith('INV'):
                        if not match.startswith('XXX'):
                            if not match.startswith('VAT'):
                                if len(match) >= 8:  # 최소 8자 이상
                                    found_parts.add(match)
    
    # 각 부품번호에 대해 part_list 매칭 및 정보 저장
    for part_number in found_parts:
        part_info = match_part_with_database(part_number)
        
        if part_info:
            detail = {
                'part_number': part_number,
                'part_name': part_info['part_name'],
                'quantity': 1,  # 기본값
                'unit_price': part_info['base_price'],
                'total_price': part_info['base_price'],
                'part_id': part_info['part_id'],
                'matched_part_name': part_info['part_name'],
                'base_price': part_info['base_price'],
                'base_labor': part_info.get('base_labor', 0),
                'system_group': part_info.get('system_group', ''),
                'ocr_total_price': 0  # OCR 가격 정보 없음
            }
            details.append(detail)
            print(f"[DEBUG] 부품번호만으로 추출 성공: {part_number} -> {part_info['part_name']}")
        else:
            print(f"[DEBUG] 부품번호 매칭 실패: {part_number}")
    
    print(f"부품번호만으로 총 {len(details)}개의 부품 정보 추출됨")
    return details
    """
    부품번호를 part_list 테이블과 매칭
    
    Args:
        part_number: OCR에서 추출된 부품번호
    
    Returns:
        매칭된 부품 정보 또는 None
    """
    try:
        conn = get_db_connection()
        if not conn:
            return None
        
        with conn.cursor() as cursor:
            # 정확한 매칭 시도
            cursor.execute("""
                SELECT part_id, part_number, part_name, base_price, base_labor, system_group
                FROM part_list 
                WHERE part_number = %s
                LIMIT 1
            """, (part_number,))
            
            result = cursor.fetchone()
            
            # 정확한 매칭이 없으면 유사한 부품번호 검색
            if not result:
                # 부품번호 형식 정규화 (숫자 부분 제거)
                normalized_part = re.sub(r'\d+', '', part_number)
                cursor.execute("""
                    SELECT part_id, part_number, part_name, base_price, base_labor, system_group
                    FROM part_list 
                    WHERE part_number LIKE %s
                    LIMIT 1
                """, (f"{normalized_part}%",))
                
                result = cursor.fetchone()
            
        return result
        
    except Exception as e:
        print(f"부품 매칭 오류 ({part_number}): {e}")
        return None
    finally:
        if 'conn' in locals():
            conn.close()


def extract_total_cost(ocr_text: str) -> Optional[int]:
    """
    OCR 텍스트에서 최종 합계 금액 추출
    
    Args:
        ocr_text: OCR 텍스트
    
    Returns:
        최종 합계 금액 (정수)
    """
    lines = ocr_text.split('\n')
    
    for line in lines:
        line = line.strip()
        
        # "최종 합계", "총 합계", "합계" 등의 키워드 찾기
        if '최종' in line and '합계' in line:
            # 금액 추출
            amounts = re.findall(r'(\d{1,3}(?:,\d{3})*)', line)
            if amounts:
                try:
                    return int(amounts[-1].replace(',', ''))
                except ValueError:
                    pass
        
        if '총' in line and ('합계' in line or '금액' in line):
            amounts = re.findall(r'(\d{1,3}(?:,\d{3})*)', line)
            if amounts:
                try:
                    return int(amounts[-1].replace(',', ''))
                except ValueError:
                    pass
    
    return None


def extract_service_date(ocr_text: str) -> Optional[str]:
    """
    OCR 텍스트에서 작업 날짜 추출
    
    Args:
        ocr_text: OCR 텍스트
    
    Returns:
        날짜 문자열 (YYYY-MM-DD 형식)
    """
    # YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD 형식
    date_match = re.search(r'(\d{4})[-./](\d{2})[-./](\d{2})', ocr_text)
    
    if date_match:
        year, month, day = date_match.groups()
        return f"{year}-{month}-{day}"
    
    return None


def extract_vin(ocr_text: str) -> Optional[str]:
    """
    OCR 텍스트에서 기대번호 추출
    
    Args:
        ocr_text: OCR 텍스트
    
    Returns:
        기대번호 (대문자)
    """
    # 기대번호 패턴: 영문2자 + 영숫자 + 숫자6자
    vin_match = re.search(r'[A-Z]{2}[A-Z0-9]{4,}\d{6}', ocr_text, re.IGNORECASE)
    
    if vin_match:
        return vin_match.group().upper()
    
    return None


def extract_working_hours(ocr_text: str) -> Optional[int]:
    """
    OCR 텍스트에서 가동시간 추출
    
    Args:
        ocr_text: Google Vision API로 추출한 전체 텍스트
    
    Returns:
        가동시간 (시간 단위), 추출 실패 시 None
    """
    lines = ocr_text.split('\n')
    
    # 시간 관련 키워드 패턴
    time_patterns = [
        r'(?:가동|사용|기계|운행|작동)(?:시간|타임|hour|time)[:\s]*(\d{1,5})[\s,]*시간',
        r'(\d{1,5})[\s,]*시간',
        r'작업시간[:\s]*(\d{1,5})',
        r'기계시간[:\s]*(\d{1,5})',
        r'운행시간[:\s]*(\d{1,5})',
        r'가동시간[:\s]*(\d{1,5})',
        r'사용시간[:\s]*(\d{1,5})',
        r'hour[:\s]*(\d{1,5})',
        r'time[:\s]*(\d{1,5})',
        r'(\d{1,5})\s*h(?:ours?)?',
        r'(\d{1,5})\s*hrs?',
        r'H[:\s]*(\d{1,5})',
        r'T[:\s]*(\d{1,5})'
    ]
    
    for line in lines:
        line = line.strip()
        # 콤마 제거하여 숫자 추출 개선
        clean_line = line.replace(',', '')
        
        for pattern in time_patterns:
            match = re.search(pattern, clean_line, re.IGNORECASE)
            if match:
                try:
                    hours = int(match.group(1))
                    # 합리적인 범위의 시간만 반환 (1-50000시간)
                    if 1 <= hours <= 50000:
                        return hours
                except (ValueError, IndexError):
                    continue
    
    return None
