import { useCallback } from 'react'
import { useWalletClient } from 'wagmi'
import { getContract, Hex } from 'viem'
import { bundlerClient, publicClient } from '../utils/client'
import { ENTRY_POINT_V08_ADDRESS } from '../constants/addresses'
import { entryPointV08Abi } from '../abi/entryPointV0.8'
import type { UserOperationV08 } from '../lib/userOperationType'
import { useEstimateUserOperationGas } from './useEstimateUserOperationGas'
import {
  buildEip712Domain,
  eip712Types,
  toPackedUserOperation,
  HEX_EMPTY,
} from '../utils/aaV08'

export function useExecuteUserOperation() {
  const { data: walletClient } = useWalletClient()
  const { estimateUserOperationGas } = useEstimateUserOperationGas()

  const executeBatch = useCallback(async (userOps: UserOperationV08[]) => {
    if (!walletClient) throw new Error('Wallet client not ready')

    const domain = await buildEip712Domain()

    const entryPoint = getContract({
      address: ENTRY_POINT_V08_ADDRESS,
      abi: entryPointV08Abi,
      client: publicClient,
    })

    const finalized: UserOperationV08[] = []

    for (const raw of userOps) {
      const { userOpResult: est } = await estimateUserOperationGas(raw)

      const packedForSign = toPackedUserOperation({ ...est, signature: HEX_EMPTY })
      const signature = await walletClient.signTypedData({
        domain,
        types: eip712Types,
        primaryType: 'PackedUserOperation',
        message: {
          sender: packedForSign.sender,
          nonce: BigInt(packedForSign.nonce),
          initCode: packedForSign.initCode,
          callData: packedForSign.callData,
          accountGasLimits: packedForSign.accountGasLimits,
          preVerificationGas: BigInt(packedForSign.preVerificationGas),
          gasFees: packedForSign.gasFees,
          paymasterAndData: packedForSign.paymasterAndData,
        },
      })

      // Optional: re-estimate with the signature; if changed, re-sign
      let reGas: Partial<Pick<UserOperationV08, 'callGasLimit'|'verificationGasLimit'|'preVerificationGas'>> = {}
      try {
        reGas = await (bundlerClient as any).request({
          method: 'eth_estimateUserOperationGas',
          params: [{ ...est, signature }, ENTRY_POINT_V08_ADDRESS],
        })
      } catch {
        // If bundler gives nothing, keep values as-is (or implement custom pvg buffer here)
      }

      const changed =
        (reGas.callGasLimit && reGas.callGasLimit !== est.callGasLimit) ||
        (reGas.verificationGasLimit && reGas.verificationGasLimit !== est.verificationGasLimit) ||
        (reGas.preVerificationGas && reGas.preVerificationGas !== est.preVerificationGas)

      let finalOp: UserOperationV08
      if (changed) {
        const est2 = {
          ...est,
          callGasLimit: reGas.callGasLimit ?? est.callGasLimit,
          verificationGasLimit: reGas.verificationGasLimit ?? est.verificationGasLimit,
          preVerificationGas: reGas.preVerificationGas ?? est.preVerificationGas,
        }
        const packed2 = toPackedUserOperation({ ...est2, signature: HEX_EMPTY })
        const signature2 = await walletClient.signTypedData({
          domain,
          types: eip712Types,
          primaryType: 'PackedUserOperation',
          message: {
            sender: packed2.sender,
            nonce: BigInt(packed2.nonce),
            initCode: packed2.initCode,
            callData: packed2.callData,
            accountGasLimits: packed2.accountGasLimits,
            preVerificationGas: BigInt(packed2.preVerificationGas),
            gasFees: packed2.gasFees,
            paymasterAndData: packed2.paymasterAndData,
          },
        })
        finalOp = { ...est2, signature: signature2 as Hex }
      } else {
        finalOp = { ...est, signature: signature as Hex }
      }

      try {
        const packedFinal = toPackedUserOperation(finalOp)
        const userOpHash = await entryPoint.read.getUserOpHash([packedFinal])
        console.debug('UserOpHash(v0.8/EIP-712):', userOpHash)
      } catch {}

      finalized.push(finalOp)
    }

    const hashes: Hex[] = []
    for (const op of finalized) {
      const hash = await (bundlerClient as any).request({
        method: 'eth_sendUserOperation',
        params: [op, ENTRY_POINT_V08_ADDRESS],
      })
      hashes.push(hash as Hex)
    }

    return hashes
  }, [walletClient, estimateUserOperationGas])

  const execute = useCallback(async (userOperation: UserOperationV08) => {
    const [hash] = await executeBatch([userOperation])
    return hash
  }, [executeBatch])

  return { execute, executeBatch }
}
