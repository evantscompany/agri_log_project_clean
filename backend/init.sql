-- 농기계 데이터 이력관리 플랫폼 데이터베이스 초기화 스크립트 (로컬 MySQL과 동일한 구조)



CREATE DATABASE IF NOT EXISTS agrilog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

USE agrilog_db;



-- 1. 제조사 코드 테이블

CREATE TABLE IF NOT EXISTS manufacturer_codes (

    mfg_code CHAR(1) NOT NULL,

    mfg_name VARCHAR(20) NOT NULL,

    PRIMARY KEY (mfg_code)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- 2. 기종 코드 테이블

CREATE TABLE IF NOT EXISTS category_codes (

    cat_code CHAR(1) NOT NULL,

    cat_name VARCHAR(20) NOT NULL,

    PRIMARY KEY (cat_code)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- 3. 농기계 마스터 테이블

CREATE TABLE IF NOT EXISTS machine_master (

    model_id INT NOT NULL AUTO_INCREMENT,

    mfg_code CHAR(1) DEFAULT NULL,

    cat_code CHAR(1) DEFAULT NULL,

    model_identifier VARCHAR(10) DEFAULT NULL,

    base_model_name VARCHAR(50) DEFAULT NULL,

    hp INT DEFAULT NULL,

    PRIMARY KEY (model_id),

    KEY mfg_code (mfg_code),

    KEY cat_code (cat_code),

    CONSTRAINT machine_master_ibfk_1 FOREIGN KEY (mfg_code) REFERENCES manufacturer_codes(mfg_code),

    CONSTRAINT machine_master_ibfk_2 FOREIGN KEY (cat_code) REFERENCES category_codes(cat_code)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- 4. 농기계 인스턴스 테이블

CREATE TABLE IF NOT EXISTS machine_instance (

    vin VARCHAR(50) NOT NULL,

    model_id INT DEFAULT NULL,

    production_year INT DEFAULT NULL,

    total_hours INT DEFAULT 0,

    is_deleted TINYINT(1) DEFAULT 0,

    deleted_at DATETIME DEFAULT NULL,

    PRIMARY KEY (vin),

    KEY model_id (model_id),

    CONSTRAINT machine_instance_ibfk_1 FOREIGN KEY (model_id) REFERENCES machine_master(model_id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- 5. 정비 이력 테이블

CREATE TABLE IF NOT EXISTS maintenance_log (

    log_id INT NOT NULL AUTO_INCREMENT,

    vin VARCHAR(50) DEFAULT NULL,

    service_date DATE DEFAULT NULL,

    total_cost INT DEFAULT NULL,

    ai_summary TEXT,

    working_hours INT DEFAULT NULL,

    service_company VARCHAR(100) DEFAULT NULL,

    PRIMARY KEY (log_id),

    KEY vin (vin),

    CONSTRAINT maintenance_log_ibfk_1 FOREIGN KEY (vin) REFERENCES machine_instance(vin)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- 6. 정비 상세 테이블

CREATE TABLE IF NOT EXISTS maintenance_detail (

    detail_id INT NOT NULL AUTO_INCREMENT,

    log_id INT DEFAULT NULL,

    part_id INT DEFAULT NULL,

    item_name VARCHAR(100) DEFAULT NULL,

    labor_cost INT DEFAULT NULL,

    part_cost INT DEFAULT NULL,

    quantity INT DEFAULT NULL,

    PRIMARY KEY (detail_id),

    KEY log_id (log_id),

    CONSTRAINT maintenance_detail_ibfk_1 FOREIGN KEY (log_id) REFERENCES maintenance_log(log_id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- 7. 정비 첨부파일 테이블

CREATE TABLE IF NOT EXISTS maintenance_attachment (

    attachment_id INT NOT NULL AUTO_INCREMENT,

    log_id INT DEFAULT NULL,

    file_path VARCHAR(255) DEFAULT NULL,

    original_name VARCHAR(255) DEFAULT NULL,

    file_size INT DEFAULT NULL,

    attachment_type ENUM('INVOICE','PART','ETC') DEFAULT 'ETC',

    ocr_status ENUM('READY','PROCESSING','DONE','FAIL') DEFAULT 'READY',

    ocr_result TEXT,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (attachment_id),

    KEY log_id (log_id),

    CONSTRAINT maintenance_attachment_ibfk_1 FOREIGN KEY (log_id) REFERENCES maintenance_log(log_id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- 8. 부품 리스트 테이블

CREATE TABLE IF NOT EXISTS part_list (

    part_id INT NOT NULL AUTO_INCREMENT COMMENT '부품 고유 ID',

    model_id INT NOT NULL COMMENT '기종/모델 연결용 (MACHINE_MASTER 참조)',

    system_group VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '계통명 (엔진계통, 일반소모 등)',

    part_number VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '부품번호 (DD-C-EN-0001 등)',

    part_name VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '부품명',

    base_price INT DEFAULT 0 COMMENT '표준단가',

    base_labor INT DEFAULT 0 COMMENT '표준공임',

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (part_id),

    UNIQUE KEY uq_model_part (model_id, part_number),

    CONSTRAINT fk_part_model FOREIGN KEY (model_id) REFERENCES machine_master(model_id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- 9. OCR 원본 파싱 데이터 저장 테이블 (향후 파싱 로직 개선용)

CREATE TABLE IF NOT EXISTS ocr_raw_data (

    ocr_id INT NOT NULL AUTO_INCREMENT COMMENT 'OCR 데이터 고유 ID',

    log_id INT DEFAULT NULL COMMENT '정비 이력 ID (연결된 경우)',

    attachment_id INT DEFAULT NULL COMMENT '첨부파일 ID',

    raw_text TEXT COMMENT 'OCR 원본 텍스트',

    parsed_data JSON COMMENT '파싱된 구조화 데이터 (JSON)',

    parsing_version VARCHAR(20) DEFAULT '1.0' COMMENT '파싱 로직 버전',

    parsing_status ENUM('SUCCESS','PARTIAL','FAILED') DEFAULT 'SUCCESS' COMMENT '파싱 상태',

    extracted_vin VARCHAR(50) COMMENT '추출된 기대번호',

    extracted_service_date DATE COMMENT '추출된 정비일자',

    extracted_total_cost INT COMMENT '추출된 총비용',

    extracted_parts_count INT DEFAULT 0 COMMENT '추출된 부품 개수',

    confidence_score DECIMAL(3,2) COMMENT '파싱 신뢰도 (0.00~1.00)',

    error_message TEXT COMMENT '파싱 오류 메시지',

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (ocr_id),

    KEY log_id (log_id),

    KEY attachment_id (attachment_id),

    KEY extracted_vin (extracted_vin),

    CONSTRAINT ocr_raw_data_ibfk_1 FOREIGN KEY (log_id) REFERENCES maintenance_log(log_id) ON DELETE SET NULL,

    CONSTRAINT ocr_raw_data_ibfk_2 FOREIGN KEY (attachment_id) REFERENCES maintenance_attachment(attachment_id) ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OCR 원본 데이터 및 파싱 결과 저장 (파싱 로직 개선용)';



-- 초기 데이터 삽입



-- 제조사 코드

INSERT INTO manufacturer_codes (mfg_code, mfg_name) VALUES

('D', '대동'),

('T', 'TYM'),

('L', 'LS'),

('K', '국제종합기계')

ON DUPLICATE KEY UPDATE mfg_name=VALUES(mfg_name);



-- 기종 코드

INSERT INTO category_codes (cat_code, cat_name) VALUES

('T', '트랙터'),

('I', '이앙기'),

('C', '콤바인'),

('H', '수확기')

ON DUPLICATE KEY UPDATE cat_name=VALUES(cat_name);



-- 완료 메시지

SELECT '데이터베이스 초기화 완료!' AS message;

