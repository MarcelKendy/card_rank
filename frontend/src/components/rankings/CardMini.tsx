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
    Chip,
    Avatar,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import NoPhotographyIcon from '@mui/icons-material/NoPhotography'
import CardTile from '../cards/CardTile'
import { TILE_SIZE } from './utils'
import type { CardModel, Category } from '../cards/types'

type Props = {
    card: CardModel
    allCategories: Category[]
    draggable?: boolean
    height?: number
    badgeNumber?: number
    onRemove?: () => void
}

export default function CardMini({
    card,
    allCategories,
    draggable = true,
    height = TILE_SIZE,
    badgeNumber,
    onRemove,
}: Props) {
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)
    const [previewOpen, setPreviewOpen] = React.useState(false)

    // Images
    const IMAGES_DELIM = '\n\n'
    const splitImages = (value?: string | null): string[] =>
        value
            ? String(value)
                  .split(IMAGES_DELIM)
                  .map((s) => s.trim())
                  .filter(Boolean)
            : []
    const images = React.useMemo(() => splitImages(card.image_url), [card.image_url])
    const hasImages = images.length > 0

    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = React.useState(false)
    const [lightboxIdx, setLightboxIdx] = React.useState(0)
    const clampIdx = React.useCallback(
        (i: number) => (images.length ? (i + images.length) % images.length : 0),
        [images.length]
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

    const bg = (images[0] ?? '').trim()

    return (
        <>
            {/* Outer wrapper */}

            <Box
                onMouseEnter={handleMiniEnter}
                onMouseLeave={handleMiniLeave}
                onMouseDown={closePreview} // 👈 close when the user presses mouse (click or drag start)
                onClick={closePreview} // 👈 optional: also close on completed click
                onDragStart={closePreview} // 👈 optional: extra guard if drag starts on this element
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
                {/* Inner box */}
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 1,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundImage: bg ? `url("${bg}")` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        bgcolor: bg ? 'transparent' : 'action.hover',
                    }}
                >
                    {!bg && (
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

            {/* Hover preview */}
            <Popper
                open={previewOpen && !!anchorEl}
                anchorEl={anchorEl}
                placement="auto"
                modifiers={[{ name: 'offset', options: { offset: [0, 6] } }]}
                style={{ zIndex: 1400 }}
            >
                <Paper
                    onMouseEnter={handlePopperEnter}
                    onMouseLeave={handlePopperLeave}
                    onClick={() => {
                        setLightboxOpen(true)
                        setPreviewOpen(false)
                    }}
                    sx={{
                        p: 0,
                        width: 360,
                        cursor: 'zoom-in',
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

            {/* Lightbox */}
            <Dialog
                open={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                fullScreen
                slotProps={{
                    backdrop: { sx: { backgroundColor: `rgba(0, 0, 0, ${0.55})` } },
                    paper: { sx: { bgcolor: 'transparent' } },
                }}
            >
                <DialogContent
                    sx={{
                        p: 0,
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'transparent',
                        position: 'relative',
                    }}
                >
                    {hasImages && (
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
                                {images.map((src, i) => (
                                    <Box
                                        key={i}
                                        sx={{
                                            flex: '0 0 100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '100%',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={src}
                                            alt=""
                                            sx={{
                                                display: 'block',
                                                maxWidth: '95vw',
                                                maxHeight: '90vh',
                                                objectFit: 'contain',
                                                m: 'auto',
                                                userSelect: 'none',
                                            }}
                                            draggable={false}
                                        />
                                    </Box>
                                ))}
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

                    {/* Prev/Next */}
                    {images.length > 1 && (
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
                        label={`${Math.round(100)}%`}
                        icon={<ZoomInIcon />}
                        sx={{
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            bottom: images.length > 1 ? 56 : 16,
                            zIndex: 3,
                            bgcolor: 'rgba(0, 0, 0, 0.6)',
                            color: '#fff',
                            fontWeight: 700,
                            pointerEvents: 'none',
                        }}
                    />
                </DialogContent>
            </Dialog>
        </>
    )
}
