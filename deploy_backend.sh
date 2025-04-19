#!/bin/bash
YOUR_GCP_PROJECT_ID="aa-dashboard-457316"

# Cloud Run をデプロイするリージョン (例: asia-northeast1)
REGION="asia-northeast1"

# Cloud Run サービスの名前 (任意、分かりやすい名前をつける)
BACKEND_SERVICE_NAME="backend-api"

# Dockerfile と Express.js コードがあるディレクトリ (モノレポのルートからの相対パス)
EXPRESS_SOURCE_DIR="./api"

# --- Secret Manager のシークレット名の定義 ---
# ここには Secret Manager 上の「名前」を指定します。値ではありません。
SECRET_NAME_ALCHEMY_API_KEY="ALCHEMY_API_KEY"
SECRET_NAME_PAYMASTER_PRIVATE_KEY="PAYMASTER_PRIVATE_KEY"
# 他に必要なシークレット名があればここに追加...

# --- 非秘密の環境変数の定義 ---
PAYMASTER_ADDRESS="0x415b4ceC5cf512CeDBE09C12081A0b75E13854Ff" # これは非秘密情報として扱う
NON_SECRET_ENV_VARS="NODE_ENV=production"
# 必要に応じて他の非秘密環境変数を追加
NON_SECRET_ENV_VARS="${NON_SECRET_ENV_VARS},PAYMASTER_ADDRESS=${PAYMASTER_ADDRESS}"


# --- デプロイコマンドの実行 ---

echo "--- Cloud Run サービス ${BACKEND_SERVICE_NAME} をデプロイ ---"
echo "プロジェクト: ${YOUR_GCP_PROJECT_ID}"
echo "リージョン: ${REGION}"
echo "ソースディレクトリ: ${EXPRESS_SOURCE_DIR}"

gcloud run deploy ${BACKEND_SERVICE_NAME} \
  --project=${YOUR_GCP_PROJECT_ID} `# プロジェクトを指定` \
  --source ${EXPRESS_SOURCE_DIR} `# DockerfileとExpress.jsコードがあるディレクトリ` \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated `# Firebase Hosting からアクセス可能にする` \
  --port 4000 `# Dockerfile の EXPOSE/ENV PORT と一致` \
  --update-env-vars "${NON_SECRET_ENV_VARS}" `# 非秘密の環境変数を設定 (引用符で囲むと安全)` \
  --update-secrets="ALCHEMY_API_KEY=SECRET_NAME_ALCHEMY_API_KEY:latest,PAYMASTER_PRIVATE_KEY=SECRET_NAME_PAYMASTER_PRIVATE_KEY:latest"

echo "--- デプロイコマンド実行完了 ---"
echo "Cloud Run サービスのURLがまもなく利用可能になります。"
echo "Services List: gcloud run services list --region ${REGION} --project=${YOUR_GCP_PROJECT_ID}"