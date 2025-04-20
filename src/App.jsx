import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const parseTask = async (input) => {
  const lower = input.toLowerCase();
  
  // Priority detection
  let priority = "Medium";
  if (/(urgent|asap|important|immediately|high priority|priority high|!)/.test(lower)) {
    priority = "High";
  } else if (/(optional|someday|maybe|low priority|priority low|\?)/.test(lower)) {
    priority = "Low";
  }

  // Date/time detection
  let dueDate = "";
  const today = new Date();
  const timeMatch = lower.match(/(\d{1,2}(:\d{2})?\s?(am|pm)?|noon|midnight)/);
  let hours = 12, minutes = 0;

  if (timeMatch) {
    const timeStr = timeMatch[0];
    if (timeStr.includes(":")) {
      [hours, minutes] = timeStr.split(":").map(Number);
    } else if (/\d+/.test(timeStr)) {
      hours = parseInt(timeStr);
    }
    
    if (timeStr.includes("pm") && hours < 12) hours += 12;
    if (timeStr.includes("am") && hours === 12) hours = 0;
    if (timeStr === "noon") hours = 12;
    if (timeStr === "midnight") hours = 0;
  }

  // Date detection
  if (/(today|tonight)/.test(lower)) {
    dueDate = new Date(today);
    dueDate.setHours(hours, minutes, 0, 0);
  } else if (/(tomorrow|tmrw)/.test(lower)) {
    dueDate = new Date(today);
    dueDate.setDate(today.getDate() + 1);
    dueDate.setHours(hours, minutes, 0, 0);
  } else if (/(next week|in a week)/.test(lower)) {
    dueDate = new Date(today);
    dueDate.setDate(today.getDate() + 7);
    dueDate.setHours(hours, minutes, 0, 0);
  } else if (/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/.test(lower)) {
    const dayMatch = lower.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)[0];
    const dayIndex = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(dayMatch);
    dueDate = new Date(today);
    dueDate.setDate(today.getDate() + ((dayIndex + 7 - today.getDay()) % 7));
    dueDate.setHours(hours, minutes, 0, 0);
  } else if (/\d{1,2}\/\d{1,2}(\/\d{2,4})?/.test(lower)) {
    const [month, day, year] = lower.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/).slice(1);
    dueDate = new Date(year || today.getFullYear(), month - 1, day, hours, minutes);
  }

  // Clean the task text
  const cleanedText = input
    .replace(/(urgent|asap|important|immediately|optional|someday|maybe|today|tonight|tomorrow|tmrw|next week|in a week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}(?::\d{2})?\s?(?:am|pm)?|noon|midnight|high priority|priority high|low priority|priority low|[!?])/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    text: cleanedText,
    dueDate: dueDate ? dueDate.toISOString() : "",
    priority
  };
};

function App() {
  const [task, setTask] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [priority, setPriority] = useState("Medium");
  const [searchQuery, setSearchQuery] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showNotificationPermission, setShowNotificationPermission] = useState(false);
  const [filter, setFilter] = useState(() => localStorage.getItem("filter") || "All");
  const [tasks, setTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem("tasks");
      const parsed = savedTasks ? JSON.parse(savedTasks) : [];
      return Array.isArray(parsed) ? parsed.map((t, index) => ({
        id: t.id || `task-${index}`,
        text: typeof t === "string" ? t : t.text,
        completed: !!t.completed,
        priority: t.priority || "Medium",
        dueDate: t.dueDate || "",
        createdAt: t.createdAt || new Date().toISOString(),
        lastNotified: t.lastNotified || null
      })) : [];
    } catch (error) {
      console.error("Error parsing tasks:", error);
      return [];
    }
  });

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
          showNotification("Task overdue", `${task.text} was due on ${dueDate.toLocaleDateString()}`);
          setTasks(tasks.map(t =>
            t.id === task.id ? { ...t, lastNotified: new Date().toISOString() } : t
          ));
        }
      }

      if (task.priority === "High" && !task.dueDate) {
        const createdAt = new Date(task.createdAt);
        const hoursSinceCreation = (now - createdAt) / oneHour;
        const hoursSinceLastNotification = task.lastNotified 
          ? (now - new Date(task.lastNotified)) / oneHour 
          : Infinity;

        if (hoursSinceCreation > 24 && hoursSinceLastNotification > 24) {
          showNotification("High priority task", `Don't forget: ${task.text}`);
          setTasks(tasks.map(t =>
            t.id === task.id ? { ...t, lastNotified: new Date().toISOString() } : t
          ));
        }
      }
    });
  };

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    }, [tasks]);

  useEffect(() => {
    localStorage.setItem("filter", filter);
  }, [filter]);

  useEffect(() => {
    if (Notification.permission === "default") {
      setShowNotificationPermission(true);
    }
    const interval = setInterval(checkForReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAddTask = async () => {
    if (!task.trim()) return;

    try {
      if (editingIndex !== null) {
        setTasks(tasks.map((t, i) => i === editingIndex ? {
          ...t,
          text: task,
          priority,
          dueDate,
        } : t));
        setEditingIndex(null);
      } else {
        const parsed = await parseTask(task);
        setTasks([...tasks, {
          id: `task-${Date.now()}`,
          text: parsed.text || task,
          completed: false,
          priority: parsed.priority || priority,
          dueDate: parsed.dueDate || dueDate || '',
          createdAt: new Date().toISOString(),
          lastNotified: null
        }]);
      }

      setTask("");
      setDueDate("");
      setPriority("Medium");
    } catch (error) {
      console.error("Error adding task:", error);
      setTasks([...tasks, {
        id: `task-${Date.now()}`,
        text: task,
        completed: false,
        priority,
        dueDate: dueDate || '',
        createdAt: new Date().toISOString(),
        lastNotified: null
      }]);
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

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTasks(items);
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === "Completed") return t.completed;
    if (filter === "Incomplete") return !t.completed;
    if (searchQuery) return t.text.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

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
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const isOverdue = due < today;

    return (
      <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
        isOverdue 
          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" 
          : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      }`}>
         {due.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}
      {isOverdue && " ⚠️"}
      </span>
    );
  };

  // Calculate statistics
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const completionPercentage = totalCount > 0 
    ? Math.round((completedCount / totalCount) * 100) 
    : 0;
  const priorityCounts = {
    High: tasks.filter(t => t.priority === "High").length,
    Medium: tasks.filter(t => t.priority === "Medium").length,
    Low: tasks.filter(t => t.priority === "Low").length
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {showNotificationPermission && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-3 text-center z-50">
          <p>Allow notifications for task reminders?</p>
          <div className="mt-2 space-x-4">
            <button 
              onClick={() => {
                Notification.requestPermission().then(p => {
                  setShowNotificationPermission(false);
                  if (p === "granted") showNotification("TaskMate", "You'll now receive reminders!");
                });
              }} 
              className="px-4 py-1 bg-white text-yellow-600 rounded font-medium hover:bg-yellow-50 transition"
            >
              Allow
            </button>
            <button 
              onClick={() => setShowNotificationPermission(false)} 
              className="px-4 py-1 bg-yellow-600 text-white rounded font-medium hover:bg-yellow-700 transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 w-full max-w-md p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 mt-8 transition-all duration-300">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            AI TaskMate
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Type naturally like <span className="font-medium">"Meeting tomorrow 3pm urgent"</span>
          </p>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all duration-200"
            placeholder="🔍 Search tasks..."
          />
        </div>

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
            className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
            placeholder="✏️ What needs to be done?"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0 mb-6">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full sm:w-1/2 px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all duration-200"
          >
            <option value="High">🔥 High Priority</option>
            <option value="Medium">⚡ Medium Priority</option>
            <option value="Low">🌱 Low Priority</option>
          </select>

          <input
            type="date"
            value={dueDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full sm:w-1/2 px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all duration-200"
          />
        </div>

        <button
          onClick={handleAddTask}
          className={`w-full mb-6 px-5 py-3 rounded-lg font-medium transition-all ${
            editingIndex !== null 
              ? "bg-purple-600 hover:bg-purple-700" 
              : "bg-blue-600 hover:bg-blue-700"
          } text-white shadow-md hover:shadow-lg active:scale-95 transform transition-transform duration-100`}
        >
          {editingIndex !== null ? "🔄 Update Task" : "➕ Add Task"}
        </button>

        <div className="flex justify-center space-x-2 mb-4">
          {["All", "Completed", "Incomplete"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                filter === f 
                  ? "bg-blue-600 text-white shadow-inner" 
                  : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500"
              }`}
            >
              {f === "All" ? "🌐 All" : f === "Completed" ? "✅ Completed" : "📝 Incomplete"}
            </button>
          ))}
        </div>

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
                    <ul className="space-y-3">
                      {filteredTasks.map((t, index) => (
                        <Draggable key={t.id} draggableId={t.id} index={index}>
                          {(provided, snapshot) => (
                            <li
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`group relative bg-gray-50 dark:bg-gray-700 rounded-xl p-4 shadow-sm border-l-4 ${
                                t.priority === "High" ? "border-red-500" :
                                t.priority === "Medium" ? "border-yellow-500" : "border-green-500"
                              } transition-all duration-200 ${
                                snapshot.isDragging ? "bg-gray-100 dark:bg-gray-600 shadow-lg rotate-1" : "opacity-100"
                              }`}
                            >
                              <div className="flex items-start">
                                <label className="relative inline-flex items-center cursor-pointer mr-2">
                                  <input
                                    type="checkbox"
                                    checked={t.completed}
                                    onChange={() => toggleCompleted(t.id)}
                                    className="sr-only peer"
                                  />
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                    t.completed
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
                                  <p className={`text-gray-800 dark:text-gray-100 truncate ${
                                    t.completed ? "line-through opacity-70" : ""
                                  }`}>
                                    {t.text}
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    <PriorityBadge priority={t.priority} />
                                    <DueDateBadge dueDate={t.dueDate} />
                                  </div>
                                </div>

                                <div className="flex space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(index); }}
                                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition"
                                    aria-label="Edit task"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(index); }}
                                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
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
                    </ul>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent dark:from-gray-800 dark:to-transparent pointer-events-none"></div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? "🔍 No tasks match your search" : "📝 No tasks yet. Add one above to get started!"}
            </p>
          </div>
        )}

        {tasks.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center">
            <span>
              📊 {completedCount} of {totalCount} completed ({completionPercentage}%)
            </span>
            <span className="flex space-x-1">
              <span className="text-red-500">{priorityCounts.High} 🔥</span>
              <span className="text-yellow-500">{priorityCounts.Medium} ⚡</span>
              <span className="text-green-500">{priorityCounts.Low} 🌱</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;