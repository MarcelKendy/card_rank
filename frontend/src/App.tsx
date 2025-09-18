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
import CreditCardIcon from '@mui/icons-material/CreditCard'
import CategoryIcon from '@mui/icons-material/Category'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import PageHeader from './components/PageHeader.tsx'
import PageFooter from './components/PageFooter.tsx'
import Categories from './pages/Categories.tsx'
import Cards from './pages/Cards.tsx'
import theme from './theme'

const drawerWidth = 280 // a bit wider to breathe with icons

function NavigationList({ onNavigate }: { onNavigate?: () => void }) {
    const { pathname } = useLocation()

    const navItems = [
        {
            label: 'Cards',
            to: '/cards',
            icon: <CreditCardIcon />,
            isActive: (p: string) => p.startsWith('/cards'),
        },
        {
            label: 'Categories',
            to: '/categories',
            icon: <CategoryIcon />,
            isActive: (p: string) => p.startsWith('/categories'),
        },
        {
            label: 'Rankings',
            to: '/rankings',
            icon: <EmojiEventsIcon />,
            isActive: (p: string) => p.startsWith('/rankings'),
        },
    ]

    return (
        <List
            subheader={
                <ListSubheader
                    component="div"
                    sx={{
                        lineHeight: 2.5,
                        color: (t) => t.palette.customColors.teal_2, // ✅ subheader color
                        fontWeight: 600,
                        letterSpacing: 0.4,
                        textTransform: 'uppercase',
                        bgcolor: 'transparent',
                    }}
                >
                    Navigation
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
                <Box sx={{ display: 'flex' }}>
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
                                    'linear-gradient(to right, rgba(0,102,97,1), rgba(3,162,190,0.65))',
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
                            <Typography variant="h6" noWrap component="div">
                                Card Rank
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
                                backgroundColor: (t) => t.palette.customColors.grey_6,
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

                        <Box sx={{ width: '100%', mx: 'auto', marginTop: 4 }}>
                            <PageHeader />
                            <Box sx={{ marginY: 6 }}>
                                <Routes>
                                    <Route path="/categories" element={<Categories />} />
                                     <Route path="/cards" element={<Cards />} /> 
                                    {/* <Route path="/rankings" element={<Rankings />} /> */}
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
