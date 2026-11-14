import { randomUUID } from 'node:crypto';
import { phoneDigits } from '../public/shared/validation.js';

const columns = 'id, business, contact_name, town, area, phone, email, source, status, message, notes, next_action, follow_up, created_at, updated_at';

function toLead(row) {
  return {
    id: row.id, business: row.business, contact: row.contact_name, town: row.town, area: row.area,
    phone: row.phone, email: row.email, source: row.source, status: row.status, message: row.message,
    notes: row.notes, nextAction: row.next_action, followUp: row.follow_up ?? '', createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

/**
 * Política de duplicados: nunca se descarta ni fusiona un contacto automáticamente. Dos registros con el mismo
 * correo o el mismo teléfono (comparando solo cifras) se marcan como «posibles duplicados» para revisión manual.
 */
function withDuplicates(leads) {
  const groups = new Map();
  for (const lead of leads) {
    for (const key of [lead.email && `e:${lead.email}`, phoneDigits(lead.phone) && `p:${phoneDigits(lead.phone)}`]) {
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, new Set());
      groups.get(key).add(lead.id);
    }
  }
  return leads.map(lead => {
    const related = new Set();
    for (const key of [lead.email && `e:${lead.email}`, phoneDigits(lead.phone) && `p:${phoneDigits(lead.phone)}`]) {
      for (const id of groups.get(key) ?? []) if (id !== lead.id) related.add(id);
    }
    return { ...lead, possibleDuplicates: [...related] };
  });
}

export function leadsRepo(db, now = () => new Date()) {
  const statements = {
    list: db.prepare(`SELECT ${columns} FROM leads ORDER BY created_at DESC, id`),
    get: db.prepare(`SELECT ${columns} FROM leads WHERE id = ?`),
    byKey: db.prepare(`SELECT ${columns} FROM leads WHERE request_key = ?`),
    insert: db.prepare(`INSERT INTO leads (id, business, contact_name, town, area, phone, phone_key, email, source, status, message, notes, next_action, follow_up, request_key, created_at, updated_at)
      VALUES (:id, :business, :contact, :town, :area, :phone, :phoneKey, :email, :source, :status, :message, :notes, :nextAction, :followUp, :requestKey, :at, :at)`),
    update: db.prepare(`UPDATE leads SET business = :business, contact_name = :contact, town = :town, area = :area, phone = :phone, phone_key = :phoneKey,
      email = :email, status = :status, notes = :notes, next_action = :nextAction, follow_up = :followUp, updated_at = :at WHERE id = :id`),
    remove: db.prepare('DELETE FROM leads WHERE id = ?'),
  };

  return {
    list() {
      return withDuplicates(statements.list.all().map(toLead));
    },
    get(id) {
      const row = statements.get.get(id);
      if (!row) return null;
      return this.list().find(lead => lead.id === id) ?? null;
    },
    /** Alta interna desde el panel: origen manual. */
    createManual(data) {
      const id = randomUUID();
      statements.insert.run({ ...data, id, phoneKey: phoneDigits(data.phone), source: 'manual', message: '', followUp: data.followUp || null, requestKey: null, at: now().toISOString() });
      return this.get(id);
    },
    /** Solicitud desde la landing: origen web y estado nuevo. Un reintento con la misma clave no crea otro registro. */
    createFromWeb(data, requestKey) {
      if (requestKey) {
        const existing = statements.byKey.get(requestKey);
        if (existing) return { lead: toLead(existing), created: false };
      }
      const id = randomUUID();
      statements.insert.run({ ...data, id, contact: '', phoneKey: phoneDigits(data.phone), source: 'web', status: 'nuevo', notes: '', nextAction: '', followUp: null, requestKey: requestKey || null, at: now().toISOString() });
      return { lead: toLead(statements.get.get(id)), created: true };
    },
    update(id, data) {
      const result = statements.update.run({ ...data, id, phoneKey: phoneDigits(data.phone), followUp: data.followUp || null, at: now().toISOString() });
      return result.changes ? this.get(id) : null;
    },
    remove(id) {
      return statements.remove.run(id).changes > 0;
    },
  };
}
