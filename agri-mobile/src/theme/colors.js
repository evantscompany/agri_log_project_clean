// 농기계 관리 플랫폼 색상 테마
// 온화한 초록색 기반 통일 테마 (농민용)
// 연한 파란색 기반 테마 (정비업체용)

export const colors = {
  // Primary Colors - 메인 초록색 (농민용)
  primary: {
    main: '#4CAF50',      // 메인 초록색
    light: '#81C784',     // 밝은 초록색
    dark: '#388E3C',      // 어두운 초록색
    pale: '#E8F5E9',      // 매우 연한 초록색 (배경용)
  },

  // Mechanic Colors - 연한 파란색 (정비업체용)
  mechanic: {
    main: '#42A5F5',      // 메인 파란색
    light: '#64B5F6',     // 밝은 파란색
    dark: '#1976D2',      // 어두운 파란색
    pale: '#E3F2FD',      // 매우 연한 파란색 (배경용)
  },

  // Secondary Colors - 보조 색상
  secondary: {
    main: '#66BB6A',      // 부드러운 초록색
    light: '#A5D6A7',     // 연한 초록색
    dark: '#2E7D32',      // 진한 초록색
  },

  // Neutral Colors - 중립 색상
  neutral: {
    white: '#FFFFFF',
    gray50: '#FAFAFA',
    gray100: '#F5F5F5',
    gray200: '#EEEEEE',
    gray300: '#E0E0E0',
    gray400: '#BDBDBD',
    gray500: '#9E9E9E',
    gray600: '#757575',
    gray700: '#616161',
    gray800: '#424242',
    gray900: '#212121',
    black: '#000000',
  },

  // Status Colors - 상태 색상
  status: {
    success: '#4CAF50',   // 성공 (초록색)
    warning: '#FFA726',   // 경고 (주황색)
    error: '#EF5350',     // 오류 (빨간색)
    info: '#42A5F5',      // 정보 (파란색)
  },

  // Text Colors - 텍스트 색상
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#BDBDBD',
    hint: '#9E9E9E',
    white: '#FFFFFF',
  },

  // Background Colors - 배경 색상
  background: {
    default: '#FAFAFA',
    paper: '#FFFFFF',
    green: '#E8F5E9',     // 초록색 배경
    lightGreen: '#F1F8E9', // 연한 초록색 배경
  },

  // Border Colors - 테두리 색상
  border: {
    light: '#E0E0E0',
    main: '#BDBDBD',
    dark: '#757575',
    green: '#81C784',     // 초록색 테두리
  },

  // Shadow Colors - 그림자 색상
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    main: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.2)',
  },
};

export default colors;
