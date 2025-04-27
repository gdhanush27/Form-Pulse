import React, { useState, useEffect } from 'react';
import { API_URL } from '../backend_url';
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
  Snackbar,
  Chip,
  Link,
  Button,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  ContentCopy as ContentCopyIcon,
  Assignment as AssignmentIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

const UserSubmissionsPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [user] = useAuthState(auth);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    averageScore: 0,
    bestScore: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = await user.getIdToken();
        
        // Fetch submissions and stats
        const [submissionsRes, statsRes] = await Promise.all([
          axios.get('https://harshanpvtserver.duckdns.org/form-pulse/my-submissions', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('https://harshanpvtserver.duckdns.org/form-pulse/my-submissions/stats', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        // Process submissions with form settings
        const processedSubmissions = await Promise.all(
          submissionsRes.data.map(async (sub) => {
            try {
              const formRes = await axios.get(`https://harshanpvtserver.duckdns.org/form-pulse/form/${sub.form_name}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              return {
                ...sub,
                total_possible_marks: sub.total_possible_marks || 1,
                show_answers: formRes.data.show_answers !== false,
                is_protected: formRes.data.protected || false,
                form_title: formRes.data.title || sub.form_name
              };
            } catch (err) {
              console.error(`Error fetching form ${sub.form_name}:`, err);
              return {
                ...sub,
                total_possible_marks: sub.total_possible_marks || 1,
                show_answers: true,
                is_protected: false,
                form_title: sub.form_name
              };
            }
          })
        );

        setSubmissions(processedSubmissions);
        setStats(statsRes.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load submissions');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
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

  const handleRefresh = () => {
    setLoading(true);
    setError('');
    setSubmissions([]);
    // Retrigger the useEffect
    const token = user.getIdToken();
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const calculatePercentage = (marks, total) => {
    return total > 0 ? ((marks / total) * 100).toFixed(1) : 0;
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
      <Alert 
        severity="error" 
        sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}
        action={
          <Button 
            color="inherit" 
            size="small"
            onClick={handleRefresh}
          >
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          My Submissions
        </Typography>
        {/* <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
        >
          Refresh
        </Button> */}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Total Submissions
              </Typography>
              <Typography variant="h3" sx={{ mt: 1 }}>
                {stats.totalSubmissions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Average Score
              </Typography>
              <Typography variant="h3" sx={{ mt: 1 }}>
                {stats.averageScore}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Best Score
              </Typography>
              <Typography variant="h3" sx={{ mt: 1 }}>
                {stats.bestScore}%
              </Typography>
            </CardContent>
          </Card>
        </Grid> */}
      </Grid>

      {submissions.length === 0 ? (
        <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
          <AssignmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2 }}>
            No submissions found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You haven't submitted any forms yet
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
          >
            Browse Forms
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell>Form Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted At</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Percentage</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.map((submission, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    <Typography fontWeight="medium">
                      {submission.form_title}
                    </Typography>
                    {submission.is_protected && (
                      <Chip 
                        label="Proctored" 
                        size="small" 
                        color="warning" 
                        sx={{ mt: 1 }} 
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={submission.show_answers ? "Results Available" : "Submitted"} 
                      color={submission.show_answers ? "success" : "info"} 
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(submission.submitted_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {submission.show_answers ? (
                      `${submission.total_marks} / ${submission.total_possible_marks}`
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Hidden
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {submission.show_answers ? (
                      `${calculatePercentage(submission.total_marks, submission.total_possible_marks)}%`
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Hidden
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Tooltip title="View Form">
                        <IconButton
                          component={Link}
                          href={`${window.location.origin}/form/${encodeURIComponent(submission.form_name)}`}
                          target="_blank"
                          rel="noopener"
                          color="primary"
                        >
                          <OpenInNewIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Copy Form Link">
                        <IconButton
                          onClick={() => handleCopyLink(submission.form_name)}
                          color="primary"
                        >
                          <ContentCopyIcon />
                        </IconButton>
                      </Tooltip>

                      {/* {submission.show_answers && (
                        <Tooltip title="View Details">
                          <IconButton
                            onClick={() => navigate(`/submission/${submission.id}`)}
                            color="primary"
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      )} */}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="success"
          sx={{ width: '100%' }}
        >
          Form link copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserSubmissionsPage;