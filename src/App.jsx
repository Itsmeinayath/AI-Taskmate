import { useEffect, useState } from "react";

function App() {
  // State management (same as before)
  const [task, setTask] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [priority, setPriority] = useState("Medium");

  // 🌙 Theme state (simplified)
  const [darkMode, setDarkMode] = useState(() => {
    // Check for saved preference or system preference
    return localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  // 💾 Apply theme class and save preference
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const [tasks, setTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem("tasks");
      const parsed = savedTasks ? JSON.parse(savedTasks) : [];
      return Array.isArray(parsed)
        ? parsed
          .filter(t => t && (typeof t === "string" || (typeof t === "object" && typeof t.text === "string")))
          .map(t =>
            typeof t === "string"
              ? { text: t, completed: false, priority: "Medium" }
              : { text: t.text, completed: !!t.completed, priority: t.priority || "Medium" }
          )
        : [];
    } catch (error) {
      console.error("Error parsing tasks from localStorage:", error);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode, tasks]);

  // Handler functions (same as before)
  const handleAddTask = () => {
    if (task.trim() !== "") {
      if (editingIndex !== null) {
        const updatedTasks = [...tasks];
        updatedTasks[editingIndex] = {
          ...updatedTasks[editingIndex],
          text: task,
          priority,
        };
        setTasks(updatedTasks);
        setEditingIndex(null);
      } else {
        setTasks([...tasks, { text: task, completed: false, priority }]);
      }
      setTask("");
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
    setTask(tasks[index].text);
    setPriority(tasks[index].priority);
    setEditingIndex(index);
  };

  const toggleCompleted = (index) => {
    const updated = [...tasks];
    updated[index].completed = !updated[index].completed;
    setTasks(updated);
  };

  // Enhanced UI with better styling
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Dark Mode Toggle - Floating in top right */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="fixed top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-yellow-300 shadow-md hover:shadow-lg transition-all"
        aria-label="Toggle dark mode"
      >
        {darkMode ? (
          <span className="text-xl">☀️</span>
        ) : (
          <span className="text-xl">🌙</span>
        )}
      </button>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 w-full max-w-md p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
        {/* Header with subtle gradient */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            AI TaskMate
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Your smart task companion
          </p>
        </div>

        {/* Input Section - Improved layout */}
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 mb-6">
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
            className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            placeholder="What needs to be done?"
          />

          <div className="flex space-x-3">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="px-3 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition appearance-none"
            >
              <option value="High">🔥 High</option>
              <option value="Medium">⚡ Medium</option>
              <option value="Low">🌱 Low</option>
            </select>

            <button
              onClick={handleAddTask}
              className={`px-5 py-3 rounded-lg font-medium transition-all ${editingIndex !== null
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-blue-600 hover:bg-blue-700"
                } text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5`}
            >
              {editingIndex !== null ? "Update" : "Add"}
            </button>
          </div>
        </div>

        {/* Tasks List - Enhanced visual hierarchy */}
        {tasks.length > 0 ? (
          <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {tasks.map((t, index) => (
              <li
                key={index}
                className={`group relative bg-gray-50 dark:bg-gray-700 rounded-xl p-4 shadow-sm border-l-4 ${t.priority === "High"
                    ? "border-red-500"
                    : t.priority === "Medium"
                      ? "border-yellow-500"
                      : "border-green-500"
                  } transition hover:shadow-md`}
              >
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={() => toggleCompleted(index)}
                    className="mt-1 h-5 w-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 transition cursor-pointer"
                  />

                  <div className="ml-3 flex-1">
                    <p
                      className={`text-gray-800 dark:text-gray-100 ${t.completed ? "line-through opacity-70" : ""
                        }`}
                    >
                      {t.text}
                    </p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${t.priority === "High"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : t.priority === "Medium"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        }`}
                    >
                      {t.priority} priority
                    </span>
                  </div>

                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleEdit(index)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition"
                      aria-label="Edit task"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                      aria-label="Delete task"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No tasks yet. Add one above to get started!
            </p>
          </div>
        )}

        {/* Stats Footer */}
        {tasks.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex justify-between">
            <span>
              {tasks.filter(t => t.completed).length} of {tasks.length} completed
            </span>
            <span>
              {tasks.filter(t => t.priority === "High").length} 🔥,{" "}
              {tasks.filter(t => t.priority === "Medium").length} ⚡,{" "}
              {tasks.filter(t => t.priority === "Low").length} 🌱
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;