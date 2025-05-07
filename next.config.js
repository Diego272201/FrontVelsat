/** @type {import('next').NextConfig} */
const nextConfig = {
    compress: false, // Desactiva la compresión
    images: {
      domains: ['res.cloudinary.com'],
    },
  };
  
  module.exports = nextConfig;
  