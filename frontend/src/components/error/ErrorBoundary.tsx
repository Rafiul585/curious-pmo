import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Container, Typography, Paper } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log error to monitoring service (e.g., Sentry)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth="sm">
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <ErrorOutline
                sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
              />
              <Typography variant="h5" gutterBottom fontWeight={600}>
                Something went wrong
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                We're sorry, but something unexpected happened. Please try
                refreshing the page or contact support if the problem persists.
              </Typography>
              {import.meta.env.DEV && this.state.error && (
                <Paper
                  sx={{
                    p: 2,
                    mb: 3,
                    bgcolor: 'error.main',
                    color: 'error.contrastText',
                    textAlign: 'left',
                    borderRadius: 2,
                    overflow: 'auto',
                    maxHeight: 200,
                  }}
                >
                  <Typography
                    variant="caption"
                    component="pre"
                    sx={{ fontFamily: 'monospace', m: 0 }}
                  >
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.errorInfo?.componentStack}
                  </Typography>
                </Paper>
              )}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={this.handleReset}
                  startIcon={<Refresh />}
                >
                  Try Again
                </Button>
                <Button variant="contained" onClick={this.handleReload}>
                  Reload Page
                </Button>
              </Box>
            </Paper>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}
