import React, { useState } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Plus, Loader2, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react'
import { encodeFunctionData, parseEther, Hex } from 'viem'
import { tokenCreationFactoryAbi } from '../abi/tokenCreationFactory'
import { TOKEN_CREATION_FACTORY_ADDRESS } from '../constants/addresses'
import { SimpleAccountABI } from '../abi/simpleAccount'
import { useAA } from '../hooks/useAA'
import { publicClient } from '../utils/client'
import { TokenList } from './TokenList'
import { useTokenManagement } from '../hooks/useTokenManagement'
import { useUserOperationExecutor } from '../hooks/useUserOpExecutor'
import { Alert, AlertDescription } from './ui/alert'

const ETHERSCAN_BASE_URL = 'https://sepolia.etherscan.io'

interface ExecutionResultDisplay {
  success: boolean
  hash?: Hex
  message?: string
  error?: string
}

export const TokenCreation = ({ isDeployed }: { isDeployed: boolean }) => {
  const [tokenName, setTokenName] = useState<string>('')
  const [tokenSymbol, setTokenSymbol] = useState<string>('')
  const [tokenSupply, setTokenSupply] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ExecutionResultDisplay | null>(null)

  const { aaAddress } = useAA()
  const { executeCallData } = useUserOperationExecutor(aaAddress)

  const { updateTokenBalances } = useTokenManagement(publicClient, aaAddress)

  const handleCreateToken = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      if (!tokenName || !tokenSymbol || !tokenSupply) {
        throw new Error('Please fill in all token details.')
      }

      console.log(tokenName, tokenSymbol, parseEther(tokenSupply))

      const factoryFuncData = encodeFunctionData({
        abi: tokenCreationFactoryAbi,
        functionName: 'createToken',
        args: [tokenName, tokenSymbol, parseEther(tokenSupply)],
      })

      const callData = encodeFunctionData({
        abi: SimpleAccountABI,
        functionName: 'execute',
        args: [TOKEN_CREATION_FACTORY_ADDRESS, '0x0', factoryFuncData],
      })

      const executionResult = await executeCallData(callData)
      console.log('Execution Result:', executionResult)

      if (executionResult.success && executionResult.txHash) {
        setResult({
          success: true,
          hash: executionResult.txHash as Hex,
          message: 'Token created successfully!',
        })
        setTokenName('')
        setTokenSymbol('')
        setTokenSupply('')
        await updateTokenBalances()
      } else {
        setResult({
          success: false,
          error:
            executionResult.error ||
            'Token creation failed. Please check the console or bundler logs.',
        })
      }
    } catch (error: any) {
      console.error('Token creation error:', error)
      setResult({
        success: false,
        error: error.message || 'An unexpected error occurred during token creation.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Plus className="h-6 w-6" />
              Create New Token
            </h2>

            {result && (
              <Alert
                className={
                  result.success
                    ? 'bg-green-50 border-green-100 text-green-800'
                    : 'bg-red-50 border-red-100 text-red-800'
                }
              >
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <AlertDescription className="flex-grow">
                    {result.success ? (
                      <div className="space-y-1">
                        <p className="font-medium">{result.message}</p>
                        {result.hash && (
                          <a
                            href={`${ETHERSCAN_BASE_URL}/tx/${result.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-700 hover:text-green-800 underline text-sm flex items-center gap-1 break-all"
                          >
                            View on Etherscan
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="font-medium">{result.error}</p>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tokenName">Token Name</Label>
                <Input
                  id="tokenName"
                  placeholder="e.g. My Token"
                  value={tokenName}
                  onChange={e => setTokenName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tokenSymbol">Token Symbol</Label>
                <Input
                  id="tokenSymbol"
                  placeholder="e.g. MTK"
                  value={tokenSymbol}
                  onChange={e => setTokenSymbol(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tokenSupply">Initial Supply</Label>
                <Input
                  id="tokenSupply"
                  type="number"
                  placeholder="e.g. 1000000"
                  value={tokenSupply}
                  onChange={e => setTokenSupply(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleCreateToken}
                disabled={isLoading || !tokenName || !tokenSymbol || !tokenSupply || !isDeployed}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Token...
                  </>
                ) : (
                  'Create Token'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <TokenList aaAddress={aaAddress} publicClient={publicClient} isDeployed={isDeployed} />
    </>
  )
}
