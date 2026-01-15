import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  PersonAdd,
  Business,
} from '@mui/icons-material';
import { useRegisterMutation } from '../api/authApi';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { motion } from 'framer-motion';

// Validation schema
const registerSchema = z
  .object({
    username: z
      .string()
      .min(1, 'Username is required')
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    agreeToTerms: z.boolean().refine((val: boolean) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
  })
  .refine((data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerUser, { isLoading }] = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      first_name: '',
      last_name: '',
      agreeToTerms: false,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const { confirmPassword, agreeToTerms, ...registerData } = data;
      await registerUser(registerData).unwrap();
      enqueueSnackbar('Account created successfully!', { variant: 'success' });
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { data?: { detail?: string; error?: string; username?: string[]; email?: string[] } };
      if (error?.data?.username) {
        setError('username', { message: error.data.username[0] });
      }
      if (error?.data?.email) {
        setError('email', { message: error.data.email[0] });
      }
      const message =
        error?.data?.detail || error?.data?.error || 'Registration failed. Please try again.';
      setError('root', { message });
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 3,
            bgcolor: 'primary.main',
            color: 'white',
            mb: 2,
          }}
        >
          <Business sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Create your account
        </Typography>
        <Typography color="text.secondary">
          Start managing your projects with CuriousPMO
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <TextField
            {...register('username')}
            label="Username"
            placeholder="Choose a username"
            error={!!errors.username}
            helperText={errors.username?.message}
            autoComplete="username"
            autoFocus
            fullWidth
            InputProps={{ sx: { borderRadius: 2 } }}
          />

          <TextField
            {...register('email')}
            label="Email"
            placeholder="Enter your email"
            type="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            autoComplete="email"
            fullWidth
            InputProps={{ sx: { borderRadius: 2 } }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              {...register('first_name')}
              label="First name"
              placeholder="John"
              error={!!errors.first_name}
              helperText={errors.first_name?.message}
              fullWidth
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            <TextField
              {...register('last_name')}
              label="Last name"
              placeholder="Doe"
              error={!!errors.last_name}
              helperText={errors.last_name?.message}
              fullWidth
              InputProps={{ sx: { borderRadius: 2 } }}
            />
          </Stack>

          <TextField
            {...register('password')}
            label="Password"
            placeholder="Create a strong password"
            type={showPassword ? 'text' : 'password'}
            error={!!errors.password}
            helperText={errors.password?.message}
            autoComplete="new-password"
            fullWidth
            InputProps={{
              sx: { borderRadius: 2 },
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            {...register('confirmPassword')}
            label="Confirm password"
            placeholder="Confirm your password"
            type={showConfirmPassword ? 'text' : 'password'}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            autoComplete="new-password"
            fullWidth
            InputProps={{
              sx: { borderRadius: 2 },
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControlLabel
            control={
              <Checkbox
                {...register('agreeToTerms')}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                I agree to the{' '}
                <Link href="#" underline="hover">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="#" underline="hover">
                  Privacy Policy
                </Link>
              </Typography>
            }
          />
          {errors.agreeToTerms && (
            <Typography variant="caption" color="error">
              {errors.agreeToTerms.message}
            </Typography>
          )}

          {errors.root && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {errors.root.message}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isLoading}
            startIcon={
              isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <PersonAdd />
              )
            }
            sx={{
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>

          <Divider sx={{ my: 1 }}>
            <Typography variant="body2" color="text.secondary">
              or
            </Typography>
          </Divider>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link
                component={RouterLink}
                to="/login"
                underline="hover"
                fontWeight={600}
              >
                Sign in
              </Link>
            </Typography>
          </Box>
        </Stack>
      </Box>
    </motion.div>
  );
};
