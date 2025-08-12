import { Hex } from 'viem'
import { PackedUserOperation } from '../lib/userOperationType'

// 2つの数値を32バイトずつパックしてHex文字列として返すユーティリティ関数
const packUints = (a: number, b: number): Hex => {
  // aを下位128ビット、bを上位128ビットに配置
  return `0x${(BigInt(a) | (BigInt(b) << BigInt(128))).toString(16).padStart(64, '0')}` as Hex
}

export const createPackedUserOperation = (params: {
  sender: Hex
  nonce: Hex
  initCode?: Hex
  callData: Hex
  verificationGasLimit: number
  callGasLimit: number
  preVerificationGas: number
  maxFeePerGas: number
  maxPriorityFeePerGas: number
  paymasterAndData?: Hex
  signature?: Hex
}): PackedUserOperation => {
  return {
    sender: params.sender,
    nonce: params.nonce,
    initCode: params.initCode || '0x',
    callData: params.callData,
    accountGasLimits: packUints(params.verificationGasLimit, params.callGasLimit),
    preVerificationGas: `0x${params.preVerificationGas.toString(16)}` as Hex,
    gasFees: packUints(params.maxFeePerGas, params.maxPriorityFeePerGas),
    paymasterAndData: params.paymasterAndData || '0x',
    signature: params.signature || '0x',
  }
}
