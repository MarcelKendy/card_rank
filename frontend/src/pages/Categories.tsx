import { useEffect, useState } from 'react'
import {
    Card,
    CardContent,
    Stack,
    TextField,
    Button,
    Snackbar,
    Alert,
    InputAdornment,
    Box
} from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import EditIcon from '@mui/icons-material/Edit'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import api from '../services/api.ts'
import CategoryList from '../components/categories/CategoryList.tsx'
import type { AlertColor } from '@mui/material/Alert'
import type { Category } from '../components/categories/types'
import theme from '../theme.ts'

/* =========================
 * Color normalization & validation
 * ========================= */
function toHex6(value: string): string {
    if (!value) return value
    const v = value.trim()
    const m3 = /^#([0-9A-Fa-f]{3})$/.exec(v)
    if (m3) {
        const [r, g, b] = m3[1].split('')
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
    }
    if (/^#([0-9A-Fa-f]{6})$/.test(v)) return v.toLowerCase()
    const named: Record<string, string> = {
        white: '#ffffff',
        black: '#000000',
        red: '#ff0000',
        green: '#00ff00',
        blue: '#0000ff',
    }
    if (named[v.toLowerCase()]) return named[v.toLowerCase()]
    return v
}
const HEX6_RE = /^#([0-9A-Fa-f]{6})$/

/* =========================
 * Component
 * ========================= */
export default function Categories() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading_add_update, setLoading] = useState(false)
    const [loading_fetch, setLoadingFetch] = useState(false)

    // Form state
    const [editingId, setEditingId] = useState<number | null>(null)
    const [name, setName] = useState('')
    const [color, setColor] = useState('#ffffff') // Always keep 6-digit hex here
    const [imageUrl, setImageUrl] = useState<string>('')

    // Field errors
    const [nameError, setNameError] = useState<string | null>(null)
    const [colorError, setColorError] = useState<string | null>(null)
    const [imageUrlError, setImageUrlError] = useState<string | null>(null)

    // Snackbar
    const [snackOpen, setSnackOpen] = useState(false)
    const [snackMsg, setSnackMsg] = useState('')
    const [snackSeverity, setSnackSeverity] = useState<AlertColor>('success')
    const notify = (message: string, severity: AlertColor = 'success') => {
        setSnackMsg(message)
        setSnackSeverity(severity)
        setSnackOpen(true)
    }

    // Fetch once on mount
    useEffect(() => {
        ;(async () => {
            setLoadingFetch(true)
            try {
                const res = await api.get('/get_categories')
                const list: Category[] = (res.data ?? []).map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    color: toHex6(c.color ?? '#ffffff'),
                    image_url: c.image_url ?? null,
                }))
                setCategories(list)
            } catch (err: any) {
                notify(err?.response?.data?.message ?? 'Failed to load categories', 'error')
            } finally {
                setLoadingFetch(false)
            }
        })()
    }, [])

    // Local-only updates (no refetch)
    const addCategoryLocal = (created: Category) => setCategories((prev) => [created, ...prev])
    const updateCategoryLocal = (updated: Category) =>
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    const removeCategoryLocal = (id: number) =>
        setCategories((prev) => prev.filter((c) => c.id !== id))

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

    const resetForm = () => {
        setEditingId(null)
        setName('')
        setColor('#ffffff')
        setImageUrl('')
        setNameError(null)
        setColorError(null)
        setImageUrlError(null)
    }

    const validateName = (value: string): boolean | undefined => {
        const v = value.trim()
        if (!v) {
            setNameError('Name is required')
            return false
        } else if (v.length < 2) {
            setNameError('Name should be at least 2 chars')
            return false
        } else if (v.length > 50) {
            setNameError('Name should be 50 chars at most')
            return false
        }
        setNameError(null)
        return true
    }

    // Accept http(s) URLs and data:image/* URIs (base64 or percent-encoded)
    function validateImageUrl(value: string) {
        const v = (value ?? '').trim()

        // Optional field: empty is valid
        if (!v) {
            setImageUrlError(null)
            return true
        }

        // Accept data:image/* URIs
        if (v.startsWith('data:')) {
            // Minimal validation for data:image:
            // data:image/<subtype>[;charset=...][;base64],<payload>
            const DATA_IMAGE_RE = /^data:image\/[a-z0-9.+-]+(?:;charset=[^;,\s]+)?(?:;base64)?,/i

            if (!DATA_IMAGE_RE.test(v)) {
                setImageUrlError('Invalid data URI. Expected data:image/<type>[;base64],<payload>')
                return false
            }

            setImageUrlError(null)
            return true
        }

        // Else, treat as a normal URL and require http(s)
        try {
            const u = new URL(v)
            if (!/^https?:$/i.test(u.protocol)) {
                setImageUrlError('Only http(s) or data:image URIs are allowed')
                return false
            }
            setImageUrlError(null)
            return true
        } catch {
            setImageUrlError('Invalid URL')
            return false
        }
    }

    const validateForm = () => {
        let ok = true
        if (!validateName(name)) ok = false
        const normalized = toHex6(color)
        if (!normalized || !HEX6_RE.test(normalized)) {
            setColorError('Color is required (6-digit hex, e.g. #ffffff)')
            ok = false
        } else {
            setColorError(null)
            if (normalized !== color) setColor(normalized)
        }
        if (!validateImageUrl(imageUrl)) ok = false
        return ok
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateForm()) {
            notify('Please fill all fields correctly', 'error')
            return
        }
        setLoading(true)
        try {
            if (editingId == null) {
                // CREATE → update local array after success (no refetch)
                const res = await api.post('/add_category', {
                    name: name.trim(),
                    color,
                    image_url: imageUrl || null,
                })
                const data = res?.data ?? {}
                const created: Category = {
                    id: typeof data.id === 'number' ? data.id : Date.now(), // fallback id
                    name: data.name ?? name.trim(),
                    color: toHex6(data.color ?? color),
                    image_url: (data.image_url ?? imageUrl) || null,
                }
                addCategoryLocal(created)
                notify('Category created successfully!', 'success')
            } else {
                // UPDATE → update local array after success (no refetch)
                await api.put(`/edit_category/${editingId}`, {
                    name: name.trim(),
                    color,
                    image_url: imageUrl || null,
                })
                updateCategoryLocal({
                    id: editingId,
                    name: name.trim(),
                    color,
                    image_url: imageUrl || null,
                } as Category)
                notify('Category updated successfully!', 'success')
            }
            resetForm()
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (err: any) {
            notify(err?.response?.data?.message ?? 'Request failed', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleEditRequest = (cat: Category) => {
        setEditingId(cat.id)
        setName(cat.name)
        setColor(toHex6(cat.color))
        setImageUrl(cat.image_url ?? '')
        setNameError(null)
        setColorError(null)
        setImageUrlError(null)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Preview box for the image (or fallback icon)
    const Preview = (
        <Box
            sx={{
                width: 64,
                height: 64,
                borderRadius: 1,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${color}`,
                bgcolor: 'rgba(255,255,255,0.06)',
            }}
        >
            {imageUrl ? (
                <Box
                    component="img"
                    src={imageUrl}
                    alt="category"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
            ) : (
                <AddPhotoAlternateIcon sx={{ color, opacity: 0.9, fontSize: 32 }} />
            )}
        </Box>
    )

    return (
        <Box>
            {/* Form Card */}
            <Card variant="outlined" sx={{ mb: 3, bgcolor: theme.palette.customColors?.grey_6 }}>
                <CardContent>
                    <form onSubmit={handleSubmit} noValidate>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            alignItems="flex-start"
                        >
                            {/* Name */}
                            <TextField
                                label="Name"
                                value={name}
                                onChange={(e) => {
                                    setName(formatName(e.target.value))
                                    validateName(e.target.value)
                                }}
                                required
                                error={!!nameError}
                                helperText={nameError ?? name.length + ' / 50'}
                                color={editingId ? 'warning' : 'success'}
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Button size="small" onClick={() => setName('')}>
                                                    Clear
                                                </Button>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                                sx={{ width: 420 }}
                            />

                            {/* Color picker */}
                            <TextField
                                label="Color"
                                type="color"
                                value={color}
                                onChange={(e) => setColor(toHex6(e.target.value))}
                                sx={{ width: 140 }}
                                slotProps={{ htmlInput: { 'aria-label': 'Category color' } }}
                                required
                                error={!!colorError}
                                helperText={colorError ?? ' '}
                                color={editingId ? 'warning' : 'success'}
                            />

                            {/* Image URL (optional) */}
                            <TextField
                                label="Image URL (optional)"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                onBlur={(e) => validateImageUrl(e.target.value)}
                                placeholder="https://example.com/image.png"
                                error={!!imageUrlError}
                                helperText={imageUrlError ?? ' '}
                                color={editingId ? 'warning' : 'success'}
                                sx={{ width: 420 }}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <AddPhotoAlternateIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                        spellCheck: false,
                                    },
                                }}
                            />

                            {/* Preview */}
                            {Preview}
                        </Stack>

                        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                color={editingId == null ? 'success' : 'warning'}
                                startIcon={
                                    editingId == null ? <AddCircleOutlineIcon /> : <EditIcon />
                                }
                                disabled={loading_add_update}
                                sx={{ fontWeight: 'bold' }}
                            >
                                {editingId == null ? 'Add Category' : 'Update Category'}
                            </Button>
                            {editingId != null && (
                                <Button type="button" variant="outlined" onClick={resetForm}>
                                    Cancel
                                </Button>
                            )}
                        </Stack>
                    </form>
                </CardContent>
            </Card>

            {/* Category List */}
            <CategoryList
                categories={categories}
                loading_fetch={loading_fetch}
                onEdit={handleEditRequest}
                onNotify={notify}
                onRemove={removeCategoryLocal} // ← update local array after successful delete
            />

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
