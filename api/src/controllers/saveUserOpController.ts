import { PrismaClient } from '@prisma/client'
import { Request, Response } from 'express'

const prisma = new PrismaClient()

export const saveUserOpController = async (req: Request, res: Response) => {
  try {
    const {
      userOpHash,
      sender,
      nonce,
      success,
      transactionHash,
      blockNumber,
      blockTimestamp,
      calldata,
      paymentMethod,
      error,
      initCode,
    } = req.body

    // UserOpテーブルの必須フィールドの検証
    if (!userOpHash || !sender || !transactionHash) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: userOpHash, sender, transactionHash are required',
      })
      return
    }

    // すでにUseropを保存しているかのチェック
    const existingUserOp = await prisma.userOperation.findUnique({
      where: { userOpHash },
    })

    if (existingUserOp) {
      res.status(409).json({
        success: false,
        message: 'UserOperation with this hash already exists',
      })
      return 
    }

    // DBに保存
    const userOperation = await prisma.userOperation.create({
      data: {
        userOpHash,
        sender,
        nonce: BigInt(nonce),
        success,
        transactionHash,
        blockNumber: BigInt(blockNumber),
        blockTimestamp: BigInt(blockTimestamp),
        calldata,
        paymentMethod,
        error,
        initCode,
      },
    })

    res.status(201).json({
      success: true,
      message: 'UserOperation saved successfully',
      data: userOperation,
    })
    return 
  } catch (error) {
    console.error('Error saving UserOperation:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return 
  }
}