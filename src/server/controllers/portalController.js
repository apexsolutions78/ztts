import { findPortalToken, findFlightBookingById, findCustomerById, findTourPackageById, findTourBookingById, getFlightLiveStatus, getMembersByBookingId, createBookingMember, deleteBookingMember, isBookingComplete, getMembersByBookingId as getMembers, createBookingMember as addMember, deleteBookingMember as removeMember, isBookingComplete as checkComplete } from '../models/index.js';
import { sendEmail, buildMemberPortalEmail, buildGroupCompleteEmail } from '../services/emailService.js';
import { logAuditAction, logNotificationRecord } from '../models/index.js';

export async function viewCustomerPortal(req, res, next) {
  try {
    const { token } = req.params;
    const tokenData = await findPortalToken(token);

    if (!tokenData) {
      return res.status(404).render('errors/404', {
        title: 'Invalid or Expired Itinerary Link',
        message: 'The customer portal link you accessed is invalid or has expired. Please contact Zahabia Travel & Tourism support.'
      });
    }

    // Check token expiry
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return res.status(404).render('errors/404', {
        title: 'Link Expired',
        message: 'This portal link has expired. Please contact Zahabia Travel & Tourism support for a new link.'
      });
    }

    const customer = await findCustomerById(tokenData.customer_id);
    let flight = null;
    let tourBooking = null;
    let tourPackage = null;
    let liveStatus = null;

    if (tokenData.flight_booking_id) {
      flight = await findFlightBookingById(tokenData.flight_booking_id);
      liveStatus = getFlightLiveStatus(flight);
    }

    if (tokenData.tour_booking_id) {
      tourBooking = await findTourBookingById(tokenData.tour_booking_id);
      if (tourBooking) {
        tourPackage = await findTourPackageById(tourBooking.tour_package_id);
      }
    }

    res.render('portal/view', {
      title: flight ? `E-Ticket & Itinerary (${flight.booking_ref})` : 'Customer Travel Portal',
      customer,
      flight,
      liveStatus,
      tourBooking,
      tourPackage,
      token
    });
  } catch (error) {
    next(error);
  }
}

export async function getMemberPortal(req, res, next) {
  try {
    const { token } = req.params;
    const tokenData = await findPortalToken(token);
    if (!tokenData || !tokenData.tour_booking_id) {
      return res.status(404).render('errors/404', { title: 'Invalid Link', message: 'This portal link is invalid.' });
    }

    const booking = await findTourBookingById(tokenData.tour_booking_id);
    if (!booking) return res.status(404).render('errors/404', { title: 'Booking Not Found' });

    const tourPackage = await findTourPackageById(booking.tour_package_id);
    const members = await getMembersByBookingId(booking.id);
    const dateRange = booking.tour_date_range_id ? (await import('../models/index.js')).then(m => m.getDateRangeById(booking.tour_date_range_id)) : null;

    res.render('portal/members', {
      title: 'Complete Your Group',
      booking,
      tourPackage,
      members,
      dateRange: await dateRange,
      token,
      error: null,
      success: null
    });
  } catch (error) {
    next(error);
  }
}

export async function postAddMember(req, res, next) {
  try {
    const { token } = req.params;
    const tokenData = await findPortalToken(token);
    if (!tokenData || !tokenData.tour_booking_id) {
      return res.status(404).render('errors/404', { title: 'Invalid Link' });
    }

    const booking = await findTourBookingById(tokenData.tour_booking_id);
    if (!booking) return res.status(404).render('errors/404', { title: 'Booking Not Found' });

    const remaining = (booking.members_required || booking.total_travelers) - (booking.members_added || 0);
    if (remaining <= 0) {
      const tourPackage = await findTourPackageById(booking.tour_package_id);
      const members = await getMembersByBookingId(booking.id);
      return res.render('portal/members', {
        title: 'Complete Your Group',
        booking, tourPackage, members, dateRange: null, token,
        error: 'All member slots are filled.',
        success: null
      });
    }

    const { full_name, passport_number, nationality, phone } = req.body;
    if (!full_name) {
      const tourPackage = await findTourPackageById(booking.tour_package_id);
      const members = await getMembersByBookingId(booking.id);
      return res.render('portal/members', {
        title: 'Complete Your Group',
        booking, tourPackage, members, dateRange: null, token,
        error: 'Full name is required.',
        success: null
      });
    }

    await createBookingMember({
      tour_booking_id: booking.id,
      full_name,
      passport_number: passport_number || null,
      nationality: nationality || null,
      phone: phone || null
    });

    // Check if booking is now complete
    const complete = await isBookingComplete(booking.id);
    if (complete) {
      // Send confirmation email
      try {
        const customer = await findCustomerById(tokenData.customer_id);
        const tourPackage = await findTourPackageById(booking.tour_package_id);
        if (customer && tourPackage) {
          const emailData = buildGroupCompleteEmail({
            customerName: customer.full_name,
            tourTitle: tourPackage.title,
            destination: tourPackage.destination,
            travelDate: booking.travel_date ? new Date(booking.travel_date).toLocaleDateString() : 'TBD',
            totalTravelers: booking.total_travelers
          });
          await sendEmail({ to: customer.email, ...emailData });
          await logNotificationRecord({ customer_id: customer.id, channel: 'email', recipient: customer.email, subject: emailData.subject, content: emailData.text, status: 'delivered' });
        }
      } catch (e) { /* non-blocking */ }
    }

    const tourPackage = await findTourPackageById(booking.tour_package_id);
    const members = await getMembersByBookingId(booking.id);
    const success = `${full_name} has been added to your group.`;
    res.render('portal/members', {
      title: 'Complete Your Group',
      booking, tourPackage, members, dateRange: null, token,
      error: null,
      success
    });
  } catch (error) {
    next(error);
  }
}

export async function postDeleteMember(req, res, next) {
  try {
    const { token, memberId } = req.params;
    const tokenData = await findPortalToken(token);
    if (!tokenData || !tokenData.tour_booking_id) {
      return res.status(404).render('errors/404', { title: 'Invalid Link' });
    }

    await deleteBookingMember(memberId);

    const booking = await findTourBookingById(tokenData.tour_booking_id);
    const tourPackage = await findTourPackageById(booking.tour_package_id);
    const members = await getMembersByBookingId(booking.id);

    res.render('portal/members', {
      title: 'Complete Your Group',
      booking, tourPackage, members, dateRange: null, token,
      error: null,
      success: 'Member removed from group.'
    });
  } catch (error) {
    next(error);
  }
}

