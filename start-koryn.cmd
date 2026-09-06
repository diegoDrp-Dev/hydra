@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title Koryn Security Platform by HOJO

echo.
echo ============================================================
echo   KORYN SECURITY PLATFORM - by HOJO
echo ============================================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Docker nao foi encontrado. Instale o Docker Desktop.
  goto :fail
)

docker info >nul 2>&1
if not errorlevel 1 goto :docker_ready
echo [1/5] Iniciando Docker Desktop...
if not exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" goto :fail
start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
set /a docker_wait=0
:wait_docker
timeout /t 3 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 goto :docker_ready
set /a docker_wait+=3
if !docker_wait! GEQ 180 goto :fail
goto :wait_docker

:docker_ready
echo [1/5] Docker pronto.
if not exist ".env" (
  echo [2/5] Criando configuracao local segura...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$b=New-Object byte[] 48; $r=[Security.Cryptography.RandomNumberGenerator]::Create(); $r.GetBytes($b); $r.Dispose(); $s=-join ($b ^| ForEach-Object { $_.ToString('x2') }); @('JWT_SECRET='+$s,'DB_USER=hydra','DB_PASSWORD=hydra','DB_NAME=hydra','JWT_ISSUER=koryn-security-platform','JWT_AUDIENCE=koryn-console','CORS_ORIGINS=http://localhost:5173','SOAR_EXECUTION_ENABLED=false','ALLOW_PRIVATE_SCAN_TARGETS=false','WEBHOOK_ALLOW_PRIVATE_TARGETS=false') ^| Set-Content -Encoding Ascii '.env'"
  if errorlevel 1 goto :fail
) else (
  echo [2/5] Configuracao local encontrada.
)

findstr /B /C:"REDIS_PASSWORD=" ".env" >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$b=New-Object byte[] 32; $r=[Security.Cryptography.RandomNumberGenerator]::Create(); $r.GetBytes($b); $r.Dispose(); $s=-join ($b ^| ForEach-Object { $_.ToString('x2') }); Add-Content -Encoding Ascii '.env' ('REDIS_PASSWORD='+$s)"
  if errorlevel 1 goto :fail
)

echo [3/5] Construindo e iniciando todos os servicos...
docker compose up -d --build
if errorlevel 1 (
  echo [ERRO] Falha ao iniciar a stack Koryn.
  docker compose ps
  goto :fail
)

echo [4/5] Aguardando API, banco, Redis e workers...
set /a api_wait=0
:wait_api
curl.exe --fail --silent --show-error --max-time 3 "http://localhost:3000/ready" >nul 2>&1
if errorlevel 1 goto :wait_retry
curl.exe --fail --silent --show-error --max-time 3 "http://localhost:5173" >nul 2>&1
if not errorlevel 1 goto :api_ready
:wait_retry
timeout /t 3 /nobreak >nul
set /a api_wait+=3
if !api_wait! GEQ 180 (
  docker compose ps
  goto :fail
)
goto :wait_api

:api_ready
echo [5/5] Koryn esta operacional.
echo Dashboard: http://localhost:5173
echo API:       http://localhost:3000
echo Docs:      http://localhost:3000/docs
start "" "http://localhost:5173"
echo Esta janela pode ser fechada. Os servicos continuarao ativos.
pause
exit /b 0

:fail
echo.
echo Inicializacao interrompida. Nenhum dado foi apagado.
pause
exit /b 1
