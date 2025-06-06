# ---- Developer Stage ----
FROM node:20-alpine AS dev
WORKDIR /app

# ネイティブモジュールを使用するために必要
RUN apk add --no-cache python3 make g++ gcc

# モジュールインストールのためにコンテナ内にコピー
COPY package.json package-lock.json* ./

# npmのバージョン警告やpeerDepsエラーを緩和
RUN npm config set engine-strict false
RUN npm config set legacy-peer-deps true

RUN npm ci

# 開発環境の場合はここでnpm run devを実行
CMD ["npm", "run", "dev"]

# ---- Builder Stage ----
# すでにインストールされた依存関係を活用
FROM dev AS builder
WORKDIR /app

ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ARG NEXT_PUBLIC_ALCHEMY_API_KEY
ARG NEXT_PUBLIC_PIMLICO_API_KEY
ARG NEXT_PUBLIC_WEB3AUTH_CLIENT_ID
ARG NEXT_PUBLIC_BACKEND_API_BASE_URL

ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ENV NEXT_PUBLIC_ALCHEMY_API_KEY=$NEXT_PUBLIC_ALCHEMY_API_KEY
ENV NEXT_PUBLIC_PIMLICO_API_KEY=$NEXT_PUBLIC_PIMLICO_API_KEY
ENV NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=$NEXT_PUBLIC_WEB3AUTH_CLIENT_ID
ENV NEXT_PUBLIC_BACKEND_API_BASE_URL=$NEXT_PUBLIC_BACKEND_API_BASE_URL
ENV NODE_ENV=production

# ソースコードをコピー
COPY . .

# ビルド実行
RUN npm run build

# ---- Runner Stage ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs
RUN adduser -S -u 1001 -g nodejs nodejs

# ビルド済みの成果物だけを最終（本番用）イメージに含める
COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static

USER nodejs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]