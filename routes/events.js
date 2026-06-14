const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { ensureAuthenticated, ensureOrganizer } = require('../middlewares/authMiddleware');

router.get('/dashboard', ensureAuthenticated, eventController.getDashboard);


router.get('/create', ensureAuthenticated, ensureOrganizer, eventController.getCreateEvent);
router.post('/', ensureAuthenticated, ensureOrganizer, eventController.postCreateEvent);

router.get('/:id/edit', ensureAuthenticated, ensureOrganizer, eventController.getEditEvent);
router.put('/:id', ensureAuthenticated, ensureOrganizer, eventController.putEditEvent);
router.delete('/:id', ensureAuthenticated, ensureOrganizer, eventController.deleteEvent);

router.get('/:id', eventController.getEventDetails);


router.post('/:id/book', ensureAuthenticated, eventController.bookEvent);

module.exports = router;
