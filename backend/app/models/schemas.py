# backend/app/models/schemas.py
"""
Pydantic 스키마 정의
API 요청/응답 데이터 검증 및 직렬화를 위한 모델
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date

# ========== 농기계 관련 스키마 ==========

class MachineDetail(BaseModel):
    """농기계 상세 정보"""
    id: Optional[str] = Field(None, description="농기계 ID")
    vin: str = Field(..., description="기대번호 (VIN)")
    name: Optional[str] = Field(None, description="농기계 이름")
    type: Optional[str] = Field(None, description="농기계 타입")
    model: Optional[str] = Field(None, description="모델명")
    manufacturer: Optional[str] = Field(None, description="제조사")
    category: Optional[str] = Field(None, description="기종")
    year: Optional[int] = Field(None, description="생산연식")
    image: Optional[str] = Field(None, description="이미지 URL")
    total_hours: Optional[int] = Field(None, description="총 사용시간")
    totalHours: Optional[int] = Field(None, description="총 사용시간 (camelCase)")
    total_records: Optional[int] = Field(None, description="총 정비 이력 수")
    totalRecords: Optional[int] = Field(None, description="총 정비 이력 수 (camelCase)")
    total_cost: Optional[int] = Field(None, description="총 정비 비용")
    totalCost: Optional[int] = Field(None, description="총 정비 비용 (camelCase)")
    last_maintenance: Optional[str] = Field(None, description="최근 정비일")
    lastMaintenance: Optional[str] = Field(None, description="최근 정비일 (camelCase)")
    hasModelInfo: Optional[bool] = Field(None, description="모델 정보 유무")
    
    class Config:
        extra = "allow"

class MachineList(BaseModel):
    """농기계 목록 응답"""
    machines: List[MachineDetail]
    total: int

# ========== 정비 이력 관련 스키마 ==========

class MaintenanceRecordCreate(BaseModel):
    """정비 이력 생성 요청"""
    vin: str = Field(..., description="기대번호")
    service_date: date = Field(..., description="작업 날짜")
    description: str = Field(..., description="작업 내용")
    cost: int = Field(..., ge=0, description="비용")
    mileage: Optional[int] = Field(None, ge=0, description="주행시간")
    service_company: Optional[str] = Field(None, description="정비업체")

class MaintenanceRecordResponse(BaseModel):
    """정비 이력 응답"""
    id: int = Field(..., description="이력 ID")
    vin: str = Field(..., description="기대번호")
    service_date: date = Field(..., description="작업 날짜")
    description: str = Field(..., description="작업 내용")
    cost: int = Field(..., ge=0, description="비용")
    mileage: Optional[int] = Field(None, ge=0, description="주행시간")

    class Config:
        from_attributes = True

class MaintenanceRecordList(BaseModel):
    """정비 이력 목록 응답"""
    records: List[MaintenanceRecordResponse]
    total: int

# ========== 공통 응답 스키마 ==========

class MessageResponse(BaseModel):
    """일반 메시지 응답"""
    message: str
    success: bool = True

class ErrorResponse(BaseModel):
    """에러 응답"""
    detail: str
    success: bool = False

# ========== 부품 관련 스키마 ==========

class PartDetail(BaseModel):
    """부품 상세 정보"""
    part_id: Optional[int] = Field(None, description="부품 ID")
    part_name: str = Field(..., description="부품명")
    quantity: int = Field(..., gt=0, description="수량")
    unit_cost: int = Field(..., ge=0, description="단가")

class PartSearchResponse(BaseModel):
    """부품 검색 응답"""
    part_id: int
    part_number: str
    part_name: str
    category: str
    unit_price: int

# ========== 정비 로그 관련 스키마 ==========

class MaintenanceLogRequest(BaseModel):
    """정비 기록 저장 요청"""
    vin: str = Field(..., description="농기계 번호")
    service_date: str = Field(..., description="정비일자 (YYYY-MM-DD)")
    service_company: str = Field(..., description="정비업체명")
    total_hours: Optional[int] = Field(0, description="총 가동시간")
    total_cost: int = Field(..., ge=0, description="총 정비 비용")
    ai_summary: str = Field(..., description="AI 요약")
    parts: List[PartDetail] = Field(..., min_items=1, description="부품 목록")

class MaintenanceLogResponse(BaseModel):
    """정비 기록 응답"""
    success: bool = True
    data: dict

class MaintenanceDetailResponse(BaseModel):
    """정비 기록 상세 응답"""
    id: Optional[str] = None
    vin: Optional[str] = None
    date: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[int] = None
    mileage: Optional[int] = None
    service_date: Optional[str] = None
    service_company: Optional[str] = None
    ai_summary: Optional[str] = None
    total_cost: Optional[int] = None
    total_hours: Optional[int] = None
    parts_count: Optional[int] = None
    details: Optional[List[dict]] = None
    parts: Optional[List[dict]] = None
    attachment_url: Optional[str] = None
    
    class Config:
        extra = "allow"

class MaintenanceHistoryResponse(BaseModel):
    """정비 이력 목록 응답"""
    records: List[MaintenanceDetailResponse]
    total: int
    machine_info: Optional[dict] = None
    
    class Config:
        extra = "allow"

# ========== AI 관련 스키마 ==========

class AIAdviceRequest(BaseModel):
    """AI 소견 요청"""
    vin: str = Field(..., description="농기계 번호")
    current_hours: int = Field(..., ge=0, description="현재 가동시간")

class AIAdviceResponse(BaseModel):
    """AI 소견 응답"""
    success: bool = True
    data: dict

# ========== QR 코드 관련 스키마 ==========

class QRCodeResponse(BaseModel):
    """QR 코드 응답"""
    vin: str
    qr_code: str
    machine_info: dict

class QRCodeListResponse(BaseModel):
    """QR 코드 목록 응답"""
    qr_codes: List[dict]
    total: int
