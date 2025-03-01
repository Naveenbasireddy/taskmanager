import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Database connection


const pool = mysql.createPool({
    host: 'metro.proxy.rlwy.net',
    user: 'root',  
    password: 'YRGlYYyQwCSdNVGoyxmFOMMxWlBmwizW',
    database: 'railway',
    port: 26481,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to Railway MySQL');
        connection.release(); // Release the connection back to the pool
    }
});


// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user exists in database
    const [users] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [decoded.userId]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = users[0];
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if email already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Check if phone already exists
    const [existingPhones] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existingPhones.length > 0) {
      return res.status(400).json({ message: 'Phone number already in use' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
      [name, email, phone, hashedPassword]
    );

    const userId = result.insertId;

    // Create JWT token
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return user data (excluding password)
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: userId,
        name,
        email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user by email
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = users[0];

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return user data (excluding password)
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Task Routes
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const [tasks] = await pool.query(
      'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { title, description, due_date, priority, recurring } = req.body;

  if (!title || !due_date) {
    return res.status(400).json({ message: 'Title and due date are required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO tasks (user_id, title, description, due_date, priority, recurring) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description || '', due_date, priority || 'Low', recurring ? 1 : 0]
    );

    const [newTask] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json(newTask[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error while creating task' });
  }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  const { title, description, due_date, priority, recurring } = req.body;

  if (!title || !due_date) {
    return res.status(400).json({ message: 'Title and due date are required' });
  }

  try {
    // Check if task belongs to user
    const [tasks] = await pool.query(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, req.user.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await pool.query(
      'UPDATE tasks SET title = ?, description = ?, due_date = ?, priority = ?, recurring = ? WHERE id = ?',
      [title, description || '', due_date, priority || 'Low', recurring ? 1 : 0, taskId]
    );

    const [updatedTask] = await pool.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    res.json(updatedTask[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error while updating task' });
  }
});

app.patch('/api/tasks/:id/complete', authenticateToken, async (req, res) => {
  const taskId = req.params.id;

  try {
    // Check if task belongs to user
    const [tasks] = await pool.query(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, req.user.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = tasks[0];
    const newStatus = task.status === 'Pending' ? 'Completed' : 'Pending';

    await pool.query(
      'UPDATE tasks SET status = ? WHERE id = ?',
      [newStatus, taskId]
    );

    const [updatedTask] = await pool.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    res.json(updatedTask[0]);
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ message: 'Server error while completing task' });
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id;

  try {
    // Check if task belongs to user
    const [tasks] = await pool.query(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, req.user.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await pool.query('DELETE FROM tasks WHERE id = ?', [taskId]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error while deleting task' });
  }
});

app.post('/api/tasks/reorder', authenticateToken, async (req, res) => {
  // This is a placeholder for task reordering functionality
  // In a real application, you would implement logic to update task order in the database
  res.json({ message: 'Task reordering not implemented yet' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});