import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Stratedge - AI Journal',
        short_name: 'Stratedge',
        description: 'Professional Trading Journal with AI Analytics',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
            {
                src: '/mobileapp.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/mobileapp.png',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/mobileapp.png',
                sizes: '180x180',
                type: 'image/png',
            },
        ],
    }
}
