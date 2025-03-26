import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Tooltip,
  Snackbar
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import axios from 'axios';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { Link as RouterLink } from 'react-router-dom';

const AdminPage = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [user] = useAuthState(auth);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoading(true);
        const token = await user.getIdToken();
        const response = await axios.get('http://localhost:8000/my-forms', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setForms(response.data.forms);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load forms');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchForms();
  }, [user]);

  const handleCopyLink = async (formName) => {
    try {
      const formLink = `${window.location.origin}/form/${encodeURIComponent(formName)}`;
      await navigator.clipboard.writeText(formLink);
      setSnackbarMessage('Form link copied to clipboard!');
      setSnackbarOpen(true);
    } catch (err) {
      setError('Failed to copy link to clipboard');
    }
  };

  const handleExport = async (formName) => {
    try {
      const token = await user.getIdToken();
      const response = await axios.get(
        `http://localhost:8000/submissions/${formName}/export`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${formName}_submissions.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export submissions');
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  if (loading) {
    return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;
  }

  if (error) {
    return <Alert severity="error" sx={{ maxWidth: 600, margin: '2rem auto' }}>{error}</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Forms Created
      </Typography>
      
      {forms.length === 0 ? (
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">You haven't created any forms yet</Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/upload-form"
            sx={{ mt: 2 }}
          >
            Create New Form
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Form Name</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.form_name}>
                  <TableCell>{form.form_name}</TableCell>
                  <TableCell>
                    {new Date(form.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center',
                      gap: 1
                    }}>
                      <Tooltip title="View Submissions">
                        <Button
                          component={RouterLink}
                          to={`/submissions/${form.form_name}`}
                          variant="outlined"
                          size="small"
                        >
                          View
                        </Button>
                      </Tooltip>
                      
                      <Tooltip title="Copy Form Link">
                        <IconButton
                          onClick={() => handleCopyLink(form.form_name)}
                          color="primary"
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Export to Excel">
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleExport(form.form_name)}
                        >
                          Export
                        </Button>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">Bored of Old Forms</Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/upload-form"
            sx={{ mt: 2 }}
          >
            Create a New One
          </Button>
        </Paper>

        </TableContainer>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default AdminPage;