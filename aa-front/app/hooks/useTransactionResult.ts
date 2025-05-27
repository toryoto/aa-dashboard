import { useState } from 'react'

export interface TransactionResult {
  success?: boolean
  hash?: string
  error?: string
  message?: string
}

export const useTransactionResult = () => {
  const [result, setResult] = useState<TransactionResult | null>(null)

  const setSuccess = (hash?: string, message?: string) => {
    setResult({
      success: true,
      hash,
      message,
    })
  }

  const setError = (error: string) => {
    setResult({
      success: false,
      error,
    })
  }

  const clearResult = () => {
    setResult(null)
  }

  return {
    result,
    setSuccess,
    setError,
    clearResult,
  }
}