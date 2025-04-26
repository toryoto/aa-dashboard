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

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

RUN npm ci --only=production

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# DBの本番用デプロイ
# RUN npx prisma migrate deploy

# ポート設定と起動コマンド
EXPOSE 4000
# CMD ["npm", "start"]
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
