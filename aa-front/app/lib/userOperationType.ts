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

export interface PackedUserOperation {
  sender: Hex
  nonce: Hex
  initCode: Hex
  callData: Hex
  accountGasLimits: Hex // packed: verificationGasLimit + callGasLimit
  preVerificationGas: Hex
  gasFees: Hex // packed: maxFeePerGas + maxPriorityFeePerGas
  paymasterAndData: Hex // paymaster address + paymaster data
  signature: Hex
}
