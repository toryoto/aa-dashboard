import express from 'express'
import { saveUserOpController } from '../controllers/saveUserOpController'
import asyncHandler from 'express-async-handler'

const saveUserOpRoute = express.Router()

saveUserOpRoute.post('/saveUserOp', asyncHandler(saveUserOpController))

export default saveUserOpRoute
