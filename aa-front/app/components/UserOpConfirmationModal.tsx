import React, { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Loader2 } from 'lucide-react'
import { Hex } from 'viem'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Label } from './ui/label'
import { TOKEN_OPTIONS } from '../constants/tokenList'
import { DAI_ADDRESS } from '../constants/addresses'
import Image from 'next/image'
import { Tooltip, TooltipContent, TooltipProvider } from './ui/tooltip'
import { Badge } from './ui/badge'
import { decodeCallData } from '../utils/decodeCallData'

// ユーザー選択の型定義
export type UserOpSelection = {
  paymentOption: 'native' | 'token' | 'paymaster'
  tokenAddress?: string
}

interface GasEstimateInfo {
  totalGasEth: string
  callGasLimit: string
  verificationGasLimit: string
  preVerificationGas: string
}

interface UserOpConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selection: UserOpSelection) => void
  isProcessing: boolean
  callData: Hex | null
  gasEstimate?: GasEstimateInfo
}

export const UserOpConfirmationModal: React.FC<UserOpConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  callData,
  gasEstimate,
}) => {
  const [selection, setSelection] = useState<UserOpSelection>({
    paymentOption: 'native',
    tokenAddress: DAI_ADDRESS,
  })

  const decodedData = useMemo(() => {
    if (!callData) return null
    return decodeCallData(callData)
  }, [callData])

  const daiToken = TOKEN_OPTIONS.find(token => token.address === DAI_ADDRESS)

  const handleConfirm = () => {
    onConfirm(selection)
  }

  if (!callData || !decodedData) return null

  const formatArgsForDisplay = (args: any[]): string => {
    try {
      return JSON.stringify(
        args,
        (key, value) => (typeof value === 'bigint' ? value.toString() : value),
        2
      )
    } catch {
      return '[Error displaying arguments]'
    }
  }

  const formatEth = (value: bigint | undefined): string => {
    if (!value) return '0 ETH'

    // weiからETHに変換（1 ETH = 10^18 wei）
    const ethValue = Number(value) / 1e18

    if (ethValue < 0.000001) {
      return `${value.toString()} wei`
    }

    return `${ethValue.toFixed(6)} ETH`
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Confirm Transaction</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            {/* Main function name */}
            <div className="mb-3">
              <span className="text-sm font-medium">Transaction Type: </span>
              <span className="text-sm font-mono">{decodedData.functionName}</span>
            </div>

            {decodedData.operations && decodedData.operations.length > 0 && (
              <div className="mb-3">
                <span className="text-sm font-medium">Operations:</span>
                <div className="mt-2 space-y-2">
                  {decodedData.operations.map((op, index) => (
                    <div key={index} className="bg-white p-2 rounded border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">
                          {index + 1}. {op.functionName}
                        </span>
                        {op.value && op.value > BigInt(0) && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {formatEth(op.value)}
                          </span>
                        )}
                      </div>
                      {op.contractAddress && (
                        <div className="mb-1">
                          <span className="text-xs text-slate-500">To: </span>
                          <span className="text-xs font-mono break-all">{op.contractAddress}</span>
                        </div>
                      )}
                      {op.args.length > 0 && (
                        <div className="mt-1">
                          <details className="text-xs">
                            <summary className="cursor-pointer hover:text-blue-600">
                              View arguments
                            </summary>
                            <div className="mt-1 bg-slate-100 p-2 rounded text-xs font-mono overflow-x-auto overflow-y-auto">
                              <pre className="whitespace-pre-wrap break-all">
                                {formatArgsForDisplay(op.args)}
                              </pre>
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gasEstimate && (
              <div className="mt-3 border-t pt-3">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  Gas Estimate
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipContent>
                        <p className="text-xs">
                          This is an estimate of the maximum gas fee for this transaction.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </h4>

                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max Gas Fee:</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 font-mono text-xs">
                      {gasEstimate.totalGasEth} ETH
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 border-t pt-3">
              <h4 className="text-sm font-medium mb-2">Payment Method</h4>
              <RadioGroup
                value={selection.paymentOption}
                onValueChange={value =>
                  setSelection({
                    ...selection,
                    paymentOption: value as 'native' | 'token' | 'paymaster',
                  })
                }
                className="space-y-1.5"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="native" id="native" />
                  <Label htmlFor="native" className="cursor-pointer text-sm">
                    Sepolia ETH
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="token" id="token" />
                  <Label htmlFor="token" className="cursor-pointer flex items-center text-sm">
                    <div className="flex items-center">
                      {daiToken && (
                        <Image
                          src={daiToken.logo}
                          alt={daiToken.symbol}
                          className="w-4 h-4 mr-1"
                          width={45}
                          height={45}
                        />
                      )}
                      DAI
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paymaster" id="paymaster" />
                  <Label htmlFor="paymaster" className="cursor-pointer text-sm">
                    Paymaster
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3 flex-shrink-0 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
