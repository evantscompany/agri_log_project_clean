# backend/app/services/google_vision_ocr.py
"""
Google Cloud Vision API를 사용한 OCR 서비스
- 이미지에서 텍스트 추출
- 한글 및 영문 인식 지원
"""

import os
from typing import Dict, Optional
from google.cloud import vision
from google.oauth2 import service_account

class GoogleVisionOCR:
    """Google Vision API OCR 클래스"""
    
    def __init__(self, credentials_path: Optional[str] = None):
        """
        Google Vision API 클라이언트 초기화
        
        Args:
            credentials_path: 서비스 계정 JSON 키 파일 경로
                             None이면 환경변수 GOOGLE_APPLICATION_CREDENTIALS 사용
        """
        if credentials_path and os.path.exists(credentials_path):
            # 명시적으로 제공된 인증 정보 사용
            credentials = service_account.Credentials.from_service_account_file(
                credentials_path
            )
            self.client = vision.ImageAnnotatorClient(credentials=credentials)
        else:
            # 환경변수 사용 (GOOGLE_APPLICATION_CREDENTIALS)
            self.client = vision.ImageAnnotatorClient()
    
    def extract_text_from_image(self, image_path: str) -> Dict:
        """
        이미지 파일에서 텍스트 추출
        
        Args:
            image_path: 이미지 파일 경로
        
        Returns:
            {
                'success': bool,
                'text': str,  # 추출된 전체 텍스트
                'confidence': float,  # 평균 신뢰도 (0-100)
                'blocks': list,  # 텍스트 블록 정보
                'error': str  # 에러 메시지 (실패 시)
            }
        """
        try:
            # 이미지 파일 읽기
            with open(image_path, 'rb') as image_file:
                content = image_file.read()
            
            image = vision.Image(content=content)
            
            # 텍스트 감지 (document_text_detection: 문서 OCR에 최적화)
            response = self.client.document_text_detection(image=image)
            
            if response.error.message:
                return {
                    'success': False,
                    'text': '',
                    'confidence': 0,
                    'blocks': [],
                    'error': response.error.message
                }
            
            # 전체 텍스트 추출
            full_text = response.full_text_annotation.text if response.full_text_annotation else ''
            
            # 텍스트 블록 및 신뢰도 정보 추출
            blocks = []
            total_confidence = 0
            block_count = 0
            
            if response.full_text_annotation:
                for page in response.full_text_annotation.pages:
                    for block in page.blocks:
                        block_text = ''
                        block_confidence = 0
                        word_count = 0
                        
                        for paragraph in block.paragraphs:
                            for word in paragraph.words:
                                word_text = ''.join([symbol.text for symbol in word.symbols])
                                block_text += word_text + ' '
                                block_confidence += word.confidence
                                word_count += 1
                        
                        if word_count > 0:
                            avg_confidence = block_confidence / word_count
                            blocks.append({
                                'text': block_text.strip(),
                                'confidence': avg_confidence
                            })
                            total_confidence += avg_confidence
                            block_count += 1
            
            # 평균 신뢰도 계산 (0-100 범위)
            avg_confidence = (total_confidence / block_count * 100) if block_count > 0 else 0
            
            return {
                'success': True,
                'text': full_text,
                'confidence': round(avg_confidence, 2),
                'blocks': blocks,
                'error': None
            }
        
        except FileNotFoundError:
            return {
                'success': False,
                'text': '',
                'confidence': 0,
                'blocks': [],
                'error': f'이미지 파일을 찾을 수 없습니다: {image_path}'
            }
        except Exception as e:
            return {
                'success': False,
                'text': '',
                'confidence': 0,
                'blocks': [],
                'error': f'OCR 처리 중 오류 발생: {str(e)}'
            }
    
    def extract_text_from_bytes(self, image_bytes: bytes) -> Dict:
        """
        이미지 바이트에서 텍스트 추출
        
        Args:
            image_bytes: 이미지 바이트 데이터
        
        Returns:
            extract_text_from_image와 동일한 형식
        """
        try:
            image = vision.Image(content=image_bytes)
            
            # 텍스트 감지
            response = self.client.document_text_detection(image=image)
            
            if response.error.message:
                return {
                    'success': False,
                    'text': '',
                    'confidence': 0,
                    'blocks': [],
                    'error': response.error.message
                }
            
            # 전체 텍스트 추출
            full_text = response.full_text_annotation.text if response.full_text_annotation else ''
            
            # 신뢰도 계산
            blocks = []
            total_confidence = 0
            block_count = 0
            
            if response.full_text_annotation:
                for page in response.full_text_annotation.pages:
                    for block in page.blocks:
                        block_text = ''
                        block_confidence = 0
                        word_count = 0
                        
                        for paragraph in block.paragraphs:
                            for word in paragraph.words:
                                word_text = ''.join([symbol.text for symbol in word.symbols])
                                block_text += word_text + ' '
                                block_confidence += word.confidence
                                word_count += 1
                        
                        if word_count > 0:
                            avg_confidence = block_confidence / word_count
                            blocks.append({
                                'text': block_text.strip(),
                                'confidence': avg_confidence
                            })
                            total_confidence += avg_confidence
                            block_count += 1
            
            avg_confidence = (total_confidence / block_count * 100) if block_count > 0 else 0
            
            return {
                'success': True,
                'text': full_text,
                'confidence': round(avg_confidence, 2),
                'blocks': blocks,
                'error': None
            }
        
        except Exception as e:
            return {
                'success': False,
                'text': '',
                'confidence': 0,
                'blocks': [],
                'error': f'OCR 처리 중 오류 발생: {str(e)}'
            }


# 싱글톤 인스턴스 생성
def get_vision_ocr_client(credentials_path: Optional[str] = None) -> GoogleVisionOCR:
    """
    Google Vision OCR 클라이언트 인스턴스 반환
    
    Args:
        credentials_path: 서비스 계정 JSON 키 파일 경로
    
    Returns:
        GoogleVisionOCR 인스턴스
    """
    return GoogleVisionOCR(credentials_path)
