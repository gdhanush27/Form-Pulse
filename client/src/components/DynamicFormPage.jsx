import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  FormControl,
  FormLabel, 
  Button, 
  Paper, 
  CircularProgress, 
  Alert, 
  TextField, 
  Grid,
  Divider
} from '@mui/material';
import axios from 'axios';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

const DynamicFormPage = () => {
  const { form_name } = useParams();
  const [formData, setFormData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [totalMarks, setTotalMarks] = useState(0);
  const [maxMarks, setMaxMarks] = useState(0);
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
    }
  }, [user]);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`https://harshanpvtserver.duckdns.org/form-pulse/form/${form_name}`);
        setFormData(response.data);
        
        // Calculate maximum possible marks
        const max = response.data.questions.reduce((sum, question) => sum + question.marks, 0);
        setMaxMarks(max);
        
        setError('');
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchForm();
    }
  }, [form_name, user]);

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => ({ 
      ...prev, 
      [questionIndex]: value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submissionData = {
        form_name,
        user_name: name,
        user_email: user.email,
        answers
      };

      const response = await axios.post('https://harshanpvtserver.duckdns.org/form-pulse/submit', submissionData);
      
      if (response.data.message) {
        setSubmitted(true);
        setTotalMarks(response.data.total_marks);
        setAnswers({});
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Submission failed. You might have already submitted this form.');
    }
  };

  if (!user || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="error">{error}</Alert>
          <Button
            variant="contained"
            size="small"
            // navigate to home
            onClick={() => window.location.href = '/'}
            > 
            Home
          </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 2 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          {form_name.replace(/-/g, ' ').toUpperCase()} Form
        </Typography>

        {submitted ? (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="h6">
                Form submitted successfully!
              </Typography>
              <Typography>
                You scored {totalMarks} out of {maxMarks} marks
              </Typography>
              <Typography>
                Percentage: {((totalMarks / maxMarks) * 100).toFixed(2)}%
              </Typography>
            </Alert>
            <Button 
              variant="contained" 
              onClick={() => window.location.reload()}
              sx={{ mb: 3 }}
            >
              Submit Another Response
            </Button>
            <Divider sx={{ my: 3 }} />
          </Box>
        ) : null}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <TextField
                label="Form Name"
                value={form_name.replace(/-/g, ' ').toUpperCase()}
                fullWidth
                disabled
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                value={user.email}
                fullWidth
                disabled
              />
            </Grid>
          </Grid>

          {formData?.questions?.map((question, index) => (
            <FormControl
              key={index}
              component="fieldset"
              sx={{ 
                mb: 4, 
                p: 2, 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                backgroundColor: answers[index] === question.correct_answer && submitted ? 
                  'rgba(0, 200, 0, 0.1)' : 
                  answers[index] && submitted ? 
                  'rgba(255, 0, 0, 0.1)' : 
                  'inherit'
              }}
            >
              <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'bold' }}>
                {question.question} (Marks: {question.marks})
              </FormLabel>
              <RadioGroup
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
              >
                {question.options.map((option, optionIndex) => (
                  <FormControlLabel
                    key={optionIndex}
                    value={option}
                    control={<Radio />}
                    label={option}
                    disabled={submitted}
                    sx={{ 
                      mb: 1,
                      ...(submitted && option === question.correct_answer ? {
                        color: 'success.main',
                        fontWeight: 'bold'
                      } : {})
                    }}
                  />
                
                ))}
              </RadioGroup>
              {submitted && (
                <Typography 
                  variant="body2" 
                  color="black"
                  sx={{ mt: 1 }}
                >
                  {answers[index] === question.correct_answer ? 
                    "Correct answer" : 
                    `Correct answer: ${question.correct_answer}`}
                </Typography>
              )}
            </FormControl>
          ))}

          {!submitted && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={
                  !name ||
                  Object.keys(answers).length !== formData?.questions?.length
                }
              >
                Submit Answers
              </Button>
            </Box>
          )}
        </form>
      </Paper>
    </Box>
  );
};

export default DynamicFormPage;