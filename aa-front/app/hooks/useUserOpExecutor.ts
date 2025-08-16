import { useState, useCallback } from 'react'
import { encodeFunctionData, erc20Abi, Hex } from 'viem'
import { bundlerClient } from '../utils/client'
import { MULTI_TOKEN_PAYMASTER_ADDRESS } from '../constants/addresses'
import { usePaymasterData } from './usePaymasterData'
import { useExecuteUserOperation } from './useExecuteUserOperation'
import { useUserOpConfirmation } from '../contexts/UserOpConfirmationContext'
import { useMultiTokenPaymasterData } from './useMultiTokenPaymasterData'
import { SimpleAccountABI } from '../abi/simpleAccount'
import { useCreateUserOperation } from './useCreateUserOperation'
import { useEstimateUserOperationGas } from './useEstimateUserOperationGas'
import type { UserOperationV08 as UserOperation } from '../lib/userOperationType'
import { decodeCallData } from '../utils/decodeCallData'

interface ExecuteOptions {
  factory?: Hex;
  factoryData?: Hex;
  
  waitForReceipt?: boolean
  timeout?: number
  usePaymaster?: boolean
  multiTokenPaymaster?: boolean
  // v0.8 では paymaster と paymasterData を分割で受ける
  customPaymaster?: Hex
  customPaymasterVerificationGasLimit?: Hex
  customPaymasterPostOpGasLimit?: Hex
  customPaymasterData?: Hex
  skipConfirmation?: boolean
  tokenAddress?: string
}

interface ExecuteResult {
  success: boolean
  userOpHash?: Hex
  txHash?: string
  receipt?: any
  error?: string
}

export function useUserOperationExecutor(aaAddress: Hex) {
  const [isProcessing, setIsProcessing] = useState(false)

  // ここは v0.8 仕様の返却にしておく：
  //   getPaymasterAndData(userOp) -> { paymaster, paymasterData, paymasterVerificationGasLimit?, paymasterPostOpGasLimit? }
  const { getPaymasterAndData } = usePaymasterData()
  const { execute } = useExecuteUserOperation() // v0.8 Unpacked を送る実装前提
  const { showConfirmation, completeOperation } = useUserOpConfirmation()
  const { getMultiTokenPaymasterAndData, selectedToken, checkTokenAllowance } =
    useMultiTokenPaymasterData(aaAddress)
  const { createUserOperation } = useCreateUserOperation() // v0.8 Unpacked を返す
  const { estimateUserOperationGas } = useEstimateUserOperationGas() // v0.8 版

  // --- ERC20 承認（Paymaster 用）
  const approveTokenForPaymaster = useCallback(
    async (tokenAddress: Hex): Promise<ExecuteResult> => {
      try {
        const maxApprovalAmount = BigInt(
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        )

        const approveCallData = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [MULTI_TOKEN_PAYMASTER_ADDRESS, maxApprovalAmount],
        })

        const executeCallData = encodeFunctionData({
          abi: SimpleAccountABI,
          functionName: 'execute',
          args: [tokenAddress, 0n, approveCallData],
        })

        const userOp = await createUserOperation({
          aaAddress,
          callData: executeCallData,
        })

        // v0.8: 分割フィールドで受け取り、userOp に反映
        // const pm = await getPaymasterAndData(userOp)
        // if (pm) {
        //   userOp = {
        //     ...userOp,
        //     ...(pm.paymaster ? { paymaster: pm.paymaster } : {}),
        //     ...(pm.paymasterVerificationGasLimit
        //       ? { paymasterVerificationGasLimit: pm.paymasterVerificationGasLimit }
        //       : {}),
        //     ...(pm.paymasterPostOpGasLimit
        //       ? { paymasterPostOpGasLimit: pm.paymasterPostOpGasLimit }
        //       : {}),
        //     ...(pm.paymasterData ? { paymasterData: pm.paymasterData } : {}),
        //   }
        // }

        const userOpHash = await execute(userOp)
        const receipt = await bundlerClient.waitForUserOperationReceipt({
          hash: userOpHash,
          timeout: 60_000,
        })

        return {
          success: receipt.success,
          userOpHash,
          txHash: receipt.receipt.transactionHash,
          receipt,
        }
      } catch (error) {
        console.error('Token approval failed:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }
      }
    },
    [aaAddress, createUserOperation, execute, getPaymasterAndData]
  )

  // --- 実際の UserOp 実行
  const performExecution = useCallback(
    async (userOpIn: UserOperation, options: ExecuteOptions = {}): Promise<ExecuteResult> => {
      const {
        timeout = 60_000,
        usePaymaster = false,
        multiTokenPaymaster = false,
        customPaymaster,
        customPaymasterVerificationGasLimit,
        customPaymasterPostOpGasLimit,
        customPaymasterData,
        tokenAddress,
      } = options

      if (!aaAddress || aaAddress === '0x') {
        return { success: false, error: 'Smart account address not available' }
      }

      setIsProcessing(true)
      const userOp = { ...userOpIn }

      try {
        // // 1) Paymaster の適用（v0.8 分割フィールド）
        // if (customPaymaster || customPaymasterData) {
        //   userOp = {
        //     ...userOp,
        //     ...(customPaymaster ? { paymaster: customPaymaster } : {}),
        //     ...(customPaymasterVerificationGasLimit
        //       ? { paymasterVerificationGasLimit: customPaymasterVerificationGasLimit }
        //       : {}),
        //     ...(customPaymasterPostOpGasLimit
        //       ? { paymasterPostOpGasLimit: customPaymasterPostOpGasLimit }
        //       : {}),
        //     ...(customPaymasterData ? { paymasterData: customPaymasterData } : {}),
        //   }
        // } else if (usePaymaster) {
        //   const pm = await getPaymasterAndData(userOp)
        //   if (pm) {
        //     userOp = {
        //       ...userOp,
        //       ...(pm.paymaster ? { paymaster: pm.paymaster } : {}),
        //       ...(pm.paymasterVerificationGasLimit
        //         ? { paymasterVerificationGasLimit: pm.paymasterVerificationGasLimit }
        //         : {}),
        //       ...(pm.paymasterPostOpGasLimit
        //         ? { paymasterPostOpGasLimit: pm.paymasterPostOpGasLimit }
        //         : {}),
        //       ...(pm.paymasterData ? { paymasterData: pm.paymasterData } : {}),
        //     }
        //   }
        // } else if (multiTokenPaymaster) {
        //   const tokenToUse = (tokenAddress || selectedToken?.address) as Hex | undefined
        //   if (!tokenToUse) return { success: false, error: 'No token selected for gas payment' }

        //   const hasAllowance = await checkTokenAllowance(tokenToUse)
        //   if (!hasAllowance) {
        //     const approveResult = await approveTokenForPaymaster(tokenToUse)
        //     if (!approveResult.success) {
        //       return { success: false, error: `Failed to approve token: ${approveResult.error}` }
        //     }
        //   }

        //   const pm = await getMultiTokenPaymasterAndData(userOp, tokenToUse)
        //   if (pm) {
        //     userOp = {
        //       ...userOp,
        //       ...(pm.paymaster ? { paymaster: pm.paymaster } : {}),
        //       ...(pm.paymasterVerificationGasLimit
        //         ? { paymasterVerificationGasLimit: pm.paymasterVerificationGasLimit }
        //         : {}),
        //       ...(pm.paymasterPostOpGasLimit
        //         ? { paymasterPostOpGasLimit: pm.paymasterPostOpGasLimit }
        //         : {}),
        //       ...(pm.paymasterData ? { paymasterData: pm.paymasterData } : {}),
        //     }
        //   }
        // }
        // paymaster を使わない場合は何も付けない（デフォは undefined）

        // 2) 実行（送信は useExecuteUserOperation 側で eth_sendUserOperation / v0.8 EP を実施）
        const userOpHash = await execute(userOp)
        const receipt = await bundlerClient.waitForUserOperationReceipt({
          hash: userOpHash,
          timeout,
        })

        return {
          success: receipt.success,
          userOpHash,
          txHash: receipt.receipt.transactionHash,
          receipt,
        }
      } catch (error) {
        console.error('UserOperation execution failed:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [
      aaAddress,
      execute,
      // getPaymasterAndData,
      // getMultiTokenPaymasterAndData,
      // checkTokenAllowance,
      // approveTokenForPaymaster,
      // selectedToken,
    ]
  )

  // --- 外部エントリ：callData を実行
  const executeCallData = useCallback(
    async (callData: Hex, options: ExecuteOptions = {}): Promise<ExecuteResult> => {
      try {
        // 0) v0.8 Unpacked のベース userOp を作成（gas/fee は 0x0 のままでOK）
        let userOp = await createUserOperation({
          aaAddress,
          callData,
          factory: options.factory,
          factoryData: options.factoryData
        })

        // 1) ガス見積り（v0.8）
        let gasEstimateInfo:
          | {
              totalGasEth: string
              callGasLimit: Hex
              verificationGasLimit: Hex
              preVerificationGas: Hex
            }
          | undefined

        try {
          const { userOpResult, gas } = await estimateUserOperationGas(userOp)
          userOp = userOpResult
          gasEstimateInfo = {
            totalGasEth: gas.totalGasEth,
            callGasLimit: userOp.callGasLimit,
            verificationGasLimit: userOp.verificationGasLimit,
            preVerificationGas: userOp.preVerificationGas,
          }
        } catch (estimateError) {
          console.warn('Gas estimation failed:', estimateError)
          // 見積もり失敗でも続行（UI 上のガス表示は空）
        }

        console.log(66666, userOp)

        // 2) 確認モーダル（支払い方法選択）
        const userSelection = await showConfirmation(callData, gasEstimateInfo)

        // 3) ユーザー選択を options に反映
        const updatedOptions: ExecuteOptions = {
          ...options,
          usePaymaster: userSelection.paymentOption === 'paymaster',
          multiTokenPaymaster: userSelection.paymentOption === 'token',
          ...(userSelection.paymentOption === 'token' && userSelection.tokenAddress
            ? { tokenAddress: userSelection.tokenAddress }
            : {}),
        }

        // 4) 実行
        const result = await performExecution(userOp, updatedOptions)

        // 5) 保存（任意）
        const decoded = decodeCallData(callData)
        const functionName = decoded.operations[decoded.operations.length - 1].functionName

        if (result.success && result.userOpHash) {
          try {
            await fetch('/api/saveUserOp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userOpHash: result.userOpHash,
                sender: aaAddress,
                nonce: userOp.nonce.toString(),
                success: result.success,
                transactionHash: result.txHash,
                blockNumber: result.receipt?.receipt.blockNumber?.toString() || '0',
                blockTimestamp: Math.floor(Date.now() / 1000).toString(),
                calldata: callData,
                paymentMethod: userSelection.paymentOption,
                // v0.8: デプロイ無し運用なので initCode は常に '0x' 相当
                initCode: '0x',
                actionType: functionName,
              }),
            })
          } catch (saveError) {
            console.warn('Failed to save UserOperation:', saveError)
          }
        }

        completeOperation(result.success)
        return result
      } catch (error) {
        console.error('An error occurred during UserOperation execution:', error)
        completeOperation(false)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
        }
      }
    },
    [
      aaAddress,
      createUserOperation,
      estimateUserOperationGas,
      showConfirmation,
      performExecution,
      completeOperation,
    ]
  )

  return { executeCallData, isProcessing }
}
