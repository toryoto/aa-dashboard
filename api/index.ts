import app from './src/app'
import dotenv from 'dotenv'

dotenv.config()

const PORT = Number(process.env.PORT) || 4000

// 0.0.0.0を指定することで、サーバーはすべてのネットワークインターフェース（IPv4）でリクエストを受けつける
// Dockerのコンテナ環境で実行する場合、0.0.0.0は必須
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})
