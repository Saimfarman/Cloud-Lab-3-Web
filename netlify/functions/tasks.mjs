import { neon } from '@netlify/neon';

const sql = neon();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export default async (request) => {
  try {
    await ensureTable();

    if (request.method === 'GET') {
      const tasks = await sql`
        SELECT id, title, completed, created_at
        FROM tasks
        ORDER BY completed ASC, created_at DESC
      `;
      return json(tasks);
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (!title || title.length > 160) {
        return json({ error: 'Enter a task between 1 and 160 characters.' }, 400);
      }

      const [task] = await sql`
        INSERT INTO tasks (title)
        VALUES (${title})
        RETURNING id, title, completed, created_at
      `;
      return json(task, 201);
    }

    const taskId = new URL(request.url).searchParams.get('id');
    if (!taskId || !/^\d+$/.test(taskId)) {
      return json({ error: 'A valid task id is required.' }, 400);
    }

    if (request.method === 'PATCH') {
      const body = await request.json();
      if (typeof body.completed !== 'boolean') {
        return json({ error: 'Completed must be true or false.' }, 400);
      }

      const [task] = await sql`
        UPDATE tasks
        SET completed = ${body.completed}
        WHERE id = ${taskId}
        RETURNING id, title, completed, created_at
      `;
      return task ? json(task) : json({ error: 'Task not found.' }, 404);
    }

    if (request.method === 'DELETE') {
      const [task] = await sql`
        DELETE FROM tasks
        WHERE id = ${taskId}
        RETURNING id
      `;
      return task ? json({ ok: true }) : json({ error: 'Task not found.' }, 404);
    }

    return json({ error: 'Method not allowed.' }, 405);
  } catch (error) {
    console.error('Task API error:', error);
    return json({ error: 'The task service is temporarily unavailable.' }, 500);
  }
};