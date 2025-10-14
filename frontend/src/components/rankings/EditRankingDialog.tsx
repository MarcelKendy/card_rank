// components/rankings/EditRankingDialog.tsx
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
    Select,
    MenuItem,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FilterAltIcon from '@mui/icons-material/FilterAlt'
import EditIcon from '@mui/icons-material/Edit'
import type { AlertColor } from '@mui/material/Alert'
import CategoryPicker from '../cards/CategoryPicker'
import type { Category } from '../cards/types'
import type { Ranking, RatingOp } from './types'
import {
    parseFilters,
    parseTiers,
    serializeTiers,
    validateNameValue,
    validateDescriptionValue,
    validateTiersValue,
    TIER_NAME_MAX,
} from './utils'

type Props = {
    open: boolean
    ranking: Ranking
    allCategories: Category[]
    onClose: () => void
    /** Parent performs API; resolve when saved. */
    onSave: (id: number, payload: Partial<Ranking>, prune: boolean) => Promise<void>
    notify: (m: string, s?: AlertColor) => void
}

export default function EditRankingDialog({
    open,
    ranking,
    allCategories,
    onClose,
    onSave,
    notify,
}: Props) {
    const filters0 = parseFilters(ranking.filters)

    const [name, setName] = React.useState(ranking.name)
    const [description, setDescription] = React.useState(ranking.description ?? '')
    const [imageUrl, setImageUrl] = React.useState(ranking.image_url ?? '')
    const [tiersStr, setTiersStr] = React.useState(ranking.tiers ?? 'S;A;B')
    const [catIds, setCatIds] = React.useState<number[]>(filters0.category_ids ?? [])
    const [rating, setRating] = React.useState<number | null>(filters0.rating ?? null)
    const [ratingOp, setRatingOp] = React.useState<RatingOp>(filters0.rating_param ?? 'eq')
    const [prune, setPrune] = React.useState(true)

    const [catAnchor, setCatAnchor] = React.useState<HTMLElement | null>(null)
    const [ratingAnchor, setRatingAnchor] = React.useState<HTMLElement | null>(null)

    // Inline errors
    const [nameError, setNameError] = React.useState<string | null>(null)
    const [descriptionError, setDescriptionError] = React.useState<string | null>(null)
    const [tiersError, setTiersError] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (open) {
            const f = parseFilters(ranking.filters)
            setName(ranking.name)
            setDescription(ranking.description ?? '')
            setImageUrl(ranking.image_url ?? '')
            setTiersStr(ranking.tiers ?? 'S;A;B')
            setCatIds(f.category_ids ?? [])
            setRating(f.rating ?? null)
            setRatingOp(f.rating_param ?? 'eq')
            setPrune(true)
            setNameError(null)
            setDescriptionError(null)
            setTiersError(null)
        }
    }, [open, ranking])

    function runAllValidations(): boolean {
        const e1 = validateNameValue(name)
        const e2 = validateDescriptionValue(description)
        const e3 = validateTiersValue(tiersStr)
        setNameError(e1)
        setDescriptionError(e2)
        setTiersError(e3)
        return !e1 && !e2 && !e3
    }

    const save = async () => {
        if (!runAllValidations()) {
            notify('Please fix the fields marked in red', 'error')
            return
        }
        const payload: Partial<Ranking> = {
            name,
            description,
            image_url: imageUrl || null,
            tiers: serializeTiers(parseTiers(tiersStr)),
            filters: { category_ids: catIds, rating, rating_param: ratingOp },
        }
        await onSave(ranking.id, payload, prune)
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>
                Edit ranking
                <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={1.5}>
                    <TextField
                        label="Name"
                        value={name}
                        onChange={(e) => {
                            const next = e.target.value
                            setName(next)
                            setNameError(validateNameValue(next))
                        }}
                        fullWidth
                        required
                        error={!!nameError}
                        helperText={nameError ?? `${name.length} / 50`}
                    />

                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => {
                            const next = e.target.value
                            setDescription(next)
                            setDescriptionError(validateDescriptionValue(next))
                        }}
                        fullWidth
                        multiline
                        minRows={2}
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
                        helperText={tiersError ?? 'Example: S;GOD TIER;ADVANCED;MID;BAD'}
                        error={!!tiersError}
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
                        >
                            Categories
                        </Button>
                        <CategoryPicker
                            maxSelection={4}
                            open={Boolean(catAnchor)}
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

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                        <input
                            type="checkbox"
                            id="prune"
                            checked={prune}
                            onChange={(e) => setPrune(e.target.checked)}
                        />
                        <label htmlFor="prune">Remove cards that don’t match new filters</label>
                    </Stack>
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} startIcon={<CloseIcon />}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    sx={{ fontWeight: 600 }}
                    color="warning"
                    onClick={save}
                    startIcon={<EditIcon />}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}
