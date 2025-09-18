// src/pages/CardsPage.tsx
import * as React from 'react'
import {
    Box,
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    Chip,
    IconButton,
    Typography,
    Skeleton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    InputAdornment,
    Switch,
    FormControlLabel,
    Paper,
    Popper,
    ClickAwayListener,
    List,
    ListItemButton,
    ListItemText,
    Checkbox,
    Stack,
    MenuItem,
    Select,
    Pagination,
    Tooltip,
    Container,
    Snackbar,
    Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import CloseIcon from '@mui/icons-material/Close'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import api from '../services/api'
import { useTheme } from '@mui/material/styles'

/* ========================================================================
 Types
 ===================================================================== */

type AlertColor = 'success' | 'error' | 'warning' | 'info'
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
    image_url?: string | null // image field name requested
    categories: Category[]
}

/* ========================================================================
 Visual constants
 ===================================================================== */
// Card title visual
const TITLE_SHADOW = '0px 1px 10px rgba(0, 0, 0, 1)'
// Keep image area visually consistent; content below can grow
const MEDIA_HEIGHT = 160

/* ========================================================================
 Utilities
 ===================================================================== */
/**
 * Filtering that mirrors your backend semantics.
 * - matchAny: OR between (text) and (any selected category).
 * - matchAll: AND between (text, if provided) and (must include ALL selected categories).
 */
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
            // If no filters, show all (same as backend: no where clause applied)
            if (!hasQ && !hasCats) return true
            const textOk = hasQ ? textHit : false
            const catsOk = hasCats ? anyCatHit : false
            return textOk || catsOk
        } else {
            // Both conditions only apply if provided
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
    const { data } = await api.get('/get_categories') // adjust if your route differs
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

// Simpler, safer signature (send only the array of IDs)
async function syncCardCategories(id: number, categoryIds: number[]): Promise<CardModel> {
    const { data } = await api.post(`/sync_card_categories/${id}`, {
        category_ids: categoryIds,
    })
    return data as CardModel
}

async function deleteCard(id: number): Promise<void> {
    await api.delete(`/delete_card/${id}`)
}

/* ========================================================================
 CategoryPicker (refactored with fixed action slot)
 ===================================================================== */
type CategoryPickerProps = {
    open: boolean
    anchorEl: HTMLElement | null
    onClose: () => void
    allCategories: Category[]
    selectedIds: number[]
    onApply: (newIds: number[]) => void
    maxSelection?: number // per-card: 4, filter: Infinity
    title?: string
}
function CategoryPicker({
    open,
    anchorEl,
    onClose,
    allCategories,
    selectedIds,
    onApply,
    maxSelection = Infinity,
    title = 'Select categories',
}: CategoryPickerProps) {
    const [query, setQuery] = React.useState('')
    const [working, setWorking] = React.useState<number[]>(selectedIds)

    React.useEffect(() => {
        if (open) {
            setQuery('')
            setWorking(selectedIds)
        }
    }, [open, selectedIds])

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase()
        return !q ? allCategories : allCategories.filter((c) => c.name.toLowerCase().includes(q))
    }, [allCategories, query])

    const canToggle = (id: number) => (working.includes(id) ? true : working.length < maxSelection)
    const toggle = (id: number) => {
        setWorking((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : prev.length < maxSelection
                  ? [...prev, id]
                  : prev
        )
    }

    const selectedCount = working.length
    const limitNote =
        maxSelection !== Infinity
            ? `${selectedCount}/${maxSelection} selected`
            : `${selectedCount} selected`

    return (
        <Popper open={open} anchorEl={anchorEl} placement="right-start" style={{ zIndex: 1300 }}>
            <ClickAwayListener onClickAway={onClose}>
                {/* fixed layout with non-scrolling footer */}
                <Paper
                    elevation={6}
                    sx={{
                        width: 320,
                        maxHeight: 420,
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: (t) =>
                            t.palette.customColors?.grey_6 ?? t.palette.background.paper,
                        border: (t) => `1px solid ${t.palette.divider}`,
                    }}
                >
                    {/* Header */}
                    <Box sx={{ p: 1.5 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2" fontWeight={700}>
                                {title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {limitNote}
                            </Typography>
                        </Stack>

                        <TextField
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search categories…"
                            size="small"
                            fullWidth
                            sx={{ mt: 1 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>

                    {/* Scrollable list area */}
                    <Box sx={{ flex: 1, overflow: 'auto', px: 1.5, pb: 1.5 }}>
                        <List dense disablePadding>
                            {filtered.map((cat) => {
                                const checked = working.includes(cat.id)
                                const disabled = !checked && !canToggle(cat.id)
                                return (
                                    <ListItemButton
                                        key={cat.id}
                                        onClick={() => (disabled ? null : toggle(cat.id))}
                                        disabled={disabled}
                                        sx={{ borderRadius: 1, mb: 0.5 }}
                                    >
                                        <Checkbox
                                            edge="start"
                                            tabIndex={-1}
                                            disableRipple
                                            checked={checked}
                                            sx={{ mr: 1 }}
                                        />
                                        <ListItemText
                                            primary={cat.name}
                                            primaryTypographyProps={{ noWrap: true }}
                                            secondary={
                                                cat.color
                                                    ? `#${cat.color.replace('#', '')}`
                                                    : undefined
                                            }
                                        />
                                        {cat.color && (
                                            <Box
                                                sx={{
                                                    width: 16,
                                                    height: 16,
                                                    borderRadius: '50%',
                                                    ml: 1,
                                                    border: (t) => `1px solid ${t.palette.divider}`,
                                                    bgcolor: cat.color,
                                                }}
                                            />
                                        )}
                                    </ListItemButton>
                                )
                            })}
                            {filtered.length === 0 && (
                                <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                                    No categories found
                                </Typography>
                            )}
                        </List>
                    </Box>

                    {/* Fixed actions (non-scrolling) */}
                    <Box
                        sx={{
                            p: 1,
                            pt: 1.25,
                            borderTop: (t) => `1px solid ${t.palette.divider}`,
                            bgcolor: (t) =>
                                t.palette.customColors?.grey_6 ?? t.palette.background.paper,
                        }}
                    >
                        <Stack direction="row" justifyContent="flex-end" spacing={1}>
                            <Button
                                size="small"
                                onClick={onClose}
                                startIcon={<CloseIcon />}
                                color="error"
                            >
                                Close
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={() => {
                                    onApply(working)
                                    onClose()
                                }}
                            >
                                Apply
                            </Button>
                        </Stack>
                    </Box>
                </Paper>
            </ClickAwayListener>
        </Popper>
    )
}

/* ========================================================================
 Add/Edit Card Dialog (now also selects categories, max 4)
 ===================================================================== */
type CardDialogProps = {
    open: boolean
    mode: 'add' | 'edit'
    initial?: Partial<CardModel>
    allCategories: Category[]
    onCancel: () => void
    onSave: (payload: {
        name: string
        description: string
        image_url?: string | null
        category_ids?: number[]
    }) => Promise<void>
}
function CardDialog({ open, mode, initial, allCategories, onCancel, onSave }: CardDialogProps) {
    const [name, setName] = React.useState(initial?.name ?? '')
    const [description, setDescription] = React.useState(initial?.description ?? '')
    const [image, setImage] = React.useState<string>(initial?.image_url ?? '') // bind to image_url
    const [nameError, setNameError] = React.useState<string | null>(null)
    const [descriptionError, setDescriptionError] = React.useState<string | null>(null)
    // category selection state for dialog (max 4)
    const [categoryIds, setCategoryIds] = React.useState<number[]>(
        initial?.categories?.map((c) => c.id) ?? []
    )
    const [catAnchor, setCatAnchor] = React.useState<HTMLElement | null>(null)
    const openCatPicker = (e: React.MouseEvent<HTMLElement>) => setCatAnchor(e.currentTarget)
    const closeCatPicker = () => setCatAnchor(null)
    const catPickerOpen = Boolean(catAnchor)

    React.useEffect(() => {
        if (open) {
            setName(initial?.name ?? '')
            setDescription(initial?.description ?? '')
            setImage(initial?.image_url ?? '')
            setCategoryIds(initial?.categories?.map((c) => c.id) ?? [])
        }
    }, [open, initial])

    const validateForm = (payload: {
        name: string
        description: string
        image_url?: string | null
        category_ids?: number[]
    }) => {
        let ok = true

        if (!payload.name.trim()) {
            setNameError('Name is required')
            ok = false
        } else {
            setNameError(null)
        }

        if (!payload.description.trim()) {
            setDescriptionError('Description is required')
            ok = false
        } else {
            setDescriptionError(null)
        }

        return ok
    }

    const handleSave = async () => {
        const payload = {
            name: name.trim(),
            description: description.trim(),
            image_url: image === '' ? null : image,
            category_ids: categoryIds.slice(0, 4), // enforce limit
        }
        if (!validateForm(payload)) return
        await onSave(payload)
    }

    const selectedChips = categoryIds
        .map((id) => allCategories.find((c) => c.id === id))
        .filter(Boolean) as Category[]

    return (
        <Dialog
            open={open}
            onClose={onCancel}
            fullWidth
            maxWidth="sm"
            slotProps={{
                paper: {
                    sx: (t) => ({
                        bgcolor: t.palette.customColors.grey_6,
                        color: 'common.white',
                        backgroundImage: 'none',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                    }),
                },
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {mode === 'add' ? (
                    <AddIcon sx={(t) => ({ color: t.palette.customColors.green_3 })} />
                ) : (
                    <EditIcon sx={(t) => ({ color: t.palette.customColors.orange_3 })} />
                )}
                {mode === 'add' ? 'Add Card' : 'Edit Card'}
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 0.5 }}>
                    <TextField
                        autoFocus
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        error={!!nameError}
                        helperText={nameError || ' '}
                        sx={(t) => ({
                            // label (default)
                            '& label': { color: 'none' },
                            // label (focused)
                            '& label.Mui-focused': {
                                color:
                                    mode === 'add'
                                        ? t.palette.customColors.green_3
                                        : t.palette.customColors.orange_3,
                            },
                            // label (error)
                            '& .MuiInputLabel-root.Mui-error': { color: 'error.main' },
                            // label (disabled)
                            '& .MuiInputLabel-root.Mui-disabled': { color: 'text.disabled' },

                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: 'none', // default border
                                },
                                '&:hover fieldset': {
                                    borderColor:
                                        mode === 'add'
                                            ? t.palette.customColors.green_3
                                            : t.palette.customColors.orange_3, // hover
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor:
                                        mode === 'add'
                                            ? t.palette.customColors.green_3
                                            : t.palette.customColors.orange_3, // focused
                                },
                            },
                        })}
                    />
                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        multiline
                        minRows={3}
                        required
                        error={!!descriptionError}
                        helperText={descriptionError || ' '}
                        sx={(t) => ({
                            // label (default)
                            '& label': { color: 'none' },
                            // label (focused)
                            '& label.Mui-focused': {
                                color:
                                    mode === 'add'
                                        ? t.palette.customColors.green_3
                                        : t.palette.customColors.orange_3,
                            },
                            // label (error)
                            '& .MuiInputLabel-root.Mui-error': { color: 'error.main' },
                            // label (disabled)
                            '& .MuiInputLabel-root.Mui-disabled': { color: 'text.disabled' },

                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: 'none', // default border
                                },
                                '&:hover fieldset': {
                                    borderColor:
                                        mode === 'add'
                                            ? t.palette.customColors.green_3
                                            : t.palette.customColors.orange_3, // hover
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor:
                                        mode === 'add'
                                            ? t.palette.customColors.green_3
                                            : t.palette.customColors.orange_3, // focused
                                },
                            },
                        })}
                    />
                    <TextField
                        label="Image URL"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        slotProps={{
                            input: {
                                endAdornment: image ? (
                                    <InputAdornment position="end">
                                        <Button size="small" onClick={() => setImage('')}>
                                            Clear
                                        </Button>
                                    </InputAdornment>
                                ) : null,
                            },
                        }}
                        sx={(t) => ({
                            // label (default)
                            '& label': { color: 'none' },
                            // label (focused)
                            '& label.Mui-focused': {
                                color:
                                    mode === 'add'
                                        ? t.palette.customColors.green_3
                                        : t.palette.customColors.orange_3,
                            },
                            // label (error)
                            '& .MuiInputLabel-root.Mui-error': { color: 'error.main' },
                            // label (disabled)
                            '& .MuiInputLabel-root.Mui-disabled': { color: 'text.disabled' },

                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: 'none', // default border
                                },
                                '&:hover fieldset': {
                                    borderColor:
                                        mode === 'add'
                                            ? t.palette.customColors.green_3
                                            : t.palette.customColors.orange_3, // hover
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor:
                                        mode === 'add'
                                            ? t.palette.customColors.green_3
                                            : t.palette.customColors.orange_3, // focused
                                },
                            },
                        })}
                    />

                    {/* Categories in dialog */}
                    <Box sx={{ boxShadow: 3, border: 'solid 1px grey', py: 1.5, px: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                            Categories
                        </Typography>

                        <Stack
                            direction="row"
                            spacing={0.75}
                            useFlexGap
                            flexWrap="wrap"
                            sx={{ mt: 1 }}
                        >
                            {selectedChips.length > 0 ? (
                                selectedChips.map((cat) => (
                                    <Chip
                                        key={cat.id}
                                        size="small"
                                        label={cat.name}
                                        onDelete={() =>
                                            setCategoryIds((prev) =>
                                                prev.filter((x) => x !== cat.id)
                                            )
                                        }
                                        sx={(t) => {
                                            const bg =
                                                cat.color || (t.palette.action.selected as string)
                                            const contrast =
                                                t.palette.getContrastText(bg) === '#fff'
                                                    ? '#fff'
                                                    : '#000'
                                            return {
                                                bgcolor: bg,
                                                color: contrast,
                                                textShadow:
                                                    contrast == '#000' ? 'none' : TITLE_SHADOW, // no shadow on light backgrounds
                                                '& .MuiChip-deleteIcon': {
                                                    color: 'inherit',
                                                    '&:hover': { color: 'inherit' },
                                                },
                                            }
                                        }}
                                    />
                                ))
                            ) : (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mr: 0.75 }}
                                >
                                    None selected
                                </Typography>
                            )}

                            <Chip
                                size="small"
                                icon={<EditIcon />}
                                label="Edit"
                                variant="outlined"
                                onClick={openCatPicker}
                                sx={{ cursor: 'pointer', textShadow: TITLE_SHADOW }}
                            />
                        </Stack>

                        <CategoryPicker
                            open={catPickerOpen}
                            anchorEl={catAnchor}
                            onClose={closeCatPicker}
                            allCategories={allCategories}
                            selectedIds={categoryIds}
                            onApply={setCategoryIds}
                            maxSelection={4}
                            title="Select up to 4 categories"
                        />
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} startIcon={<CloseIcon />}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    sx={(t) => ({
                        backgroundColor:
                            mode == 'add'
                                ? t.palette.customColors.green_3
                                : t.palette.customColors.orange_3,
                    })}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}

/* ========================================================================
 Card Tile (height proportional to content)
 ===================================================================== */
type CardTileProps = {
    card: CardModel
    allCategories: Category[]
    onRequestEdit: (card: CardModel) => void
    onRequestDelete: (card: CardModel) => void
    onApplyCategories: (cardId: number, newCategoryIds: number[]) => Promise<void>
}
function CardTile({
    card,
    allCategories,
    onRequestEdit,
    onRequestDelete,
    onApplyCategories,
}: CardTileProps) {
    const theme = useTheme()
    const [pickerAnchor, setPickerAnchor] = React.useState<HTMLElement | null>(null)
    const [imgOpen, setImgOpen] = React.useState(false)
    const openPicker = (e: React.MouseEvent<HTMLElement>) => setPickerAnchor(e.currentTarget)
    const closePicker = () => setPickerAnchor(null)
    const pickerOpen = Boolean(pickerAnchor)
    const maxCats = 4
    const IMAGE_HEIGHT = 240
    const assignedIds = card.categories.map((c) => c.id)

    return (
        <Card
            className="parent"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                // Optional: if you want each tile to stretch and align actions at the real bottom,
                // make sure the parent grid doesn't constrain height. This card will fill its grid area.
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
                }, // zoom on hover
                backgroundColor: theme.palette.customColors.grey_7,
            }}
        >
            {/* MEDIA (taller height, with hover overlay + click-to-preview) */}

            <Box sx={{ position: 'relative', height: IMAGE_HEIGHT, overflow: 'hidden' }}>
                {card.image_url ? (
                    <Box
                        component="img"
                        src={card.image_url ?? undefined}
                        alt={card.name ?? ''}
                        onClick={() => setImgOpen(true)} // ⬅ open preview dialog
                        sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            transition: 'transform 200ms ease',
                            cursor: 'zoom-in', // show zoom cursor
                            '.MuiCard-root:hover &': { transform: 'scale(1.06)' },
                        }}
                    />
                ) : (
                    <Box
                        onClick={() => onRequestEdit(card)}
                        sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex', // enable flexbox
                            alignItems: 'center', // vertical center
                            justifyContent: 'center', // horizontal center
                            objectFit: 'cover',
                            transition: 'transform 200ms ease',
                            cursor: 'pointer',
                            '.MuiCard-root:hover &': { transform: 'scale(1.06)' },
                        }}
                    >
                        <AddPhotoAlternateIcon
                            sx={{
                                fontSize: '50px',
                                opacity: 0.6,
                                transition: 'opacity 200ms ease',
                                '.MuiCard-root:hover &': { opacity: 1 },
                            }}
                        />
                    </Box>
                )}

                {/* Hover overlay button */}
                {card.image_url && (
                    <Tooltip
                        title="Zoom Photo"
                        placement="top"
                        slotProps={{
                            tooltip: {
                                sx: (t) => ({
                                    bgcolor: t.palette.info.main, // bubble background
                                    color: t.palette.getContrastText(t.palette.info.main), // readable text
                                    boxShadow: t.shadows[3],
                                    fontWeight: 700,
                                }),
                            },
                            arrow: {
                                sx: (t) => ({
                                    color: t.palette.warning.main, // arrow uses same color as bubble
                                }),
                            },
                        }}
                    >
                        <IconButton
                            aria-label="Expand image"
                            onClick={() => setImgOpen(true)}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                bgcolor: 'rgba(0,0,0,0.5)',
                                color: 'rgba(255, 255, 255, 1)',
                                opacity: 0,
                                transition: 'opacity 150ms ease, background-color 150ms ease',
                                '.MuiCard-root:hover &': { opacity: 1 },
                                '&:hover': {
                                    bgcolor: theme.palette.customColors.blue_3,
                                    color: 'rgba(255, 255, 255, 1)',
                                },
                            }}
                        >
                            <ZoomInIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                {/*<Tooltip
                    title="Edit Card"
                    placement="top"
                    slotProps={{
                        tooltip: {
                            sx: (t) => ({
                                bgcolor: t.palette.warning.main, // bubble background
                                color: t.palette.getContrastText(t.palette.warning.main), // readable text
                                boxShadow: t.shadows[3],
                                fontWeight: 700,
                            }),
                        },
                        arrow: {
                            sx: (t) => ({
                                color: t.palette.warning.main, // arrow uses same color as bubble
                            }),
                        },
                    }}
                >
                    <IconButton
                        aria-label="edit"
                        onClick={() => onRequestEdit(card)}
                        color="warning"
                        sx={{
                            position: 'absolute',
                            left: 8,
                            top: 8,
                            bgcolor: 'rgba(0,0,0,0.5)',
                            color: theme.palette.customColors.orange_3,
                            opacity: 0,
                            transition: 'opacity 150ms ease, background-color 150ms ease',
                            '.MuiCard-root:hover &': { opacity: 1 },
                            '&:hover': {
                                bgcolor: theme.palette.customColors.orange_3,
                                color: 'rgba(255, 255, 255, 1)',
                            },
                        }}
                    >
                        <EditIcon />
                    </IconButton>
                </Tooltip>*/}

                <Tooltip
                    title="Delete Card"
                    placement="right"
                    slotProps={{
                        tooltip: {
                            sx: (t) => ({
                                bgcolor: t.palette.error.main, // bubble background
                                color: t.palette.getContrastText(t.palette.error.main), // readable text
                                boxShadow: t.shadows[3],
                                fontWeight: 700,
                            }),
                        },
                        arrow: {
                            sx: (t) => ({
                                color: t.palette.error.main, // arrow uses same color as bubble
                            }),
                        },
                    }}
                >
                    <IconButton
                        aria-label="delete"
                        color="error"
                        size="small"
                        onClick={() => onRequestDelete(card)}
                        sx={{
                            position: 'absolute',
                            left: 8,
                            top: 8,
                            bgcolor: 'rgba(0, 0, 0, 0.5)',
                            color: theme.palette.customColors.red_3,
                            opacity: 0,
                            border: 'solid 1px ' + theme.palette.customColors.red_3,
                            transition: 'opacity 150ms ease, background-color 150ms ease',
                            '.MuiCard-root:hover &': { opacity: 1 },
                            '&:hover': {
                                bgcolor: theme.palette.customColors.red_3,
                                color: 'rgba(255, 255, 255, 1)',
                            },
                        }}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* CONTENT (clamped title/description) */}
            <Box
                onClick={() => onRequestEdit(card)}
                sx={{ px: 1.5, pt: 1.5, alignItems: 'stretch', cursor: 'pointer' }}
            >
                <Typography
                    gutterBottom
                    variant="subtitle1"
                    fontWeight={700}
                    noWrap
                    title={card.name}
                    sx={{ textShadow: TITLE_SHADOW }}
                >
                    {card.name}
                </Typography>

                {/* 2-line clamp with ellipsis */}
                {card.description && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        title={card.description}
                        sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {card.description}
                    </Typography>
                )}
            </Box>

            {/* CATEGORIES (kept above actions) */}
            <Box sx={{ px: 1.5, py: 2 }}>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                    {card.categories.length > 0 ? (
                        card.categories.slice(0, maxCats).map((cat) => (
                            <Chip
                                key={cat.id}
                                size="small"
                                label={cat.name}
                                sx={(t) => {
                                    const bg = cat.color || (t.palette.action.selected as string)
                                    const contrast =
                                        t.palette.getContrastText(bg) === '#fff' ? '#fff' : '#000'
                                    return {
                                        bgcolor: bg,
                                        color: contrast,
                                        textShadow: contrast === '#000' ? 'none' : TITLE_SHADOW,
                                        '& .MuiChip-deleteIcon': {
                                            color: 'inherit',
                                            '&:hover': { color: 'inherit' },
                                        },
                                    }
                                }}
                            />
                        ))
                    ) : (
                        <Chip
                            size="small"
                            label="No category"
                            variant="outlined"
                            sx={{ cursor: 'pointer', textShadow: TITLE_SHADOW }}
                        />
                    )}

                    {/* always show "Edit" (pencil) */}
                    <Tooltip title="Edit categories">
                        <Chip
                            size="small"
                            icon={<EditIcon />}
                            label="Edit"
                            variant="outlined"
                            onClick={openPicker}
                            sx={{ cursor: 'pointer', textShadow: TITLE_SHADOW }}
                        />
                    </Tooltip>

                    <CategoryPicker
                        open={pickerOpen}
                        anchorEl={pickerAnchor}
                        onClose={closePicker}
                        allCategories={allCategories}
                        selectedIds={assignedIds}
                        onApply={(ids) => onApplyCategories(card.id, ids)}
                        maxSelection={maxCats}
                        title="Edit categories"
                    />
                </Stack>
            </Box>

            {/* Full-size image preview dialog */}
            <Dialog
                open={imgOpen}
                onClose={() => setImgOpen(false)}
                maxWidth="lg"
                // Optional: darker frame and no extra padding
                slotProps={{
                    paper: {
                        sx: { bgcolor: 'transparent', boxShadow: 'none' },
                    },
                }}
            >
                <DialogContent sx={{ p: 0, bgcolor: 'rgba(0,0,0,0.85)' }}>
                    <Box
                        component="img"
                        src={card.image_url!}
                        alt={card.name}
                        sx={{
                            display: 'block',
                            maxWidth: '90vw',
                            maxHeight: '85vh',
                            objectFit: 'contain',
                            m: 'auto',
                        }}
                        onClick={() => setImgOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </Card>
    )
}

/* ========================================================================
 Skeleton tile (variable height; image area fixed)
 ===================================================================== */
function CardTileSkeleton() {
    return (
        <Card variant="outlined" sx={{ display: 'flex', flexDirection: 'column' }}>
            <Skeleton variant="rectangular" animation="wave" height={MEDIA_HEIGHT} />
            <CardContent sx={{ py: 1.25, px: 1.5 }}>
                <Skeleton variant="text" width="70%" height={28} />
                <Skeleton variant="text" width="90%" height={18} />
                <Skeleton variant="text" width="80%" height={18} />
            </CardContent>
            <Box sx={{ px: 1.5, pb: 1, pt: 0.5 }}>
                <Stack direction="row" spacing={0.75}>
                    <Skeleton variant="rounded" width={56} height={24} />
                    <Skeleton variant="rounded" width={72} height={24} />
                    <Skeleton variant="rounded" width={48} height={24} />
                </Stack>
            </Box>
            <CardActions sx={{ pt: 0, px: 1.5, pb: 1, justifyContent: 'flex-end' }}>
                <Skeleton variant="circular" width={36} height={36} />
                <Skeleton variant="circular" width={36} height={36} />
            </CardActions>
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
                // Optional: if you want each tile to stretch and align actions at the real bottom,
                // make sure the parent grid doesn't constrain height. This card will fill its grid area.
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
                }, // zoom on hover
                backgroundColor: t.palette.customColors.grey_7,
            })}
        >
            <CardActionArea
                onClick={onClick}
                sx={{
                    flex: 1, // fill available vertical space
                    width: '100%', // fill horizontally
                    height: '100%', // fill vertically
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                    py: 6, // moved here so ALL clickable
                    // (Optional) put hover here instead of Card if you prefer:
                    // transition: (t) => t.transitions.create(['box-shadow', 'transform']),
                    // '&:hover': { boxShadow: 5, transform: 'scale(1.02)' },
                }}
            >
                <Stack
                    alignItems="center"
                    spacing={1}
                    sx={{
                        transition: (t) =>
                            t.transitions.create(['transform'], {
                                duration: t.transitions.duration.shorter,
                            }),
                        willChange: 'transform',
                        '&:hover': {
                            transform: 'scale(1.42)',
                        },
                    }}
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
 Main Page Component
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
                notify(err?.response?.data?.message || 'Failed to load cards', 'error')
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
                image_url: payload.image_url, // send image_url
                category_ids: payload.category_ids, // categories
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
                    // ensure we see the new image immediately even if API response omits it
                    image_url: pickImage,
                    // keep/replace categories (prefer backend echo; otherwise use payload)
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
            notify(err?.response?.data?.message || 'Failed to update card categories', 'error')
            // Optional: revert state if necessary
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
            notify(err?.response?.data?.message || 'Failed to delete card', 'error')
        } finally {
            setDeleteAsk(null)
        }
    }

    /* ------------------------------ Rendering ------------------------------ */
    const loading = cards === null

    return (
        <Container maxWidth="xl">
            <Box sx={{ p: 2 }}>
                {/* Filters Toolbar */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: (t) =>
                            t.palette.customColors?.grey_6 ?? t.palette.background.paper,
                    }}
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
                                                cat.color || (t.palette.action.selected as string)
                                            const contrast =
                                                t.palette.getContrastText(bg) === '#fff'
                                                    ? '#fff'
                                                    : '#000'
                                            return {
                                                bgcolor: bg,
                                                color: contrast,
                                                textShadow:
                                                    contrast == '#000' ? 'none' : TITLE_SHADOW, // no shadow on light backgrounds
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
                                sx={{ textShadow: TITLE_SHADOW }}
                            />
                        </Stack>
                    )}
                </Paper>

                {/* 4 equal-width columns on md+, 2 on sm, 1 on xs (heights vary with content) */}
                <Box
                    sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: {
                            xs: 'repeat(1, minmax(0, 1fr))',
                            sm: 'repeat(4, minmax(0, 1fr))',
                            md: 'repeat(5, minmax(0, 1fr))',
                        },
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
                                  onRequestDelete={askDelete}
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
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DeleteIcon sx={{ color: theme.palette.customColors.red_3 }} /> Delete card
                    </DialogTitle>
                    <DialogContent dividers>
                        <Typography>
                            {deleteAsk
                                ? `Are you sure you want to delete "${deleteAsk.name}"? This action cannot be undone.`
                                : 'Are you sure?'}
                        </Typography>
                    </DialogContent>
                    <DialogActions>
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
                    </DialogActions>
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
