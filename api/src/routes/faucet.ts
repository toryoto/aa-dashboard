import express from 'express'
import { handleFaucetRequest } from '../controllers/faucetController'

const faucetRoutes = express.Router()

faucetRoutes.post('/faucet', handleFaucetRequest)

export default faucetRoutes
