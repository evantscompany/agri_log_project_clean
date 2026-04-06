#!/usr/bin/env python3
"""
TiDB ocr_raw_data 테이블에 image_path 컬럼 추가
"""

import pymysql
import os
from dotenv import load_dotenv

load_dotenv('backend/.env.tidb')

def add_image_path_column():
    """image_path 컬럼 추가"""
    
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
    print("TiDB ocr_raw_data 테이블에 image_path 컬럼 추가")
    print("="*70)
    
    try:
        connection = pymysql.connect(**config)
        cursor = connection.cursor()
        
        # 1. 현재 컬럼 확인
        print("\n1. 현재 ocr_raw_data 테이블 구조:")
        cursor.execute("DESCRIBE ocr_raw_data")
        columns = cursor.fetchall()
        has_image_path = any(col['Field'] == 'image_path' for col in columns)
        
        if has_image_path:
            print("   ✅ image_path 컬럼이 이미 존재합니다.")
            cursor.close()
            connection.close()
            return
        
        print("   ❌ image_path 컬럼이 없습니다. 추가 진행...")
        
        # 2. image_path 컬럼 추가
        print("\n2. image_path 컬럼 추가 중...")
        sql = """
        ALTER TABLE ocr_raw_data 
        ADD COLUMN image_path VARCHAR(500) NULL COMMENT '이미지 파일 경로' 
        AFTER parsed_data
        """
        cursor.execute(sql)
        connection.commit()
        print("   ✅ image_path 컬럼 추가 완료")
        
        # 3. 추가 확인
        print("\n3. 추가 후 테이블 구조 확인:")
        cursor.execute("DESCRIBE ocr_raw_data")
        columns = cursor.fetchall()
        for col in columns:
            if col['Field'] == 'image_path':
                print(f"   ✅ {col['Field']:<30} {col['Type']:<20} {col['Null']}")
                break
        
        cursor.close()
        connection.close()
        
        print("\n" + "="*70)
        print("✅ 작업 완료!")
        print("="*70)
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")

if __name__ == "__main__":
    add_image_path_column()
