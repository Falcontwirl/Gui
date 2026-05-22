import { useState, useEffect } from 'react';

export function TodoList({ userId }) {
  const [todos, setTodos] = useState([]);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    fetch('/api/todos', { headers: { 'x-user-id': userId } })
      .then(r => r.json())
      .then(setTodos);
  }, [userId]);

  const addTodo = async () => {
    if (!newTitle.trim()) return;
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ title: newTitle }),
    });
    const todo = await res.json();
    setTodos([todo, ...todos]);
    setNewTitle('');
  };

  const toggleTodo = async (id, completed) => {
    await fetch('/api/todos/${id}', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed }),
    });
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = async (id) => {
    await fetch('/api/todos/${id}', { method: 'DELETE' });
    setTodos(todos.filter(t => t.id !== id));
  };

  return (
    <div>
      <h1>My Todos</h1>
      <div>
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Add todo..." />
        <button onClick={addTodo}>Add</button>
      </div>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id, todo.completed)} />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>{todo.title}</span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
