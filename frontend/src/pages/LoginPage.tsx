import { useRef, useState, FormEvent } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress } from '@mui/material';
import { useLoginMutation } from '../api/authApi';
import { useNavigate } from 'react-router-dom';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState('');

  // Using refs instead of controlled state
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const username = usernameRef.current?.value || '';
    const password = passwordRef.current?.value || '';

    console.log('Submitting:', { username, password }); // Debug log

    if (!username.trim()) {
      setError('Please enter username');
      return;
    }
    if (!password) {
      setError('Please enter password');
      return;
    }

    try {
      const result = await login({ username: username.trim(), password }).unwrap();
      console.log('Login success:', result); // Debug log
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      console.error('Login error:', err); // Debug log
      const apiError = err as { data?: { detail?: string; error?: string } };
      setError(apiError?.data?.detail || apiError?.data?.error || 'Login failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom align="center">
        Login
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        <TextField
          inputRef={usernameRef}
          label="Username"
          fullWidth
          margin="normal"
          defaultValue=""
          inputProps={{ 'data-testid': 'username-input' }}
        />

        <TextField
          inputRef={passwordRef}
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          defaultValue=""
          inputProps={{ 'data-testid': 'password-input' }}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={isLoading}
          sx={{ mt: 3 }}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Login'}
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
        Test: john_doe / password123
      </Typography>
    </Box>
  );
};
