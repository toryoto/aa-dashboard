# ---- Developer Stage ----
FROM node:20-alpine AS dev
WORKDIR /app

RUN apk add --no-cache python3 make g++ gcc

COPY aa-front/package.json aa-front/package-lock.json* ./

RUN npm config set engine-strict false
RUN npm config set legacy-peer-deps true

RUN npm ci

ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ARG NEXT_PUBLIC_ALCHEMY_API_KEY
ARG NEXT_PUBLIC_PIMLICO_API_KEY
ARG NEXT_PUBLIC_WEB3AUTH_CLIENT_ID
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ENV NEXT_PUBLIC_ALCHEMY_API_KEY=$NEXT_PUBLIC_ALCHEMY_API_KEY
ENV NEXT_PUBLIC_PIMLICO_API_KEY=$NEXT_PUBLIC_PIMLICO_API_KEY
ENV NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=$NEXT_PUBLIC_WEB3AUTH_CLIENT_ID
ENV NODE_OPTIONS="--max-old-space-size=4096"

# 開発環境の場合はここでnpm run devを実行
CMD ["npm", "run", "dev"]

# ---- Builder Stage ----
FROM dev AS builder
WORKDIR /app

# ソースコードをコピー
COPY aa-front .

# ビルド実行
RUN npm run build

# ---- Runner Stage ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S -u 1001 -g nodejs nodejs

COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
# COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static

USER nodejs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]