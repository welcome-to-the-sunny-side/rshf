// API client for backend endpoints
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function registerUser(data) {
  const res = await fetch(`${API_BASE}/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function login(username, password) {
  const form = new FormData();
  form.append('username', username);
  form.append('password', password);
  const res = await fetch(`${API_BASE}/user/login`, {
    method: 'POST',
    body: form,
  });
  return res.json();
}

export async function getUsers(uid) {
  const url = new URL(`${API_BASE}/user`);
  if (uid) url.searchParams.append('uid', uid);
  const res = await fetch(url, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function updateUser(user_id, data) {
  const url = new URL(`${API_BASE}/user`);
  url.searchParams.append('user_id', user_id);
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function registerGroup(data) {
  const res = await fetch(`${API_BASE}/group/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getGroups(group_id) {
  const url = new URL(`${API_BASE}/group`);
  if (group_id) url.searchParams.append('group_id', group_id);
  const res = await fetch(url, { headers: { ...getAuthHeaders() } });
  return res.json();
}

export async function updateGroup(data) {
  const res = await fetch(`${API_BASE}/group`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function addToGroup(data) {
  const res = await fetch(`${API_BASE}/add_to_group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function removeFromGroup(data) {
  const res = await fetch(`${API_BASE}/remove_from_group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function registerRated(data) {
  const res = await fetch(`${API_BASE}/register_rated`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getContest(filters) {
  const url = new URL(`${API_BASE}/contest`);
  Object.entries(filters).forEach(([k, v]) => v != null && url.searchParams.append(k, v));
  const res = await fetch(url, { headers: { ...getAuthHeaders() } });
  return res.json();
}
