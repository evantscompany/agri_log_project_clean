// frontend/src/pages/Splash.jsx
/**
 * AgriLog 스플래시 화면
 * - 트랙터 애니메이션
 * - 브랜딩 표시
 */

import React, { useState, useEffect } from 'react';
import { Tractor, Wrench, Users, ArrowRight } from 'lucide-react';

export default function Splash() {
  const [showNext, setShowNext] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [skipToDashboard, setSkipToDashboard] = useState(false);

  useEffect(() => {
    // 세션 스토리지에 첫 방문 여부 확인
    const hasVisited = sessionStorage.getItem('agrilog_visited');
    const userType = localStorage.getItem('agrilog_user_type');
    
    if (hasVisited && userType === 'owner') {
      // 이미 방문했고 소유자를 선택했으면 바로 대시보드로
      setSkipToDashboard(true);
      window.location.href = '/dashboard';
      return;
    }

    if (hasVisited && userType) {
      // 이미 방문했으면 바로 사용자 선택 화면으로
      setShowNext(true);
      return;
    }

    // 첫 방문이면 세션 스토리지에 기록
    sessionStorage.setItem('agrilog_visited', 'true');

    // 2.5초 후 페이드아웃 시작
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2500);

    // 3초 후 다음 화면으로 전환
    const switchTimer = setTimeout(() => {
      setShowNext(true);
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(switchTimer);
    };
  }, []);

  if (skipToDashboard) {
    return null; // 대시보드로 리다이렉트 중
  }

  if (showNext) {
    return <UserTypeSelection />;
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-green-600 via-green-500 to-emerald-600 flex flex-col items-center justify-center text-white relative overflow-hidden transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      {/* 배경 애니메이션 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/10 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full animate-pulse delay-500"></div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* 트랙터 애니메이션 */}
        <div className="relative">
          <div className="animate-bounce">
            <Tractor className="w-32 h-32 text-white drop-shadow-2xl" strokeWidth={1.5} />
          </div>
          
          {/* 바퀴 회전 애니메이션 */}
          <div className="absolute bottom-0 left-4 w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute bottom-0 right-4 w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>

        {/* 로고 텍스트 */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold tracking-tight">
            AgriLog
          </h1>
          <p className="text-xl text-green-100 font-medium">
            농기계 데이터 이력관리 플랫폼
          </p>
        </div>

        {/* 로딩 인디케이터 */}
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-0"></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-150"></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-300"></div>
        </div>

        {/* 부가 정보 */}
        <div className="absolute bottom-7 text-center text-green-100 text-sm">
          <p>스마트한 농기계 관리의 시작</p>
        </div>
      </div>

      {/* CSS 애니메이션을 위한 인라인 스타일 */}
      <style>{`
        @keyframes delay-0 { animation-delay: 0ms; }
        @keyframes delay-150 { animation-delay: 150ms; }
        @keyframes delay-300 { animation-delay: 300ms; }
        @keyframes delay-500 { animation-delay: 500ms; }
        @keyframes delay-1000 { animation-delay: 1000ms; }
        
        .delay-0 { animation-delay: 0ms; }
        .delay-150 { animation-delay: 150ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-500 { animation-delay: 500ms; }
        .delay-1000 { animation-delay: 1000ms; }
      `}</style>
    </div>
  );
}

// 사용자 유형 선택 컴포넌트
function UserTypeSelection() {
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // 컴포넌트 마운트 후 페이드인 시작
    const timer = setTimeout(() => {
      setFadeIn(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // 사용자 유형 선택 처리
  const handleUserTypeSelect = (userType) => {
    // 선택한 사용자 유형 저장
    localStorage.setItem('agrilog_user_type', userType);
    
    if (userType === 'owner') {
      window.location.href = '/dashboard';
    } else if (userType === 'mechanic') {
      window.location.href = '/mechanic/dashboard';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex flex-col items-center justify-center p-6 transition-opacity duration-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      {/* 헤더 */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Tractor className="w-20 h-20 text-green-600" strokeWidth={1.5} />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          AgriLog
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          어떤 서비스를 이용하시겠습니까?
        </p>
        <p className="text-gray-500">
          사용자 유형을 선택하여 맞춤형 서비스를 시작하세요
        </p>
      </div>

      {/* 선택 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* 트랙터 소유자 카드 */}
        <button
          onClick={() => handleUserTypeSelect('owner')}
          className="group bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-green-500 text-left hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50"
        >
          <div className="flex flex-col items-center space-y-6">
            {/* 아이콘 */}
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-lg group-hover:shadow-xl">
              <Users className="w-12 h-12 text-white group-hover:animate-pulse" />
            </div>
            
            {/* 내용 */}
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                트랙터 소유자
              </h2>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                내 농기계의 정비 이력을 관리하고<br />
                중고시세를 확인하며<br />
                스마트하게 농기계를 운영하세요
              </p>
            </div>
            
            {/* 특징 */}
            <div className="w-full space-y-2">
              <div className="flex items-center text-sm text-gray-600 group-hover:text-green-600 transition-colors">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 group-hover:scale-125 transition-transform"></div>
                정비 이력 관리
              </div>
              <div className="flex items-center text-sm text-gray-600 group-hover:text-green-600 transition-colors">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 group-hover:scale-125 transition-transform"></div>
                중고시세 예측
              </div>
              <div className="flex items-center text-sm text-gray-600 group-hover:text-green-600 transition-colors">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 group-hover:scale-125 transition-transform"></div>
                QR 코드 관리
              </div>
            </div>
            
            {/* 이동 버튼 */}
            <div className="flex items-center text-green-600 font-semibold group-hover:text-green-700 transition-colors">
              시작하기
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform duration-300" />
            </div>
          </div>
        </button>

        {/* 정비업체 카드 */}
        <button
          onClick={() => handleUserTypeSelect('mechanic')}
          className="group bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-blue-500 text-left"
        >
          <div className="flex flex-col items-center space-y-6">
            {/* 아이콘 */}
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-lg group-hover:shadow-xl">
              <Wrench className="w-12 h-12 text-white group-hover:animate-pulse" />
            </div>
            
            {/* 내용 */}
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                정비업체
              </h2>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                고객 농기계의 정비 기록을 관리하고<br />
                전문적인 서비스를 제공하세요<br />
                <span className="text-blue-500 font-semibold group-hover:text-blue-600 transition-colors">(서비스 오픈)</span>
              </p>
            </div>
            
            {/* 특징 */}
            <div className="w-full space-y-2">
              <div className="flex items-center text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 group-hover:scale-125 transition-transform"></div>
                고객 관리
              </div>
              <div className="flex items-center text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 group-hover:scale-125 transition-transform"></div>
                정비 이력 기록
              </div>
              <div className="flex items-center text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 group-hover:scale-125 transition-transform"></div>
                서비스 관리
              </div>
            </div>
            
            {/* 시작 버튼 */}
            <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-700 transition-colors">
              시작하기
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform duration-300" />
            </div>
          </div>
        </button>
      </div>

      {/* 하단 정보 */}
      <div className="mt-12 text-center text-gray-500 text-sm">
        <p>© 2026 AgriLog. All rights reserved.</p>
        <p className="mt-1">스마트 농업을 위한 데이터 관리 솔루션</p>
      </div>
    </div>
  );
}
