// hooks/useEstimateUserOperationGas.ts
import { useCallback } from 'react'
import { bundlerClient, publicClient } from '../utils/client'
import { ENTRY_POINT_V08_ADDRESS } from '../constants/addresses'
import type { UserOperationV08 } from '../lib/userOperationType'
import { formatEther } from 'viem'

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
      // --- 1) ネットワーク手数料の取得（BigInt） ---
      const fees = await publicClient.estimateFeesPerGas()
      const maxFeePerGasBI = fees.maxFeePerGas ?? 0n
      const maxPriorityFeePerGasBI = fees.maxPriorityFeePerGas ?? 0n

      // --- 2) ダミー署名をセットして見積り ---
      // v0.8 の多くの bundler 実装は署名の妥当長チェックのみ行うため、ダミーでOK
      const dummySig =
        '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c' as const

      const dummyUserOp: UserOperationV08 = {
        ...userOp,
        maxFeePerGas: `0x${maxFeePerGasBI.toString(16)}`,
        maxPriorityFeePerGas: `0x${maxPriorityFeePerGasBI.toString(16)}`,
        signature: dummySig,
      }

      // --- 3) Bundler でガス見積り（Unpacked + v0.8 EP）---
      // NOTE: viem の low-level request を使う（bundlerActions を使う場合は .estimateUserOperationGas が同義）
      const gasEstimation = await (bundlerClient as any).request({
        method: 'eth_estimateUserOperationGas',
        params: [dummyUserOp, ENTRY_POINT_V08_ADDRESS],
      })

      // 返却が hex 文字列で来る想定。未返却なら元値を用いる
      const callGasLimitHex =
        (gasEstimation?.callGasLimit as `0x${string}`) ?? (userOp.callGasLimit as `0x${string}`)
      const verificationGasLimitHex =
        (gasEstimation?.verificationGasLimit as `0x${string}`) ??
        (userOp.verificationGasLimit as `0x${string}`)
      const preVerificationGasHex =
        (gasEstimation?.preVerificationGas as `0x${string}`) ??
        (userOp.preVerificationGas as `0x${string}`)

      // --- 4) 合計コスト計算 ---
      const callGas = BigInt(callGasLimitHex)
      const verificationGas = BigInt(verificationGasLimitHex)
      const preVerificationGas = BigInt(preVerificationGasHex)
      const totalGas = callGas + verificationGas + preVerificationGas

      const totalGasWei = totalGas * maxFeePerGasBI
      const totalGasEth = formatEther(totalGasWei)

      // --- 5) userOp を上書きして返す（署名はダミーのまま）---
      const userOpResult: UserOperationV08 = {
        ...userOp,
        callGasLimit: callGasLimitHex,
        verificationGasLimit: verificationGasLimitHex,
        preVerificationGas: preVerificationGasHex,
        maxFeePerGas: `0x${maxFeePerGasBI.toString(16)}`,
        maxPriorityFeePerGas: `0x${maxPriorityFeePerGasBI.toString(16)}`,
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

      // 失敗時は入力をそのまま返す（費用は0）
      const fallback: GasEstimationResult = {
        callGasLimit: userOp.callGasLimit as `0x${string}`,
        verificationGasLimit: userOp.verificationGasLimit as `0x${string}`,
        preVerificationGas: userOp.preVerificationGas as `0x${string}`,
        maxFeePerGas: userOp.maxFeePerGas as `0x${string}`,
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas as `0x${string}`,
        totalGasWei: 0n,
        totalGasEth: '0',
      }
      return { userOpResult: userOp, gas: fallback }
    }
  }, [])

  return { estimateUserOperationGas }
}
