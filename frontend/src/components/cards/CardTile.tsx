import * as React from 'react'
import {
    Box,
    Card,
    Chip,
    Dialog,
    DialogContent,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import CategoryPicker from './CategoryPicker'
import type { CardTileProps } from './types'

const TITLE_SHADOW = '0px 1px 10px rgba(0, 0, 0, 1)'

export default function CardTile({
    card,
    allCategories,
    onRequestEdit,
    onRequestDelete,
    onApplyCategories,
}: CardTileProps) {
    const theme = useTheme()
    const [pickerAnchor, setPickerAnchor] = React.useState<HTMLElement | null>(null)
    const [imgOpen, setImgOpen] = React.useState(false)

    const openPicker = (e: React.MouseEvent<HTMLElement>) => setPickerAnchor(e.currentTarget)
    const closePicker = () => setPickerAnchor(null)
    const pickerOpen = Boolean(pickerAnchor)
    const maxCats = 4
    const assignedIds = card.categories.map((c) => c.id)

    return (
        <Card
            className="parent"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '410px',
                height: '410px',
                maxHeight: '410px',
                boxShadow:
                    ' rgba(0, 0, 0, 0.46) 0px 2px 2px, rgba(0, 0, 0, 0.3) 0px 2px 13px -3px, rgba(0, 0, 0, 0.2) 0px -3px 0px inset;',
                transition: (t) =>
                    t.transitions.create(['box-shadow', 'transform'], {
                        duration: t.transitions.duration.shorter,
                    }),
                willChange: 'transform',
                '&:hover': {
                    boxShadow:
                        'rgba(68, 68, 68, 0.17) 0px -23px 25px 0px inset, rgba(83, 83, 83, 0.15) 0px -36px 30px 0px inset, rgba(58, 58, 58, 0.1) 0px -79px 40px 0px inset, rgba(0, 0, 0, 0.06) 0px 2px 1px, rgba(0, 0, 0, 0.09) 0px 4px 2px, rgba(0, 0, 0, 0.09) 0px 8px 4px, rgba(0, 0, 0, 0.09) 0px 16px 8px, rgba(0, 0, 0, 0.09) 0px 32px 16px;',
                    transform: 'scale(1.02)',
                },
                backgroundColor: theme.palette.customColors.grey_7,
            }}
        >
            {/* MEDIA */}
            <Box sx={{ position: 'relative', height: '66%', overflow: 'hidden' }}>
                {card.image_url ? (
                    <Box
                        component="img"
                        src={card.image_url ?? undefined}
                        alt={card.name ?? ''}
                        onClick={() => setImgOpen(true)} // open preview dialog
                        sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            transition: 'transform 200ms ease',
                            cursor: 'zoom-in',
                            '.MuiCard-root:hover &': { transform: 'scale(1.06)' },
                        }}
                    />
                ) : (
                    <Box
                        onClick={() => onRequestEdit(card)}
                        sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            objectFit: 'cover',
                            transition: 'transform 200ms ease',
                            cursor: 'pointer',
                            '.MuiCard-root:hover &': { transform: 'scale(1.06)' },
                        }}
                    >
                        <AddPhotoAlternateIcon
                            sx={{
                                fontSize: '50px',
                                opacity: 0.6,
                                transition: 'opacity 200ms ease',
                                '.MuiCard-root:hover &': { opacity: 1 },
                            }}
                        />
                    </Box>
                )}

                {/* Hover overlay buttons */}
                {card.image_url && (
                    <Tooltip
                        title="Zoom Photo"
                        placement="top"
                        slotProps={{
                            tooltip: {
                                sx: (t) => ({
                                    bgcolor: t.palette.info.main,
                                    color: t.palette.getContrastText(t.palette.info.main),
                                    boxShadow: t.shadows[3],
                                    fontWeight: 700,
                                }),
                            },
                            arrow: { sx: (t) => ({ color: t.palette.warning.main }) },
                        }}
                    >
                        <IconButton
                            aria-label="Expand image"
                            onClick={() => setImgOpen(true)}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                bgcolor: 'rgba(0,0,0,0.5)',
                                color: 'rgba(255, 255, 255, 1)',
                                opacity: 0,
                                transition: 'opacity 150ms ease, background-color 150ms ease',
                                '.MuiCard-root:hover &': { opacity: 1 },
                                '&:hover': {
                                    bgcolor: theme.palette.customColors.blue_3,
                                    color: 'rgba(255, 255, 255, 1)',
                                },
                            }}
                        >
                            <ZoomInIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}

                <Tooltip
                    title="Edit Card"
                    placement="right"
                    slotProps={{
                        tooltip: {
                            sx: (t) => ({
                                bgcolor: t.palette.warning.main,
                                color: t.palette.getContrastText(t.palette.warning.main),
                                boxShadow: t.shadows[3],
                                fontWeight: 700,
                            }),
                        },
                        arrow: { sx: (t) => ({ color: t.palette.warning.main }) },
                    }}
                >
                    <IconButton
                        aria-label="edit"
                        color="warning"
                        size="small"
                        onClick={() => onRequestEdit(card)}
                        sx={{
                            position: 'absolute',
                            left: 48,
                            top: 8,
                            bgcolor: 'rgba(0, 0, 0, 0.5)',
                            color: theme.palette.customColors.orange_3,
                            opacity: 0,
                            border: 'solid 1px ' + theme.palette.customColors.orange_3,
                            transition: 'opacity 150ms ease, background-color 150ms ease',
                            '.MuiCard-root:hover &': { opacity: 1 },
                            '&:hover': {
                                bgcolor: theme.palette.customColors.orange_3,
                                color: 'rgba(255, 255, 255, 1)',
                            },
                        }}
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>

                <Tooltip
                    title="Delete Card"
                    placement="right"
                    slotProps={{
                        tooltip: {
                            sx: (t) => ({
                                bgcolor: t.palette.error.main,
                                color: t.palette.getContrastText(t.palette.error.main),
                                boxShadow: t.shadows[3],
                                fontWeight: 700,
                            }),
                        },
                        arrow: { sx: (t) => ({ color: t.palette.error.main }) },
                    }}
                >
                    <IconButton
                        aria-label="delete"
                        color="error"
                        size="small"
                        onClick={() => onRequestDelete(card)}
                        sx={{
                            position: 'absolute',
                            left: 8,
                            top: 8,
                            bgcolor: 'rgba(0, 0, 0, 0.5)',
                            color: theme.palette.customColors.red_3,
                            opacity: 0,
                            border: 'solid 1px ' + theme.palette.customColors.red_3,
                            transition: 'opacity 150ms ease, background-color 150ms ease',
                            '.MuiCard-root:hover &': { opacity: 1 },
                            '&:hover': {
                                bgcolor: theme.palette.customColors.red_3,
                                color: 'rgba(255, 255, 255, 1)',
                            },
                        }}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* CONTENT */}
            <Box
                onClick={() => onRequestEdit(card)}
                sx={{ mx: 1.5, my: 1, alignItems: 'stretch', cursor: 'pointer', height: '18%' }}
            >
                <Typography
                    gutterBottom
                    variant="subtitle1"
                    fontWeight={700}
                    noWrap
                    title={card.name}
                    sx={{ textShadow: TITLE_SHADOW, my: 0 }}
                >
                    {card.name}
                </Typography>

                {/* 2-line clamp */}
                <Typography
                    variant="body2"
                    color="text.secondary"
                    title={card.description}
                    sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {card.description}
                </Typography>
            </Box>

            {/* CATEGORIES */}
            <Box sx={{ mx: 1.5, mb: 1, height: '16%' }}>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                    {card.categories.length > 0 ? (
                        card.categories.slice(0, maxCats).map((cat) => (
                            <Chip
                                key={cat.id}
                                size="small"
                                label={
                                    card.categories.length === 1
                                        ? cat.name
                                        : card.categories.length < 3
                                          ? cat.name.length > 30
                                              ? cat.name.substring(0, 25) + '...'
                                              : cat.name
                                          : cat.name.length > 15
                                            ? cat.name.substring(0, 12) + '...'
                                            : cat.name
                                }
                                title={cat.name}
                                sx={(t) => {
                                    const bg = cat.color ?? (t.palette.action.selected as string)
                                    const contrast =
                                        t.palette.getContrastText(bg) === '#fff' ? '#fff' : '#000'
                                    return {
                                        bgcolor: bg,
                                        color: contrast,
                                        textShadow: contrast === '#000' ? 'none' : TITLE_SHADOW,
                                        '& .MuiChip-deleteIcon': {
                                            color: 'inherit',
                                            '&:hover': { color: 'inherit' },
                                        },
                                    }
                                }}
                            />
                        ))
                    ) : (
                        <Chip
                            size="small"
                            label="No category"
                            variant="outlined"
                            sx={{ cursor: 'pointer', textShadow: TITLE_SHADOW }}
                        />
                    )}

                    {/* Always show "Edit" (pencil) */}
                    <Tooltip title="Edit categories" placement="top">
                        <IconButton
                            onClick={openPicker}
                            sx={{
                                backgroundColor: 'rgba(0, 0, 0, 0.37)',
                                color: theme.palette.customColors.white_blue,
                                border: 'solid 1px',
                                height: 24,
                                width: 24,
                            }}
                        >
                            <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>

                    <CategoryPicker
                        open={pickerOpen}
                        anchorEl={pickerAnchor}
                        onClose={closePicker}
                        allCategories={allCategories}
                        selectedIds={assignedIds}
                        onApply={(ids) => onApplyCategories(card.id, ids)}
                        maxSelection={maxCats}
                        title="Edit categories"
                    />
                </Stack>
            </Box>

            {/* Full-size image preview dialog */}
            <Dialog
                open={imgOpen}
                onClose={() => setImgOpen(false)}
                maxWidth="lg"
                slotProps={{ paper: { sx: { bgcolor: 'transparent', boxShadow: 'none' } } }}
            >
                <DialogContent sx={{ p: 0, bgcolor: 'rgba(0,0,0,0.85)' }}>
                    {card.image_url && (
                        <Box
                            component="img"
                            src={card.image_url}
                            alt={card.name}
                            sx={{
                                display: 'block',
                                maxWidth: '90vw',
                                maxHeight: '85vh',
                                objectFit: 'contain',
                                m: 'auto',
                            }}
                            onClick={() => setImgOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    )
}
