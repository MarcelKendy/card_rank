// pages/home.tsx
import * as React from 'react'
import {
    Box,
    Paper,
    Stack,
    Typography,
    CircularProgress,
    Snackbar,
    Alert,
    Chip,
    Skeleton,
    Avatar,
    Select,
    MenuItem,
    FormControl,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import ViewModuleIcon from '@mui/icons-material/ViewModule' // Cards
import LeaderboardIcon from '@mui/icons-material/Leaderboard' // Rankings
import CategoryIcon from '@mui/icons-material/Category' // Categories
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents' // Medals
import type { AlertColor } from '@mui/material/Alert'
import api from '../services/api'
import type { CardModel, Category } from '../components/cards/types'
import type { Ranking } from '../components/rankings/types'
import CardMini from '../components/rankings/CardMini'

/* ============================================================================
// KPI API (unchanged)
============================================================================ */
async function fetchAllCards(): Promise<CardModel[]> {
    const { data } = await api.get('/get_cards')
    return data as CardModel[]
}
async function fetchAllRankings(): Promise<Ranking[]> {
    const { data } = await api.get('/get_rankings')
    return data as Ranking[]
}
async function fetchAllCategories(): Promise<Category[]> {
    const { data } = await api.get('/get_categories')
    return data as Category[]
}

/* ============================================================================
// Top cards API types + normalization
============================================================================ */
type RankingWithPlacement = { id: number; name: string; placement: number }

// Raw row coming from the controller above
type TopCardApiRow = {
    card_id: number
    avg_placement: number | string
    appearances: number | string
    id: number
    name: string
    image_url?: string | null // full string with multiple URLs
    description?: string | null
    rating?: number | null
    categories?: { id: number; name: string; color?: string | null }[]
    rankings?: RankingWithPlacement[]
}

// Normalized for the UI
type TopCardNormalized = {
    card: CardModel // includes categories and full image_url
    rankingBadges: RankingWithPlacement[]
    avg: number
    appearances: number
}

function normalizeTopCardRow(r: TopCardApiRow): TopCardNormalized {
    const avg = Number(r.avg_placement ?? 0)
    const appearances = Number(r.appearances ?? 0)
    // Build a CardModel compatible with CardMini/CardTile (keep FULL image_url string)
    const card: CardModel = {
        id: r.id,
        name: r.name ?? 'Unnamed',
        description: r.description ?? '',
        image_url: r.image_url ?? '',
        rating: r.rating ?? 0,
        categories: Array.isArray(r.categories) ? (r.categories as any) : [],
    }
    const rankingBadges = Array.isArray(r.rankings) ? r.rankings : []
    return { card, rankingBadges, avg, appearances }
}

async function fetchTopCards(categoryId?: number | null): Promise<TopCardNormalized[]> {
    const { data } = await api.get('/get_best_ranked_cards', {
        params: categoryId ? { category_id: categoryId } : undefined,
    })
    const rows = (Array.isArray(data) ? data : []) as TopCardApiRow[]
    return rows.map(normalizeTopCardRow)
}

/* ============================================================================
// KPI Tile
============================================================================ */
type StatTileProps = {
    title: string
    value: number | null
    Icon: typeof ViewModuleIcon
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
}
function StatTile({ title, value, Icon, color }: StatTileProps) {
    return (
        <Paper
            variant="outlined"
            sx={(t) => ({
                p: 2,
                bgcolor: 'rgba(43, 44, 46, 0.5)',
                color: t.palette.common.white,
                border: '1px solid',
                borderColor: alpha(t.palette.common.white, 0.2),
                boxShadow:
                    'rgba(0, 0, 0, 0.79) 0px 2px 4px 0px, rgba(0, 0, 0, 1) 0px 2px 16px 0px;',
                backdropFilter: 'blur(2px)',
            })}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Stack spacing={0.5}>
                    <Typography
                        variant="h6"
                        sx={{ color: alpha('#fff', 0.85), textShadow: '1px 1px 0 #000' }}
                    >
                        {title}
                    </Typography>
                    <Typography
                        variant="h4"
                        fontWeight={800}
                        lineHeight={1}
                        sx={{ textShadow: '1px 1px 0 #000' }}
                    >
                        {value ?? <CircularProgress size={30} color={color} thickness={7} />}
                    </Typography>
                </Stack>
                <Box
                    sx={(t) => ({
                        p: 1.25,
                        borderRadius: 2,
                        bgcolor: alpha(t.palette[color].main, 0.18),
                        color: t.palette[color].main,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid',
                        borderColor: alpha('#fff', 0.18),
                    })}
                    aria-hidden
                >
                    <Icon sx={{ fontSize: 28 }} />
                </Box>
            </Stack>
        </Paper>
    )
}

/* ============================================================================
// Page
============================================================================ */
export default function HomePage() {
    const theme = useTheme()

    // counts
    const [cardsCount, setCardsCount] = React.useState<number | null>(null)
    const [rankingsCount, setRankingsCount] = React.useState<number | null>(null)
    const [categoriesCount, setCategoriesCount] = React.useState<number | null>(null)

    // categories (for dropdown + CardMini/CardTile)
    const [allCategories, setAllCategories] = React.useState<Category[]>([])

    // TOP CARDS + filter
    const [topCards, setTopCards] = React.useState<TopCardNormalized[] | null>(null)
    const [selectedCatId, setSelectedCatId] = React.useState<number | null>(null)

    // errors
    const [snackOpen, setSnackOpen] = React.useState(false)
    const [snackMsg, setSnackMsg] = React.useState('')
    const [snackSeverity, setSnackSeverity] = React.useState<AlertColor>('error')
    const notify = (message: string, severity: AlertColor = 'error') => {
        setSnackMsg(message)
        setSnackSeverity(severity)
        setSnackOpen(true)
    }

    // Initial loads
    React.useEffect(() => {
        ;(async () => {
            try {
                const [cards, rankings, categories] = await Promise.all([
                    fetchAllCards(),
                    fetchAllRankings(),
                    fetchAllCategories(),
                ])
                setCardsCount(cards.length)
                setRankingsCount(rankings.length)
                setCategoriesCount(categories.length)
                setAllCategories(categories)
            } catch (e: any) {
                console.error(e)
                notify(e?.response?.data?.message ?? 'Failed to load overview data', 'error')
                // Fallbacks
                setCardsCount(0)
                setRankingsCount(0)
                setCategoriesCount(0)
            }
        })()
    }, [])

    // Fetch top cards (initially and whenever category filter changes)
    const loadTop = React.useCallback(async (catId: number | null) => {
        try {
            setTopCards(null) // show skeleton while switching
            const best = await fetchTopCards(catId ?? undefined)
            setTopCards(best)
        } catch (e: any) {
            console.error(e)
            notify(e?.response?.data?.message ?? 'Failed to load best ranked cards', 'error')
            setTopCards([])
        }
    }, [])

    React.useEffect(() => {
        loadTop(selectedCatId)
    }, [selectedCatId, loadTop])
    
    const loadingTop = topCards === null

    const medalColor = (place: number) => {
        if (place === 1) return '#FFD700' // Gold
        if (place === 2) return '#C0C0C0' // Silver
        if (place === 3) return '#CD7F32' // Bronze
        return undefined
    }

    return (
        <Box>
            {/* Title */}
            <Typography
                variant="h5"
                fontWeight={800}
                sx={{ mb: 2, color: theme.palette.common.white, textShadow: '1px 1px 0 #000' }}
            >
                Overview
            </Typography>

            {/* KPI grid */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        mp: 'repeat(1, minmax(0, 1fr))',
                        lp: 'repeat(2, minmax(0, 1fr))',
                        sm: 'repeat(2, minmax(0, 1fr))',
                        md: 'repeat(3, minmax(0, 1fr))',
                    },
                    gap: 2,
                    mb: 2,
                }}
            >
                <StatTile title="Cards" value={cardsCount} Icon={ViewModuleIcon} color="primary" />
                <StatTile
                    title="Rankings"
                    value={rankingsCount}
                    Icon={LeaderboardIcon}
                    color="success"
                />
                <StatTile
                    title="Categories"
                    value={categoriesCount}
                    Icon={CategoryIcon}
                    color="warning"
                />
            </Box>

            {/* Best Ranked Cards */}
            <Paper
                variant="outlined"
                sx={(t) => ({
                    p: 2,
                    bgcolor: 'rgba(43, 44, 46, 0.5)',
                    color: t.palette.common.white,
                    border: '1px solid',
                    borderColor: alpha(t.palette.common.white, 0.2),
                    boxShadow:
                        'rgba(0, 0, 0, 0.79) 0px 2px 4px 0px, rgba(0, 0, 0, 1) 0px 2px 16px 0px;',
                    backdropFilter: 'blur(2px)',
                })}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mb: 1,
                    }}
                >
                    <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{ textShadow: '1px 1px 0 #000', flex: 1 }}
                    >
                        Best Ranked Cards
                    </Typography>

                    {/* Top-right Category Filter */}
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <Select
                            value={selectedCatId ?? 'all'}
                            onChange={(e) => {
                                const val = e.target.value as string | number
                                setSelectedCatId(val === 'all' ? null : Number(val))
                            }}
                            displayEmpty
                            renderValue={(val) => {
                                if (val === 'all') return 'All categories'
                                const c = allCategories.find((c) => c.id === Number(val))
                                return c ? `Filter: ${c.name}` : 'All categories'
                            }}
                        >
                            <MenuItem value="all">All categories</MenuItem>
                            {allCategories.map((c) => (
                                <MenuItem key={c.id} value={c.id}>
                                    {c.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {/* List */}
                {loadingTop ? (
                    <Stack spacing={1.25}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Stack
                                key={i}
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{
                                    p: 1,
                                    py: 1.5,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: alpha('#fff', 0.12),
                                    bgcolor: alpha('#000', 0.12),
                                }}
                            >
                                {/* Place + medal placeholder */}
                                <Box
                                    sx={{
                                        width: 36,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        gap: 0.5,
                                    }}
                                >
                                    <Skeleton variant="text" width={18} height={25} />
                                    <Skeleton variant="circular" width={20} height={20} />
                                </Box>
                                {/* Mini preview placeholder (~42px) */}
                                <Skeleton
                                    variant="rounded"
                                    width={42}
                                    height={42}
                                    sx={{ borderRadius: 1 }}
                                />
                                {/* Right column */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        useFlexGap
                                        flexWrap="wrap"
                                        sx={{ mt: 0.25 }}
                                    >
                                        <Skeleton variant="text" width={160} height={20} />
                                        <Skeleton variant="rounded" width={220} height={22} />
                                    </Stack>
                                    <Stack
                                        direction="row"
                                        spacing={0.5}
                                        useFlexGap
                                        flexWrap="wrap"
                                        sx={{ mt: 0.5 }}
                                    >
                                        <Skeleton variant="rounded" width={110} height={24} />
                                        <Skeleton variant="rounded" width={90} height={24} />
                                        <Skeleton variant="rounded" width={140} height={24} />
                                    </Stack>
                                </Box>
                            </Stack>
                        ))}
                    </Stack>
                ) : topCards && topCards.length > 0 ? (
                    <Stack spacing={1.25}>
                        {topCards.map((row, idx) => {
                            const { card, rankingBadges, avg, appearances } = row
                            const place = idx + 1
                            const color = medalColor(place)
                            return (
                                <Stack
                                    key={card.id}
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    sx={{
                                        p: 1,
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: alpha('#fff', 0.12),
                                        bgcolor: alpha('#8082858a', 0.12),
                                    }}
                                >
                                    {/* Place + medal */}
                                    <Box
                                        sx={{
                                            width: 36,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-start',
                                            gap: 0.5,
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle1"
                                            fontWeight={900}
                                            sx={{
                                                width: 18,
                                                textAlign: 'right',
                                                textShadow: '1px 1px 0 #000',
                                            }}
                                        >
                                            {place}
                                        </Typography>
                                        {color && (
                                            <EmojiEventsIcon
                                                sx={{ color, fontSize: 20 }}
                                                titleAccess={
                                                    place === 1
                                                        ? 'Gold'
                                                        : place === 2
                                                          ? 'Silver'
                                                          : 'Bronze'
                                                }
                                            />
                                        )}
                                    </Box>

                                    {/* Mini preview */}
                                    <CardMini
                                        height={64}
                                        card={card}
                                        allCategories={allCategories}
                                        draggable={false}
                                        placement="right"
                                    />

                                    {/* Name + rankings */}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            useFlexGap
                                            flexWrap="wrap"
                                            sx={{ mt: 0.25 }}
                                        >
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight={700}
                                                noWrap
                                                sx={{ textShadow: '1px 1px 0 #000' }}
                                            >
                                                {card.name}
                                            </Typography>

                                            {/* Avg badge */}
                                            <Chip
                                                size="small"
                                                sx={{
                                                    backgroundColor: 'rgba(19, 19, 19, 0.56)',
                                                    textShadow: '1px 2px black',
                                                    fontWeight: 'bold',
                                                }}
                                                label={
                                                    <Stack
                                                        direction="row"
                                                        spacing={0.5}
                                                        alignItems="center"
                                                    >
                                                        <span>AVG Placement:</span>
                                                        <Avatar
                                                            sx={{
                                                                width: 42,
                                                                height: 16,
                                                                fontSize: '0.85rem',
                                                                textShadow:
                                                                    '1px 1px rgb(150, 150, 150)',
                                                                fontWeight: 'bolder',
                                                                backgroundColor:
                                                                    'rgba(196, 196, 196, 0.9)',
                                                                borderRadius: '5px',
                                                            }}
                                                        >
                                                            {avg.toFixed(2)}
                                                        </Avatar>
                                                    </Stack>
                                                }
                                            />

                                            {/* Appearances badge */}
                                            <Chip
                                                size="small"
                                                sx={{
                                                    backgroundColor: 'rgba(19, 19, 19, 0.56)',
                                                    textShadow: '1px 2px black',
                                                    fontWeight: 'bold',
                                                }}
                                                label={
                                                    <Stack
                                                        direction="row"
                                                        spacing={0.5}
                                                        alignItems="center"
                                                    >
                                                        <span>Rankings:</span>
                                                        <Avatar
                                                            sx={{
                                                                width: appearances < 100 ? 24 : '',
                                                                height: 16,
                                                                fontSize: '0.85rem',
                                                                textShadow:
                                                                    '1px 1px rgb(150, 150, 150)',
                                                                fontWeight: 'bolder',
                                                                backgroundColor:
                                                                    'rgba(196, 196, 196, 0.9)',
                                                                borderRadius: '5px',
                                                            }}
                                                        >
                                                            {appearances}
                                                        </Avatar>
                                                    </Stack>
                                                }
                                            />
                                        </Stack>

                                        {/* Ranking chips */}
                                        <Stack
                                            direction="row"
                                            spacing={0.5}
                                            useFlexGap
                                            flexWrap="wrap"
                                            sx={{ mt: 0.25 }}
                                        >
                                            {rankingBadges.length > 0 ? (
                                                rankingBadges.map((rb, i) => (
                                                    <Chip
                                                        key={`${rb.id}-${i}`}
                                                        label={
                                                            rb.name.length > 30
                                                                ? rb.name.slice(0, 27) + '...'
                                                                : rb.name
                                                        }
                                                        size="small"
                                                        avatar={
                                                            <Avatar
                                                                sx={{
                                                                    backgroundColor:
                                                                        theme.palette.customColors
                                                                            ?.grey_3 ?? '#e0e0e0',
                                                                    color: 'rgba(32, 32, 32, 1) !important',
                                                                    fontWeight: 900,
                                                                    fontSize: '14px !important',
                                                                }}
                                                            >
                                                                {rb.placement}
                                                            </Avatar>
                                                        }
                                                        sx={{ mt: 0.5, mr: 1 }}
                                                    />
                                                ))
                                            ) : (
                                                <Chip
                                                    size="small"
                                                    label="No rankings"
                                                    variant="outlined"
                                                    sx={{
                                                        color: alpha('#fff', 0.8),
                                                        borderColor: alpha('#fff', 0.25),
                                                        height: 22,
                                                    }}
                                                />
                                            )}
                                        </Stack>
                                    </Box>
                                </Stack>
                            )
                        })}
                    </Stack>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        No data yet.
                    </Typography>
                )}
            </Paper>

            {/* Snackbar */}
            <Snackbar
                open={snackOpen}
                autoHideDuration={3800}
                onClose={() => setSnackOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackOpen(false)}
                    severity={snackSeverity}
                    variant="filled"
                    sx={{ width: '100%', color: 'white', fontWeight: 'bold' }}
                >
                    {snackMsg}
                </Alert>
            </Snackbar>
        </Box>
    )
}
