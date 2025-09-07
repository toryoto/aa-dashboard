import { Hex, formatEther } from 'viem'
import { publicClient } from '../utils/client'
import { ENTRY_POINT_V08_ADDRESS } from '../constants/addresses'
import type { UserOperationV08, PackedUserOperation } from '../lib/userOperationType'

export const HEX_ZERO = '0x0' as const
export const HEX_EMPTY = '0x' as const

export const DEFAULT_CALL_GAS_LIMIT = '0x186a0' as const // 100,000
export const DEFAULT_VERIFICATION_GAS_LIMIT = '0x30d40' as const // 200,000
export const DEFAULT_PRE_VERIFICATION_GAS = '0x2710' as const // 10,000
export const FALLBACK_FEE_1_GWEI = '0x3b9aca00' as const // 1 gwei

export const isValidNonZeroHex = (value: unknown): value is `0x${string}` => {
  if (typeof value !== 'string') return false
  if (value === HEX_ZERO || value === HEX_EMPTY) return false
  try {
    return BigInt(value) > 0n
  } catch {
    return false
  }
}

export const getValidGasValue = (value: unknown, fallback: `0x${string}`): `0x${string}` =>
  isValidNonZeroHex(value) ? (value as `0x${string}`) : fallback

export const buildDummySignature = (): `0x${string}` =>
  [
    '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c',
  ].join('') as `0x${string}`

export const calcTotals = (
  callGas: `0x${string}`,
  verificationGas: `0x${string}`,
  preVerificationGas: `0x${string}`,
  maxFeePerGasBI: bigint
) => {
  const call = BigInt(callGas)
  const verify = BigInt(verificationGas)
  const pre = BigInt(preVerificationGas)
  const totalGas = call + verify + pre
  const totalGasWei = totalGas * maxFeePerGasBI
  const totalGasEth = formatEther(totalGasWei)
  return { totalGasWei, totalGasEth }
}

// v0.8: pack two uint128 -> bytes32 (high<<128 | low)
export const packUintsToBytes32 = (high: bigint, low: bigint): Hex => {
  const packed = (high << 128n) | (low & ((1n << 128n) - 1n))
  return `0x${packed.toString(16).padStart(64, '0')}` as Hex
}

export const buildEip712Domain = async () =>
  ({
    name: 'ERC4337',
    version: '1',
    chainId: await publicClient.getChainId(),
    verifyingContract: ENTRY_POINT_V08_ADDRESS as `0x${string}`,
  }) as const

export const eip712Types = {
  PackedUserOperation: [
    { name: 'sender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'initCode', type: 'bytes' },
    { name: 'callData', type: 'bytes' },
    { name: 'accountGasLimits', type: 'bytes32' },
    { name: 'preVerificationGas', type: 'uint256' },
    { name: 'gasFees', type: 'bytes32' },
    { name: 'paymasterAndData', type: 'bytes' },
  ],
} as const

export const buildPaymasterAndData = (u: UserOperationV08): Hex => {
  return u.paymaster
    ? ((u.paymaster +
        (u.paymasterVerificationGasLimit ?? '0x').slice(2) +
        (u.paymasterPostOpGasLimit ?? '0x').slice(2) +
        (u.paymasterData ?? '0x').slice(2)) as Hex)
    : (HEX_EMPTY as Hex)
}

export const toPackedUserOperation = (u: UserOperationV08): PackedUserOperation => {
  const verificationGasLimit = BigInt(u.verificationGasLimit)
  const callGasLimit = BigInt(u.callGasLimit)
  const preVerificationGas = BigInt(u.preVerificationGas)
  const maxFeePerGas = BigInt(u.maxFeePerGas)
  const maxPriorityFeePerGas = BigInt(u.maxPriorityFeePerGas)

  const accountGasLimits = packUintsToBytes32(verificationGasLimit, callGasLimit)
  const gasFees = packUintsToBytes32(maxPriorityFeePerGas, maxFeePerGas)

  const initCode =
    u.factory && u.factoryData
      ? (`${u.factory}${u.factoryData.slice(2)}` as Hex)
      : (HEX_EMPTY as Hex)

  const paymasterAndData = buildPaymasterAndData(u)

  return {
    sender: u.sender,
    nonce: u.nonce,
    initCode,
    callData: u.callData ?? (HEX_EMPTY as Hex),
    accountGasLimits,
    preVerificationGas: `0x${preVerificationGas.toString(16)}` as Hex,
    gasFees,
    paymasterAndData,
    signature: (u.signature ?? HEX_EMPTY) as Hex,
  }
}
