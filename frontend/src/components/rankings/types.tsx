// components/rankings/types.tsx
import type { CardModel } from '../cards/types'

/** Comparators for rating filter. */
export type RatingOp = 'lte' | 'eq' | 'gte'

export type RankingFilters = {
    category_ids?: number[]
    rating?: number | null
    rating_param?: RatingOp
}

export type RankedCard = CardModel & {
    pivot?: { placement?: number; tier?: string }
}

export type Ranking = {
    id: number
    name: string
    description?: string | null
    image_url?: string | null
    /**
     * Semicolon separated tier names, e.g. "S;A;B".
     * Use helpers to parse/serialize.
     */
    tiers?: string | null
    /**
     * On the API it may arrive as object or JSON string or null.
     * Use parseFilters(...) helper to normalize.
     */
    filters: RankingFilters | string | null
    cards?: RankedCard[]
}

export type RankingItem = { card_id: number; placement: number; tier: string }
