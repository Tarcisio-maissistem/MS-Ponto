@echo off
setlocal

set "SERVICE_NAME=MSPontoV1"
set "DISPLAY_NAME=MS Ponto V1.0"
set "HOST=127.0.0.1"
set "PORT=4173"
set "APP_URL=http://%HOST%:%PORT%/"
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

REM Create desktop shortcuts for current user and Public desktop.
call :CreateShortcuts "%USERPROFILE%\Desktop"
if exist "%PUBLIC%\Desktop\" call :CreateShortcuts "%PUBLIC%\Desktop"

echo.
echo OK. O MS Ponto V1.0 foi instalado como servico e configurado para iniciar automaticamente.
echo Acesse: %APP_URL%
echo.
pause
exit /b 0

:CreateShortcuts
set "TARGET_DESKTOP=%~1"
if not exist "%TARGET_DESKTOP%\" goto :eof

REM .url shortcut (simple and reliable for URLs)
> "%TARGET_DESKTOP%\%SHORTCUT_NAME%.url" (
  echo [InternetShortcut]
  echo URL=%APP_URL%
)

REM .lnk shortcut (optional, more "Windows-like")
powershell -NoProfile -Command ^
  "$d='%TARGET_DESKTOP%';$n='%SHORTCUT_NAME%';$u='%APP_URL%';" ^
  "$p=Join-Path $d ($n + '.lnk');" ^
  "$w=New-Object -ComObject WScript.Shell;" ^
  "$s=$w.CreateShortcut($p);" ^
  "$s.TargetPath='cmd.exe';" ^
  "$s.Arguments='/c start \"\" \"' + $u + '\"';" ^
  "$s.WindowStyle=7;" ^
  "$s.Save();" >nul 2>&1

echo.
echo Atalho criado em: "%TARGET_DESKTOP%\%SHORTCUT_NAME%.url"
goto :eof
