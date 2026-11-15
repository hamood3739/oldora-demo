// OLDORA static buyer journey smoke tests. No credentials or live database access.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const file = name => readFileSync(new URL('../'+name,import.meta.url),'utf8');
const page = file('index.html'), product = file('product.html'), messages = file('messages.html');
const preview = file('market-preview.html'), sample = file('market-product-preview.html');
test('public marketplace only fetches verified published listings',()=>{
 assert.match(page,/\.eq\('status','published'\)\.eq\('age_verified',true\)/);
});
test('real product details require published verified listing',()=>{
 assert.match(product,/\.eq\('status','published'\)\.eq\('age_verified',true\)/);
});
test('real product chat links to its own listing',()=>{
 assert.match(product,/messages\.html\?product=/);
 assert.match(messages,/oldora_start_conversation/);
 assert.match(messages,/p_product_id:Number\(id\)/);
});
test('messages are tied to an active conversation',()=>{
 assert.match(messages,/if\(!active\)/);
 assert.match(messages,/conversation_id:active,sender_id:user\.id,body/);
});
test('demo storefront and product detail are separate from live chat',()=>{
 assert.match(preview,/market-product-preview\.html\?id=/);
 assert.doesNotMatch(sample,/createClient\(|\.from\('oldora_messages'\)/);
 assert.match(sample,/no message was sent/i);
});
test('sample detail uses no live product identifiers',()=>{
 assert.doesNotMatch(sample,/messages\.html\?product=/);
});
