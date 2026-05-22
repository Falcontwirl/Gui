const express = require('express');
const { initDb } = require('./db');
const authRouter = require('./routes/auth');
const todosRouter = require('./routes/todos');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/todos', todosRouter);

initDb().then(() => {
  app.listen(3000, () => console.log('Server running on port 3000'));
});
