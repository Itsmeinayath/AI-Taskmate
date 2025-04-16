import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

function App() {
  // -------------------- State Management --------------------
  const [task, setTask] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [priority, setPriority] = useState("Medium");
  const [searchQuery, setSearchQuery] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showNotificationPermission, setShowNotificationPermission] = useState(false);

  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    return (
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  // Filter state
  const [filter, setFilter] = useState(() => {
    return localStorage.getItem("filter") || "All";
  });

  // -------------------- Task Management --------------------
  const [tasks, setTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem("tasks");
      const parsed = savedTasks ? JSON.parse(savedTasks) : [];
      return Array.isArray(parsed)
        ? parsed
          .filter(
            (t) =>
              t &&
              (typeof t === "string" ||
                (typeof t === "object" && typeof t.text === "string"))
          )
          .map((t, index) =>
            typeof t === "string"
              ? {
                id: `task-${index}`,
                text: t,
                completed: false,
                priority: "Medium",
                dueDate: "",
                createdAt: new Date().toISOString(),
                lastNotified: null
              }
              : {
                id: t.id || `task-${index}`,
                text: t.text,
                completed: !!t.completed,
                priority: t.priority || "Medium",
                dueDate: t.dueDate || "",
                createdAt: t.createdAt || new Date().toISOString(),
                lastNotified: t.lastNotified || null
              }
          )
        : [];
    } catch (error) {
      console.error("Error parsing tasks from localStorage:", error);
      return [];
    }
  });

  // -------------------- Effects --------------------
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    checkForReminders();
  }, [tasks]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("filter", filter);
  }, [filter]);

  useEffect(() => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      setShowNotificationPermission(true);
    }
    const interval = setInterval(checkForReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  // -------------------- AI Suggestions --------------------
  const analyzeTaskText = (text) => {
    const urgentKeywords = ['urgent', 'asap', 'important', 'deadline', 'now'];
    const lowPriorityKeywords = ['someday', 'maybe', 'if time', 'optional'];

    const containsUrgent = urgentKeywords.some(word =>
      text.toLowerCase().includes(word)
    );
    const containsLow = lowPriorityKeywords.some(word =>
      text.toLowerCase().includes(word)
    );

    if (containsUrgent) return "High";
    if (containsLow) return "Low";
    return "Medium";
  };

  const handleTaskInput = (e) => {
    const text = e.target.value;
    setTask(text);
    if (editingIndex === null) {
      setPriority(analyzeTaskText(text));
    }
  };

  // -------------------- Drag and Drop --------------------
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setTasks(items);
  };

  // -------------------- Notifications --------------------
  const requestNotificationPermission = () => {
    Notification.requestPermission().then(permission => {
      setShowNotificationPermission(false);
      if (permission === "granted") {
        showNotification("TaskMate", "You'll now receive reminders for your tasks!");
      }
    });
  };

  const showNotification = (title, body) => {
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  };

  const checkForReminders = () => {
    if (Notification.permission !== "granted") return;

    const now = new Date();
    const oneHour = 60 * 60 * 1000;

    tasks.forEach(task => {
      if (task.completed) return;

      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        if (dueDate < now && !task.lastNotified) {
          showNotification("Task overdue", `${task.text} was due on ${formatDate(task.dueDate)}`);
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

  // -------------------- Task Operations --------------------
  const handleAddTask = () => {
    if (task.trim() !== "") {
      if (editingIndex !== null) {
        const updatedTasks = [...tasks];
        updatedTasks[editingIndex] = {
          ...updatedTasks[editingIndex],
          text: task,
          priority,
          dueDate
        };
        setTasks(updatedTasks);
        setEditingIndex(null);
      } else {
        setTasks([
          ...tasks,
          {
            id: `task-${Date.now()}`,
            text: task,
            completed: false,
            priority,
            dueDate,
            createdAt: new Date().toISOString(),
            lastNotified: null
          }
        ]);
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
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? { ...task, completed: !task.completed }
          : task
      )
    );
  };

  // -------------------- Task Filtering --------------------
  const filteredTasks = tasks.filter((t) => {
    if (filter === "Completed") return t.completed;
    if (filter === "Incomplete") return !t.completed;
    if (searchQuery) return t.text.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  // -------------------- Helper Components --------------------
  const PriorityBadge = ({ priority }) => {
    const priorityClasses = {
      High: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    };

    return (
      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${priorityClasses[priority]}`}>
        {priority}
      </span>
    );
  };

  const DueDateBadge = ({ dueDate }) => {
    if (!dueDate) return null;

    const today = new Date();
    const due = new Date(dueDate);
    const isOverdue = due < today && !isSameDay(due, today);

    return (
      <span className={`inline-block ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${isOverdue
        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        }`}>
        {formatDate(dueDate)} {isOverdue && "⚠️"}
      </span>
    );
  };

  // -------------------- Helper Functions --------------------
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const options = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const isSameDay = (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // -------------------- Responsive Design Classes --------------------
  const responsiveClasses = {
    card: "w-full max-w-md p-4 sm:p-6",
    inputGroup: "flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-3",
    prioritySelect: "w-full sm:w-1/2",
    dateInput: "w-full sm:w-1/2",
    taskItem: "p-3 sm:p-4",
    taskText: "text-sm sm:text-base"
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Notification Permission Banner */}
      {showNotificationPermission && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-3 text-center z-50">
          <p>Allow notifications for task reminders?</p>
          <div className="mt-2 space-x-4">
            <button
              onClick={requestNotificationPermission}
              className="px-4 py-1 bg-white text-yellow-600 rounded font-medium"
            >
              Allow
            </button>
            <button
              onClick={() => setShowNotificationPermission(false)}
              className="px-4 py-1 bg-yellow-600 text-white rounded font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Theme Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="fixed top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-yellow-300 shadow-md hover:shadow-lg transition-all z-10"
        aria-label="Toggle dark mode"
      >
        {darkMode ? "☀️" : "🌙"}
      </button>

      {/* Main Card */}
      <div className={`bg-white dark:bg-gray-800 ${responsiveClasses.card} rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 mt-8`}>
        {/* Header */}
        <div className="mb-4 sm:mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            AI TaskMate
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Your smart task companion
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-3 sm:mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition text-sm sm:text-base"
            placeholder="Search tasks..."
          />
        </div>

        {/* Task Input */}
        <div className={responsiveClasses.inputGroup + " mb-3 sm:mb-4"}>
          <input
            type="text"
            value={task}
            onChange={handleTaskInput}
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
            className="flex-1 px-3 sm:px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm sm:text-base"
            placeholder="What needs to be done?"
          />
        </div>

        {/* Priority & Due Date */}
        <div className={responsiveClasses.inputGroup + " mb-4 sm:mb-6"}>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={`${responsiveClasses.prioritySelect} px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition text-sm sm:text-base`}
          >
            <option value="High">🔥 High</option>
            <option value="Medium">⚡ Medium</option>
            <option value="Low">🌱 Low</option>
          </select>

          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`${responsiveClasses.dateInput} px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition text-sm sm:text-base`}
          />
        </div>

        {/* Add/Update Button */}
        <button
          onClick={handleAddTask}
          className={`w-full mb-4 sm:mb-6 px-4 sm:px-5 py-2 sm:py-3 rounded-lg font-medium transition-all ${editingIndex !== null
            ? "bg-purple-600 hover:bg-purple-700"
            : "bg-blue-600 hover:bg-blue-700"
            } text-white shadow-md hover:shadow-lg text-sm sm:text-base`}
        >
          {editingIndex !== null ? "Update Task" : "Add Task"}
        </button>

        {/* Filter Buttons */}
        <div className="flex justify-center space-x-2 mb-3 sm:mb-4">
          {["All", "Completed", "Incomplete"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition ${filter === f
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500"
                }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Task List with Drag and Drop */}
        {filteredTasks.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="tasks">
              {(provided) => (
                <ul
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto pr-2"
                >
                  {filteredTasks.map((t, index) => (
                    <Draggable key={t.id} draggableId={t.id} index={index}>
                      {(provided) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`group relative bg-gray-50 dark:bg-gray-700 rounded-lg sm:rounded-xl ${responsiveClasses.taskItem} shadow-sm border-l-4 ${t.priority === "High"
                            ? "border-red-500"
                            : t.priority === "Medium"
                              ? "border-yellow-500"
                              : "border-green-500"
                            } transition hover:shadow-md`}
                        >
                          <div className="flex items-start">
                            {/* Custom Beautiful Checkbox */}
                            <label className="relative inline-flex items-center cursor-pointer mr-2">
                              <input
                                type="checkbox"
                                checked={t.completed}
                                onChange={() => toggleCompleted(t.id)}
                                className="sr-only peer" // Hide default checkbox
                              />
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
    ${t.completed
                                  ? 'border-blue-500 bg-blue-500 dark:border-blue-400 dark:bg-blue-400'
                                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                                }
    peer-hover:border-blue-400 peer-focus:ring-2 peer-focus:ring-blue-300`}
  
                              >
                                
                                {/* Checkmark icon */}
                                {t.completed && (
                                  <svg
                                    className="w-3 h-3 text-white dark:text-gray-100"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M6 10L9 13L14 7"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </div>
                            </label>

                            <div className="flex-1 min-w-0">
                              <p
                                className={`${responsiveClasses.taskText} text-gray-800 dark:text-gray-100 truncate ${t.completed ? "line-through opacity-70" : ""
                                  }`}
                              >
                                {t.text}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                <PriorityBadge priority={t.priority} />
                                <DueDateBadge dueDate={t.dueDate} />
                              </div>
                            </div>

                            <div className="flex space-x-1 sm:space-x-2 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(index);
                                }}
                                className="p-1 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition"
                                aria-label="Edit task"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(index);
                                }}
                                className="p-1 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                                aria-label="Delete task"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="text-center py-6 sm:py-8">
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              {searchQuery
                ? "No tasks match your search"
                : "No tasks yet. Add one above to get started!"}
            </p>
          </div>
        )}

        {/* Stats Footer */}
        {tasks.length > 0 && (
          <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex justify-between">
            <span>
              {tasks.filter((t) => t.completed).length} of {tasks.length} completed
            </span>
            <span>
              {tasks.filter((t) => t.priority === "High").length} 🔥,{" "}
              {tasks.filter((t) => t.priority === "Medium").length} ⚡,{" "}
              {tasks.filter((t) => t.priority === "Low").length} 🌱
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;