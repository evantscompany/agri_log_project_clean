# backend/app/utils/qr_generator.py
"""
QR 코드 생성 유틸리티
농기계 정보를 QR 코드로 생성
"""

import qrcode
import io
import base64
from typing import Dict, Any
import json

def generate_machine_qr_code(vin: str, machine_info: Dict[str, Any]) -> str:
    """
    농기계 정보 QR 코드 생성
    
    Args:
        vin: 기대번호
        machine_info: 농기계 정보 딕셔너리
        
    Returns:
        base64로 인코딩된 QR 코드 이미지 문자열
    """
    # QR 코드에 담을 정보 구성
    qr_data = {
        "vin": vin,
        "model_name": machine_info.get("base_model_name", ""),
        "manufacturer": machine_info.get("mfg_name", ""),
        "category": machine_info.get("cat_name", ""),
        "production_year": machine_info.get("production_year", ""),
        "total_hours": machine_info.get("total_hours", 0),
        "app_url": f"http://localhost:5174/machine/{vin}"
    }
    
    # JSON 문자열로 변환
    qr_text = json.dumps(qr_data, ensure_ascii=False)
    
    # QR 코드 생성
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_text)
    qr.make(fit=True)
    
    # 이미지 생성
    img = qr.make_image(fill_color="black", back_color="white")
    
    # 메모리에 이미지 저장
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    # base64로 인코딩
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_base64}"

def generate_simple_vin_qr(vin: str) -> str:
    """
    간단한 VIN만 담은 QR 코드 생성
    
    Args:
        vin: 기대번호
        
    Returns:
        base64로 인코딩된 QR 코드 이미지 문자열
    """
    qr_data = {
        "vin": vin,
        "app_url": f"http://localhost:5174/machine/{vin}"
    }
    
    qr_text = json.dumps(qr_data, ensure_ascii=False)
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_text)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_base64}"
