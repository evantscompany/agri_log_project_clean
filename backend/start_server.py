# backend/start_server.py
"""백엔드 서버 시작"""

import subprocess
import sys
import os

def start_backend_server():
    """백엔드 서버 시작"""
    
    print("🚀 백엔드 서버 시작...")
    
    try:
        # 현재 디렉토리 확인
        current_dir = os.path.dirname(os.path.abspath(__file__))
        print(f"   - 현재 디렉토리: {current_dir}")
        
        # uvicorn 실행
        cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
        print(f"   - 실행 명령: {' '.join(cmd)}")
        
        # 서버 시작
        process = subprocess.Popen(
            cmd,
            cwd=current_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        print("✅ 백엔드 서버 시작 완료!")
        print("   - http://localhost:8000")
        print("   - API 문서: http://localhost:8000/docs")
        
        return process
        
    except Exception as e:
        print(f"❌ 백엔드 서버 시작 오류: {e}")
        return None

if __name__ == '__main__':
    start_backend_server()
