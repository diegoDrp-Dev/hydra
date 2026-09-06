@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Koryn Security Platform - Encerrar

echo Encerrando os servicos Koryn...
docker compose down --remove-orphans
if errorlevel 1 (
  echo [ERRO] Nao foi possivel encerrar todos os servicos.
  pause
  exit /b 1
)

echo Koryn encerrado. Os dados persistentes foram preservados.
pause
