import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'D2R Loot Logger',
    description: 'Real-time loot tracking for Diablo II Resurrected',
    icons: {
        icon: '/favicon.svg',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>{children}</body>
        </html>
    );
}
