const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  
  // Оптимизации для production
  compress: true,
  poweredByHeader: false,
  
  // Отключаем генерацию source maps в production для ускорения
  productionBrowserSourceMaps: false,
  
  // Упрощаем оптимизацию изображений
  images: {
    domains: ['tile.openstreetmap.org'],
    unoptimized: false,
    minimumCacheTTL: 86400,
  },

  webpack: (config, { isServer }) => {
    // Настройка для pdfjs-dist
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/build/pdf.worker.entry': 'pdfjs-dist/build/pdf.worker.mjs',
      three: path.resolve(__dirname, 'node_modules/three'),
    };

    // Исключение pdfjs-dist из серверного бандла
    if (isServer) {
      config.externals = [...config.externals, 'pdfjs-dist'];
    }

    return config;
  },

  async headers() {
    return [
      {
        source: '/external/og/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  // Увеличиваем лимит размера тела запроса для загрузки больших файлов (панорамы, 3D модели)
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb', // Увеличено для больших панорам и 3D моделей
    },
  },
};

module.exports = nextConfig;
