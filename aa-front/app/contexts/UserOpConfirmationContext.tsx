import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react'
import { UserOpConfirmationModal, UserOpSelection } from '../components/UserOpConfirmationModal'
import { Hex } from 'viem'

interface GasEstimateInfo {
  totalGasEth: string
  callGasLimit: Hex
  verificationGasLimit: Hex
  preVerificationGas: Hex
  maxFeePerGas?: Hex
  maxPriorityFeePerGas?: Hex
}

interface UserOpConfirmationContextType {
  showConfirmation: (callData: Hex, gasEstimate?: GasEstimateInfo) => Promise<UserOpSelection>
  completeOperation: (success: boolean) => void
}

const UserOpConfirmationContext = createContext<UserOpConfirmationContextType | undefined>(
  undefined
)

export function UserOpConfirmationProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [callData, setCallData] = useState<Hex | null>(null)
  const [gasEstimate, setGasEstimate] = useState<GasEstimateInfo | undefined>(undefined)

  const confirmResolveRef = useRef<((value: UserOpSelection) => void) | null>(null)
  const confirmRejectRef = useRef<((reason?: any) => void) | null>(null)

  // unmount 時に pending Promise を必ず reject（リーク/ハング防止）
  useEffect(() => {
    return () => {
      if (confirmRejectRef.current) {
        confirmRejectRef.current(new Error('Confirmation modal unmounted'))
      }
      confirmResolveRef.current = null
      confirmRejectRef.current = null
    }
  }, [])

  const showConfirmation = async (
    callDataIn: Hex,
    gasEstimateIn?: GasEstimateInfo
  ): Promise<UserOpSelection> => {
    setCallData(callDataIn)
    setGasEstimate(gasEstimateIn)
    setIsModalOpen(true)
    setIsProcessing(false)

    // 既存の pending があれば片付ける（多重起動対策）
    if (confirmRejectRef.current) {
      confirmRejectRef.current(new Error('New confirmation opened before previous resolved'))
      confirmResolveRef.current = null
      confirmRejectRef.current = null
    }

    return new Promise<UserOpSelection>((resolve, reject) => {
      confirmResolveRef.current = resolve
      confirmRejectRef.current = reject
    })
  }

  const completeOperation = (_success: boolean) => {
    setIsProcessing(false)
    setIsModalOpen(false)
    confirmResolveRef.current = null
    confirmRejectRef.current = null
    setCallData(null)
    setGasEstimate(undefined)
  }

  const handleConfirm = (selection: UserOpSelection) => {
    if (!confirmResolveRef.current) return
    setIsProcessing(true) // 実行中は閉じられないように
    confirmResolveRef.current(selection)
  }

  const handleClose = () => {
    if (isProcessing) return // 実行中は閉じない
    if (confirmRejectRef.current) {
      confirmRejectRef.current(new Error('User cancelled the operation'))
    }
    setIsModalOpen(false)
    confirmResolveRef.current = null
    confirmRejectRef.current = null
    setCallData(null)
    setGasEstimate(undefined)
  }

  return (
    <UserOpConfirmationContext.Provider value={{ showConfirmation, completeOperation }}>
      {children}
      <UserOpConfirmationModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        isProcessing={isProcessing}
        callData={callData}
        gasEstimate={gasEstimate}
      />
    </UserOpConfirmationContext.Provider>
  )
}

export function useUserOpConfirmation() {
  const context = useContext(UserOpConfirmationContext)
  if (context === undefined) {
    throw new Error('useUserOpConfirmation must be used within a UserOpConfirmationProvider')
  }
  return context
}
