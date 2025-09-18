/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  compiler: {
    removeConsole: false,
  },
  images: {
    domains: ['images.unsplash.com'],
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty');

    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader' },
    });

    config.module.rules.push({
      test: /HeartbeatWorker\..*\.js$/,
      type: 'asset/resource',
    });

    return config;
  },
  experimental: {
    esmExternals: 'loose',
  },
};

module.exports = nextConfig; 