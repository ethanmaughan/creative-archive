import { z } from 'zod'

export const MARKET_KINDS = ['agent', 'publisher', 'magazine', 'contest'] as const
export type MarketKind = (typeof MARKET_KINDS)[number]

export const marketSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(MARKET_KINDS),
  name: z.string().min(1),
  org: z.string().optional(),
  email: z.string().optional(),
  url: z.string().optional(),
})
export type Market = z.infer<typeof marketSchema>
