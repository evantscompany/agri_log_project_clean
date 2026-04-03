# backend/app/utils/google_credentials.py
"""
Google Cloud Vision API Credentials 관리
Render 배포 환경에서 환경 변수로 credentials 로드
"""

import os
import json
from google.oauth2 import service_account

def get_vision_credentials():
    """
    Google Cloud Vision API credentials 반환
    
    우선순위:
    1. GOOGLE_APPLICATION_CREDENTIALS_JSON 환경 변수 (JSON 문자열)
    2. GOOGLE_APPLICATION_CREDENTIALS 파일 경로
    3. credentials/credentials.json 파일
    """
    
    # 방법 1: 환경 변수에서 JSON 직접 로드 (Render 권장)
    creds_json = os.getenv('GOOGLE_APPLICATION_CREDENTIALS_JSON')
    if creds_json:
        try:
            creds_dict = json.loads(creds_json)
            return service_account.Credentials.from_service_account_info(creds_dict)
        except Exception as e:
            print(f"⚠️ JSON 환경 변수 로드 실패: {e}")
    
    # 방법 2: 파일 경로 환경 변수
    creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    if creds_path and os.path.exists(creds_path):
        try:
            return service_account.Credentials.from_service_account_file(creds_path)
        except Exception as e:
            print(f"⚠️ Credentials 파일 로드 실패: {e}")
    
    # 방법 3: 기본 경로
    default_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        'credentials',
        'credentials.json'
    )
    if os.path.exists(default_path):
        try:
            return service_account.Credentials.from_service_account_file(default_path)
        except Exception as e:
            print(f"⚠️ 기본 경로 Credentials 로드 실패: {e}")
    
    raise Exception(
        "Google Cloud Vision API credentials를 찾을 수 없습니다.\n"
        "다음 중 하나를 설정하세요:\n"
        "1. GOOGLE_APPLICATION_CREDENTIALS_JSON 환경 변수\n"
        "2. GOOGLE_APPLICATION_CREDENTIALS 파일 경로\n"
        "3. backend/credentials/credentials.json 파일"
    )
