@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title HYDRA Enterprise Launcher

echo.
echo ============================================================
echo   HYDRA ENTERPRISE - Inicializador completo
echo ============================================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Docker nao foi encontrado.
  echo Instale o Docker Desktop e execute este arquivo novamente.
  goto :fail
)

docker info >nul 2>&1
if not errorlevel 1 goto :docker_ready

echo [1/5] Iniciando Docker Desktop...
if not exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
  echo [ERRO] Docker Desktop nao esta em execucao e nao foi encontrado.
  goto :fail
)
start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"

set /a docker_wait=0
:wait_docker
timeout /t 3 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 goto :docker_ready
set /a docker_wait+=3
if !docker_wait! GEQ 180 (
  echo [ERRO] Docker nao ficou pronto em 3 minutos.
  goto :fail
)
goto :wait_docker

:docker_ready
echo [1/5] Docker pronto.

if not exist ".env" (
  echo [2/5] Criando configuracao local segura...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$b=New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Fill($b); $s=-join ($b | ForEach-Object { $_.ToString('x2') }); @('JWT_SECRET='+$s,'DB_USER=hydra','DB_PASSWORD=hydra','DB_NAME=hydra','CORS_ORIGINS=http://localhost:5173','SOAR_EXECUTION_ENABLED=false','ALLOW_PRIVATE_SCAN_TARGETS=false') | Set-Content -Encoding Ascii '.env'"
  if errorlevel 1 (
    echo [ERRO] Nao foi possivel criar o arquivo .env.
    goto :fail
  )
) else (
  echo [2/5] Configuracao local encontrada.
)

echo [3/5] Construindo e iniciando todos os servicos...
docker compose up -d --build
if errorlevel 1 (
  echo [ERRO] Falha ao iniciar a stack HYDRA.
  docker compose ps
  goto :fail
)

echo [4/5] Aguardando API, banco, Redis e workers...
set /a api_wait=0
:wait_api
powershell -NoProfile -Command "try { $r=Invoke-RestMethod -Uri 'http://localhost:3000/ready' -TimeoutSec 3; $w=Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:5173' -TimeoutSec 3; if ($r.status -eq 'ready' -and $w.StatusCode -eq 200) { exit 0 } }; catch {}; exit 1" >nul 2>&1
if not errorlevel 1 goto :api_ready
timeout /t 3 /nobreak >nul
set /a api_wait+=3
if !api_wait! GEQ 180 (
  echo [ERRO] A API nao ficou pronta em 3 minutos.
  echo Consulte os diagnosticos com: docker compose logs
  docker compose ps
  goto :fail
)
goto :wait_api

:api_ready
echo [5/5] HYDRA esta operacional.
echo.
echo Dashboard: http://localhost:5173
echo API:       http://localhost:3000
echo Docs:      http://localhost:3000/docs
echo.
start "" "http://localhost:5173"
echo Esta janela pode ser fechada. Os servicos continuarao ativos.
pause
exit /b 0

:fail
echo.
echo Inicializacao interrompida. Nenhum dado foi apagado.
pause
exit /b 1
