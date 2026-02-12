@echo off
setlocal

set "SERVICE_NAME=MSPontoV1"

REM Ensure we're running as admin.
net session >nul 2>&1
if not "%errorlevel%"=="0" (
  echo.
  echo ERRO: execute este arquivo como ADMINISTRADOR.
  echo (Clique com o botao direito ^> Executar como administrador)
  echo.
  pause
  exit /b 1
)

echo.
echo Parando servico (se estiver em execucao)...
sc stop "%SERVICE_NAME%" >nul 2>&1

echo Removendo servico...
sc delete "%SERVICE_NAME%" >nul 2>&1

set "DESKTOP=%USERPROFILE%\Desktop"
if exist "%DESKTOP%\MS Ponto V1.0.url" del "%DESKTOP%\MS Ponto V1.0.url" >nul 2>&1

echo.
echo OK. Servico removido.
echo.
pause
exit /b 0

