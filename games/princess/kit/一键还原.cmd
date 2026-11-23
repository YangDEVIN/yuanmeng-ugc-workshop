@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo 请先安装 Node.js 22 或以上版本。 & pause & exit /b 1)
node restore.cjs
pause
