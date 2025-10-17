// components/rankings/CardMini.tsx
import * as React from 'react'
import {
    Box,
    Paper,
    Popper,
    IconButton,
    Tooltip,
    Dialog,
    DialogContent,
    Chip
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay'
import NoPhotographyIcon from '@mui/icons-material/NoPhotography'
import CardTile from '../cards/CardTile'
import { TILE_SIZE } from './utils' // keep your existing size constant
import type { CardModel, Category } from '../cards/types'

/* =============================================================================
   Media utils (self-contained here so CardMini works standalone)
============================================================================= */
type MediaKind = 'image' | 'video' | 'youtube'
type MediaItem = { url: string; kind: MediaKind }

const MEDIA_DELIM = /\n\n|\|\|/ // supports "\n\n" and "||"
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
    return /(?:youtube\.com|youtu\.be)\//i.test(String(url))
}
function extractYouTubeId(url: string): string | null {
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
    opts: { autoplay?: boolean; mute?: boolean; loop?: boolean; controls?: 0 | 1 } = {}
) {
    const id = extractYouTubeId(url)
    if (!id) return null
    const { autoplay = true, mute = true, loop = true, controls = 0 } = opts
    const params = new URLSearchParams()
    if (autoplay) params.set('autoplay', '1')
    if (mute) params.set('mute', '1')
    if (loop) {
        params.set('loop', '1')
        params.set('playlist', id)
    }
    params.set('controls', String(controls))
    params.set('modestbranding', '1')
    params.set('rel', '0')
    params.set('playsinline', '1')
    return `https://www.youtube.com/embed/${id}?${params.toString()}`
}
function getMediaKind(url: string): MediaKind {
    if (isYouTube(url)) return 'youtube'
    const ext = extOf(url)
    if (VIDEO_EXTS.includes(ext)) return 'video'
    return IMAGE_EXTS.includes(ext) ? 'image' : 'image' // default to image if unknown
}
function splitMedia(value?: string | null, max = 3): MediaItem[] {
    if (!value) return []
    return String(value)
        .split(MEDIA_DELIM)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, max)
        .map((url) => ({ url, kind: getMediaKind(url) }))
}

/* =============================================================================
   Props
============================================================================= */
type Props = {
    card: CardModel
    allCategories: Category[]
    draggable?: boolean
    height?: number
    badgeNumber?: number
    placement?: 'auto' | 'right' | 'left' | 'top' | 'bottom'
    onRemove?: () => void
}

/* =============================================================================
   Component
============================================================================= */
export default function CardMini({
    card,
    allCategories,
    draggable = true,
    height = TILE_SIZE,
    placement = 'auto',
    badgeNumber,
    onRemove,
}: Props) {
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)
    const [previewOpen, setPreviewOpen] = React.useState(false)

    // Media (image / video / YouTube)
    const media = React.useMemo(() => splitMedia(card.image_url), [card.image_url])
    const hasMedia = media.length > 0
    const first = media[0]

    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = React.useState(false)
    const [lightboxIdx, setLightboxIdx] = React.useState(0)
    const clampIdx = React.useCallback(
        (i: number) => (media.length ? (i + media.length) % media.length : 0),
        [media.length]
    )
    const next = React.useCallback(() => setLightboxIdx((i) => clampIdx(i + 1)), [clampIdx])
    const prev = React.useCallback(() => setLightboxIdx((i) => clampIdx(i - 1)), [clampIdx])

    // Hover preview handlers
    const closePreview = React.useCallback(() => {
        setPreviewOpen(false)
        setAnchorEl(null)
    }, [])
    const handleMiniEnter = (e: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(e.currentTarget)
        setPreviewOpen(true)
    }
    const handleMiniLeave = () => setPreviewOpen(false)
    const handlePopperEnter = () => setPreviewOpen(true)
    const handlePopperLeave = () => {
        setPreviewOpen(false)
        setAnchorEl(null)
    }

    /* ----------------------------- DIALOG ZOOM STATE ---------------------------- */
    const [zoom, setZoom] = React.useState(1)
    const [origin, setOrigin] = React.useState<{ x: number; y: number }>({ x: 50, y: 50 })
    const [zoomHudVisible, setZoomHudVisible] = React.useState(false)
    const hudTimerRef = React.useRef<number | null>(null)
    const dialogViewportRef = React.useRef<HTMLDivElement>(null)

    const ZOOM_MIN = 1
    const ZOOM_MAX = 4
    const ZOOM_STEP = 0.2
    const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

    const showZoomHud = React.useCallback(() => {
        setZoomHudVisible(true)
        if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current)
        hudTimerRef.current = window.setTimeout(() => setZoomHudVisible(false), 2000)
    }, [])
    React.useEffect(
        () => () => {
            if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current)
        },
        []
    )

    // Reset zoom when dialog opens or slide changes
    React.useEffect(() => {
        if (lightboxOpen) {
            setZoom(1)
            setOrigin({ x: 50, y: 50 })
        }
    }, [lightboxOpen, lightboxIdx])

    const onWheelZoom = (e: React.WheelEvent) => {
        if (!lightboxOpen || !hasMedia) return
        if (controlsOn) return
        e.preventDefault()
        const rect = dialogViewportRef.current?.getBoundingClientRect()
        if (rect) {
            const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100)
            const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100)
            setOrigin({ x, y })
        }
        const sign = e.deltaY < 0 ? 1 : -1
        setZoom((z) => clamp(z + sign * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))
        showZoomHud()
    }

    // Keyboard in dialog
    const onDialogKeyDown = (e: React.KeyboardEvent) => {
        if (!hasMedia) return
        if (e.key === 'ArrowRight') next()
        else if (e.key === 'ArrowLeft') prev()
        else if (e.key === 'Escape') setLightboxOpen(false)
    }

    // Track viewport size for YouTube "resize-zoom"

    const [vp, setVp] = React.useState({ w: 0, h: 0 })
    React.useLayoutEffect(() => {
        if (!dialogViewportRef.current) return
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect
            setVp({ w: width, h: height })
        })
        ro.observe(dialogViewportRef.current)
        return () => ro.disconnect()
    }, [])

    const safeVp = React.useMemo(() => {
        const w = vp.w || (typeof window !== 'undefined' ? window.innerWidth : 1280) || 1280
        const h = vp.h || (typeof window !== 'undefined' ? window.innerHeight : 720) || 720
        return { w, h }
    }, [vp])

    const base = React.useMemo(() => {
        // Fit a 16:9 box into ~95vw × 90vh and cap to 1920×1080
        const maxW = safeVp.w * 0.95
        const maxH = safeVp.h * 0.9
        let bw = Math.min(1920, Math.max(320, maxW)) // also guard against too-small values
        let bh = (bw * 9) / 16
        if (bh > Math.min(1080, Math.max(180, maxH))) {
            bh = Math.min(1080, Math.max(180, maxH))
            bw = (bh * 16) / 9
        }
        return { bw, bh }
    }, [safeVp])

    const deltaW = base.bw * (zoom - 1)
    const deltaH = base.bh * (zoom - 1)
    const ox = origin.x / 100 - 0.5
    const oy = origin.y / 100 - 0.5
    const marginLeftPx = -(deltaW * ox)
    const marginTopPx = -(deltaH * oy)
    // near other dialog state
    const [controlsOn, setControlsOn] = React.useState(true)
    return (
        <>
            {/* OUTER WRAPPER */}
            <Box
                onMouseEnter={handleMiniEnter}
                onMouseLeave={handleMiniLeave}
                onMouseDown={closePreview}
                onClick={closePreview}
                onDragStart={closePreview}
                sx={{
                    width: height,
                    height,
                    position: 'relative',
                    overflow: 'visible',
                    cursor: draggable ? 'grab' : 'default',
                    ...(draggable && { '&:active': { cursor: 'grabbing' } }),
                }}
                draggable={draggable}
                data-card-id={card.id}
            >
                {/* INNER TILE */}
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 1,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        position: 'relative',
                        bgcolor: hasMedia ? 'transparent' : 'action.hover',
                    }}
                >
                    {/* Mini media renderer */}
                    {!hasMedia && (
                        <NoPhotographyIcon
                            fontSize="medium"
                            sx={{
                                color: 'text.disabled',
                                opacity: 0.8,
                                pointerEvents: 'none',
                                position: 'absolute',
                                transform: 'translateX(50%) translateY(-50%)',
                                top: '50%',
                                right: '50%',
                            }}
                            aria-label="No image"
                        />
                    )}

                    {first?.kind === 'image' && (
                        <Box
                            component="img"
                            src={first.url}
                            alt=""
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                                userSelect: 'none',
                            }}
                            draggable={false}
                            loading="lazy"
                        />
                    )}

                    {first?.kind === 'video' && (
                        <Box
                            component="video"
                            src={first.url}
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                            }}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                        />
                    )}

                    {first?.kind === 'youtube' && (
                        <Box
                            component="iframe"
                            src={
                                toYouTubeEmbed(first.url, {
                                    autoplay: true,
                                    mute: true,
                                    loop: true,
                                    controls: 0,
                                }) ?? first.url
                            }
                            sx={{
                                width: '100%',
                                height: '100%',
                                border: 0,
                                display: 'block',
                                // Keep events flowing for drag/hover; still renders visually
                                pointerEvents: 'none',
                            }}
                            allow="autoplay; encrypted-media; picture-in-picture"
                            loading="lazy"
                            title={`mini-${card.id}`}
                            referrerPolicy="origin-when-cross-origin"
                        />
                    )}
                </Box>

                {/* Placement badge */}
                {badgeNumber != null && (
                    <Box
                        sx={(t) => ({
                            position: 'absolute',
                            top: -6,
                            left: -6,
                            zIndex: 2,
                            height: 18,
                            width: 18,
                            borderRadius: 1,
                            bgcolor: t.palette.background.paper,
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: t.shadows[2],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 800,
                            color: t.palette.text.primary,
                        })}
                        title={`Placement #${badgeNumber}`}
                    >
                        {badgeNumber}
                    </Box>
                )}

                {/* Remove button */}
                {onRemove && (
                    <Tooltip title="Remove from this ranking">
                        <IconButton
                            onClick={(e) => {
                                e.stopPropagation()
                                onRemove()
                            }}
                            size="small"
                            color="error"
                            sx={(t) => ({
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                zIndex: 2,
                                height: 18,
                                width: 18,
                                bgcolor: t.palette.background.paper,
                                border: '1px solid',
                                borderColor: 'divider',
                                boxShadow: t.shadows[2],
                                '&:hover': { bgcolor: t.palette.customColors.red_3 },
                            })}
                        >
                            <CloseIcon sx={{ fontSize: 12, color: 'white' }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {/* Hover preview (still uses CardTile, which already supports media) */}
            <Popper
                open={previewOpen && !!anchorEl}
                anchorEl={anchorEl}
                placement={placement}
                modifiers={[{ name: 'offset', options: { offset: [0, 6] } }]}
                style={{ zIndex: 1400 }}
            >
                <Paper
                    onMouseEnter={handlePopperEnter}
                    onMouseLeave={handlePopperLeave}
                    onClick={() => {
                        if (hasMedia) {
                            setLightboxOpen(true)
                            setPreviewOpen(false)
                            setLightboxIdx(0)
                        }
                    }}
                    sx={{
                        p: 0,
                        width: 360,
                        cursor: hasMedia ? 'zoom-in' : 'default',
                        '& .MuiCardActions-root': { display: 'none !important' },
                        '& .MuiRating-root': { pointerEvents: 'none', opacity: 0.7 },
                    }}
                >
                    <CardTile
                        disableActions
                        card={card}
                        allCategories={allCategories}
                        loadingRating={false}
                        onRequestEdit={() => {}}
                        onRequestDelete={() => {}}
                        onApplyCategories={async () => {}}
                        onApplyRating={async () => {}}
                    />
                </Paper>
            </Popper>

            {/* Lightbox = wheel-zoom + media carousel */}
            <Dialog
                open={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                fullScreen
                onKeyDown={onDialogKeyDown}
                slotProps={{
                    backdrop: { sx: { backgroundColor: `rgba(0, 0, 0, 0.55)` } },
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
                        backgroundColor: 'transparent',
                        position: 'relative',
                        overscrollBehavior: 'contain',
                    }}
                >
                    {hasMedia && (
                        <Box sx={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    height: '100%',
                                    alignItems: 'center',
                                    transition: 'transform 400ms ease',
                                    transform: `translateX(-${lightboxIdx * 100}%)`,
                                }}
                            >
                                {media.map((m, i) => {
                                    const active = i === lightboxIdx
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
                                        // IMPORTANT: allow wheel events to reach the DialogContent
                                        pointerEvents: 'none' as const,
                                    }
                                    return (
                                        <Box
                                            key={i}
                                            sx={{
                                                flex: '0 0 100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: '100%',
                                                overflow: 'hidden',
                                                position: 'relative',
                                            }}
                                        >
                                            {m.kind === 'image' && (
                                                <Box
                                                    component="img"
                                                    src={m.url}
                                                    alt=""
                                                    draggable={false}
                                                    sx={baseZoomableSx}
                                                />
                                            )}

                                            {m.kind === 'video' && (
                                                <video
                                                    src={m.url}
                                                    style={
                                                        {
                                                            ...baseZoomableSx,
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
                                                    src={
                                                        toYouTubeEmbed(m.url, {
                                                            autoplay: true,
                                                            mute: false, // muted in zoom mode; user can unmute in control mode
                                                            loop: true,
                                                            controls: controlsOn ? 1 : 0, // ✅ show/hide UI
                                                        }) ?? m.url
                                                    }
                                                    style={
                                                        {
                                                            display: 'block',
                                                            position: 'absolute',
                                                            left: '50%',
                                                            top: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                            width: `${base.bw * zoom}px`,
                                                            height: `${base.bh * zoom}px`,
                                                            marginLeft: `${marginLeftPx}px`,
                                                            marginTop: `${marginTopPx}px`,
                                                            border: 0,
                                                            pointerEvents: controlsOn
                                                                ? 'auto'
                                                                : 'none', // ✅ allow UI interaction in control mode
                                                        } as any
                                                    }
                                                    allow="autoplay; encrypted-media; picture-in-picture"
                                                    allowFullScreen
                                                    title={`lightbox-${card.id}-${i}`}
                                                    referrerPolicy="origin-when-cross-origin"
                                                />
                                            )}
                                        </Box>
                                    )
                                })}
                            </Box>
                        </Box>
                    )}

                    {/* Close */}
                    <IconButton
                        onClick={() => setLightboxOpen(false)}
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    <Tooltip title={controlsOn ? 'Zoom mode' : 'Enable player controls'}>
                        <IconButton
                            aria-label={controlsOn ? 'Back to zoom mode' : 'Enable player controls'}
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
                            }}
                        >
                            {controlsOn ? <SmartDisplayIcon /> : <ZoomInIcon />}
                        </IconButton>
                    </Tooltip>

                    {/* Prev/Next */}
                    {media.length > 1 && (
                        <>
                            <IconButton
                                onClick={prev}
                                sx={{
                                    position: 'absolute',
                                    left: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    bgcolor: 'rgba(255,255,255,0.15)',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                                }}
                            >
                                <ChevronLeftIcon sx={{ fontSize: 36 }} />
                            </IconButton>
                            <IconButton
                                onClick={next}
                                sx={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    bgcolor: 'rgba(255,255,255,0.15)',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                                }}
                            >
                                <ChevronRightIcon sx={{ fontSize: 36 }} />
                            </IconButton>
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
                </DialogContent>
            </Dialog>
        </>
    )
}
;``
