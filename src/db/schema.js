import {
  mysqlTable,
  int,
  varchar,
  mysqlEnum,
  datetime,
  text,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const devices = mysqlTable('devices', {
  id: int('id').primaryKey().autoincrement(),
  device: varchar('device', { length: 50 }).notNull(),
  room: varchar('room', { length: 30 }).notNull(),
  status: mysqlEnum('status', ['on', 'off']).notNull().default('off'),
  description: varchar('description', { length: 255 }).notNull().default(''),
  image: varchar('image', { length: 500 }).default(null),
  createdAt: datetime('createdAt')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updatedAt')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdateFn(() => new Date()),
});

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
});
