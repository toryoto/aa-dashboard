import { useCallback } from 'react'
import { bundlerClient, publicClient } from '../utils/client'
import { ENTRY_POINT_ADDRESS } from '../constants/addresses'
import { UserOperation } from '../lib/userOperationType'
import { formatEther, parseGwei } from 'viem'

export interface GasEstimationResult {
  callGasLimit: string
  verificationGasLimit: string
  preVerificationGas: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  totalGasWei: bigint
  totalGasEth: string
}

export function useEstimateUserOperationGas() {
  const estimateUserOperationGas = useCallback(async (userOp: UserOperation) => {
    try {
      // ガス料金の取得
      const feeData = await publicClient.estimateFeesPerGas()
      const maxFeePerGas = feeData.maxFeePerGas
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas

      // ダミー署名の設定（シミュレーション用）
      const dummyUserOp = {
        ...userOp,
        maxFeePerGas: `0x${maxFeePerGas.toString(16)}` as `0x${string}`,
        maxPriorityFeePerGas: `0x${maxPriorityFeePerGas.toString(16)}` as `0x${string}`,
        signature:
          '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c' as `0x${string}`,
      }

      // eth_estimateUserOperationGasの呼び出し
      const gasEstimation = await bundlerClient.request({
        jsonrpc: '2.0',
        method: 'eth_estimateUserOperationGas',
        params: [dummyUserOp, ENTRY_POINT_ADDRESS],
      })

      // ガス値をBigIntに変換
      const callGasLimit = BigInt(gasEstimation?.callGasLimit || userOp.callGasLimit)
      const verificationGasLimit = BigInt(
        gasEstimation?.verificationGasLimit || userOp.verificationGasLimit
      )
      const preVerificationGas = BigInt(
        gasEstimation?.preVerificationGas || userOp.preVerificationGas
      )

      // 合計ガス使用量の計算
      const totalGas = callGasLimit + verificationGasLimit + preVerificationGas

      // 最大の合計ガス料金（Wei単位）
      const totalGasWei = totalGas * maxFeePerGas

      // ETH単位に変換（表示用）
      const totalGasEth = formatEther(totalGasWei)

      const userOpResult = {
        ...userOp,
        callGasLimit: gasEstimation?.callGasLimit || userOp.callGasLimit,
        verificationGasLimit: gasEstimation?.verificationGasLimit || userOp.verificationGasLimit,
        preVerificationGas: gasEstimation?.preVerificationGas || userOp.preVerificationGas,
        maxFeePerGas: `0x${maxFeePerGas.toString(16)}`,
        maxPriorityFeePerGas: `0x${maxPriorityFeePerGas.toString(16)}`,
      }

      return {
        userOpResult,
        totalGasEth,
      }
    } catch (error) {
      console.warn('Gas estimation failed, using default values:', error)
      return {
        userOpResult: userOp,
        totalGasWei: BigInt(0),
        totalGasEth: '0',
      }
    }
  }, [])

  return { estimateUserOperationGas }
}
