module.exports = {
  ensureAuthenticated: (req, res, next) => {
    if (req.session.user) {
      return next();
    }
    req.session.errorMsg = 'Please log in to view that resource.';
    res.redirect('/auth/login');
  },
  
  ensureOrganizer: (req, res, next) => {
    if (req.session.user && req.session.user.role === 'organizer') {
      return next();
    }
    req.session.errorMsg = 'Access Denied: Organizer role required.';
    res.redirect('/');
  }
};
