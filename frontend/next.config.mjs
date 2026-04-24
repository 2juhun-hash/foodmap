

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.cloudflare.com' },
      { protocol: 'https', hostname: '*.kakaocdn.net' },
      { protocol: 'https', hostname: 'img1.kakaocdn.net' },
      { protocol: 'https', hostname: 'img2.kakaocdn.net' },
      { protocol: 'https', hostname: 'img3.kakaocdn.net' },
    ],
  },
};

export default nextConfig;
