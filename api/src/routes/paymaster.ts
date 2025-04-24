import express from 'express'
import { generatePaymasterData } from '../controllers/paymasterController'

const paymasterRoutes = express.Router()

paymasterRoutes.post('/generatePaymasterData', generatePaymasterData)

export default paymasterRoutes
