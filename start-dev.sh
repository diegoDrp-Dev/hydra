#!/bin/bash
echo "============================================================"
echo "  HYDRA - SECURITY PLATFORM (Modo Desenvolvimento)"
echo "============================================================"
echo ""
echo "[1/2] Verificando configuracoes de seguranca..."
if [ ! -f "apps/api-gateway/.env" ]; then
    echo "[AVISO] Arquivo .env nao encontrado em apps/api-gateway/!"
    echo "[AVISO] Recomendado configurar segredos antes do deploy."
fi
echo ""
echo "[2/2] Iniciando API, Worker, Web e Infraestrutura..."
echo "Pressione Ctrl+C para encerrar todos os servicos."
docker-compose up --build