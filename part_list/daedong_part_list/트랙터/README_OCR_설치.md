# OCR 기반 PDF 파싱 설치 가이드

## 📋 필요한 패키지 설치

### 1. Python 패키지 설치
```bash
pip install pdf2image pytesseract pillow
```

### 2. Tesseract OCR 설치 (Windows)

#### 다운로드:
https://github.com/UB-Mannheim/tesseract/wiki

**추천 버전:** `tesseract-ocr-w64-setup-5.3.3.20231005.exe`

#### 설치 경로:
```
C:\Program Files\Tesseract-OCR\
```

#### 설치 시 주의사항:
- ✅ **Additional language data** 선택 시 **Korean (kor)** 체크 필수!
- ✅ 기본 경로로 설치 권장

### 3. Poppler 설치 (Windows)

#### 다운로드:
https://github.com/oschwartz10612/poppler-windows/releases/

**최신 버전 다운로드:** `Release-XX.XX.X-0.zip`

#### 설치 방법:
1. 다운로드한 ZIP 파일 압축 해제 (예: `C:\poppler\`)
2. 압축 해제 후 `poppler-xx.xx.x/Library/bin` 폴더 확인

**스크립트 설정 (필수):**
```python
# part_data_extract_hybrid_ocr.py 파일 수정
POPPLER_PATH = r'C:\poppler\Library\bin'  # 실제 설치 경로로 변경
```

**또는 시스템 PATH에 추가:**
1. 시스템 환경 변수 편집
2. Path 변수에 `C:\poppler\Library\bin` 추가
3. 컴퓨터 재시작

---

## 🚀 사용 방법

### 기본 실행:
```bash
cd "C:\Users\msm03\Desktop\농기계 데이터 이력관리 플랫폼\agri_log_project\part_list\daedong_part_list\트랙터"
python part_data_extract_hybrid_ocr.py
```

### 작동 방식:
1. **텍스트 기반 PDF**: 기존 방식으로 빠르게 추출
2. **이미지 기반 PDF**: OCR로 자동 전환하여 추출
3. **실패한 파일**: `추출 안되는 파트_OCR실패` 폴더로 이동

---

## ⚙️ 스크립트 수정 (필요시)

### Tesseract 경로가 다른 경우:
```python
# part_data_extract_hybrid_ocr.py 파일 수정
pytesseract.pytesseract.tesseract_cmd = r'C:\YOUR\PATH\tesseract.exe'
```

### OCR 언어 변경:
```python
# 한글만
text = pytesseract.image_to_string(images[0], lang='kor')

# 영어만
text = pytesseract.image_to_string(images[0], lang='eng')

# 한글+영어 (기본)
text = pytesseract.image_to_string(images[0], lang='kor+eng')
```

### DPI 조정 (품질 vs 속도):
```python
# 고품질 (느림)
images = convert_from_path(pdf_path, dpi=400)

# 기본 (권장)
images = convert_from_path(pdf_path, dpi=300)

# 빠른 처리 (낮은 품질)
images = convert_from_path(pdf_path, dpi=200)
```

---

## 📊 예상 처리 시간

| PDF 유형 | 페이지당 시간 | 비고 |
|---------|-------------|------|
| 텍스트 기반 | ~0.5초 | 기존 방식 |
| 이미지 기반 (OCR) | ~3-5초 | DPI 300 기준 |

**15개 실패 파일 예상 시간:** 약 10-30분

---

## 🔍 문제 해결

### "tesseract is not installed" 오류:
- Tesseract 설치 확인
- 경로 설정 확인

### "Unable to get page count" 오류:
- Poppler 설치 확인
- PATH 환경변수 확인

### OCR 결과가 부정확한 경우:
- DPI를 400으로 상향
- 한글 언어팩 설치 확인

---

## 📝 출력 파일

- **개별 CSV**: `extracted_result/temp_partials/{모델명}_partial.csv`
- **통합 CSV**: `extracted_result/DAEDONG_TOTAL_PART_LIST_HYBRID_OCR.csv`
- **실패 파일**: `추출 안되는 파트_OCR실패/` 폴더
