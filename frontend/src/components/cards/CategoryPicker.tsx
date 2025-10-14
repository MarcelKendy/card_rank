import * as React from 'react'
import {
    Box,
    Paper,
    Popper,
    ClickAwayListener,
    Stack,
    Typography,
    TextField,
    InputAdornment,
    List,
    ListItemButton,
    Checkbox,
    ListItemText,
    IconButton,
    LinearProgress,
    CircularProgress,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import type { CategoryPickerProps } from './types'

export default function CategoryPicker({
    open,
    anchorEl,
    onClose,
    allCategories,
    selectedIds,
    onApply, // ideally: (ids: number[]) => Promise<void>
    maxSelection = Infinity,
    title = 'Select categories',
}: CategoryPickerProps) {
    const [query, setQuery] = React.useState('')
    const [working, setWorking] = React.useState<number[]>(selectedIds)
    const [saving, setSaving] = React.useState(false) // ⬅️ NEW: global loading for this picker

    // Keep local state in sync whenever the Popper opens (or selection changes externally)
    React.useEffect(() => {
        if (open) {
            setQuery('')
            setWorking(selectedIds)
        }
    }, [open])

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase()
        return !q ? allCategories : allCategories.filter((c) => c.name.toLowerCase().includes(q))
    }, [allCategories, query])

    const canToggle = (id: number) => (working.includes(id) ? true : working.length < maxSelection)

    // Toggle & APPLY IMMEDIATELY with loading + rollback on failure
    const toggle = async (id: number) => {
        if (saving) return

        const already = working.includes(id)
        let next = working

        if (already) {
            next = working.filter((x) => x !== id)
        } else if (working.length < maxSelection) {
            next = [...working, id]
        } else {
            return
        }
        setSaving(true)
        const prev = working
        setWorking(next)
        
        try {
            // 👇 This line fixes the 'void' issue and awaits async handlers
            await Promise.resolve(onApply(next))
        } catch (err) {
            console.error('Failed to apply categories', err)
            setWorking(prev) // rollback on failure
        } finally {
            setSaving(false)
        }
    }

    const selectedCount = working.length
    const limitNote =
        maxSelection !== Infinity
            ? `${selectedCount}/${maxSelection} selected`
            : `${selectedCount} selected`

    // While saving, disable interactions entirely (but keep search enabled if you want)
    const allDisabled = saving

    return (
        <Popper open={open} anchorEl={anchorEl} placement="right-start" style={{ zIndex: 1300 }}>
            <ClickAwayListener
                onClickAway={React.useCallback(() => {
                    if (saving) return // prevent closing during save
                    onClose()
                }, [saving, onClose])}
            >
                <Paper
                    elevation={6}
                    sx={(t) => ({
                        width: 320,
                        maxHeight: 420,
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        bgcolor: t.palette.customColors?.grey_6 ?? t.palette.background.paper,
                        border: `1px solid ${t.palette.divider}`,
                    })}
                >
                    {/* Loading bar at top */}
                    {saving && (
                        <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
                    )}

                    {/* Header */}
                    <Box
                        sx={{
                            p: 1.5,
                            pt: saving ? 2.5 : 1.5 /* make room for progress bar if present */,
                        }}
                    >
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            gap={1}
                        >
                            <IconButton color="error" onClick={onClose} disabled={saving}>
                                {/* move onClick to IconButton so the button properly disables */}
                                <CloseIcon />
                            </IconButton>

                            <Stack direction="row" alignItems="center" gap={1}>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    {title}
                                </Typography>
                                {saving && <CircularProgress size={16} thickness={6} />}
                            </Stack>

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
                            disabled={saving /* optional: keep search editable if you prefer */}
                            sx={{ mt: 1 }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                    </Box>

                    {/* Scrollable list area */}
                    <Box sx={{ flex: 1, overflow: 'auto', px: 1.5, pb: 1.5 }}>
                        <List dense disablePadding>
                            {filtered.map((cat) => {
                                const checked = working.includes(cat.id)
                                const exceeded = !checked && !canToggle(cat.id)
                                const disabled = allDisabled || exceeded // ⬅️ disable while saving

                                return (
                                    <ListItemButton
                                        key={cat.id}
                                        onClick={() => (disabled ? null : toggle(cat.id))}
                                        disabled={disabled}
                                        sx={{
                                            borderRadius: 1,
                                            mb: 0.5,
                                            opacity: disabled && !checked ? 0.7 : 1,
                                        }}
                                    >
                                        <Checkbox
                                            edge="start"
                                            tabIndex={-1}
                                            disableRipple
                                            checked={checked}
                                            disabled={disabled} // ⬅️ disable the checkbox too
                                            sx={{ mr: 1 }}
                                        />
                                        <ListItemText
                                            primary={cat.name}
                                            slotProps={{
                                                primary: { noWrap: true },
                                            }}
                                            secondary={
                                                cat.color
                                                    ? `#${cat.color.replace('#', '')}`
                                                    : undefined
                                            }
                                        />
                                        {cat.color && (
                                            <Box
                                                sx={(t) => ({
                                                    width: 16,
                                                    height: 16,
                                                    borderRadius: '50%',
                                                    ml: 1,
                                                    border: `1px solid ${t.palette.divider}`,
                                                    bgcolor: cat.color,
                                                    opacity: disabled ? 0.8 : 1,
                                                })}
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

                    {/* No footer: changes apply immediately; click-away closes the popper */}
                </Paper>
            </ClickAwayListener>
        </Popper>
    )
}
