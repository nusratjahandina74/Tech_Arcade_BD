/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal, self-contained server bundle (only the files actually
  // needed at runtime) — this is what keeps the Docker image small and makes
  // `docker build` reproducible regardless of which host it later runs on.
  // output: "standalone",
  
  images: {
    remotePatterns: [
      { 
        protocol: "https", 
        hostname: "res.cloudinary.com",
        pathname: "/**", 
      },
    ],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

module.exports = nextConfig;
