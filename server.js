require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const methodOverride = require('method-override');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
}));

// Add user session info to locals for easy access in views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.successMsg = req.session.successMsg || null;
  res.locals.errorMsg = req.session.errorMsg || null;
  req.session.successMsg = null;
  req.session.errorMsg = null;
  next();
});

// Import Routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');

// Use Routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/events', eventRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
