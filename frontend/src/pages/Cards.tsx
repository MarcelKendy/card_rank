import * as React from 'react'
import {
    Box,
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    Chip,
    Container,
    IconButton,
    MenuItem,
    Pagination,
    Paper,
    Select,
    Skeleton,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Dialog,
    Typography,
    Alert,
    Button,
    InputAdornment,
    FormControlLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTheme } from '@mui/material/styles'
import type { AlertColor } from '@mui/material/Alert'

import api from '../services/api' // keep your existing service

// extracted components
import CategoryPicker from '../components/cards/CategoryPicker'
import CardDialog from '../components/cards/CardDialog'
import CardTile from '../components/cards/CardTile'

export type Category = {
    id: number
    name: string
    color?: string
    icon?: string
}

export type CardModel = {
    id: number
    name: string
    description: string
    image_url?: string | null // fixed typing
    categories: Category[]
}

/* ========================================================================
 Utilities
 ===================================================================== */
function filterCards(
    cards: CardModel[],
    search: string,
    selectedCategoryIds: number[],
    matchAny: boolean
): CardModel[] {
    const q = search.trim().toLowerCase()
    const hasQ = q.length > 0
    const hasCats = selectedCategoryIds.length > 0

    return cards.filter((card) => {
        const nameHit = card.name?.toLowerCase().includes(q) ?? false
        const descHit = card.description?.toLowerCase().includes(q) ?? false
        const textHit = nameHit || descHit

        const cardCatIds = new Set(card.categories.map((c) => c.id))
        const anyCatHit = selectedCategoryIds.some((id) => cardCatIds.has(id))
        const allCatsHit = selectedCategoryIds.every((id) => cardCatIds.has(id))

        if (matchAny) {
            if (!hasQ && !hasCats) return true
            const textOk = hasQ ? textHit : false
            const catsOk = hasCats ? anyCatHit : false
            return textOk || catsOk
        } else {
            const textOk = hasQ ? textHit : true
            const catsOk = hasCats ? allCatsHit : true
            return textOk && catsOk
        }
    })
}
function byId<T extends { id: number }>(list: T[], id: number) {
    return list.findIndex((x) => x.id === id)
}

/* ========================================================================
 Fetchers (adjust endpoint names if needed)
 ===================================================================== */
async function fetchAllCards(): Promise<CardModel[]> {
    const { data } = await api.get('/get_cards') // initial load; local filtering thereafter
    return data as CardModel[]
}
async function fetchAllCategories(): Promise<Category[]> {
    const { data } = await api.get('/get_categories')
    return data as Category[]
}
async function createCard(payload: {
    name: string
    description: string
    image_url?: string | null
    category_ids?: number[]
}): Promise<CardModel> {
    const { data } = await api.post('/add_card', payload)
    return data as CardModel
}
async function updateCard(
    id: number,
    payload: Partial<Omit<CardModel, 'id' | 'categories'>> & { category_ids?: number[] }
): Promise<CardModel> {
    const { data } = await api.put(`/edit_card/${id}`, payload)
    return data as CardModel
}
async function syncCardCategories(id: number, categoryIds: number[]): Promise<CardModel> {
    const { data } = await api.post(`/sync_card_categories/${id}`, { category_ids: categoryIds })
    return data as CardModel
}
async function deleteCard(id: number): Promise<void> {
    await api.delete(`/delete_card/${id}`)
}

/* ========================================================================
 Skeleton tile (variable height; image area fixed)
 ===================================================================== */
function CardTileSkeleton() {
    const theme = useTheme()
    return (
        <Card
            variant="outlined"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '410px',
                height: '410px',
                maxHeight: '410px',
                boxShadow:
                    ' rgba(0, 0, 0, 0.46) 0px 2px 2px, rgba(0, 0, 0, 0.3) 0px 2px 13px -3px, rgba(0, 0, 0, 0.2) 0px -3px 0px inset;',
                transition: (t) =>
                    t.transitions.create(['box-shadow', 'transform'], {
                        duration: t.transitions.duration.shorter,
                    }),
                willChange: 'transform',
                '&:hover': {
                    boxShadow:
                        'rgba(68, 68, 68, 0.17) 0px -23px 25px 0px inset, rgba(83, 83, 83, 0.15) 0px -36px 30px 0px inset, rgba(58, 58, 58, 0.1) 0px -79px 40px 0px inset, rgba(0, 0, 0, 0.06) 0px 2px 1px, rgba(0, 0, 0, 0.09) 0px 4px 2px, rgba(0, 0, 0, 0.09) 0px 8px 4px, rgba(0, 0, 0, 0.09) 0px 16px 8px, rgba(0, 0, 0, 0.09) 0px 32px 16px;',
                    transform: 'scale(1.02)',
                },
                backgroundColor: theme.palette.customColors.grey_7,
            }}
        >
            <Skeleton variant="rectangular" animation="wave" height={'66%'} />
            <CardContent sx={{ mx: 1.5, my: 1, height: '18%', alignItems: 'stretch', p: 0 }}>
                <Skeleton variant="text" width={'60%'} height={20} />
                <Skeleton variant="text" width={'100%'} height={18} />
                <Skeleton variant="text" width={'100%'} height={18} />
            </CardContent>
            <Box sx={{ mx: 1.5, mb: 1, height: '16%' }}>
                <Stack direction="row" spacing={0.75}>
                    <Skeleton variant="rounded" width={'20%'} height={20} />
                    <Skeleton variant="rounded" width={'40%'} height={20} />
                    <Skeleton variant="rounded" width={'20%'} height={20} />
                    <Skeleton variant="rounded" width={'10%'} height={20} />
                </Stack>
            </Box>
        </Card>
    )
}

/* ========================================================================
 Add Tile (height proportional to content)
 ===================================================================== */
function AddTile({ onClick }: { onClick: () => void }) {
    return (
        <Card
            sx={(t) => ({
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                boxShadow:
                    ' rgba(0, 0, 0, 0.46) 0px 2px 2px, rgba(0, 0, 0, 0.3) 0px 2px 13px -3px, rgba(0, 0, 0, 0.2) 0px -3px 0px inset;',
                transition: (t) =>
                    t.transitions.create(['box-shadow', 'transform'], {
                        duration: t.transitions.duration.shorter,
                    }),
                willChange: 'transform',
                '&:hover': {
                    boxShadow:
                        'rgba(68, 68, 68, 0.17) 0px -23px 25px 0px inset, rgba(83, 83, 83, 0.15) 0px -36px 30px 0px inset, rgba(58, 58, 58, 0.1) 0px -79px 40px 0px inset, rgba(0, 0, 0, 0.06) 0px 2px 1px, rgba(0, 0, 0, 0.09) 0px 4px 2px, rgba(0, 0, 0, 0.09) 0px 8px 4px, rgba(0, 0, 0, 0.09) 0px 16px 8px, rgba(0, 0, 0, 0.09) 0px 32px 16px;',
                    transform: 'scale(1.02)',
                },
                backgroundColor: t.palette.customColors.grey_7,
            })}
        >
            <CardActionArea
                onClick={onClick}
                sx={{
                    flex: 1,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                    py: 6,
                }}
            >
                <Stack
                    alignItems="center"
                    spacing={1}
                    sx={(t) => ({
                        transition: (t) =>
                            t.transitions.create(['transform'], {
                                duration: t.transitions.duration.shorter,
                            }),
                        willChange: 'transform',
                        '.MuiCard-root:hover &': { transform: 'scale(1.22)' },
                    })}
                >
                    <AddIcon fontSize="large" color="success" sx={{ fontSize: '60px' }} />
                    <Typography fontWeight={700} color="success" sx={{ fontSize: '18px' }}>
                        New Card
                    </Typography>
                </Stack>
            </CardActionArea>
        </Card>
    )
}

/* ========================================================================
 Main Page Component (refactored)
 ===================================================================== */
export default function CardsPage() {
    const theme = useTheme()

    // Data
    const [cards, setCards] = React.useState<CardModel[] | null>(null)
    const [categories, setCategories] = React.useState<Category[]>([])

    // Filters
    const [search, setSearch] = React.useState('')
    const [filterCategoryIds, setFilterCategoryIds] = React.useState<number[]>([])
    const [matchAny, setMatchAny] = React.useState<boolean>(true)

    // Pagination
    const [pageSize, setPageSize] = React.useState<number | 'all'>(19)
    const [page, setPage] = React.useState(1)

    // UI
    const [addOpen, setAddOpen] = React.useState(false)
    const [editOpen, setEditOpen] = React.useState(false)
    const [editing, setEditing] = React.useState<CardModel | null>(null)
    const [deleteAsk, setDeleteAsk] = React.useState<CardModel | null>(null)

    // Category filter picker
    const [filterPickerAnchor, setFilterPickerAnchor] = React.useState<HTMLElement | null>(null)

    // Snackbar
    const [snackOpen, setSnackOpen] = React.useState(false)
    const [snackMsg, setSnackMsg] = React.useState('')
    const [snackSeverity, setSnackSeverity] = React.useState<AlertColor>('success')
    const notify = (message: string, severity: AlertColor = 'success') => {
        setSnackMsg(message)
        setSnackSeverity(severity)
        setSnackOpen(true)
    }

    // Initial fetch
    React.useEffect(() => {
        ;(async () => {
            try {
                const [cardsData, categoriesData] = await Promise.all([
                    fetchAllCards(),
                    fetchAllCategories(),
                ])
                setCards(cardsData)
                setCategories(categoriesData)
            } catch (err: any) {
                console.error(err)
                notify(err?.response?.data?.message ?? 'Failed to load cards', 'error')
                setCards([]) // avoid endless skeletons
            }
        })()
    }, [])

    // Derived: filtered + paginated
    const filtered = React.useMemo(() => {
        if (!cards) return []
        return filterCards(cards, search, filterCategoryIds, matchAny)
    }, [cards, search, filterCategoryIds, matchAny])

    const total = filtered.length
    const effectivePageSize = pageSize === 'all' ? total || 1 : pageSize
    const totalPages =
        pageSize === 'all' ? 1 : Math.max(1, Math.ceil(total / (effectivePageSize as number)))

    // Keep page in range when filters change
    React.useEffect(() => {
        if (page > totalPages) setPage(1)
    }, [totalPages, page])

    const pageSlice = React.useMemo(() => {
        if (pageSize === 'all') return filtered
        const start = (page - 1) * (effectivePageSize as number)
        return filtered.slice(start, start + (effectivePageSize as number))
    }, [filtered, page, pageSize, effectivePageSize])

    /* ------------------------------ Mutations ------------------------------ */
    const saveCard = async (payload: {
        name: string
        description: string
        image_url?: string | null
        category_ids?: number[]
    }) => {
        if (editing) {
            // Update existing (also allow category updates from dialog)
            const updated = await updateCard(editing.id, {
                name: payload.name,
                description: payload.description,
                image_url: payload.image_url,
                category_ids: payload.category_ids,
            })

            setCards((prev) => {
                if (!prev) return prev
                const idx = byId(prev, editing.id)
                if (idx === -1) return prev
                const next = prev.slice()

                const pickImage = Object.prototype.hasOwnProperty.call(updated, 'image_url')
                    ? updated.image_url
                    : Object.prototype.hasOwnProperty.call(payload, 'image_url')
                      ? payload.image_url
                      : prev[idx].image_url

                next[idx] = {
                    ...prev[idx],
                    ...updated,
                    image_url: pickImage,
                    categories:
                        updated.categories ??
                        (payload.category_ids
                            ? categories.filter((c) => payload.category_ids!.includes(c.id))
                            : prev[idx].categories),
                }
                return next
            })

            notify('Card updated', 'success')
            setEditOpen(false)
            setEditing(null)
        } else {
            // Create new (insert at beginning)
            const created = await createCard(payload)
            const safeCreated: CardModel = {
                ...created,
                image_url: created.image_url ?? payload.image_url ?? null,
                categories: created.categories ?? [],
            }
            setCards((prev) => (prev ? [safeCreated, ...prev] : [safeCreated]))
            notify('Card created', 'success')
            setAddOpen(false)
        }
    }

    const saveCardCategories = async (cardId: number, categoryIds: number[]) => {
        // Optimistic UI update
        setCards((prev) => {
            if (!prev) return prev
            const idx = byId(prev, cardId)
            if (idx === -1) return prev
            const next = prev.slice()
            const newCats = categories.filter((c) => categoryIds.includes(c.id))
            next[idx] = { ...prev[idx], categories: newCats.slice(0, 4) }
            return next
        })

        try {
            await syncCardCategories(cardId, categoryIds.slice(0, 4))
            notify('Card Categories updated', 'success')
        } catch (err: any) {
            notify(err?.response?.data?.message ?? 'Failed to update card categories', 'error')
        }
    }

    const askDelete = (card: CardModel) => setDeleteAsk(card)

    const confirmDelete = async () => {
        if (!deleteAsk) return
        const id = deleteAsk.id
        try {
            await deleteCard(id)
            setCards((prev) => (prev ? prev.filter((c) => c.id !== id) : prev))
            notify('Card deleted', 'warning')
        } catch (err: any) {
            notify(err?.response?.data?.message ?? 'Failed to delete card', 'error')
        } finally {
            setDeleteAsk(null)
        }
    }

    /* -------------------------------- Render ------------------------------- */
    const loading = cards === null

    return (
        <Container maxWidth="xl">
            <Box sx={{ p: 2 }}>
                {/* Filters Toolbar */}
                <Paper
                    variant="outlined"
                    sx={(t) => ({
                        p: 2,
                        mb: 2,
                        bgcolor: t.palette.customColors?.grey_6 ?? t.palette.background.paper,
                    })}
                >
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'stretch', md: 'center' }}
                        sx={{ position: 'relative' }}
                    >
                        <TextField
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or description…"
                            size="small"
                            sx={{ width: 450 }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                    endAdornment: search && (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="clear search"
                                                onClick={() => setSearch('')}
                                                edge="end"
                                                size="small"
                                            >
                                                <CloseIcon />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />

                        <Box>
                            <Button
                                variant="outlined"
                                onClick={(e) => setFilterPickerAnchor(e.currentTarget)}
                                startIcon={<AddIcon />}
                            >
                                Filter categories
                            </Button>
                            <CategoryPicker
                                open={Boolean(filterPickerAnchor)}
                                anchorEl={filterPickerAnchor}
                                onClose={() => setFilterPickerAnchor(null)}
                                allCategories={categories}
                                selectedIds={filterCategoryIds}
                                onApply={(ids) => setFilterCategoryIds(ids)}
                                title="Filter by categories"
                            />
                        </Box>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={matchAny}
                                    onChange={(e) => setMatchAny(e.target.checked)}
                                />
                            }
                            label={matchAny ? 'Match any' : 'Match all'}
                            sx={{ ml: { md: 'auto' } }}
                        />

                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{
                                position: 'absolute',
                                right: 0,
                                top: '50%',
                                transform: 'translateY(-50%)',
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                Per page:
                            </Typography>
                            <Select
                                size="small"
                                value={pageSize === 'all' ? 'all' : String(pageSize)}
                                onChange={(e) => {
                                    const val = e.target.value as string
                                    setPageSize(val === 'all' ? 'all' : Number(val))
                                    setPage(1)
                                }}
                            >
                                <MenuItem value="19">19</MenuItem>
                                <MenuItem value="35">35</MenuItem>
                                <MenuItem value="all">All</MenuItem>
                            </Select>
                        </Stack>
                    </Stack>

                    {/* Show chosen filter categories as chips */}
                    {filterCategoryIds.length > 0 && (
                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ mt: 1.5 }}
                            useFlexGap
                            flexWrap="wrap"
                        >
                            {filterCategoryIds.map((id) => {
                                const cat = categories.find((c) => c.id === id)
                                if (!cat) return null
                                return (
                                    <Chip
                                        key={id}
                                        size="small"
                                        label={cat.name}
                                        onDelete={() =>
                                            setFilterCategoryIds((prev) =>
                                                prev.filter((x) => x !== id)
                                            )
                                        }
                                        sx={(t) => {
                                            const bg =
                                                cat.color ?? (t.palette.action.selected as string)
                                            const contrast =
                                                t.palette.getContrastText(bg) === '#fff'
                                                    ? '#fff'
                                                    : '#000'
                                            return {
                                                bgcolor: bg,
                                                color: contrast,
                                                textShadow:
                                                    contrast === '#000'
                                                        ? 'none'
                                                        : '0px 1px 10px rgba(0, 0, 0, 1)',
                                                '& .MuiChip-deleteIcon': {
                                                    color: 'inherit',
                                                    '&:hover': { color: 'inherit' },
                                                },
                                            }
                                        }}
                                    />
                                )
                            })}
                            <Chip
                                size="small"
                                label="Clear"
                                variant="outlined"
                                onClick={() => setFilterCategoryIds([])}
                            />
                        </Stack>
                    )}
                </Paper>

                {/* Grid of tiles */}
                <Box
                    sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: {
                            xs: 'repeat(1, minmax(0, 1fr))',
                            sm: 'repeat(4, minmax(0, 1fr))',
                            md: 'repeat(5, minmax(0, 1fr))',
                        },
                        height: '100%',
                    }}
                >
                    <AddTile onClick={() => setAddOpen(true)} />

                    {loading
                        ? Array.from({ length: 7 }).map((_, i) => (
                              <CardTileSkeleton key={`s${i}`} />
                          ))
                        : pageSlice.map((card) => (
                              <CardTile
                                  key={card.id}
                                  card={card}
                                  allCategories={categories}
                                  onRequestEdit={(c) => {
                                      setEditing(c)
                                      setEditOpen(true)
                                  }}
                                  onRequestDelete={(c) => setDeleteAsk(c)}
                                  onApplyCategories={saveCardCategories}
                              />
                          ))}
                </Box>

                {/* Pagination */}
                {pageSize !== 'all' && (
                    <Stack alignItems="center" sx={{ mt: 2 }}>
                        <Pagination
                            count={totalPages}
                            page={page}
                            onChange={(_, p) => setPage(p)}
                            color="primary"
                            siblingCount={1}
                            boundaryCount={1}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                            Showing {pageSlice.length} of {total} cards
                        </Typography>
                    </Stack>
                )}

                {/* Add / Edit Dialog */}
                <CardDialog
                    open={addOpen || editOpen}
                    mode={addOpen ? 'add' : 'edit'}
                    initial={editing ?? undefined}
                    allCategories={categories}
                    onCancel={() => {
                        setAddOpen(false)
                        setEditOpen(false)
                        setEditing(null)
                    }}
                    onNotify={(message, severity) => notify(message, severity)}
                    onSave={saveCard}
                />

                {/* Delete dialog */}
                <Dialog
                    open={Boolean(deleteAsk)}
                    onClose={() => setDeleteAsk(null)}
                    slotProps={{
                        paper: {
                            sx: {
                                bgcolor: theme.palette.customColors.grey_6,
                                color: 'common.white',
                                backgroundImage: 'none',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                            },
                        },
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 3, pt: 2 }}>
                        <DeleteIcon sx={{ color: theme.palette.customColors.red_3 }} />
                        <Typography variant="h6">Delete card</Typography>
                    </Stack>
                    <Box sx={{ px: 3, py: 2 }}>
                        <Typography>
                            {deleteAsk
                                ? `Are you sure you want to delete "${deleteAsk.name}"? This action cannot be undone.`
                                : 'Are you sure?'}
                        </Typography>
                    </Box>
                    <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ px: 3, pb: 2 }}
                        justifyContent="flex-end"
                    >
                        <Button onClick={() => setDeleteAsk(null)} startIcon={<CloseIcon />}>
                            Cancel
                        </Button>
                        <Button
                            sx={{ backgroundColor: theme.palette.customColors.red_3 }}
                            variant="contained"
                            onClick={confirmDelete}
                            startIcon={<DeleteIcon />}
                        >
                            Delete
                        </Button>
                    </Stack>
                </Dialog>

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
        </Container>
    )
}
