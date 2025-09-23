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
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'

import CategoryPicker from './CategoryPicker'
import type { CardTileProps } from './types'

const TITLE_SHADOW = '0px 1px 10px rgba(0, 0, 0, 1)'

// === Shared image config (keep same as in CardDialog) ===
const IMAGES_DELIM = '||' // <— fixed delimiter
const MAX_IMAGES = 3

// === Mini-carousel animation + dialog styling ===
const TILE_SLIDE_MS = 350
const DLG_SLIDE_MS = 400
const DIALOG_BACKDROP_OPACITY = 0.55 // tweak the translucency of the backdrop

// === Dialog zoom config ===
const DLG_ZOOM_MIN = 1
const DLG_ZOOM_MAX = 4
const DLG_ZOOM_STEP = 0.2

function splitImages(value?: string | null): string[] {
    if (!value) return []
    return String(value)
        .split(IMAGES_DELIM)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_IMAGES)
}

function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n))
}

export default function CardTile({
    card,
    allCategories,
    onRequestEdit,
    onRequestDelete,
    onApplyCategories,
}: CardTileProps) {
    const theme = useTheme()

    /* ---------------------- Category picker state ---------------------- */
    const [pickerAnchor, setPickerAnchor] = React.useState<HTMLElement | null>(null)
    const openPicker = (e: React.MouseEvent<HTMLElement>) => setPickerAnchor(e.currentTarget)
    const closePicker = () => setPickerAnchor(null)
    const pickerOpen = Boolean(pickerAnchor)
    const maxCats = 4
    const assignedIds = card.categories.map((c) => c.id)

    /* ------------------------ Images & carousel ------------------------ */
    const images = React.useMemo(() => splitImages(card.image_url), [card.image_url])
    const hasImages = images.length > 0

    const [idx, setIdx] = React.useState(0)
    const clampIdx = React.useCallback(
        (i: number) => (images.length ? (i + images.length) % images.length : 0),
        [images.length]
    )
    const next = React.useCallback(() => setIdx((i) => clampIdx(i + 1)), [clampIdx])
    const prev = React.useCallback(() => setIdx((i) => clampIdx(i - 1)), [clampIdx])

    // Keep index in range when images array changes
    React.useEffect(() => {
        if (idx >= images.length) setIdx(0)
    }, [images.length, idx])

    /* ---------------------- Full-screen dialog ------------------------ */
    const [imgOpen, setImgOpen] = React.useState(false)

    // ---- Zoom HUD (Chip) state ----
    const [zoomHudVisible, setZoomHudVisible] = React.useState(false)
    const hudTimerRef = React.useRef<number | null>(null)

    const showZoomHud = React.useCallback(() => {
        setZoomHudVisible(true)
        if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current)
        hudTimerRef.current = window.setTimeout(() => {
            setZoomHudVisible(false)
        }, 2000) // Chip stays visible for 1s after the last wheel tick
    }, [])

    // Clean up timer on unmount
    React.useEffect(() => {
        return () => {
            if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current)
        }
    }, [])

    // Zoom state (dialog only): amount + origin (%)
    const [zoom, setZoom] = React.useState<number>(1)
    const [origin, setOrigin] = React.useState<{ x: number; y: number }>({ x: 50, y: 50 })
    const dialogViewportRef = React.useRef<HTMLDivElement>(null)

    // Reset zoom when opening dialog or changing image
    React.useEffect(() => {
        if (imgOpen) {
            setZoom(1)
            setOrigin({ x: 50, y: 50 })
        }
    }, [imgOpen, idx])

    // Mouse wheel to control zoom (no hover zoom in dialog)
    const onWheelZoom = (e: React.WheelEvent) => {
        if (!imgOpen || !hasImages) return
        e.preventDefault()

        const rect = dialogViewportRef.current?.getBoundingClientRect()
        if (rect) {
            const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100)
            const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100)
            setOrigin({ x, y })
        }

        const sign = e.deltaY < 0 ? 1 : -1 // wheel up -> zoom in
        setZoom((z) => clamp(z + sign * DLG_ZOOM_STEP, DLG_ZOOM_MIN, DLG_ZOOM_MAX))

        // 👇 show the chip briefly whenever zoom changes
        showZoomHud()
    }

    // Swipe/drag (tile + dialog)
    const dragStartX = React.useRef<number | null>(null)
    const onPointerDown = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
        const x =
            'touches' in e && e.touches?.length
                ? e.touches[0].clientX
                : 'clientX' in e
                  ? (e as any).clientX
                  : null
        dragStartX.current = x
    }
    const onPointerUp = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
        const start = dragStartX.current
        if (start == null) return
        const x =
            'changedTouches' in e && e.changedTouches?.length
                ? e.changedTouches[0].clientX
                : 'clientX' in e
                  ? (e as any).clientX
                  : null
        dragStartX.current = null
        if (x == null) return
        const dx = x - start
        if (Math.abs(dx) > 30) {
            if (dx > 0) prev()
            else next()
        }
    }

    // Keyboard navigation in dialog
    const onDialogKeyDown = (e: React.KeyboardEvent) => {
        if (!hasImages) return
        if (e.key === 'ArrowRight') next()
        else if (e.key === 'ArrowLeft') prev()
        else if (e.key === 'Escape') setImgOpen(false)
    }

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
                    transform: 'scale(1.2)',
                    zIndex: 3
                },
                backgroundColor: theme.palette.customColors.grey_7,
            }}
        >
            {/* MEDIA: mini-carousel with slide transition */}
            <Box
                sx={{ position: 'relative', height: '66%', overflow: 'hidden' }}
                onMouseDown={onPointerDown as any}
                onMouseUp={onPointerUp as any}
                onTouchStart={onPointerDown as any}
                onTouchEnd={onPointerUp as any}
            >
                {hasImages ? (
                    <>
                        {/* Viewport (click to open dialog) */}
                        <Box
                            onClick={() => {
                                setImgOpen(true)
                                showZoomHud()
                            }}
                            sx={{
                                width: '100%',
                                height: '100%',
                                overflow: 'hidden',
                                position: 'relative',
                                cursor: 'zoom-in',
                                // Only zoom the ACTIVE slide image on hover
                                '.MuiCard-root:hover & [data-active="true"] img': {
                                    transform: 'scale(1.06)',
                                },
                            }}
                        >
                            {/* Sliding track */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    width: '100%',
                                    height: '100%',
                                    transition: `transform ${TILE_SLIDE_MS}ms ease`,
                                    transform: `translateX(-${idx * 100}%)`,
                                }}
                            >
                                {images.map((src, i) => (
                                    <Box
                                        key={i}
                                        data-active={i === idx ? 'true' : undefined}
                                        sx={{
                                            flex: '0 0 100%',
                                            width: '100%',
                                            height: '100%',
                                            position: 'relative',
                                            overflow: 'hidden', // clip zoomed image within slide
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={src}
                                            alt={`${card.name} ${i + 1}`}
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                display: 'block',
                                                userSelect: 'none',
                                                transform: 'scale(1)', // base
                                                transition: 'transform 200ms ease', // hover zoom only on active
                                            }}
                                            draggable={false}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                        {/* Prev/Next */}
                        {images.length > 1 && (
                            <>
                                <IconButton
                                    aria-label="Previous image"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        prev()
                                    }}
                                    sx={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: 6,
                                        transform: 'translateY(-50%)',
                                        bgcolor: 'rgba(0,0,0,0.45)',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
                                    }}
                                >
                                    <ChevronLeftIcon />
                                </IconButton>

                                <IconButton
                                    aria-label="Next image"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        next()
                                    }}
                                    sx={{
                                        position: 'absolute',
                                        top: '50%',
                                        right: 6,
                                        transform: 'translateY(-50%)',
                                        bgcolor: 'rgba(0,0,0,0.45)',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
                                    }}
                                >
                                    <ChevronRightIcon />
                                </IconButton>

                                {/* Dots */}
                                <Stack
                                    direction="row"
                                    spacing={0.75}
                                    sx={{
                                        position: 'absolute',
                                        bottom: 8,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        bgcolor: 'rgba(0,0,0,0.35)',
                                        borderRadius: 2,
                                        px: 1,
                                        py: 0.5,
                                    }}
                                >
                                    {images.map((_, i) => (
                                        <Box
                                            key={i}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setIdx(i)
                                            }}
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                bgcolor:
                                                    i === idx ? 'white' : 'rgba(255,255,255,0.5)',
                                                cursor: 'pointer',
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </>
                        )}
                    </>
                ) : (
                    // No images: placeholder
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

                {/* Hover overlay: Zoom icon (only when we have images) */}
                {hasImages && (
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
                            onClick={() => {
                                setImgOpen(true)
                                showZoomHud()
                            }}
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

                {/* Edit/Delete hover actions */}
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

            {/* Full-screen carousel dialog (no hover zoom; wheel zoom instead) */}
            {/* Full-screen carousel dialog (wheel zoom, aligned overlays) */}
            <Dialog
                open={imgOpen}
                onClose={() => setImgOpen(false)}
                fullScreen
                onKeyDown={onDialogKeyDown}
                slotProps={{
                    backdrop: {
                        sx: { backgroundColor: `rgba(0, 0, 0, ${DIALOG_BACKDROP_OPACITY})` },
                    }, // opacity control
                    paper: { sx: { bgcolor: 'transparent' } }, // transparent sheet
                }}
            >
                <DialogContent
                    ref={dialogViewportRef}
                    onWheel={onWheelZoom}
                    sx={{
                        p: 0,
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'transparent',
                        position: 'relative', // common positioning context for all overlays
                        overscrollBehavior: 'contain',
                    }}
                    onMouseDown={onPointerDown as any}
                    onMouseUp={onPointerUp as any}
                    onTouchStart={onPointerDown as any}
                    onTouchEnd={onPointerUp as any}
                >
                    {hasImages && (
                        <>
                            {/* Sliding track (images) */}
                            <Box
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    overflow: 'hidden',
                                    position: 'relative',
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        height: '100%',
                                        alignItems: 'center',
                                        transition: `transform ${DLG_SLIDE_MS}ms ease`,
                                        transform: `translateX(-${idx * 100}%)`,
                                    }}
                                >
                                    {images.map((src, i) => (
                                        <Box
                                            key={i}
                                            data-active={i === idx ? 'true' : undefined}
                                            sx={{
                                                flex: '0 0 100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: '100%',
                                                overflow: 'hidden', // keep zoomed image within its slide
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src={src}
                                                alt={`${card.name} ${i + 1}`}
                                                sx={{
                                                    display: 'block',
                                                    maxWidth: '95vw',
                                                    maxHeight: '90vh',
                                                    objectFit: 'contain',
                                                    m: 'auto',
                                                    userSelect: 'none',
                                                    // No hover zoom here; only wheel zoom on the ACTIVE slide
                                                    transform: `scale(${i === idx ? zoom : 1})`,
                                                    transformOrigin: `${origin.x}% ${origin.y}%`,
                                                    transition:
                                                        i === idx ? 'transform 120ms ease' : 'none',
                                                }}
                                                draggable={false}
                                            />
                                        </Box>
                                    ))}
                                </Box>
                            </Box>

                            {/* Overlay layer: all controls centered relative to DialogContent */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    pointerEvents: 'none', // let underlying content receive events unless re-enabled per control
                                }}
                            >
                                {/* Close button */}
                                <IconButton
                                    aria-label="Close"
                                    onClick={() => setImgOpen(false)}
                                    sx={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        zIndex: 2,
                                        bgcolor: 'rgba(0,0,0,0.5)',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                                        pointerEvents: 'auto',
                                    }}
                                >
                                    <CloseIcon />
                                </IconButton>

                                {/* Prev / Next */}
                                {images.length > 1 && (
                                    <>
                                        <IconButton
                                            aria-label="Previous image"
                                            onClick={prev}
                                            sx={{
                                                position: 'absolute',
                                                left: 12,
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                bgcolor: 'rgba(255,255,255,0.15)',
                                                color: 'white',
                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                                                pointerEvents: 'auto',
                                            }}
                                        >
                                            <ChevronLeftIcon sx={{ fontSize: 36 }} />
                                        </IconButton>

                                        <IconButton
                                            aria-label="Next image"
                                            onClick={next}
                                            sx={{
                                                position: 'absolute',
                                                right: 12,
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                bgcolor: 'rgba(255,255,255,0.15)',
                                                color: 'white',
                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                                                pointerEvents: 'auto',
                                            }}
                                        >
                                            <ChevronRightIcon sx={{ fontSize: 36 }} />
                                        </IconButton>

                                        {/* Dots (centered) */}
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            sx={{
                                                position: 'absolute',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                bottom: 16,
                                                bgcolor: 'rgba(255,255,255,0.12)',
                                                borderRadius: 2,
                                                px: 1.5,
                                                py: 0.75,
                                                pointerEvents: 'auto',
                                            }}
                                        >
                                            {images.map((_, i) => (
                                                <Box
                                                    key={i}
                                                    onClick={() => {
                                                        setIdx(i)
                                                        setZoom(1)
                                                        setOrigin({ x: 50, y: 50 })
                                                    }}
                                                    sx={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        bgcolor:
                                                            i === idx
                                                                ? 'white'
                                                                : 'rgba(255,255,255,0.5)',
                                                        cursor: 'pointer',
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    </>
                                )}

                                {/* Zoom HUD Chip (centered under image; sits above dots if present) */}
                                <Chip
                                    size="small"
                                    label={`${Math.round(zoom * 100)}%`}
                                    icon={<ZoomInIcon/>}
                                    sx={{
                                        position: 'absolute',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        bottom: images.length > 1 ? 56 : 16, // if dots exist, lift Chip above them
                                        zIndex: 3,
                                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                                        color: '#fff',
                                        fontWeight: 700,
                                        pointerEvents: 'none',
                                        opacity: zoomHudVisible ? 1 : 0,
                                        transition: 'opacity 200ms ease',
                                        backdropFilter: 'blur(2px)',
                                    }}
                                />
                            </Box>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    )
}
