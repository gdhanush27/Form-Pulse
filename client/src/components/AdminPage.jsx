import React, { useState, useEffect } from 'react';
import { API_URL } from '../backend_url.js';
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
  Link,
  Chip,
  Grid
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon
} from '@mui/icons-material';
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
  const [totalForms, setTotalForms] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [protectedForms, setProtectedForms] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = await user.getIdToken();
        
        // Fetch forms
        const formsResponse = await axios.get( 'https://harshanpvtserver.duckdns.org/form-pulse/my-forms', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setForms(formsResponse.data.forms);

        // Fetch stats
        const statsResponse = await axios.get('https://harshanpvtserver.duckdns.org/form-pulse/admin-stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        // console.log('Stats:', statsResponse.data);
        // setStats(statsResponse.data);
        // setStats({
        //   total_forms: statsResponse.data.total_forms,
        //   protected_forms: statsResponse.data.protected_forms,
        //   total_submissions: statsResponse.data.total_submissions
        // });
        setTotalForms(statsResponse.data.total_forms);
        setTotalSubmissions(statsResponse.data.total_submissions);
        setProtectedForms(statsResponse.data.protected_forms);
        // console.log('Updated Stats:', stats);

      } catch (err) {
        showSnackbar(err.response?.data?.detail || 'Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
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
      showSnackbar(err.response?.data?.detail || 'Failed to export submissions', 'error');
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
      setTotalForms(totalForms - 1);
      setTotalSubmissions(totalSubmissions - formToDelete.submissions_count);
      setProtectedForms(protectedForms - (formToDelete.protected ? 1 : 0));

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
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Form Management Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Total Forms
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              {totalForms}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Proctored Forms
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              {protectedForms}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Total Submissions
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              {totalSubmissions}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={RouterLink}
          to="/upload-form"
          sx={{ px: 4 }}
        >
          Create New Form
        </Button>
      </Box>

      {forms.length === 0 ? (
        <Paper elevation={3} sx={{ p: 6, textAlign: 'center', mt: 2 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            You haven't created any forms yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Get started by creating your first form
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={RouterLink}
            to="/upload-form"
          >
            Create Form
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'primary.contrastText' }}>Form Name</TableCell>
                <TableCell sx={{ color: 'primary.contrastText' }}>Created At</TableCell>
                <TableCell align="center" sx={{ color: 'primary.contrastText' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.form_name} hover>
                  <TableCell>
                    <Typography fontWeight="medium">
                      {form.form_name}
                    </Typography>
                    {form.protected ? (
                      <Chip label="Proctored" color="warning" size="small" />
                    ) : (
                      <Chip label="Standard" color="default" size="small" />
                    )}
                  </TableCell>
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
                      <Tooltip title="Open Form">
                        <IconButton
                          component={Link}
                          href={getFormLink(form.form_name)}
                          target="_blank"
                          rel="noopener"
                          color="primary"
                        >
                          <OpenInNewIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="View Submissions">
                        <Button
                          component={RouterLink}
                          to={`/submissions/${form.form_name}`}
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                        >
                          Submissions
                        </Button>
                      </Tooltip>
                      
                      <Tooltip title="Copy Form Link">
                        <IconButton
                          onClick={() => handleCopyLink(form.form_name)}
                          color="primary"
                        >
                          <ContentCopyIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Export to Excel">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleExport(form.form_name)}
                        >
                          Export
                        </Button>
                      </Tooltip>

                      <Tooltip title="Delete Form">
                        <IconButton
                          onClick={() => handleDeleteClick(form)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the form <strong>{formToDelete?.form_name}</strong>?
            This will permanently delete the form and all its submissions. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            variant="contained"
            autoFocus
          >
            Delete Permanently
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
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPage;