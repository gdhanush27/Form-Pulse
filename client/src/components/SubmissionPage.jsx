import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../backend_url';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

const SubmissionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [submission, setSubmission] = useState(null);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        setLoading(true);
        const token = await user.getIdToken();
        
        const response = await axios.get(`https://harshanpvtserver.duckdns.org/form-pulse/submission/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          transformResponse: [
            (data) => {
              try {
                return JSON.parse(data);
              } catch (e) {
                return data; // Return as-is if already parsed
              }
            }
          ]
        });

        // Ensure data structure matches expected format
        if (!response.data || !response.data.form_name) {
          throw new Error("Invalid submission data format");
        }
        console.log(response.data);
        setFormData(response.data.form_name);
        setSubmission(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load submission');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchSubmission();
  }, [id, user]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link to clipboard');
    }
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
        <Button sx={{ ml: 2 }} onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3 }}
      >
        Back to Submissions
      </Button>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4" gutterBottom>
            {formData.form_name}
            {formData.protected && (
              <Chip label="Proctored" color="warning" sx={{ ml: 2 }} />
            )}
          </Typography>
          <Tooltip title={copied ? "Copied!" : "Copy submission link"}>
            <IconButton onClick={handleCopyLink} color="primary">
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1">
            Submitted: {new Date(submission.submitted_at).toLocaleString()}
          </Typography>
          {formData.show_answers && (
            <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
              Score: {submission.total_marks}/{submission.total_possible_marks} (
              {((submission.total_marks / submission.total_possible_marks) * 100).toFixed(1)}%)
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <List>
          {formData.questions.map((question, index) => (
            <Paper key={index} sx={{ mb: 2, p: 2 }} elevation={1}>
              <ListItem disablePadding>
                <ListItemText
                  primary={`Q${index + 1}: ${question.question}`}
                  secondary={`Marks: ${question.marks}`}
                />
              </ListItem>
              
              {formData.show_answers && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Chip 
                      label="Your Answer" 
                      color="primary" 
                      variant="outlined"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body1">
                      {submission.answers[index.toString()] || 'No answer provided'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Chip 
                      label="Correct Answer" 
                      color="success" 
                      variant="outlined"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body1" color="success.main">
                      {question.correct_answer}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                    <ListItemIcon sx={{ minWidth: 32, mr: 1 }}>
                      {submission.answers[index.toString()] === question.correct_answer ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <CancelIcon color="error" />
                      )}
                    </ListItemIcon>
                    <Typography variant="body2">
                      {submission.answers[index.toString()] === question.correct_answer
                        ? "Correct Answer"
                        : "Incorrect Answer"}
                    </Typography>
                  </Box>
                </>
              )}
            </Paper>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default SubmissionPage;