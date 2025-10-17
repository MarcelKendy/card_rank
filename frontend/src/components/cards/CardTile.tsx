import * as React from 'react'
import {
    Box,
    Card,
    Chip,
    Dialog,
    DialogContent,
    IconButton,
    Button,
    Stack,
    Tooltip,
    Typography,
    Rating
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import NoPhotographyIcon from '@mui/icons-material/NoPhotography'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'
import useMediaQuery from '@mui/material/useMediaQuery'
import CategoryPicker from './CategoryPicker'
import type { CardTileProps } from './types'

// ====== Visual constants (unchanged) ======
const TITLE_SHADOW = '0px 1px 10px rgba(0, 0, 0, 1)'

// ====== Media parsing & config (NEW) ======
type MediaKind = 'image' | 'video' | 'youtube'
type MediaItem = { url: string; kind: MediaKind }

const MAX_MEDIA = 3
// Accept either "\n\n" OR "||" as multi-URL delimiter
const MEDIA_DELIM = /\n\n|\|\|/

const VIDEO_EXTS = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v']
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']

function extOf(url: string) {
    try {
        const u = new URL(
            url,
            typeof window !== 'undefined' ? window.location.href : 'http://localhost'
        )
        const pathname = u.pathname.toLowerCase()
        return pathname.slice(pathname.lastIndexOf('.')) || ''
    } catch {
        const lower = String(url).toLowerCase().split('?')[0]
        return lower.slice(lower.lastIndexOf('.')) || ''
    }
}
function isYouTube(url: string) {
    const s = String(url)
    return /(?:youtube\.com|youtu\.be)\//i.test(s)
}
function extractYouTubeId(url: string): string | null {
    // Handles: https://www.youtube.com/watch?v=ID, https://youtu.be/ID, https://www.youtube.com/shorts/ID
    const m1 = url.match(/[?&]v=([\w-]{11})/)
    if (m1?.[1]) return m1[1]
    const m2 = url.match(/youtu\.be\/([\w-]{11})/)
    if (m2?.[1]) return m2[1]
    const m3 = url.match(/youtube\.com\/shorts\/([\w-]{11})/)
    if (m3?.[1]) return m3[1]
    return null
}
function toYouTubeEmbed(
    url: string,
    { autoplay = true, mute = true, loop = true, controls = 0 } = {}
) {
    const id = extractYouTubeId(url)
    if (!id) return null
    const params = new URLSearchParams()
    if (autoplay) params.set('autoplay', '1')
    if (mute) params.set('mute', '1')
    if (loop) {
        params.set('loop', '1')
        params.set('playlist', id) // required by YouTube to actually loop
    }
    params.set('controls', String(controls))
    params.set('modestbranding', '1')
    params.set('rel', '0')
    return `https://www.youtube.com/embed/${id}?${params.toString()}`
}
function getMediaKind(url: string): MediaKind {
    if (isYouTube(url)) return 'youtube'
    const ext = extOf(url)
    if (VIDEO_EXTS.includes(ext)) return 'video'
    // GIFs are treated as images; <img> will animate them
    return IMAGE_EXTS.includes(ext) ? 'image' : 'image'
}
function splitMedia(value?: string | null): MediaItem[] {
    if (!value) return []
    return String(value)
        .split(MEDIA_DELIM)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_MEDIA)
        .map((url) => ({ url, kind: getMediaKind(url) }))
}
function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n))
}

// ====== Anim & dialog config (unchanged intent) ======
const TILE_SLIDE_MS = 350
const DLG_SLIDE_MS = 400
const DIALOG_BACKDROP_OPACITY = 0.55

// Zoom config
const DLG_ZOOM_MIN = 1
const DLG_ZOOM_MAX = 4
const DLG_ZOOM_STEP = 0.2

export default function CardTile({
    card,
    allCategories,
    loadingRating,
    disableActions,
    onRequestEdit,
    onRequestDelete,
    onApplyCategories,
    onApplyRating,
}: CardTileProps) {
    const theme = useTheme()

    const [controlsOn, setControlsOn] = React.useState(false)
    // --- Category picker state (unchanged) ---
    const [pickerAnchor, setPickerAnchor] = React.useState<HTMLElement | null>(null)
    const openPicker = (e: React.MouseEvent<HTMLElement>) => setPickerAnchor(e.currentTarget)
    const closePicker = () => setPickerAnchor(null)
    const pickerOpen = Boolean(pickerAnchor)
    const maxCats = 4
    const assignedIds = card.categories.map((c) => c.id)

    // --- Media & carousel (replaces "images") ---
    const media = React.useMemo(() => splitMedia(card.image_url), [card.image_url])
    const hasMedia = media.length > 0
    const [idx, setIdx] = React.useState(0)
    const clampIdx = React.useCallback(
        (i: number) => (media.length ? (i + media.length) % media.length : 0),
        [media.length]
    )
    const next = React.useCallback(() => setIdx((i) => clampIdx(i + 1)), [clampIdx])
    const prev = React.useCallback(() => setIdx((i) => clampIdx(i - 1)), [clampIdx])

    // Rating size responsive (unchanged)
    const isMdUp = useMediaQuery(theme.breakpoints.up('qhd'))
    const ratingSize: 'medium' | 'large' = isMdUp ? 'large' : 'medium'

    // Keep index in range when media array changes
    React.useEffect(() => {
        if (idx >= media.length) setIdx(0)
    }, [media.length, idx])

    // --- Full-screen dialog / zoom state (unchanged logic; generalized to "media") ---
    const [imgOpen, setImgOpen] = React.useState(false)

    // Zoom HUD state
    const [zoomHudVisible, setZoomHudVisible] = React.useState(false)
    const hudTimerRef = React.useRef<number | null>(null)
    const showZoomHud = React.useCallback(() => {
        setZoomHudVisible(true)
        if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current)
        hudTimerRef.current = window.setTimeout(() => {
            setZoomHudVisible(false)
        }, 2000)
    }, [])
    React.useEffect(() => {
        return () => {
            if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current)
        }
    }, [])

    // Zoom state: amount + origin (%)
    const [zoom, setZoom] = React.useState<number>(1)
    const [origin, setOrigin] = React.useState<{ x: number; y: number }>({ x: 50, y: 50 })
    const dialogViewportRef = React.useRef<HTMLDivElement>(null)

    // Reset zoom when opening dialog or changing media
    React.useEffect(() => {
        if (imgOpen) {
            setZoom(1)
            setOrigin({ x: 50, y: 50 })
        }
    }, [imgOpen, idx])

    // Mouse wheel to control zoom (dialog only)
    const onWheelZoom = (e: React.WheelEvent) => {
        if (!imgOpen || !hasMedia) return
        if (controlsOn) return
        e?.preventDefault() ?? ''
        const rect = dialogViewportRef.current?.getBoundingClientRect()
        if (rect) {
            const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100)
            const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100)
            setOrigin({ x, y })
        }
        const sign = e.deltaY < 0 ? 1 : -1 // wheel up -> zoom in
        setZoom((z) => clamp(z + sign * DLG_ZOOM_STEP, DLG_ZOOM_MIN, DLG_ZOOM_MAX))
        showZoomHud()
    }

    // Swipe/drag for tile + dialog (unchanged)
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

    // Keyboard navigation in dialog (unchanged)
    const onDialogKeyDown = (e: React.KeyboardEvent) => {
        if (!hasMedia) return
        if (e.key === 'ArrowRight') next()
        else if (e.key === 'ArrowLeft') prev()
        else if (e.key === 'Escape') setImgOpen(false)
    }

    return (
        <Card
            className="card-tile"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '410px',
                height: '410px',
                maxHeight: '410px',
                boxShadow:
                    ' rgba(0, 0, 0, 0.13) 1px 2px 2px 5px, rgba(0, 0, 0, 0.63) 0px 2px 13px -3px, rgba(0, 0, 0, 0.32) 0px -3px 0px inset;',
                transition: (t) =>
                    t.transitions.create(
                        ['box-shadow', 'transform', 'border', 'opacity', 'filter'],
                        {
                            duration: t.transitions.duration.standard,
                        }
                    ),
                willChange: 'transform',
                border: 'solid 1px rgba(0, 0, 0, 0.34)',
                '&:hover': {
                    boxShadow:
                        'rgba(68, 68, 68, 0.4) 0px 10px 20px 10px inset, rgba(83, 83, 83, 0.25) 5px -26px 30px 5px inset, rgba(8, 8, 8, 0.9) 0px 10px 10px 5px inset, rgba(0, 0, 0, 0) 0px 0px 2px 0px, rgba(0, 0, 0, 0.09) 10px 4px 12px, rgba(0, 0, 0, 0.1) 4px 8px 4px, rgba(255, 255, 255, 0.1) 0px 0px 20px 5px, rgba(255, 255, 255, 0.21) 0px 0px 0px 0px;',
                    transform: 'scale(1.2)',
                    border: 'solid 0.5px rgba(255, 255, 255, 0.24)',
                    zIndex: 3,
                    filter: 'saturate(1.2)',
                },
                backgroundColor: theme.palette.customColors.grey_7,
            }}
        >
            {/* MEDIA: mini-carousel */}
            <Box
                sx={{
                    position: 'relative',
                    height: '66%',
                    overflow: 'hidden',
                    border: 'solid 2px rgba(255, 255, 255, 0.1)',
                }}
                onMouseDown={onPointerDown as any}
                onMouseUp={onPointerUp as any}
                onTouchStart={onPointerDown as any}
                onTouchEnd={onPointerUp as any}
            >
                {/* Rating strip */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 1.5,
                        py: 0.5,
                        height: '10%',
                        width: '100%',
                        position: 'absolute',
                        zIndex: 3,
                        backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    }}
                >
                    <Rating
                        name="simple-controlled"
                        value={card.rating}
                        max={10}
                        disabled={loadingRating}
                        size={ratingSize}
                        sx={{ opacity: loadingRating ? 0.4 : 1 }}
                        onChange={(_, newValue) => {
                            card.rating = newValue ?? 0
                            onApplyRating(card)
                        }}
                    />
                </Box>

                {hasMedia ? (
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
                                // Hover zoom only on active slide (img, video, iframe)
                                '.MuiCard-root:hover & [data-active="true"] img, \
                 .MuiCard-root:hover & [data-active="true"] video, \
                 .MuiCard-root:hover & [data-active="true"] iframe': {
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
                                {media.map((m, i) => {
                                    const active = i === idx
                                    const commonSlideSx = {
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover' as const,
                                        display: 'block',
                                        userSelect: 'none' as const,
                                        transform: 'scale(1)',
                                        transition: 'transform 200ms ease',
                                    }
                                    return (
                                        <Box
                                            key={i}
                                            data-active={active ? 'true' : undefined}
                                            sx={{
                                                flex: '0 0 100%',
                                                width: '100%',
                                                height: '100%',
                                                position: 'relative',
                                                overflow: 'hidden', // clip zoomed media within slide
                                            }}
                                        >
                                            {m.kind === 'image' && (
                                                <Box
                                                    component="img"
                                                    src={m.url}
                                                    alt={`${card.name} ${i + 1}`}
                                                    sx={commonSlideSx}
                                                    draggable={false}
                                                    loading="lazy"
                                                />
                                            )}
                                            {m.kind === 'video' && (
                                                <video
                                                    src={m.url}
                                                    style={
                                                        {
                                                            ...commonSlideSx,
                                                            pointerEvents: controlsOn
                                                                ? 'auto'
                                                                : 'none', // ✅ enable interaction
                                                        } as any
                                                    }
                                                    autoPlay
                                                    muted={!controlsOn} // keep muted in zoom mode to avoid autoplay blocks
                                                    loop
                                                    playsInline
                                                    controls={controlsOn} // ✅ show native controls in control mode
                                                    preload="auto"
                                                />
                                            )}
                                            {m.kind === 'youtube' && (
                                                <iframe
                                                    src={toYouTubeEmbed(m.url) ?? m.url}
                                                    style={
                                                        {
                                                            ...commonSlideSx,
                                                            border: 0,
                                                            pointerEvents: controlsOn
                                                                ? 'auto'
                                                                : 'none',
                                                        } as any
                                                    }
                                                    allow="autoplay; encrypted-media; picture-in-picture"
                                                    allowFullScreen
                                                    loading="lazy"
                                                    title={`${card.name} ${i + 1}`}
                                                />
                                            )}
                                        </Box>
                                    )
                                })}
                            </Box>
                        </Box>

                        {/* Prev/Next */}
                        {media.length > 1 && (
                            <>
                                <IconButton
                                    aria-label="Previous media"
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
                                    aria-label="Next media"
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
                                    {media.map((_, i) => (
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
                    // No media: placeholder
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
                            cursor: disableActions ? '' : 'pointer',
                            '.MuiCard-root:hover &': { transform: 'scale(1.06)' },
                        }}
                    >
                        {!disableActions ? (
                            <AddPhotoAlternateIcon
                                sx={{
                                    fontSize: '50px',
                                    opacity: 0.6,
                                    transition: 'opacity 200ms ease',
                                    '.MuiCard-root:hover &': { opacity: 1 },
                                }}
                            />
                        ) : (
                            <NoPhotographyIcon
                                sx={{
                                    fontSize: '50px',
                                    opacity: 0.6,
                                    transition: 'opacity 200ms ease',
                                    '.MuiCard-root:hover &': { opacity: 1 },
                                }}
                            />
                        )}
                    </Box>
                )}

                {/* Hover overlay: Zoom icon (only when we have media) */}
                {hasMedia && (
                    <Tooltip
                        title="Zoom Media"
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
                            aria-label="Expand media"
                            onClick={() => {
                                setImgOpen(true)
                                showZoomHud()
                            }}
                            size="small"
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 38,
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
                {disableActions ? null : (
                    <Box>
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
                                    top: 38,
                                    bgcolor: theme.palette.customColors.orange_3,
                                    color: 'rgba(255, 255, 255, 1)',
                                    opacity: 0,
                                    border: 'solid 1px ' + theme.palette.customColors.orange_3,
                                    transition: 'opacity 150ms ease, background-color 150ms ease',
                                    '.MuiCard-root:hover &': { opacity: 1 },
                                    '&:hover': {
                                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                                        color: theme.palette.customColors.orange_3,
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
                                    top: 38,
                                    bgcolor: theme.palette.customColors.red_3,
                                    color: 'rgba(255, 255, 255, 1)',
                                    opacity: 0,
                                    border: 'solid 1px ' + theme.palette.customColors.red_3,
                                    transition: 'opacity 150ms ease, background-color 150ms ease',
                                    '.MuiCard-root:hover &': { opacity: 1 },
                                    '&:hover': {
                                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                                        color: theme.palette.customColors.red_3,
                                    },
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
            </Box>

            {/* CONTENT */}
            <Box
                onClick={() => onRequestEdit(card)}
                sx={{
                    mx: 1.5,
                    my: 1,
                    alignItems: 'stretch',
                    cursor: disableActions ? '' : 'pointer',
                    height: '18%',
                }}
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
            <Box sx={{ mx: 1.5, mb: 1, height: '16%', position: 'relative' }}>
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
                                        '.MuiCard-root:hover &': {
                                            opacity: disableActions ? 1 : 0.5,
                                        },
                                        boxShadow:
                                            'rgba(0, 0, 0, 0.24) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;',
                                        border: 'solid 1px rgba(255, 255, 255, 0.4)',
                                    }
                                }}
                            />
                        ))
                    ) : (
                        <Chip
                            size="small"
                            label="No category"
                            variant="outlined"
                            sx={{
                                cursor: 'pointer',
                                textShadow: TITLE_SHADOW,
                                '.MuiCard-root:hover &': { opacity: 0.5 },
                            }}
                        />
                    )}
                </Stack>

                {/* Always show "Edit" (pencil) */}
                {disableActions ? null : (
                    <Box>
                        <Tooltip title="Edit categories" placement="top">
                            <Button
                                size="small"
                                onClick={openPicker}
                                sx={{
                                    border: 'solid 1px',
                                    position: 'absolute',
                                    left: '50%',
                                    top: '50%',
                                    height: '25px',
                                    transform: 'translateX(-50%) translateY(-50%)',
                                    bgcolor: theme.palette.customColors.white_blue,
                                    color: theme.palette.customColors.grey_7,
                                    opacity: 0,
                                    transition: 'opacity 250ms ease, background-color 150ms ease',
                                    '.MuiCard-root:hover &': { opacity: 1 },
                                    '&:hover': {
                                        bgcolor: theme.palette.customColors.grey_7,
                                        color: theme.palette.customColors.white_blue,
                                    },
                                }}
                            >
                                <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>
                                    Categories
                                </Typography>
                                <EditIcon sx={{ pl: 1 }} />
                            </Button>
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
                    </Box>
                )}
            </Box>

            {/* Full-screen carousel dialog (wheel zoom; works for img, video, and YouTube iframe) */}
            <Dialog
                open={imgOpen}
                onClose={() => setImgOpen(false)}
                fullScreen
                onKeyDown={onDialogKeyDown}
                slotProps={{
                    backdrop: {
                        sx: { backgroundColor: `rgba(0, 0, 0, ${DIALOG_BACKDROP_OPACITY})` },
                    },
                    paper: { sx: { bgcolor: 'transparent' } },
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
                        position: 'relative',
                        overscrollBehavior: 'contain',
                    }}
                    onMouseDown={onPointerDown as any}
                    onMouseUp={onPointerUp as any}
                    onTouchStart={onPointerDown as any}
                    onTouchEnd={onPointerUp as any}
                >
                    {hasMedia && (
                        <>
                            {/* Sliding track */}
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
                                    {media.map((m, i) => {
                                        const active = i === idx
                                        const baseZoomableSx = {
                                            display: 'block',
                                            maxWidth: '95vw',
                                            maxHeight: '90vh',
                                            objectFit: 'contain' as const,
                                            m: 'auto',
                                            userSelect: 'none' as const,
                                            transform: `scale(${active ? zoom : 1})`,
                                            transformOrigin: `${origin.x}% ${origin.y}%`,
                                            transition: active ? 'transform 120ms ease' : 'none',
                                            // IMPORTANT: ensure wheel events reach DialogContent even when over the media
                                            pointerEvents: 'none' as const,
                                        }
                                        return (
                                            <Box
                                                key={i}
                                                data-active={active ? 'true' : undefined}
                                                sx={{
                                                    flex: '0 0 100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    height: '100%',
                                                    overflow: 'hidden', // keep zoomed media within its slide
                                                }}
                                            >
                                                {m.kind === 'image' && (
                                                    <Box
                                                        component="img"
                                                        src={m.url}
                                                        alt={`${card.name} ${i + 1}`}
                                                        sx={baseZoomableSx}
                                                        draggable={false}
                                                    />
                                                )}
                                                {m.kind === 'video' && (
                                                    <video
                                                        src={m.url}
                                                        style={baseZoomableSx as any}
                                                        autoPlay
                                                        muted
                                                        loop
                                                        playsInline
                                                        controls={false}
                                                        preload="auto"
                                                    />
                                                )}
                                                {m.kind === 'youtube' && (
                                                    <iframe
                                                        src={
                                                            toYouTubeEmbed(m.url, {
                                                                autoplay: true,
                                                                mute: false, // muted in zoom mode; user can unmute in control mode
                                                                loop: true,
                                                                controls: controlsOn ? 1 : 0, // ✅ show/hide UI
                                                            }) ?? m.url
                                                        }
                                                        style={{
                                                            ...(baseZoomableSx as any),
                                                            border: 0,
                                                            pointerEvents: 'auto',
                                                        }}
                                                        allow="autoplay; encrypted-media; picture-in-picture"
                                                        allowFullScreen
                                                        title={`${card.name} ${i + 1}`}
                                                    />
                                                )}
                                            </Box>
                                        )
                                    })}
                                </Box>
                            </Box>

                            {/* Overlay layer */}
                            <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                {/* Close */}
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
                                <Tooltip
                                    title={controlsOn ? 'Zoom mode' : 'Enable player controls'}
                                >
                                    <IconButton
                                        aria-label={
                                            controlsOn
                                                ? 'Back to zoom mode'
                                                : 'Enable player controls'
                                        }
                                        onClick={() => setControlsOn((v) => !v)}
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 64,
                                            zIndex: 2,
                                            bgcolor: controlsOn
                                                ? 'rgba(235, 6, 18, 0.5)'
                                                : 'rgba(6, 60, 235, 0.5)',
                                            color: 'white',
                                            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                                            pointerEvents: 'auto',
                                        }}
                                    >
                                        {controlsOn ? <SmartDisplayIcon /> : <ZoomInIcon />}
                                    </IconButton>
                                </Tooltip>
                                {/* Prev / Next */}
                                {media.length > 1 && (
                                    <>
                                        <IconButton
                                            aria-label="Previous media"
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
                                            aria-label="Next media"
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
                                            {media.map((_, i) => (
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

                                {/* Zoom HUD */}
                                <Chip
                                    size="small"
                                    label={`${Math.round(zoom * 100)}%`}
                                    icon={<ZoomInIcon />}
                                    sx={{
                                        position: 'absolute',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        bottom: media.length > 1 ? 56 : 16,
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
