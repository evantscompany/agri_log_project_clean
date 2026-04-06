@echo off
echo TiDB 스키마 수정 실행...
echo.

mysql -h gateway01.ap-southeast-1.prod.aws.tidbcloud.com -P 4000 -u 2QGu7SgwrcUz1ae.root -p --ssl-mode=REQUIRED agrilog_db < fix_ocr_schema.sql

echo.
echo 완료!
pause
