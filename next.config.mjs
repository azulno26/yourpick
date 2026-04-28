/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // La propiedad correcta en Next.js lleva "s" al final: ignoreDuringBuilds
    ignoreDuringBuilds: true,
  },
  serverComponentsExternalPackages: [
    'bcryptjs',
    'jose',
    'resend',
    '@anthropic-ai/sdk',
    'openai',
    '@supabase/supabase-js',
  ],
};

export default nextConfig;
