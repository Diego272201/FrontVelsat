import { NextRequest, NextResponse } from 'next/server';

// Cloudflare Images no tiene carpetas reales: se simulan con un prefijo en el ID personalizado.
const FOLDER = 'conductores';
const MAX_SIZE = 5 * 1024 * 1024;

const cfUrl = (path = '') =>
  `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1${path}`;
const authHeaders = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` };

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const codigo = Number(formData.get('codigo'));

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'No hay archivo' }, { status: 400 });
    }
    if (!Number.isInteger(codigo) || codigo <= 0) {
      return NextResponse.json({ success: false, error: 'Código de conductor inválido' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'El archivo debe ser una imagen' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'La imagen supera los 5 MB' }, { status: 400 });
    }

    // ID único por subida: evita que la caché de Cloudflare siga mostrando la foto anterior.
    const imageId = `${FOLDER}/${codigo}-${Date.now()}`;
    const cfForm = new FormData();
    cfForm.append('file', file);
    cfForm.append('id', imageId);

    const response = await fetch(cfUrl(), { method: 'POST', headers: authHeaders, body: cfForm });
    const result = await response.json();

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.errors }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imageId: result.result.id,
      imageUrl: `${process.env.NEXT_PUBLIC_CLOUDFLARE_DELIVERY_URL}/${result.result.id}/public`,
    });
  } catch (error) {
    console.error('Error subiendo imagen de conductor:', error);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { imageId } = await request.json();

    // Solo se pueden borrar imágenes de esta carpeta (no las de documentos u otros módulos).
    if (typeof imageId !== 'string' || !imageId.startsWith(`${FOLDER}/`) || imageId.includes('..')) {
      return NextResponse.json({ success: false, error: 'imageId inválido' }, { status: 400 });
    }

    const response = await fetch(cfUrl(`/${imageId}`), { method: 'DELETE', headers: authHeaders });
    const result = await response.json();

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.errors }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error eliminando imagen de conductor:', error);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}
