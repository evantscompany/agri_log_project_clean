import pdfplumber
import pandas as pd
import os
import gc
import re
import shutil
from multiprocessing import Process, Queue
from pdf2image import convert_from_path
import pytesseract
from PIL import Image

# Tesseract 경로 설정 (Windows 기준)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Poppler 경로 설정 (Windows 기준) - 설치된 경로로 수정 필요
POPPLER_PATH = r'"C:\Users\msm03\Downloads\Release-25.12.0-0\poppler-25.12.0\Library\bin"'  # 실제 설치 경로로 변경하세요

def extract_text_with_ocr(pdf_path, page_num):
    """이미지 기반 PDF를 OCR로 텍스트 추출"""
    try:
        # PDF를 이미지로 변환 (특정 페이지만)
        images = convert_from_path(
            pdf_path, 
            first_page=page_num + 1, 
            last_page=page_num + 1,
            dpi=300,  # 고해상도로 변환
            poppler_path=POPPLER_PATH
        )
        
        if not images:
            return None
            
        # OCR 수행 (한글 + 영어)
        text = pytesseract.image_to_string(
            images[0], 
            lang='kor+eng',
            config='--psm 6'  # 단일 블록 텍스트로 가정
        )
        
        return text
    except Exception as e:
        print(f"OCR 오류: {e}")
        return None

def parse_text_to_parts(text, model_identifier, page_no):
    """텍스트를 파싱하여 부품 정보 추출"""
    if not text:
        return []
    
    parts = []
    part_pattern = re.compile(r'[A-Z0-9]{2,5}-[A-Z]{1,2}[0-9]{3,8}|[A-Z0-9]{2,5}-G[0-9]{5,8}|[A-Z0-9]{7,15}')
    
    # 시스템 그룹명 추출
    lines = text.split('\n')
    system_group = "UNKNOWN"
    for line in lines[:10]:
        clean_l = line.strip()
        if clean_l and not clean_l.isdigit() and len(clean_l) > 2 and '부품' not in clean_l:
            system_group = clean_l
            break
    
    # 각 라인 파싱
    for line in lines:
        line = line.replace('"', '').replace(',', '').strip()
        if not line or len(line) < 10:
            continue
            
        match = part_pattern.search(line)
        if match:
            part_no = match.group().replace(" ", "")
            
            # 유효성 검증
            if len(part_no.replace("-", "")) < 6 or not any(c.isdigit() for c in part_no):
                continue
            
            # 부품번호 기준으로 분리
            parts_split = line.split(match.group())
            pre_text = parts_split[0].strip().split()
            post_text = parts_split[1].strip().split() if len(parts_split) > 1 else []
            
            # 아이템 번호
            item_no = ""
            if pre_text and pre_text[-1].isdigit():
                item_no = pre_text[-1]
            
            # 부품명
            candidate_name = []
            for word in pre_text:
                if not word.isdigit() and word != item_no:
                    candidate_name.append(word)
            for word in post_text:
                if not word.isdigit():
                    candidate_name.append(word)
            part_name = " ".join(candidate_name)
            
            # 수량
            qty = "1"
            if post_text and post_text[-1].isdigit():
                qty = post_text[-1]
            
            parts.append({
                'model_identifier': model_identifier,
                'system_group': system_group,
                'item_no': item_no,
                'part_number': part_no,
                'part_name_kr': part_name.strip(),
                'qty': qty,
                'page_no': page_no
            })
    
    return parts

def worker_extract_hybrid(pdf_path, model_identifier, queue):
    """하이브리드 추출: 텍스트 기반 우선, 실패 시 OCR"""
    try:
        file_part_list = []
        part_pattern = re.compile(r'[A-Z0-9]{2,5}-[A-Z]{1,2}[0-9]{3,8}|[A-Z0-9]{2,5}-G[0-9]{5,8}|[A-Z0-9]{7,15}|[A-Z0-9]{2,5}-$|^-G[0-9]+|^-E[0-9]+')
        
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                # 먼저 텍스트 기반 추출 시도
                page_text = page.extract_text()
                
                # 텍스트가 없거나 매우 적으면 OCR 사용
                if not page_text or len(page_text.strip()) < 50:
                    print(f"  [OCR 모드] 페이지 {i+1}", end="", flush=True)
                    ocr_text = extract_text_with_ocr(pdf_path, i)
                    if ocr_text:
                        parts = parse_text_to_parts(ocr_text, model_identifier, i + 1)
                        file_part_list.extend(parts)
                        print(f" -> {len(parts)}건", flush=True)
                    else:
                        print(" -> 실패", flush=True)
                    continue
                
                # 텍스트 기반 파싱 (기존 로직)
                width, height = page.width, page.height
                regions = [(0, 0, width / 2, height), (width / 2, 0, width, height)]
                
                page_text_lines = page_text.replace('"', '').split('\n')
                system_group = "UNKNOWN"
                for line in page_text_lines[:7]:
                    clean_l = line.strip()
                    if clean_l and not clean_l.isdigit() and len(clean_l) > 2:
                        system_group = clean_l
                        break
                
                for region in regions:
                    crop = page.within_bbox(region)
                    words = crop.extract_words(x_tolerance=6, y_tolerance=3)
                    if not words: continue
                    
                    lines = {}
                    for word in words:
                        y_key = round(word['top'] / 5) * 5
                        if y_key not in lines: lines[y_key] = []
                        lines[y_key].append(word)
                    
                    sorted_y = sorted(lines.keys())
                    for idx, y in enumerate(sorted_y):
                        line_words = sorted(lines[y], key=lambda x: x['x0'])
                        full_line = " ".join([w['text'] for w in line_words]).replace('"', '').replace(',', '')
                        
                        match = part_pattern.search(full_line)
                        if match:
                            part_no = match.group()
                            
                            if part_no.endswith('-') and idx + 1 < len(sorted_y):
                                next_words = sorted(lines[sorted_y[idx+1]], key=lambda x: x['x0'])
                                next_text = " ".join([w['text'] for w in next_words])
                                if next_text.startswith('G') or next_text.startswith('E') or next_text.startswith('-G') or next_text.startswith('-E'):
                                    part_no += next_text.split()[0].lstrip('-')
                            
                            clean_part = part_no.replace(" ", "")
                            if len(clean_part.replace("-", "")) < 6 or not any(c.isdigit() for c in clean_part):
                                continue
                            
                            parts_split = full_line.split(match.group())
                            pre_text = parts_split[0].strip().split()
                            post_text = parts_split[1].strip().split()
                            
                            item_no = ""
                            if pre_text:
                                if pre_text[-1].isdigit() or (len(pre_text[-1]) <= 3 and any(c.isdigit() for c in pre_text[-1])):
                                    item_no = pre_text[-1]
                            
                            candidate_name = []
                            for word in pre_text:
                                if not word.isdigit() and word != item_no:
                                    candidate_name.append(word)
                            for word in post_text:
                                if not word.isdigit():
                                    candidate_name.append(word)
                            part_name = " ".join(candidate_name)
                            
                            qty = "1"
                            if post_text and post_text[-1].isdigit():
                                qty = post_text[-1]
                            
                            file_part_list.append({
                                'model_identifier': model_identifier,
                                'system_group': system_group,
                                'item_no': item_no,
                                'part_number': clean_part,
                                'part_name_kr': part_name.strip(),
                                'qty': qty,
                                'page_no': i + 1
                            })
                
                page.flush_cache()
        
        queue.put(file_part_list)
    except Exception as e:
        queue.put(f"ERROR:{e}")

def extract_daedong_hybrid_system(base_path):
    """하이브리드 추출 시스템 (텍스트 + OCR)"""
    output_base = os.path.join(base_path, "extracted_result")
    temp_base = os.path.join(output_base, "temp_partials")
    fail_dir = os.path.join(base_path, "추출 안되는 파트_OCR실패")
    
    os.makedirs(temp_base, exist_ok=True)
    os.makedirs(fail_dir, exist_ok=True)
    
    # "추출 안되는 파트" 폴더에서 PDF 가져오기
    source_fail_dir = os.path.join(base_path, "추출 안되는 파트")
    if os.path.exists(source_fail_dir):
        pdf_files = [f for f in os.listdir(source_fail_dir) if f.endswith('.pdf')]
        print(f"✅ '추출 안되는 파트' 폴더에서 {len(pdf_files)}개 파일 발견 (OCR 모드)")
        pdf_paths = [(os.path.join(source_fail_dir, f), f) for f in pdf_files]
    else:
        pdf_files = [f for f in os.listdir(base_path) if f.endswith('.pdf')]
        print(f"✅ 총 {len(pdf_files)}개 파일 처리")
        pdf_paths = [(os.path.join(base_path, f), f) for f in pdf_files]
    
    for idx, (pdf_path, pdf_file) in enumerate(pdf_paths):
        model_identifier = re.split(r'[_ ]', pdf_file)[0]
        temp_csv_path = os.path.join(temp_base, f"{model_identifier}_partial.csv")
        
        if os.path.exists(temp_csv_path):
            print(f"[{idx+1}/{len(pdf_paths)}] {model_identifier} - 스킵")
            continue
        
        print(f"[{idx+1}/{len(pdf_paths)}] {pdf_file} 분석 중...", flush=True)
        
        result_queue = Queue()
        p = Process(target=worker_extract_hybrid, args=(pdf_path, model_identifier, result_queue))
        p.start()
        p.join(timeout=180)  # OCR은 시간이 오래 걸리므로 3분 타임아웃
        
        if p.is_alive():
            print("▶ 타임아웃")
            p.terminate()
            p.join()
            shutil.copy(pdf_path, os.path.join(fail_dir, pdf_file))
            continue
        
        if not result_queue.empty():
            res = result_queue.get()
            if isinstance(res, list) and len(res) > 0:
                pd.DataFrame(res).to_csv(temp_csv_path, index=False, encoding='utf-8-sig')
                print(f"✅ 성공 ({len(res)}건)")
            else:
                print(f"❌ 실패 (데이터 없음): {res if isinstance(res, str) else ''}")
                shutil.copy(pdf_path, os.path.join(fail_dir, pdf_file))
        else:
            print("❌ 무응답")
            shutil.copy(pdf_path, os.path.join(fail_dir, pdf_file))
        
        gc.collect()
    
    # 최종 병합
    all_temp_files = [os.path.join(temp_base, f) for f in os.listdir(temp_base) if f.endswith('_partial.csv')]
    if all_temp_files:
        combined_df = pd.concat([pd.read_csv(f) for f in all_temp_files], ignore_index=True)
        combined_df.drop_duplicates(['model_identifier', 'part_number'], inplace=True)
        final_file = os.path.join(output_base, "DAEDONG_TOTAL_PART_LIST_HYBRID_OCR.csv")
        combined_df.to_csv(final_file, index=False, encoding='utf-8-sig')
        print(f"\n⭐ 모든 작업 완료! 최종 파일: {final_file}")
        print(f"📊 총 {len(combined_df)}개 부품 추출 완료")

if __name__ == '__main__':
    tractor_path = r"C:\Users\msm03\Desktop\농기계 데이터 이력관리 플랫폼\agri_log_project\part_list\daedong_part_list\트랙터"
    extract_daedong_hybrid_system(tractor_path)
