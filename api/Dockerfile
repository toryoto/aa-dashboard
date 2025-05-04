# マルチステージビルド手法を使用することで、ステージごとに異なるコンテナイメージが作成される

# ---- Developer Stage ----
FROM node:20-alpine AS dev
WORKDIR /app

RUN apk add --no-cache python3 make g++ gcc

COPY package.json package-lock.json* ./

RUN npm ci

RUN npm install -g nodemon ts-node typescript

# Prisma generate を実行
COPY prisma ./prisma/
RUN npx prisma generate

# 開発環境の場合はここでnpm run devを実行
CMD ["npm", "run", "dev"]

# 本番環境はコードをコンテナ内にコピーしてからビルド
# ---- Builder Stage ----
FROM dev AS builder
WORKDIR /app

# ソースコードをコピー
COPY . .

# ビルド実行
RUN npm run build

# ---- Runner Stage ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# ビルド済みの成果物だけを最終（本番用）イメージに含める
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 本番用の依存関係（dependenciesのみ）をインストールする
RUN npm ci --only=production

# builderステージで生成された.prismaディレクトリを本番イメージにコピーする
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 以下のコマンドを実行すると、最初にDockerイメージをビルドするときに本番DBが存在しないとエラーになる
# CMDでコンテナ起動時にDBのマイグレーションを行えば問題ない
# Cloud Runのデプロイプロセスでは、ビルド時にはまだ本場用DBに接続できない状態
# RUN npx prisma migrate deploy

# ポート設定と起動コマンド
EXPOSE 4000

# 本番用データベースのマイグレーションとNode.jsサーバーを起動する
# コンテナ起動時(デプロイプロセスの一番最後)に実行される
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
