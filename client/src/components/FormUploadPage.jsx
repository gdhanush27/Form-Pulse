import React, { useState } from 'react';
import {API_URL} from '../backend_url.js'; 
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Container,
  IconButton,
  InputAdornment
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import axios from 'axios';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

const FormUploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [formName, setFormName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formLink, setFormLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [user] = useAuthState(auth);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file?.type === 'application/json') {
      setSelectedFile(file);
      setError('');
      if (!formName) {
        setFormName(file.name.replace(/\.[^/.]+$/, ''));
      }
    } else {
      setError('Please select a JSON file');
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setFormLink('');

    if (!selectedFile || !formName) {
      setError('Please select a file and enter a form name');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('form_name', formName);

    try {
      const response = await axios.post('https://harshanpvtserver.duckdns.org/form-pulse/upload-form', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });

      // Generate shareable link
      const generatedLink = `${window.location.origin}/form/${encodeURIComponent(formName)}`;
      setFormLink(generatedLink);
      
      setSuccess('Form created successfully!');
      setSelectedFile(null);
      setFormName('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Form creation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(formLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link to clipboard');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Create New Form
        </Typography>

        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 3 }}>
            <input
              accept=".json"
              style={{ display: 'none' }}
              id="contained-button-file"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="contained-button-file">
              <Button
                variant="contained"
                component="span"
                startIcon={<CloudUploadIcon />}
                fullWidth
                sx={{ py: 2 }}
              >
                Select JSON File
              </Button>
            </label>
            {selectedFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected file: {selectedFile.name}
              </Typography>
            )}
          </Box>

          <TextField
            label="Form Name"
            variant="outlined"
            fullWidth
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            sx={{ mb: 3 }}
            helperText="Enter a unique name for your form"
          />

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
              {formLink && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" component="div">
                    Shareable Link:
                  </Typography>
                  <TextField
                    value={formLink}
                    fullWidth
                    variant="outlined"
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleCopyLink}
                            color={isCopied ? 'success' : 'default'}
                          >
                            <ContentCopyIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      mt: 1,
                      '& .MuiOutlinedInput-root': {
                        pr: 0.5,
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {isCopied ? 'Link copied to clipboard!' : 'Click icon to copy link'}
                  </Typography>
                </Box>
              )}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || !selectedFile || !formName}
            fullWidth
            sx={{ py: 1.5 }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Create Form'
            )}
          </Button>
        </form>
      </Paper>

      <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          JSON Format Example
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your JSON file should follow this structure:
        </Typography>
        <pre style={{ 
          backgroundColor: '#f5f5f5',
          padding: '1rem',
          borderRadius: '4px',
          overflowX: 'auto',
          marginTop: '1rem'
        }}>
          {`{
  "questions": [
    {
      "question": "What is the capital of France?",
      "options": ["London", "Paris", "Berlin"],
      "correct_answer": "Paris",
      "marks": 2
    },
    {
      "question": "Which planet is closest to the Sun?",
      "options": ["Venus", "Mars", "Mercury"],
      "correct_answer": "Mercury",
      "marks": 3
    }
  ]
}`}
        </pre>
      </Box>
    </Container>
  );
};

export default FormUploadPage;