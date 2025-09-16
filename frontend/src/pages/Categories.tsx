import { useEffect, useMemo, useState } from 'react'
import {
    Container,
    Card,
    CardContent,
    Stack,
    TextField,
    Button,
    Snackbar,
    Alert,
    Autocomplete,
    InputAdornment,
} from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import EditIcon from '@mui/icons-material/Edit'
import * as MuiIcons from '@mui/icons-material' // ⚠️ Imports all icons; consider curating or code-splitting in production.
import { createFilterOptions } from '@mui/material/Autocomplete'
import api from '../services/api.ts'
import CategoryList from '../components/CategoryList'

type AlertColor = 'success' | 'error' | 'warning' | 'info'

export interface Category {
    id: number
    name: string
    color: string
    icon: string
}

/* =========================
 * Icon helpers (base variants only)
 * ========================= */
const VARIANT_SUFFIX_RE = /(Outlined|Rounded|TwoTone|Sharp)$/
const EXCLUDE_EXPORTS = new Set(['SvgIcon', 'createSvgIcon', 'getSvgIconUtilityClass', 'default'])

function isIconExport(name: string) {
    return /^[A-Z]/.test(name) && !EXCLUDE_EXPORTS.has(name)
}

// Convert variant name to base name: "BoltOutlined" -> "Bolt"
function toBaseIconName(name: string) {
    return name.replace(VARIANT_SUFFIX_RE, '')
}

// Build a unique, sorted list of base icon names only
function getBaseIconNames(): string[] {
    const all = Object.keys(MuiIcons).filter(isIconExport)
    const baseSet = new Set<string>()
    for (const k of all) {
        const base = toBaseIconName(k)
        if ((MuiIcons as any)[base]) baseSet.add(base)
    }
    return Array.from(baseSet).sort()
}

// Resolve the icon component by base name with a safe fallback
function resolveIcon(name?: string) {
    const Fallback = (MuiIcons as any)['Category'] as React.ElementType
    if (!name) return Fallback
    const Comp = (MuiIcons as any)[toBaseIconName(name)]
    return (Comp ?? Fallback) as React.ElementType
}

/* =========================
 * Color normalization & validation
 * ========================= */

// Expand 3-digit hex (#abc) into 6-digit (#aabbcc). Map common names to hex.
// If invalid, return original (will fail validation).
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
const defaultFilter = createFilterOptions<string>()

export default function Categories() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading_add_update, setLoading] = useState(false)
    const [loading_fetch, setLoadingFetch] = useState(false)

    // Form state
    const [editingId, setEditingId] = useState<number | null>(null)
    const [name, setName] = useState('')
    const [color, setColor] = useState('#ffffff') // Always keep 6-digit hex here
    const [icon, setIcon] = useState<string>('Category')

    // Field errors
    const [nameError, setNameError] = useState<string | null>(null)
    const [colorError, setColorError] = useState<string | null>(null)
    const [iconError, setIconError] = useState<string | null>(null)

    // Snackbar
    const [snackOpen, setSnackOpen] = useState(false)
    const [snackMsg, setSnackMsg] = useState('')
    const [snackSeverity, setSnackSeverity] = useState<AlertColor>('success')

    const notify = (message: string, severity: AlertColor = 'success') => {
        setSnackMsg(message)
        setSnackSeverity(severity)
        setSnackOpen(true)
    }

    // Base-only icon options
    const ICON_OPTIONS = useMemo(() => getBaseIconNames(), [])

    // Fetch once on mount
    useEffect(() => {
        ;(async () => {
            setLoadingFetch(true)
            try {
                const res = await api.get('/get_categories')
                const list: Category[] = (res.data || []).map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    color: toHex6(c.color || '#ffffff'),
                    icon: c.icon ? toBaseIconName(c.icon) : 'Category',
                }))
                setCategories(list)
            } catch (err: any) {
                notify(err?.response?.data?.message || 'Failed to load categories', 'error')
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

    const resetForm = () => {
        setEditingId(null)
        setName('')
        setColor('#ffffff')
        setIcon('Category')
        setNameError(null)
        setColorError(null)
        setIconError(null)
    }

    const validateForm = () => {
        let ok = true

        if (!name.trim()) {
            setNameError('Name is required')
            ok = false
        } else {
            setNameError(null)
        }

        const normalized = toHex6(color)
        if (!normalized || !HEX6_RE.test(normalized)) {
            setColorError('Color is required (6-digit hex, e.g. #ffffff)')
            ok = false
        } else {
            setColorError(null)
            if (normalized !== color) setColor(normalized)
        }

        const baseIcon = toBaseIconName(icon)
        if (!baseIcon || !ICON_OPTIONS.includes(baseIcon)) {
            setIconError('Select an icon from the list')
            ok = false
        } else {
            setIconError(null)
            if (baseIcon !== icon) setIcon(baseIcon)
        }

        return ok
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateForm()) {
            notify('Please fill all fields correctly.', 'error')
            return
        }

        setLoading(true)
        try {
            if (editingId == null) {
                // CREATE → update local array after success (no refetch)
                const res = await api.post('/add_category', { name: name.trim(), color, icon })
                const data = res?.data || {}
                const created: Category = {
                    id: typeof data.id === 'number' ? data.id : Date.now(), // fallback id
                    name: data.name ?? name.trim(),
                    color: toHex6(data.color ?? color),
                    icon: toBaseIconName(data.icon ?? icon),
                }
                addCategoryLocal(created)
                notify('Category created successfully!', 'success')
            } else {
                // UPDATE → update local array after success (no refetch)
                await api.put(`/edit_category/${editingId}`, { name: name.trim(), color, icon })
                updateCategoryLocal({ id: editingId, name: name.trim(), color, icon })
                notify('Category updated successfully!', 'success')
            }
            resetForm()
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (err: any) {
            notify(err?.response?.data?.message || 'Request failed', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleEditRequest = (cat: Category) => {
        setEditingId(cat.id)
        setName(cat.name)
        setColor(toHex6(cat.color))
        setIcon(toBaseIconName(cat.icon || 'Category'))
        setNameError(null)
        setColorError(null)
        setIconError(null)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const SelectedIcon = resolveIcon(icon)

    return (
        <Container maxWidth="md">

            {/* Form Card */}
            <Card variant="outlined" sx={{ mb: 3, backgroundColor: 'rgb(50, 50, 50)' }}>
                <CardContent>
                    <form onSubmit={handleSubmit} noValidate>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                label="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                fullWidth
                                required
                                error={!!nameError}
                                helperText={nameError || ' '}
                                color={editingId ? 'warning' : 'success'}
                            />

                            {/* Color picker (keep value as 6-digit hex) */}
                            <TextField
                                label="Color"
                                type="color"
                                value={color}
                                onChange={(e) => setColor(toHex6(e.target.value))}
                                sx={{ width: 140 }}
                                inputProps={{ 'aria-label': 'Category color' }}
                                required
                                error={!!colorError}
                                helperText={colorError || ' '}
                                color={editingId ? 'warning' : 'success'}
                            />

                            {/* Icon Autocomplete (base-only) with icon + name; show only first 50 until search */}
                            <Autocomplete
                                options={ICON_OPTIONS}
                                value={icon}
                                onChange={(_, newValue) => setIcon(newValue || '')}
                                getOptionLabel={(opt) => opt}
                                isOptionEqualToValue={(opt, val) => opt === val}
                                disableClearable
                                filterOptions={(opts, state) => {
                                    // Performance: if there is no search input, only list the first 50
                                    if (!state.inputValue) return opts.slice(0, 50)
                                    return defaultFilter(opts, state)
                                }}
                                renderOption={(props, option) => {
                                    const OptIcon = resolveIcon(option)
                                    return (
                                        <li
                                            {...props}
                                            key={option}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                            }}
                                        >
                                            <OptIcon fontSize="small" />
                                            <span>{option}</span>
                                        </li>
                                    )
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Icon (base variant)"
                                        color={editingId ? 'warning' : 'success'}
                                        required
                                        error={!!iconError}
                                        helperText={iconError || ' '}
                                        InputProps={{
                                            ...params.InputProps,
                                            startAdornment: (
                                                <>
                                                    <InputAdornment position="start">
                                                        <SelectedIcon fontSize="small" />
                                                    </InputAdornment>
                                                    {params.InputProps.startAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                                sx={{ minWidth: 220, flex: 1 }}
                            />
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
                                loading={loading_add_update}
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
        </Container>
    )
}
