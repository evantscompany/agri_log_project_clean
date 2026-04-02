import pdfplumber
import pandas as pd
import os
import gc
import re
import shutil
from multiprocessing import Process, Queue

def is_image_based_pdf(pdf_path):
    """PDF가 이미지 기반인지 빠르게 검증 (첫 3페이지 샘플링)"""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # 첫 3페이지만 검사 (빠른 판단)
            pages_to_check = min(3, len(pdf.pages))
            text_found = False
            
            for i in range(pages_to_check):
                page_text = pdf.pages[i].extract_text()
                # 텍스트가 50자 이상 있으면 텍스트 기반 PDF로 판단
                if page_text and len(page_text.strip()) >= 50:
                    text_found = True
                    break
            
            return not text_found  # 텍스트가 없으면 이미지 기반
    except Exception as e:
        print(f"  [검증 오류: {e}]")
        return False  # 오류 시 일단 처리 시도

def worker_extract(pdf_path, model_identifier, queue):
    try:
        file_part_list = []
        # [개선] 모든 대동 부품번호 패턴 수용 (CS240의 S773-E, TB2-GE 패턴 포함)
        part_pattern = re.compile(r'[A-Z0-9]{2,5}-[A-Z]{1,2}[0-9]{3,8}|[A-Z0-9]{2,5}-G[0-9]{5,8}|[A-Z0-9]{7,15}|[A-Z0-9]{2,5}-$|^-G[0-9]+|^-E[0-9]+')

        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                width, height = page.width, page.height
                
                # 2단 레이아웃 분석 (D851 등 대응)
                regions = [(0, 0, width / 2, height), (width / 2, 0, width, height)]

                # 시스템 그룹명(도번명) 추출 - 상단에서 텍스트 노이즈 제거 후 검색
                page_text_lines = (page.extract_text() or "").replace('"', '').split('\n')
                system_group = "UNKNOWN"
                for line in page_text_lines[:7]:
                    clean_l = line.strip()
                    if clean_l and not clean_l.isdigit() and len(clean_l) > 2:
                        system_group = clean_l
                        break

                for region in regions:
                    crop = page.within_bbox(region)
                    # x_tolerance=6으로 단어 결합력 유지
                    words = crop.extract_words(x_tolerance=6, y_tolerance=3)
                    if not words: continue

                    # Y좌표를 5px 단위로 그룹화하여 행(Line) 생성
                    lines = {}
                    for word in words:
                        y_key = round(word['top'] / 5) * 5 
                        if y_key not in lines: lines[y_key] = []
                        lines[y_key].append(word)

                    sorted_y = sorted(lines.keys())
                    for idx, y in enumerate(sorted_y):
                        line_words = sorted(lines[y], key=lambda x: x['x0'])
                        # [개선] 추출 텍스트에서 따옴표, 쉼표 등 노이즈 즉시 제거
                        full_line = " ".join([w['text'] for w in line_words]).replace('"', '').replace(',', '')
                        
                        match = part_pattern.search(full_line)
                        if match:
                            part_no = match.group()
                            
                            # [개선] 멀티라인 결합 로직 강화 (HX1200, CS240 엔진 대응)
                            if part_no.endswith('-') and idx + 1 < len(sorted_y):
                                next_words = sorted(lines[sorted_y[idx+1]], key=lambda x: x['x0'])
                                next_text = " ".join([w['text'] for w in next_words])
                                # G나 E로 시작하는 본번과 결합
                                if next_text.startswith('G') or next_text.startswith('E') or next_text.startswith('-G') or next_text.startswith('-E'):
                                    part_no += next_text.split()[0].lstrip('-')
                            
                            clean_part = part_no.replace(" ", "")
                            # 유효 부품번호 검증 (결합 후 숫자 포함 6자 이상)
                            if len(clean_part.replace("-", "")) < 6 or not any(c.isdigit() for c in clean_part):
                                continue

                            # [개선] 부품번호 위치에 구애받지 않는 데이터 분리 로직
                            parts_split = full_line.split(match.group())
                            pre_text = parts_split[0].strip().split()
                            post_text = parts_split[1].strip().split()

                            # 1. 아이템 번호 (보통 부품번호 바로 앞의 숫자)
                            item_no = ""
                            if pre_text:
                                if pre_text[-1].isdigit() or (len(pre_text[-1]) <= 3 and any(c.isdigit() for c in pre_text[-1])):
                                    item_no = pre_text[-1]

                            # 2. 부품명 (부품번호 앞뒤의 비숫자 텍스트 결합)
                            candidate_name = []
                            for word in pre_text:
                                if not word.isdigit() and word != item_no:
                                    candidate_name.append(word)
                            for word in post_text:
                                if not word.isdigit():
                                    candidate_name.append(word)
                            part_name = " ".join(candidate_name)

                            # 3. 수량 (줄의 끝에 있는 숫자 우선)
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

def extract_daedong_ultimate_system(base_path):
    output_base = os.path.join(base_path, "extracted_result")
    temp_base = os.path.join(output_base, "temp_partials")
    fail_dir = os.path.join(base_path, "추출 안되는 파트")
    
    os.makedirs(temp_base, exist_ok=True)
    os.makedirs(fail_dir, exist_ok=True)
    
    pdf_files = [f for f in os.listdir(base_path) if f.endswith('.pdf')]
    print(f"✅ 총 {len(pdf_files)}개 파일에 대해 'CS240/HX1200 통합 대응 로직'을 적용합니다.")

    for idx, pdf_file in enumerate(pdf_files):
        # 모델명 추출
        model_identifier = re.split(r'[_ ]', pdf_file)[0]
        temp_csv_path = os.path.join(temp_base, f"{model_identifier}_partial.csv")
        
        if os.path.exists(temp_csv_path):
            print(f"[{idx+1}/{len(pdf_files)}] {model_identifier} - 스킵")
            continue

        pdf_path = os.path.join(base_path, pdf_file)
        print(f"[{idx+1}/{len(pdf_files)}] {pdf_file} 검증 중...", end=" ", flush=True)
        
        # 이미지 기반 PDF 조기 감지 (시간 절약)
        if is_image_based_pdf(pdf_path):
            print("❌ 이미지 기반 PDF → 스킵")
            shutil.move(pdf_path, os.path.join(fail_dir, pdf_file))
            continue
        
        print("분석 중...", end=" ", flush=True)
        
        result_queue = Queue()
        p = Process(target=worker_extract, args=(pdf_path, model_identifier, result_queue))
        p.start()
        p.join(timeout=60) # 복잡한 패턴 분석을 위해 타임아웃 60초로 상향
        
        if p.is_alive():
            print("▶ 타임아웃")
            p.terminate()
            p.join()
            shutil.move(pdf_path, os.path.join(fail_dir, pdf_file))
            continue
            
        if not result_queue.empty():
            res = result_queue.get()
            if isinstance(res, list) and len(res) > 0:
                pd.DataFrame(res).to_csv(temp_csv_path, index=False, encoding='utf-8-sig')
                print(f"성공({len(res)}건)")
            else:
                print("실패(데이터 없음)")
                shutil.move(pdf_path, os.path.join(fail_dir, pdf_file))
        else:
            print("무응답")
            shutil.move(pdf_path, os.path.join(fail_dir, pdf_file))
        gc.collect()

    # 최종 병합
    all_temp_files = [os.path.join(temp_base, f) for f in os.listdir(temp_base) if f.endswith('_partial.csv')]
    if all_temp_files:
        combined_df = pd.concat([pd.read_csv(f) for f in all_temp_files], ignore_index=True)
        # 모델별 부품번호 중복 제거
        combined_df.drop_duplicates(['model_identifier', 'part_number'], inplace=True)
        final_file = os.path.join(output_base, "DAEDONG_TOTAL_PART_LIST_V3.csv")
        combined_df.to_csv(final_file, index=False, encoding='utf-8-sig')
        print(f"\n⭐ 모든 작업 완료! 최종 파일: {final_file}")

if __name__ == '__main__':
    # 경로 설정
    tractor_path = r"C:\Users\msm03\Desktop\농기계 데이터 이력관리 플랫폼\agri_log_project\part_list\daedong_part_list\트랙터"
    extract_daedong_ultimate_system(tractor_path)