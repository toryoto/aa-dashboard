import { useCallback } from 'react'
import { bundlerClient, publicClient } from '../utils/client'
import { ENTRY_POINT_V08_ADDRESS } from '../constants/addresses'
import type { UserOperationV08 } from '../lib/userOperationType'
import {
  HEX_ZERO,
  HEX_EMPTY,
  DEFAULT_CALL_GAS_LIMIT,
  DEFAULT_VERIFICATION_GAS_LIMIT,
  DEFAULT_PRE_VERIFICATION_GAS,
  FALLBACK_FEE_1_GWEI,
  buildDummySignature,
  getValidGasValue,
  calcTotals,
} from '../utils/aaV08'

export interface GasEstimationResult {
  callGasLimit: `0x${string}`
  verificationGasLimit: `0x${string}`
  preVerificationGas: `0x${string}`
  maxFeePerGas: `0x${string}`
  maxPriorityFeePerGas: `0x${string}`
  totalGasWei: bigint
  totalGasEth: string
}

export function useEstimateUserOperationGas() {
  const estimateUserOperationGas = useCallback(async (userOp: UserOperationV08) => {
    try {
      const fees = await publicClient.estimateFeesPerGas()
      const maxFeePerGasBI = fees.maxFeePerGas ?? 0n
      const maxPriorityFeePerGasBI = fees.maxPriorityFeePerGas ?? 0n

      const dummyUserOp: UserOperationV08 = {
        ...userOp,
        maxFeePerGas: `0x${maxFeePerGasBI.toString(16)}` as `0x${string}`,
        maxPriorityFeePerGas: `0x${maxPriorityFeePerGasBI.toString(16)}` as `0x${string}`,
        signature: buildDummySignature(),
      }

      const gasEstimation = await (bundlerClient as any).request({
        method: 'eth_estimateUserOperationGas',
        params: [dummyUserOp, ENTRY_POINT_V08_ADDRESS],
      })

      console.log('Gas estimation response:', gasEstimation)

      const isEmptyCallData = !userOp.callData || userOp.callData === HEX_EMPTY

      const callGasLimitHex: `0x${string}` = isEmptyCallData
        ? HEX_ZERO
        : getValidGasValue(gasEstimation?.callGasLimit, DEFAULT_CALL_GAS_LIMIT)

      const verificationGasLimitHex: `0x${string}` = getValidGasValue(
        gasEstimation?.verificationGasLimit,
        DEFAULT_VERIFICATION_GAS_LIMIT
      )

      const preVerificationGasHex: `0x${string}` = getValidGasValue(
        gasEstimation?.preVerificationGas,
        DEFAULT_PRE_VERIFICATION_GAS
      )

      const { totalGasWei, totalGasEth } = calcTotals(
        callGasLimitHex,
        verificationGasLimitHex,
        preVerificationGasHex,
        maxFeePerGasBI
      )

      const userOpResult: UserOperationV08 = {
        ...userOp,
        callGasLimit: callGasLimitHex,
        verificationGasLimit: verificationGasLimitHex,
        preVerificationGas: preVerificationGasHex,
        maxFeePerGas: `0x${maxFeePerGasBI.toString(16)}` as `0x${string}`,
        maxPriorityFeePerGas: `0x${maxPriorityFeePerGasBI.toString(16)}` as `0x${string}`,
      }

      const result: GasEstimationResult = {
        callGasLimit: callGasLimitHex,
        verificationGasLimit: verificationGasLimitHex,
        preVerificationGas: preVerificationGasHex,
        maxFeePerGas: userOpResult.maxFeePerGas,
        maxPriorityFeePerGas: userOpResult.maxPriorityFeePerGas,
        totalGasWei,
        totalGasEth,
      }

      return { userOpResult, gas: result }
    } catch (error) {
      console.warn('Gas estimation failed, using default values:', error)

      const userOpResult: UserOperationV08 = {
        ...userOp,
        callGasLimit: DEFAULT_CALL_GAS_LIMIT,
        verificationGasLimit: DEFAULT_VERIFICATION_GAS_LIMIT,
        preVerificationGas: DEFAULT_PRE_VERIFICATION_GAS,
        maxFeePerGas: FALLBACK_FEE_1_GWEI,
        maxPriorityFeePerGas: FALLBACK_FEE_1_GWEI,
      }

      const fallback: GasEstimationResult = {
        callGasLimit: DEFAULT_CALL_GAS_LIMIT,
        verificationGasLimit: DEFAULT_VERIFICATION_GAS_LIMIT,
        preVerificationGas: DEFAULT_PRE_VERIFICATION_GAS,
        maxFeePerGas: FALLBACK_FEE_1_GWEI,
        maxPriorityFeePerGas: FALLBACK_FEE_1_GWEI,
        totalGasWei: 0n,
        totalGasEth: '0',
      }

      return { userOpResult, gas: fallback }
    }
  }, [])

  return { estimateUserOperationGas }
}
