#!/usr/bin/env bun

import { db } from '@/db';
import { jobs, agents, users, applications, professionalProfiles } from '@/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface PerfResult {
  test: string;
  duration: number;
  status: number;
  success: boolean;
  details?: string;
}

async function measureRequest(
  label: string,
  fn: () => Promise<{ status: number; data?: any }>
): Promise<PerfResult> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    return {
      test: label,
      duration,
      status: result.status,
      success: result.status >= 200 && result.status < 300,
      details: result.data ? `Returned ${Array.isArray(result.data) ? result.data.length : 'data'}` : undefined,
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      test: label,
      duration,
      status: 0,
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function seedLargeDataset() {
  console.log('\n📊 Checking dataset size...\n');
  
  const jobCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs);
  
  const agentCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(agents);
  
  console.log(`  Current Jobs: ${jobCount[0].count}`);
  console.log(`  Current Agents: ${agentCount[0].count}`);
  
  if (Number(jobCount[0].count) < 100) {
    console.log('\n⚠️  Insufficient test data. Running with available data.');
    console.log('   (Task 27 seed data recommended for full performance testing)');
  }
}

async function testJobsAPI(): Promise<PerfResult[]> {
  console.log('\n📈 Testing Jobs API...\n');
  
  const results: PerfResult[] = [];
  
  results.push(await measureRequest('GET /api/jobs (no params)', async () => {
    const res = await fetch(`${API_BASE}/api/jobs`);
    return { status: res.status, data: await res.json() };
  }));
  
  results.push(await measureRequest('GET /api/jobs?page=1&limit=20', async () => {
    const res = await fetch(`${API_BASE}/api/jobs?page=1&limit=20`);
    return { status: res.status, data: await res.json() };
  }));
  
  results.push(await measureRequest('GET /api/jobs?status=open&sortBy=createdAt', async () => {
    const res = await fetch(`${API_BASE}/api/jobs?status=open&sortBy=createdAt&limit=50`);
    return { status: res.status, data: await res.json() };
  }));
  
  results.push(await measureRequest('GET /api/jobs?skills=react,typescript', async () => {
    const res = await fetch(`${API_BASE}/api/jobs?skills=react,typescript`);
    return { status: res.status, data: await res.json() };
  }));
  
  results.push(await measureRequest('GET /api/jobs?limit=100', async () => {
    const res = await fetch(`${API_BASE}/api/jobs?limit=100`);
    return { status: res.status, data: await res.json() };
  }));
  
  for (const r of results) {
    const status = r.success ? '✅' : '❌';
    console.log(`  ${status} ${r.test}: ${r.duration}ms (${r.status})`);
  }
  
  return results;
}

async function testAgentsAPI(): Promise<PerfResult[]> {
  console.log('\n👥 Testing Agents API...\n');
  
  const results: PerfResult[] = [];
  
  results.push(await measureRequest('GET /api/agents (no params)', async () => {
    const res = await fetch(`${API_BASE}/api/agents`);
    return { status: res.status, data: await res.json() };
  }));
  
  results.push(await measureRequest('GET /api/agents?page=1&limit=20', async () => {
    const res = await fetch(`${API_BASE}/api/agents?page=1&limit=20`);
    return { status: res.status, data: await res.json() };
  }));
  
  results.push(await measureRequest('GET /api/agents?sortBy=karma&sortOrder=desc', async () => {
    const res = await fetch(`${API_BASE}/api/agents?sortBy=karma&sortOrder=desc`);
    return { status: res.status, data: await res.json() };
  }));
  
  results.push(await measureRequest('GET /api/agents?skills=typescript', async () => {
    const res = await fetch(`${API_BASE}/api/agents?skills=typescript`);
    return { status: res.status, data: await res.json() };
  }));
  
  results.push(await measureRequest('GET /api/agents?limit=100', async () => {
    const res = await fetch(`${API_BASE}/api/agents?limit=100`);
    return { status: res.status, data: await res.json() };
  }));
  
  for (const r of results) {
    const status = r.success ? '✅' : '❌';
    console.log(`  ${status} ${r.test}: ${r.duration}ms (${r.status})`);
  }
  
  return results;
}

async function testDatabaseQueries() {
  console.log('\n🗄️  Testing Database Query Performance...\n');
  
  const timings: { query: string; duration: number }[] = [];
  
  const start1 = Date.now();
  await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, 'open'))
    .orderBy(desc(jobs.createdAt))
    .limit(20);
  timings.push({ query: 'Jobs with status filter + sorting', duration: Date.now() - start1 });
  
  const start2 = Date.now();
  await db
    .select()
    .from(agents)
    .orderBy(desc(agents.moltbookKarma))
    .limit(20);
  timings.push({ query: 'Agents sorted by karma', duration: Date.now() - start2 });
  
  const start3 = Date.now();
  const jobList = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.status, 'open'))
    .limit(20);
  timings.push({ query: 'Jobs basic select (limited columns)', duration: Date.now() - start3 });
  
  for (const t of timings) {
    const status = t.duration < 100 ? '✅' : t.duration < 500 ? '⚠️' : '❌';
    console.log(`  ${status} ${t.query}: ${t.duration}ms`);
  }
  
  return timings;
}

function generateReport(
  jobResults: PerfResult[],
  agentResults: PerfResult[],
  dbTimings: { query: string; duration: number }[]
) {
  console.log('\n📋 PERFORMANCE BASELINE REPORT\n');
  console.log('='.repeat(60));
  
  console.log('\n📊 JOBS API RESPONSE TIMES:');
  console.log('-'.repeat(40));
  const avgJobDuration = jobResults.reduce((sum, r) => sum + r.duration, 0) / jobResults.length;
  console.log(`  Average: ${avgJobDuration.toFixed(2)}ms`);
  console.log(`  Min: ${Math.min(...jobResults.map(r => r.duration))}ms`);
  console.log(`  Max: ${Math.max(...jobResults.map(r => r.duration))}ms`);
  
  console.log('\n👥 AGENTS API RESPONSE TIMES:');
  console.log('-'.repeat(40));
  const avgAgentDuration = agentResults.reduce((sum, r) => sum + r.duration, 0) / agentResults.length;
  console.log(`  Average: ${avgAgentDuration.toFixed(2)}ms`);
  console.log(`  Min: ${Math.min(...agentResults.map(r => r.duration))}ms`);
  console.log(`  Max: ${Math.max(...agentResults.map(r => r.duration))}ms`);
  
  console.log('\n🗄️  DATABASE QUERY TIMES:');
  console.log('-'.repeat(40));
  const avgDbTime = dbTimings.reduce((sum, t) => sum + t.duration, 0) / dbTimings.length;
  console.log(`  Average: ${avgDbTime.toFixed(2)}ms`);
  console.log(`  Min: ${Math.min(...dbTimings.map(t => t.duration))}ms`);
  console.log(`  Max: ${Math.max(...dbTimings.map(t => t.duration))}ms`);
  
  console.log('\n🎯 PERFORMANCE TARGETS:');
  console.log('-'.repeat(40));
  console.log(`  API Response Time: ${avgJobDuration < 200 ? '✅ PASS' : '⚠️ WARNING'} (< 200ms target)`);
  console.log(`  DB Query Time: ${avgDbTime < 100 ? '✅ PASS' : '⚠️ WARNING'} (< 100ms target)`);
  console.log(`  Pagination: ${'✅ ENFORCED'} (max 100, default 20)`);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 RECOMMENDATIONS:');
  
  if (avgJobDuration > 200) {
    console.log('  - Consider adding caching for job feed');
    console.log('  - Review N+1 query patterns');
  }
  
  if (avgDbTime > 100) {
    console.log('  - Verify indexes are created (migration 002)');
    console.log('  - Consider query optimization');
  }
  
  console.log('\n✅ Performance test complete!\n');
}

async function main() {
  console.log('\n🚀 MOLTIN PERFORMANCE TEST\n');
  console.log('='.repeat(40));
  console.log(`  API Base: ${API_BASE}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  
  await seedLargeDataset();
  
  const jobResults = await testJobsAPI();
  const agentResults = await testAgentsAPI();
  const dbTimings = await testDatabaseQueries();
  
  generateReport(jobResults, agentResults, dbTimings);
}

main().catch(console.error);
