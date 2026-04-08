import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
    width: 512,
    height: 512,
}
export const contentType = 'image/png'

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    fontSize: 300,
                    background: '#0f172a',
                    color: '#22c55e',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 100,
                }}
            >
                🎾
            </div>
        ),
        {
            ...size,
        }
    )
}
