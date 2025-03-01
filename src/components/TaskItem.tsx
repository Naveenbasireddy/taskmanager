import React from 'react';
import { format, isPast, isToday, addDays } from 'date-fns';
import { CheckCircle, Edit, Trash2, Clock, AlertCircle, Repeat } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Completed';
  recurring: boolean;
}

interface TaskItemProps {
  task: Task;
  onComplete: (id: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onComplete, onEdit, onDelete }) => {
  const dueDate = new Date(task.due_date);
  const isOverdue = isPast(dueDate) && task.status === 'Pending';
  const isDueToday = isToday(dueDate) && task.status === 'Pending';
  const isDueSoon = !isOverdue && !isDueToday && isPast(addDays(new Date(), -2)) && task.status === 'Pending';

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'High':
        return 'text-red-600 dark:text-red-400';
      case 'Medium':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-green-600 dark:text-green-400';
    }
  };

  const getStatusClasses = () => {
    if (task.status === 'Completed') {
      return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    }
    if (isOverdue) {
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
    if (isDueToday) {
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    }
    return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
  };

  return (
    <div className={`p-4 mb-3 rounded-lg border ${getStatusClasses()} transition-all duration-200`}>
      <div className="flex justify-between">
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${task.status === 'Completed' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-1 text-gray-600 dark:text-gray-300 text-sm">
              {task.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              <Clock className="h-3 w-3 mr-1" />
              {format(dueDate, 'MMM d, yyyy h:mm a')}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 ${getPriorityColor()}`}>
              <AlertCircle className="h-3 w-3 mr-1" />
              {task.priority}
            </span>
            {task.recurring && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                <Repeat className="h-3 w-3 mr-1" />
                Recurring
              </span>
            )}
            {isOverdue && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                Overdue
              </span>
            )}
            {isDueToday && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                Due Today
              </span>
            )}
            {isDueSoon && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                Due Soon
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-2 items-start">
          {task.status !== 'Completed' && (
            <button
              onClick={() => onComplete(task.id)}
              className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 focus:outline-none"
              title="Mark as completed"
            >
              <CheckCircle className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={() => onEdit(task)}
            className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
            title="Edit task"
          >
            <Edit className="h-5 w-5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 focus:outline-none"
            title="Delete task"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;