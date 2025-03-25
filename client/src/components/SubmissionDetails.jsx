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
  TableRow
} from '@mui/material';
import axios from 'axios';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

const SubmissionDetails = () => {
  const { form_name } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user] = useAuthState(auth);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const token = await user.getIdToken();
        const response = await axios.get(`http://localhost:8000/submissions/${form_name}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubmissions(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load submissions');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchSubmissions();
  }, [form_name, user]);

  if (loading) {
    return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;
  }

  if (error) {
    return <Alert severity="error" sx={{ maxWidth: 600, margin: '2rem auto' }}>{error}</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Submissions for {form_name}
      </Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Total Marks</TableCell>
              <TableCell>Submitted At</TableCell>
              <TableCell>Answers</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.map((submission, index) => (
              <TableRow key={index}>
                <TableCell>{submission.user_name}</TableCell>
                <TableCell>{submission.user_email}</TableCell>
                <TableCell>{submission.total_marks}</TableCell>
                <TableCell>
                  {new Date(submission.submitted_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  {Object.entries(submission.answers).map(([qIndex, answer]) => (
                    <div key={qIndex}>
                      Q{qIndex}: {answer}
                    </div>
                  ))}
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