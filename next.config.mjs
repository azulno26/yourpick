/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // La propiedad correcta en Next.js lleva "s" al final: ignoreDuringBuilds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
