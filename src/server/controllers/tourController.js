import { 
  getAllTourPackages, 
  findTourPackageById, 
  createTourPackage,
  updateTourPackage,
  deleteTourPackage,
  getAllCustomers, 
  findCustomerById,
  createTourBooking, 
  cancelTourBooking,
  findTourBookingById,
  getAllTourBookings,
  createPortalToken,
  findPortalTokenByTourBooking,
  addPayment,
  logAuditAction,
  logNotificationRecord
} from '../models/index.js';
import { sendEmail, buildTourConfirmationEmail } from '../services/emailService.js';
import { sendWhatsApp, buildTourConfirmationWhatsAppMessage } from '../services/whatsAppService.js';

export async function listTours(req, res, next) {
  try {
    const packages = await getAllTourPackages();
    const tourBookings = await getAllTourBookings();
    const { activeCurrency, exchangeRates } = res.locals;
    res.render('admin/tours/index', {
      title: 'Tour Packages & Reservations',
      packages,
      tourBookings,
      activeCurrency,
      exchangeRates
    });
  } catch (error) {
    next(error);
  }
}

export async function getNewTourForm(req, res) {
  const { activeCurrency, exchangeRates } = res.locals;
  res.render('admin/tours/new', {
    title: 'Create Tour Package',
    activeCurrency,
    exchangeRates
  });
}

export async function postCreateTour(req, res, next) {
  try {
    const { title, destination, duration_days, price, description, image_url } = req.body;
    if (!title || !destination || !price) {
      const { activeCurrency, exchangeRates } = res.locals;
      return res.status(400).render('admin/tours/new', {
        title: 'Create Tour Package',
        activeCurrency,
        exchangeRates,
        error: 'Title, destination, and price are required.'
      });
    }

    let finalImageUrl = image_url || '';
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
    } else if (!finalImageUrl) {
      finalImageUrl = '/static/img/default_tour.jpg';
    }

    const pkg = await createTourPackage({
      title,
      destination,
      duration_days: duration_days || 1,
      price: Number(price),
      description,
      image_url: finalImageUrl
    });

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'CREATE_TOUR_PACKAGE',
      entity_type: 'tour',
      entity_id: pkg.id,
      details: `Created tour package: ${title}`
    });

    res.redirect('/admin/tours');
  } catch (error) {
    next(error);
  }
}

export async function viewTourDetail(req, res, next) {
  try {
    const pkg = await findTourPackageById(req.params.id);
    if (!pkg) return res.status(404).render('errors/404', { title: 'Tour Package Not Found' });
    const customers = await getAllCustomers();
    const { activeCurrency, exchangeRates } = res.locals;

    res.render('admin/tours/show', {
      title: pkg.title,
      package: pkg,
      customers,
      activeCurrency,
      exchangeRates
    });
  } catch (error) {
    next(error);
  }
}

export async function viewTourBooking(req, res, next) {
  try {
    const booking = await findTourBookingById(req.params.id);
    if (!booking) return res.status(404).render('errors/404', { title: 'Tour Booking Not Found' });

    const pkg = await findTourPackageById(booking.tour_package_id);
    const portalTokenRecord = await findPortalTokenByTourBooking(booking.id);
    const { activeCurrency, exchangeRates } = res.locals;

    res.render('admin/tours/booking', {
      title: `Tour Booking: ${booking.tour_title}`,
      booking,
      package: pkg,
      portalToken: portalTokenRecord ? portalTokenRecord.token : null,
      activeCurrency,
      exchangeRates
    });
  } catch (error) {
    next(error);
  }
}

export async function postBookTour(req, res, next) {
  try {
    const { tour_package_id, customer_id, travel_date, total_travelers, pay_now, pay_amount, pay_amount_usd, pay_reference } = req.body;
    const pkg = await findTourPackageById(tour_package_id);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const totalAmount = pkg.price * (Number(total_travelers) || 1);
    const booking = await createTourBooking({
      tour_package_id,
      customer_id,
      travel_date,
      total_travelers,
      total_amount: totalAmount
    });

    // Record initial payment if provided
    if (pay_now && pay_now !== 'no' && pay_amount && Number(pay_amount) > 0) {
      const finalPayAmount = pay_amount_usd ? Number(pay_amount_usd) : Number(pay_amount);
      await addPayment({
        booking_type: 'tour',
        booking_id: booking.id,
        amount: finalPayAmount,
        payment_method: pay_now,
        payment_reference: pay_reference,
        recorded_by: req.session.user.id
      });
    }

    // Log audit
    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'CREATE_TOUR_BOOKING',
      entity_type: 'tour',
      entity_id: booking.id,
      details: `Booked tour: ${pkg.title} for ${total_travelers} traveler(s)`
    });

    // Auto-send notifications
    const customer = await findCustomerById(customer_id);
    if (customer) {
      const portalToken = await createPortalToken({
        customer_id: customer.id,
        tour_booking_id: booking.id
      });
      const portalUrl = `${req.protocol}://${req.get('host')}/t/${portalToken}`;

      // Email notification
      if (customer.email) {
        const emailContent = buildTourConfirmationEmail({
          customerName: customer.full_name,
          tourTitle: pkg.title,
          destination: pkg.destination,
          travelDate: travel_date,
          totalTravelers: total_travelers,
          totalAmount,
          portalUrl
        });
        const emailResult = await sendEmail({ to: customer.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
        await logNotificationRecord({ customer_id: customer.id, flight_booking_id: null, channel: 'email', recipient: customer.email, subject: emailContent.subject, content: emailContent.text, status: emailResult.success ? 'delivered' : 'failed' });
      }

      // WhatsApp notification
      if (customer.phone) {
        const waMessage = buildTourConfirmationWhatsAppMessage({
          customerName: customer.full_name,
          tourTitle: pkg.title,
          destination: pkg.destination,
          travelDate: travel_date,
          totalTravelers: total_travelers,
          totalAmount,
          portalUrl
        });
        const waResult = await sendWhatsApp({ to: customer.phone, message: waMessage });
        await logNotificationRecord({ customer_id: customer.id, flight_booking_id: null, channel: 'whatsapp', recipient: customer.phone, subject: `WhatsApp Tour: ${pkg.title}`, content: waMessage, status: waResult.success ? 'delivered' : 'failed' });
      }
    }

    res.redirect('/admin/tours?booked=true');
  } catch (error) {
    next(error);
  }
}

export async function getEditTourForm(req, res, next) {
  try {
    const pkg = await findTourPackageById(req.params.id);
    if (!pkg) return res.status(404).render('errors/404', { title: 'Tour Package Not Found' });
    const { activeCurrency, exchangeRates } = res.locals;
    res.render('admin/tours/edit', {
      title: `Edit: ${pkg.title}`,
      package: pkg,
      activeCurrency,
      exchangeRates
    });
  } catch (error) {
    next(error);
  }
}

export async function postUpdateTour(req, res, next) {
  try {
    const { id } = req.params;
    const { title, destination, duration_days, price, description, image_url, status } = req.body;
    if (!title || !destination || !price) {
      const pkg = await findTourPackageById(id);
      const { activeCurrency, exchangeRates } = res.locals;
      return res.status(400).render('admin/tours/edit', {
        title: `Edit: ${pkg?.title}`,
        package: { ...pkg, ...req.body, id },
        activeCurrency,
        exchangeRates,
        error: 'Title, destination, and price are required.'
      });
    }

    let finalImageUrl = image_url || '';
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
    } else if (!finalImageUrl) {
      finalImageUrl = '/static/img/default_tour.jpg';
    }

    await updateTourPackage(id, { title, destination, duration_days, price: Number(price), description, image_url: finalImageUrl, status });

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'UPDATE_TOUR_PACKAGE',
      entity_type: 'tour',
      entity_id: id,
      details: `Updated tour package: ${title}`
    });

    res.redirect(`/admin/tours?updated=true`);
  } catch (error) {
    next(error);
  }
}

export async function postDeleteTour(req, res, next) {
  try {
    const { id } = req.params;
    const pkg = await findTourPackageById(id);
    await deleteTourPackage(id);

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'DELETE_TOUR_PACKAGE',
      entity_type: 'tour',
      entity_id: id,
      details: `Deleted tour package: ${pkg ? pkg.title : id}`
    });

    res.redirect('/admin/tours?deleted=true');
  } catch (error) {
    next(error);
  }
}

export async function postCancelTourBooking(req, res, next) {
  try {
    const { id } = req.params;
    const booking = await findTourBookingById(id);
    await cancelTourBooking(id);

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'CANCEL_TOUR_BOOKING',
      entity_type: 'tour',
      entity_id: id,
      details: `Cancelled tour booking: ${booking ? booking.tour_title : id}`
    });

    res.redirect('/admin/tours?cancelled=true');
  } catch (error) {
    next(error);
  }
}
