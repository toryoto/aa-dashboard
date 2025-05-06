import { Hex, decodeFunctionData } from 'viem'
import { SimpleAccountABI } from '../abi/simpleAccount'
import { erc20Abi } from '../abi/erc20'
import { dexRouterAbi } from '../abi/dexRouter'
import { wrappedSepolia } from '../abi/wrappedSepolia'
import { tokenCreationFactoryAbi } from '../abi/tokenCreationFactory'

interface DecodedSingleCallData {
  functionName: string
  args: any[]
  callData?: Hex
}

interface DecodedOperation {
  functionName: string
  contractAddress?: string
  value?: bigint
  args: any[]
}

interface DecodedCallData {
  functionName: string
  contractAddress?: string
  value?: bigint
  args: any[]
  callData?: Hex
  operations: DecodedOperation[]
}

const ABIS = [
  ...SimpleAccountABI,
  ...erc20Abi,
  ...dexRouterAbi,
  ...wrappedSepolia,
  ...tokenCreationFactoryAbi,
]

function decodeSingleCallData(callData: Hex): DecodedSingleCallData {
  if (!callData || callData.length < 10) {
    return { functionName: 'Unknown', args: [] }
  }

  for (const abi of ABIS) {
    try {
      // calldataとabiを引数にデコードすることで元の情報を取得する
      const decoded = decodeFunctionData({
        abi: [abi],
        data: callData,
      })

      if (decoded) {
        return {
          functionName: abi.name || 'Unknown',
          args: Array.isArray(decoded.args) ? decoded.args : [],
        }
      }
    } catch (error) {}
  }

  return {
    functionName: 'Unknown',
    args: [],
    callData,
  }
}

export function decodeCallData(callData: Hex): DecodedCallData {
  if (!callData || callData.length < 10) {
    return { functionName: 'Unknown', args: [], operations: [] }
  }

  try {
    // Try to decode with known ABIs
    for (const abi of ABIS) {
      if (abi.type !== 'function') continue

      try {
        const decoded = decodeFunctionData({
          abi: [abi],
          data: callData,
        })

        if (decoded) {
          if (abi.name === 'execute' && decoded.args && decoded.args.length >= 3) {
            const dest = decoded.args[0] as string
            const value = decoded.args[1] as bigint
            const innerCallData = decoded.args[2] as Hex

            if (innerCallData === '0x') {
              return {
                functionName: 'execute',
                contractAddress: dest,
                value,
                args: [dest, value, innerCallData],
                operations: [
                  {
                    functionName: 'ETH Transfer',
                    contractAddress: dest,
                    value: value,
                    args: [],
                  },
                ],
              }
            }

            let innerOperation: DecodedSingleCallData | null = null

            if (innerCallData && innerCallData.length >= 10) {
              innerOperation = decodeSingleCallData(innerCallData)
            }

            return {
              functionName: 'execute',
              contractAddress: dest,
              value,
              args: [dest, value, innerCallData],
              operations: [
                {
                  functionName: innerOperation ? innerOperation.functionName : 'Unknown',
                  contractAddress: dest,
                  value: value,
                  args: innerOperation ? innerOperation.args : [],
                },
              ],
            }
          }

          if (abi.name === 'executeBatch' && decoded.args && decoded.args.length >= 3) {
            const destinations = decoded.args[0] as string[]
            const values = decoded.args[1] as bigint[]
            const datas = decoded.args[2] as Hex[]

            // Decode each inner transaction
            const operations = datas.map((data, index) => {
              if (data === '0x') {
                return {
                  functionName: 'ETH Transfer',
                  contractAddress: destinations[index],
                  value: values[index],
                  args: [],
                }
              }

              const decodedInner = decodeSingleCallData(data)
              return {
                functionName: decodedInner.functionName,
                contractAddress: destinations[index],
                value: values[index],
                args: decodedInner.args,
              }
            })

            return {
              functionName: 'executeBatch',
              args: [...(decoded.args || [])],
              operations,
            }
          }
        }
      } catch {}
    }

    // If decoding failed, return the raw calldata
    return {
      functionName: 'Unknown',
      args: [],
      callData,
      operations: [],
    }
  } catch (error) {
    console.error('Error decoding calldata:', error)
    return {
      functionName: 'Unknown',
      args: [],
      callData,
      operations: [],
    }
  }
}