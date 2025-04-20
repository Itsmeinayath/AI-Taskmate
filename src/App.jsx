import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

function App() {
  // State management
  const [task, setTask] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [priority, setPriority] = useState("Medium");
  const [searchQuery, setSearchQuery] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showNotificationPermission, setShowNotificationPermission] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });
  const [filter, setFilter] = useState(() => localStorage.getItem("filter") || "All");

  // Task data
  const [tasks, setTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem("tasks");
      const parsed = savedTasks ? JSON.parse(savedTasks) : [];
      return Array.isArray(parsed) ? parsed
        .filter(t => t && (typeof t === "string" || (typeof t === "object" && typeof t.text === "string")))
        .map((t, index) => typeof t === "string" ? {
          id: `task-${index}`,
          text: t,
          completed: false,
          priority: "Medium",
          dueDate: "",
          createdAt: new Date().toISOString(),
          lastNotified: null
        } : {
          id: t.id || `task-${index}`,
          text: t.text,
          completed: !!t.completed,
          priority: t.priority || "Medium",
          dueDate: t.dueDate || "",
          createdAt: t.createdAt || new Date().toISOString(),
          lastNotified: t.lastNotified || null
        }) : [];
    } catch (error) {
      console.error("Error parsing tasks:", error);
      return [];
    }
  });

  // Notification function
  const showNotification = (title, body) => {
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  };

  // Check for reminders function
  const checkForReminders = () => {
    if (Notification.permission !== "granted") return;

    const now = new Date();
    const oneHour = 60 * 60 * 1000;

    tasks.forEach(task => {
      if (task.completed) return;

      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        if (dueDate < now && !task.lastNotified) {
          showNotification("Task overdue", `${task.text} was due on ${new Date(dueDate).toLocaleDateString()}`);
          const updatedTasks = tasks.map(t =>
            t.id === task.id ? { ...t, lastNotified: new Date().toISOString() } : t
          );
          setTasks(updatedTasks);
        }
      }

      if (task.priority === "High" && !task.dueDate) {
        const createdAt = new Date(task.createdAt);
        const hoursSinceCreation = (now - createdAt) / oneHour;

        if (hoursSinceCreation > 24 && (!task.lastNotified ||
          (new Date(now - new Date(task.lastNotified)) / oneHour > 24))) {
          showNotification("High priority task", `Don't forget: ${task.text}`);
          const updatedTasks = tasks.map(t =>
            t.id === task.id ? { ...t, lastNotified: new Date().toISOString() } : t
          );
          setTasks(updatedTasks);
        }
      }
    });
  };

  // Effects
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    checkForReminders();
  }, [tasks]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("filter", filter);
  }, [filter]);

  useEffect(() => {
    if (Notification.permission === "default") setShowNotificationPermission(true);
    const interval = setInterval(checkForReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  // Task operations
  const handleAddTask = () => {
    if (task.trim()) {
      if (editingIndex !== null) {
        setTasks(tasks.map((t, i) => i === editingIndex ? {
          ...t, text: task, priority, dueDate
        } : t));
        setEditingIndex(null);
      } else {
        setTasks([...tasks, {
          id: `task-${Date.now()}`,
          text: task,
          completed: false,
          priority,
          dueDate,
          createdAt: new Date().toISOString(),
          lastNotified: null
        }]);
      }
      setTask("");
      setDueDate("");
    }
  };

  const handleDelete = (index) => {
    const updated = tasks.filter((_, i) => i !== index);
    setTasks(updated);
    if (editingIndex === index) {
      setTask("");
      setEditingIndex(null);
    }
  };

  const handleEdit = (index) => {
    const taskToEdit = filteredTasks[index];
    setTask(taskToEdit.text);
    setPriority(taskToEdit.priority);
    setDueDate(taskToEdit.dueDate || "");
    setEditingIndex(tasks.findIndex(t => t.id === taskToEdit.id));
  };

  const toggleCompleted = (taskId) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  // Drag and drop with smooth animation
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTimeout(() => {
      setTasks(items);
    }, 100);
  };

  // Filtering
  const filteredTasks = tasks.filter(t => {
    if (filter === "Completed") return t.completed;
    if (filter === "Incomplete") return !t.completed;
    if (searchQuery) return t.text.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  // Helper components
  const PriorityBadge = ({ priority }) => {
    const colors = {
      High: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    };
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[priority]}`}>{priority}</span>;
  };

  const DueDateBadge = ({ dueDate }) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const isOverdue = due < today && !(due.getDate() === today.getDate() &&
      due.getMonth() === today.getMonth() && due.getFullYear() === today.getFullYear());

    return (
      <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${isOverdue ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        }`}>
        {new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        {isOverdue && " ⚠️"}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Notification banner */}
      {showNotificationPermission && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-3 text-center z-50">
          <p>Allow notifications for task reminders?</p>
          <div className="mt-2 space-x-4">
            <button onClick={() => {
              Notification.requestPermission().then(p => {
                setShowNotificationPermission(false);
                if (p === "granted") showNotification("TaskMate", "You'll now receive reminders!");
              });
            }} className="px-4 py-1 bg-white text-yellow-600 rounded font-medium">
              Allow
            </button>
            <button onClick={() => setShowNotificationPermission(false)} className="px-4 py-1 bg-yellow-600 text-white rounded font-medium">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Theme toggle */}
      {/* <button onClick={() => setDarkMode(!darkMode)} className="fixed top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-yellow-300 shadow-md hover:shadow-lg transition-all z-10">
        {darkMode ? "☀️" : "🌙"}
      </button> */}

      {/* Main card */}
      <div className="bg-white dark:bg-gray-800 w-full max-w-md p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 mt-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            AI TaskMate
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Your smart task companion</p>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition"
            placeholder="Search tasks..."
          />
        </div>

        {/* Task input */}
        <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0 mb-4">
          <input
            type="text"
            value={task}
            onChange={(e) => {
              const text = e.target.value;
              setTask(text);
              if (editingIndex === null) {
                const urgent = ['urgent', 'asap', 'important', 'deadline', 'now'];
                const low = ['someday', 'maybe', 'if time', 'optional'];
                setPriority(
                  urgent.some(w => text.toLowerCase().includes(w)) ? "High" :
                    low.some(w => text.toLowerCase().includes(w)) ? "Low" : "Medium"
                );
              }
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
            className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            placeholder="What needs to be done?"
          />
        </div>

        {/* Priority and due date */}
        <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0 mb-6">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full sm:w-1/2 px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="High">🔥 High</option>
            <option value="Medium">⚡ Medium</option>
            <option value="Low">🌱 Low</option>
          </select>

          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full sm:w-1/2 px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Add/update button */}
        <button
          onClick={handleAddTask}
          className={`w-full mb-6 px-5 py-3 rounded-lg font-medium transition-all ${editingIndex !== null ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"
            } text-white shadow-md hover:shadow-lg`}
        >
          {editingIndex !== null ? "Update Task" : "Add Task"}
        </button>

        {/* Filters */}
        <div className="flex justify-center space-x-2 mb-4">
          {["All", "Completed", "Incomplete"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${filter === f ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500"
                }`}
            >
              {f}
            </button>
          ))}
        </div>
        {/* Task list with smooth drag-and-drop */}
        {filteredTasks.length > 0 ? (
          <div className="relative">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="tasks">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="overflow-y-auto max-h-96 pr-2 custom-scrollbar"
                  >
                    <ul className="space-y-3 touch-manipulation">
                      {filteredTasks.map((t, index) => (
                        <Draggable key={t.id} draggableId={t.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <li
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={provided.draggableProps.style}
                              className={`group relative bg-gray-50 dark:bg-gray-700 rounded-xl p-4 shadow-sm border-l-4 ${t.priority === "High" ? "border-red-500" :
                                  t.priority === "Medium" ? "border-yellow-500" : "border-green-500"
                                } transition-all duration-200 ${snapshot.isDragging ? "bg-gray-100 dark:bg-gray-600 shadow-lg" : ""
                                }`}
                            >
                              <div className="flex items-start">
                                {/* Custom checkbox */}
                                <label className="relative inline-flex items-center cursor-pointer mr-2">
                                  <input
                                    type="checkbox"
                                    checked={t.completed}
                                    onChange={() => toggleCompleted(t.id)}
                                    className="sr-only peer"
                                  />
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${t.completed
                                      ? 'border-blue-500 bg-blue-500 dark:border-blue-400 dark:bg-blue-400'
                                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                                    } peer-hover:border-blue-400 peer-focus:ring-2 peer-focus:ring-blue-300`}>
                                    {t.completed && (
                                      <svg className="w-3 h-3 text-white dark:text-gray-100" viewBox="0 0 20 20" fill="none">
                                        <path d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </div>
                                </label>

                                <div className="flex-1 min-w-0">
                                  <p className={`text-gray-800 dark:text-gray-100 truncate ${t.completed ? "line-through opacity-70" : ""}`}>
                                    {t.text}
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    <PriorityBadge priority={t.priority} />
                                    <DueDateBadge dueDate={t.dueDate} />
                                  </div>
                                </div>

                                <div className="flex space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(index); }}
                                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(index); }}
                                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            </li>
                          )}
                        </Draggable>
                      ))}
                    </ul>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {/* Gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent dark:from-gray-800 dark:to-transparent pointer-events-none"></div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? "No tasks match your search" : "No tasks yet. Add one above to get started!"}
            </p>
          </div>
        )}

        {/* Stats */}
        {tasks.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex justify-between">
            <span>{tasks.filter(t => t.completed).length} of {tasks.length} completed</span>
            <span>
              {tasks.filter(t => t.priority === "High").length} 🔥,{" "}
              {tasks.filter(t => t.priority === "Medium").length} ⚡,{" "}
              {tasks.filter(t => t.priority === "Low").length} 🌱
            </span>
          </div>
        )}
        {/* Custom scrollbar styles */}
        <style>{`
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    transition: background 0.3s;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
  .dark .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`}</style>

      </div>
    </div>
  );
}
      export default App;