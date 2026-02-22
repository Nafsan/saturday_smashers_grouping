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
    Divider,
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
        <footer className="app-footer">
            <Container maxWidth="lg">
                <Grid container spacing={4} justifyContent="space-between">
                    {/* Brand Section */}
                    <Grid item xs={12} md={5}>
                        <Box className="footer-section brand-section">
                            <Box className="logo-group">
                                <img src={`${basename}assets/logo.png`} alt="Logo" className="footer-logo" />
                                <Box>
                                    <Typography variant="h6" className="brand-name">Saturday Smashers</Typography>
                                    <Typography variant="caption" className="brand-subtitle">Private Community Group</Typography>
                                </Box>
                            </Box>
                            <Typography variant="body2" className="description">
                                A premier community for table tennis enthusiasts. We focus on weekly rankings, 
                                competitive play, and fostering a spirit of sportsmanship among our members.
                            </Typography>
                            <Box className="social-row">
                                <IconButton component="a" href="https://www.facebook.com/nafsanVai" target="_blank" size="small" className="social-btn fb"><Facebook size={18} /></IconButton>
                                <IconButton component="a" href="https://www.youtube.com/@PongTTT-bd" target="_blank" size="small" className="social-btn yt"><Youtube size={18} /></IconButton>
                                <IconButton component="a" href="https://www.linkedin.com/in/mdshafiqulislamnafsan/" target="_blank" size="small" className="social-btn li"><Linkedin size={18} /></IconButton>
                            </Box>
                        </Box>
                    </Grid>

                    {/* Quick Info & Contact */}
                    <Grid item xs={12} md={6}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <Box className="footer-section">
                                    <Typography variant="subtitle2" className="section-header">Contact</Typography>
                                    <Typography variant="body2" className="admin-name">Md. Shafiqul Islam Nafsan</Typography>
                                    <Box className="contact-links">
                                        <Link href="mailto:iamnafsan@gmail.com" className="con-link"><Mail size={14} /> iamnafsan@gmail.com</Link>
                                        <Link href="tel:01521436290" className="con-link"><Phone size={14} /> +880 1521 436290</Link>
                                        <Typography variant="caption" className="loc"><MapPin size={12} /> Dhaka, Bangladesh</Typography>
                                    </Box>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Box className="footer-section">
                                    <Typography variant="subtitle2" className="section-header">Resources</Typography>
                                    <Box className="legal-links-v2">
                                        <Box className="legal-btn" onClick={() => setOpenPrivacy(true)}><Shield size={14} /> Privacy Policy</Box>
                                        <Box className="legal-btn" onClick={() => setOpenTerms(true)}><FileText size={14} /> Terms of Service</Box>
                                        <Link href="https://github.com/Nafsan" target="_blank" className="gh-link">
                                            <Github size={14} /> Source Code <ExternalLink size={10} />
                                        </Link>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>

                <Divider className="footer-divider" />

                <Box className="footer-bottom-v2">
                    <Typography variant="caption" className="copy-text">
                        © {currentYear} Saturday Smashers Group. All rights reserved.
                    </Typography>
                    <Box className="dev-credit">
                        <Typography variant="caption">Crafted by </Typography>
                        <Link href="https://github.com/Nafsan" target="_blank" className="dev-link">Nafsan <Github size={12} /></Link>
                    </Box>
                </Box>
            </Container>

            <Box className={`back-to-top-v2 ${showScrollTop ? 'visible' : ''}`} onClick={scrollToTop}>
                <ArrowUp size={20} />
            </Box>

            {/* Modals */}
            <Dialog open={openPrivacy} onClose={() => setOpenPrivacy(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle sx={{ fontWeight: 800, color: 'var(--accent-primary)' }}>Privacy Policy</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" paragraph>
                        <strong>Data Collection:</strong> We collect minimal data (names and performance stats) to manage group rankings.
                    </Typography>
                    <Typography variant="body2" paragraph>
                        <strong>Data Usage:</strong> Information is used only for the ranking calculations and is never shared with third parties.
                    </Typography>
                    <Typography variant="body2">
                        <strong>Storage:</strong> Data is secured using industry-standard encryption via Supabase.
                    </Typography>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenPrivacy(false)}>Close</Button></DialogActions>
            </Dialog>

            <Dialog open={openTerms} onClose={() => setOpenTerms(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle sx={{ fontWeight: 800, color: 'var(--accent-primary)' }}>Terms of Service</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" paragraph>
                        <strong>Membership:</strong> restricted to active Saturday Smashers participants.
                    </Typography>
                    <Typography variant="body2" paragraph>
                        <strong>Rankings:</strong> Ratings are calculated based on official group tournament outcomes.
                    </Typography>
                    <Typography variant="body2">
                        <strong>Conduct:</strong> Members must adhere to the group's code of ethics and sportsmanship.
                    </Typography>
                </DialogContent>
                <DialogActions><Button variant="contained" onClick={() => setOpenTerms(false)}>I Agree</Button></DialogActions>
            </Dialog>
        </footer>
    );
};

export default Footer;
