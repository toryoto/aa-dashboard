import { createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { publicClient } from '../utils/client'
import dotenv from 'dotenv'
import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'

dotenv.config()

const FAUCET_ADMIN_PRIVATE_KEY = process.env.FAUCET_ADMIN_PRIVATE_KEY as `0x${string}`

const account = privateKeyToAccount(FAUCET_ADMIN_PRIVATE_KEY)
const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`),
})

const checkAccessLimit = async (walletAddress: string, ipAddress: string, func: string) => {
  const now = new Date()
  const limitWindow = 24 * 60 * 60 * 1000 // 24時間

  return await prisma.$transaction(
    async tx => {
      // IPアドレスの制限
      const ipRecord = await tx.accessLimit.findUnique({
        where: {
          idx_identifier_type_feature: {
            identifier: ipAddress,
            identifierType: 'ip',
            feature: func,
          },
        },
      })

      if (ipRecord) {
        const elapsed = now.getTime() - new Date(ipRecord.firstRequestAt).getTime()
        if (elapsed < limitWindow) {
          if (ipRecord.requestCount >= 3) {
            return { limited: true, reason: 'ip' }
          }
          // カウントをインクリメント
          await tx.accessLimit.update({
            where: { id: ipRecord.id },
            data: { requestCount: { increment: 1 } },
          })
        } else {
          // 前回のリクエストから24時間経過していればリセット
          await tx.accessLimit.update({
            where: { id: ipRecord.id },
            data: { firstRequestAt: now, requestCount: 1 },
          })
        }
      } else {
        await tx.accessLimit.create({
          data: {
            identifier: ipAddress,
            identifierType: 'ip',
            feature: func,
            firstRequestAt: now,
            requestCount: 1,
          },
        })
      }

      // ウォレットアドレスの制限
      const walletRecord = await tx.accessLimit.findUnique({
        where: {
          idx_identifier_type_feature: {
            identifier: walletAddress,
            identifierType: 'wallet',
            feature: func,
          },
        },
      })

      if (walletRecord) {
        const elapsed = now.getTime() - new Date(walletRecord.firstRequestAt).getTime()
        if (elapsed < limitWindow) {
          if (walletRecord.requestCount >= 1) {
            return { limited: true, reason: 'wallet' }
          }
          await tx.accessLimit.update({
            where: { id: walletRecord.id },
            data: { requestCount: { increment: 1 } },
          })
        } else {
          // 前回のリクエストから24時間経過していればリセット
          await tx.accessLimit.update({
            where: { id: walletRecord.id },
            data: { firstRequestAt: now, requestCount: 1 },
          })
        }
      } else {
        await tx.accessLimit.create({
          data: {
            identifier: walletAddress,
            identifierType: 'wallet',
            feature: func,
            firstRequestAt: now,
            requestCount: 1,
          },
        })
      }

      return { limited: false }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  )
}

export const handleFaucetRequest = async (req: any, res: any) => {
  try {
    const { walletAddress } = req.body

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid Wallet Address' })
    }

    // tx実行前にDBチェックをして短時間のAPIコールを対策
    const { limited, reason } = await checkAccessLimit(walletAddress, req.ip, 'faucet')
    if (limited) {
      return res.status(429).json({ error: `Request limit exceeded for ${reason}` })
    }

    const hash = await walletClient.sendTransaction({
      to: walletAddress as `0x${string}`,
      value: parseEther('0.001'),
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    console.log(receipt)

    return res.status(200).json({
      status: 'success',
      txHash: hash,
      message: '0.01 Sepolia ETH has been sent',
    })
  } catch (error) {
    console.error('Faucet API error:', error)
    return res.status(500).json({ error: 'Internal server error occurred' })
  }
}
