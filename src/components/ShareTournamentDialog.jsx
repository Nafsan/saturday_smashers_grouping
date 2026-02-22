import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Autocomplete,
    Box,
    Typography,
    IconButton,
    CircularProgress,
    ToggleButton,
    ToggleButtonGroup,
    Slider,
    useMediaQuery
} from '@mui/material';
import { X, Download, Copy, Share2, Upload, Trash2, ZoomIn, Move } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { toPng } from 'html-to-image';
import SharingImageTemplate from './SharingImageTemplate';
import { useToast } from '../context/ToastContext';
import './ShareTournamentDialog.scss';

const ShareTournamentDialog = ({ open, onClose, tournament }) => {
    const { successNotification, errorNotification } = useToast();
    const isMobile = useMediaQuery('(max-width:600px)');
    const imagePreviewRef = useRef(null);

    // Form State
    const [sharingMode, setSharingMode] = useState('overall'); // 'own' or 'overall'
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [playerAvatar, setPlayerAvatar] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Cropper State
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [tempImage, setTempImage] = useState(null);
    const [finalAvatar, setFinalAvatar] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState(null);

    // Load logo as Data URL for html-to-image stability
    useEffect(() => {
        const loadLogo = async () => {
            try {
                const baseUrl = import.meta.env.BASE_URL || '/';
                const logoPath = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}assets/logo.png`;
                const response = await fetch(logoPath);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => setLogoDataUrl(reader.result);
                reader.readAsDataURL(blob);
            } catch (err) {
                console.error("Failed to load logo for sharing", err);
            }
        };
        loadLogo();
    }, []);

    // Reset state on open/close
    useEffect(() => {
        if (!open) {
            setSharingMode('overall');
            setSelectedPlayer(null);
            setPlayerAvatar(null);
            setTempImage(null);
            setFinalAvatar(null);
            setShowCropper(false);
        }
    }, [open]);

    const tournamentPlayers = tournament ? tournament.ranks.flatMap(r => r.players) : [];

    const handleModeChange = (event, newMode) => {
        if (newMode !== null) {
            setSharingMode(newMode);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setTempImage(reader.result);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const getCroppedImg = async () => {
        try {
            const canvas = document.createElement('canvas');
            const img = new Image();
            img.src = tempImage;
            await new Promise((resolve) => (img.onload = resolve));

            const ctx = canvas.getContext('2d');
            canvas.width = croppedAreaPixels.width;
            canvas.height = croppedAreaPixels.height;

            ctx.drawImage(
                img,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                croppedAreaPixels.width,
                croppedAreaPixels.height
            );

            const base64Image = canvas.toDataURL('image/png');
            setFinalAvatar(base64Image);
            setShowCropper(false);
        } catch (e) {
            console.error(e);
            errorNotification("Failed to crop image");
        }
    };

    const generateImage = async () => {
        if (!imagePreviewRef.current) return;
        setIsGenerating(true);
        try {
            // Give time for any re-renders
            await new Promise(r => setTimeout(r, 100));
            const dataUrl = await toPng(document.getElementById('sharing-image-content'), {
                quality: 1,
                pixelRatio: 2, // Higher resolution
            });
            return dataUrl;
        } catch (err) {
            errorNotification("Image generation failed");
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async () => {
        const dataUrl = await generateImage();
        if (dataUrl) {
            const link = document.createElement('a');
            link.download = `Tournament_${tournament.date}.png`;
            link.href = dataUrl;
            link.click();
            successNotification("Image downloaded! 📥");
        }
    };

    const handleCopy = async () => {
        const dataUrl = await generateImage();
        if (dataUrl) {
            try {
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                successNotification("Copied to clipboard! 📋");
            } catch (err) {
                errorNotification("Clipboard copy failed");
            }
        }
    };

    const handleShare = async () => {
        const dataUrl = await generateImage();
        if (dataUrl && navigator.share) {
            try {
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                const file = new File([blob], 'tournament_result.png', { type: 'image/png' });
                await navigator.share({
                    files: [file],
                    title: 'Table Tennis Tournament Results',
                    text: `Check out the results of our tournament on ${tournament.date}!`
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    errorNotification("Sharing failed");
                }
            }
        } else {
            successNotification("Sharing not supported on this browser. Try Download or Copy instead.");
        }
    };

    if (!tournament) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            className="share-dialog"
            PaperProps={{
                sx: { borderRadius: '16px', overflow: 'hidden' }
            }}
        >
            <DialogTitle sx={{
                background: 'var(--gradient-primary)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Share2 size={24} />
                    Share Results
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <X />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: isMobile ? 2 : 3 }}>
                <div className="share-layout">
                    <div className="share-controls">
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: 'var(--text-secondary)' }}>
                                SHARING MODE
                            </Typography>
                            <ToggleButtonGroup
                                value={sharingMode}
                                exclusive
                                onChange={handleModeChange}
                                fullWidth
                                size="small"
                                sx={{ mb: 2 }}
                            >
                                <ToggleButton value="overall">Overall Results</ToggleButton>
                                <ToggleButton value="own">Individual Result</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        {sharingMode === 'own' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                                <Autocomplete
                                    options={tournamentPlayers}
                                    value={selectedPlayer}
                                    onChange={(e, newValue) => setSelectedPlayer(newValue)}
                                    renderInput={(params) => <TextField {...params} label="Select Player" variant="outlined" />}
                                    size="small"
                                />

                                <Box className="avatar-upload-container">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        id="avatar-upload"
                                        hidden
                                        onChange={handleImageUpload}
                                    />
                                    <label htmlFor="avatar-upload">
                                        <Button
                                            component="span"
                                            variant="outlined"
                                            fullWidth
                                            startIcon={<Upload size={18} />}
                                            sx={{ borderStyle: 'dashed' }}
                                        >
                                            Upload Avatar Image
                                        </Button>
                                    </label>

                                    {finalAvatar && (
                                        <div className="avatar-preview-mini">
                                            <img src={finalAvatar} alt="Preview" />
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => { setFinalAvatar(null); setTempImage(null); }}
                                                className="remove-btn"
                                            >
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </div>
                                    )}
                                </Box>
                            </Box>
                        )}

                        <div className="action-buttons">
                            <Button
                                variant="contained"
                                startIcon={<Download size={18} />}
                                fullWidth
                                onClick={handleDownload}
                                disabled={isGenerating}
                            >
                                Download Image
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<Copy size={18} />}
                                fullWidth
                                onClick={handleCopy}
                                disabled={isGenerating}
                            >
                                Copy to Clipboard
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<Share2 size={18} />}
                                fullWidth
                                onClick={handleShare}
                                disabled={isGenerating}
                            >
                                Social Share
                            </Button>
                        </div>
                    </div>

                    <div className="share-preview-area">
                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'var(--text-secondary)', textAlign: 'center' }}>
                            PREVIEW
                        </Typography>
                        <div className="preview-scale-wrapper">
                            <div ref={imagePreviewRef} className="preview-container">
                                <SharingImageTemplate
                                    tournamentDate={tournament.date}
                                    sharingMode={sharingMode}
                                    playerName={selectedPlayer}
                                    playerAvatar={finalAvatar || logoDataUrl}
                                    ranks={tournament.ranks}
                                    highlightPlayer={selectedPlayer}
                                    logoUrl={logoDataUrl}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>

            {/* Cropper Modal */}
            <Dialog open={showCropper} onClose={() => setShowCropper(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Adjust Avatar</DialogTitle>
                <DialogContent sx={{ height: 400, position: 'relative', overflow: 'hidden' }}>
                    <Cropper
                        image={tempImage}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, flexDirection: 'column', alignItems: 'stretch' }}>
                    <Box sx={{ px: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <ZoomIn size={18} />
                        <Slider
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            onChange={(e, zoom) => setZoom(zoom)}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button onClick={() => setShowCropper(false)}>Cancel</Button>
                        <Button variant="contained" onClick={getCroppedImg}>Confirm</Button>
                    </Box>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};

export default ShareTournamentDialog;
