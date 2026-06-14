const bcrypt = require('bcrypt');
const pool = require('../config/db');

exports.getLogin = (req, res) => {
  res.render('login');
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      req.session.errorMsg = 'Invalid email or password.';
      return res.redirect('/auth/login');
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (isMatch) {
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };
      req.session.successMsg = 'You are now logged in.';
      res.redirect(user.role === 'organizer' ? '/events/dashboard' : '/');
    } else {
      req.session.errorMsg = 'Invalid email or password.';
      res.redirect('/auth/login');
    }
  } catch (error) {
    console.error(error);
    req.session.errorMsg = 'Server error during login.';
    res.redirect('/auth/login');
  }
};

exports.getRegister = (req, res) => {
  res.render('register');
};

exports.postRegister = async (req, res) => {
  const { username, email, password, role } = req.body;
  // Fallback to 'user' if role isn't 'organizer'
  const userRole = role === 'organizer' ? 'organizer' : 'user';

  try {
    // Check if user exists
    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (checkUser.rows.length > 0) {
      req.session.errorMsg = 'Username or email already exists.';
      return res.redirect('/auth/register');
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [username, email, hash, userRole]
    );

    req.session.successMsg = 'Registration successful. You can now log in.';
    res.redirect('/auth/login');
  } catch (error) {
    console.error(error);
    req.session.errorMsg = 'Server error during registration.';
    res.redirect('/auth/register');
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/');
  });
};
