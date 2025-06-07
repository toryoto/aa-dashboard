import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { serializeBigIntArray } from '../utils/bigintSerialization'
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export const getUserOpController = async (req: Request, res: Response) => {
  try {
    const { address, dateRange, limit, offset, sortBy, sortOrder, activity } = req.query

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

    // 入力値をサニタイズ
    const take = Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT)
    const ALLOWED_SORT_FIELDS = ['blockTimestamp', 'anotherField']
    const ALLOWED_SORT_ORDERS = ['asc', 'desc']
    const sortField =
      sortBy && ALLOWED_SORT_FIELDS.includes(sortBy as string) ? sortBy : 'blockTimestamp'
    const order =
      sortOrder && ALLOWED_SORT_ORDERS.includes(sortOrder as string) ? sortOrder : 'desc'

    // Activity検索の条件を構築
    let activityFilter = {}
    if (activity && typeof activity === 'string') {
      activityFilter = {
        actionType: {
          contains: activity.toLowerCase(),
        },
      }
    }

    const userOps = await prisma.userOperation.findMany({
      where: {
        sender: address as string,
        ...activityFilter,

        // ...(parsedDateRange && parsedDateRange.from && parsedDateRange.to
        //   ? {
        //       blockTimestamp: {
        //         gte: parsedDateRange.from,
        //         lte: parsedDateRange.to,
        //       },
        //     }
        //   : {}),
      },
      orderBy: { [sortField as string]: order },
      skip: offset ? Number(offset) : 0,
      take: take,
    })

    // BigIntをstringに変換
    const responseData = serializeBigIntArray(userOps)

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
