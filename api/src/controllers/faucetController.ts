import { createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { publicClient } from '../utils/client'
import dotenv from 'dotenv'

dotenv.config()

const FAUCET_ADMIN_PRIVATE_KEY = process.env.FAUCET_ADMIN_PRIVATE_KEY as `0x${string}`

const account = privateKeyToAccount(FAUCET_ADMIN_PRIVATE_KEY)
const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(
    `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  ),
})

export const handleFaucetRequest = async (req: any, res: any) => {
  try {
    const { walletAddress } = req.body
    
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid Wallet Address' })
    }

    const hash = await walletClient.sendTransaction({
      to: walletAddress as `0x${string}`,
      value: parseEther('0.001')
    })

    const transaction = await publicClient.getTransaction({
      hash
    })

    console.log(transaction)

    return res.status(200).json({ 
      status: 'success', 
      txHash: hash,
      message: '0.01 Sepolia ETH has been sent'
    })
  } catch (error) {
    console.error('Faucet API error:', error)
    return res.status(500).json({ error: 'Internal server error occurred' })
  }
}