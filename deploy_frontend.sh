#!/bin/bash
set -euo pipefail

GCP_PROJECT_ID="aa-dashboard-457316"
REGION="asia-northeast1"
FRONTEND_SERVICE_NAME="aa-dashboard-frontend"
SOURCE_DIR="./aa-front"
REPO="asia-northeast1-docker.pkg.dev/${GCP_PROJECT_ID}/cloud-run-source-deploy"
IMAGE="${REPO}/${FRONTEND_SERVICE_NAME}:latest"

# --- ビルド時の環境変数設定（Cloud Build substitutions） ---
SUBS="_NEXT_PUBLIC_PIMLICO_API_KEY=pim_DTxy8ZLRukyrD7tWAoJoaF"
SUBS="${SUBS},_NEXT_PUBLIC_ALCHEMY_API_KEY=3aWVFKmukdYKkVJJp-jqN67y2Zl3Jf4M"
SUBS="${SUBS},_NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=99b15bcb8521939fe789664e3b673c41"
SUBS="${SUBS},_NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=BJfMKyJlZQ8FpNDJMDQACOFh8ovB83MSaOoIS9uiWUDqSSI2JsSDYrPQWMdm1jvudXvAFXySyVrnZNlWGdLdW40"
SUBS="${SUBS},_NEXT_PUBLIC_BACKEND_API_BASE_URL=https://backend-api-429781279541.asia-northeast1.run.app"

echo "--- Cloud Build で Docker イメージをビルド ---"
# cloudbuild.yaml がリポジトリ直下にあるので、submit 対象は "." にする
gcloud builds submit . \
  --project="${GCP_PROJECT_ID}" \
  --region="asia-northeast1" \
  --config=cloudbuild.yaml \
  --substitutions="${SUBS}"

echo "--- Cloud Run にデプロイ ---"
gcloud run deploy "${FRONTEND_SERVICE_NAME}" \
  --project="${GCP_PROJECT_ID}" \
  --region="${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --image "${IMAGE}"

echo "--- デプロイ完了 ---"
gcloud run services list --region "${REGION}" --project="${GCP_PROJECT_ID}"
