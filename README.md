# Collaborative Code Editor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![JavaScript](https://img.shields.io/badge/JavaScript-99.1%25-yellow)

A real-time collaborative code editor that lets you and your friends code together, live, from anywhere in the world. No more emailing code files or fighting over screen share—just pure, instant collaboration!

## 🌐 Live Demo

Try it out now: [Collaborative Code Editor](https://collaborative-code-editor-chi.vercel.app)

## 📝 Description

Collaborative Code Editor is a web-based platform designed for developers, students, and teams who want to work on code together in real-time. Whether you're pair programming, teaching, reviewing code, or just want to hack together with friends, this tool makes it seamless and fun.

## ✨ Features

- **Real-time Collaboration:** Edit code with others and see changes instantly
- **Live Cursor Tracking:** Watch your teammates' cursors move as they type
- **Syntax Highlighting:** Beautiful code highlighting for popular languages
- **Project & File Management:** Organize your work in folders and files
- **GitHub Integration:** Commit and push directly to your GitHub repo
- **User Authentication:** Secure login with JWT and GitHub OAuth
- **Persistent Storage:** All your code is saved in the cloud (MongoDB)
- **Chat & Presence:** See who's online and chat while you code
- **Responsive Design:** Works on desktop, tablet, and mobile

## 🛠️ Technologies Used

- **Frontend:**

  - React.js
  - Monaco Editor (VS Code's editor)
  - Socket.IO (client)
  - ShareDB (for real-time sync)
  - HTML/CSS

- **Backend:**

  - Node.js
  - Express.js
  - Socket.IO (server)
  - ShareDB
  - MongoDB & Mongoose
  - JWT Authentication

- **Deployment:**
  - Vercel (Frontend)
  - Render (Backend)
  - MongoDB Atlas (Database)

## 🚀 Getting Started

### Prerequisites

- Node.js (v16.x or higher)
- npm or yarn
- MongoDB Atlas account
- GitHub account (for OAuth)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RjyavardhanSingh/Collaborative_code_editor.git
   cd Collaborative_code_editor
   ```
2. **Install backend dependencies:**
   ```bash
   cd Server
   npm install
   ```
3. **Install frontend dependencies:**
   ```bash
   cd ../Client
   npm install
   ```
4. **Configure environment variables:**
   - See `.env.example` in both `Server` and `Client` for required variables
   - Set up MongoDB URI, GitHub OAuth keys, and client/server URLs
5. **Run the development servers:**
   - **Backend:**
     ```bash
     cd Server
     npm run dev
     ```
   - **Frontend:**
     ```bash
     cd Client
     npm run dev
     ```

## 📋 Usage

1. Register or log in (GitHub OAuth supported)
2. Create a new project folder or join an existing one
3. Add files, invite collaborators, and start coding together
4. Use the chat and see live cursors for seamless teamwork
5. Commit and push your code to GitHub when ready

## 🤝 Contributing

We love contributions! To get started:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to your branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request and describe your changes

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [ShareDB](https://github.com/share/sharedb)
- [Socket.IO](https://socket.io/)
- [React](https://reactjs.org/)
- [MongoDB](https://www.mongodb.com/)

## 📞 Contact

Rjyavardhan Singh - [GitHub Profile](https://github.com/RjyavardhanSingh)

Project Link: [https://github.com/RjyavardhanSingh/Collaborative_code_editor](https://github.com/RjyavardhanSingh/Collaborative_code_editor)

---

> _"Remember: Friends don't let friends code alone. Unless they're writing infinite loops—then, maybe, let them!"_ 😄
