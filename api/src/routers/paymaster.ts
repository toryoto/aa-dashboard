import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../trpc'
import { privateKeyToAccount } from 'viem/accounts'
import { getContract, Hex } from 'viem'
import { verifyingPaymasterAbi } from '../abi/verifyingPaymaster'
import { publicClient } from '../../utils/client'
import { UserOperation } from '../lib/userOperationType'

const paymasterAccount = privateKeyToAccount('0xad38debc539a4fe32fa7f0c47dc579ed4f55dc330fe6ea7055e7ade1e4ea7d33')

const encodePaymasterAndData = ({ paymaster, data }: { paymaster: Hex; data: Hex }) => {
  const encoded = `${paymaster.replace('0x', '')}${data.replace('0x', '')}`
  return `0x${encoded}` as Hex
}

// const validateUserOp = (userOp: UserOperation): boolean => {
//   const requiredFields = [
//     'sender',
//     'nonce',
//     'initCode',
//     'callData',
//     'callGasLimit',
//     'verificationGasLimit',
//     'preVerificationGas',
//     'maxFeePerGas',
//     'maxPriorityFeePerGas',
//     'signature',
//   ]

//   return requiredFields.every(field => field in userOp)
// }

export const paymasterRouter = router({
  generatePaymasterData: publicProcedure
    .input(
      z.object({
        userOp: z.object({
          sender: z.string(),
          nonce: z.string(),
          initCode: z.string(),
          callData: z.string(),
          callGasLimit: z.string(),
          verificationGasLimit: z.string(),
          preVerificationGas: z.string(),
          maxFeePerGas: z.string(),
          maxPriorityFeePerGas: z.string(),
          signature: z.string()
        })
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { userOp } = input
        console.log(userOp)

        const verifyingPaymaster = getContract({
          address: process.env.PAYMASTER_ADDRESS as Hex,
          abi: verifyingPaymasterAbi,
          client: publicClient,
        })

        const userOpHash = await verifyingPaymaster.read.getHash([userOp as UserOperation])

        const signature = await paymasterAccount.signMessage({
          message: {
            raw: userOpHash as `0x${string}`,
          },
        })

        const paymasterAndData = encodePaymasterAndData({
          paymaster: process.env.PAYMASTER_ADDRESS as Hex,
          data: signature,
        })

        return {
          paymasterAndData,
          hash: userOpHash,
          signature,
        }
      } catch (error) {
        console.error('Error in paymaster API:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          cause: error
        })
      }
    })
})