import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { scoreWithVision } from './scoring.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { photo_id } = await req.json();
  if (!photo_id) {
    return new Response(JSON.stringify({ error: 'photo_id required' }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: photo, error } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('id', photo_id)
    .single();

  if (error || !photo) {
    return new Response(JSON.stringify({ error: 'Photo not found' }), { status: 404 });
  }

  const { data: fileData } = await supabase.storage
    .from('photos')
    .download(photo.storage_path);

  let score = 50;
  if (fileData) {
    const buffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const result = await scoreWithVision(base64, Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY'));
    score = result.score;
  }

  await supabase.from('photos').update({ ai_score: score }).eq('id', photo_id);

  return new Response(JSON.stringify({ photo_id, ai_score: score }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
