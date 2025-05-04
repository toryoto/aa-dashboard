import { getContract, Hex } from 'viem'
import { verifyingPaymasterAbi } from '../abi/verifyingPaymaster'
import { publicClient } from '../utils/client'
import type { UserOperation } from '../types/userOperationType'
import dotenv from 'dotenv'

dotenv.config()

// フロントまたはオンチェーンのUserOperationEventで検知した情報をもとに、UserOperationテーブルにデータを保存するAPI
// WebSocketまたはHTTPを使用する
export const saveUserOpController = async (req: any, res: any) => {}
