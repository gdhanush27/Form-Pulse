import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../backend_url.js';
import { useParams, useNavigate } from 'react-router-dom';
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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Modal
} from '@mui/material';
import axios from 'axios';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

const DynamicFormPage = () => {
  const { form_name } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [totalMarks, setTotalMarks] = useState(0);
  const [maxMarks, setMaxMarks] = useState(0);
  const [user] = useAuthState(auth);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);
  const [isProctored, setIsProctored] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [fullScreenWarningOpen, setFullScreenWarningOpen] = useState(false);
  const [tabSwitchWarningOpen, setTabSwitchWarningOpen] = useState(false);

  // Proctoring handlers
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && isProctored && !submitted) {
      const newCount = violationCount + 1;
      setViolationCount(newCount);
      setTabSwitchWarningOpen(true);
      
      if (newCount >= 3) {
        handleAutoSubmit();
      }
    }
  }, [isProctored, violationCount, submitted]);

  const handleFullScreenChange = useCallback(() => {
    if (!document.fullscreenElement && isProctored && !submitted) {
      setFullScreenWarningOpen(true);
      document.documentElement.requestFullscreen().catch(console.error);
    }
  }, [isProctored, submitted]);

  const handleAutoSubmit = useCallback(async () => {
    if (!submitted) {
      setTabSwitchWarningOpen(false);
      setFullScreenWarningOpen(false);
      await handleSubmit();
    }
  }, [submitted]);

  const handleEnterFullScreen = () => {
    document.documentElement.requestFullscreen()
      .then(() => setFullScreenWarningOpen(false))
      .catch(console.error);
  };

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
    }
  }, [user]);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        setError('');
        
        const token = await user.getIdToken();
        const response = await axios.get(`https://harshanpvtserver.duckdns.org/form-pulse/form/${form_name}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setFormData(response.data);
        setShowAnswers(response.data.show_answers !== false);
        setIsProctored(response.data.protected || false);

        const max = response.data.questions.reduce((sum, q) => sum + q.marks, 0);
        setMaxMarks(max);
        
      } catch (err) {
        if (err.response?.status === 403) {
          setAuthDialogOpen(true);
        } else {
          setError(err.response?.data?.detail || 'Failed to load form');
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchForm();
  }, [form_name, user]);

  useEffect(() => {
    if (isProctored) {
      // Add event listeners
      document.addEventListener('fullscreenchange', handleFullScreenChange);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Initial fullscreen check
      if (!document.fullscreenElement) {
        setFullScreenWarningOpen(true);
      }

      return () => {
        document.removeEventListener('fullscreenchange', handleFullScreenChange);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [isProctored, handleFullScreenChange, handleVisibilityChange]);

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    try {
      const token = await user.getIdToken();
      const submissionData = {
        form_name,
        user_name: name,
        user_email: user.email,
        answers,
        proctoring_metrics: {
          tab_switches: violationCount,
          fullscreen_violations: !document.fullscreenElement
        }
      };

      const response = await axios.post('https://harshanpvtserver.duckdns.org/form-pulse/submit', submissionData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.message) {
        setSubmitted(true);
        setTotalMarks(response.data.total_marks);
        if (isProctored) document.exitFullscreen();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Submission failed.');
    }
  };

  const handleAuthDialogClose = () => {
    setAuthDialogOpen(false);
    navigate('/');
  };

  const handleAuthDialogLogin = () => {
    navigate('/login', { state: { from: window.location.pathname } });
  };

  if (!user || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !authDialogOpen) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="contained"
          size="small"
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        > 
          Home
        </Button>
      </Box>
    );
  }

  return (
    <>
      {/* Authentication Required Dialog */}
      <Dialog open={authDialogOpen} onClose={handleAuthDialogClose}>
        <DialogTitle>Authentication Required</DialogTitle>
        <DialogContent>
          <Typography>This form is protected and requires authentication.</Typography>
          {isProctored && (
            <Typography color="error" sx={{ mt: 2 }}>
              ⚠️ This is a proctored test - Fullscreen mode required
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAuthDialogClose}>Cancel</Button>
          <Button onClick={handleAuthDialogLogin} color="primary" variant="contained">
            Log In
          </Button>
        </DialogActions>
      </Dialog>

      {/* Full Screen Warning Modal */}
      <Modal open={fullScreenWarningOpen && isProctored && !submitted} onClose={() => {}}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          textAlign: 'center'
        }}>
          <Typography variant="h6" gutterBottom>
            Fullscreen Required
          </Typography>
          <Typography sx={{ mb: 3 }}>
            This proctored test must be taken in fullscreen mode.
          </Typography>
          <Button 
            variant="contained" 
            onClick={handleEnterFullScreen}
            size="large"
          >
            Enter Fullscreen
          </Button>
        </Box>
      </Modal>

      {/* Tab Switch Warning Modal */}
      <Modal open={tabSwitchWarningOpen && isProctored && !submitted} onClose={() => setTabSwitchWarningOpen(false)}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          textAlign: 'center'
        }}>
          <Typography variant="h6" gutterBottom>
            Warning: Tab Switch Detected
          </Typography>
          <Typography sx={{ mb: 2 }}>
            You have switched tabs/windows {violationCount} time(s).
          </Typography>
          <Typography color="error" sx={{ mb: 3 }}>
            {3 - violationCount > 0 
              ? `You have ${3 - violationCount} remaining before auto-submission`
              : 'Test will be auto-submitted'}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => setTabSwitchWarningOpen(false)}
            size="large"
          >
            Continue Test
          </Button>
        </Box>
      </Modal>

      {/* Main Content - Only show when in fullscreen or not proctored */}
      {(!isProctored || document.fullscreenElement || submitted) ? (
        <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 2 }}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
              {form_name.replace(/-/g, ' ').toUpperCase()} Form
              {isProctored && (
                <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                  (Proctored Test - {3 - violationCount} warnings remaining)
                </Typography>
              )}
            </Typography>

            {submitted ? (
              <Box>
                <Alert severity={showAnswers ? "success" : "info"} sx={{ mb: 3 }}>
                  <Typography variant="h6">
                    Form submitted successfully!
                  </Typography>
                  {showAnswers && (
                    <>
                  <Typography>
                    You scored {totalMarks} out of {maxMarks} marks
                  </Typography>
                    <Typography>
                      Percentage: {((totalMarks / maxMarks) * 100).toFixed(2)}%
                    </Typography>
                    </>
                  )}
                  {isProctored && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Proctoring metrics: {violationCount} tab switches detected
                    </Typography>
                  )}
                </Alert>
                <Button 
                  variant="contained" 
                  onClick={() => navigate('/')}
                  sx={{ mb: 3 }}
                >
                  Return to Home
                </Button>
                <Divider sx={{ my: 3 }} />
              </Box>
            ) : (
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
                      backgroundColor: submitted && showAnswers ? (
                        answers[index] === question.correct_answer ? 
                          'rgba(0, 200, 0, 0.1)' : 
                          'rgba(255, 0, 0, 0.1)'
                      ) : 'inherit'
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
                            ...(submitted && showAnswers && option === question.correct_answer ? {
                              color: 'success.main',
                              fontWeight: 'bold'
                            } : {})
                          }}
                        />
                      ))}
                    </RadioGroup>
                    {submitted && showAnswers && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        {answers[index] === question.correct_answer ? 
                          "Correct answer" : 
                          `Correct answer: ${question.correct_answer}`}
                      </Typography>
                    )}
                  </FormControl>
                ))}

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
              </form>
            )}
          </Paper>
        </Box>
      ) : (
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          textAlign: 'center'
        }}>
          <Typography variant="h4" sx={{ mb: 3 }}>
            Please enter fullscreen mode to continue the test
          </Typography>
          <Button 
            variant="contained" 
            size="large"
            onClick={handleEnterFullScreen}
          >
            Enter Fullscreen
          </Button>
        </Box>
      )}
    </>
  );
};

export default DynamicFormPage;