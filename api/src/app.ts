import express, { Request, Response, NextFunction } from 'express'
import paymasterRoutes from './routes/paymaster'

const app = express()

// ミドルウェア
app.use(express.json())

// CORS設定
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

// ルート
app.use('/api', paymasterRoutes)

// エラーハンドリング
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

export default app