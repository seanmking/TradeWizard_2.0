// Import comtrade routes
const comtradeRoutes = require('./routes/comtradeRoutes');
const tradeRoutes = require('./routes/tradeRoutes');

// ... existing code ...

// Register routes
// ... existing routes ...
app.use('/api/comtrade', comtradeRoutes);
app.use('/api/trade', tradeRoutes);

// Create visualizations directory if it doesn't exist
const fs = require('fs');
const path = require('path');
const visualizationsDir = path.join(__dirname, '../../public/visualizations');
if (!fs.existsSync(visualizationsDir)) {
  fs.mkdirSync(visualizationsDir, { recursive: true });
}

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../../public')));

// ... rest of your app.js ... 