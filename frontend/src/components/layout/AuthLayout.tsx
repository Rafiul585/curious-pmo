import { Outlet } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  useTheme,
  useMediaQuery,
  Stack,
} from '@mui/material';
import {
  Assignment,
  Groups,
  Timeline,
  Security,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Assignment,
    title: 'Task Management',
    description: 'Organize and track tasks with powerful Kanban boards',
  },
  {
    icon: Groups,
    title: 'Team Collaboration',
    description: 'Work together seamlessly with real-time updates',
  },
  {
    icon: Timeline,
    title: 'Project Tracking',
    description: 'Visualize progress with Gantt charts and timelines',
  },
  {
    icon: Security,
    title: 'Enterprise Security',
    description: 'Bank-grade encryption and access controls',
  },
];

const FeatureItem = ({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: typeof Assignment;
  title: string;
  description: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Box
        sx={{
          p: 1,
          borderRadius: 2,
          bgcolor: 'rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon sx={{ color: 'white', fontSize: 24 }} />
      </Box>
      <Box>
        <Typography
          variant="subtitle1"
          fontWeight={600}
          sx={{ color: 'white', mb: 0.5 }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
        >
          {description}
        </Typography>
      </Box>
    </Stack>
  </motion.div>
);

export const AuthLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'grey.50',
      }}
    >
      {/* Left Panel - Branding (hidden on mobile) */}
      {!isMobile && (
        <Box
          sx={{
            flex: '0 0 45%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #5a3680 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            p: 6,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background Pattern */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.1,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Content */}
          <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '1.5rem' }}>C</Typography>
                </Box>
                <Typography
                  variant="h3"
                  fontWeight={800}
                  sx={{ color: 'white' }}
                >
                  CuriousPMO
                </Typography>
              </Stack>
              <Typography
                variant="h5"
                sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 1, fontWeight: 500, fontStyle: 'italic' }}
              >
                "Eager to know, eager to grow"
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 6 }}
              >
                Stay curious, stay ahead. Discover insights, track progress, and
                learn from every project with our intelligent management platform.
              </Typography>
            </motion.div>

            <Stack spacing={3}>
              {features.map((feature, index) => (
                <FeatureItem
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  delay={0.2 + index * 0.1}
                />
              ))}
            </Stack>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                >
                  Trusted by 10,000+ teams worldwide
                </Typography>
              </Box>
            </motion.div>
          </Box>
        </Box>
      )}

      {/* Right Panel - Form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 2, sm: 4, md: 6 },
        }}
      >
        <Container maxWidth="sm">
          {/* Mobile Logo */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 4 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '1.25rem' }}>C</Typography>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  CuriousPMO
                </Typography>
              </Stack>
            </motion.div>
          )}

          <Paper
            elevation={isMobile ? 2 : 0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              bgcolor: isMobile ? 'background.paper' : 'transparent',
              maxWidth: 440,
              mx: 'auto',
            }}
          >
            <Outlet />
          </Paper>

          {/* Footer */}
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
              &copy; {new Date().getFullYear()} CuriousPMO. All rights reserved.
            </Typography>
            <Stack
              direction="row"
              spacing={2}
              justifyContent="center"
              sx={{ mt: 1 }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  cursor: 'pointer',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                Privacy Policy
              </Typography>
              <Typography variant="body2" color="text.secondary">
                |
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  cursor: 'pointer',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                Terms of Service
              </Typography>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};
