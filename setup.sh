#!/usr/bin/env bash
# ─── RISEx Trading Platform Setup Wizard ────────────────────────────────────
# Usage: ./setup.sh
# Prompts for required secrets, writes .env, then runs docker compose up.

set -euo pipefail

ENV_FILE=".env"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          RISEx Trading Platform — Setup Wizard              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ─── Helper: read existing value from .env ───────────────────────────────────
get_existing() {
  local key="$1"
  if [ -f "$ENV_FILE" ]; then
    grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | head -1
  fi
}

# ─── Helper: prompt with default ─────────────────────────────────────────────
prompt_var() {
  local key="$1"
  local description="$2"
  local default_val="${3:-}"
  local existing
  existing=$(get_existing "$key")
  local display_default="${existing:-$default_val}"

  if [ -n "$display_default" ]; then
    read -rp "  ${description} [${display_default}]: " input
    echo "${input:-$display_default}"
  else
    read -rp "  ${description}: " input
    echo "$input"
  fi
}

echo "─── Database ─────────────────────────────────────────────────────────────"
DB_PASSWORD=$(prompt_var "DB_PASSWORD" "PostgreSQL password" "risex_password")

echo ""
echo "─── Telegram ─────────────────────────────────────────────────────────────"
TELEGRAM_BOT_TOKEN=$(prompt_var "TELEGRAM_BOT_TOKEN" "Telegram bot token (from @BotFather)")
NEXT_PUBLIC_BOT_URL=$(prompt_var "NEXT_PUBLIC_BOT_URL" "Your Telegram bot URL" "https://t.me/RiseChain_RISEx_Bot")

echo ""
echo "─── RISEx Trading Keys (EIP-712) ─────────────────────────────────────────"
ACCOUNT_PRIVATE_KEY=$(prompt_var "ACCOUNT_PRIVATE_KEY" "Account private key (main wallet, 0x...)")
SIGNER_PRIVATE_KEY=$(prompt_var "SIGNER_PRIVATE_KEY" "Signer private key (session/hot wallet, 0x...)")

echo ""
echo "─── Risechain RPC ────────────────────────────────────────────────────────"
RISECHAIN_RPC_URL=$(prompt_var "RISECHAIN_RPC_URL" "Risechain RPC URL" "https://rpc.risechain.com/")
RISECHAIN_WS_URL=$(prompt_var "RISECHAIN_WS_URL" "Risechain WebSocket URL" "wss://rpc.risechain.com/")
USDC_CONTRACT_ADDRESS=$(prompt_var "USDC_CONTRACT_ADDRESS" "USDC contract address on Risechain" "0x8a93d247134d91e0de6f96547cb0204e5be8e5d8")

echo ""
echo "─── Web Dashboard ────────────────────────────────────────────────────────"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$(prompt_var "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" "WalletConnect Project ID (https://cloud.walletconnect.com)")

echo ""
echo "─── Encryption Key ───────────────────────────────────────────────────────"
EXISTING_ENC=$(get_existing "ENCRYPTION_KEY")
if [ -z "$EXISTING_ENC" ]; then
  ENCRYPTION_KEY=$(openssl rand -hex 32)
  echo "  Generated new ENCRYPTION_KEY: ${ENCRYPTION_KEY}"
else
  ENCRYPTION_KEY="$EXISTING_ENC"
  echo "  Using existing ENCRYPTION_KEY."
fi

# ─── Write .env ──────────────────────────────────────────────────────────────
cat > "$ENV_FILE" <<EOF
# ─── Database ───────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://risex:${DB_PASSWORD}@postgres:5432/risex_db

# ─── Redis ──────────────────────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ─── Telegram Bot ───────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}

# ─── Risechain RPC ──────────────────────────────────────────────────────────────
RISECHAIN_RPC_URL=${RISECHAIN_RPC_URL}
RISECHAIN_WS_URL=${RISECHAIN_WS_URL}
RISECHAIN_CHAIN_ID=11155931
USDC_CONTRACT_ADDRESS=${USDC_CONTRACT_ADDRESS}

# ─── RISEx API ──────────────────────────────────────────────────────────────────
RISEX_API_BASE=https://api.rise.trade
RISEX_WS_URL=wss://ws.rise.trade
RISEX_API_KEY=
RISEX_API_SECRET=

# ─── RISEx EIP-712 Trading Keys ─────────────────────────────────────────────────
ACCOUNT_PRIVATE_KEY=${ACCOUNT_PRIVATE_KEY}
SIGNER_PRIVATE_KEY=${SIGNER_PRIVATE_KEY}

# ─── Security ───────────────────────────────────────────────────────────────────
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# ─── Web Dashboard ──────────────────────────────────────────────────────────────
DASHBOARD_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_RISECHAIN_RPC=${RISECHAIN_RPC_URL}
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID}
NEXT_PUBLIC_BOT_URL=${NEXT_PUBLIC_BOT_URL}

# ─── API Server ─────────────────────────────────────────────────────────────────
PORT=4000
HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:3000

# ─── Logging ────────────────────────────────────────────────────────────────────
LOG_LEVEL=info
NODE_ENV=production

# ─── Trading Engine ─────────────────────────────────────────────────────────────
WORKER_CONCURRENCY=10
EOF

echo ""
echo "✅ .env written successfully."
echo ""
echo "─── Starting services ────────────────────────────────────────────────────"
echo "  Running: docker compose up -d"
echo ""

docker compose up -d

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Setup complete! Services are starting up.                  ║"
echo "║                                                              ║"
echo "║  Web dashboard:  http://localhost:3000                      ║"
echo "║  API server:     http://localhost:4000                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
