import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  FormGroup,
  Radio,
  IconButton,
  Snackbar,
  Alert,
  Stack,
  Divider,
  Chip,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  AddCircleOutline as AddCircleOutlineIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
  ContentCopy as ContentCopyIcon,
  Upload as UploadIcon,
  PictureAsPdf
} from '@mui/icons-material';
import axios from 'axios';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

const FormCreatorPage = () => {
  const [user] = useAuthState(auth);
  const [formName, setFormName] = useState('');
  const [questions, setQuestions] = useState([{
    question: '',
    options: ['', ''],
    correctAnswer: null,
    marks: 1
  }]);
  const [useJson, setUseJson] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formLink, setFormLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // Form building handlers
  const handleAddQuestion = () => {
    setQuestions([...questions, {
      question: '',
      options: ['', ''],
      correctAnswer: null,
      marks: 1
    }]);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length <= 1) return;
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
  };

  const handleQuestionChange = (index, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index].question = value;
    setQuestions(updatedQuestions);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[qIndex].options[oIndex] = value;
    setQuestions(updatedQuestions);
  };

  const handleAddOption = (qIndex) => {
    const updatedQuestions = [...questions];
    updatedQuestions[qIndex].options.push('');
    setQuestions(updatedQuestions);
  };

  const handleRemoveOption = (qIndex, oIndex) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[qIndex].options.length <= 2) return;
    updatedQuestions[qIndex].options = updatedQuestions[qIndex].options.filter((_, i) => i !== oIndex);
    // Adjust correct answer index
    if (updatedQuestions[qIndex].correctAnswer !== null) {
      if (updatedQuestions[qIndex].correctAnswer === oIndex) {
        updatedQuestions[qIndex].correctAnswer = null;
      } else if (updatedQuestions[qIndex].correctAnswer > oIndex) {
        updatedQuestions[qIndex].correctAnswer -= 1;
      }
    }
    setQuestions(updatedQuestions);
  };

  const handleCorrectAnswerChange = (qIndex, oIndex) => {
    const updatedQuestions = [...questions];
    updatedQuestions[qIndex].correctAnswer = oIndex;
    setQuestions(updatedQuestions);
  };

  const handleMarksChange = (qIndex, value) => {
    const numericValue = Number(value);
    const marks = isNaN(numericValue) ? 1 : Math.max(1, numericValue);
    const updatedQuestions = [...questions];
    updatedQuestions[qIndex].marks = marks;
    setQuestions(updatedQuestions);
  };

  // PDF upload handler
  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    const formData = new FormData();
    formData.append('file', file); // Matches backend's expected key
  
    try {
      setIsPdfLoading(true);
      setError('');
      const token = await user.getIdToken();
      
      const response = await axios.post(
        'https://harshanpvtserver.duckdns.org/form-pulse/generate-quiz',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
  
      if (response.data.success) {
        // Format the response for our form creator
        console.log('PDF Response:', response.data);
        const formattedData = {
          questions: response.data.quiz.map(q => ({
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            marks: q.marks
          }))
        };
        console.log('Formatted Data:', formattedData);
        setJsonData(JSON.stringify(formattedData, null, 2));
        setUseJson(true); // Switch to JSON mode
        setSuccess('Quiz generated successfully from PDF!');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                          err.message || 
                          'PDF processing failed';
      setError(errorMessage);
    } finally {
      setIsPdfLoading(false);
      event.target.value = ''; // Reset file input
    }
  };

  // Form name handler
  const handleFormNameChange = (e) => {
    const value = e.target.value
      .replace(/\s/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');
    setFormName(value);
  };

  // Form validation
  const validateForm = () => {
    if (!formName.trim()) return 'Form name is required';
    if (/\s/.test(formName)) return 'Form name cannot contain spaces';
    
    if (!useJson) {
      for (const q of questions) {
        if (!q.question.trim()) return 'All questions must have text';
        if (q.options.some(o => !o.trim())) return 'All options must have text';
        if (q.correctAnswer === null) return 'Each question must have a correct answer selected';
      }
    } else {
      try {
        const parsed = JSON.parse(jsonData);
        if (!parsed.questions || !Array.isArray(parsed.questions)) {
          return 'Invalid JSON format - must contain questions array';
        }
      } catch (e) {
        return 'Invalid JSON format';
      }
    }
    
    return null;
  };

  // Form submission
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) return setError(validationError);

    try {
      const token = await user.getIdToken();
      const formData = useJson ? JSON.parse(jsonData) : {
        questions: questions.map(q => ({
          question: q.question,
          options: q.options,
          correct_answer: q.options[q.correctAnswer],
          marks: q.marks
        }))
      };

      const response = await axios.post(
        'https://harshanpvtserver.duckdns.org/form-pulse/create-form', 
        { form_name: formName, ...formData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Form created successfully!');
      setFormLink(`${window.location.origin}/form/${response.data.formId || encodeURIComponent(formName)}`);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Form creation failed');
      setSuccess('');
    }
  };

  // Link copying
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(formLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link to clipboard');
    }
  };

  // Snackbar handling
  const handleCloseSnackbar = () => {
    setSuccess('');
    setError('');
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 2 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Create New Form
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={useJson}
                  onChange={(e) => setUseJson(e.target.checked)}
                  color="secondary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography>{useJson ? 'JSON Mode' : 'GUI Mode'}</Typography>
                  <Chip 
                    label={useJson ? 'Advanced' : 'Simple'} 
                    size="small" 
                    color={useJson ? 'secondary' : 'primary'}
                    sx={{ ml: 1 }}
                  />
                </Box>
              }
            />
          </FormGroup>
        </Box>

        <TextField
          label="Form Name"
          fullWidth
          value={formName}
          onChange={handleFormNameChange}
          sx={{ mb: 3 }}
          InputProps={{
            style: { fontSize: '1.1rem' }
          }}
          helperText="No spaces allowed. Use underscores instead."
        />

        {useJson ? (
          <>
            <Box sx={{ mb: 3 }}>
              <Button
                variant="contained"
                component="label"
                startIcon={<PictureAsPdf />}
                disabled={isPdfLoading}
              >
                Upload PDF
                <input
                  type="file"
                  hidden
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                />
              </Button>
              {isPdfLoading && <LinearProgress sx={{ mt: 1 }} />}
              <Typography variant="caption" sx={{ ml: 2 }}>
                Upload a PDF to automatically generate quiz questions
              </Typography>
            </Box>

            <TextField
              label="Form JSON"
              fullWidth
              multiline
              minRows={10}
              maxRows={15}
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              sx={{ mb: 3 }}
              InputProps={{
                style: { fontFamily: 'monospace' }
              }}
            />
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                JSON Format Example:
              </Typography>
              <pre style={{ margin: 0, fontSize: '0.8rem', overflowX: 'auto' }}>
                {`{
  "questions": [
    {
      "question": "Sample question",
      "options": ["Option 1", "Option 2"],
      "correct_answer": "Option 1",
      "marks": 1
    }
  ]
}`}
              </pre>
            </Box>
          </>
        ) : (
          questions.map((question, qIndex) => (
            <Paper key={qIndex} elevation={2} sx={{ p: 3, mb: 3, borderLeft: '4px solid', 
              borderColor: question.correctAnswer !== null ? 'success.main' : 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" color="text.secondary">
                  Question {qIndex + 1}
                </Typography>
                <IconButton 
                  onClick={() => handleRemoveQuestion(qIndex)}
                  disabled={questions.length <= 1}
                >
                  <RemoveCircleOutlineIcon color={questions.length <= 1 ? 'disabled' : 'error'} />
                </IconButton>
              </Box>

              <TextField
                label="Question text"
                fullWidth
                value={question.question}
                onChange={(e) => handleQuestionChange(qIndex, e.target.value)}
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" sx={{ mr: 2 }}>
                  Marks:
                </Typography>
                <TextField
                  type="number"
                  value={question.marks}
                  onChange={(e) => handleMarksChange(qIndex, e.target.value)}
                  size="small"
                  sx={{ width: 80 }}
                  inputProps={{ min: 1 }}
                />
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Options (select correct answer):
              </Typography>
              
              {question.options.map((option, oIndex) => (
                <Stack key={oIndex} direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Radio
                    checked={question.correctAnswer === oIndex}
                    onChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                    color="success"
                  />
                  <TextField
                    fullWidth
                    size="small"
                    value={option}
                    onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                  />
                  <IconButton 
                    onClick={() => handleRemoveOption(qIndex, oIndex)}
                    disabled={question.options.length <= 2}
                    size="small"
                  >
                    <RemoveCircleOutlineIcon fontSize="small" 
                      color={question.options.length <= 2 ? 'disabled' : 'error'} />
                  </IconButton>
                </Stack>
              ))}

              <Button
                variant="outlined"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => handleAddOption(qIndex)}
                size="small"
                sx={{ mt: 1 }}
              >
                Add Option
              </Button>
            </Paper>
          ))
        )}

        {!useJson && (
          <Button
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleAddQuestion}
            sx={{ mb: 3 }}
          >
            Add Question
          </Button>
        )}

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            startIcon={<UploadIcon />}
            sx={{ px: 4, py: 1.5 }}
          >
            Create Form
          </Button>
        </Box>
        <br />
        {formLink && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Form Created Successfully!
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              value={formLink}
              fullWidth
              size="small"
              InputProps={{
                readOnly: true,
              }}
            />
            <Tooltip title={copied ? "Copied!" : "Copy link"}>
              <IconButton onClick={handleCopyLink} color={copied ? "success" : "primary"}>
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>
      )}
      </Paper>

      

      <Snackbar
        open={!!error || !!success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={error ? 'error' : 'success'}
          sx={{ width: '100%' }}
        >
          {error || success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FormCreatorPage;