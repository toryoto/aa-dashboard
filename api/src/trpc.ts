import { initTRPC } from '@trpc/server'
import { z } from 'zod'

// tRPCの初期化
export const t = initTRPC.create()

export const router = t.router
export const publicProcedure = t.procedure