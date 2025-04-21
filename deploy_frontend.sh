#!/bin/bash
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
# NEXT_PUBLIC_BACKEND_API_BASE_URL="https://backend-api-429781279541.asia-northeast1.run.app"
NEXT_PUBLIC_BACKEND_API_BASE_URL="/api"

# --- 本番環境で Cloud Run (サーバーサイド) で必要な環境変数 ---
CLOUD_RUN_ENV_VARS="NODE_ENV=production"

FIREBASE_PUBLIC_DIR="public_deploy"

set -e
echo "Starting frontend deployment process..."
echo "----------------------------------------"

# --- [1/5] Building Docker image (${IMAGE_NAME}:${IMAGE_TAG}) ---
echo "Building Docker image (target: runner)..."
echo "--- Docker Build Arguments ---"
echo "WALLETCONNECT_PROJECT_ID: ${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID}"

docker build \
  --no-cache \
  --platform=linux/amd64 \
  --target runner \
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

# --- [2/5] Pushing Docker image to Artifact Registry ---
echo "Configuring Docker authentication for ${GAR_LOCATION}-docker.pkg.dev..."
gcloud auth configure-docker "${GAR_LOCATION}-docker.pkg.dev" --quiet

echo "Pushing image: ${IMAGE_NAME}:${IMAGE_TAG}"
docker push "${IMAGE_NAME}:${IMAGE_TAG}"
echo "Docker image pushed."
echo "----------------------------------------"

# --- [3/5] Deploying to Cloud Run (${CLOUD_RUN_SERVICE_ID}) ---
ENV_VAR_OPTION="--update-env-vars=${CLOUD_RUN_ENV_VARS}"
SECRET_OPTION=""

echo "Deploying image ${IMAGE_NAME}:${IMAGE_TAG} to Cloud Run..."
gcloud run deploy "${CLOUD_RUN_SERVICE_ID}" \
  --project="${GCP_PROJECT_ID}" \
  --image="${IMAGE_NAME}:${IMAGE_TAG}" \
  --region="${REGION}" \
  --platform=managed \
  --port=3000 \
  --allow-unauthenticated \
  "${ENV_VAR_OPTION}" \
  ${SECRET_OPTION:-}

echo "Cloud Run deployment initiated. Waiting for completion..."
sleep 15

SERVICE_URL=$(gcloud run services describe "${CLOUD_RUN_SERVICE_ID}" --region="${REGION}" --project="${GCP_PROJECT_ID}" --format='value(status.url)')
echo "Cloud Run deployment completed. Service URL: ${SERVICE_URL}"
echo "----------------------------------------"

# ★★★ 変更点: ステップ [4/5] 静的ファイルを Docker イメージから抽出 ★★★
echo "--- [4/5] Extracting static files from Docker image ---"

echo "Creating temporary container to extract static files..."
if ! docker image inspect "${IMAGE_NAME}:${IMAGE_TAG}" > /dev/null 2>&1; then
  echo "Error: Docker image ${IMAGE_NAME}:${IMAGE_TAG} not found locally."
  exit 1
fi
TEMP_CONTAINER_ID=$(docker create "${IMAGE_NAME}:${IMAGE_TAG}")

echo "Preparing directory: ${FIREBASE_PUBLIC_DIR}"
rm -rf "${FIREBASE_PUBLIC_DIR}"
mkdir "${FIREBASE_PUBLIC_DIR}"
mkdir -p "${FIREBASE_PUBLIC_DIR}/_next"

echo "Copying static assets from container ${TEMP_CONTAINER_ID}..."

if docker cp "${TEMP_CONTAINER_ID}:/app/public/." "${FIREBASE_PUBLIC_DIR}/" > /dev/null 2>&1; then
  echo "Copied files from /app/public."
else
  echo "Warning: /app/public not found in container or copy failed. Check Dockerfile runner stage if needed."
fi

if docker cp "${TEMP_CONTAINER_ID}:/app/.next/static/." "${FIREBASE_PUBLIC_DIR}/_next/static/" > /dev/null 2>&1; then
  echo "Copied files from /app/.next/static."
fi

echo "Removing temporary container ${TEMP_CONTAINER_ID}..."
docker rm "${TEMP_CONTAINER_ID}"

echo "Static assets prepared in ${FIREBASE_PUBLIC_DIR}."
echo "----------------------------------------"

# ★★★ 変更点: ステップ [5/5] Firebase Hosting へデプロイ ★★★
echo "--- [5/5] Deploying static assets to Firebase Hosting ---"
echo "Deploying static assets to Firebase Hosting (Project: ${FIREBASE_PROJECT_ID})..."

if [ -d "${FIREBASE_PUBLIC_DIR}/_next/static" ] || [ "$(ls -A ${FIREBASE_PUBLIC_DIR} | grep -v '_next')" ]; then
  firebase deploy --only hosting --project "${FIREBASE_PROJECT_ID}"
else
  echo "Warning: No static assets found in ${FIREBASE_PUBLIC_DIR} to deploy to Firebase Hosting. Skipping deployment."
fi

echo "--- Frontend Deployment Script Finished ---"