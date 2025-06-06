import React, { createContext, useState, useContext, ReactNode } from 'react'
import { UserOpConfirmationModal, UserOpSelection } from '../components/UserOpConfirmationModal'
import { Hex } from 'viem'

interface GasEstimateInfo {
  totalGasEth: string
  callGasLimit: string
  verificationGasLimit: string
  preVerificationGas: string
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
  const [confirmResolve, setConfirmResolve] = useState<((value: UserOpSelection) => void) | null>(
    null
  )
  const [confirmReject, setConfirmReject] = useState<((reason?: any) => void) | null>(null)

  // 確認モーダルを表示し、ユーザーの選択を待つasync関数
  // このメソッドが終了するのはユーザが支払い方法を選択し、handleConfirmが実行され、Promiseが解決された後
  const showConfirmation = async (
    callData: Hex,
    gasEstimate?: GasEstimateInfo
  ): Promise<UserOpSelection> => {
    setCallData(callData)
    setIsModalOpen(true)
    setGasEstimate(gasEstimate)

    // 新しいPromiseを作成し、resolve/reject関数を状態として保存
    // ユーザの入力を非同期処理の途中に挟むためにはPromiseを使用する必要がある。（executeCallData内で使用するため）
    // resolveやrejectを直接呼び出すのではなく、後で引数を渡して呼び出すための関数を設定する
    return new Promise<UserOpSelection>((resolve, reject) => {
      // resolveやrejectは、Promiseの標準的な関数で、引数を1つ受け取ることができる
      setConfirmResolve(() => resolve)
      setConfirmReject(() => reject)
    })
  }

  // UserOp処理完了時に呼び出される関数
  const completeOperation = (_success: boolean) => {
    setIsProcessing(false)
    setIsModalOpen(false)
    setConfirmResolve(null)
    setConfirmReject(null)
  }

  // ユーザがモーダルでConfirmボタンを押すと、保存していたconfirmResolveを選択内容を引数として実行する
  const handleConfirm = (selection: UserOpSelection) => {
    if (!confirmResolve) return
    setIsProcessing(true)
    // Promiseの解決値として selectionが指定される
    // 例：await showConfirmation(callData) で止まっていた処理がselectionを受け取って先に進む
    confirmResolve(selection)
  }

  // キャンセルボタンがクリックされたときの処理
  const handleClose = () => {
    if (isProcessing) return

    if (confirmReject) {
      confirmReject(new Error('User cancelled the operation'))
    }

    setIsModalOpen(false)
    setCallData(null)
    setConfirmResolve(null)
    setConfirmReject(null)
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
