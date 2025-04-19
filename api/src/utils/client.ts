import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import dotenv from 'dotenv'

dotenv.config()
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
})
