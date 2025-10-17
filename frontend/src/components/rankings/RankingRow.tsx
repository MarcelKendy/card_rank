// components/rankings/RankingRow.tsx
import { Box, Paper, Stack, IconButton, Typography, Chip, Tooltip, Avatar } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import StarIcon from '@mui/icons-material/Star'
import type { Ranking } from './types'
import type { Category } from '../cards/types'
import { parseFilters, TITLE_SHADOW, extractFirstImageUrl } from './utils'

type Props = {
    ranking: Ranking
    allCategories: Category[]
    onOpen: () => void
    onEdit: () => void
    onAskDelete: () => void
}

export default function RankingRow({ ranking, allCategories, onOpen, onEdit, onAskDelete }: Props) {
    const theme = useTheme()
    const filters = parseFilters(ranking.filters)
    const catIds = filters.category_ids ?? []
    const cats = catIds
        .map((id) => allCategories.find((c) => c.id === id))
        .filter(Boolean) as Category[]
    const rating = filters.rating ?? null
    const op = filters.rating_param ?? 'eq'
    const firstImg = extractFirstImageUrl(ranking.image_url)

    return (
        <Paper
            variant="outlined"
            sx={(t) => ({
                p: 1.5,
                display: 'grid',
                gridTemplateColumns: '128px 1fr auto',
                gap: 2,
                alignItems: 'center',
                bgcolor: t.palette.customColors?.grey_6 ?? t.palette.background.paper,
                border: `1px solid ${t.palette.divider}`,
                cursor: 'pointer',
                boxShadow: t.shadows[24],
                '&:hover': { boxShadow: t.shadows[1] },
                height: '100%',
                minHeight: 164,
            })}
            onClick={onOpen}
        >
            {/* LEFT: image */}
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundImage: firstImg ? `url("${firstImg}")` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    bgcolor: firstImg ? 'transparent' : 'action.hover',
                }}
            />

            {/* CENTER: text & chips */}
            <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={700} noWrap title={ranking.name}>
                    {ranking.name}
                </Typography>

                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: 72,
                    }}
                    title={ranking.description ?? undefined}
                >
                    {ranking.description}
                </Typography>

                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                    {cats.length > 0 ? (
                        cats.map((cat) => (
                            <Chip
                                key={cat.id}
                                size="small"
                                label={cat.name}
                                sx={(t) => {
                                    const bg = cat.color ?? (t.palette.action.selected as string)
                                    const contrast =
                                        t.palette.getContrastText(bg) === '#fff' ? '#fff' : '#000'
                                    return {
                                        bgcolor: bg,
                                        color: contrast,
                                        textShadow: contrast === '#000' ? 'none' : TITLE_SHADOW,
                                        boxShadow:
                                            'rgba(0, 0, 0, 0.24) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;',
                                        border: 'solid 1px rgba(255, 255, 255, 0.4)',
                                    }
                                }}
                            />
                        ))
                    ) : (
                        <Chip size="small" label="No categories" variant="outlined" />
                    )}

                    {rating != null && (
                        <Chip
                            icon={<StarIcon sx={{ color: 'black !important' }} />}
                            sx={{
                                backgroundColor: theme.palette.customColors.yellow_4,
                                fontWeight: 600,
                                color: 'black',
                            }}
                            size="small"
                            label={`Rating ${op === 'lte' ? '≤' : op === 'gte' ? '≥' : '='} ${rating}/10`}
                            variant="outlined"
                        />
                    )}

                    <Typography sx={{ fontSize: '15px' }}>
                        <Box component="strong" sx={{ mr: 1, textShadow: '1px 1px black' }}>
                            Tiers:
                        </Box>
                        {(ranking.tiers ?? 'S;A;B').split(';').map((t, i) => (
                            <Chip
                                key={t + i}
                                label={t.length > 30 ? t.slice(0, 27) + '...' : t}
                                size="small"
                                avatar={
                                    <Avatar
                                        sx={{
                                            backgroundColor: theme.palette.customColors.grey_3,
                                            color: 'rgba(32, 32, 32, 1) !important',
                                            fontWeight: 900,
                                            fontSize: '14px !important',
                                        }}
                                    >
                                        {i + 1}
                                    </Avatar>
                                }
                                sx={{ mt: 0.5, mr: 1 }}
                            />
                        ))}
                    </Typography>
                </Stack>
            </Stack>

            {/* RIGHT: actions */}
            <Stack
                direction="row"
                spacing={0.5}
                onClick={(e) => e.stopPropagation()}
                alignSelf="flex-start"
            >
                <Tooltip title="Edit ranking">
                    <IconButton size="small" color="warning" onClick={onEdit}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete ranking">
                    <IconButton size="small" color="error" onClick={onAskDelete}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>
        </Paper>
    )
}
