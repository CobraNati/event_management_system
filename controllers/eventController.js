const pool = require('../config/db');

// --- Public/User Views ---

exports.getAllEvents = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY date ASC');
    res.render('index', { events: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

exports.getEventDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT e.*, u.username as organizer_name 
      FROM events e 
      JOIN users u ON e.organizer_id = u.id 
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).send('Event not found');
    }
    
    // Check if the current user has booked this
    let isBooked = false;
    if (req.session.user) {
      const bookCheck = await pool.query(
        'SELECT * FROM bookings WHERE user_id = $1 AND event_id = $2',
        [req.session.user.id, id]
      );
      isBooked = bookCheck.rows.length > 0;
    }

    res.render('event', { event: result.rows[0], isBooked });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

exports.bookEvent = async (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;

  try {
    // Start transaction
    await pool.query('BEGIN');
    
    const eventResult = await pool.query('SELECT available_seats FROM events WHERE id = $1 FOR UPDATE', [id]);
    if (eventResult.rows.length === 0) throw new Error('Event not found');
    
    if (eventResult.rows[0].available_seats <= 0) {
      throw new Error('No seats available');
    }

    // Insert booking
    await pool.query('INSERT INTO bookings (user_id, event_id) VALUES ($1, $2)', [userId, id]);
    
    // Decrease seats
    await pool.query('UPDATE events SET available_seats = available_seats - 1 WHERE id = $1', [id]);
    
    await pool.query('COMMIT');
    req.session.successMsg = 'Ticket booked successfully!';
    res.redirect(`/events/${id}`);
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    req.session.errorMsg = error.message || 'Could not book the event. You may have already booked it.';
    res.redirect(`/events/${id}`);
  }
};

// --- Dashboard ---

exports.getDashboard = async (req, res) => {
  const userId = req.session.user.id;
  const role = req.session.user.role;

  try {
    if (role === 'organizer') {
      // Fetch events created by organizer
      const result = await pool.query('SELECT * FROM events WHERE organizer_id = $1 ORDER BY date DESC', [userId]);
      res.render('dashboard', { myEvents: result.rows, bookings: [] });
    } else {
      // Fetch events booked by user
      const result = await pool.query(`
        SELECT e.*, b.booking_date 
        FROM events e 
        JOIN bookings b ON e.id = b.event_id 
        WHERE b.user_id = $1 
        ORDER BY b.booking_date DESC
      `, [userId]);
      res.render('dashboard', { myEvents: [], bookings: result.rows });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// --- Organizer CRUD ---

exports.getCreateEvent = (req, res) => {
  res.render('create-event');
};

exports.postCreateEvent = async (req, res) => {
  const { title, description, date, location, available_seats } = req.body;
  const organizerId = req.session.user.id;

  try {
    await pool.query(
      'INSERT INTO events (title, description, date, location, available_seats, organizer_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [title, description, date, location, available_seats, organizerId]
    );
    req.session.successMsg = 'Event created successfully!';
    res.redirect('/events/dashboard');
  } catch (error) {
    console.error(error);
    req.session.errorMsg = 'Error creating event';
    res.redirect('/events/create');
  }
};

exports.getEditEvent = async (req, res) => {
  const { id } = req.params;
  const organizerId = req.session.user.id;
  
  try {
    const result = await pool.query('SELECT * FROM events WHERE id = $1 AND organizer_id = $2', [id, organizerId]);
    if (result.rows.length === 0) {
      req.session.errorMsg = 'Event not found or unauthorized.';
      return res.redirect('/events/dashboard');
    }
    
    // Format date for datetime-local input
    const event = result.rows[0];
    const localDate = new Date(event.date);
    // YYYY-MM-DDThh:mm
    event.formattedDate = localDate.toISOString().slice(0, 16);
    
    res.render('edit-event', { event });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

exports.putEditEvent = async (req, res) => {
  const { id } = req.params;
  const organizerId = req.session.user.id;
  const { title, description, date, location, available_seats } = req.body;

  try {
    const result = await pool.query(
      'UPDATE events SET title = $1, description = $2, date = $3, location = $4, available_seats = $5 WHERE id = $6 AND organizer_id = $7',
      [title, description, date, location, available_seats, id, organizerId]
    );
    if (result.rowCount === 0) {
      req.session.errorMsg = 'Unauthorized or event not found.';
    } else {
      req.session.successMsg = 'Event updated successfully!';
    }
    res.redirect('/events/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

exports.deleteEvent = async (req, res) => {
  const { id } = req.params;
  const organizerId = req.session.user.id;

  try {
    const result = await pool.query('DELETE FROM events WHERE id = $1 AND organizer_id = $2', [id, organizerId]);
    if (result.rowCount === 0) {
      req.session.errorMsg = 'Unauthorized or event not found.';
    } else {
      req.session.successMsg = 'Event deleted successfully!';
    }
    res.redirect('/events/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};
