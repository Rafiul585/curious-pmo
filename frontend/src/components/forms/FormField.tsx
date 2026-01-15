import { TextField, TextFieldProps } from '@mui/material';

export const FormField = (props: TextFieldProps) => (
  <TextField fullWidth variant="outlined" margin="dense" {...props} />
);
