@echo off
echo Iniciando servidor de debug...
cd /d "c:\Users\yboos\gitClones\Dashboard_ADS"
start node debug-server.js
timeout /t 3
echo Abrindo navegador...
start http://localhost:3001/debug-user-creation.html
echo.
echo Pressione qualquer tecla para parar o servidor...
pause
taskkill /f /im node.exe
