// components/rankings/TierBoard.tsx
import * as React from 'react'
import {
    Box,
    Paper,
    Stack,
    Typography,
    Divider,
    TextField,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    Avatar,
    Select,
    MenuItem,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import type { CardModel, Category } from '../cards/types'
import type { Ranking, RankingItem } from './types'
import CardMini from './CardMini'
import {
    BEST_ON_RIGHT,
    TILE_SIZE,
    parseFilters,
    parseTiers,
    serializeTiers,
    cardMatchesFilters,
    initialMapFromPivot,
    reconcileMapWithServer,
    remapForNewTierNames,
    buildSyncItemsFromState,
    TIER_NAME_MAX,
} from './utils'

type Props = {
    ranking: Ranking
    allCards: CardModel[]
    allCategories: Category[]
    onChangeLocal: (next: Ranking) => void
    onSaveItems: (items: RankingItem[]) => Promise<void>
    onSaveMeta: (payload: Partial<Ranking>) => Promise<void>
}

export default function TierBoard({
    ranking,
    allCards,
    allCategories,
    onChangeLocal,
    onSaveItems,
    onSaveMeta,
}: Props) {
    const filters = React.useMemo(() => parseFilters(ranking.filters), [ranking.filters])
    const tierNames = React.useMemo(() => parseTiers(ranking.tiers ?? 'S;A;B'), [ranking.tiers])

    const [tiersMap, setTiersMap] = React.useState<Record<string, number[]>>(() =>
        initialMapFromPivot(ranking, tierNames)
    )

    const [search, setSearch] = React.useState('')

    // DnD insertion preview
    const [dragOverTier, setDragOverTier] = React.useState<string | null>(null)
    const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)

    // Add tier dialog
    const [addOpen, setAddOpen] = React.useState(false)
    const [newTierName, setNewTierName] = React.useState('New tier')
    const [newTierIndex, setNewTierIndex] = React.useState<number>(tierNames.length) // 0-based

    // Rename tier inline
    const [editingTierIdx, setEditingTierIdx] = React.useState<number | null>(null)
    const [editingTierVal, setEditingTierVal] = React.useState('')

    // Placement badges
    const placementLookup = React.useMemo(() => {
        const map = new Map<number, number>()
        let placement = 1
        for (const t of tierNames) {
            const row = tiersMap[t] ?? []
            if (BEST_ON_RIGHT) {
                for (let i = row.length - 1; i >= 0; i--) map.set(row[i], placement++)
            } else {
                for (let i = 0; i < row.length; i++) map.set(row[i], placement++)
            }
        }
        return map
    }, [tiersMap, tierNames])

    const deleteTier = async (idx: number) => {
        const newNames = tierNames.filter((_, i) => i !== idx)
        const nextMap: Record<string, number[]> = {}
        newNames.forEach((n) => {
            nextMap[n] = tiersMap[n] ?? []
        })
        await saveNamesAndMap(newNames, nextMap)
    }

    // Reset map when switching builder to a different ranking
    React.useEffect(() => {
        setTiersMap(initialMapFromPivot(ranking, tierNames))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ranking.id])

    // Remap rows when tier names change
    React.useEffect(() => {
        setTiersMap((prev) => remapForNewTierNames(prev, tierNames))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ranking.tiers])

    // Reconcile with server cards when list changes
    React.useEffect(() => {
        setTiersMap((prev) => reconcileMapWithServer(prev, ranking.cards ?? [], tierNames))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ranking.cards, tierNames])

    const placedIds = React.useMemo(() => new Set(Object.values(tiersMap).flat()), [tiersMap])

    const pool = React.useMemo(
        () =>
            allCards.filter(
                (c) =>
                    cardMatchesFilters(c, filters) &&
                    !placedIds.has(c.id) &&
                    (search
                        ? c.name?.toLowerCase().includes(search.toLowerCase()) ||
                          c.description?.toLowerCase().includes(search.toLowerCase())
                        : true)
            ),
        [allCards, filters, placedIds, search]
    )

    const onDragStartCard = (e: React.DragEvent<HTMLElement>, cardId: number) => {
        e.dataTransfer.setData('application/x-card', String(cardId))
        e.dataTransfer.effectAllowed = 'move'
    }

    const allowDrop = (e: React.DragEvent) => e.preventDefault()

    const clearDragPreview = () => {
        setDragOverTier(null)
        setDragOverIndex(null)
    }

    const persist = React.useCallback(
        async (mapToPersist: Record<string, number[]>) => {
            const items = buildSyncItemsFromState(tierNames, mapToPersist, {
                bestOnRight: BEST_ON_RIGHT,
            })
            await onSaveItems(items)
        },
        [onSaveItems, tierNames]
    )

    const removePlaced = (cardId: number) => {
        setTiersMap((prev) => {
            const next: Record<string, number[]> = {}
            for (const [t, arr] of Object.entries(prev)) next[t] = arr.filter((id) => id !== cardId)
            void persist(next)
            return next
        })
    }

    // Helpers to modify tier names list locally & in DB
    const saveNamesAndMap = async (names: string[], nextMap: Record<string, number[]>) => {
        setTiersMap(nextMap)
        const nextStr = serializeTiers(names)
        onChangeLocal({ ...ranking, tiers: nextStr })
        await onSaveMeta({ tiers: nextStr })
        await persist(nextMap)
    }

    // Add tier dialog handlers
    const openAddTierDialog = () => {
        setNewTierName('New tier')
        setNewTierIndex(tierNames.length) // default append
        setAddOpen(true)
    }

    const confirmAddTier = async () => {
        const base = newTierName.trim() || 'New tier'
        const existing = new Set(tierNames)
        let candidate = base
        let n = 2
        while (existing.has(candidate)) {
            candidate = `${base} (${n++})`
        }
        const idx = Math.max(0, Math.min(newTierIndex, tierNames.length))
        const newNames = tierNames.slice()
        newNames.splice(idx, 0, candidate)
        const nextMap: Record<string, number[]> = {}
        newNames.forEach((n) => {
            if (n === candidate) nextMap[n] = []
            else nextMap[n] = tiersMap[n] ?? []
        })
        await saveNamesAndMap(newNames, nextMap)
        setAddOpen(false)
    }

    // Rename tier inline
    const saveTierRename = async (idx: number, val: string) => {
        const oldName = tierNames[idx]
        if (!oldName) return
        const raw = val.trim()
        if (!raw || raw === oldName) {
            setEditingTierIdx(null)
            return
        }
        // ensure unique
        const existing = new Set(tierNames)
        existing.delete(oldName)
        let candidate = raw
        let n = 2
        while (existing.has(candidate)) {
            candidate = `${raw} (${n++})`
        }
        const newNames = tierNames.slice()
        newNames[idx] = candidate
        const nextMap: Record<string, number[]> = {}
        newNames.forEach((n) => {
            if (n === candidate) nextMap[n] = tiersMap[oldName] ?? []
            else nextMap[n] = tiersMap[n] ?? []
        })
        await saveNamesAndMap(newNames, nextMap)
        setEditingTierIdx(null)
    }

    const onDropToTier = (e: React.DragEvent<HTMLElement>, tier: string, insertIndex?: number) => {
        e.preventDefault()
        const str = e.dataTransfer.getData('application/x-card')
        if (!str) return
        const cardId = Number(str)

        setTiersMap((prev) => {
            const next: Record<string, number[]> = {}
            for (const [t, arr] of Object.entries(prev)) next[t] = arr.slice()

            // Original index in same row (for left->right shift correction)
            const originalIndex = (prev[tier] ?? []).indexOf(cardId)

            // Remove from all rows
            for (const t of Object.keys(next)) next[t] = next[t].filter((id) => id !== cardId)

            const row = next[tier] ?? []
            let idx =
                insertIndex == null ? row.length : Math.max(0, Math.min(insertIndex, row.length))

            // If moving within same row from left->right, shift left one
            if (originalIndex > -1 && originalIndex < idx) idx -= 1

            row.splice(idx, 0, cardId)
            next[tier] = row

            void persist(next)
            return next
        })

        clearDragPreview()
    }

    const onDropToPool = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault()
        const str = e.dataTransfer.getData('application/x-card')
        if (!str) return
        const cardId = Number(str)

        setTiersMap((prev) => {
            const next: Record<string, number[]> = {}
            for (const [t, arr] of Object.entries(prev)) next[t] = arr.filter((id) => id !== cardId)
            void persist(next)
            return next
        })

        clearDragPreview()
    }

    const moveTier = (i: number, dir: -1 | 1) => {
        const names = tierNames.slice()
        const j = i + dir
        if (j < 0 || j >= names.length) return
        ;[names[i], names[j]] = [names[j], names[i]]
        const nextMap: Record<string, number[]> = {}
        for (const t of names) nextMap[t] = tiersMap[t] ?? []
        void saveNamesAndMap(names, nextMap)
    }

    // Dashed placeholder used during insertion preview
    const InsertionPlaceholder = () => (
        <Box
            sx={{
                width: TILE_SIZE,
                height: TILE_SIZE,
                borderRadius: 1,
                border: '2px dashed',
                borderColor: 'primary.main',
                backgroundColor: 'action.hover',
                opacity: 0.9,
                transition: 'all .12s ease-in-out',
                mr: 0.5,
                mb: 0.5,
                flex: '0 0 auto',
            }}
        />
    )

    return (
        <Stack spacing={2}>
            {/* Pool */}
            <Paper
                variant="outlined"
                sx={{
                    p: 2,
                    backgroundColor: 'rgb(60, 60, 60)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
                onDragOver={(e) => {
                    allowDrop(e)
                    setDragOverTier(null)
                    setDragOverIndex(null)
                }}
                onDrop={onDropToPool}
            >
                {/* Header */}
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1.5}
                    sx={{ width: '100%' }}
                >
                    {/* Left group: title + search */}
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                        <Typography
                            variant="h6"
                            fontWeight={700}
                            sx={{ textShadow: '1px 1px black' }}
                        >
                            Cards Pool
                        </Typography>
                        <TextField
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search…"
                            size="small"
                            sx={{ width: 320 }}
                        />
                    </Stack>

                    {/* Right group: hint + Add tier */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                            Drag here to remove from tiers
                        </Typography>
                        <Button
                            size="small"
                            variant="contained"
                            sx={{ fontWeight: 600 }}
                            color="success"
                            startIcon={<AddIcon />}
                            onClick={openAddTierDialog}
                            title="Add a new tier"
                        >
                            Add tier
                        </Button>
                    </Stack>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                    {pool.map((c) => (
                        <Box
                            key={c.id}
                            draggable
                            onDragStart={(e) => onDragStartCard(e, c.id)}
                            sx={{ cursor: 'grab' }}
                        >
                            <CardMini card={c} allCategories={allCategories} draggable />
                        </Box>
                    ))}
                    {pool.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                            No matching cards in pool
                        </Typography>
                    )}
                </Stack>
            </Paper>

            {/* Tiers */}
            <Stack spacing={1.5}>
                {tierNames.map((name, idx) => {
                    const row = tiersMap[name] ?? []
                    const isEditing = editingTierIdx === idx

                    return (
                        <Paper
                            key={name}
                            variant="outlined"
                            sx={{ p: 1, bgcolor: 'rgb(40, 40, 40)' }}
                            onDragOver={(e) => {
                                allowDrop(e)
                                setDragOverTier(name)
                                // index computed in row-level handler
                            }}
                            onDrop={(e) => onDropToTier(e, name, dragOverIndex ?? row.length)}
                        >
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                sx={{ width: '100%' }}
                                justifyContent="space-between"
                            >
                                {/* Left group: index + name or inline edit */}
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    sx={{ minWidth: 0 }}
                                >
                                    <Avatar
                                        sx={{
                                            height: '25px',
                                            width: '25px',
                                            fontWeight: 'bold',
                                            border: '1px solid white',
                                            color: 'white',
                                            backgroundColor: 'rgba(20, 20, 20, 1)',
                                        }}
                                    >
                                        {idx + 1}
                                    </Avatar>

                                    {isEditing ? (
                                        <TextField
                                            variant="standard"
                                            value={editingTierVal}
                                            autoFocus
                                            onChange={(e) => setEditingTierVal(e.target.value)}
                                            onBlur={() => void saveTierRename(idx, editingTierVal)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter')
                                                    void saveTierRename(idx, editingTierVal)
                                                if (e.key === 'Escape') setEditingTierIdx(null)
                                            }}
                                            slotProps={{ htmlInput: { maxLength: TIER_NAME_MAX } }}
                                            sx={{ width: 300 }}
                                        />
                                    ) : (
                                        <Typography
                                            variant="subtitle1"
                                            fontWeight={800}
                                            sx={{
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                            }}
                                            title={name}
                                        >
                                            {name}
                                            <Tooltip title="Rename tier">
                                                <IconButton
                                                    sx={{ ml: 1 }}
                                                    size="small"
                                                    color="warning"
                                                    onClick={() => {
                                                        setEditingTierIdx(idx)
                                                        setEditingTierVal(name)
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Typography>
                                    )}
                                </Stack>

                                {/* Right group: up/down + delete */}
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <IconButton
                                        size="small"
                                        onClick={() => moveTier(idx, -1)}
                                        title="Move up"
                                    >
                                        <ArrowUpwardIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => moveTier(idx, +1)}
                                        title="Move down"
                                    >
                                        <ArrowDownwardIcon fontSize="small" />
                                    </IconButton>
                                    <Tooltip title="Delete this tier">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => deleteTier(idx)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </Stack>

                            <Divider sx={{ my: 1 }} />

                            {/* Row with precise insertion index calc */}
                            <Stack
                                direction="row"
                                spacing={1}
                                useFlexGap
                                flexWrap="wrap"
                                sx={{ minHeight: TILE_SIZE + 4 }}
                                onDragOver={(e) => {
                                    // Compute exact slot by comparing cursor X with midpoints of existing cards
                                    allowDrop(e)
                                    setDragOverTier(name)
                                    const container = e.currentTarget as HTMLElement
                                    const x = e.clientX

                                    const cards = Array.from(
                                        container.querySelectorAll<HTMLElement>(
                                            '[data-tier-card="1"]'
                                        )
                                    )
                                    if (cards.length === 0) {
                                        setDragOverIndex(0)
                                        return
                                    }
                                    let idx = cards.length
                                    for (let i = 0; i < cards.length; i++) {
                                        const r = cards[i].getBoundingClientRect()
                                        const mid = r.left + r.width / 2
                                        if (x < mid) {
                                            idx = i
                                            break
                                        }
                                    }
                                    setDragOverIndex(idx)
                                }}
                            >
                                {row.map((id, i) => {
                                    const card = allCards.find((c) => c.id === id)
                                    if (!card) return null
                                    return (
                                        <React.Fragment key={id}>
                                            {/* Placeholder BEFORE this card when index matches */}
                                            {dragOverTier === name && dragOverIndex === i && (
                                                <InsertionPlaceholder />
                                            )}
                                            <Box
                                                position="relative"
                                                draggable
                                                onDragStart={(e) => onDragStartCard(e, id)}
                                                data-tier-card="1"
                                                sx={{
                                                    mr: 0.5,
                                                    mb: 0.5,
                                                    transition: 'margin .12s ease-in-out',
                                                }}
                                            >
                                                <CardMini
                                                    card={card}
                                                    allCategories={allCategories}
                                                    badgeNumber={placementLookup.get(id)}
                                                    draggable
                                                    onRemove={() => removePlaced(id)}
                                                />
                                            </Box>
                                        </React.Fragment>
                                    )
                                })}

                                {/* After-last spot (also covers empty rows) */}
                                {dragOverTier === name && dragOverIndex === row.length && (
                                    <InsertionPlaceholder />
                                )}
                            </Stack>
                        </Paper>
                    )
                })}
            </Stack>

            {/* Add Tier Dialog */}
            <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>
                    Add new tier
                    <IconButton
                        onClick={() => setAddOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={1.5}>
                        <TextField
                            label="Tier name"
                            value={newTierName}
                            onChange={(e) => setNewTierName(e.target.value)}
                            variant="standard"
                            fullWidth
                            slotProps={{ htmlInput: { maxLength: TIER_NAME_MAX } }}
                        />
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ minWidth: 86 }}>
                                Position
                            </Typography>
                            <Select
                                size="small"
                                value={newTierIndex}
                                onChange={(e) => setNewTierIndex(Number(e.target.value))}
                                sx={{ width: 160 }}
                            >
                                {Array.from({ length: tierNames.length + 1 }, (_, i) => (
                                    <MenuItem key={i} value={i}>
                                        {i + 1} {i === tierNames.length ? '(bottom)' : ''}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Stack>
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setAddOpen(false)} startIcon={<CloseIcon />}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={confirmAddTier} startIcon={<AddIcon />}>
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    )
}
