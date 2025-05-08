import express from 'express'
import asyncHandler from 'express-async-handler'
import { saveUserOpController } from '../controllers/saveUserOpController'
import { getUserOpController } from '../controllers/getUserOp'

const userOpRouter = express.Router()

userOpRouter.post('/saveUserOp', asyncHandler(saveUserOpController))
userOpRouter.get('/getUserOp', asyncHandler(getUserOpController))

export default userOpRouter
