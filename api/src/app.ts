import express from 'express'
import paymasterRoutes from './routes/paymaster'
import cors from 'cors'
import faucetRoutes from './routes/faucet'
import userOpRouter from './routes/userOp'

const app = express()

const allowedOrigins = ['http://localhost:3000', 'https://aa-dashboard-457316.web.app']

const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: 'GET, POST, PUT, DELETE, OPTIONS',
  allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept',
  credentials: true,
}

app.use(cors(corsOptions))

app.use(express.json())

app.use('/api', paymasterRoutes)
app.use('/api', faucetRoutes)
app.use('/api', userOpRouter)

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'Not allowed by CORS' })
  } else {
    res.status(500).json({ error: 'Something went wrong!' })
  }
})

export default app
