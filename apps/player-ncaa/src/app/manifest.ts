import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Coach Pocket',
        short_name: 'Coach Pocket',
        description: 'The ultimate tennis coaching application',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#22c55e',
        icons: [
            {
                src: '/icon',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/apple-icon',
                sizes: '180x180',
                type: 'image/png',
            },
        ],
    }
}
