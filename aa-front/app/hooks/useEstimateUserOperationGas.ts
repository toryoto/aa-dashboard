import { useCallback } from 'react'
import { bundlerClient } from '../utils/client'
import { ENTRY_POINT_ADDRESS } from '../constants/addresses'
import { UserOperation } from '../lib/userOperationType'

export function useEstimateUserOperationGas() {
  /**
   * UserOperationのガス推定を行うメソッド
   */
  const estimateUserOperationGas = useCallback(
    async (userOp: UserOperation): Promise<UserOperation> => {
      try {
        // ダミー署名の設定（シミュレーション用）
        const dummyUserOp = {
          ...userOp,
          signature:
            '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c' as `0x${string}`,
        }

        // eth_estimateUserOperationGasの呼び出し
        const gasEstimation = await bundlerClient.request({
          jsonrpc: '2.0',
          method: 'eth_estimateUserOperationGas',
          params: [dummyUserOp, ENTRY_POINT_ADDRESS],
        })

        console.log('gasEstimation', gasEstimation)

        // 推定結果が返ってきた場合、ガス値を更新
        if (gasEstimation) {
          return {
            ...userOp,
            callGasLimit: gasEstimation.callGasLimit || userOp.callGasLimit,
            verificationGasLimit: gasEstimation.verificationGasLimit || userOp.verificationGasLimit,
            preVerificationGas: gasEstimation.preVerificationGas || userOp.preVerificationGas,
          }
        }

        return userOp
      } catch (error) {
        console.warn('ガス推定に失敗しました、デフォルト値を使用します:', error)
        return userOp
      }
    },
    []
  )

  return { estimateUserOperationGas }
}
