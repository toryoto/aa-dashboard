FROM node:20-alpine

WORKDIR /app

COPY api/package.json api/package-lock.json* ./

RUN npm ci

COPY api .

RUN npm run build

ENV NODE_ENV production
ENV PORT 4000

# ポート設定と起動コマンド
EXPOSE 4000
CMD ["npm", "start"]