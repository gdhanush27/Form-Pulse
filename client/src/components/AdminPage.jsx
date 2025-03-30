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
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Link
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState(null);
  const [user] = useAuthState(auth);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoading(true);
        const token = await user.getIdToken();
        const response = await axios.get('https://harshanpvtserver.duckdns.org/form-pulse/my-forms', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setForms(response.data.forms);
      } catch (err) {
        showSnackbar(err.response?.data?.detail || 'Failed to load forms', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchForms();
  }, [user]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCopyLink = async (formName) => {
    try {
      const formLink = `${window.location.origin}/form/${encodeURIComponent(formName)}`;
      await navigator.clipboard.writeText(formLink);
      showSnackbar('Form link copied to clipboard!');
    } catch (err) {
      showSnackbar('Failed to copy link to clipboard', 'error');
    }
  };

  const handleExport = async (formName) => {
    try {
      const token = await user.getIdToken();
      const response = await axios.get(
        `https://harshanpvtserver.duckdns.org/form-pulse/submissions/${formName}/export`,
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
      showSnackbar('Export started successfully');
    } catch (err) {
      showSnackbar('Failed to export submissions', 'error');
    }
  };

  const handleDeleteClick = (form) => {
    setFormToDelete(form);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const token = await user.getIdToken();
      await axios.delete(
        `https://harshanpvtserver.duckdns.org/form-pulse/form/${formToDelete.form_name}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setForms(forms.filter(f => f.form_name !== formToDelete.form_name));
      showSnackbar('Form and all submissions deleted successfully');
    } catch (err) {
      showSnackbar(err.response?.data?.detail || 'Failed to delete form', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setFormToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setFormToDelete(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const getFormLink = (formName) => {
    return `${window.location.origin}/form/${encodeURIComponent(formName)}`;
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
        <>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center', mt: 4 }}>
            <Typography variant="h6">Create a New Form</Typography>
            <Button
              variant="contained"
              component={RouterLink}
              to="/upload-form"
              sx={{ mt: 2 }}
              size="large"
            >
              Create New Form
            </Button>
          </Paper>
          <br/>
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
                        gap: 1,
                        flexWrap: 'wrap'
                      }}>
                        <Tooltip title="Open Form in New Tab">
                          <IconButton
                            component={Link}
                            href={getFormLink(form.form_name)}
                            target="_blank"
                            rel="noopener"
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

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
                            // make this disavled == true
                            // disabled={true}
                            variant="contained"
                            size="small"
                            onClick={() => handleExport(form.form_name)}
                            sx={{ ml: 1 }}
                          >
                            Export
                          </Button>
                        </Tooltip>

                        <Tooltip title="Delete Form">
                          <IconButton
                            onClick={() => handleDeleteClick(form)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Delete Form: {formToDelete?.form_name}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This will permanently delete the form and all its submissions. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPage;