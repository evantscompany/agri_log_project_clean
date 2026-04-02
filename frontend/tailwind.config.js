/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // src 폴더 안의 모든 js, jsx 파일을 감시하겠다는 뜻!
  ],
  theme: {
    extend: {
      // 나중에 농기계 브랜드 컬러(대동 오렌지, 존디어 그린 등)를 
      // 여기에 커스텀으로 넣을 수도 있습니다.
    },
  },
  plugins: [],
}