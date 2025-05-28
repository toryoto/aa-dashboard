import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { serializeBigInt } from '../utils/bigintSerialization'

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

    if (!userOpHash || !sender || !transactionHash) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: userOpHash, sender, transactionHash are required',
      })
      return
    }

    // 16進数の文字列（0xで始まる）をBigIntに変換
    const parsedNonce = nonce.startsWith('0x') ? BigInt(nonce) : BigInt(nonce)

    const userOperation = await prisma.userOperation.create({
      data: {
        userOpHash,
        sender,
        nonce: parsedNonce,
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

    // json.stringfy()はBigIntをサポートしていないからBitIntをstringにして返す
    const responseData = serializeBigInt({
      id: userOperation.id,
      userOpHash: userOperation.userOpHash,
      sender: userOperation.sender,
      nonce: userOperation.nonce,
      success: userOperation.success,
      transactionHash: userOperation.transactionHash,
      blockNumber: userOperation.blockNumber,
      blockTimestamp: userOperation.blockTimestamp,
      paymentMethod: userOperation.paymentMethod,
    })

    res.status(201).json({
      success: true,
      message: 'UserOperation saved successfully',
      data: responseData,
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
