@echo off
setlocal

set "SERVICE_NAME=MSPontoV1"
set "DISPLAY_NAME=MS Ponto V1.0"
set "HOST=127.0.0.1"
set "PORT=4173"

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

set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

REM Find node.exe absolute path (service should not rely on PATH).
for /f "delims=" %%I in ('where node 2^>nul') do (
  set "NODE_EXE=%%I"
  goto :node_found
)
:node_not_found
echo.
echo ERRO: Node.js nao encontrado. Instale o Node.js (recomendado 20+) e tente novamente.
echo.
pause
exit /b 1

:node_found

REM Build dist if missing.
if not exist "%APP_DIR%\dist\index.html" (
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
)

REM Create service (skip if already exists).
sc query "%SERVICE_NAME%" >nul 2>&1
if "%errorlevel%"=="0" (
  echo.
  echo O servico "%SERVICE_NAME%" ja existe. Atualizando configuracao...
  sc config "%SERVICE_NAME%" start= auto >nul
) else (
  echo.
  echo Criando servico "%SERVICE_NAME%"...
  sc create "%SERVICE_NAME%" binPath= "\"%NODE_EXE%\" \"%APP_DIR%\\service\\serve-dist.mjs\" --host %HOST% --port %PORT%" start= auto DisplayName= "%DISPLAY_NAME%"
  if not "%errorlevel%"=="0" (
    echo.
    echo ERRO: falha ao criar o servico.
    echo.
    pause
    exit /b 1
  )
)

sc description "%SERVICE_NAME%" "MS Ponto V1.0 - Mais Sistem Solucoes Empresariais" >nul 2>&1
sc failure "%SERVICE_NAME%" reset= 86400 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1

echo.
echo Iniciando servico...
sc start "%SERVICE_NAME%" >nul 2>&1

REM Create desktop shortcut (URL shortcut).
set "DESKTOP=%USERPROFILE%\Desktop"
if exist "%DESKTOP%\" (
  > "%DESKTOP%\MS Ponto V1.0.url" (
    echo [InternetShortcut]
    echo URL=http://%HOST%:%PORT%/
    echo IconFile=%APP_DIR%\public\vite.svg
    echo IconIndex=0
  )
  echo.
  echo Atalho criado em: "%DESKTOP%\MS Ponto V1.0.url"
)

echo.
echo OK. O MS Ponto V1.0 foi instalado como servico e configurado para iniciar automaticamente.
echo Acesse: http://%HOST%:%PORT%/
echo.
pause
exit /b 0

