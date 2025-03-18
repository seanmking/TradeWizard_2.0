import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Container,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Alert,
} from '@mui/material';

const TradeDataExplorer = () => {
  // State for form inputs
  const [reporters, setReporters] = useState([]);
  const [selectedReporter, setSelectedReporter] = useState('');
  const [selectedFlow, setSelectedFlow] = useState('M'); // Default to imports
  const [selectedPeriod, setSelectedPeriod] = useState('2022'); // Default to 2022
  const [selectedCommodity, setSelectedCommodity] = useState('TOTAL'); // Default to all commodities
  
  // State for API data and loading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visualization, setVisualization] = useState(null);
  const [topPartners, setTopPartners] = useState([]);
  
  // Load reporter countries on component mount
  useEffect(() => {
    const fetchReporters = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/comtrade/reporters');
        setReporters(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching reporters:', err);
        setError('Failed to load country list. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchReporters();
  }, []);
  
  // Generate periods (last 10 years)
  const generatePeriods = () => {
    const currentYear = new Date().getFullYear();
    const periods = [];
    
    // Add last 10 years
    for (let year = currentYear; year >= currentYear - 10; year--) {
      periods.push({ value: year.toString(), label: year.toString() });
    }
    
    return periods;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedReporter) {
      setError('Please select a reporter country');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch top partners
      const topPartnersResponse = await axios.get('/api/comtrade/top-partners', {
        params: {
          reporter: selectedReporter,
          flow: selectedFlow,
          period: selectedPeriod,
          limit: 10
        }
      });
      
      setTopPartners(topPartnersResponse.data);
      
      // Generate visualization
      const visualizationResponse = await axios.get('/api/comtrade/visualization', {
        params: {
          reporter: selectedReporter,
          flow: selectedFlow,
          period: selectedPeriod,
          commodity: selectedCommodity,
          limit: 10
        }
      });
      
      setVisualization(visualizationResponse.data.imageUrl);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching trade data:', err);
      setError('Failed to load trade data. Please try again later.');
      setLoading(false);
    }
  };
  
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          International Trade Data Explorer
        </Typography>
        <Typography variant="subtitle1" align="center" color="textSecondary" paragraph>
          Explore trade data from the UN Comtrade database
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}
        
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Reporter Country</InputLabel>
                  <Select
                    value={selectedReporter}
                    onChange={(e) => setSelectedReporter(e.target.value)}
                    disabled={loading || reporters.length === 0}
                  >
                    {reporters.map((reporter) => (
                      <MenuItem key={reporter.id} value={reporter.id}>
                        {reporter.text}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Trade Flow</InputLabel>
                  <Select
                    value={selectedFlow}
                    onChange={(e) => setSelectedFlow(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="M">Imports</MenuItem>
                    <MenuItem value="X">Exports</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Period</InputLabel>
                  <Select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    disabled={loading}
                  >
                    {generatePeriods().map((period) => (
                      <MenuItem key={period.value} value={period.value}>
                        {period.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Commodity</InputLabel>
                  <Select
                    value={selectedCommodity}
                    onChange={(e) => setSelectedCommodity(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="TOTAL">All Commodities</MenuItem>
                    {/* Add more commodity options as needed */}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={loading || !selectedReporter}
                >
                  {loading ? <CircularProgress size={24} /> : 'Generate Visualization'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
        
        {visualization && (
          <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h5" gutterBottom>
              Top Trading Partners
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <img 
                src={visualization} 
                alt="Trade visualization" 
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </Box>
          </Paper>
        )}
        
        {topPartners.length > 0 && (
          <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h5" gutterBottom>
              Top Partners Data
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Rank</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Partner</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Trade Value (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {topPartners.map((partner, index) => (
                    <tr key={partner.partnerCode}>
                      <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{index + 1}</td>
                      <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{partner.partnerDesc}</td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                        {new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: 'USD',
                          maximumFractionDigits: 0
                        }).format(partner.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default TradeDataExplorer; 