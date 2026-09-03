@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title HYDRA Enterprise - Encerrar

echo Encerrando os servicos HYDRA...
docker compose down --remove-orphans
if errorlevel 1 (
  echo [ERRO] Nao foi possivel encerrar todos os servicos.
  pause
  exit /b 1
)

echo HYDRA encerrado. Os dados persistentes foram preservados.
pause
