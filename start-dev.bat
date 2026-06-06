@echo off
SETLOCAL
echo ============================================================
echo   HYDRA - SECURITY PLATFORM (Modo Desenvolvimento)
echo ============================================================
echo.
echo [1/2] Verificando configuracoes de seguranca...
if not exist "apps\api-gateway\.env" (
    echo [AVISO] Arquivo .env nao encontrado em apps/api-gateway/!
    echo [AVISO] O sistema pode usar credenciais padrao inseguras.
)
echo.
echo [2/3] Limpando containers antigos e volumes orfaos...
docker-compose down --remove-orphans
echo.
echo [3/3] Iniciando API, Worker, Web e Infraestrutura...
docker-compose up --build -d
echo [INFO] Sistema subindo em background. Use 'docker-compose logs -f' para acompanhar.
pause