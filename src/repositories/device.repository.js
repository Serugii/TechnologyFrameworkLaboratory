import { createItemModel } from '#models';

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

export function createRepository(pool) {
  return {
    async findAll(filters = {}) {
      let sql = 'SELECT * FROM devices';
      const params = [];
      const conditions = [];

      if (filters.room) {
        conditions.push('LOWER(room) = LOWER(?)');
        params.push(filters.room);
      }
      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' ORDER BY id ASC';

      const [rows] = await pool.query(sql, params);
      return rows.map(rowToModel);
    },

    async findById(id) {
      const [rows] = await pool.query('SELECT * FROM devices WHERE id = ?', [
        id,
      ]);
      return rows.length ? rowToModel(rows[0]) : null;
    },

    async *streamAll() {
      const [rows] = await pool.query('SELECT * FROM devices ORDER BY id ASC');
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
      const [result] = await pool.query(
        `INSERT INTO devices (device, room, status, description, image)
         VALUES (?, ?, ?, ?, ?)`,
        [device, room, status, description, image],
      );
      return this.findById(result.insertId);
    },

    async update(id, updates) {
      const existing = await this.findById(id);
      if (!existing) return null;

      const fields = ['device', 'room', 'status', 'description', 'image'];
      const setClauses = [];
      const params = [];

      for (const field of fields) {
        if (updates[field] !== undefined) {
          setClauses.push(`${field} = ?`);
          params.push(updates[field]);
        }
      }
      if (setClauses.length === 0) return existing;

      params.push(id);
      await pool.query(
        `UPDATE devices SET ${setClauses.join(', ')} WHERE id = ?`,
        params,
      );
      return this.findById(id);
    },

    async remove(id) {
      const [result] = await pool.query('DELETE FROM devices WHERE id = ?', [
        id,
      ]);
      return result.affectedRows > 0;
    },

    async findWithDetails(id) {
      return this.findById(id);
    },

    async findPaginated(offset, limit) {
      const [rows] = await pool.query(
        'SELECT * FROM devices ORDER BY id ASC LIMIT ? OFFSET ?',
        [limit, offset],
      );
      const [[{ total }]] = await pool.query(
        'SELECT COUNT(*) as total FROM devices',
      );
      return { items: rows.map(rowToModel), total };
    },
  };
}
