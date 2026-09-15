import QRCode from 'qrcode';

export async function generateQRSvg(url, options = {}) {
  const opts = {
    type: 'svg',
    width: options.width || 180,
    margin: options.margin || 2,
    color: {
      dark: options.dark || '#0b192c',
      light: options.light || '#ffffff'
    }
  };
  return QRCode.toString(url, opts);
}

export async function generateQRDataURL(url, options = {}) {
  return QRCode.toDataURL(url, {
    width: options.width || 200,
    margin: options.margin || 2,
    color: {
      dark: options.dark || '#0b192c',
      light: options.light || '#ffffff'
    }
  });
}
