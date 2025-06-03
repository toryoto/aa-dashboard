import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Clock, Activity, X, ExternalLink, Search } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { formatEther, Hex } from 'viem'
import { useAA } from '../hooks/useAA'
import { decodeCallData } from '../utils/decodeCallData'
import { formatDate, shortenHex } from '../utils/format'
import { useUserOp } from '../contexts/FetchUserOpContext'

interface UserOperationHistoryProps {
  isVisible: boolean
  onClose: () => void
}

const UserOperationHistory: React.FC<UserOperationHistoryProps> = ({ isVisible, onClose }) => {
  const { aaAddress } = useAA()
  const [selectedOp, setSelectedOp] = useState<any | null>(null)
  const [showDetails, setShowDetails] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [currentSearch, setCurrentSearch] = useState<string>('')
  const observer = useRef<IntersectionObserver | null>(null)

  const { userOps, loading, error, fetchUserOps, resetUserOps, hasMore } = useUserOp()

  // 初期表示時に1ページ目のデータ取得とページリセットを行う
  useEffect(() => {
    if (isVisible && aaAddress) {
      resetUserOps()
      setCurrentPage(1)
      fetchUserOps(1, currentSearch)
    }
  }, [isVisible, aaAddress, fetchUserOps, resetUserOps, currentSearch])

  // refを付与した最後の要素が画面に表示されたときに自動的に発火するメソッド
  // 毎レンダリングで関数インスタンスを作成すると、IntersectionObserverが再生成されるため、パフォーマンスの観点からcallbackにする
  // このメソッドの役割はObserberをセットするだけ
  const lastUserOpRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return

      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver(entries => {
        if (entries[0]?.isIntersecting && hasMore) {
          const nextPage = currentPage + 1
          setCurrentPage(nextPage)
          fetchUserOps(nextPage, currentSearch) // 次のページを取得
        }
      })

      if (node) observer.current.observe(node)
    },
    [loading, hasMore, fetchUserOps, currentPage, currentSearch]
  )

  const handleOpClick = (op: any) => {
    setSelectedOp(op)
    setShowDetails(true)
  }

  const handleSearch = useCallback(() => {
    setCurrentSearch(searchTerm)
    resetUserOps()
    setCurrentPage(1)
    fetchUserOps(1, searchTerm)
  }, [searchTerm, resetUserOps, fetchUserOps])

  const handleClearSearch = useCallback(() => {
    setSearchTerm('')
    setCurrentSearch('')
    resetUserOps()
    setCurrentPage(1)
    fetchUserOps(1, '')
  }, [resetUserOps, fetchUserOps])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  const getOperationName = (calldata: string): string => {
    if (!calldata) return 'Unknown Operation'

    try {
      const decoded = decodeCallData(calldata as Hex)

      if (decoded.operations && decoded.operations.length > 0) {
        const name = decoded.operations[decoded.operations.length - 1].functionName
        if (name.length > 15)
          return decoded.operations[decoded.operations.length - 1].functionName.slice(0, 15) + '...'
        else return name
      }

      return decoded.functionName || 'Unknown Operation'
    } catch (err) {
      console.error('Error decoding calldata:', err)
      return 'Unknown Operation'
    }
  }

  const getPaymentMethodBadge = (method: string | null) => {
    if (!method) return null

    switch (method) {
      case 'native':
        return <Badge className="bg-blue-100 text-blue-800">ETH</Badge>
      case 'token':
        return <Badge className="bg-green-100 text-green-600">ERC20</Badge>
      case 'paymaster':
        return <Badge className="bg-purple-100 text-purple-800">Paymaster</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-800">{method}</Badge>
    }
  }

  return (
    <aside
      className={`border-r border-slate-200 h-screen fixed top-0 left-0 w-80 bg-white shadow-lg transition-transform duration-300 transform ${isVisible ? 'translate-x-0' : '-translate-x-full'} overflow-auto z-10 scrollbar-none`}
    >
      <div className="sticky top-0 bg-white p-4 border-b border-slate-200 flex justify-between items-center z-20">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">UserOp History</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search Section */}
      <div className="px-4 pb-4 border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by activity (e.g., swap, deposit, transfer...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 pr-20"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
            {currentSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSearch}
              className="h-6 px-2 text-xs"
            >
              Search
            </Button>
          </div>
        </div>
        {currentSearch && (
          <div className="mt-2 text-xs text-slate-600">
            Searching for: <span className="font-medium">"{currentSearch}"</span>
          </div>
        )}
      </div>

      <div className="p-4">
        {error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200 mt-4">
            <p>{error}</p>
          </div>
        ) : userOps.length === 0 ? (
          <div className="text-center p-8 text-slate-500">
            <Clock className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p>No UserOperation history</p>
          </div>
        ) : (
          <div className="space-y-3">
            {userOps.map((op, index) => (
              <div
                key={op.userOpHash}
                // 最後の要素であればrefにlastUserOpRefを渡す
                // → これがIntersection Observerの監視対象になる
                ref={index === userOps.length - 1 ? lastUserOpRef : undefined}
                className={'p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow'}
                onClick={() => handleOpClick(op)}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium">{getOperationName(op.calldata)}</div>
                  {getPaymentMethodBadge(op.paymentMethod)}
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(op.blockTimestamp)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-slate-500">
                    {shortenHex(op.transactionHash)}
                  </div>
                  <Badge
                    variant="outline"
                    className={op.success ? 'text-green-600' : 'text-red-600'}
                  >
                    {op.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && !userOps.length && (
          <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}

        {!loading && !hasMore && userOps.length > 0 && (
          <div className="text-center p-4 text-sm text-slate-500">All history displayed</div>
        )}

        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>UserOperation Detail</DialogTitle>
            </DialogHeader>

            {selectedOp && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1 text-sm font-medium text-slate-500">Status</div>
                  <div className="col-span-3">
                    <Badge
                      variant="outline"
                      className={
                        selectedOp.success
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }
                    >
                      {selectedOp.success ? 'Success' : 'Failed'}
                    </Badge>
                  </div>

                  <div className="col-span-1 text-sm font-medium text-slate-500">Time</div>
                  <div className="col-span-3 text-sm">{formatDate(selectedOp.blockTimestamp)}</div>

                  <div className="col-span-1 text-sm font-medium text-slate-500">Sender</div>
                  <div className="col-span-3 text-sm font-mono break-all">{selectedOp.sender}</div>

                  <div className="col-span-1 text-sm font-medium text-slate-500">Nonce</div>
                  <div className="col-span-3 text-sm">{selectedOp.nonce}</div>

                  <div className="col-span-1 text-sm font-medium text-slate-500">
                    Patment Method
                  </div>
                  <div className="col-span-3">
                    {getPaymentMethodBadge(selectedOp.paymentMethod)}
                  </div>

                  <div className="col-span-1 text-sm font-medium text-slate-500">Tx Hash</div>
                  <div className="col-span-3 text-sm font-mono break-all">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${selectedOp.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      {selectedOp.transactionHash}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="col-span-1 text-sm font-medium text-slate-500">UserOp Hash</div>
                  <div className="col-span-3 text-sm font-mono break-all">
                    {selectedOp.userOpHash}
                  </div>
                </div>

                {selectedOp.calldata && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">UserOperation</h4>
                    <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-sm">
                      {(() => {
                        try {
                          const decoded = decodeCallData(selectedOp.calldata as Hex)

                          return (
                            <div>
                              <p className="font-medium">{decoded.functionName}</p>

                              {decoded.operations && decoded.operations.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {decoded.operations.map((op, index) => (
                                    <div
                                      key={index}
                                      className="bg-white p-2 rounded border border-slate-200"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">{op.functionName}</span>
                                        {op.value && op.value > BigInt(0) && (
                                          <Badge variant="outline" className="bg-blue-50">
                                            {formatEther(op.value)} ETH
                                          </Badge>
                                        )}
                                      </div>
                                      {op.contractAddress && (
                                        <div className="text-xs mt-1">
                                          <span className="text-slate-500">Contract: </span>
                                          <span className="font-mono">{op.contractAddress}</span>
                                        </div>
                                      )}
                                      {op.args && op.args.length > 0 && (
                                        <details className="mt-1">
                                          <summary className="cursor-pointer text-xs text-primary">
                                            View arguments
                                          </summary>
                                          <div className="mt-1 text-xs font-mono bg-slate-50 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                                            <pre className="whitespace-pre-wrap">
                                              {JSON.stringify(
                                                op.args,
                                                (_, value) =>
                                                  typeof value === 'bigint'
                                                    ? value.toString()
                                                    : value,
                                                2
                                              )}
                                            </pre>
                                          </div>
                                        </details>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        } catch (err) {
                          console.error('Error rendering decoded calldata:', err)
                          return (
                            <p className="text-red-500">
                              Decode Error: {err instanceof Error ? err.message : 'Unknown error'}
                            </p>
                          )
                        }
                      })()}
                    </div>
                  </div>
                )}

                {selectedOp.error && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium mb-2 text-red-600">Error</h4>
                    <div className="bg-red-50 p-3 rounded-md border border-red-200 text-sm">
                      {selectedOp.error}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  )
}

export default UserOperationHistory
