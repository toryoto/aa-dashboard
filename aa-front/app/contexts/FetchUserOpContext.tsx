import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useAA } from '../hooks/useAA'

interface UserOperationHistory {
  userOpHash: string
  sender: string
  transactionHash: string
  blockTimestamp: string
  calldata: string
  success: boolean
  paymentMethod: string | null
}

interface UserOpContextType {
  userOps: UserOperationHistory[]
  loading: boolean
  error: string | null
  fetchUserOps: () => Promise<void>
}

const UserOpContext = createContext<UserOpContextType | undefined>(undefined)

export function UserOpProvider({ children }: { children: ReactNode }) {
  const { aaAddress } = useAA()
  const [userOps, setUserOps] = useState<UserOperationHistory[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUserOps = useCallback(async () => {
    if (!aaAddress || aaAddress === '0x') return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/getUserOp?address=${aaAddress}&limit=10`)

      if (!response.ok) {
        throw new Error('Failed to fetch UserOps')
      }

      const data = await response.json()

      if (data.success) {
        setUserOps(data.data)
      } else {
        setError(data.message || 'Failed to fetch UserOps')
      }
    } catch (err) {
      console.error('Error fetching UserOps:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [aaAddress])

  return (
    <UserOpContext.Provider
      value={{
        userOps,
        loading,
        error,
        fetchUserOps,
      }}
    >
      {children}
    </UserOpContext.Provider>
  )
}

export function useUserOp() {
  const context = useContext(UserOpContext)

  if (context === undefined) {
    throw new Error('useUserOp must be used within a UserOpProvider')
  }

  return context
}
