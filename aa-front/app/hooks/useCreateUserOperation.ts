import { useCallback } from 'react'
import { toHex, Hex } from 'viem'
import { publicClient } from '../utils/client'
import { ENTRY_POINT_ADDRESS } from '../constants/addresses'
import { entryPointAbi } from '../abi/entryPoint'
import { UserOperation } from '../lib/userOperationType'

export function useCreateUserOperation() {
  /**
   * UserOperation を作成するメソッド
   */
  const createUserOperation = useCallback(
    async ({
      aaAddress,
      initCode = '0x',
      callData = '0x',
    }: {
      aaAddress: Hex
      initCode?: Hex
      callData?: Hex
    }): Promise<UserOperation> => {
      try {
        const nonce = (await publicClient.readContract({
          address: ENTRY_POINT_ADDRESS,
          abi: entryPointAbi,
          functionName: 'getNonce',
          args: [aaAddress, BigInt(0)],
        })) as bigint

        if (nonce === null) {
          throw new Error('Nonce is not fetched yet.')
        }

        return {
          sender: aaAddress,
          nonce: toHex(nonce),
          initCode,
          callData,
          callGasLimit: toHex(2_500_000),
          verificationGasLimit: toHex(1_000_000),
          preVerificationGas: toHex(200_000),
          maxFeePerGas: toHex(500_000_000),
          maxPriorityFeePerGas: toHex(200_000_000),
          paymasterAndData: '0x',
          signature: '0x',
        }
      } catch (error) {
        console.error('Error fetching nonce:', error)
        throw error
      }
    },
    []
  )

  return { createUserOperation }
}
