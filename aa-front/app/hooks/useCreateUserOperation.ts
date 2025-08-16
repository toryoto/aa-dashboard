import { useCallback } from 'react'
import { Hex, toHex } from 'viem'
import { publicClient } from '../utils/client'
import { ENTRY_POINT_V08_ADDRESS } from '../constants/addresses'
import { entryPointV08Abi } from '../abi/entryPointV0.8'
import type { UserOperationV08 } from '../lib/userOperationType'

type CreateArgs = {
  aaAddress: Hex
  callData?: Hex

  // --- deploy 関連 (任意) ---
  factory?: Hex
  factoryData?: Hex

  // --- paymaster 関連 (任意) ---
  paymaster?: Hex
  paymasterVerificationGasLimit?: Hex
  paymasterPostOpGasLimit?: Hex
  paymasterData?: Hex

  callGasLimit?: Hex
  verificationGasLimit?: Hex
  preVerificationGas?: Hex
  maxFeePerGas?: Hex
  maxPriorityFeePerGas?: Hex
}

export function useCreateUserOperation() {
  /**
   * EntryPoint v0.8 用の Unpacked UserOperation を生成
   * - factory / factoryData があればセット（無ければ省略＝既存アカウント）
   * - paymaster 系は任意
   * - gas/fee は未指定なら 0x0 を入れて、後段で estimate → 上書きする想定
   */
  const createUserOperation = useCallback(
    async ({
      aaAddress,
      callData = '0x',

      factory,
      factoryData,

      paymaster,
      paymasterVerificationGasLimit,
      paymasterPostOpGasLimit,
      paymasterData,

      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
    }: CreateArgs): Promise<UserOperationV08> => {
      const nonce = (await publicClient.readContract({
        address: ENTRY_POINT_V08_ADDRESS,
        abi: entryPointV08Abi,
        functionName: 'getNonce',
        args: [aaAddress, 0n],
      })) as bigint

      if (nonce === null) throw new Error('Nonce is not fetched yet.')

      const userOp: UserOperationV08 = {
        sender: aaAddress,
        nonce: toHex(nonce),

        ...(factory ? { factory } : {}),
        ...(factoryData ? { factoryData } : {}),

        callData,

        callGasLimit: callGasLimit ?? '0x186a0',              // 100000
        verificationGasLimit: verificationGasLimit ?? '0x30d40',      // 200000
        preVerificationGas: preVerificationGas ?? '0x2710',         // 10000
        maxFeePerGas: maxFeePerGas ?? '0x3b9aca00',           // 1 gwei
        maxPriorityFeePerGas: maxPriorityFeePerGas ?? '0x3b9aca00',   // 1 gwei

        // paymaster（使用時のみ分割して付与）
        ...(paymaster ? { paymaster } : {}),
        ...(paymasterVerificationGasLimit ? { paymasterVerificationGasLimit } : {}),
        ...(paymasterPostOpGasLimit ? { paymasterPostOpGasLimit } : {}),
        ...(paymasterData ? { paymasterData } : {}),

        // 署名は後段で実署名に差し替え（estimate 時はダミー可）
        signature: '0x',
      }

      console.log(userOp)

      return userOp
    },
    []
  )

  return { createUserOperation }
}
