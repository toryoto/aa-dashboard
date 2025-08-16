import { getContract, Hex } from 'viem'
import { entryPointV08Abi } from '../abi/entryPointV0.8'
import { ENTRY_POINT_V08_ADDRESS } from '../constants/addresses'
import { bundlerClient, publicClient } from '../utils/client'
import { UserOperationV08 } from '../lib/userOperationType'
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
        // V0.8のgetUserOpHashを使用
        const userOpHashForSign = await entryPoint.read.getUserOpHash([userOp])
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