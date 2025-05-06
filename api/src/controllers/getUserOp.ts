import { PrismaClient } from '@prisma/client'
import { Request, Response } from 'express'

const prisma = new PrismaClient()
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export const getUserOpController = async (req: Request, res: Response) => {
  try {
    const { address, dateRange, limit, offset, sortBy, sortOrder } = req.query

    if (!address) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: wallet address is required',
      })
      return
    }

    // dateRangeのパース
    let parsedDateRange
    if (dateRange) {
      try {
        parsedDateRange = JSON.parse(dateRange as string)
      } catch {
        res.status(400).json({
          success: false,
          message: 'Invalid dateRange format',
        })
        return
      }
    }

    // セキュリティの観点からデフォルトの取得条件を指定する
    const take = Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT)

    const userOps = await prisma.userOperation.findMany({
      where: {
        sender: address as string,
        ...(parsedDateRange && parsedDateRange.from && parsedDateRange.to
          ? {
              blockTimestamp: {
                gte: parsedDateRange.from,
                lte: parsedDateRange.to,
              },
            }
          : {}),
      },
      orderBy: sortBy
        ? { [sortBy as string]: sortOrder === 'desc' ? 'desc' : 'asc' }
        : { blockTimestamp: 'desc' },
      skip: offset ? Number(offset) : 0,
      take: take,
    })

    // BigIntをstringに変換
    const responseData = userOps.map(op => ({
      ...op,
      nonce: op.nonce.toString(),
      blockNumber: op.blockNumber.toString(),
      blockTimestamp: op.blockTimestamp.toString(),
    }))

    res.status(200).json({
      success: true,
      message: 'UserOperation fetched successfully',
      data: responseData,
    })
    return
  } catch (error) {
    console.error('Error fetching UserOperation:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return
  }
}
