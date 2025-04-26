// aa-front/app/components/Faucet.tsx
import React, { useState } from 'react'
import { Droplets, AlertCircle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { useAA } from '../hooks/useAA'

interface FaucetProps {
  isDeployed: boolean
  onFaucetComplete?: () => void
}

export const Faucet: React.FC<FaucetProps> = ({ isDeployed, onFaucetComplete }) => {
  const { aaAddress } = useAA()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    hash?: string
    message?: string
    error?: string
  } | null>(null)

  const handleRequestFunds = async () => {
    setIsLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: aaAddress }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          hash: data.txHash,
          message: data.message || 'Test ETH has been sent to your Smart Account!',
        })
        
        if (onFaucetComplete) {
          onFaucetComplete()
        }
      } else {
        setResult({
          success: false,
          error: data.error || 'Failed to request test ETH. Please try again later.',
        })
      }
    } catch (error) {
      console.error('Faucet error:', error)
      setResult({
        success: false,
        error: 'An unexpected error occurred. Please try again later.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold">Testnet Faucet</CardTitle>
          </div>
        </div>
        <CardDescription className="text-sm text-slate-500 mt-1">
          Request test ETH for your Smart Account on the Sepolia testnet
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
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
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <AlertDescription>
                {result.success ? (
                  <div className="space-y-1">
                    <p className="font-medium">{result.message}</p>
                    {result.hash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${result.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-700 hover:text-green-800 underline text-sm flex items-center gap-1"
                      >
                        View on Etherscan
                        <ExternalLink className="h-3 w-3" />
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

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-full mt-0.5">
              <Droplets className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-800">About Sepolia Testnet Faucet</h3>
              <p className="text-sm text-blue-600 mt-1">
                This faucet provides a small amount of Sepolia ETH for testing.
                Limits: 1 request per wallet address per day, 3 requests per IP address per day.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 mt-2">
          <div className="flex flex-col space-y-2">
            <h3 className="font-medium">Smart Account</h3>
            <p className="text-xs text-slate-500">Your ERC-4337 account address</p>
            <div className="text-xs font-mono bg-white p-2 rounded border border-slate-200 break-all">
              {aaAddress}
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <Button 
            onClick={handleRequestFunds} 
            disabled={isLoading || !aaAddress || aaAddress === '0x'}
            size="lg"
            className="w-full md:w-3/5 py-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing Request...
              </>
            ) : (
              <>
                <Droplets className="h-5 w-5 mr-2" />
                Request Test ETH
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}