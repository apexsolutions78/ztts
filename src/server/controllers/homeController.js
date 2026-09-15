import { getAllTourPackages } from '../models/index.js';

export async function viewHomePage(req, res, next) {
  try {
    const packages = await getAllTourPackages();
    const activePackages = packages.filter(p => p.status === 'active');
    res.render('home/index', {
      title: 'Zahabia Travel & Tourism',
      packages: activePackages
    });
  } catch (error) {
    next(error);
  }
}
