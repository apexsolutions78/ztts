import { findPortalToken, findFlightBookingById, findCustomerById, findTourPackageById, findTourBookingById, getFlightLiveStatus } from '../models/index.js';

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

