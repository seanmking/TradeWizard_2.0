/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure webpack to handle Node.js modules in the browser
  webpack: (config, { isServer }) => {
    // If we're in the browser (client-side), provide empty module fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Provide empty module definitions for Node.js modules that the browser doesn't need
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig; 