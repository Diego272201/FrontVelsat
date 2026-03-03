// ARCHIVO: app/api/upload-image/route.ts
// (Si usas Pages Router, ponlo en: pages/api/upload-image.ts)

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No hay archivo' }, { status: 400 })
    }

    // Crear FormData para Cloudflare
    const cloudflareFormData = new FormData()
    cloudflareFormData.append('file', file)

    // Subir a Cloudflare desde el SERVIDOR (sin CORS)
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
        },
        body: cloudflareFormData
      }
    )

    const result = await response.json()

    if (result.success) {
      return NextResponse.json({
        success: true,
        imageId: result.result.id,
        imageUrl: `${process.env.NEXT_PUBLIC_CLOUDFLARE_DELIVERY_URL}/${result.result.id}/public`
      })
    } else {
      return NextResponse.json({ success: false, error: result.errors }, { status: 500 })
    }
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 })
  }
}

// Si usas PAGES ROUTER en lugar de APP ROUTER, usa este código:
/*
import type { NextApiRequest, NextApiResponse } from 'next'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  // Aquí tendrías que usar una librería como 'formidable' para parsear el archivo
  // Es más complejo, por eso recomiendo App Router
}
*/