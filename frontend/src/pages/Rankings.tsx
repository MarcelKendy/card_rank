// pages/Rankings.tsx
import * as React from 'react'
import {
    Box,
    Paper,
    Stack,
    Button,
    IconButton,
    Typography,
    TextField,
    Snackbar,
    Alert,
    CircularProgress,
    Dialog,
    Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import NoPhotographyIcon from '@mui/icons-material/NoPhotography'
import { useTheme } from '@mui/material/styles'
import type { AlertColor } from '@mui/material/Alert'

import api from '../services/api'
import type { CardModel, Category } from '../components/cards/types'

// Rankings feature (new files)
import RankingRow from '../components/rankings/RankingRow'
import NewRankingDialog from '../components/rankings/NewRankingDialog'
import EditRankingDialog from '../components/rankings/EditRankingDialog'
import TierBoard from '../components/rankings/TierBoard'

import type { Ranking, RankingItem } from '../components/rankings/types'

import {
    BEST_ON_RIGHT,
    parseFilters,
    parseTiers,
    buildSyncItemsFromState,
    cardMatchesFilters,
    extractFirstImageUrl,
} from '../components/rankings/utils'

/* ============================================================================
   API (kept in page)
============================================================================ */
async function fetchAllCategories(): Promise<Category[]> {
    const { data } = await api.get('/get_categories')
    return data as Category[]
}
async function fetchAllCards(): Promise<CardModel[]> {
    const { data } = await api.get('/get_cards')
    return data as CardModel[]
}
async function fetchRankings(): Promise<Ranking[]> {
    const { data } = await api.get('/get_rankings')
    return data as Ranking[]
}
async function fetchRanking(id: number): Promise<Ranking> {
    const { data } = await api.get(`/get_ranking/${id}`)
    return data as Ranking
}
async function addRanking(payload: Partial<Ranking>): Promise<Ranking> {
    const { data } = await api.post('/add_ranking', payload)
    return data as Ranking
}
async function editRanking(id: number, payload: Partial<Ranking>): Promise<Ranking> {
    const { data } = await api.put(`/edit_ranking/${id}`, payload)
    return data as Ranking
}
async function deleteRanking(id: number): Promise<void> {
    await api.delete(`/delete_ranking/${id}`)
}
async function syncRankingCards(id: number, items: RankingItem[]): Promise<Ranking> {
    const { data } = await api.post(`/sync_ranking_cards/${id}`, { items })
    return data as Ranking
}

/* ============================================================================
   Page
============================================================================ */
export default function RankingsPage() {
    const theme = useTheme()

    // data
    const [rankings, setRankings] = React.useState<Ranking[] | null>(null)
    const [categories, setCategories] = React.useState<Category[]>([])
    const [cards, setCards] = React.useState<CardModel[]>([])

    // ui
    const [search, setSearch] = React.useState('')
    const [snackOpen, setSnackOpen] = React.useState(false)
    const [snackMsg, setSnackMsg] = React.useState('')
    const [snackSeverity, setSnackSeverity] = React.useState<AlertColor>('success')
    const notify = (message: string, severity: AlertColor = 'success') => {
        setSnackMsg(message)
        setSnackSeverity(severity)
        setSnackOpen(true)
    }

    // dialogs / screens
    const [addOpen, setAddOpen] = React.useState(false)
    const [editing, setEditing] = React.useState<Ranking | null>(null)
    const [deleteAsk, setDeleteAsk] = React.useState<Ranking | null>(null)

    // builder mode
    const [builderId, setBuilderId] = React.useState<number | null>(null)
    const [builderRanking, setBuilderRanking] = React.useState<Ranking | null>(null)
    const [loadingBuilder, setLoadingBuilder] = React.useState(false)

    // change image dialog (builder)
    const [changeImgOpen, setChangeImgOpen] = React.useState(false)
    const [newImageUrl, setNewImageUrl] = React.useState('')

    // initial load
    React.useEffect(() => {
        ;(async () => {
            try {
                const [cats, crds, rks] = await Promise.all([
                    fetchAllCategories(),
                    fetchAllCards(),
                    fetchRankings(),
                ])
                setCategories(cats)
                setCards(crds)
                setRankings(rks)
            } catch (e) {
                console.error(e)
                setRankings([])
                notify('Failed to load rankings', 'error')
            }
        })()
    }, [])

    // filtered list
    const visibleRankings = React.useMemo(() => {
        if (!rankings) return []
        const q = search.trim().toLowerCase()
        return q
            ? rankings.filter(
                  (r) =>
                      r.name.toLowerCase().includes(q) ||
                      (r.description ?? '').toLowerCase().includes(q)
              )
            : rankings
    }, [rankings, search])

    const onCreated = (created: Ranking) => {
        setRankings((prev) => (prev ? [created, ...prev] : [created]))
        setAddOpen(false)
    }

    const confirmDelete = async () => {
        if (!deleteAsk) return
        const id = deleteAsk.id
        try {
            await deleteRanking(id)
            setRankings((prev) => (prev ? prev.filter((r) => r.id !== id) : prev))
            notify('Ranking deleted', 'warning')
        } catch (err: any) {
            notify(err?.response?.data?.message ?? 'Failed to delete ranking', 'error')
        } finally {
            setDeleteAsk(null)
        }
    }

    const onRankingSaved = async (updated: Ranking, prune: boolean) => {
        setRankings((prev) => {
            if (!prev) return prev
            const idx = prev.findIndex((r) => r.id === updated.id)
            if (idx === -1) return prev
            const copy = prev.slice()
            copy[idx] = updated
            return copy
        })

        if (prune) {
            try {
                const rk = await fetchRanking(updated.id)
                const f = parseFilters(updated.filters)
                const keep = new Set(
                    (rk.cards ?? []).filter((c) => cardMatchesFilters(c, f)).map((c) => c.id)
                )
                const names = parseTiers(updated.tiers ?? 'S;A;B')
                const mapping: Record<string, number[]> = {}
                names.forEach((n) => (mapping[n] = []))
                const firstTier = names[0]

                for (const c of rk.cards ?? []) {
                    if (!keep.has(c.id)) continue
                    const t = c.pivot?.tier && mapping[c.pivot.tier] ? c.pivot.tier : firstTier
                    mapping[t].push(c.id)
                }

                const items = buildSyncItemsFromState(names, mapping, {
                    bestOnRight: BEST_ON_RIGHT,
                })
                const synced = await syncRankingCards(updated.id, items)

                if (builderId === updated.id) setBuilderRanking(synced)
                notify('Filters saved (pruned non-matching cards)', 'success')
            } catch (e) {
                console.error(e)
                notify('Failed to prune cards', 'error')
            }
        } else {
            notify('Ranking updated', 'success')
        }
    }

    const openBuilder = async (id: number) => {
        setBuilderId(id)
        setLoadingBuilder(true)
        try {
            const rk = await fetchRanking(id)
            setBuilderRanking(rk)
        } catch (e) {
            console.error(e)
            setBuilderId(null)
            notify('Failed to open builder', 'error')
        } finally {
            setLoadingBuilder(false)
        }
    }

    const closeBuilder = () => {
        setBuilderId(null)
        setBuilderRanking(null)
    }

    const submitChangeImage = async () => {
        if (!builderRanking) return
        try {
            const saved = await editRanking(builderRanking.id, {
                image_url: newImageUrl.trim() || null,
            })
            setBuilderRanking(saved)
            setRankings((prev) => {
                if (!prev) return prev
                const idx = prev.findIndex((r) => r.id === saved.id)
                if (idx === -1) return prev
                const copy = prev.slice()
                copy[idx] = { ...copy[idx], ...saved }
                return copy
            })
            notify('Ranking image updated', 'success')
        } catch (err: any) {
            notify(err?.response?.data?.message ?? 'Failed to update ranking image', 'error')
        } finally {
            setChangeImgOpen(false)
        }
    }

    /* ------------------------------- Builder UI ------------------------------- */
    if (builderId && builderRanking) {
        const firstImg = extractFirstImageUrl(builderRanking.image_url)

        return (
            <Box>
                <Stack direction="row" alignItems="center" sx={{ mb: 2, position: 'relative' }}>
                    {/* Left: Go back */}
                    <Button
                        startIcon={<ArrowBackIcon />}
                        variant="contained"
                        onClick={closeBuilder}
                        sx={{ position: 'absolute', left: 0, fontWeight: 600 }}
                    >
                        return
                    </Button>

                    {/* Center: Title with avatar + chip */}
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography
                            variant="h5"
                            noWrap
                            sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}
                        >
                            Ranking Builder —{/* Avatar with image; click to change URL */}
                            <Tooltip title="Change ranking image">
                                <Box
                                    component="span"
                                    sx={{
                                        width: 64,
                                        height: 64,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        border: '1px solid rgb(220, 220, 220)',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => {
                                        setNewImageUrl(builderRanking.image_url ?? '')
                                        setChangeImgOpen(true)
                                    }}
                                >
                                    {firstImg ? (
                                        <Box
                                            component="img"
                                            src={firstImg}
                                            alt=""
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                            }}
                                        />
                                    ) : (
                                        <NoPhotographyIcon fontSize="small" />
                                    )}
                                </Box>
                            </Tooltip>
                            <Box
                                component="span"
                                sx={{
                                    px: 1.25,
                                    py: 0.25,
                                    borderRadius: 1,
                                    bgcolor: 'rgba(255,255,255,0.12)',
                                    fontWeight: 700,
                                    fontSize: 20,
                                }}
                            >
                                {builderRanking.name}
                            </Box>
                        </Typography>
                    </Box>
                </Stack>

                {loadingBuilder ? (
                    <Stack alignItems="center" sx={{ py: 6 }}>
                        <CircularProgress />
                    </Stack>
                ) : (
                    <TierBoard
                        ranking={builderRanking}
                        allCards={cards}
                        allCategories={categories}
                        onChangeLocal={(next) => setBuilderRanking(next)}
                        onSaveItems={async (items) => {
                            try {
                                const synced = await syncRankingCards(builderRanking.id, items)
                                setBuilderRanking(synced)
                                setRankings((prev) => {
                                    if (!prev) return prev
                                    const idx = prev.findIndex((r) => r.id === synced.id)
                                    if (idx === -1) return prev
                                    const copy = prev.slice()
                                    copy[idx] = { ...copy[idx], ...synced }
                                    return copy
                                })
                                notify('Placements updated', 'success')
                            } catch (err: any) {
                                notify(
                                    err?.response?.data?.message ?? 'Failed to save placements',
                                    'error'
                                )
                            }
                        }}
                        onSaveMeta={async (payload) => {
                            try {
                                const saved = await editRanking(builderRanking.id, payload)
                                setBuilderRanking(saved)
                                setRankings((prev) => {
                                    if (!prev) return prev
                                    const idx = prev.findIndex((r) => r.id === saved.id)
                                    if (idx === -1) return prev
                                    const copy = prev.slice()
                                    copy[idx] = { ...copy[idx], ...saved }
                                    return copy
                                })
                                notify('Ranking settings saved', 'success')
                            } catch (err: any) {
                                notify(
                                    err?.response?.data?.message ??
                                        'Failed to save ranking settings',
                                    'error'
                                )
                            }
                        }}
                    />
                )}

                {/* Change image dialog */}
                <Dialog
                    open={changeImgOpen}
                    onClose={() => setChangeImgOpen(false)}
                    fullWidth
                    maxWidth="sm"
                >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 3, pt: 2 }}>
                        <CloseIcon sx={{ opacity: 0 }} /> {/* spacer */}
                        <Typography variant="h6">Change ranking image URL</Typography>
                        <IconButton
                            onClick={() => setChangeImgOpen(false)}
                            sx={{ position: 'absolute', right: 8, top: 8 }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                    <Box sx={{ px: 3, py: 2 }}>
                        <TextField
                            label="Image URL"
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            fullWidth
                            placeholder="https://…"
                        />
                    </Box>
                    <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ px: 3, pb: 2 }}
                        justifyContent="flex-end"
                    >
                        <Button onClick={() => setChangeImgOpen(false)} startIcon={<CloseIcon />}>
                            Cancel
                        </Button>
                        <Button variant="contained" onClick={submitChangeImage}>
                            Save
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
        )
    }

    /* ---------------------------------- List UI --------------------------------- */
    return (
        <Box>
            {/* Toolbar */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', md: 'center' }}
                >
                    <TextField
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search rankings…"
                        size="small"
                        sx={{ width: 360 }}
                    />
                    <Button
                        variant="contained"
                        color="success"
                        sx={{ fontWeight: 600 }}
                        startIcon={<AddIcon />}
                        onClick={() => setAddOpen(true)}
                    >
                        New ranking
                    </Button>
                </Stack>
            </Paper>

            {/* Rankings list — responsive grid */}
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
                }}
            >
                {rankings === null ? (
                    <Box sx={{ gridColumn: '1 / -1' }}>
                        <Stack alignItems="center" sx={{ py: 6 }}>
                            <CircularProgress />
                        </Stack>
                    </Box>
                ) : visibleRankings.length === 0 ? (
                    <Box sx={{ gridColumn: '1 / -1' }}>
                        <Typography color="text.secondary">No rankings</Typography>
                    </Box>
                ) : (
                    visibleRankings.map((r) => (
                        <Box key={r.id} sx={{ height: '100%' }}>
                            <RankingRow
                                ranking={r}
                                allCategories={categories}
                                onOpen={() => openBuilder(r.id)}
                                onEdit={() => setEditing(r)}
                                onAskDelete={() => setDeleteAsk(r)}
                            />
                        </Box>
                    ))
                )}
            </Box>

            {/* New */}
            <NewRankingDialog
                open={addOpen}
                allCategories={categories}
                onClose={() => setAddOpen(false)}
                onCreate={async (payload) => {
                    try {
                        const created = await addRanking(payload)
                        onCreated(created)
                        notify('Ranking created', 'success')
                    } catch (e: any) {
                        console.error(e)
                        const msg = e?.response?.data?.message ?? 'Failed to create ranking'
                        notify(msg, 'error')
                    }
                }}
                notify={notify}
            />

            {/* Edit */}
            {editing && (
                <EditRankingDialog
                    open
                    ranking={editing}
                    allCategories={categories}
                    onClose={() => setEditing(null)}
                    onSave={async (id, payload, prune) => {
                        try {
                            const updated = await editRanking(id, payload)
                            setEditing(null)
                            await onRankingSaved(updated, prune)
                        } catch (e: any) {
                            notify(
                                e?.response?.data?.message ?? 'Failed to update ranking',
                                'error'
                            )
                        }
                    }}
                    notify={notify}
                />
            )}

            {/* Delete dialog */}
            <Dialog
                open={Boolean(deleteAsk)}
                onClose={() => setDeleteAsk(null)}
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor:
                                theme.palette.customColors?.grey_6 ??
                                theme.palette.background.paper,
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
                    <DeleteIcon sx={{ color: theme.palette.customColors?.red_3 ?? '#ff5252' }} />
                    <Typography variant="h6">Delete ranking</Typography>
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
                        sx={{ backgroundColor: theme.palette.customColors?.red_3 ?? '#ff5252' }}
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
    )
}
