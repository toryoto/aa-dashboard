#!/bin/bash
GCP_PROJECT_ID="aa-dashboard-457316"
REGION="asia-northeast1"
BACKEND_SERVICE_NAME="backend-api"
EXPRESS_SOURCE_DIR="./api"

## Cloud SQL接続設定
CLOUD_SQL_CONNECTION_NAME="${GCP_PROJECT_ID}:${REGION}:aa-dashboard-db"

# --- 非秘密の環境変数の定義 ---
PAYMASTER_ADDRESS="0x912608fcff1a0CbD90a1c0A2C65447Ba094A53B4"
NON_SECRET_ENV_VARS="NODE_ENV=production"
NON_SECRET_ENV_VARS="${NON_SECRET_ENV_VARS},PAYMASTER_ADDRESS=${PAYMASTER_ADDRESS}"


# --- デプロイコマンドの実行 ---

echo "--- Cloud Run サービス ${BACKEND_SERVICE_NAME} をデプロイ ---"
echo "プロジェクト: ${GCP_PROJECT_ID}"
echo "リージョン: ${REGION}"
echo "ソースディレクトリ: ${EXPRESS_SOURCE_DIR}"

gcloud run deploy ${BACKEND_SERVICE_NAME} \
  --project=${GCP_PROJECT_ID} \
  --source ${EXPRESS_SOURCE_DIR} \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --port 4000 \
  --add-cloudsql-instances ${CLOUD_SQL_CONNECTION_NAME} \
  --update-env-vars "${NON_SECRET_ENV_VARS}" \
  --update-secrets="ALCHEMY_API_KEY=ALCHEMY_API_KEY:latest,PAYMASTER_PRIVATE_KEY=PAYMASTER_PRIVATE_KEY:latest,DATABASE_URL=DATABASE_URL_PROD:latest"

echo "--- デプロイコマンド実行完了 ---"
echo "Cloud Run サービスのURLがまもなく利用可能になります。"
echo "Services List: gcloud run services list --region ${REGION} --project=${GCP_PROJECT_ID}"