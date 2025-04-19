// ルートのルータ
import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { router } from './trpc'
import { paymasterRouter } from './routers/paymaster'
import * as dotenv from 'dotenv'

dotenv.config()

// ルートルーターの作成
const appRouter = router({
  paymaster: paymasterRouter,
})

// Express アプリケーションの作成
const app = express()

// ミドルウェアの設定
app.use(cors())
app.use(express.json())

// tRPC ミドルウェアの設定
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
  })
)

// サーバーの起動
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}/trpc`)
})

export type AppRouter = typeof appRouter