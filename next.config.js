/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'd2io.vercel.app',
                pathname: '/images/**',
            },
        ],
    },
}

module.exports = nextConfig
