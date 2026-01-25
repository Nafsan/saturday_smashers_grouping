import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Alert, IconButton, Paper, Divider, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import { Plus, Trash2, Image as ImageIcon, Upload, Edit, RefreshCw } from 'lucide-react';

const AddNews = () => {
    // Form State
    const [id, setId] = useState(null); // For updates
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrls, setImageUrls] = useState([]); // List of strings (URLs)
    const [files, setFiles] = useState([]); // List of File objects for upload

    // UI State
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [newsList, setNewsList] = useState([]);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchNews();
    }, []);

    const fetchNews = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${API_URL}/news/`);
            if (response.ok) {
                const data = await response.json();
                setNewsList(data);
            }
        } catch (error) {
            console.error("Failed to fetch news list", error);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles([...files, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const removeExistingUrl = (index) => {
        setImageUrls(imageUrls.filter((_, i) => i !== index));
    };

    const uploadFiles = async () => {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const uploadedUrls = [];

        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch(`${API_URL}/news/upload`, {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    uploadedUrls.push(data.url);
                } else {
                    throw new Error('Upload failed');
                }
            } catch (error) {
                console.error("File upload error", error);
                throw error;
            }
        }
        return uploadedUrls;
    };

    const resetForm = () => {
        setId(null);
        setTitle('');
        setDescription('');
        setImageUrls([]);
        setFiles([]);
        setIsEditing(false);
        setStatus({ type: '', message: '' });
    };

    const handleEdit = (item) => {
        setId(item.id);
        setTitle(item.title);
        setDescription(item.description);
        setImageUrls(item.image_urls || []);
        setFiles([]); // Reset new files
        setIsEditing(true);
        setStatus({ type: 'info', message: 'Editing mode: Update below' });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (itemId) => {
        if (!window.confirm("Are you sure you want to delete this news item?")) return;

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${API_URL}/news/${itemId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchNews(); // Refresh list
                if (id === itemId) resetForm(); // Reset form if deleting currently edited item
            } else {
                alert("Failed to delete item");
            }
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });

        // Basic validation
        if (!title.trim() || !description.trim()) {
            setStatus({ type: 'error', message: 'Title and description are required.' });
            setLoading(false);
            return;
        }

        const wordCount = description.trim().split(/\s+/).filter(w => w.length > 0).length;
        if (wordCount > 100) {
            setStatus({ type: 'error', message: `Description too long (${wordCount}/100 words).` });
            setLoading(false);
            return;
        }

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            // 1. Upload new files first
            let finalImageUrls = [...imageUrls];
            if (files.length > 0) {
                const newUrls = await uploadFiles();
                finalImageUrls = [...finalImageUrls, ...newUrls];
            }

            // 2. Create or Update Achievement
            const payload = {
                title,
                description,
                date: new Date().toISOString().split('T')[0],
                image_urls: finalImageUrls
            };

            let response;
            if (isEditing && id) {
                response = await fetch(`${API_URL}/news/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                response = await fetch(`${API_URL}/news/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            if (response.ok) {
                setStatus({ type: 'success', message: `News ${isEditing ? 'updated' : 'published'} successfully!` });
                resetForm();
                fetchNews(); // Refresh list
            } else {
                const errorData = await response.json();
                setStatus({ type: 'error', message: errorData.detail || 'Operation failed.' });
            }
        } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: 'Network or upload error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box className="add-news-container" sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
            <Typography variant="h5" sx={{ mb: 3, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon size={24} /> {isEditing ? 'Edit News' : 'Add News / Achievement'}
            </Typography>

            {status.message && (
                <Alert severity={status.type} sx={{ mb: 3 }}>
                    {status.message}
                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                <TextField
                    fullWidth
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    sx={{ mb: 3 }}
                    required
                    InputLabelProps={{ style: { color: '#94a3b8' } }}
                    InputProps={{ style: { color: 'white' } }}
                />

                <TextField
                    fullWidth
                    label={`Description (${description.trim().split(/\s+/).filter(w => w.length > 0).length}/100 words)`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={4}
                    sx={{ mb: 3 }}
                    required
                    helperText="Max 100 words"
                    InputLabelProps={{ style: { color: '#94a3b8' } }}
                    InputProps={{ style: { color: 'white' } }}
                    FormHelperTextProps={{ style: { color: '#64748b' } }}
                />

                <Typography variant="subtitle1" sx={{ mb: 1, color: '#94a3b8' }}>
                    Images
                </Typography>

                {/* Existing Images (for edit mode) */}
                {imageUrls.map((url, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, bgcolor: 'rgba(255,255,255,0.05)', p: 1, borderRadius: 1 }}>
                        <img src={url.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${url}` : url} alt="Preview" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                        <Typography variant="caption" sx={{ color: '#ccc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {url.split('/').pop()}
                        </Typography>
                        <IconButton onClick={() => removeExistingUrl(index)} color="error" size="small">
                            <Trash2 size={16} />
                        </IconButton>
                    </Box>
                ))}

                {/* New File Uploads */}
                {files.map((file, index) => (
                    <Box key={`file-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, bgcolor: 'rgba(56, 189, 248, 0.1)', p: 1, borderRadius: 1 }}>
                        <Upload size={16} color="#38bdf8" />
                        <Typography variant="caption" sx={{ color: '#38bdf8', flex: 1 }}>
                            {file.name}
                        </Typography>
                        <IconButton onClick={() => removeFile(index)} color="error" size="small">
                            <Trash2 size={16} />
                        </IconButton>
                    </Box>
                ))}

                <Button
                    component="label"
                    startIcon={<Plus size={18} />}
                    sx={{ mb: 4, color: '#38bdf8' }}
                >
                    Select Images
                    <input
                        type="file"
                        hidden
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </Button>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    {isEditing && (
                        <Button
                            variant="outlined"
                            onClick={resetForm}
                            fullWidth
                            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                        >
                            Cancel Edit
                        </Button>
                    )}
                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={loading}
                        size="large"
                        sx={{
                            background: isEditing ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            fontWeight: 'bold'
                        }}
                    >
                        {loading ? 'Processing...' : (isEditing ? 'Update News' : 'Publish News')}
                    </Button>
                </Box>
            </form>

            <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Typography variant="h6" sx={{ mb: 2, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Manage Posts ({newsList.length})</span>
                <IconButton onClick={fetchNews} size="small" sx={{ color: '#94a3b8' }}>
                    <RefreshCw size={16} />
                </IconButton>
            </Typography>

            <List sx={{ bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                {newsList.map((item) => (
                    <React.Fragment key={item.id}>
                        <ListItem alignItems="flex-start">
                            <ListItemText
                                primary={
                                    <Typography sx={{ color: 'white', fontWeight: 500 }}>
                                        {item.title}
                                    </Typography>
                                }
                                secondary={
                                    <React.Fragment>
                                        <Typography sx={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', mt: 0.5 }}>
                                            {new Date(item.date).toLocaleDateString()}
                                        </Typography>
                                        <Typography sx={{ display: 'block', color: '#64748b', fontSize: '0.8rem', mt: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.description}
                                        </Typography>
                                    </React.Fragment>
                                }
                            />
                            <ListItemSecondaryAction>
                                <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(item)} sx={{ color: '#38bdf8', mr: 1 }}>
                                    <Edit size={18} />
                                </IconButton>
                                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(item.id)} sx={{ color: '#f87171' }}>
                                    <Trash2 size={18} />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                        <Divider component="li" sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                    </React.Fragment>
                ))}
                {newsList.length === 0 && (
                    <ListItem>
                        <ListItemText primary={<Typography sx={{ color: '#94a3b8', textAlign: 'center' }}>No posts yet.</Typography>} />
                    </ListItem>
                )}
            </List>
        </Box>
    );
};

export default AddNews;
