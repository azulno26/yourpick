/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // La propiedad correcta en Next.js lleva "s" al final: ignoreDuringBuilds
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: [
      'bcryptjs',
      'jose',
      'openai',
      '@supabase/supabase-js',
    ],
  },
};

export default nextConfig;
