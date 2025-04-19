import { NextRequest, NextResponse } from 'next/server'
import { privateKeyToAccount } from 'viem/accounts'
import { getContract, Hex } from 'viem'
import { verifyingPaymasterAbi } from '../abi/verifyingPaymaster'
import { publicClient } from '../utils/viem'
import type { UserOperation } from '../types/userOperationType'

const PAYMASTER_PRIVATE_KEY = process.env.PAYMASTER_PRIVATE_KEY
const PAYMASTER_ADDRESS = process.env.PAYMASTER_ADDRESS

if (!PAYMASTER_PRIVATE_KEY || !PAYMASTER_ADDRESS) {
  throw new Error('Required environment variables are not set')
}

const paymasterAccount = privateKeyToAccount(PAYMASTER_PRIVATE_KEY as `0x${string}`)

const encodePaymasterAndData = ({ paymaster, data }: { paymaster: Hex; data: Hex }) => {
  const encoded = `${paymaster.replace('0x', '')}${data.replace('0x', '')}`
  return `0x${encoded}` as Hex
}

const validateUserOp = (userOp: UserOperation): boolean => {
  const requiredFields = [
    'sender',
    'nonce',
    'initCode',
    'callData',
    'callGasLimit',
    'verificationGasLimit',
    'preVerificationGas',
    'maxFeePerGas',
    'maxPriorityFeePerGas',
    'signature',
  ]

  return requiredFields.every(field => field in userOp)
}

export const generatePaymasterData = async (req: any, res: any) => {
  try {
    const { userOp } = req.body
    console.log(userOp)

    if (!userOp || !validateUserOp(userOp)) {
      return res.status(400).json({ error: 'Invalid UserOperation provided' })
    }

    const verifyingPaymaster = getContract({
      address: PAYMASTER_ADDRESS as `0x${string}`,
      abi: verifyingPaymasterAbi,
      client: publicClient,
    })

    const userOpHash = await verifyingPaymaster.read.getHash([userOp])

    const signature = await paymasterAccount.signMessage({
      message: {
        raw: userOpHash as `0x${string}`,
      },
    })

    const paymasterAndData = encodePaymasterAndData({
      paymaster: PAYMASTER_ADDRESS as Hex,
      data: signature,
    })

    return res.status(200).json({
      paymasterAndData,
      hash: userOpHash,
      signature,
    })
  } catch (error) {
    console.error('Error in paymaster API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}