#!/bin/bash

# =======================================================
# 1. АВТОМАТИЧЕСКАЯ ОЧИСТКА ПЕРЕД ЗАПУСКОМ (Anti-Cache)
# =======================================================
# Останавливаем и удаляем контейнеры, сети, и *тома*
# из обоих возможных окружений (dev и prod).
# --volumes гарантирует удаление кэша npm, если он был в томах.
# --remove-orphans удаляет службы, которые могут быть в другом файле.
# 2>/dev/null || true предотвращает ошибки, если ничего не запущено.
echo -e "\n\033[1;33m🧹 Cleaning up previous environment...\033[0m"
docker compose -f docker-compose.dev.yml -f docker-compose.prod.yml down --volumes --remove-orphans 2>/dev/null || true
echo -e "\033[1;32m✅ Cleanup complete.\033[0m"

echo "=============================="
echo " Select environment to build:"
echo " 1) Development 🧩"
echo " 2) Production 🚀"
echo "=============================="
read -p "Enter choice [1 or 2]: " choice

if [ "$choice" = "1" ]; then
  echo -e "\n\033[1;34m🚀 Starting development environment (FORCING REBUILD without cache)...\033[0m"
  # FIX: Отделяем команду build, чтобы гарантированно передать ей флаг --no-cache.
  docker compose -f docker-compose.dev.yml build --no-cache
  # Запускаем контейнеры из только что собранного образа.
  docker compose -f docker-compose.dev.yml up -d
elif [ "$choice" = "2" ]; then
  echo -e "\n\033[1;32m🏗️ Starting production environment (FORCING REBUILD without cache)...\033[0m"
  # FIX: Отделяем команду build, чтобы гарантированно передать ей флаг --no-cache.
  docker compose -f docker-compose.prod.yml build --no-cache
  # Запускаем контейнеры из только что собранного образа.
  docker compose -f docker-compose.prod.yml up -d
else
  echo -e "\033[1;31m❌ Invalid choice\033[0m"
fi