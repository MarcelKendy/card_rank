// components/rankings/utils.ts
import type { CardModel } from '../cards/types'
import type { Ranking, RankedCard, RankingFilters, RankingItem, RatingOp } from './types'

/* ============================================================================
   Constants
============================================================================ */
export const BEST_ON_RIGHT = false // false => best (smallest placement) on the LEFT
export const TITLE_SHADOW = '0px 1px 10px rgba(0, 0, 0, 1)'
export const TILE_SIZE = 42

// Shared field validators
export const NAME_MIN = 2
export const NAME_MAX = 50
export const DESC_MIN = 5
export const DESC_MAX = 265
export const TIER_NAME_MAX = 48

/* ============================================================================
   Helpers: filters, tiers, names
============================================================================ */
export function parseFilters(input: Ranking['filters']): RankingFilters {
    if (!input) return {}
    if (typeof input === 'object') return input as RankingFilters
    try {
        const obj = JSON.parse(input)
        return typeof obj === 'object' && obj ? (obj as RankingFilters) : {}
    } catch {
        return {}
    }
}

export const parseTiers = (v?: string | null) =>
    v
        ?.split(';')
        .map((s) => s.trim())
        .filter(Boolean) ?? []

export const serializeTiers = (names: string[]) =>
    names
        .map((s) => s.trim())
        .filter(Boolean)
        .join(';')

/** Image helper: gets the first URL from a multi-line string (supports "\n" and legacy "\\n\\n"). */
export function extractFirstImageUrl(multi?: string | null): string {
    if (!multi) return ''
    // handle both real newlines and double-escaped legacy separators
    const a = String(multi).split('\n')[0] ?? ''
    const b = a.split('\\n\\n')[0] ?? ''
    return b.trim()
}

/** Title-case words; used while typing the Name field. */
export function formatName(input: string, locale?: string): string {
    return input.replace(/(\S+)/g, (word) => {
        const chars = [...word]
        if (chars.length < 2) return word
        const [first, ...rest] = chars
        const firstUp = locale ? first.toLocaleUpperCase(locale) : first.toLocaleUpperCase()
        const restLower = locale
            ? rest.join('').toLocaleLowerCase(locale)
            : rest.join('').toLowerCase()
        return firstUp + restLower
    })
}

/* ============================================================================
   Validation (return null when valid, otherwise an error string)
============================================================================ */
export function validateNameValue(value: string): string | null {
    const v = value.trim()
    if (!v) return 'Name is required'
    if (v.length < NAME_MIN) return `Name should be at least ${NAME_MIN} chars`
    if (v.length > NAME_MAX) return `Name should be ${NAME_MAX} chars at most`
    return null
}

export function validateDescriptionValue(value: string): string | null {
    const v = value.trim()
    if (!v) return 'Description is required'
    if (v.length < DESC_MIN) return `Description should be at least ${DESC_MIN} chars`
    if (v.length > DESC_MAX) return `Description should be ${DESC_MAX} chars at most`
    return null
}

export function validateTiersValue(value: string): string | null {
    const tiers = value
        .split(';')
        .map((t) => t.trim())
        .filter(Boolean)
    if (tiers.length === 0) return 'At least one tier is required'
    if (tiers.some((t) => t.length < 1 || t.length > TIER_NAME_MAX)) {
        return `Each tier name must be between 1 and ${TIER_NAME_MAX} characters`
    }
    return null
}

/* ============================================================================
   Business rules
============================================================================ */
export function cardMatchesFilters(card: CardModel, f?: RankingFilters | null) {
    const filters = f ?? {}
    if (filters.category_ids && filters.category_ids.length > 0) {
        const set = new Set(card.categories.map((c) => c.id))
        if (!filters.category_ids.every((id) => set.has(id))) return false
    }
    if (filters.rating != null) {
        const cr = card.rating ?? 0
        const op: RatingOp = filters.rating_param ?? 'eq'
        if (op === 'eq' && cr !== filters.rating) return false
        if (op === 'lte' && cr > filters.rating) return false
        if (op === 'gte' && cr < filters.rating) return false
    }
    return true
}

/** Build sync items from the current tiers map using explicit tier order. */
export function buildSyncItemsFromState(
    orderedTiers: string[],
    tiersMap: Record<string, number[]>,
    opts: { bestOnRight?: boolean } = { bestOnRight: BEST_ON_RIGHT }
): RankingItem[] {
    const bestOnRight = opts.bestOnRight ?? BEST_ON_RIGHT
    const items: RankingItem[] = []
    let placement = 1
    for (const tier of orderedTiers) {
        const row = tiersMap[tier] ?? []
        if (bestOnRight) {
            for (let i = row.length - 1; i >= 0; i--) {
                items.push({ card_id: row[i], placement: placement++, tier })
            }
        } else {
            for (const id of row) {
                items.push({ card_id: id, placement: placement++, tier })
            }
        }
    }
    return items
}

/** Seed map from server pivot on first load; honors orientation. */
export function initialMapFromPivot(
    ranking: Ranking,
    tierNames: string[]
): Record<string, number[]> {
    const map: Record<string, number[]> = {}
    for (const t of tierNames) map[t] = []

    const first = tierNames[0]
    const byTier: Record<string, RankedCard[]> = {}
    for (const t of tierNames) byTier[t] = []

    for (const c of ranking.cards ?? []) {
        const t = c.pivot?.tier && map[c.pivot.tier] ? c.pivot.tier : first
        if (!byTier[t]) byTier[t] = []
        byTier[t].push(c)
    }

    for (const t of tierNames) {
        const arr = (byTier[t] ?? []).slice()
        arr.sort((a, b) => {
            const pa = a.pivot?.placement ?? Number.MAX_SAFE_INTEGER
            const pb = b.pivot?.placement ?? Number.MAX_SAFE_INTEGER
            return BEST_ON_RIGHT ? pb - pa : pa - pb
        })
        map[t] = arr.map((c) => c.id)
    }
    return map
}

/** Remove invalids, reinsert missing (defaults to first tier), keep order. */
export function reconcileMapWithServer(
    prev: Record<string, number[]>,
    serverCards: RankedCard[],
    tierNames: string[]
): Record<string, number[]> {
    const validIds = new Set(serverCards.map((c) => c.id))
    const next: Record<string, number[]> = {}
    for (const t of tierNames) {
        const row = prev[t] ?? []
        next[t] = row.filter((id) => validIds.has(id))
    }
    const inNext = new Set(Object.values(next).flat())
    const firstTier = tierNames[0]

    for (const c of serverCards) {
        if (inNext.has(c.id)) continue
        const tgt = c.pivot?.tier && next[c.pivot.tier] ? c.pivot.tier : firstTier
        next[tgt].push(c.id)
    }
    return next
}

/** Remap when tier names/order change; preserve rows & move orphans to first tier. */
export function remapForNewTierNames(
    prev: Record<string, number[]>,
    newNames: string[]
): Record<string, number[]> {
    const next: Record<string, number[]> = {}
    newNames.forEach((n) => (next[n] = prev[n] ? prev[n].slice() : []))
    const prevIds = new Set(Object.values(prev).flat())
    const nextIds = new Set(Object.values(next).flat())
    const orphans = [...prevIds].filter((id) => !nextIds.has(id))
    if (orphans.length > 0 && newNames.length > 0) {
        next[newNames[0]] = [...next[newNames[0]], ...orphans]
    }
    return next
}

/** Split a multi-image string into clean URLs.
 *  Supports '||', real newlines (LF/CRLF), and legacy '\\n\\n'.
 *  Also tolerates a JSON array string of URLs.
 */
export function splitImagesFlexible(value?: string | null): string[] {
    if (!value) return []

    const raw = String(value).trim()

    // Case 1: JSON array of URLs
    if (raw.startsWith('[') && raw.endsWith(']')) {
        try {
            const arr = JSON.parse(raw)
            if (Array.isArray(arr)) {
                return arr
                    .map(String)
                    .map((s) => s.trim())
                    .filter(Boolean)
            }
        } catch {
            // fall through to regex split
        }
    }

    // Case 2: Delimiters: '||', escaped \n\n, or real \n / \r\n
    // - one or more occurrences of any of the delimiters
    const parts = raw
        .replace(/\r\n/g, '\n')
        .split(/(?:\s*\|\|\s*|\\n\\n|\n)+/g)
        .map((s) => s.trim())
        .filter(Boolean)

    // Optional: final cleanup — strip surrounding quotes
    return parts.map((s) => s.replace(/^"(.*)"$/, '$1'))
}

/** First image URL or empty string. */
export function firstImage(value?: string | null): string {
    const imgs = splitImagesFlexible(value)
    return imgs.length ? imgs[0] : ''
}
