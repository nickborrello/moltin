import { drizzle } from 'drizzle-orm/postgres-js';
import postgresJs from 'postgres';
import * as schema from './schema';

const postgres = postgresJs;

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/moltin';

const client = postgres(connectionString, { 
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
