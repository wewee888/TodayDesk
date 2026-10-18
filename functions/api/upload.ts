export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;

  const contentType = request.headers.get('content-type') || '';
  let account = 'lizihan';
  let category = 'board';
  let buffer: Uint8Array | null = null;
  let mime = 'image/jpeg';
  let originalName = 'upload.jpg';

  try {
    if (contentType.includes('application/json')) {
      const body = await request.json();
      account = body.account || 'lizihan';
      category = body.category || 'board';
      originalName = body.fileName || `${category}.jpg`;
      const base64Data = String(body.imageBase64 || '');

      if (!base64Data) {
        return new Response(JSON.stringify({ error: 'imageBase64 required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Extract MIME type if data URL (e.g. data:image/png;base64,...)
      const match = base64Data.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
      let pureBase64 = base64Data;
      if (match) {
        mime = match[1];
        pureBase64 = match[2];
      } else if (body.mimeType) {
        mime = body.mimeType;
      }

      const binaryStr = atob(pureBase64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      buffer = bytes;
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      account = (formData.get('account') as string) || 'lizihan';
      category = (formData.get('category') as string) || 'board';
      if (!file) {
        return new Response(JSON.stringify({ error: 'file is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      originalName = file.name || `${category}.jpg`;
      mime = file.type || 'image/jpeg';
      buffer = new Uint8Array(await file.arrayBuffer());
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported Content-Type' }), {
        status: 415,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!buffer || buffer.length === 0) {
      return new Response(JSON.stringify({ error: 'Empty file payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Determine extension
    let ext = 'jpg';
    if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('svg')) ext = 'svg';

    const safeAccount = account.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeCategory = category.replace(/[^a-zA-Z0-9_-]/g, '_');
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const r2Key = `${safeCategory}/${safeAccount}/${dateStr}-${Date.now()}-${randomSuffix}.${ext}`;
    const publicUrl = `/api/assets/${r2Key}`;
    const assetId = `asset-${Date.now()}-${randomSuffix}`;

    // Upload to Cloudflare R2
    if (env.BUCKET) {
      await env.BUCKET.put(r2Key, buffer, {
        httpMetadata: {
          contentType: mime,
          contentDisposition: `inline; filename="${encodeURIComponent(originalName)}"`,
        },
      });
    }

    // Record into Cloudflare D1
    if (env.DB) {
      await env.DB.prepare(
        `INSERT INTO uploaded_assets (id, account, category, r2_key, public_url, content_type, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(assetId, account, category, r2Key, publicUrl, mime, buffer.length)
        .run()
        .catch(() => {});
    }

    return new Response(
      JSON.stringify({
        ok: true,
        assetId,
        r2Key,
        publicUrl,
        fileSize: buffer.length,
        contentType: mime,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Upload failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
