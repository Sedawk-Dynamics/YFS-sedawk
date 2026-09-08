/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      // The F1 registration posts up to six KYC files in one action: PAN,
      // Aadhaar front and back, address proof and cancelled cheque at 5 MB
      // each, plus a 2 MB photograph. That is 27 MB of documents before form
      // fields and multipart overhead, against a 1 MB default.
      bodySizeLimit: '32mb',
    },
  },
}

export default nextConfig
