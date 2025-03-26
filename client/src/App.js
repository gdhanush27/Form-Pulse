import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Auth from './components/Auth';
import DynamicFormPage from './components/DynamicFormPage';
import ProtectedRoute from './components/ProtectedRoute';
import FormUploadPage from './components/FormUploadPage';
import AdminPage from './components/AdminPage';
import SubmissionDetails from './components/SubmissionDetails';
import NavBar from './components/NavBar';
import { Container } from '@mui/material';
import NotFoundPage from './components/NotFoundPage';
import UserSubmissionsPage from './components/UserSubmissionsPage';
import FormCreatorPage from './components/FormCreatorPage';

function App() {
  return (
    <Router>
      <NavBar />
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Routes>
          {/* Existing routes */}
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<Auth />} />

          <Route path="/admin" element={
            <ProtectedRoute><AdminPage /></ProtectedRoute>
          } />

          <Route path="/form/:form_name" element={
            <ProtectedRoute><DynamicFormPage /></ProtectedRoute>
          } />

          <Route path="/submissions/:form_name" element={
            <ProtectedRoute><SubmissionDetails /></ProtectedRoute>
          } />

          <Route path="/upload-form" element={
            <ProtectedRoute><FormCreatorPage /></ProtectedRoute>
          } />

          <Route path="/my-submissions" element={
            <ProtectedRoute> <UserSubmissionsPage /> </ProtectedRoute>
          } />

          <Route path="/create-form" element={
            <ProtectedRoute> <FormCreatorPage /> </ProtectedRoute>
          } />

          {/* Not found route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Container>
    </Router>
  );
}
export default App