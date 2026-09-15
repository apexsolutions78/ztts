import { getDashboardStats, getAllFlightBookings, getAllTourPackages, getAllCustomers } from '../models/index.js';

export async function getApiInfo(_req, res) {
  res.json({
    name: 'Zahabia Travel & Tourism – Apex Solutions API',
    version: '1.0.0',
    endpoints: [
      '/api/stats',
      '/api/flights',
      '/api/tours',
      '/api/customers'
    ]
  });
}

export async function getStats(_req, res, next) {
  try {
    const stats = await getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

export async function getFlights(_req, res, next) {
  try {
    const flights = await getAllFlightBookings();
    res.json({ success: true, count: flights.length, data: flights });
  } catch (error) {
    next(error);
  }
}

export async function getTours(_req, res, next) {
  try {
    const tours = await getAllTourPackages();
    res.json({ success: true, count: tours.length, data: tours });
  } catch (error) {
    next(error);
  }
}

export async function getCustomers(_req, res, next) {
  try {
    const customers = await getAllCustomers();
    res.json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    next(error);
  }
}
