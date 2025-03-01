import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface TaskFormProps {
  onSubmit: (task: {
    title: string;
    description: string;
    due_date: string;
    priority: 'Low' | 'Medium' | 'High';
    recurring: boolean;
  }) => void;
  initialValues?: {
    id?: number;
    title: string;
    description: string;
    due_date: string;
    priority: 'Low' | 'Medium' | 'High';
    recurring: boolean;
  };
  isEditing?: boolean;
  onCancel?: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({
  onSubmit,
  initialValues = {
    title: '',
    description: '',
    due_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    priority: 'Low' as const,
    recurring: false
  },
  isEditing = false,
  onCancel
}) => {
  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [dueDate, setDueDate] = useState(initialValues.due_date);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>(initialValues.priority);
  const [recurring, setRecurring] = useState(initialValues.recurring);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Prevents unnecessary resets when typing
  useEffect(() => {
    if (!isEditing) return; // Only reset when editing an existing task
    console.log("useEffect - Initial Values Updated:", initialValues);
    setTitle(initialValues.title);
    setDescription(initialValues.description);
    setDueDate(initialValues.due_date);
    setPriority(initialValues.priority);
    setRecurring(initialValues.recurring);
  }, [initialValues, isEditing]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const selectedDate = new Date(dueDate);
      if (selectedDate < new Date()) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      console.log("Form Submitted:", { title, description, due_date: dueDate, priority, recurring });
      onSubmit({
        title,
        description,
        due_date: dueDate,
        priority,
        recurring
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Task Title*
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            console.log("Title input updated:", e.target.value);
          }}
          className="mt-1 block w-full ... border border-gray-300 rounded-md"
          placeholder="Enter task title"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            console.log("Description updated:", e.target.value);
          }}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md"
          placeholder="Enter task description"
        />
      </div>

      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Due Date*
        </label>
        <div className="relative mt-1 rounded-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="datetime-local"
            id="dueDate"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              console.log("Due Date updated:", e.target.value);
            }}
            className="block w-full pl-10 border border-gray-300 rounded-md"
          />
        </div>
        {errors.dueDate && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dueDate}</p>}
      </div>

      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Priority
        </label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value as 'Low' | 'Medium' | 'High');
            console.log("Priority changed:", e.target.value);
          }}
          className="block w-full border border-gray-300 rounded-md"
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div className="flex items-center">
        <input
          id="recurring"
          type="checkbox"
          checked={recurring}
          onChange={(e) => {
            setRecurring(e.target.checked);
            console.log("Recurring task:", e.target.checked);
          }}
          className="h-4 w-4 text-blue-600 border border-gray-300 rounded"
        />
        <label htmlFor="recurring" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
          Recurring Task
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          {isEditing ? 'Update Task' : 'Add Task'}
        </button>
      </div>
    </form>
  );
};

export default TaskForm;
