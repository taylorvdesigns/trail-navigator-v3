import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';

interface WordPressConfigProps {
  onConfigComplete: (url: string) => void;
}

const WordPressConfig: React.FC<WordPressConfigProps> = ({ onConfigComplete }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if we already have a stored URL
    const storedUrl = localStorage.getItem('wordpress_url');
    if (storedUrl) {
      onConfigComplete(storedUrl);
    }
  }, [onConfigComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Test the URL by making a request to the config endpoint
      const response = await fetch(`${url}/wp-json/trail-navigator/v1/config`);
      if (!response.ok) {
        throw new Error('Invalid WordPress URL');
      }

      // Store the URL in localStorage
      localStorage.setItem('wordpress_url', url);
      onConfigComplete(url);
    } catch (err) {
      setError('Please enter a valid WordPress URL');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center'
        }}
      >
        <Typography variant="h5" gutterBottom>
          Welcome to Trail Navigator
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Please enter your WordPress site URL to continue
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="WordPress URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            error={!!error}
            helperText={error}
            placeholder="http://your-wordpress-site.com"
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
          >
            Continue
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default WordPressConfig; 