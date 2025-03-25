import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box
} from '@mui/material';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

const NavBar = () => {
  const [user] = useAuthState(auth);

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Form System
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/"
            >
              Home
            </Button>
            
            {user && (
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/admin"
              >
                My Forms
              </Button>
            )}

            {user ? (
              <Button 
                color="inherit" 
                onClick={() => auth.signOut()}
              >
                Logout
              </Button>
            ) : (
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/login"
              >
                Login
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default NavBar;