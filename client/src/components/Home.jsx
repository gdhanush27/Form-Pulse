import { Avatar, Box, Typography, Button, Paper } from '@mui/material';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

const Home = () => {
  const [user] = useAuthState(auth);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 2 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h3" gutterBottom>
          Form Management System
        </Typography>
        
        <Typography variant="body1" paragraph>
          This project provides a complete solution for creating and managing forms with:
        </Typography>
        
        <ul>
          <li><Typography>Google OAuth Authentication</Typography></li>
          <li><Typography>Dynamic Form Creation</Typography></li>
          <li><Typography>MongoDB Storage</Typography></li>
          <li><Typography>User-specific Submissions</Typography></li>
        </ul>

        {user && (
          <Box sx={{ mt: 4, borderTop: 1, borderColor: 'divider', pt: 3 }}>
            <Typography variant="h5" gutterBottom>
              Account Details
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                src={user.photoURL}
                sx={{ width: 80, height: 80 }}
              >
                {user.displayName?.[0]}
              </Avatar>
              <Box>
                <Typography variant="h6">{user.displayName}</Typography>
                <Typography variant="body1" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
            </Box>
            <Button 
              variant="contained" 
              onClick={() => auth.signOut()}
              color="secondary"
              sx={{ mt: 3 }}
            >
              Logout
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Home;