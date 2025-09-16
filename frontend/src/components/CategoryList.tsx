import { useState } from 'react'
import {
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    Box,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Chip,
    Divider,
    Collapse,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import * as MuiIcons from '@mui/icons-material'
import { useTheme } from '@mui/material/styles'
import { TransitionGroup } from 'react-transition-group'
import api from '../services/api'
import type { Category } from '../pages/Categories'

// Keep base icon variant only
const VARIANT_SUFFIX_RE = /(Outlined|Rounded|TwoTone|Sharp)$/
function toBaseIconName(name: string) {
    return name.replace(VARIANT_SUFFIX_RE, '')
}
function resolveIcon(name?: string) {
    const Fallback = (MuiIcons as any)['Category'] as React.ElementType
    if (!name) return Fallback
    const Comp = (MuiIcons as any)[toBaseIconName(name)]
    return (Comp ?? Fallback) as React.ElementType
}

// Compute readable chip text color (black/white) based on background luminance
function getReadableTextColor(hex: string): string {
    const v = (hex || '').trim().toLowerCase()
    const m = /^#([0-9a-f]{6})$/.exec(v)
    if (!m) return '#fff'
    const r = parseInt(m[1].slice(0, 2), 16)
    const g = parseInt(m[1].slice(2, 4), 16)
    const b = parseInt(m[1].slice(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.6 ? '#000' : '#fff'
}

type AlertColor = 'success' | 'error' | 'warning' | 'info'

interface Props {
    categories: Category[]
    loading_fetch: boolean
    onEdit: (cat: Category) => void
    onNotify: (message: string, severity?: AlertColor) => void
    onRemove: (id: number) => void // ← update local array in parent after delete
}

export default function CategoryList({ categories, loading_fetch, onEdit, onNotify, onRemove }: Props) {
    const theme = useTheme()
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [target, setTarget] = useState<Category | null>(null)

    const askDelete = (cat: Category) => {
        setTarget(cat)
        setConfirmOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!target) return
        try {
            await api.delete(`/delete_category/${target.id}`)
            onNotify('Category deleted.', 'success')
            onRemove(target.id) // ← update local state (no refetch)
        } catch (err: any) {
            onNotify(err?.response?.data?.message || 'Failed to delete category', 'error')
        } finally {
            setConfirmOpen(false)
            setTarget(null)
        }
    }

    return (
        <>
            <Card
                variant="outlined"
                sx={{
                    overflow: 'visible', // let item shadows extend outside
                    p: 2,
                    backgroundColor: 'rgb(50, 50, 50)',
                }}
            >
                <Box sx={{ p: 1.5 }}>
                    <Chip
                        size="small"
                        label={`Showing ${categories.length} categories`}
                        color="default"
                        variant="outlined"
                    />
                </Box>
                <Divider />

                {/* Use CardContent to control internal padding precisely */}
                <CardContent sx={{ p: 0 }}>
                    <List sx={{ py: 1, overflow: 'visible' }}>
                        {/* TransitionGroup animates additions/removals */}
                        <TransitionGroup component={null}>
                            {categories.map((cat) => {
                                const Icon = resolveIcon(cat.icon)
                                const chipTextColor = getReadableTextColor(cat.color)
                                return (
                                    <Collapse key={cat.id} timeout={300} unmountOnExit>
                                        {/* Custom flex layout to avoid secondaryAction overlay issues */}
                                        <ListItem
                                            disableGutters
                                            sx={{
                                                my: 1,
                                                px: 2, // internal horizontal padding
                                                py: 1, // internal vertical padding
                                                borderRadius: 1.5,
                                                bgcolor: theme.palette.customColors.grey_6,
                                                border: `1px solid ${theme.palette.divider}`,
                                                boxShadow: 2,
                                                transition: (t) =>
                                                    t.transitions.create(
                                                        ['box-shadow', 'transform'],
                                                        {
                                                            duration:
                                                                t.transitions.duration.shorter,
                                                        }
                                                    ),
                                                '&:hover': {
                                                    boxShadow: 4,
                                                    transform: 'translateY(-1px)',
                                                },
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    width: '100%',
                                                    minWidth: 0, // allow text to ellipsize
                                                }}
                                            >
                                                {/* Leading icon (tinted by category color) */}
                                                <ListItemIcon
                                                    sx={{ minWidth: 36, color: cat.color }}
                                                >
                                                    <Icon />
                                                </ListItemIcon>

                                                {/* Text area */}
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <ListItemText
                                                        primary={cat.name}
                                                        secondary={
                                                            cat.icon
                                                                ? `Icon: ${toBaseIconName(cat.icon)}`
                                                                : undefined
                                                        }
                                                        primaryTypographyProps={{
                                                            fontWeight: 600,
                                                            noWrap: true,
                                                        }}
                                                        secondaryTypographyProps={{
                                                            noWrap: true,
                                                            color: 'text.secondary',
                                                        }}
                                                    />
                                                </Box>

                                                {/* Color chip (never overlaps actions) */}
                                                <Chip
                                                    size="small"
                                                    label={cat.color}
                                                    sx={{
                                                        bgcolor: cat.color,
                                                        color: chipTextColor,
                                                        fontWeight: 600,
                                                        mr: 0.5,
                                                    }}
                                                />

                                                {/* Trailing actions (aligned to the right) */}
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <IconButton
                                                        edge="end"
                                                        onClick={() => onEdit(cat)}
                                                        aria-label="edit"
                                                        sx={{
                                                            color: theme.palette.warning.main,
                                                            mr: 0.5,
                                                        }}
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        edge="end"
                                                        onClick={() => askDelete(cat)}
                                                        aria-label="delete"
                                                        sx={{ color: theme.palette.error.main }}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Box>
                                            </Box>
                                        </ListItem>
                                    </Collapse>
                                )
                            })}
                        </TransitionGroup>
                    </List>
                </CardContent>
            </Card>

            {/* Delete confirmation dialog */}
            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                aria-labelledby="delete-category-title"               
                
                
                slotProps={{
                    paper: {
                    sx: {
                        bgcolor: theme.palette.customColors.grey_6,  // or (t) => t.palette.customColors.grey_5
                        color: 'common.white',
                        backgroundImage: 'none',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                    },
                    },
                }}

            >
                <DialogTitle id="delete-category-title">Delete category</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {target
                            ? `Are you sure you want to delete the category "${target.name}"? This action cannot be undone.`
                            : 'Are you sure?'}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)} endIcon={<CloseIcon/>} >Cancel</Button>
                    <Button color="error" variant="contained" endIcon={<DeleteIcon/>} onClick={handleConfirmDelete}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
