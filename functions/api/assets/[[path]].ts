export async function onRequestGet(context: any): Promise<Response> {
  const { env, params } = context;
  const pathParam = params.path;
  const key = Array.isArray(pathParam) ? pathParam.join('/') : String(pathParam || '');

  if (!key) {
    return new Response('Asset key missing', { status: 400 });
  }

  if (!env.BUCKET) {
    return new Response('R2 Bucket not configured', { status: 503 });
  }

  try {
    const object = await env.BUCKET.get(key);
    if (!object) {
      return new Response('Asset not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    if (!headers.get('content-type')) {
      const ext = key.split('.').pop()?.toLowerCase();
      if (ext === 'png') headers.set('content-type', 'image/png');
      else if (ext === 'jpg' || ext === 'jpeg') headers.set('content-type', 'image/jpeg');
      else if (ext === 'webp') headers.set('content-type', 'image/webp');
      else headers.set('content-type', 'application/octet-stream');
    }

    return new Response(object.body, { headers });
  } catch (err: any) {
    return new Response(`Error retrieving asset: ${err.message}`, { status: 500 });
  }
}
