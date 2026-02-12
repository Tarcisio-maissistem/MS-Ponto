@echo off
setlocal EnableExtensions EnableDelayedExpansion

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

REM Log file (use PowerShell for a safe timestamp).
set "LOG_DIR=%APP_DIR%\service\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1
for /f "delims=" %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%I"
set "LOG_FILE=%LOG_DIR%\MSPontoServico_%TS%.log"
call :Log "=== MS Ponto V1.0 - Inicio (%TS%) ==="
call :Log "Script: %~f0"
call :Log "APP_DIR: %APP_DIR%"
call :Log "User: %USERNAME%"
call :Log "Args: %*"
call :Log "====================================="

REM Resolve Desktop paths (supports OneDrive redirection).
for /f "delims=" %%I in ('powershell -NoProfile -Command "[Environment]::GetFolderPath(\"Desktop\")"') do set "DESKTOP_USER=%%I"
for /f "delims=" %%I in ('powershell -NoProfile -Command "[Environment]::GetFolderPath(\"CommonDesktopDirectory\")"') do set "DESKTOP_COMMON=%%I"
call :Log "DESKTOP_USER: %DESKTOP_USER%"
call :Log "DESKTOP_COMMON: %DESKTOP_COMMON%"

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
if not "%errorlevel%"=="0" (call :Fail "Node.js nao encontrado (ou where node falhou)." & goto :End)

call :EnsureBuild
if not "%errorlevel%"=="0" (call :Fail "Falha ao gerar build (npm install/build). Veja o log." & goto :End)

call :CreateOrUpdateService
if not "%errorlevel%"=="0" (call :Fail "Falha ao criar/atualizar o servico. Veja o log." & goto :End)

call :StartService
if not "%errorlevel%"=="0" (call :Fail "Falha ao iniciar o servico. Veja o log." & goto :End)

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
if not "%errorlevel%"=="0" (call :Fail "Falha ao remover o servico. Veja o log." & goto :End)
call :RemoveShortcuts "%DESKTOP_USER%"
call :RemoveShortcuts "%DESKTOP_COMMON%"

echo.
echo OK. Servico removido.
echo.
pause
goto :End

:Log
>> "%LOG_FILE%" echo %*
exit /b 0

:Fail
echo.
echo ERRO: %~1
echo Log: "%LOG_FILE%"
echo.
call :Log "ERRO: %~1"
call :Log "Log: %LOG_FILE%"
pause
exit /b 0

:FindNode
set "NODE_EXE="
call :Log "Procurando node.exe (where node)..."
for /f "delims=" %%I in ('where node 2^>nul') do (
  set "NODE_EXE=%%I"
  goto :node_found
)
call :Log "ERRO: where node nao retornou nenhum caminho."
exit /b 1
:node_found
call :Log "NODE_EXE: %NODE_EXE%"
exit /b 0

:EnsureBuild
if exist "%APP_DIR%\dist\index.html" exit /b 0

echo.
echo Gerando build de producao (dist)...
call :Log "Gerando build: npm install/build"
pushd "%APP_DIR%"
if not exist "%APP_DIR%\node_modules\" (
  call :Log "Executando: npm install"
  call npm install >> "%LOG_FILE%" 2>&1
  if not "%errorlevel%"=="0" (
    popd
    call :Log "ERRO: npm install falhou (rc=%errorlevel%)."
    exit /b 1
  )
)
call :Log "Executando: npm run build"
call npm run build >> "%LOG_FILE%" 2>&1
if not "%errorlevel%"=="0" (
  popd
  call :Log "ERRO: npm run build falhou (rc=%errorlevel%)."
  exit /b 1
)
popd
exit /b 0

:CreateOrUpdateService
call :Log "CreateOrUpdateService - inicio"
sc query "%SERVICE_NAME%" >nul 2>&1
if "%errorlevel%"=="0" (
  echo.
  echo O servico "%SERVICE_NAME%" ja existe. Atualizando configuracao...
  call :Log "Servico ja existe. Atualizando start=auto."
  sc config "%SERVICE_NAME%" start= auto >nul
) else (
  echo.
  echo Criando servico "%SERVICE_NAME%"...
  call :Log "Comando sc create (binPath com node + serve-dist.mjs)"
  sc create "%SERVICE_NAME%" binPath= "\"%NODE_EXE%\" \"%APP_DIR%\service\serve-dist.mjs\" --host %HOST% --port %PORT%" start= auto DisplayName= "%DISPLAY_NAME%" >> "%LOG_FILE%" 2>&1
  set "SC_RC=%errorlevel%"
  call :Log "sc create rc=!SC_RC!"
  sc query "%SERVICE_NAME%" >nul 2>&1
  if not "%errorlevel%"=="0" (
    call :Log "ERRO: sc query nao encontrou o servico apos sc create."
    exit /b 1
  )
)

sc description "%SERVICE_NAME%" "MS Ponto V1.0 - Mais Sistem Solucoes Empresariais" >nul 2>&1
sc failure "%SERVICE_NAME%" reset= 86400 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1
sc qc "%SERVICE_NAME%" >> "%LOG_FILE%" 2>&1
sc query "%SERVICE_NAME%" >> "%LOG_FILE%" 2>&1
exit /b 0

:StartService
echo.
echo Iniciando servico...
sc start "%SERVICE_NAME%" >> "%LOG_FILE%" 2>&1
set "SC_START_RC=%errorlevel%"
call :Log "sc start rc=!SC_START_RC!"
sc query "%SERVICE_NAME%" >> "%LOG_FILE%" 2>&1
if not "!SC_START_RC!"=="0" exit /b 1
exit /b 0

:StopAndDeleteService
echo.
echo Parando servico (se estiver em execucao)...
sc stop "%SERVICE_NAME%" >> "%LOG_FILE%" 2>&1

echo Removendo servico...
sc delete "%SERVICE_NAME%" >> "%LOG_FILE%" 2>&1
set "SC_DEL_RC=%errorlevel%"
call :Log "sc delete rc=!SC_DEL_RC!"
exit /b 0

:CreateShortcuts
set "TARGET_DESKTOP=%~1"
if "%TARGET_DESKTOP%"=="" goto :eof
if not exist "%TARGET_DESKTOP%\" goto :eof
call :Log "Criando atalhos em: %TARGET_DESKTOP%"

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
call :Log "Removendo atalhos em: %TARGET_DESKTOP%"
if exist "%TARGET_DESKTOP%\%SHORTCUT_NAME%.url" del "%TARGET_DESKTOP%\%SHORTCUT_NAME%.url" >nul 2>&1
if exist "%TARGET_DESKTOP%\%SHORTCUT_NAME%.lnk" del "%TARGET_DESKTOP%\%SHORTCUT_NAME%.lnk" >nul 2>&1
exit /b 0

:End
endlocal
exit /b 0
