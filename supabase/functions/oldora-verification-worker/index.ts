// OLDORA automated verification worker — staging only, NEVER publishes.
// Deploy only after the SQL queue migration and configure OLDORA_WORKER_SECRET.
// Invoke from a trusted scheduler with Authorization: Bearer <OLDORA_WORKER_SECRET>.
// SUPABASE_SERVICE_ROLE_KEY must remain server-side. Never ship it to GitHub Pages.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('OLDORA_WORKER_SECRET');
  if (!secret || request.headers.get('Authorization') !== 'Bearer ' + secret) {
    return new Response('Unauthorized', { status: 401 });
  }
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return new Response('Worker not configured', { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // Recover only interrupted checks; never retry permanent failures automatically.
  const { error: recoveryError } = await db.rpc('oldora_requeue_stale_verification', {
    p_stale_minutes: 30, p_limit: 25
  });
  if (recoveryError) return new Response('Recovery unavailable', { status: 503 });
  const { error: queueError } = await db.rpc('oldora_queue_pending_verification', { p_limit: 20 });
  if (queueError) return new Response('Queue unavailable', { status: 503 });
  // Claim jobs in one database transaction; concurrent invocations cannot claim the same job.
  const { data: jobs, error: jobsError } = await db.rpc('oldora_claim_verification_jobs', { p_limit: 10 });
  if (jobsError) return new Response('Job claim unavailable', { status: 503 });
  let checked = 0;
  for (const job of jobs || []) {
    try {
      const { data: product, error: productError } = await db.from('products')
        .select('id,seller_id,status,age_verified,title,description,price,category,condition,item_age,manufacture_year,country_of_origin,materials,restoration_repairs,image_urls,image_path')
        .eq('id', job.product_id).single();
      if (productError || !product) throw Error('Product unavailable');
      if (product.status !== 'pending' || product.age_verified !== false) {
        await db.from('oldora_verification_jobs').update({ state: 'failed', last_error: 'Listing is no longer pending', updated_at: new Date().toISOString() }).eq('product_id', job.product_id);
        continue;
      }
      const allowedCategories = new Set([
        'Classic Cars','Classic Motorcycles','Antiques & Collectibles',
        'Vintage Watches & Clocks','Vintage Electronics','Cameras & Photography',
        'Furniture & Home Décor','Coins & Banknotes','Stamps & Postcards',
        'Books & Magazines','Art & Paintings','Jewelry & Accessories',
        'Fashion & Clothing','Toys & Games','Automotive Parts',
        'Historical Memorabilia','Traditional & Heritage Items',
        'Other Vintage Items','Retro Collectibles'
      ]);
      const categoryAllowed = allowedCategories.has(product.category);
      const ageMin = product.category === 'Retro Collectibles' ? 15 : 20;
      const ageMax = product.category === 'Retro Collectibles' ? 19 : Number.POSITIVE_INFINITY;
      const claimedAge = Number(product.item_age);
      const year = Number(product.manufacture_year);
      const currentYear = new Date().getUTCFullYear();
      const ageConsistent = product.item_age != null && product.manufacture_year != null && Number.isInteger(claimedAge) && Number.isInteger(year)
        && claimedAge >= ageMin && claimedAge <= ageMax && Math.abs((currentYear - year) - claimedAge) <= 1;
      const fieldsComplete = Boolean(typeof product.title === 'string' && product.title.trim() && typeof product.description === 'string' && product.description.trim()
        && Number(product.price) > 0 && product.category && product.condition
        && typeof product.country_of_origin === 'string' && product.country_of_origin.trim() && typeof product.materials === 'string' && product.materials.trim()
        && typeof product.restoration_repairs === 'string' && product.restoration_repairs.trim());
      const paths: unknown[] = Array.isArray(product.image_urls) ? product.image_urls : [];
      const validPaths = paths.length >= 5 && paths.length <= 10 && paths.includes(product.image_path)
        && paths.every((p) => typeof p === 'string'
          && p.startsWith(product.seller_id + '/') && !p.includes('..') && !p.includes('://')
          && /^[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)$/i.test(p));
      // Confirm existence in private storage, never expose signed URLs to the public.
      let photosExist = validPaths;
      if (validPaths) {
        for (const path of paths as string[]) {
          const parts = path.split('/');
          const folder = parts.slice(0, -1).join('/');
          const filename = parts[parts.length - 1];
          const { data, error } = await db.storage.from('product-media').list(folder, { search: filename, limit: 100 });
          if (error || !data?.some((file) => file.name === filename)) { photosExist = false; break; }
        }
      }
      const checks = { fieldsComplete, categoryAllowed, ageConsistent, validPaths, photosExist, repairDisclosure: typeof product.restoration_repairs === 'string' && Boolean(product.restoration_repairs.trim()) };
      const allBasicChecks = Object.values(checks).every(Boolean);
      // A claimed age and matching photos DO NOT independently authenticate the item's age.
      // Until a defensible independent evidence check is implemented, no item can be auto-published.
      const state = allBasicChecks ? 'ready_for_evidence' : 'needs_info';
      const { error: updateError } = await db.from('oldora_verification_jobs')
        .update({ state, checks, last_error: null, updated_at: new Date().toISOString() })
        .eq('product_id', job.product_id).eq('state', 'checking');
      if (updateError) throw updateError;
      const { error: eventError } = await db.from('oldora_verification_events').insert({
        product_id: job.product_id, event_type: 'automated_precheck',
        details: { state, checks, publication: 'not_performed' }
      });
      if (eventError) throw eventError;
      checked++;
    } catch (error) {
      await db.from('oldora_verification_jobs').update({
        state: 'failed', last_error: String(error).slice(0, 400),
        updated_at: new Date().toISOString()
      }).eq('product_id', job.product_id);
    }
  }
  return Response.json({ checked, published: 0, mode: 'verification_precheck_only' });
});
