# backend/app/database.py

import pymysql
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# 데이터베이스 연결 설정
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '3306')),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'agrilog_db'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

# TiDB Cloud SSL 연결 설정 (프로덕션 환경)
if os.getenv('DB_SSL', 'false').lower() == 'true':
    DB_CONFIG['ssl'] = {'ssl_mode': 'VERIFY_IDENTITY'}
    DB_CONFIG['ssl_verify_cert'] = True
    DB_CONFIG['ssl_verify_identity'] = True

def get_db_connection():
    """데이터베이스 연결을 반환하는 함수"""
    try:
        connection = pymysql.connect(**DB_CONFIG)
        return connection
    except Exception as e:
        print(f"데이터베이스 연결 오류: {e}")
        return None