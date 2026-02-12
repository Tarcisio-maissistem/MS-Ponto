@echo off
setlocal

echo.
echo ============================
echo   MS Ponto V1.0 - Servico
echo ============================
echo.
echo 1^) Instalar como servico (auto iniciar) + criar atalho
echo 2^) Desinstalar servico + remover atalho
echo 3^) Sair
echo.
set /p "OP=Escolha uma opcao (1-3): "

if "%OP%"=="1" (
  call "%~dp0instalar_servico.bat"
  exit /b %errorlevel%
)
if "%OP%"=="2" (
  call "%~dp0desinstalar_servico.bat"
  exit /b %errorlevel%
)
exit /b 0
