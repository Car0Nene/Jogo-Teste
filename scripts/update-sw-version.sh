#!/bin/bash
# Script para gerar versão dinâmica do Service Worker
# Usado pelo GitHub Actions para cache busting automático

set -e

# Capturar variáveis do GitHub Actions
GITHUB_RUN_ID="${GITHUB_RUN_ID:-local}"
GITHUB_RUN_ATTEMPT="${GITHUB_RUN_ATTEMPT:-1}"
BUILD_DATE=$(date -u +"%Y%m%d-%H%M%S")
GIT_SHA="${GITHUB_SHA:0:7}"

# Versão combinada
CACHE_VERSION="v2.1.0-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
CACHE_VERSION_SHORT="${BUILD_DATE}-${GIT_SHA}"

echo "🔄 Gerando versão dinâmica do Service Worker"
echo "   Run ID: $GITHUB_RUN_ID"
echo "   Attempt: $GITHUB_RUN_ATTEMPT"
echo "   Build Date: $BUILD_DATE"
echo "   Git SHA: $GIT_SHA"
echo "   Versão: $CACHE_VERSION"

# Atualizar sw.js na raiz
if [ -f "sw.js" ]; then
  sed -i.bak "s/const CACHE_VERSION = '[^']*'/const CACHE_VERSION = '$CACHE_VERSION'/g" sw.js
  rm -f sw.js.bak
  echo "✅ sw.js (raiz) atualizado"
fi

# Atualizar sw.js em dist (se existir)
if [ -f "prototype-2.5d/dist/sw.js" ]; then
  sed -i.bak "s/const CACHE_VERSION = '[^']*'/const CACHE_VERSION = '$CACHE_VERSION'/g" prototype-2.5d/dist/sw.js
  rm -f prototype-2.5d/dist/sw.js.bak
  echo "✅ sw.js (dist) atualizado"
fi

# Atualizar versão nos meta tags (opcional, para rastreamento visual)
if [ -f "index.html" ]; then
  sed -i.bak "s/content=\"[^\"]*version[^\"]*\"/content=\"$CACHE_VERSION\"/g" index.html
  rm -f index.html.bak
  echo "✅ index.html (raiz) atualizado com versão"
fi

echo "✅ Service Worker pronto para deploy: $CACHE_VERSION"
