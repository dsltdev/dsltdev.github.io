#!/bin/bash
# DSLT - Deploy Script
# Build + deploy a GitHub Pages + purge cache de Cloudflare

set -e

PROJECT_DIR="$HOME/Projects/sites/dsltdev.github.io"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW} DSLT - Deploy${NC}"
echo ""

echo -e "${YELLOW}  1/3 Building...${NC}"
cd "$PROJECT_DIR"
npm run build > /dev/null 2>&1
echo -e "${GREEN}  ✓ Build completo${NC}"

echo -e "${YELLOW}  2/3 Git push...${NC}"
git add -A
if git diff --cached --quiet; then
    echo -e "${GREEN}  ✓ No hay cambios para commitear${NC}"
else
    git commit -m "deploy: $(date +%Y-%m-%d_%H:%M)" > /dev/null 2>&1
    git push origin main > /dev/null 2>&1
    echo -e "${GREEN}  ✓ Push completado${NC}"
fi

echo -e "${YELLOW}  3/3 Purging Cloudflare cache...${NC}"
TOKEN_B64=$(grep "ARGO TUNNEL TOKEN" "$HOME/.cloudflared/cert.pem" 2>/dev/null | head -1 | cut -d' ' -f3-)
TOKEN_JSON=$(echo "$TOKEN_B64" | base64 -d 2>/dev/null)
API_TOKEN=$(echo "$TOKEN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['apiToken'])" 2>/dev/null)
ZONE_ID=$(echo "$TOKEN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['zoneID'])" 2>/dev/null)

if [ -n "$API_TOKEN" ] && [ -n "$ZONE_ID" ]; then
    RESULT=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{"purge_everything":true}')
    SUCCESS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)
    if [ "$SUCCESS" = "True" ]; then
        echo -e "${GREEN}  ✓ Cache purgado${NC}"
    else
        echo -e "${RED}  ✗ No se pudo purgar cache${NC}"
    fi
else
    echo -e "${RED}  ✗ No se pudieron extraer credenciales del tunnel${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🚀 Deploy completado!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
