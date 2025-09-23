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
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import type { CategoryPickerProps } from './types'

export default function CategoryPicker({
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

    // Keep local state in sync whenever the Popper opens (or selection changes externally)
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

    // Toggle & APPLY IMMEDIATELY
    const toggle = (id: number) => {
        setWorking((prev) => {
            const already = prev.includes(id)
            let next: number[] = prev

            if (already) {
                next = prev.filter((x) => x !== id)
            } else if (prev.length < maxSelection) {
                next = [...prev, id]
            } else {
                // reached max; ignore
                return prev
            }

            // Apply immediately (only when it actually changes)
            if (next !== prev) onApply(next)
            return next
        })
    }

    const selectedCount = working.length
    const limitNote =
        maxSelection !== Infinity
            ? `${selectedCount}/${maxSelection} selected`
            : `${selectedCount} selected`

    return (
        <Popper open={open} anchorEl={anchorEl} placement="right-start" style={{ zIndex: 1300 }}>
            <ClickAwayListener onClickAway={onClose}>
                <Paper
                    elevation={6}
                    sx={(t) => ({
                        width: 320,
                        maxHeight: 420,
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: t.palette.customColors?.grey_6 ?? t.palette.background.paper,
                        border: `1px solid ${t.palette.divider}`,
                    })}
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
                                                sx={(t) => ({
                                                    width: 16,
                                                    height: 16,
                                                    borderRadius: '50%',
                                                    ml: 1,
                                                    border: `1px solid ${t.palette.divider}`,
                                                    bgcolor: cat.color,
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
