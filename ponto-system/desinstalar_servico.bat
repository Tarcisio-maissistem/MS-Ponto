@echo off
setlocal

set "SERVICE_NAME=MSPontoV1"
set "SHORTCUT_NAME=MS Ponto V1.0"

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

call :RemoveShortcuts "%USERPROFILE%\Desktop"
if exist "%PUBLIC%\Desktop\" call :RemoveShortcuts "%PUBLIC%\Desktop"

echo.
echo OK. Servico removido.
echo.
pause
exit /b 0

:RemoveShortcuts
set "TARGET_DESKTOP=%~1"
if not exist "%TARGET_DESKTOP%\" goto :eof
if exist "%TARGET_DESKTOP%\%SHORTCUT_NAME%.url" del "%TARGET_DESKTOP%\%SHORTCUT_NAME%.url" >nul 2>&1
if exist "%TARGET_DESKTOP%\%SHORTCUT_NAME%.lnk" del "%TARGET_DESKTOP%\%SHORTCUT_NAME%.lnk" >nul 2>&1
goto :eof

