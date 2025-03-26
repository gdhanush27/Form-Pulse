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
  IconButton,
  Tooltip,
  Snackbar
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import axios from 'axios';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

const UserSubmissionsPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [user] = useAuthState(auth);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const token = await user.getIdToken();
        const response = await axios.get('http://localhost:8000/my-submissions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(response.data);
        // Process submissions to ensure valid total_possible_marks
        const processedSubmissions = response.data.map(sub => ({
          ...sub,
          total_possible_marks: sub.total_possible_marks || 1 // Fallback to 1 to prevent NaN
        }));
        
        setSubmissions(processedSubmissions);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load submissions');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchSubmissions();
  }, [user]);

  const handleCopyLink = async (formName) => {
    try {
      const formLink = `${window.location.origin}/form/${encodeURIComponent(formName)}`;
      await navigator.clipboard.writeText(formLink);
      setSnackbarOpen(true);
    } catch (err) {
      setError('Failed to copy link to clipboard');
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const calculatePercentage = (marks, total) => {
    return total > 0 ? ((marks / total) * 100).toFixed(1) : 0;
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
        My Submitted Forms
      </Typography>

      {submissions.length === 0 ? (
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">No submissions found</Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            Submit your first form to see it listed here
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Form Name</TableCell>
                <TableCell>Submitted At</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Percentage</TableCell>
                <TableCell>Form Link</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.map((submission, index) => (
                <TableRow key={index}>
                  <TableCell>{submission.form_name}</TableCell>
                  <TableCell>
                    {new Date(submission.submitted_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {submission.total_marks} / {submission.total_possible_marks}
                  </TableCell>
                  <TableCell>
                    {calculatePercentage(submission.total_marks, submission.total_possible_marks)}%
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Copy form link">
                      <IconButton
                        onClick={() => handleCopyLink(submission.form_name)}
                        color="primary"
                      >
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleCloseSnackbar}
        message="Form link copied to clipboard!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default UserSubmissionsPage;