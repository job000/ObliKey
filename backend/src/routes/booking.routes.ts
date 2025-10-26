import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const bookingController = new BookingController();

// All routes require authentication
router.use(authenticate);

// Routes
router.post('/', (req, res) => bookingController.createBooking(req, res));
router.get('/my-bookings', (req, res) => bookingController.getUserBookings(req, res));
router.patch('/:id/cancel', (req, res) => bookingController.cancelBooking(req, res));

export default router;
