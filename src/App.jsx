export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">🧠 AI TaskMate</h1>

      <div className="w-full max-w-md bg-white shadow-xl rounded-lg p-4">
        <div className="h-64 overflow-y-auto border p-2 rounded mb-4">
          {/* Chat messages will appear here */}
          <p className="text-gray-500">No messages yet...</p>
        </div>

        <form className="flex space-x-2">
          <input
            type="text"
            placeholder="Type your task..."
            className="flex-1 border px-3 py-2 rounded focus:outline-none"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
