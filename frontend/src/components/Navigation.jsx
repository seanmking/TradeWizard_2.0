import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';

const Navigation = () => {
  return (
    <div>
      {/* Add this to your navigation menu items */}
      <Button
        component={Link}
        to="/trade-explorer"
        color="inherit"
        startIcon={<BarChartIcon />}
      >
        Trade Explorer
      </Button>
    </div>
  );
};

export default Navigation; 