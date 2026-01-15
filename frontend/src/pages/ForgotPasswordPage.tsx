import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack, Email, CheckCircle } from '@mui/icons-material';
import { useRequestPasswordResetMutation } from '../api/userApi';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [requestReset, { isLoading }] = useRequestPasswordResetMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await requestReset({ email }).unwrap();
      setSubmitted(true);
    } catch (err: any) {
      // Show success even on error to prevent email enumeration
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100%',
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'success.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
          </Box>

          <Typography variant="h5" fontWeight={700} gutterBottom>
            Check your email
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 3 }}>
            If an account exists for <strong>{email}</strong>, you will receive password reset
            instructions shortly.
          </Typography>

          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            Didn't receive the email? Check your spam folder or try again.
          </Alert>

          <Stack spacing={2}>
            <Button
              variant="outlined"
              onClick={() => {
                setSubmitted(false);
                setEmail('');
              }}
            >
              Try another email
            </Button>

            <Link component={RouterLink} to="/login" underline="hover">
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                <ArrowBack fontSize="small" />
                <span>Back to Login</span>
              </Stack>
            </Link>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 440, width: '100%' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <Email sx={{ fontSize: 32, color: 'primary.main' }} />
          </Box>

          <Typography variant="h5" fontWeight={700} gutterBottom>
            Forgot your password?
          </Typography>

          <Typography color="text.secondary">
            No worries! Enter your email address and we'll send you instructions to reset your
            password.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="Enter your email address"
              InputProps={{
                startAdornment: <Email color="action" sx={{ mr: 1 }} />,
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Instructions'}
            </Button>
          </Stack>
        </form>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Link component={RouterLink} to="/login" underline="hover">
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
              <ArrowBack fontSize="small" />
              <span>Back to Login</span>
            </Stack>
          </Link>
        </Box>
      </Paper>
    </Box>
  );
};
