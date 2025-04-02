import React, { useState } from 'react';
import {API_URL} from '../backend_url.js'; // Import the backend URL from the config file;
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Tabs,
  Tab,
  FormGroup,
  Radio,
  IconButton,
  Snackbar,
  Alert,
  Stack,
  Divider,
  Tooltip,
  LinearProgress,
  InputAdornment,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  AddCircleOutline as AddCircleOutlineIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
  ContentCopy as ContentCopyIcon,
  Upload as UploadIcon,
  PictureAsPdf,
  Code,
  AutoAwesomeMosaic,
  CheckCircle
} from '@mui/icons-material';
import axios from 'axios';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

const FormCreatorPage = () => {
  const [user] = useAuthState(auth);
  const [formName, setFormName] = useState('');
  const [useProtected, setUseProtected] = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);
  const [questions, setQuestions] = useState([{
    question: '',
    options: ['', ''],
    correctAnswer: null,
    marks: 1
  }]);
  const [mode, setMode] = useState('gui');
  const [jsonData, setJsonData] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formLink, setFormLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const handleFormNameChange = (e) => {
    const value = e.target.value
      .replace(/\s/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase();
    setFormName(value);
  };

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

  const handlePdfUpload = async (event) => {
    // check if pdf is selected
    if (event.target.files.length === 0) return;
    // check if pdf is validq
    if (event.target.files[0].type !== 'application/pdf') {
      setError('Error: Invalid file type. Please upload a PDF file.');
      return;
    }
    const file = event.target.files[0];
    if (!file) return;

    if (!formName) {
      setError('Error: Form name is required for PDF upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('form_name', formName);

    try {
      setIsPdfLoading(true);
      setError('');
      const token = await user.getIdToken();
      
      const response = await axios.post(
        API_URL+'generate-quiz',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          params: {
            protected: useProtected,
            show_answers: showAnswers
          }
        }
      );

      if (response.data.success) {
        setSuccess('Form created successfully from PDF!');
        setFormLink(`${window.location.origin}/form/${encodeURIComponent(formName)}`);
        // setMode('gui');
        if (response.data.questions) {
          setQuestions(response.data.questions);
        }
      } else {
        setError(`Error processing PDF: ${response.data.error || 'Unknown error'}`);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                          err.message || 
                          'PDF processing failed';
      setError(`Error processing PDF: ${errorMessage}`);
    } finally {
      setIsPdfLoading(false);
      event.target.value = '';
    }
  };

  const validateForm = () => {
    if (!formName.trim()) return 'Form name is required';
    if (!/^[a-z][a-z0-9_]*$/.test(formName)) {
      return 'Form name must start with a letter and only contain letters, numbers and underscores';
    }
    
    if (mode === 'gui') {
      for (const q of questions) {
        if (!q.question.trim()) return 'All questions must have text';
        if (q.options.some(o => !o.trim())) return 'All options must have text';
        if (q.correctAnswer === null) return 'Each question must have a correct answer selected';
      }
    } else if (mode === 'json') {
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

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(`Error in form: ${validationError}`);
      return;
    }
  
    try {
      const token = await user.getIdToken();
      const formData = mode === 'json' ? JSON.parse(jsonData) : {
        questions: questions.map(q => ({
          question: q.question,
          options: q.options,
          correct_answer: q.options[q.correctAnswer],
          marks: q.marks
        })),
        protected: useProtected,
        show_answers: showAnswers
      };
  
      const response = await axios.post(
        API_URL+'create-form', 
        { 
          form_name: formName, 
          ...formData 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      setSuccess('Form created successfully!');
      setFormLink(`${window.location.origin}/form/${response.data.formId || encodeURIComponent(formName)}`);
      setError('');
    } catch (err) {
      setError(`Error creating form: ${err.response?.data?.detail || err.message || 'Unknown error'}`);
      setSuccess('');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(formLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Error: Failed to copy link to clipboard');
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess('');
    setError('');
  };

  const renderGUIMode = () => (
    <>
      {questions.map((question, qIndex) => (
        <Paper key={qIndex} elevation={2} sx={{ 
          p: 3, 
          mb: 3, 
          borderLeft: '4px solid', 
          borderColor: question.correctAnswer !== null ? 'success.main' : 'divider',
          position: 'relative'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" color="text.secondary">
              Question {qIndex + 1}
            </Typography>
            <IconButton 
              onClick={() => handleRemoveQuestion(qIndex)}
              disabled={questions.length <= 1}
              size="small"
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
                size="small"
              />
              <TextField
                fullWidth
                size="small"
                value={option}
                onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                InputProps={{
                  endAdornment: question.correctAnswer === oIndex ? (
                    <InputAdornment position="end">
                      <CheckCircle color="success" fontSize="small" />
                    </InputAdornment>
                  ) : null
                }}
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
      ))}

      <Button
        variant="outlined"
        startIcon={<AddCircleOutlineIcon />}
        onClick={handleAddQuestion}
        sx={{ mb: 3 }}
      >
        Add Question
      </Button>
    </>
  );

  const renderJSONMode = () => (
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
      helperText="Enter valid JSON format with questions array"
    />
  );

  const renderAutomatedMode = () => (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: 300,
      p: 3,
      border: '2px dashed',
      borderColor: 'divider',
      borderRadius: 1,
      textAlign: 'center'
    }}>
      {isPdfLoading ? (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Processing your PDF...
          </Typography>
          <LinearProgress sx={{ width: '100%', mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            This may take a few moments depending on the document size
          </Typography>
        </>
      ) : (
        <>
          <PictureAsPdf color="primary" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Upload a PDF to Generate Quiz
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Supported formats: textbooks, research papers, technical documentation
          </Typography>
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadIcon />}
            disabled={!formName}
          >
            Select PDF File
            <input
              type="file"
              hidden
              // only accept PDF files
              accept="application/pdf"
              onChange={handlePdfUpload}
            />
          </Button>
          {!formName && (
            <Typography variant="caption" color="error" sx={{ mt: 1 }}>
              Please enter a form name first
            </Typography>
          )}
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 2 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Create New Form
        </Typography>

        <TextField
          label="Form Name"
          fullWidth
          value={formName}
          onChange={handleFormNameChange}
          sx={{ mb: 3 }}
          helperText="No spaces allowed. Use underscores instead."
        />
        <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
  <FormGroup>
    <FormControlLabel
      control={
        <Switch 
          checked={useProtected}
          onChange={(e) => setUseProtected(e.target.checked)}
          color="primary"
        />
      }
      label="Use Protected"
    />
  </FormGroup>
  <FormGroup>
    <FormControlLabel
      control={
        <Switch 
          checked={showAnswers}
          onChange={(e) => setShowAnswers(e.target.checked)}
          color="secondary"
        />
      }
      label="Show Answers"
    />
  </FormGroup>
</Box>

        {/* Show form link immediately for JSON and Automated modes */}
        {(mode === 'json' || mode === 'automated') && formLink && (
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Your form is ready!
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
                <IconButton 
                  onClick={handleCopyLink} 
                  color={copied ? "success" : "primary"}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        )}

        <Tabs
          value={mode}
          onChange={(_, newMode) => setMode(newMode)}
          sx={{ mb: 3 }}
          variant="fullWidth"
        >
          <Tab label="GUI Mode" value="gui" icon={<AutoAwesomeMosaic />} />
          <Tab label="JSON Mode" value="json" icon={<Code />} />
          <Tab label="Automated" value="automated" icon={<PictureAsPdf />} />
        </Tabs>

        {mode === 'gui' && renderGUIMode()}
        {mode === 'json' && renderJSONMode()}
        {mode === 'automated' && renderAutomatedMode()}

        {mode !== 'automated' && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              startIcon={<UploadIcon />}
              sx={{ px: 4, py: 1.5 }}
              disabled={isPdfLoading}
            >
              Create Form
            </Button>
          </Box>
        )}

        {mode === 'gui' && formLink && (
          <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
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
                <IconButton 
                  onClick={handleCopyLink} 
                  color={copied ? "success" : "primary"}
                >
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
          {error ? error : success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FormCreatorPage;