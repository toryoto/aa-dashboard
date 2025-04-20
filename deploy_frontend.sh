#!/bin/bash

# --- 設定項目 ---
GCP_PROJECT_ID="aa-dashboard-457316"
FIREBASE_PROJECT_ID="aa-dashboard-457316"
REGION="asia-northeast1"
GAR_LOCATION="asia-northeast1"

FRONTEND_SOURCE_DIR="./aa-front"
FRONTEND_DOCKERFILE="${FRONTEND_SOURCE_DIR}/Dockerfile"
CLOUD_RUN_SERVICE_ID="nextjs-frontend-service"
IMAGE_NAME="${GAR_LOCATION}-docker.pkg.dev/${GCP_PROJECT_ID}/cloudrun/${CLOUD_RUN_SERVICE_ID}"
IMAGE_TAG="manual-$(date +%Y%m%d%H%M%S)"

# --- 本番環境用の NEXT_PUBLIC_ 変数 ---
NEXT_PUBLIC_PIMLICO_API_KEY="pim_DTxy8ZLRukyrD7tWAoJoaF"
NEXT_PUBLIC_ALCHEMY_API_KEY="3aWVFKmukdYKkVJJp-jqN67y2Zl3Jf4M"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="99b15bcb8521939fe789664e3b673c41"
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID="BJfMKyJlZQ8FpNDJMDQACOFh8ovB83MSaOoIS9uiWUDqSSI2JsSDYrPQWMdm1jvudXvAFXySyVrnZNlWGdLdW40"
NEXT_PUBLIC_BACKEND_API_BASE_URL="https://backend-api-429781279541.asia-northeast1.run.app"

# --- 本番環境で Cloud Run (サーバーサイド) で必要な環境変数 ---
CLOUD_RUN_ENV_VARS="NODE_ENV=production"

# --- Firebase Hosting デプロイ用ディレクトリ ---
# FIREBASE_PUBLIC_DIR="public_deploy" # 一時的にコメントアウト

# --- スクリプト本体 ---
set -e
echo "Starting frontend deployment process..."
echo "----------------------------------------"

# --- [1/4] Building Docker image (${IMAGE_NAME}:${IMAGE_TAG}) --- # ステップ番号とタイトル変更

echo "Building Docker image (target: runner)..."
# --- build-arg の値を確認 (デバッグ用) ---
echo "--- Docker Build Arguments ---"
echo "WALLETCONNECT_PROJECT_ID: ${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID}"
echo "ALCHEMY_API_KEY: ${NEXT_PUBLIC_ALCHEMY_API_KEY}"
echo "PIMLICO_API_KEY: ${NEXT_PUBLIC_PIMLICO_API_KEY}"
echo "WEB3AUTH_CLIENT_ID: ${NEXT_PUBLIC_WEB3AUTH_CLIENT_ID}"
echo "BACKEND_API_BASE_URL: ${NEXT_PUBLIC_BACKEND_API_BASE_URL}"
echo "------------------------------"

docker build \
  --no-cache \
  --platform=linux/amd64 \
  --target runner `# Build the 'runner' stage for production` \
  --build-arg NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID}" \
  --build-arg NEXT_PUBLIC_ALCHEMY_API_KEY="${NEXT_PUBLIC_ALCHEMY_API_KEY}" \
  --build-arg NEXT_PUBLIC_PIMLICO_API_KEY="${NEXT_PUBLIC_PIMLICO_API_KEY}" \
  --build-arg NEXT_PUBLIC_WEB3AUTH_CLIENT_ID="${NEXT_PUBLIC_WEB3AUTH_CLIENT_ID}" \
  --build-arg NEXT_PUBLIC_BACKEND_API_BASE_URL="${NEXT_PUBLIC_BACKEND_API_BASE_URL}" \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  -f "${FRONTEND_DOCKERFILE}" \
  "${FRONTEND_SOURCE_DIR}"

echo "Docker image built."
echo "----------------------------------------"

# --- [2/4] Pushing Docker image to Artifact Registry --- # ステップ番号変更
echo "Configuring Docker authentication for ${GAR_LOCATION}-docker.pkg.dev..."
gcloud auth configure-docker "${GAR_LOCATION}-docker.pkg.dev" --quiet # --quiet を追加推奨

echo "Pushing image: ${IMAGE_NAME}:${IMAGE_TAG}"
docker push "${IMAGE_NAME}:${IMAGE_TAG}"
echo "Docker image pushed."
echo "----------------------------------------"

# --- [3/4] Deploying to Cloud Run (${CLOUD_RUN_SERVICE_ID}) --- # ステップ番号変更
ENV_VAR_OPTION="--update-env-vars=${CLOUD_RUN_ENV_VARS}"
SECRET_OPTION=""
if [ -n "${CLOUD_RUN_SECRETS}" ]; then
  SECRET_OPTION="--update-secrets=${CLOUD_RUN_SECRETS}"
fi

echo "Deploying image ${IMAGE_NAME}:${IMAGE_TAG} to Cloud Run..."
gcloud run deploy "${CLOUD_RUN_SERVICE_ID}" \
  --project="${GCP_PROJECT_ID}" \
  --image="${IMAGE_NAME}:${IMAGE_TAG}" \
  --region="${REGION}" \
  --platform=managed \
  --port=3000 \
  --allow-unauthenticated \
  "${ENV_VAR_OPTION}" \
  ${SECRET_OPTION}

echo "Cloud Run deployment initiated. Waiting for completion..."
sleep 15

SERVICE_URL=$(gcloud run services describe "${CLOUD_RUN_SERVICE_ID}" --region="${REGION}" --project="${GCP_PROJECT_ID}" --format='value(status.url)')
echo "Cloud Run deployment completed. Service URL: ${SERVICE_URL}"
echo "----------------------------------------"

echo "----------------------------------------"
echo "--- Frontend Deployment Script Finished (Cloud Run Only) ---"