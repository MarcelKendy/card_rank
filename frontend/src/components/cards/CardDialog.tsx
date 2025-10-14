import * as React from 'react'
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
    Stack,
    TextField,
    Rating,
    Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import CategoryPicker from './CategoryPicker'
import type { Category } from './types'
import type { CardDialogProps } from './types'

const TITLE_SHADOW = '0px 1px 10px rgba(0, 0, 0, 1)'
/* =========================
   Config for multi-images
   ========================= */
const MAX_IMAGES = 3
/** Choose a delimiter unlikely to appear in URLs. `||` is simple & readable. */
export const IMAGES_DELIM = '||'

function splitImages(value?: string | null): string[] {
    if (!value) return Array(MAX_IMAGES).fill('')
    const parts = String(value)
        .split(IMAGES_DELIM)
        .map((s) => s.trim())
        .filter(Boolean)
    const arr = parts.slice(0, MAX_IMAGES)
    while (arr.length < MAX_IMAGES) arr.push('')
    return arr
}

/** Remove empty entries and join with delimiter. Returns null if none. */
function joinImages(values: string[]): string | null {
    const compact = values
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_IMAGES)
    return compact.length ? compact.join(IMAGES_DELIM) : null
}

function formatName(input: string, locale?: string): string {
    return input.replace(/(\S+)/g, (word) => {
        const chars = [...word]
        if (chars.length < 2) return word
        const [first, ...rest] = chars
        const firstUp = locale ? first.toLocaleUpperCase(locale) : first.toLocaleUpperCase()
        const restLower = locale
            ? rest.join('').toLocaleLowerCase(locale)
            : rest.join('').toLocaleLowerCase()
        return firstUp + restLower
    })
}

export default function CardDialog({
    open,
    mode,
    initial,
    allCategories,
    onCancel,
    onSave,
    onNotify,
}: CardDialogProps) {
    const [name, setName] = React.useState(initial?.name ?? '')
    const [description, setDescription] = React.useState(initial?.description ?? '')
    const [rating, setRating] = React.useState(initial?.rating ?? 0)

    // NEW: up to 3 images
    const [images, setImages] = React.useState<string[]>(splitImages(initial?.image_url))

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
            setRating(initial?.rating ?? 0)
            setImages(splitImages(initial?.image_url)) // NEW: split joined value
            setCategoryIds(initial?.categories?.map((c) => c.id) ?? [])
            setNameError(null)
            setDescriptionError(null)
        }
    }, [open, initial])

    function validateName(value: string): boolean {
        const v = value.trim()
        if (!v) {
            setNameError('Name is required')
            return false
        } else if (v.length > 50) {
            setNameError('Name should be 50 chars at most')
            return false
        } else if (v.length < 2) {
            setNameError('Name should be at least 2 chars')
            return false
        }
        setNameError(null)
        return true
    }

    function validateDescription(value: string): boolean {
        const v = value.trim()
        if (!v) {
            setDescriptionError('Description is required')
            return false
        } else if (v.length > 265) {
            setDescriptionError('Description should be 265 chars at most')
            return false
        } else if (v.length < 5) {
            setDescriptionError('Description should be at least 5 chars')
            return false
        }
        setDescriptionError(null)
        return true
    }

    const validateForm = (payload: {
        name: string
        description: string
        rating: number
        image_url?: string | null
        category_ids?: number[]
    }) => {
        let ok = true
        if (!validateName(payload.name)) ok = false
        if (!validateDescription(payload.description)) ok = false
        return ok
    }

    const handleSave = async () => {
        // Compact images (remove gaps) and join with delimiter
        const image_url = joinImages(images)

        const payload = {
            name: name.trim(),
            description: description.trim(),
            image_url, // send concatenated or null
            rating,
            category_ids: categoryIds.slice(0, 4),
        }
        if (!validateForm(payload)) {
            onNotify('Please fill all fields correctly', 'error')
            return
        }
        await onSave(payload)
    }

    const handleCancel = () => {
        setNameError(null)
        setDescriptionError(null)
        onCancel()
    }

    const selectedChips = categoryIds
        .map((id) => allCategories.find((c) => c.id === id))
        .filter(Boolean) as Category[]

    // Common TextField styling (keeps your colors/behavior)
    const tfSx = (t: any) => ({
        '& label': { color: 'none' },
        '& label.Mui-focused': {
            color:
                mode === 'add' ? t.palette.customColors.green_3 : t.palette.customColors.orange_3,
        },
        '& .MuiInputLabel-root.Mui-error': { color: 'error.main' },
        '& .MuiInputLabel-root.Mui-disabled': { color: 'text.disabled' },
        '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'none' },
            '&:hover fieldset': {
                borderColor:
                    mode === 'add'
                        ? t.palette.customColors.green_3
                        : t.palette.customColors.orange_3,
            },
            '&.Mui-focused fieldset': {
                borderColor:
                    mode === 'add'
                        ? t.palette.customColors.green_3
                        : t.palette.customColors.orange_3,
            },
        },
    })

    // Handlers for image fields
    const setImageAt = (idx: number, val: string) => {
        setImages((prev) => {
            const next = prev.slice()
            next[idx] = val
            // Optional: if user clears an earlier field, also clear following to maintain order.
            // If you prefer to just allow gaps and compact on save, comment out lines below:
            if (val.trim() === '') {
                for (let i = idx + 1; i < MAX_IMAGES; i++) next[i] = ''
            }
            return next
        })
    }

    return (
        <Dialog
            open={open}
            onClose={handleCancel}
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
                        onChange={(e) => {
                            setName(formatName(e.target.value))
                            validateName(e.target.value)
                        }}
                        required
                        error={!!nameError}
                        helperText={nameError ?? `${name.length} / 50`}
                        sx={tfSx}
                    />

                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => {
                            setDescription(e.target.value)
                            validateDescription(e.target.value)
                        }}
                        multiline
                        minRows={3}
                        required
                        error={!!descriptionError}
                        helperText={descriptionError ?? `${description.length} / 265`}
                        sx={tfSx}
                    />

                    {/* ============= NEW: up to 3 image URL fields ============= */}
                    <Stack spacing={1}>
                        <Typography variant="subtitle2" fontWeight={700}>
                            Images (up to {MAX_IMAGES})
                        </Typography>

                        {images.map((val, i) => {
                            const enabled = i === 0 || images[i - 1].trim() !== ''
                            return (
                                <TextField
                                    key={i}
                                    label={`Image URL ${i + 1}`}
                                    value={val}
                                    onChange={(e) => setImageAt(i, e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    disabled={!enabled}
                                    slotProps={{
                                        input: {
                                            endAdornment: val ? (
                                                <InputAdornment position="end">
                                                    <Button
                                                        size="small"
                                                        onClick={() => setImageAt(i, '')}
                                                    >
                                                        Clear
                                                    </Button>
                                                </InputAdornment>
                                            ) : null,
                                        },
                                    }}
                                    sx={[tfSx, { display: enabled ? 'flex' : 'none' }]}
                                />
                            )
                        })}
                    </Stack>

                    <Box>
                        <Typography sx={{ pb: 0.5 }} variant="subtitle2" fontWeight={700}>
                            Rating
                        </Typography>
                        <Rating
                            name="simple-controlled"
                            value={rating}
                            max={10}
                            size="large"
                            onChange={(_, newValue) => {
                                setRating(newValue ?? 0)
                            }}
                        />
                    </Box>

                    {/* Categories */}
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
                                                cat.color ?? (t.palette.action.selected as string)
                                            const contrast =
                                                t.palette.getContrastText(bg) === '#fff'
                                                    ? '#fff'
                                                    : '#000'
                                            return {
                                                bgcolor: bg,
                                                color: contrast,
                                                textShadow:
                                                    contrast === '#000' ? 'none' : TITLE_SHADOW,
                                                '.MuiCard-root:hover &': { opacity: 0.5 },
                                                boxShadow:
                                                    'rgba(0, 0, 0, 0.24) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;',
                                                border: 'solid 1px rgba(255, 255, 255, 0.4)',
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
                                sx={{
                                    cursor: 'pointer',
                                    textShadow: '0px 1px 10px rgba(0, 0, 0, 1)',
                                }}
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
                <Button onClick={handleCancel} startIcon={<CloseIcon />}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    sx={(t) => ({
                        backgroundColor:
                            mode === 'add'
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
