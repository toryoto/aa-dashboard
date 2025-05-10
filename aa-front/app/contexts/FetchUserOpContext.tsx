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
  fetchUserOps: (page?: number) => Promise<void>
  hasMore: boolean
  resetUserOps: () => void
}

const UserOpContext = createContext<UserOpContextType | undefined>(undefined)

export function UserOpProvider({ children }: { children: ReactNode }) {
  const { aaAddress } = useAA()
  const [userOps, setUserOps] = useState<UserOperationHistory[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const LIMIT = 10

  const resetUserOps = useCallback(() => {
    setUserOps([])
    setHasMore(true)
  }, [])

  const fetchUserOps = useCallback(
    async (page?: number) => {
      if (!aaAddress || aaAddress === '0x') return

      const currentPage = page || 1
      const offset = (currentPage - 1) * LIMIT

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/getUserOp?address=${aaAddress}&limit=${LIMIT}&offset=${offset}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch UserOps')
        }

        const data = await response.json()

        if (data.success) {
          const newUserOps = data.data
          if (!page || currentPage == 1) {
            setUserOps(newUserOps)
          } else {
            setUserOps(prevOps => {
              // userOpHashで重複を除外
              // const hashes = new Set(prevOps.map(op => op.userOpHash))
              // const filteredNewOps = newUserOps.filter(op => !hashes.has(op.userOpHash))
              return [...prevOps, ...newUserOps]
            })
          }
          setHasMore(newUserOps.length === LIMIT)
        } else {
          setError(data.message || 'Failed to fetch UserOps')
        }
      } catch (err) {
        console.error('Error fetching UserOps:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [aaAddress]
  )

  return (
    <UserOpContext.Provider
      value={{
        userOps,
        loading,
        error,
        fetchUserOps,
        hasMore,
        resetUserOps,
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
