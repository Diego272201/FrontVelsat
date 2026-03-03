/** @type {import('next').NextConfig} */
const nextConfig = {
    compress: false, // Desactiva la compresión
    images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'ejemplo.com' }
  ]
}
  };
  
  module.exports = nextConfig;
  