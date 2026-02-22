import React, { useState, useEffect } from 'react';
import { 
    Facebook, 
    Youtube, 
    Linkedin, 
    Mail, 
    Phone, 
    MapPin,
    ArrowUp,
    Shield,
    FileText,
    Github,
    ExternalLink
} from 'lucide-react';
import { 
    Box, 
    Container, 
    Grid, 
    Typography, 
    IconButton, 
    Link, 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button
} from '@mui/material';
import './Footer.scss';

const Footer = () => {
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [openPrivacy, setOpenPrivacy] = useState(false);
    const [openTerms, setOpenTerms] = useState(false);
    const basename = import.meta.env.BASE_URL || '/';

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const currentYear = new Date().getFullYear();

    return (
        <footer className="app-footer-compact">
            <Container maxWidth="lg">
                <Grid container spacing={3} alignItems={{ xs: 'center', md: 'flex-start' }} justifyContent="space-between">
                    {/* Brand Section - Minimal */}
                    <Grid item xs={12} md={4}>
                        <Box className="footer-col-brand">
                            <Box className="logo-group-inline">
                                <img src={`${basename}assets/logo.png`} alt="Logo" className="footer-logo-sm" />
                                <Typography variant="h6" className="brand-name-sm">Saturday Smashers</Typography>
                            </Box>
                            <Typography variant="caption" className="brand-desc-sm">
                                Private group for table tennis enthusiasts. Weekly rankings & competitive spirits.
                            </Typography>
                            <Box className="copyright-inline">
                                <Typography variant="caption" color="textSecondary">© {currentYear} Saturday Smashers Group</Typography>
                            </Box>
                        </Box>
                    </Grid>

                    {/* Contact & Socials - Combined & Compact */}
                    <Grid item xs={12} sm={6} md={4}>
                        <Box className="footer-col-contact">
                            <Typography variant="overline" className="col-header-sm">Contact & Community</Typography>
                            <Box className="compact-links-grid">
                                <Box className="link-pair">
                                    <Link href="mailto:iamnafsan@gmail.com" className="icon-link-sm"><Mail size={14} /> iamnafsan@gmail.com</Link>
                                    <Link href="tel:01521436290" className="icon-link-sm"><Phone size={14} /> 01521436290</Link>
                                </Box>
                                <Box className="social-mini-row">
                                    <IconButton component="a" href="https://www.facebook.com/nafsanVai" target="_blank" size="small" className="social-mini-btn fb"><Facebook size={14} /></IconButton>
                                    <IconButton component="a" href="https://www.linkedin.com/in/mdshafiqulislamnafsan/" target="_blank" size="small" className="social-mini-btn li"><Linkedin size={14} /></IconButton>
                                    <IconButton component="a" href="https://www.youtube.com/@PongTTT-bd" target="_blank" size="small" className="social-mini-btn yt"><Youtube size={14} /></IconButton>
                                </Box>
                            </Box>
                        </Box>
                    </Grid>

                    {/* Resources & Support */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Box className="footer-col-info">
                            <Typography variant="overline" className="col-header-sm">Resources</Typography>
                            <Box className="legal-v3">
                                <Box className="legal-v3-row">
                                    <Box className="legal-text-btn" onClick={() => setOpenPrivacy(true)}>Privacy</Box>
                                    <Box className="legal-text-btn" onClick={() => setOpenTerms(true)}>Terms</Box>
                                </Box>
                                <Link href="https://github.com/Nafsan/saturday_smashers_grouping" target="_blank" className="gh-link-sm">
                                    <Github size={14} /> Source <ExternalLink size={10} />
                                </Link>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </Container>

            <Box className={`back-to-top-compact ${showScrollTop ? 'visible' : ''}`} onClick={scrollToTop}>
                <ArrowUp size={18} />
            </Box>

            {/* Modals */}
            <Dialog open={openPrivacy} onClose={() => setOpenPrivacy(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem' }}>Privacy Policy</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="caption" display="block" color="textSecondary" sx={{ mb: 1 }}>
                        Minimal player data is collected for ranking calculations within this private group. Data is not shared externally.
                    </Typography>
                </DialogContent>
                <DialogActions><Button size="small" onClick={() => setOpenPrivacy(false)}>Close</Button></DialogActions>
            </Dialog>

            <Dialog open={openTerms} onClose={() => setOpenTerms(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem' }}>Terms of Service</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="caption" display="block" color="textSecondary" sx={{ mb: 1 }}>
                        Access is for Saturday Smashers members only. Ranking adjustments are based on tournament outcomes.
                    </Typography>
                </DialogContent>
                <DialogActions><Button size="small" onClick={() => setOpenTerms(false)}>Close</Button></DialogActions>
            </Dialog>
        </footer>
    );
};

export default Footer;
