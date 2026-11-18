#!/usr/bin/env bash
# Empaqueta la extensión en dist/safe-seo-<versión>.zip (solo archivos necesarios).
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
mkdir -p dist
zip -qr "dist/safe-seo-${version}.zip" manifest.json popup src icons
echo "dist/safe-seo-${version}.zip"
