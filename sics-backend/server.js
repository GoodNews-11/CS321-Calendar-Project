const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { PORT } = require('./config/env');
const errorMiddleware = require('./middleware/error.middleware');

const authRoutes     = require('./routes/auth.routes');
const eventRoutes    = require('./routes/event.routes');
const reminderRoutes = require('./routes/reminder.routes');
const weatherRoutes  = require('./routes/weather.routes');
const userRoutes     = require('./routes/user.routes');

const app = express();

connectDB();

app.use(helmet());
app.use(cors());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
}));
app.use(express.json());

app.use('/api/auth',      authRoutes);
app.use('/api/events',    eventRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/weather',   weatherRoutes);
app.use('/api/users',     userRoutes);


app.get('/', (req, res) => res.json({ message: 'SICS API running' }));

app.use(errorMiddleware);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));