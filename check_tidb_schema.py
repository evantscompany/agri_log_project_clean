#!/usr/bin/env python3
"""
TiDB 데이터베이스 스키마 확인 스크립트
"""

import pymysql
import os
from dotenv import load_dotenv

load_dotenv('backend/.env.tidb')

def check_tidb_schema():
    """TiDB 스키마 확인"""
    
    config = {
        'host': os.getenv('DB_HOST'),
        'port': int(os.getenv('DB_PORT', 4000)),
        'user': os.getenv('DB_USER'),
        'password': os.getenv('DB_PASSWORD'),
        'database': os.getenv('DB_NAME'),
        'charset': 'utf8mb4',
        'cursorclass': pymysql.cursors.DictCursor,
        'ssl': {'ssl': True} if os.getenv('DB_SSL') == 'true' else None
    }
    
    print("="*70)
    print("TiDB 데이터베이스 스키마 확인")
    print("="*70)
    
    try:
        connection = pymysql.connect(**config)
        cursor = connection.cursor()
        
        # 1. 테이블 목록 확인
        print("\n1. 테이블 목록:")
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        for table in tables:
            table_name = list(table.values())[0]
            print(f"   - {table_name}")
        
        # 2. 각 테이블의 컬럼 구조 확인
        print("\n2. 테이블 구조:")
        
        important_tables = [
            'machine_master',
            'machine_instance', 
            'maintenance_log',
            'maintenance_detail',
            'maintenance_attachment',
            'part_list',
            'ocr_raw_data'
        ]
        
        for table_name in important_tables:
            print(f"\n   [{table_name}]")
            cursor.execute(f"DESCRIBE {table_name}")
            columns = cursor.fetchall()
            for col in columns:
                null_str = "NULL" if col['Null'] == 'YES' else "NOT NULL"
                key_str = f" ({col['Key']})" if col['Key'] else ""
                default_str = f" DEFAULT {col['Default']}" if col['Default'] else ""
                print(f"      {col['Field']:<30} {col['Type']:<20} {null_str}{key_str}{default_str}")
        
        # 3. 데이터 개수 확인
        print("\n3. 데이터 개수:")
        for table_name in important_tables:
            cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
            count = cursor.fetchone()['count']
            print(f"   {table_name:<30} {count:>5} rows")
        
        # 4. ocr_raw_data 테이블 image_path 컬럼 확인
        print("\n4. ocr_raw_data 테이블 image_path 컬럼 확인:")
        cursor.execute("DESCRIBE ocr_raw_data")
        columns = cursor.fetchall()
        has_image_path = any(col['Field'] == 'image_path' for col in columns)
        
        if has_image_path:
            print("   ✅ image_path 컬럼 존재")
        else:
            print("   ❌ image_path 컬럼 없음 - 추가 필요!")
            print("\n   추가 SQL:")
            print("   ALTER TABLE ocr_raw_data ADD COLUMN image_path VARCHAR(500) NULL COMMENT '이미지 파일 경로' AFTER parsed_data;")
        
        # 5. part_list 데이터 확인
        print("\n5. part_list 부품 데이터:")
        cursor.execute("SELECT COUNT(*) as count FROM part_list")
        part_count = cursor.fetchone()['count']
        
        if part_count == 0:
            print("   ⚠️  부품 데이터 없음 (목업 데이터 기반)")
            print("   → OCR 파싱에서 부품 검증 로직 제거 필요")
        else:
            print(f"   ✅ 부품 데이터 {part_count}개 존재")
            cursor.execute("SELECT * FROM part_list LIMIT 5")
            parts = cursor.fetchall()
            for part in parts:
                print(f"      - {part['part_name']} ({part['part_number']})")
        
        cursor.close()
        connection.close()
        
        print("\n" + "="*70)
        print("✅ 스키마 확인 완료")
        print("="*70)
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")

if __name__ == "__main__":
    check_tidb_schema()
