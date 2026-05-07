import { createItemModel } from '#models';
import { devices } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

function rowToModel(row) {
  return createItemModel({
    id: row.id,
    device: row.device,
    room: row.room,
    status: row.status,
    description: row.description,
    image: row.image,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : row.updatedAt,
  });
}

export function createRepository(db) {
  return {
    async findAll(filters = {}) {
      const conditions = [];

      if (filters.room) {
        conditions.push(sql`LOWER(${devices.room}) = LOWER(${filters.room})`);
      }
      if (filters.status) {
        conditions.push(eq(devices.status, filters.status));
      }

      const rows = await db
        .select()
        .from(devices)
        .where(
          conditions.length
            ? sql`${conditions[0]}${conditions[1] ? sql` AND ${conditions[1]}` : sql``}`
            : undefined,
        )
        .orderBy(devices.id);

      return rows.map(rowToModel);
    },

    async findById(id) {
      const rows = await db.select().from(devices).where(eq(devices.id, id));

      return rows.length ? rowToModel(rows[0]) : null;
    },

    async *streamAll() {
      const rows = await db.select().from(devices).orderBy(devices.id);

      for (const row of rows) yield rowToModel(row);
    },

    async create(data) {
      const {
        device,
        room,
        status = 'off',
        description = '',
        image = null,
      } = data;

      const [result] = await db
        .insert(devices)
        .values({ device, room, status, description, image });

      return this.findById(result.insertId);
    },

    async update(id, updates) {
      const existing = await this.findById(id);
      if (!existing) return null;

      const allowed = ['device', 'room', 'status', 'description', 'image'];
      const values = {};
      for (const field of allowed) {
        if (updates[field] !== undefined) values[field] = updates[field];
      }

      if (Object.keys(values).length === 0) return existing;

      await db.update(devices).set(values).where(eq(devices.id, id));

      return this.findById(id);
    },

    async remove(id) {
      const [result] = await db.delete(devices).where(eq(devices.id, id));

      return result.affectedRows > 0;
    },

    async findWithDetails(id) {
      return this.findById(id);
    },

    async findPaginated(offset, limit) {
      const rows = await db
        .select()
        .from(devices)
        .orderBy(devices.id)
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: sql`COUNT(*)`.mapWith(Number) })
        .from(devices);

      return { items: rows.map(rowToModel), total };
    },
  };
}
