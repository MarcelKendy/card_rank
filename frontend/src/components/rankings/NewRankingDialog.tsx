// components/rankings/NewRankingDialog.tsx
import * as React from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Button,
    Stack,
    Typography,
    TextField,
    Paper,
    Popper,
    ClickAwayListener,
    ButtonGroup,
    Rating,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FilterAltIcon from '@mui/icons-material/FilterAlt'
import AddIcon from '@mui/icons-material/Add'
import type { AlertColor } from '@mui/material/Alert'
import CategoryPicker from '../cards/CategoryPicker'
import type { Category } from '../cards/types'
import type { Ranking, RankingFilters, RatingOp } from './types'
import {
    parseTiers,
    serializeTiers,
    formatName,
    validateNameValue,
    validateDescriptionValue,
    validateTiersValue,
} from './utils'

type Props = {
    open: boolean
    allCategories: Category[]
    onClose: () => void
    /** Parent performs API; resolve when done. */
    onCreate: (payload: Partial<Ranking>) => Promise<void>
    notify: (m: string, s?: AlertColor) => void
}

export default function NewRankingDialog({
    open,
    allCategories,
    onClose,
    onCreate,
    notify,
}: Props) {
    const [name, setName] = React.useState('')
    const [description, setDescription] = React.useState('')
    const [imageUrl, setImageUrl] = React.useState('')
    const [tiersStr, setTiersStr] = React.useState('S;A;B')
    const [catIds, setCatIds] = React.useState<number[]>([])
    const [rating, setRating] = React.useState<number | null>(null)
    const [ratingOp, setRatingOp] = React.useState<RatingOp>('eq')

    const [catAnchor, setCatAnchor] = React.useState<HTMLElement | null>(null)
    const [ratingAnchor, setRatingAnchor] = React.useState<HTMLElement | null>(null)
    const [saving, setSaving] = React.useState(false)

    // Inline errors
    const [nameError, setNameError] = React.useState<string | null>(null)
    const [descriptionError, setDescriptionError] = React.useState<string | null>(null)
    const [tiersError, setTiersError] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (open) {
            setName('')
            setDescription('')
            setImageUrl('')
            setTiersStr('S;A;B')
            setCatIds([])
            setRating(null)
            setRatingOp('eq')
            setSaving(false)
            setNameError(null)
            setDescriptionError(null)
            setTiersError(null)
        }
    }, [open])

    function runAllValidations(): boolean {
        const e1 = validateNameValue(name)
        const e2 = validateDescriptionValue(description)
        const e3 = validateTiersValue(tiersStr)
        setNameError(e1)
        setDescriptionError(e2)
        setTiersError(e3)
        return !e1 && !e2 && !e3
    }

    const handleCreate = async () => {
        if (!runAllValidations()) {
            notify('Please fix the fields marked in red', 'error')
            return
        }
        setSaving(true)
        try {
            const filters: RankingFilters = {
                category_ids: catIds,
                rating: rating,
                rating_param: ratingOp,
            }
            const payload: Partial<Ranking> = {
                name: name.trim(),
                description: description.trim() || null,
                image_url: imageUrl.trim() || null,
                tiers: serializeTiers(parseTiers(tiersStr)),
                filters,
            }
            await onCreate(payload)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle>
                New ranking
                <IconButton
                    onClick={onClose}
                    disabled={saving}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={1.5}>
                    <TextField
                        label="Name"
                        value={name}
                        onChange={(e) => {
                            const next = formatName(e.target.value)
                            setName(next)
                            setNameError(validateNameValue(next))
                        }}
                        required
                        error={!!nameError}
                        helperText={nameError ?? `${name.length} / 50`}
                        fullWidth
                    />

                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => {
                            const next = e.target.value
                            setDescription(next)
                            setDescriptionError(validateDescriptionValue(next))
                        }}
                        multiline
                        minRows={3}
                        required
                        error={!!descriptionError}
                        helperText={descriptionError ?? `${description.length} / 265`}
                    />

                    <TextField
                        label="Image URL"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        fullWidth
                        placeholder="https://…"
                    />

                    <TextField
                        label="Tiers (semicolon separated)"
                        value={tiersStr}
                        onChange={(e) => {
                            const next = e.target.value
                            setTiersStr(next)
                            setTiersError(validateTiersValue(next))
                        }}
                        error={!!tiersError}
                        helperText={tiersError ?? 'Example: S;GOD TIER;ADVANCED;MID;BAD'}
                        fullWidth
                    />

                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                        Filters
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<FilterAltIcon />}
                            onClick={(e) => setCatAnchor(e.currentTarget)}
                            disabled={saving}
                        >
                            Categories
                        </Button>
                        <CategoryPicker
                            open={Boolean(catAnchor)}
                            maxSelection={4}
                            anchorEl={catAnchor}
                            onClose={() => setCatAnchor(null)}
                            allCategories={allCategories}
                            selectedIds={catIds}
                            onApply={(ids) => setCatIds(ids.slice(0, 4))}
                            title="Ranking categories"
                        />

                        <Button
                            variant="outlined"
                            size="small"
                            color="warning"
                            startIcon={<FilterAltIcon />}
                            onClick={(e) => setRatingAnchor(e.currentTarget)}
                            disabled={saving}
                        >
                            Rating
                        </Button>

                        <Popper
                            open={Boolean(ratingAnchor)}
                            anchorEl={ratingAnchor}
                            placement="bottom-start"
                            style={{ zIndex: 1300 }}
                        >
                            <ClickAwayListener onClickAway={() => setRatingAnchor(null)}>
                                <Paper
                                    sx={{
                                        p: 1.5,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                    }}
                                >
                                    <ButtonGroup size="small" aria-label="rating comparator">
                                        <Button
                                            variant={ratingOp === 'lte' ? 'contained' : 'outlined'}
                                            onClick={() => setRatingOp('lte')}
                                        >
                                            ≤
                                        </Button>
                                        <Button
                                            variant={ratingOp === 'eq' ? 'contained' : 'outlined'}
                                            onClick={() => setRatingOp('eq')}
                                        >
                                            {' '}
                                            ={' '}
                                        </Button>
                                        <Button
                                            variant={ratingOp === 'gte' ? 'contained' : 'outlined'}
                                            onClick={() => setRatingOp('gte')}
                                        >
                                            ≥
                                        </Button>
                                    </ButtonGroup>

                                    <Rating
                                        max={10}
                                        value={rating}
                                        onChange={(_, v) => setRating(v)}
                                        sx={{ '& .MuiRating-icon': { fontSize: 28 } }}
                                    />

                                    <Button size="small" onClick={() => setRating(null)}>
                                        Clear
                                    </Button>
                                </Paper>
                            </ClickAwayListener>
                        </Popper>
                    </Stack>
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={saving} startIcon={<CloseIcon />}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    sx={{ fontWeight: 600 }}
                    color="success"
                    onClick={handleCreate}
                    disabled={saving || !name.trim()}
                    startIcon={<AddIcon />}
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    )
}
