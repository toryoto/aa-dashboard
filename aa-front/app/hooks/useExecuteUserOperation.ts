import { getContract, Hex } from 'viem'
import { entryPointV08Abi } from '../abi/entryPointV0.8'
import { ENTRY_POINT_V08_ADDRESS } from '../constants/addresses'
import { bundlerClient, publicClient } from '../utils/client'
import { UserOperationV08, PackedUserOperation } from '../lib/userOperationType'
import { createPackedUserOperation } from '../utils/packUserOperation'
import { useWalletClient } from 'wagmi'

export function useExecuteUserOperation() {
  const { data: walletClient } = useWalletClient()

  const executeBatch = async (userOperations: UserOperationV08[]): Promise<Hex[]> => {
    if (!walletClient) {
      return ['0x']
    }

    const entryPoint = getContract({
      address: ENTRY_POINT_V08_ADDRESS,
      abi: entryPointV08Abi,
      client: publicClient,
    })

    const signedUserOps = await Promise.all(
      userOperations.map(async userOp => {
        // UserOperationV08をPackedUserOperationに変換
        const initCode = userOp.factory && userOp.factoryData 
          ? `${userOp.factory}${userOp.factoryData.slice(2)}` as Hex
          : '0x' as Hex

        const paymasterAndData = userOp.paymaster 
          ? `${userOp.paymaster}${(userOp.paymasterVerificationGasLimit || '0x').slice(2)}${(userOp.paymasterPostOpGasLimit || '0x').slice(2)}${(userOp.paymasterData || '0x').slice(2)}` as Hex
          : '0x' as Hex

        const packedUserOp = createPackedUserOperation({
          sender: userOp.sender,
          nonce: userOp.nonce,
          initCode,
          callData: userOp.callData,
          verificationGasLimit: parseInt(userOp.verificationGasLimit, 16),
          callGasLimit: parseInt(userOp.callGasLimit, 16),
          preVerificationGas: parseInt(userOp.preVerificationGas, 16),
          maxFeePerGas: parseInt(userOp.maxFeePerGas, 16),
          maxPriorityFeePerGas: parseInt(userOp.maxPriorityFeePerGas, 16),
          paymasterAndData,
          signature: userOp.signature,
        })

        // PackedUserOperationでハッシュを取得
        const userOpHashForSign = await entryPoint.read.getUserOpHash([packedUserOp])
        const signature = await walletClient.signMessage({
          message: { raw: userOpHashForSign as `0x${string}` },
        })
        return { ...userOp, signature }
      })
    )

    const userOpHashes = await Promise.all(
      signedUserOps.map(async (userOp) => {
        return (await (bundlerClient as any).request({
          method: 'eth_sendUserOperation',
          params: [userOp, ENTRY_POINT_V08_ADDRESS],
        })) as Hex
      })
    )

    return userOpHashes
  }

  const execute = async (userOperation: UserOperationV08): Promise<Hex> => {
    const [hash] = await executeBatch([userOperation])
    return hash
  }

  return { execute, executeBatch }
}