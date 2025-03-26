import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import MenuIcon from '@mui/icons-material/Menu';

const NavBar = () => {
  const [user] = useAuthState(auth);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const open = Boolean(anchorEl);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    auth.signOut();
    handleClose();
  };

  return (
    <AppBar position="static" elevation={0}>
      <Container maxWidth="xl">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/"
              sx={{ fontSize: '1.2rem', fontWeight: 'bold' }}
            >
              FormPulse
            </Button>
          </Typography>
          
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button color="inherit" component={RouterLink} to="/">
                Home
              </Button>
              {user && (
                <Button color="inherit" component={RouterLink} to="/my-submissions">
                  My Forms
                </Button>
              )}
            </Box>
          )}

          {user ? (
            <>
              <IconButton
                onClick={handleMenu}
                size="small"
                sx={{ ml: 2 }}
              >
                {isMobile ? (
                  <MenuIcon sx={{ color: 'white' }} />
                ) : (
                  <Avatar
                    src={user.photoURL}
                    alt={user.displayName}
                    sx={{ width: 36, height: 36 }}
                  />
                )}
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                  elevation: 0,
                  sx: {
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                    mt: 1.5,
                    '& .MuiAvatar-root': {
                      width: 32,
                      height: 32,
                      ml: -0.5,
                      mr: 1,
                    },
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={handleClose} sx={{ pointerEvents: 'none' }}>
                  <Avatar src={user.photoURL} /> {user.displayName || user.email}
                </MenuItem>
                <Divider />
                {isMobile && (
                  <>
                    <MenuItem component={RouterLink} to="/" onClick={handleClose}>
                      Home
                    </MenuItem>
                    <MenuItem component={RouterLink} to="/my-submissions" onClick={handleClose}>
                      My Forms
                    </MenuItem>
                  </>
                )}
                <MenuItem component={RouterLink} to="/admin" onClick={handleClose}>
                  Admin
                </MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            (
              <Button color="inherit" component={RouterLink} to="/login">
                Login
              </Button>
            )
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default NavBar;