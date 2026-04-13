/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/chat', destination: '/plans?coach=1', permanent: false },
      { source: '/chat/settings', destination: '/settings', permanent: false },
    ]
  },
};

export default nextConfig;
