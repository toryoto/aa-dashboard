import express from 'express'
import { generatePaymasterData } from '../controllers/paymasterController'

const router = express.Router()

router.post('/generatePaymasterData', generatePaymasterData)

export default router
