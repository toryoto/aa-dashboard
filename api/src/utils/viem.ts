import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(
    `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  ),
})