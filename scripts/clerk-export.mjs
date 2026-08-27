#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const KEY = process.env.CLERK_SECRET_KEY;
if (!KEY) {
  console.error('Missing CLERK_SECRET_KEY');
  process.exit(1);
}

const OUT = path.resolve('clerk-export');
const BASE = 'https://api.clerk.com/v1';
const HEADERS = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const PAGE_SIZE = 500;

await fs.mkdir(OUT, { recursive: true });

async function api(p) {
  const res = await fetch(`${BASE}${p}`, { headers: HEADERS });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

async function paginate(endpoint, label) {
  const all = [];
  let offset = 0;
  while (true) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const { status, body } = await api(`${endpoint}${sep}limit=${PAGE_SIZE}&offset=${offset}`);
    if (status !== 200) {
      console.error(`  ${label} page failed at offset ${offset}: ${status}`, body);
      break;
    }
    const items = Array.isArray(body) ? body : body?.data ?? [];
    all.push(...items);
    process.stdout.write(`  ${label}: ${all.length}\r`);
    if (items.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  console.log(`  ${label}: ${all.length} total`);
  return all;
}

async function dump(name, data) {
  await fs.writeFile(path.join(OUT, `${name}.json`), JSON.stringify(data, null, 2));
}

const summary = { exported_at: new Date().toISOString(), counts: {} };

// Users
console.log('users...');
const users = await paginate('/users', 'users');
await dump('users', users);
summary.counts.users = users.length;

// Organizations
console.log('organizations...');
const orgs = await paginate('/organizations?include_members_count=true', 'organizations');
await dump('organizations', orgs);
summary.counts.organizations = orgs.length;

// Per-org memberships and invitations
const memberships = [];
const orgInvitations = [];
if (orgs.length) {
  console.log('org memberships + invitations...');
  for (const o of orgs) {
    const m = await paginate(`/organizations/${o.id}/memberships`, `  ${o.id} members`);
    memberships.push({ organization_id: o.id, memberships: m });
    const inv = await paginate(`/organizations/${o.id}/invitations`, `  ${o.id} invites`);
    orgInvitations.push({ organization_id: o.id, invitations: inv });
  }
  await dump('organization_memberships', memberships);
  await dump('organization_invitations', orgInvitations);
  summary.counts.organization_memberships = memberships.reduce((s, x) => s + x.memberships.length, 0);
  summary.counts.organization_invitations = orgInvitations.reduce((s, x) => s + x.invitations.length, 0);
}

// User-level invitations
console.log('invitations...');
const invitations = await paginate('/invitations', 'invitations');
await dump('invitations', invitations);
summary.counts.invitations = invitations.length;

// Sessions
console.log('sessions...');
const sessions = await paginate('/sessions', 'sessions');
await dump('sessions', sessions);
summary.counts.sessions = sessions.length;

// Allowlist & blocklist identifiers
for (const [endpoint, name] of [
  ['/allowlist_identifiers', 'allowlist_identifiers'],
  ['/blocklist_identifiers', 'blocklist_identifiers'],
]) {
  console.log(`${name}...`);
  const { status, body } = await api(endpoint);
  if (status === 200) {
    const items = Array.isArray(body) ? body : body?.data ?? [];
    await dump(name, items);
    summary.counts[name] = items.length;
  } else {
    console.log(`  skipped (${status})`);
  }
}

// JWT templates, instance settings, domains, SAML, redirect URLs
for (const [endpoint, name] of [
  ['/jwt_templates', 'jwt_templates'],
  ['/domains', 'domains'],
  ['/redirect_urls', 'redirect_urls'],
  ['/saml_connections', 'saml_connections'],
  ['/oauth_applications', 'oauth_applications'],
  ['/instance', 'instance'],
  ['/beta_features/instance_settings', 'instance_settings'],
  ['/actor_tokens', 'actor_tokens'],
]) {
  console.log(`${name}...`);
  const { status, body } = await api(endpoint);
  if (status === 200) {
    await dump(name, body);
    if (Array.isArray(body)) summary.counts[name] = body.length;
    else if (body?.data) summary.counts[name] = body.data.length;
  } else {
    console.log(`  skipped (${status})`);
  }
}

await dump('_summary', summary);
console.log('\nDone. Output in clerk-export/');
console.log(JSON.stringify(summary, null, 2));
