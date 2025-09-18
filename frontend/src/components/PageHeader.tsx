import React from 'react'
import { Box, Typography, Breadcrumbs, Link, Container } from '@mui/material'
import HomeIcon from '@mui/icons-material/Home'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import CategoryIcon from '@mui/icons-material/Category'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { useLocation, Link as RouterLink } from 'react-router-dom'

// Keep config with literal keys for strict typing + autocomplete
const pageConfig = {
    '/cards': { label: 'Cards', icon: <CreditCardIcon fontSize="large" /> },
    '/categories': { label: 'Categories', icon: <CategoryIcon fontSize="large" /> },
    '/rankings': { label: 'Rankings', icon: <EmojiEventsIcon fontSize="large" /> },
} as const

type PageKey = keyof typeof pageConfig
type PageMeta = (typeof pageConfig)[PageKey]

/**
 * Resolve the page meta by exact match, then by longest matching prefix.
 * Example: "/categories/123" -> "/categories"
 */
function resolvePage(pathname: string): PageMeta | undefined {
    const keys = Object.keys(pageConfig) as PageKey[]

    // Exact match first
    const exact = keys.find((k) => pathname === k)
    if (exact) return pageConfig[exact]

    // Then longest prefix match (require "/" boundary to avoid false positives)
    const prefix = keys
        .filter((k) => pathname === k || pathname.startsWith(k + '/'))
        .sort((a, b) => b.length - a.length)[0]

    return prefix ? pageConfig[prefix] : undefined
}

export default function PageHeader() {
    const { pathname } = useLocation()

    // 👇 Hide header on home ("/")
    if (pathname === '/' || pathname === '') {
        return null
    }

    const currentPage = resolvePage(pathname)
    const page = currentPage ?? { label: 'Overview', icon: <HomeIcon fontSize="large" /> }

    return (
        <Box sx={{ borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
            <Container maxWidth="xl">
                <Box
                    sx={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: 3,
                        py: 2,
                        // If this sits under a fixed AppBar and you already render a <Toolbar /> spacer,
                        // keep mt at 0. If it's placed elsewhere under the AppBar, adjust as needed.
                        mt: 0,
                        backgroundColor: (t) => t.palette.background.default,
                    }}
                >
                    {/* Left: Page Title */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {page.icon}
                        <Typography variant="h5" fontWeight={600}>
                            {page.label}
                        </Typography>
                    </Box>

                    {/* Right: Breadcrumbs */}
                    <Breadcrumbs aria-label="breadcrumb">
                        <Link
                            component={RouterLink}
                            to="/"
                            underline="hover"
                            color="inherit"
                            sx={{ display: 'flex', alignItems: 'center' }}
                        >
                            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                            Home
                        </Link>

                        <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                            {/* Clone the icon to make it aligned within the crumb */}
                            {React.cloneElement(page.icon, {
                                sx: { mr: 0.5 },
                                fontSize: 'inherit',
                            })}
                            {page.label}
                        </Typography>
                    </Breadcrumbs>
                </Box>
            </Container>
        </Box>
    )
}
