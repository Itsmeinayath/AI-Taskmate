# 🧠 AI Taskmate

A smart and responsive To-Do + Calendar Web App built with **React**, designed to supercharge your daily productivity. AI Taskmate lets you track tasks, prioritize them, get timely browser notifications, and stay organized with a built-in calendar view.

---

## 🚀 Features

- ✅ Add, Edit, and Delete To-Dos
- ⭐ Set Task Priority (Low, Medium, High)
- ⏰ Add Optional Due Dates
- 🔔 Intelligent Notifications:
  - Alerts for overdue tasks
  - Alerts for high-priority tasks pending after 24 hours
- 📅 Built-in Calendar Integration
- 💾 Data saved in `localStorage` (no backend needed)
- ✨ Responsive UI with Tailwind CSS

---

## 🔧 Tech Stack

- **Frontend:** React.js
- **Styling:** Tailwind CSS
- **Storage:** HTML5 LocalStorage
- **Extras:** Browser Notifications API

## 🧠 How Notifications Work

- The app checks your task list every minute.
- If a task is:
  - Overdue → Shows a browser notification.
  - High-priority and not completed in 24 hours → Notifies the user.
- Each task is notified only once (tracked internally).
- You must allow notification permissions when prompted.

---

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Itsmeinayath/AI-Taskmate.git
cd AI-Taskmate


## 🌐 Live Demo

Check it out here: [AI Taskmate Live]
https://ai-taskmate-psi.vercel.app/

