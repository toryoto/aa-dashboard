import { Hex } from 'viem'

export interface UserOperation {
  sender: Hex
  nonce: Hex
  initCode: Hex
  callData: Hex
  callGasLimit: Hex
  verificationGasLimit: Hex
  preVerificationGas: Hex
  maxFeePerGas: Hex
  maxPriorityFeePerGas: Hex
  paymasterAndData: Hex
  signature: Hex
}

export interface UserOperationV08 {
  sender: Hex
  nonce: Hex
  factory?: Hex
  factoryData?: Hex
  callData: Hex
  callGasLimit: Hex
  verificationGasLimit: Hex
  preVerificationGas: Hex
  maxFeePerGas: Hex
  maxPriorityFeePerGas: Hex
  paymaster?: Hex
  paymasterVerificationGasLimit?: Hex
  paymasterPostOpGasLimit?: Hex
  paymasterData?: Hex
  signature: Hex
}
