import { createPublicClient, http, createClient } from 'viem'
import { sepolia } from 'viem/chains'
import { bundlerActions } from 'viem/account-abstraction'

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`),
})

export const bundlerClient = createClient({
  chain: sepolia,
  transport: http(`https://api.pimlico.io/v1/sepolia/rpc?apikey=${process.env.PIMLICO_API_KEY}`),
}).extend(bundlerActions)
