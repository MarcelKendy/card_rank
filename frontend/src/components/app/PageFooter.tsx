import { Box, Container, Stack, Typography, IconButton, Tooltip } from '@mui/material'
import InstagramIcon from '@mui/icons-material/Instagram'
import YouTubeIcon from '@mui/icons-material/YouTube'
import GitHubIcon from '@mui/icons-material/GitHub'
import LinkedInIcon from '@mui/icons-material/LinkedIn'

/**
 * PageFooter
 * - Responsive footer with social links and location
 * - Works in light/dark themes with no custom theme fields
 * - Place as the last child in a flex column container with minHeight: '100vh'
 * - mt: 'auto' keeps it at the bottom when content is short
 */
export default function PageFooter() {
    const year = new Date().getFullYear()

    return (
        <Box
            component="footer"
            role="contentinfo"
            sx={(theme) => ({
                mt: 'auto',
                py: 0,
                borderTop: `1px solid ${theme.palette.divider}`,
                bgcolor:
                    theme.palette.mode === 'dark'
                        ? theme.palette.background.default
                        : theme.palette.grey[100],
            })}
        >
            <Container maxWidth="xl">
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={{ xs: 2, sm: 4 }}
                    sx={{ py: 0 }}
                >
                    {/* Left: location + year */}
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={{ xs: 2, sm: 4 }}
                    >
                        <Box component="img" src={`${import.meta.env.BASE_URL}logo.png`} width="150px"></Box>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                textAlign: {
                                    xs: 'center',
                                    sm: 'left',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                },
                            }}
                        >
                            © {year} Card Rankings • São Gotardo - MG
                        </Typography>
                    </Stack>

                    {/* Right: social icons */}
                    <Stack direction="row" spacing={2}>
                        <Tooltip title="Instagram">
                            <IconButton
                                href="https://www.instagram.com/marcel.matsumoto"
                                target="_blank"
                                aria-label="Instagram"
                            >
                                <InstagramIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Youtube">
                            <IconButton
                                href="https://www.youtube.com/@marcelkendymatsumoto"
                                target="_blank"
                                aria-label="Youtube"
                            >
                                <YouTubeIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="GitHub">
                            <IconButton
                                href="https://www.github.com/MarcelKendy"
                                target="_blank"
                                aria-label="GitHub"
                            >
                                <GitHubIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Linkedin">
                            <IconButton
                                href="https://br.linkedin.com/in/marcelkendymatsumoto"
                                target="_blank"
                                aria-label="LinkedIn"
                            >
                                <LinkedInIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Container>
        </Box>
    )
}
