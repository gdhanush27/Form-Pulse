import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Button,
  Stack
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import axios from 'axios';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

const SubmissionDetails = () => {
  const { form_name } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaderboardCount, setLeaderboardCount] = useState(5);
  const [user] = useAuthState(auth);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = await user.getIdToken();
        
        const [formResponse, submissionsResponse] = await Promise.all([
          axios.get(`http://localhost:8000/form/${form_name}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`http://localhost:8000/submissions/${form_name}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setFormData(formResponse.data);
        const sortedSubmissions = submissionsResponse.data.sort((a, b) => b.total_marks - a.total_marks);
        setSubmissions(sortedSubmissions);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
  }, [form_name, user]);

  const handleLeaderboardChange = (event, newValue) => {
    if (newValue !== null) {
      setLeaderboardCount(newValue);
    }
  };

  const handleExport = async () => {
    try {
      const token = await user.getIdToken();
      const response = await axios.get(
        `http://localhost:8000/submissions/${form_name}/export`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${form_name}_submissions_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export submissions');
    }
  };

  const totalPossibleMarks = formData?.questions?.reduce(
    (sum, question) => sum + question.marks, 0
  ) || 1;

  if (loading) {
    return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;
  }

  if (error) {
    return <Alert severity="error" sx={{ maxWidth: 600, margin: '2rem auto' }}>{error}</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" gutterBottom>
          Submissions for {form_name}
        </Typography>
        <Button
          variant="contained"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
          sx={{ height: 'fit-content' }}
        >
          Export to Excel
        </Button>
      </Stack>

      {/* Leaderboard Section */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="div">
            Leaderboard (Total Marks: {totalPossibleMarks})
          </Typography>
          <ToggleButtonGroup
            value={leaderboardCount}
            exclusive
            onChange={handleLeaderboardChange}
            aria-label="leaderboard count"
          >
            <ToggleButton value={5} aria-label="top 5">
              Top 5
            </ToggleButton>
            <ToggleButton value={10} aria-label="top 10">
              Top 10
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Percentage</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.slice(0, leaderboardCount).map((submission, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Chip 
                      label={`#${index + 1}`} 
                      color={
                        index === 0 ? 'primary' : 
                        index === 1 ? 'secondary' : 
                        index === 2 ? 'success' : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>{submission.user_name}</TableCell>
                  <TableCell>
                    {submission.total_marks} / {totalPossibleMarks}
                  </TableCell>
                  <TableCell>
                    {((submission.total_marks / totalPossibleMarks) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* All Submissions Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        All Submissions ({submissions.length})
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Percentage</TableCell>
              <TableCell>Submitted At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.map((submission, index) => (
              <TableRow key={index}>
                <TableCell>{submission.user_name}</TableCell>
                <TableCell>{submission.user_email}</TableCell>
                <TableCell>
                  {submission.total_marks} / {totalPossibleMarks}
                </TableCell>
                <TableCell>
                  {((submission.total_marks / totalPossibleMarks) * 100).toFixed(1)}%
                </TableCell>
                <TableCell>
                  {new Date(submission.submitted_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SubmissionDetails;