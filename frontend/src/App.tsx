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
import Categories from './pages/Categories.tsx'
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

export default function App() {
    const [drawerOpen, setDrawerOpen] = React.useState(false)

    const toggleDrawer = () => setDrawerOpen((prev) => !prev)
    const closeDrawer = () => setDrawerOpen(false)

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Box sx={{ display: 'flex' }}>
                    {/* Top AppBar */}
                    <AppBar
                        position="fixed"
                        sx={{
                            zIndex: (t) => t.zIndex.drawer + 1, // keep AppBar above non-modal content
                            backgroundImage: 'linear-gradient(to right, #006661ff, #03a2bea6)'
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
                        
                        <Box sx={{ mb: 2 }}>
                            <PageHeader />
                        </Box>

                        
                        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
                            <Routes>
                                <Route path="/categories" element={<Categories />} />
                                {/* <Route path="/cards" element={<Cards />} /> */}
                                {/* <Route path="/rankings" element={<Rankings />} /> */}
                            </Routes>
                        </Box>

                    </Box>
                </Box>
            </Router>
        </ThemeProvider>
    )
}
