import * as React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import {
    ThemeProvider,
    CssBaseline,
    Box,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Divider,
    ListSubheader,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import HomeIcon from '@mui/icons-material/Home'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import CategoryIcon from '@mui/icons-material/Category'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import PageHeader from './components/app/PageHeader.tsx'
import PageFooter from './components/app/PageFooter.tsx'
import Categories from './pages/Categories.tsx'
import Cards from './pages/Cards.tsx'
import Rankings from './pages/Rankings.tsx'
import Home from './pages/Home.tsx'
import theme from './theme'

const drawerWidth = 280 // a bit wider to breathe with icons

function NavigationList({ onNavigate }: { onNavigate?: () => void }) {
    const { pathname } = useLocation()

    const navItems = [
        {
            label: 'Home',
            to: '/',
            icon: <HomeIcon />,
            isActive: (p: string) => p == '/',
        },
        {
            label: 'Rankings',
            to: '/rankings',
            icon: <EmojiEventsIcon />,
            isActive: (p: string) => p.startsWith('/rankings'),
        },
        {
            label: 'Cards',
            to: '/cards',
            icon: <ViewModuleIcon />,
            isActive: (p: string) => p.startsWith('/cards'),
        },
        {
            label: 'Categories',
            to: '/categories',
            icon: <CategoryIcon />,
            isActive: (p: string) => p.startsWith('/categories'),
        },
    ]

    return (
        <List
            subheader={
                <ListSubheader
                    component="div"
                    sx={{
                        mb: 2,
                        lineHeight: 2.5,
                        color: (t) => t.palette.customColors.teal_2, // ✅ subheader color
                        fontWeight: 600,
                        letterSpacing: 0.4,
                        textTransform: 'uppercase',
                        bgcolor: theme.palette.customColors.grey_6,
                    }}
                >
                    Pages
                </ListSubheader>
            }
            sx={{
                py: 0,
                // Global styles for all list item buttons inside this list
                '& .MuiListItemButton-root': {
                    borderRadius: 1,
                    mx: 1,
                    my: 0.25,
                    color: (t) => t.palette.text.primary, // keep content color
                    textDecoration: 'none',

                    // Prevent anchor default link colors on states
                    '&:link, &:visited, &:hover, &:active, &:focus': {
                        color: 'inherit',
                        textDecoration: 'none',
                    },

                    // Ensure icons and text inherit the same color (don't turn purple)
                    '& .MuiListItemIcon-root, & .MuiSvgIcon-root, & .MuiListItemText-primary': {
                        color: 'inherit',
                    },

                    // 🟣 Hover: background only
                    '&:hover': {
                        bgcolor: (t) => t.palette.customColors.teal_5,
                    },

                    // 🟣 Selected: background only
                    '&.Mui-selected': {
                        bgcolor: (t) => t.palette.customColors.teal_4,
                    },
                    '&.Mui-selected:hover': {
                        bgcolor: (t) => t.palette.customColors.teal_4,
                    },
                },
            }}
        >
            {navItems.map((item) => (
                <ListItemButton
                    key={item.to}
                    component={Link}
                    to={item.to}
                    onClick={onNavigate}
                    selected={item.isActive(pathname)}
                >
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                </ListItemButton>
            ))}
        </List>
    )
}

function useScrollFade({ max = 240, minOpacity = 0.25 } = {}) {
    const [opacity, setOpacity] = React.useState(1)

    React.useEffect(() => {
        let raf = 0
        const onScroll = () => {
            if (raf) return
            raf = requestAnimationFrame(() => {
                const y = window.scrollY || window.pageYOffset || 0
                const next = Math.max(minOpacity, 1 - y / max)
                setOpacity(next)
                raf = 0
            })
        }

        window.addEventListener('scroll', onScroll, { passive: true })
        onScroll() // initialize at load
        return () => {
            window.removeEventListener('scroll', onScroll)
            if (raf) cancelAnimationFrame(raf)
        }
    }, [max, minOpacity])

    return opacity
}

export default function App() {
    const [drawerOpen, setDrawerOpen] = React.useState(false)

    const toggleDrawer = () => setDrawerOpen((prev) => !prev)
    const closeDrawer = () => setDrawerOpen(false)
    const bgOpacity = useScrollFade({ max: 300, minOpacity: 0.1 })

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                    {/* Top AppBar */}
                    <AppBar
                        position="fixed"
                        color="transparent"
                        elevation={0}
                        sx={{
                            zIndex: (t) => t.zIndex.drawer + 1,
                            // draw your gradient as a separate layer so only it fades
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                inset: 0,
                                zIndex: -1,
                                pointerEvents: 'none',
                                // same gradient as yours, but using rgba for clarity
                                backgroundImage:
                                    'linear-gradient(to right, rgba(22, 22, 22, 0.68), rgba(7, 197, 204, 0.59))',
                                opacity: bgOpacity, // 👈 fades with scroll
                                transition: 'opacity 160ms ease',
                            },
                            // optional “glass” look
                            backdropFilter: 'saturate(130%) blur(8px)',
                            WebkitBackdropFilter: 'saturate(130%) blur(8px)',
                            // optional subtle border so it doesn't completely vanish visually
                            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        <Toolbar>
                            <IconButton
                                color="inherit"
                                edge="start"
                                onClick={toggleDrawer}
                                sx={{ mr: 2 }}
                                aria-label="menu"
                            >
                                <MenuIcon />
                            </IconButton>
                            <Box component="img" src={`${import.meta.env.BASE_URL}logo.png`} width="64px"></Box>
                            <Typography variant="h6" noWrap component="div" fontFamily="">
                                Card Rankings
                            </Typography>
                        </Toolbar>
                    </AppBar>

                    {/* Overlay Drawer (temporary, on top, doesn't push content) */}
                    <Drawer
                        anchor="left"
                        variant="temporary"
                        open={drawerOpen}
                        onClose={closeDrawer}
                        ModalProps={{ keepMounted: true }} // better mobile performance
                        sx={{
                            '& .MuiDrawer-paper': {
                                width: drawerWidth,
                                boxSizing: 'border-box',
                                backgroundColor: 'rgba(0, 0, 0, 0.83)',
                            },
                        }}
                    >
                        {/* spacing under AppBar */}
                        <Toolbar />
                        <Box sx={{ px: 1, py: 1 }}>
                            <NavigationList onNavigate={closeDrawer} />
                            <Divider sx={{ my: 1.5 }} />
                            {/* You can add more sections here later (e.g., Settings, Help) */}
                        </Box>
                    </Drawer>

                    {/* Main content (no left margin; overlay drawer won't push this) */}
                    <Box
                        component="main"
                        sx={{
                            flexGrow: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start', // ⬆️ keep content at the top
                            alignItems: 'stretch',
                        }}
                    >
                        {/* spacer for AppBar height */}
                        <Toolbar />
                        <PageHeader />
                        <Box>
                            <Box sx={{ my: 4, mx: 12 }}>
                                <Routes>
                                    <Route path="/" element={<Home />} />
                                    <Route path="/rankings" element={<Rankings />} />
                                    <Route path="/cards" element={<Cards />} />
                                    <Route path="/categories" element={<Categories />} />
                                </Routes>
                            </Box>
                        </Box>
                        <PageFooter />
                    </Box>
                </Box>
            </Router>
        </ThemeProvider>
    )
}
