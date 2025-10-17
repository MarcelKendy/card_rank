import { useMemo, useState } from 'react'
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
    Skeleton,
    InputAdornment,
    TextField,
    Tooltip,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import { useTheme } from '@mui/material/styles'
import { TransitionGroup } from 'react-transition-group'
import api from '../../services/api'
import type { Category } from './types'
import type { AlertColor } from '@mui/material/Alert'

/* ----------------------------- Color contrast helper ----------------------------- */
function getReadableTextColor(hex: string): string {
    const v = (hex ?? '').trim().toLowerCase()
    const m = /^#([0-9a-f]{6})$/.exec(v)
    if (!m) return '#fff'
    const r = parseInt(m[1].slice(0, 2), 16)
    const g = parseInt(m[1].slice(2, 4), 16)
    const b = parseInt(m[1].slice(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.6 ? '#000' : '#fff'
}

/* ------------------------------------ Types ------------------------------------ */
interface Props {
    categories: Category[]
    loading_fetch: boolean
    onEdit: (cat: Category) => void
    onNotify: (message: string, severity?: AlertColor) => void
    onRemove: (id: number) => void // ← update local array in parent after delete
}

/* ------------------------------ Skeleton list item ------------------------------ */
function CategorySkeletonItem() {
    return (
        <ListItem
            disableGutters
            sx={(theme) => ({
                my: 1,
                px: 2,
                py: 1,
                borderRadius: 1.5,
                bgcolor: theme.palette.customColors?.grey_6 ?? theme.palette.action.hover,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: 2,
            })}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    width: '100%',
                    minWidth: 0,
                }}
            >
                {/* Leading placeholder */}
                <ListItemIcon sx={{ minWidth: 36 }}>
                    <Skeleton variant="circular" width={24} height={24} animation="wave" />
                </ListItemIcon>

                {/* Text area placeholders */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Skeleton variant="text" width="40%" height={24} animation="wave" />
                    <Skeleton
                        variant="text"
                        width="28%"
                        height={18}
                        animation="wave"
                        sx={{ opacity: 0.7 }}
                    />
                </Box>

                {/* Color chip placeholder */}
                <Box sx={{ mr: 0.5 }}>
                    <Skeleton
                        variant="rounded"
                        width={72}
                        height={24}
                        animation="wave"
                        sx={{ borderRadius: 12 }}
                    />
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <IconButton edge="end" disabled sx={{ mr: 0.5 }}>
                        <Skeleton variant="circular" width={36} height={36} animation="wave" />
                    </IconButton>
                    <IconButton edge="end" disabled>
                        <Skeleton variant="circular" width={36} height={36} animation="wave" />
                    </IconButton>
                </Box>
            </Box>
        </ListItem>
    )
}
const SKELETON_ROWS = 6

/* ---------------------------------- Component ---------------------------------- */
export default function CategoryList({
    categories,
    loading_fetch,
    onEdit,
    onNotify,
    onRemove,
}: Props) {
    const theme = useTheme()
    // Search (by name only)
    const [search, setSearch] = useState('')
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return categories
        return categories.filter((c) => c.name?.toLowerCase().includes(q))
    }, [categories, search])

    // Delete dialog
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
            onNotify(err?.response?.data?.message ?? 'Failed to delete category', 'error')
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
                    overflow: 'visible',
                    px: 2,
                    bgcolor: theme.palette.customColors?.grey_6,
                }}
            >
                {/* Top row: Search + stats chip */}
                <Box sx={{ p: 1.5, position: 'relative' }}>
                    <TextField
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search"
                        size="small"
                        variant="outlined"
                        autoComplete="off"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: 'action.active' }} />
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
                                            <ClearIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                color: 'common.white',
                                backgroundColor: 'transparent',
                                '& fieldset': { borderColor: 'divider' },
                                '&:hover fieldset': { borderColor: 'text.secondary' },
                                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                                width: { xs: 140, sm: 360 },
                            },
                        }}
                    />
                    <Chip
                        size="small"
                        label={
                            loading_fetch
                                ? 'Loading data...'
                                : `Showing ${filtered.length} / ${categories.length} categories`
                        }
                        color="default"
                        variant="outlined"
                        sx={{
                            position: 'absolute',
                            right: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            maxWidth: { xs: 140, sm: 260 },
                            '& .MuiChip-label': {
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                            },
                        }}
                    />
                </Box>

                <Divider />

                {/* List */}
                <CardContent sx={{ p: 0 }}>
                    <List
                        component="div"
                        disablePadding
                        sx={{
                            py: 1,
                            overflow: 'visible',
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                            gap: 2,
                            '& > *': { minWidth: 0 },
                        }}
                    >
                        <TransitionGroup component={null}>
                            {loading_fetch
                                ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                                      <Collapse key={`skeleton-${i}`} timeout={300} unmountOnExit>
                                          <CategorySkeletonItem />
                                      </Collapse>
                                  ))
                                : filtered.map((cat) => {
                                      const chipTextColor = getReadableTextColor(cat.color)

                                      return (
                                          <Collapse key={cat.id} timeout={300} unmountOnExit>
                                              <ListItem
                                                  disableGutters
                                                  sx={{
                                                      px: 2,
                                                      py: 1,
                                                      borderRadius: 1.5,
                                                      bgcolor: 'rgba(104, 105, 105, 0.25)',
                                                      border: `1px solid ${theme.palette.divider}`,
                                                      boxShadow: 4,
                                                      cursor: 'pointer',
                                                      transition: (t) =>
                                                          t.transitions.create(
                                                              ['box-shadow', 'transform'],
                                                              {
                                                                  duration:
                                                                      t.transitions.duration
                                                                          .shorter,
                                                              }
                                                          ),
                                                      '&:hover': {
                                                          boxShadow: 4,
                                                          transform: 'translateY(-1px)',
                                                      },
                                                  }}
                                                  onClick={() => onEdit(cat)}
                                              >
                                                  <Box
                                                      sx={{
                                                          display: 'flex',
                                                          alignItems: 'center',
                                                          gap: 1,
                                                          width: '100%',
                                                          minWidth: 0,
                                                      }}
                                                  >
                                                      {/* Leading media: image with 1px colored border OR fallback icon */}
                                                      <ListItemIcon sx={{ minWidth: 48 }}>
                                                          {cat.image_url ? (
                                                              <Box
                                                                  component="img"
                                                                  src={cat.image_url}
                                                                  alt=""
                                                                  sx={{
                                                                      width: 48,
                                                                      height: 48,
                                                                      borderRadius: '3px',
                                                                      objectFit: 'cover',
                                                                      border: `1px solid ${cat.color}`,
                                                                      display: 'block',
                                                                  }}
                                                              />
                                                          ) : (
                                                              <AddPhotoAlternateIcon
                                                                  sx={{
                                                                      color: cat.color,
                                                                      width: 36,
                                                                      height: 36,
                                                                  }}
                                                                  fontSize="small"
                                                              />
                                                          )}
                                                      </ListItemIcon>

                                                      {/* Text area */}
                                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                                          <ListItemText
                                                              primary={cat.name}
                                                              title={cat.name}
                                                              secondary={
                                                                  cat.image_url
                                                                      ? undefined
                                                                      : 'No image'
                                                              }
                                                              slotProps={{
                                                                  primary: {
                                                                      fontWeight: 600,
                                                                      noWrap: true,
                                                                  },
                                                                  secondary: {
                                                                      noWrap: true,
                                                                      color: 'text.secondary',
                                                                  },
                                                              }}
                                                          />
                                                      </Box>

                                                      {/* Color chip */}
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

                                                      {/* Actions */}
                                                      <Box
                                                          sx={{
                                                              display: 'flex',
                                                              alignItems: 'center',
                                                              flexShrink: 0,
                                                          }}
                                                      >
                                                          <Tooltip
                                                              title="Edit"
                                                              placement="top"
                                                              slotProps={{
                                                                  tooltip: {
                                                                      sx: (t) => ({
                                                                          bgcolor:
                                                                              t.palette.warning
                                                                                  .main,
                                                                          color: t.palette.getContrastText(
                                                                              t.palette.warning.main
                                                                          ),
                                                                          boxShadow: t.shadows[3],
                                                                          fontWeight: 700,
                                                                      }),
                                                                  },
                                                                  arrow: {
                                                                      sx: (t) => ({
                                                                          color: t.palette.warning
                                                                              .main,
                                                                      }),
                                                                  },
                                                              }}
                                                          >
                                                              <IconButton
                                                                  edge="end"
                                                                  onClick={(e) => {
                                                                      e.stopPropagation()
                                                                      onEdit(cat)
                                                                  }}
                                                                  aria-label="edit"
                                                                  sx={{
                                                                      color: theme.palette.warning
                                                                          .main,
                                                                      mr: 0.5,
                                                                  }}
                                                              >
                                                                  <EditIcon />
                                                              </IconButton>
                                                          </Tooltip>

                                                          <Tooltip
                                                              title="Delete"
                                                              placement="top"
                                                              slotProps={{
                                                                  tooltip: {
                                                                      sx: (t) => ({
                                                                          bgcolor:
                                                                              t.palette.error.main,
                                                                          color: t.palette.getContrastText(
                                                                              t.palette.error.main
                                                                          ),
                                                                          boxShadow: t.shadows[3],
                                                                          fontWeight: 700,
                                                                      }),
                                                                  },
                                                                  arrow: {
                                                                      sx: (t) => ({
                                                                          color: t.palette.error
                                                                              .main,
                                                                      }),
                                                                  },
                                                              }}
                                                          >
                                                              <IconButton
                                                                  edge="end"
                                                                  onClick={(e) => {
                                                                      e.stopPropagation()
                                                                      askDelete(cat)
                                                                  }}
                                                                  aria-label="delete"
                                                                  sx={{
                                                                      color: theme.palette.error
                                                                          .main,
                                                                  }}
                                                              >
                                                                  <DeleteIcon />
                                                              </IconButton>
                                                          </Tooltip>
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

            {/* Delete confirmation */}
            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                aria-labelledby="delete-category-title"
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
                <DialogTitle id="delete-category-title">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DeleteIcon sx={{ color: theme.palette.customColors.red_3 }} />
                        Delete category
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {target
                            ? `Are you sure you want to delete the category "${target.name}"? This action cannot be undone.`
                            : 'Are you sure?'}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)} endIcon={<CloseIcon />}>
                        Cancel
                    </Button>
                    <Button
                        sx={{ backgroundColor: theme.palette.customColors.red_3 }}
                        variant="contained"
                        endIcon={<DeleteIcon />}
                        onClick={handleConfirmDelete}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
