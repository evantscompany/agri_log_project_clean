import os
import time
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def download_daedong_parts_only():
    chrome_options = Options()
    # 창이 뜨는 것을 확인하며 디버깅하기 위해 headless는 끕니다.
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    wait = WebDriverWait(driver, 15)
    
    try:
        driver.get("https://ko.daedong.co.kr/reference/manualdownload")
        print("1. 페이지 접속 완료")

        # '부품목록' 메인 탭 클릭
        part_tab = wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), '부품목록')]")))
        driver.execute_script("arguments[0].click();", part_tab)
        time.sleep(2)
        print("2. 부품목록 탭 진입")

        # 모든 모델 그룹(dl.attached)을 찾습니다.
        model_groups = driver.find_elements(By.CSS_SELECTOR, "dl.attached")
        print(f"3. 발견된 모델 그룹: {len(model_groups)}개")

        for group in model_groups:
            try:
                # 모델명(dt) 추출 및 클릭하여 리스트 펼치기
                dt_elem = group.find_element(By.TAG_NAME, "dt")
                model_name_raw = dt_elem.text.strip().split('\n')[-1].strip() # 'HX 시리즈' 제외하고 모델명만
                
                # 모델 클릭 (이미 펼쳐져 있을 수도 있지만, 안전하게 클릭)
                driver.execute_script("arguments[0].click();", dt_elem)
                time.sleep(0.5)

                # 해당 그룹 내의 모든 a 태그 중 '부품목록'이 포함된 것만 찾기
                links = group.find_elements(By.CSS_SELECTOR, "dd ul li a")
                
                for link in links:
                    link_text = link.text.strip()
                    
                    if "부품목록" in link_text:
                        href = link.get_attribute("href")
                        # 파일명에서 불필요한 공백 제거
                        safe_model_name = model_name_raw.replace(" ", "_")
                        
                        print(f"   -> 다운로드 시도: {link_text}")
                        
                        # 저장 폴더 생성 (모델명별)
                        save_dir = f"./daedong_data/{safe_model_name}"
                        os.makedirs(save_dir, exist_ok=True)
                        
                        file_path = os.path.join(save_dir, f"{link_text.replace(' ', '_')}.pdf")

                        # 실제 다운로드 (Requests 사용)
                        resp = requests.get(href, stream=True)
                        if resp.status_code == 200:
                            with open(file_path, "wb") as f:
                                f.write(resp.content)
                            print(f"      [성공] {file_path}")
                        else:
                            print(f"      [실패] 상태코드: {resp.status_code}")
                            
            except Exception as e:
                continue # 개별 모델 오류 시 다음으로 패스

    finally:
        driver.quit()
        print("전체 수집 작업 종료")

if __name__ == "__main__":
    download_daedong_parts_only()