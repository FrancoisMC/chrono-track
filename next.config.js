/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclure soap du bundling côté serveur
      config.externals = config.externals || []
      config.externals.push('soap')
    }
    return config
  },
}

module.exports = nextConfig

