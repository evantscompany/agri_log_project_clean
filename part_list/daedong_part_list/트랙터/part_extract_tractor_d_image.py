import pdfplumber
import pandas as pd
import os
import re

def extract_daedong_master(base_path):
    # 1. 저장 경로 설정
    output_base = os.path.join(base_path, "extracted_result")
    os.makedirs(output_base, exist_ok=True)
    
    # 트랙터 폴더 내의 모든 PDF 검색
    pdf_files = [f for f in os.listdir(base_path) if f.endswith('.pdf')]
    
    final_part_list = [] # PART_LIST 테이블용 데이터
    
    for pdf_file in pdf_files:
        # 파일명에서 모델명 추출 (예: L3503_부품목록_한글판.pdf -> L3503)
        model_identifier = pdf_file.split('_')[0]
        model_output_dir = os.path.join(output_base, model_identifier)
        image_dir = os.path.join(model_output_dir, "images")
        os.makedirs(image_dir, exist_ok=True)
        
        pdf_path = os.path.join(base_path, pdf_file)
        print(f"[{model_identifier}] 처리 시작...")
        
        with pdfplumber.open(pdf_path) as pdf:
            # 1페이지(표지)나 목차 이후 실제 본문부터 시작 (대동은 보통 5~7p 이후)
            for i in range(4, len(pdf.pages) - 1):
                page = pdf.pages[i]
                next_page = pdf.pages[i+1]
                
                # 다음 페이지에서 표(Table) 추출 시도
                table = next_page.extract_table()
                
                if table and len(table) > 1: # 표 데이터가 있는 경우
                    # 1. 그룹명(System Group) 추출 - 페이지 상단 타이틀
                    page_text = next_page.extract_text() or ""
                    # 보통 첫 줄이 '실린더헤드그룹' 같은 카테고리임
                    system_group = page_text.split('\n')[0].strip()
                    
                    # 2. 도면 이미지 추출 (현재 페이지)
                    # DB의 PART_LIST와 연결하기 위해 파일명 규칙 생성
                    clean_group_name = re.sub(r'[\\/*?:"<>|]', "", system_group).replace(" ", "_")
                    img_filename = f"{model_identifier}_{i+1}_{clean_group_name}.png"
                    img_path = os.path.join(image_dir, img_filename)
                    
                    # 도면 캡처 (해상도 150정도면 OCR과 웹 출력에 적당합니다)
                    try:
                        page.to_image(resolution=150).save(img_path)
                    except:
                        img_filename = "IMAGE_NOT_FOUND"

                    # 3. 표 데이터 정제 (ERD 컬럼에 맞춤)
                    for row in table[1:]: # 헤더 제외
                        # 부품번호(Part Number)가 있는 행만 수집
                        if len(row) >= 2 and row[1] and len(row[1]) > 5:
                            final_part_list.append({
                                'model_identifier': model_identifier, # MACHINE_MASTER 연결용
                                'system_group': system_group,         # 대분류/소분류
                                'item_no': row[0].strip() if row[0] else "",
                                'part_number': row[1].replace(" ", ""), # 공백제거 중요
                                'part_name_kr': row[2].strip() if len(row) > 2 else "",
                                'part_name_en': row[3].strip() if len(row) > 3 else "",
                                'qty': row[4].strip() if len(row) > 4 else "0",
                                'drawing_path': img_filename          # 추가 제안했던 이미지 경로
                            })
                    # 리스트 페이지를 처리했으므로 다음 반복에서 다음 세트로 점프
                    # (도면-표-도면-표 순서 대응)
                    # i += 1 

    # 2. CSV 결과 저장 (utf-8-sig로 해야 엑셀에서 한글 안 깨집니다)
    df_part_list = pd.DataFrame(final_part_list)
    csv_path = os.path.join(output_base, "TOTAL_PART_LIST.csv")
    df_part_list.to_csv(csv_path, index=False, encoding='utf-8-sig')
    
    print(f"--- 추출 완료 ---")
    print(f"총 추출 부품 수: {len(df_part_list)}개")
    print(f"결과 저장 경로: {csv_path}")

# 형님의 실제 경로로 설정
tractor_path = r"C:\Users\msm03\Desktop\농기계 데이터 이력관리 플랫폼\agri_log_project\part_list\daedong_part_list\트랙터"
extract_daedong_master(tractor_path)