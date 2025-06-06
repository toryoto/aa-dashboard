import { useState, useCallback } from 'react'
import { encodeFunctionData, erc20Abi, Hex, toHex } from 'viem'
import { bundlerClient } from '../utils/client'
import { MULTI_TOKEN_PAYMASTER_ADDRESS } from '../constants/addresses'
import { usePaymasterData } from './usePaymasterData'
import { useExecuteUserOperation } from './useExecuteUserOperation'
import { useUserOpConfirmation } from '../contexts/UserOpConfirmationContext'
import { useMultiTokenPaymasterData } from './useMultiTokenPaymasterData'
import { SimpleAccountABI } from '../abi/simpleAccount'
import { useCreateUserOperation } from './useCreateUserOperation'
import { useEstimateUserOperationGas } from './useEstimateUserOperationGas'
import { UserOperation } from '../lib/userOperationType'
import { decodeCallData } from '../utils/decodeCallData'

interface ExecuteOptions {
  initCode?: Hex
  waitForReceipt?: boolean
  timeout?: number
  usePaymaster?: boolean
  multiTokenPaymaster?: boolean
  customPaymasterAndData?: Hex
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
  const { getPaymasterAndData } = usePaymasterData()
  const { execute } = useExecuteUserOperation()
  const { showConfirmation, completeOperation } = useUserOpConfirmation()
  const { getMultiTokenPaymasterAndData, selectedToken, checkTokenAllowance } =
    useMultiTokenPaymasterData(aaAddress)
  const { createUserOperation } = useCreateUserOperation()
  const { estimateUserOperationGas } = useEstimateUserOperationGas()

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
          args: [tokenAddress, BigInt(0), approveCallData],
        })

        const userOp = await createUserOperation({
          aaAddress,
          callData: executeCallData,
        })
        const paymasterAndData = await getPaymasterAndData(userOp)
        userOp.paymasterAndData = paymasterAndData
        const userOpHash = await execute(userOp)

        const receipt = await bundlerClient.waitForUserOperationReceipt({
          hash: userOpHash,
          timeout: 60000,
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

  /**
   * 実際のUserOp実行処理を行う内部関数
   * calldataと支払いoptionを引数に取り、UserOpの構築・実行を行う
   */
  const performExecution = useCallback(
    async (userOp: UserOperation, options: ExecuteOptions = {}): Promise<ExecuteResult> => {
      // デフォルトはガス代サポートもERC20支払いもなし
      const {
        initCode = '0x',
        timeout = 60000,
        usePaymaster = false,
        multiTokenPaymaster = false,
        customPaymasterAndData,
        tokenAddress,
      } = options

      if (!aaAddress || aaAddress === '0x') {
        return { success: false, error: 'Smart account address not available' }
      }

      setIsProcessing(true)

      try {
        if (customPaymasterAndData) {
          userOp.paymasterAndData = customPaymasterAndData
        } else if (usePaymaster) {
          // ユーザがpaymaster使用を選択した場合、paymasterAndDataを作成する
          const paymasterAndData = await getPaymasterAndData(userOp)
          userOp.paymasterAndData = paymasterAndData
        } else if (multiTokenPaymaster) {
          // ユーザがERC20支払を選択した場合
          // tokenAddressが指定されている場合はそれを使用、そうでなければselectedToken
          const tokenToUse = tokenAddress || (selectedToken ? selectedToken.address : null)

          if (!tokenToUse) {
            return { success: false, error: 'No token selected for gas payment' }
          }

          // トークンの許可を確認
          const hasAllowance = await checkTokenAllowance(tokenToUse as Hex)

          if (!hasAllowance) {
            // approveがない場合は承認トランザクションを実行
            const approveResult = await approveTokenForPaymaster(tokenToUse as Hex)
            if (!approveResult.success) {
              return {
                success: false,
                error: `Failed to approve token: ${approveResult.error}`,
              }
            }
            console.log('Token approval successful:', approveResult)
          }

          const paymasterAndData = await getMultiTokenPaymasterAndData(userOp, tokenToUse as Hex)
          userOp.paymasterAndData = paymasterAndData
        }

        // paymasterを使用せずにネイティブ通貨で支払う場合は paymasterAndData は '0x' のまま
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
      getPaymasterAndData,
      execute,
      getMultiTokenPaymasterAndData,
      checkTokenAllowance,
      approveTokenForPaymaster,
      selectedToken,
    ]
  )

  // 外部から呼び出す構築したcallDataを実行するためのメソッド
  const executeCallData = useCallback(
    async (callData: Hex, options: ExecuteOptions = {}): Promise<ExecuteResult> => {
      try {
        // 基本的なUserOpを作成
        const userOp = await createUserOperation({
          aaAddress,
          callData,
          initCode: options.initCode || '0x',
        })

        // ガス代の推定を取得
        let gasEstimateInfo
        try {
          const { userOpResult, totalGasEth } = await estimateUserOperationGas(userOp)

          // ガス見積もり情報を作成
          gasEstimateInfo = {
            totalGasEth: totalGasEth,
            callGasLimit: userOpResult.callGasLimit,
            verificationGasLimit: userOpResult.verificationGasLimit,
            preVerificationGas: userOpResult.preVerificationGas,
          }
        } catch (estimateError) {
          console.warn('Gas estimation failed:', estimateError)
          // エラーが発生しても続行（情報なしで）
        }

        // 確認モーダルを表示し、ユーザーの選択を待つ
        // ガス見積もり情報もモーダルに渡す
        const userSelection = await showConfirmation(callData, gasEstimateInfo)

        // ユーザーのガス代支払い方法選択を反映したオプションを作成
        const updatedOptions: ExecuteOptions = {
          ...options,
          usePaymaster: userSelection.paymentOption === 'paymaster',
          multiTokenPaymaster: userSelection.paymentOption === 'token',
        }

        if (userSelection.paymentOption === 'token' && userSelection.tokenAddress) {
          updatedOptions.tokenAddress = userSelection.tokenAddress
        }

        console.log('userop', userOp)

        const result = await performExecution(userOp, updatedOptions)

        const decodedData = decodeCallData(callData)
        const functionName = decodedData.operations[decodedData.operations.length - 1].functionName

        if (result.success && result.userOpHash) {
          try {
            await fetch('/api/saveUserOp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
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
                initCode: options.initCode || '0x',
                actionType: functionName,
              }),
            })
          } catch (saveError) {
            console.warn('Failed to save UserOperation:', saveError)
            // 保存が失敗してもユーザー操作には影響しないため、エラーは無視する
          }
        }

        // 処理完了を通知（モーダルを閉じる）
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

  return {
    executeCallData,
    isProcessing,
  }
}
