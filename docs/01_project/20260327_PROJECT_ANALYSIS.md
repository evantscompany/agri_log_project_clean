# 농기계 데이터 이력관리 플랫폼 - 전체 프로젝트 분석 보고서

## 📊 1. 데이터베이스 구조 분석

### 주요 테이블 (8개)

#### 1.1 마스터 테이블
- **MANUFACTURER_CODES**: 제조사 코드 (대동, TYM 등)
- **CATEGORY_CODES**: 기종 코드 (트랙터, 이앙기, 콤바인)
- **MACHINE_MASTER**: 농기계 모델 마스터 정보

#### 1.2 인스턴스 테이블
- **MACHINE_INSTANCE**: 개별 농기계 정보 (VIN, 가동시간, 생산연도)

#### 1.3 정비 이력 테이블
- **MAINTENANCE_LOG**: 정비 이력 메인 (log_id, vin, service_date, total_cost, ai_summary)
- **MAINTENANCE_DETAIL**: 정비 상세 (detail_id, log_id, part_id, item_name, quantity, part_cost)
- **MAINTENANCE_ATTACHMENT**: 정비 첨부파일 (영수증 이미지, OCR 결과)

#### 1.4 부품 관리 테이블
- **PART_LIST**: 부품 정보 (part_id, part_number, part_name, system_group, base_price)

### 데이터 흐름
```
MACHINE_INSTANCE → MAINTENANCE_LOG → MAINTENANCE_DETAIL
                                    ↓
                            MAINTENANCE_ATTACHMENT
                                    ↓
                                PART_LIST (FK)
```

---

## 🔌 2. 백엔드 API 엔드포인트 분석

### 2.1 Machine API (`/api/v1/machines`)
| 메서드 | 엔드포인트 | 기능 | 상태 |
|--------|-----------|------|------|
| GET | `/all-machines` | 모든 농기계 목록 (삭제 포함) | ✅ |
| GET | `/` | 등록된 농기계 목록 | ✅ |
| GET | `/{vin}` | 농기계 상세 정보 | ✅ |
| GET | `/parse-vin/{vin}` | VIN 파싱 | ✅ |
| POST | `/register` | 농기계 등록 | ✅ |
| DELETE | `/{vin}` | 농기계 소프트 삭제 | ✅ |
| GET | `/{vin}/qr-code` | QR 코드 생성 | ✅ |
| GET | `/qr-codes/all` | 모든 QR 코드 목록 | ✅ |
| GET | `/qr-codes/{vin}` | QR 스캔으로 농기계 조회 | ✅ |

### 2.2 Maintenance API (`/api/v1/maintenance`)
| 메서드 | 엔드포인트 | 기능 | 상태 |
|--------|-----------|------|------|
| POST | `/log` | 정비 기록 저장 | ✅ |
| PUT | `/log/{log_id}` | 정비 기록 수정 | ✅ |
| GET | `/machine/{vin}` | 농기계별 정비 이력 조회 | ✅ |
| GET | `/log/{log_id}/details` | 정비 상세 정보 조회 | ✅ |
| GET | `/parts/search` | 부품 검색 | ⚠️ 중복 |
| GET | `/parts/number/{part_number}` | 부품번호로 조회 | ⚠️ 중복 |
| POST | `/parts/create-sample` | 샘플 부품 생성 | ⚠️ 중복 |

### 2.3 OCR API (`/api/v1/ocr`)
| 메서드 | 엔드포인트 | 기능 | 상태 |
|--------|-----------|------|------|
| POST | `/upload-image` | 이미지 업로드 | ✅ |
| POST | `/process-ocr` | OCR 처리 및 저장 | ✅ |
| POST | `/google-vision-ocr` | Google Vision OCR | ✅ |
| GET | `/attachments/{log_id}` | 첨부파일 목록 조회 | ✅ |

### 2.4 Parts API (`/api/v1/parts`)
| 메서드 | 엔드포인트 | 기능 | 상태 |
|--------|-----------|------|------|
| GET | `/search` | 부품 검색 | ✅ |
| GET | `/categories` | 부품 카테고리 목록 | ✅ |
| GET | `/popular` | 인기 부품 목록 | ✅ |
| GET | `/{part_id}` | 부품 상세 정보 | ✅ |

### 2.5 AI Expert API (`/api/v1/ai-expert`)
| 메서드 | 엔드포인트 | 기능 | 상태 |
|--------|-----------|------|------|
| POST | `/advice` | 정비사 AI 소견 | ✅ |
| POST | `/consultation` | 고객 상담 조언 | ✅ |
| GET | `/analysis/{vin}` | 정비 이력 분석 | ✅ |
| GET | `/parts-recommendation/{vin}` | 부품 교체 추천 | ✅ |
| GET | `/health` | AI 서비스 상태 확인 | ✅ |

### 2.6 Price Prediction API (`/api/v1/price-prediction`)
| 메서드 | 엔드포인트 | 기능 | 상태 |
|--------|-----------|------|------|
| POST | `/predict` | 중고 가격 예측 | ✅ |
| GET | `/model-status` | 모델 상태 확인 | ✅ |

### 2.7 History API (`/api/v1/maintenance`)
| 메서드 | 엔드포인트 | 기능 | 상태 |
|--------|-----------|------|------|
| GET | `/machine/{vin}` | 정비 이력 조회 | ⚠️ 중복 |
| POST | `/` | 정비 기록 생성 | ⚠️ 중복 |
| PUT | `/{record_id}` | 정비 기록 수정 | ⚠️ 중복 |
| DELETE | `/{record_id}` | 정비 기록 삭제 | ✅ |

---

## 🎨 3. 프론트엔드 페이지 분석

### 3.1 트랙터 소유자 탭
| 페이지 | 파일명 | 기능 | 상태 |
|--------|--------|------|------|
| 대시보드 | `Dashboard.jsx` | 농기계 목록, 통계 | ✅ |
| 농기계 상세 | `MachineDetail.jsx` | 정비 이력, 부품 정보 | ✅ |
| 농기계 추가 | `AddMachine.jsx` | 새 농기계 등록 | ✅ |
| 정비 기록 추가 | `AddRecord.jsx` | 정비 이력 수동 입력 | ✅ |
| 가격 예측 | `MachinePricePrediction.jsx` | 중고 가격 예측 | ✅ |
| OCR 스캐너 | `OCRScanner.jsx` | 영수증 스캔 | ✅ |

### 3.2 정비업체 탭
| 페이지 | 파일명 | 기능 | 상태 |
|--------|--------|------|------|
| 정비사 대시보드 | `MechanicDashboard.jsx` | 농기계 목록, QR 스캔 | ✅ |
| 농기계 상세 | `MechanicMachineDetail.jsx` | OCR 스캔, 부품 매칭, AI 소견, 챗봇 | ✅ |
| QR 스캔 | `MechanicQRScan.jsx` | QR 코드 스캔 | ✅ |
| 정비 입력 | `MechanicServiceEntry.jsx` | 정비 내역 입력 | ✅ |

### 3.3 백업 파일 (삭제 대상)
- `MechanicDashboard_backup.jsx` ❌
- `MechanicMachineDetail_backup.jsx` ❌
- `MechanicQRScan_backup.jsx` ❌
- `Splash_check.txt` ❌

---

## ⚠️ 4. 발견된 문제점

### 4.1 중복 코드
1. **maintenance.py**: 부품 검색 API가 2번 중복 정의됨 (라인 60-98, 207-245)
2. **maintenance.py**: 부품번호 조회 API가 2번 중복 정의됨 (라인 102-126, 249-273)
3. **maintenance.py**: 샘플 부품 생성 API가 2번 중복 정의됨 (라인 130-184, 277-331)
4. **history.py vs maintenance.py**: 정비 이력 조회 API 중복 (`/api/v1/maintenance/machine/{vin}`)

### 4.2 백업 파일
- 프론트엔드에 3개의 `_backup.jsx` 파일 존재
- 불필요한 텍스트 파일 (`Splash_check.txt`)

### 4.3 API 라우터 충돌
- `history.py`와 `maintenance.py` 모두 `/api/v1/maintenance` prefix 사용
- 동일한 엔드포인트가 두 파일에 정의되어 있어 충돌 가능성

---

## ✅ 5. 정상 작동 확인 필요 사항

### 5.1 트랙터 소유자 탭
- [ ] 농기계 등록 기능
- [ ] 정비 이력 조회
- [ ] 정비명세서 업로드 (OCR)
- [ ] 중고 가격 예측

### 5.2 정비업체 탭
- [ ] QR 코드 스캔
- [ ] 정비명세서 OCR 스캔
- [ ] 부품 자동 매칭
- [ ] 정비 기록 저장
- [ ] AI 정비 소견 생성
- [ ] 챗봇 기능 (OpenAI API)

### 5.3 데이터베이스 연동
- [ ] machine_instance 테이블 CRUD
- [ ] maintenance_log 테이블 CRUD
- [ ] maintenance_detail 테이블 CRUD
- [ ] part_list 테이블 조회
- [ ] 가동시간 자동 업데이트

---

## 🔧 6. 권장 수정 사항

### 6.1 즉시 수정 필요
1. **maintenance.py 중복 코드 제거** (라인 187-331 삭제)
2. **history.py 제거 또는 통합** (maintenance.py와 기능 중복)
3. **백업 파일 삭제** (4개 파일)

### 6.2 개선 권장
1. **API 라우터 구조 정리**
   - `history.py` → `maintenance.py`로 통합
   - 부품 관련 API는 `parts.py`로 이동
   
2. **에러 처리 강화**
   - DB 연결 실패 시 재시도 로직
   - OCR 실패 시 fallback 처리
   
3. **로깅 추가**
   - 정비 기록 저장 시 로그
   - API 호출 추적

---

## 📝 7. 다음 단계

1. ✅ DB 구조 분석 완료
2. ✅ API 엔드포인트 목록 작성 완료
3. ⏳ 중복 코드 제거 진행 중
4. ⏳ 백업 파일 삭제 진행 중
5. ⏳ API 통합 테스트 예정
6. ⏳ 프론트엔드-백엔드 연동 검증 예정

---

**분석 완료 시각**: 2026-03-16 16:58
**분석자**: Cascade AI Assistant
