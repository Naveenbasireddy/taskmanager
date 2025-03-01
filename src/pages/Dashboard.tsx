import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { format } from 'date-fns';
import { Plus, Search, Filter, X } from 'lucide-react';
import TaskForm from '../components/TaskForm';
import TaskItem from '../components/TaskItem';
import { useAuth } from '../contexts/AuthContext';

interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Completed';
  recurring: boolean;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Completed' | 'Overdue'>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'Low' | 'Medium' | 'High'>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [user]);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/tasks', { withCredentials: true });
      setTasks(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      if (statusFilter === 'Overdue') {
        filtered = filtered.filter(task => 
          task.status === 'Pending' && new Date(task.due_date) < new Date()
        );
      } else {
        filtered = filtered.filter(task => task.status === statusFilter);
      }
    }

    // Priority filter
    if (priorityFilter !== 'All') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    setFilteredTasks(filtered);
  };

  const handleAddTask = async (taskData: {
    title: string;
    description: string;
    due_date: string;
    priority: 'Low' | 'Medium' | 'High';
    recurring: boolean;
  }) => {
    try {
      const response = await axios.post('http://localhost:5000/api/tasks', taskData, { withCredentials: true });
      setTasks(prevTasks => [...prevTasks, response.data]);
      setIsAddingTask(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add task');
      console.error('Error adding task:', err);
    }
  };

  const handleUpdateTask = async (taskData: {
    title: string;
    description: string;
    due_date: string;
    priority: 'Low' | 'Medium' | 'High';
    recurring: boolean;
  }) => {
    if (!editingTask) return;

    try {
      const response = await axios.put(`http://localhost:5000/api/tasks/${editingTask.id}`, taskData, { withCredentials: true });
      setTasks(prevTasks => prevTasks.map(task => task.id === editingTask.id ? response.data : task));
      setEditingTask(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update task');
      console.error('Error updating task:', err);
    }
  };

  const handleCompleteTask = async (id: number) => {
    try {
      const response = await axios.patch(`http://localhost:5000/api/tasks/${id}/complete`, {}, { withCredentials: true });
      setTasks(prevTasks => prevTasks.map(task => task.id === id ? response.data : task));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete task');
      console.error('Error completing task:', err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/tasks/${id}`, { withCredentials: true });
      setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete task');
      console.error('Error deleting task:', err);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(filteredTasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFilteredTasks(items);

    // Here you would typically update the order in the database
    // This is a placeholder for that functionality
    try {
      await axios.post('http://localhost:5000/api/tasks/reorder', {
        taskId: reorderedItem.id,
        newPosition: result.destination.index
      }, { withCredentials: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reorder tasks');
      console.error('Error reordering tasks:', err);
      // Revert to original order on error
      filterTasks();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setPriorityFilter('All');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
        <button
          onClick={() => setIsAddingTask(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Plus className="h-5 w-5 mr-1" />
          Add Task
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        {isAddingTask ? (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Add New Task</h2>
            <TaskForm
              onSubmit={handleAddTask}
              onCancel={() => setIsAddingTask(false)}
            />
          </div>
        ) : editingTask ? (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Edit Task</h2>
            <TaskForm
              initialValues={{
                ...editingTask,
                due_date: format(new Date(editingTask.due_date), "yyyy-MM-dd'T'HH:mm")
              }}
              onSubmit={handleUpdateTask}
              onCancel={() => setEditingTask(null)}
              isEditing
            />
          </div>
        ) : (
          <div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
              </div>
              
              <div className="flex space-x-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Pending' | 'Completed' | 'Overdue')}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  >
                    <option value="All">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as 'All' | 'Low' | 'Medium' | 'High')}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  >
                    <option value="All">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                
                {(searchTerm || statusFilter !== 'All' || priorityFilter !== 'All') && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  {tasks.length === 0
                    ? "You don't have any tasks yet. Click 'Add Task' to create your first task."
                    : "No tasks match your current filters."}
                </p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="tasks">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {filteredTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <TaskItem
                                task={task}
                                onComplete={handleCompleteTask}
                                onEdit={setEditingTask}
                                onDelete={handleDeleteTask}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;