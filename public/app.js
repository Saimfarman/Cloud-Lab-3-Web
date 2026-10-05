const taskList = document.querySelector('#task-list');
const taskForm = document.querySelector('#task-form');
const taskInput = document.querySelector('#task-title');
const emptyState = document.querySelector('#empty-state');
const notice = document.querySelector('#notice');
const filters = document.querySelector('.filters');
const connection = document.querySelector('#connection');
const connectionLabel = document.querySelector('#connection-label');

let tasks = [];
let activeFilter = 'all';

async function api(path = '', options = {}) {
  const response = await fetch(`/api/tasks${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function setConnection(online) {
  connection.classList.toggle('is-online', online);
  connection.classList.toggle('is-offline', !online);
  connectionLabel.textContent = online ? 'All synced' : 'Connection issue';
}

function showNotice(message = '') {
  notice.textContent = message;
  notice.hidden = !message;
}

function render() {
  const visibleTasks = tasks.filter((task) => {
    if (activeFilter === 'open') return !task.completed;
    if (activeFilter === 'done') return task.completed;
    return true;
  });

  taskList.replaceChildren();
  visibleTasks.forEach((task) => {
    const row = document.createElement('li');
    row.className = `task-row${task.completed ? ' is-complete' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.className = 'task-check';
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', `Mark ${task.title} ${task.completed ? 'incomplete' : 'complete'}`);
    checkbox.dataset.action = 'toggle';
    checkbox.dataset.id = task.id;

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;

    const date = document.createElement('time');
    date.className = 'task-date';
    date.dateTime = task.created_at;
    date.textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(task.created_at));

    const remove = document.createElement('button');
    remove.className = 'delete-button';
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.setAttribute('aria-label', `Delete ${task.title}`);
    remove.dataset.action = 'delete';
    remove.dataset.id = task.id;

    row.append(checkbox, title, date, remove);
    taskList.append(row);
  });

  const completed = tasks.filter((task) => task.completed).length;
  const remaining = tasks.length - completed;
  document.querySelector('#task-count').textContent = tasks.length
    ? `${remaining} open · ${completed} complete`
    : 'A fresh page.';
  document.querySelector('#progress-label').textContent = `${completed} of ${tasks.length} complete`;

  const isEmpty = visibleTasks.length === 0;
  taskList.hidden = isEmpty;
  emptyState.hidden = !isEmpty;
  const emptyTitle = document.querySelector('#empty-title');
  const emptyCopy = document.querySelector('#empty-copy');
  if (activeFilter === 'open' && tasks.length && !remaining) {
    emptyTitle.textContent = 'All clear.';
    emptyCopy.textContent = 'You have no open tasks.';
  } else if (activeFilter === 'done' && !completed) {
    emptyTitle.textContent = 'Nothing finished just yet.';
    emptyCopy.textContent = 'Completed tasks will find their way here.';
  } else {
    emptyTitle.textContent = 'Nothing on the list yet.';
    emptyCopy.textContent = 'Add a task above and make a start.';
  }
}

async function loadTasks() {
  taskList.setAttribute('aria-busy', 'true');
  try {
    tasks = await api();
    setConnection(true);
    showNotice();
    render();
  } catch (error) {
    setConnection(false);
    showNotice(error.message);
    document.querySelector('#empty-title').textContent = 'Tasks could not load.';
    document.querySelector('#empty-copy').textContent = 'Check your database connection and try again.';
    taskList.hidden = true;
    emptyState.hidden = false;
  } finally {
    taskList.setAttribute('aria-busy', 'false');
  }
}

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;

  const button = taskForm.querySelector('button');
  button.disabled = true;
  showNotice();
  try {
    const task = await api('', { method: 'POST', body: JSON.stringify({ title }) });
    tasks = [task, ...tasks];
    taskInput.value = '';
    activeFilter = 'all';
    filters.querySelectorAll('button').forEach((filter) => {
      const active = filter.dataset.filter === activeFilter;
      filter.classList.toggle('is-active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
    setConnection(true);
    render();
    taskInput.focus();
  } catch (error) {
    setConnection(false);
    showNotice(error.message);
  } finally {
    button.disabled = false;
  }
});

filters.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  filters.querySelectorAll('button').forEach((filter) => {
    const active = filter === button;
    filter.classList.toggle('is-active', active);
    filter.setAttribute('aria-pressed', String(active));
  });
  render();
});

taskList.addEventListener('change', async (event) => {
  const checkbox = event.target.closest('[data-action="toggle"]');
  if (!checkbox) return;
  checkbox.disabled = true;
  try {
    const task = await api(`?id=${encodeURIComponent(checkbox.dataset.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: checkbox.checked }),
    });
    tasks = tasks.map((item) => item.id === task.id ? task : item);
    setConnection(true);
    showNotice();
    render();
  } catch (error) {
    checkbox.checked = !checkbox.checked;
    checkbox.disabled = false;
    setConnection(false);
    showNotice(error.message);
  }
});

taskList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  button.disabled = true;
  try {
    await api(`?id=${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' });
    tasks = tasks.filter((task) => task.id !== button.dataset.id);
    setConnection(true);
    showNotice();
    render();
  } catch (error) {
    button.disabled = false;
    setConnection(false);
    showNotice(error.message);
  }
});

loadTasks();