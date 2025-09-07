import { createContext, useState, useEffect, ReactNode } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { encodeFunctionData, getContract, Hex } from 'viem'
import { accountFactoryAbi } from '../abi/accountFactory'
import { FACTORY_ADDRESS } from '../constants/addresses'
import { publicClient } from '../utils/client'
import { useUserOperationExecutor } from '../hooks/useUserOpExecutor'

interface AAContextType {
  aaAddress: Hex
  isDeployed: boolean
  loading: boolean
  deployAccount: () => Promise<void>
}

export const AAContext = createContext<AAContextType | undefined>(undefined)

export function AAProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [aaAddress, setAaAddress] = useState<Hex>('0x')
  const [isDeployed, setIsDeployed] = useState(false)
  const [loading, setLoading] = useState(false)
  const { executeCallData } = useUserOperationExecutor(aaAddress)

  useEffect(() => {
    const initializeAA = async () => {
      if (!walletClient || !address) return
      setLoading(true)
      try {
        const factory = getContract({
          address: FACTORY_ADDRESS,
          abi: accountFactoryAbi,
          client: publicClient,
        })

        const salt = 0
        const predictedAddress = (await factory.read.getAddress([address, BigInt(salt)])) as Hex
        setAaAddress(predictedAddress)

        const code = await publicClient.getCode({ address: predictedAddress })
        setIsDeployed(!!code && code !== '0x')
      } catch (error) {
        console.error('AA init error:', error)
      } finally {
        setLoading(false)
      }
    }
    initializeAA()
  }, [walletClient, address])

  const deployAccount = async () => {
    if (!address || !walletClient || !aaAddress) return
    try {
      const factory = FACTORY_ADDRESS
      const factoryData = encodeFunctionData({
        abi: accountFactoryAbi,
        functionName: 'createAccount',
        args: [address, 0],
      })

      await executeCallData('0x', { factory: factory as Hex, factoryData: factoryData as Hex })
      setIsDeployed(true)
    } catch (error) {
      console.error('Deploy error:', error)
    }
  }

  return (
    <AAContext.Provider value={{ aaAddress, isDeployed, loading, deployAccount }}>
      {children}
    </AAContext.Provider>
  )
}
