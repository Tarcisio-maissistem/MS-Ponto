@echo off
setlocal

set "SERVICE_NAME=MSPontoV1"
set "DISPLAY_NAME=MS Ponto V1.0"
set "HOST=127.0.0.1"
set "PORT=4173"
set "APP_URL=http://%HOST%:%PORT%/"
set "SHORTCUT_NAME=MS Ponto V1.0"

REM Auto-elevate via UAC (service install/remove requires admin).
net session >nul 2>&1
if not "%errorlevel%"=="0" (
  echo.
  echo Solicitando permissao de Administrador...
  set "ELEV_ARG="
  if /i "%~1"=="--install" set "ELEV_ARG=--install"
  if /i "%~1"=="--uninstall" set "ELEV_ARG=--uninstall"
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList '%ELEV_ARG%' -Verb RunAs" >nul 2>&1
  exit /b 0
)

set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

REM Resolve Desktop paths (supports OneDrive redirection).
for /f "delims=" %%I in ('powershell -NoProfile -Command "[Environment]::GetFolderPath('Desktop')"') do set "DESKTOP_USER=%%I"
for /f "delims=" %%I in ('powershell -NoProfile -Command "[Environment]::GetFolderPath('CommonDesktopDirectory')"') do set "DESKTOP_COMMON=%%I"

if /i "%~1"=="--install" goto :Install
if /i "%~1"=="--uninstall" goto :Uninstall

:Menu
echo.
echo ============================
echo   MS Ponto V1.0 - Servico
echo ============================
echo.
echo 1^) Instalar como servico (auto iniciar) + criar atalho + abrir pagina
echo 2^) Desinstalar servico + remover atalho
echo 3^) Sair
echo.
set /p "OP=Escolha uma opcao (1-3): "

if "%OP%"=="1" goto :Install
if "%OP%"=="2" goto :Uninstall
goto :End

:Install
call :FindNode
if not "%errorlevel%"=="0" goto :End

call :EnsureBuild
if not "%errorlevel%"=="0" goto :End

call :CreateOrUpdateService
if not "%errorlevel%"=="0" goto :End

call :StartService

call :CreateShortcuts "%DESKTOP_USER%"
call :CreateShortcuts "%DESKTOP_COMMON%"

echo.
echo Abrindo: %APP_URL%
start "" "%APP_URL%" >nul 2>&1

echo.
echo OK. Instalado como servico e configurado para iniciar automaticamente.
echo Servico: %SERVICE_NAME%
echo URL: %APP_URL%
echo.
pause
goto :End

:Uninstall
call :StopAndDeleteService
call :RemoveShortcuts "%DESKTOP_USER%"
call :RemoveShortcuts "%DESKTOP_COMMON%"

echo.
echo OK. Servico removido.
echo.
pause
goto :End

:FindNode
set "NODE_EXE="
for /f "delims=" %%I in ('where node 2^>nul') do (
  set "NODE_EXE=%%I"
  goto :node_found
)
echo.
echo ERRO: Node.js nao encontrado. Instale o Node.js (recomendado 20+) e tente novamente.
echo.
pause
exit /b 1
:node_found
exit /b 0

:EnsureBuild
if exist "%APP_DIR%\dist\index.html" exit /b 0

echo.
echo Gerando build de producao (dist)...
pushd "%APP_DIR%"
if not exist "%APP_DIR%\node_modules\" (
  call npm install
  if not "%errorlevel%"=="0" (
    popd
    echo.
    echo ERRO: falha no npm install.
    echo.
    pause
    exit /b 1
  )
)
call npm run build
if not "%errorlevel%"=="0" (
  popd
  echo.
  echo ERRO: falha no npm run build.
  echo.
  pause
  exit /b 1
)
popd
exit /b 0

:CreateOrUpdateService
sc query "%SERVICE_NAME%" >nul 2>&1
if "%errorlevel%"=="0" (
  echo.
  echo O servico "%SERVICE_NAME%" ja existe. Atualizando configuracao...
  sc config "%SERVICE_NAME%" start= auto >nul
) else (
  echo.
  echo Criando servico "%SERVICE_NAME%"...
  sc create "%SERVICE_NAME%" binPath= "\"%NODE_EXE%\" \"%APP_DIR%\service\serve-dist.mjs\" --host %HOST% --port %PORT%" start= auto DisplayName= "%DISPLAY_NAME%"
  set "SC_RC=%errorlevel%"
  sc query "%SERVICE_NAME%" >nul 2>&1
  if not "%errorlevel%"=="0" (
    echo.
    echo ERRO: falha ao criar o servico (sc rc=%SC_RC%).
    echo.
    pause
    exit /b 1
  )
)

sc description "%SERVICE_NAME%" "MS Ponto V1.0 - Mais Sistem Solucoes Empresariais" >nul 2>&1
sc failure "%SERVICE_NAME%" reset= 86400 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1
exit /b 0

:StartService
echo.
echo Iniciando servico...
sc start "%SERVICE_NAME%" >nul 2>&1
exit /b 0

:StopAndDeleteService
echo.
echo Parando servico (se estiver em execucao)...
sc stop "%SERVICE_NAME%" >nul 2>&1

echo Removendo servico...
sc delete "%SERVICE_NAME%" >nul 2>&1
exit /b 0

:CreateShortcuts
set "TARGET_DESKTOP=%~1"
if "%TARGET_DESKTOP%"=="" goto :eof
if not exist "%TARGET_DESKTOP%\" goto :eof

REM .url shortcut (simple and reliable for URLs)
> "%TARGET_DESKTOP%\%SHORTCUT_NAME%.url" (
  echo [InternetShortcut]
  echo URL=%APP_URL%
)

REM .lnk shortcut (more "Windows-like")
powershell -NoProfile -Command ^
  "$d='%TARGET_DESKTOP%';$n='%SHORTCUT_NAME%';$u='%APP_URL%';" ^
  "$p=Join-Path $d ($n + '.lnk');" ^
  "$w=New-Object -ComObject WScript.Shell;" ^
  "$s=$w.CreateShortcut($p);" ^
  "$s.TargetPath='cmd.exe';" ^
  "$s.Arguments='/c start \"\" \"' + $u + '\"';" ^
  "$s.WindowStyle=7;" ^
  "$s.Save();" >nul 2>&1

echo Atalho criado em: "%TARGET_DESKTOP%\%SHORTCUT_NAME%.url"
exit /b 0

:RemoveShortcuts
set "TARGET_DESKTOP=%~1"
if "%TARGET_DESKTOP%"=="" goto :eof
if not exist "%TARGET_DESKTOP%\" goto :eof
if exist "%TARGET_DESKTOP%\%SHORTCUT_NAME%.url" del "%TARGET_DESKTOP%\%SHORTCUT_NAME%.url" >nul 2>&1
if exist "%TARGET_DESKTOP%\%SHORTCUT_NAME%.lnk" del "%TARGET_DESKTOP%\%SHORTCUT_NAME%.lnk" >nul 2>&1
exit /b 0

:End
endlocal
exit /b 0
