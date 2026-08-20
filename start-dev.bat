@echo off
chcp 65001 >nul
echo ========================================
echo  3DPrint 平台 — 开发环境启动脚本
echo ========================================
echo.

:: 检查后端是否已启动
curl -s http://localhost:8001/api/models?page=1 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [1/3] 启动后端 (8001端口)...
    start "backend" cmd /c "cd /d E:\3d\backend && python app\main.py"
    timeout /t 5 /nobreak >nul
) else (
    echo [1/3] 后端已在运行 (8001) ✅
)

echo [2/3] 启动前台 (3000端口)...
start "frontend" cmd /c "cd /d E:\3d\frontend && npx vite --port 3000 --host 0.0.0.0 --strictPort"

echo [3/3] 启动管理后台 (3002端口)...
start "admin" cmd /c "cd /d E:\3d\frontend && npx vite --port 3002 --host 0.0.0.0 --strictPort"

echo.
echo ========================================
echo  启动完成！
echo.
echo  🏪 前台:       http://localhost:3000
echo  🔧 管理后台:   http://localhost:3002
echo  🔐 管理登录:   http://localhost:3002/login
echo.
echo  关闭所有服务请按任意键...
echo ========================================
pause >nul

echo.
echo 正在关闭所有服务...
taskkill /f /fi "WINDOWTITLE eq backend" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq frontend" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq admin" >nul 2>&1
echo 已关闭。
