import express from 'express'
import { saveUserOpController } from '../controllers/saveUserOpController'

const route = express.Router()

route.post('/saveUserOp', saveUserOpController)

export default route
