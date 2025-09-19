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
    Button,
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

                    {/* Fixed actions */}
                    <Box
                        sx={(t) => ({
                            p: 1,
                            pt: 1.25,
                            borderTop: `1px solid ${t.palette.divider}`,
                            bgcolor: t.palette.customColors?.grey_6 ?? t.palette.background.paper,
                        })}
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
