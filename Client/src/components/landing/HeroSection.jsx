import { motion } from "framer-motion";
import { Container } from "../layout/Container";
import Editor from "@monaco-editor/react";

export function HeroSection() {
  const codeSnippet = `import React, { useState, useEffect } from 'react';
import { useCollaborators } from './hooks/useCollaborators';

// DevUnity Collaborative Editor Example
function CollaborativeEditor() {
  const [code, setCode] = useState('// Start coding here...');
  const { users, cursors, changes } = useCollaborators();
  
  // Synchronize changes across all connected editors
  useEffect(() => {
    if (changes.length > 0) {
      // Apply remote changes to local editor
      applyChanges(changes);
    }
  }, [changes]);

  return (
    <div className="editor-container">
      <header className="editor-header">
        <h2>Document.jsx</h2>
        <div className="collaborators">
          {users.map(user => (
            <Avatar key={user.id} name={user.name} color={user.color} />
          ))}
        </div>
      </header>
      
      <Editor 
        value={code}
        onChange={setCode}
        language="javascript"
        theme="vs-dark"
        options={{ minimap: { enabled: true } }}
      />
    </div>
  );
}

export default CollaborativeEditor;`;

  return (
    <div className="relative overflow-hidden pt-20 sm:pt-24 lg:pt-32 pb-16">
      <Container className="relative z-10">
        <div className="mx-auto max-w-3xl lg:max-w-5xl lg:px-8">
          <div className="text-center mb-10 md:mb-16">
            <motion.h1
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block">
                <span
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-blue-400 bg-clip-text text-transparent"
                  style={{
                    textShadow: `
                      0 0 5px rgba(96, 165, 250, 0.4),
                      0 0 10px rgba(96, 165, 250, 0.3)
                    `,
                  }}
                >
                  Code Together,
                </span>
              </span>{" "}
              <span className="inline-block mt-1">
                <span
                  className="text-white"
                  style={{
                    textShadow: `
                      0 0 5px rgba(255, 255, 255, 0.4),
                      0 0 10px rgba(255, 255, 255, 0.3)
                    `,
                  }}
                >
                  Ship Faster
                </span>
              </span>
            </motion.h1>
            <motion.p
              className="mt-6 text-lg leading-8 text-slate-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              A powerful collaborative code editor that streamlines development.
              Edit, review, and ship code together in real-time — all in one
              secure workspace.
            </motion.p>
          </div>

          <motion.div
            className="relative mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-2xl blur-xl transform scale-105 -z-10"></div>

            <div className="relative rounded-2xl bg-slate-800/90 shadow-2xl shadow-black/30 ring-1 ring-slate-700/50 overflow-hidden">
              {/* Editor header */}
              <div className="flex items-center h-12 bg-slate-900 rounded-t-lg px-4">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
                <div className="flex-1 text-center text-xs text-slate-400 font-mono">
                  CollaborativeEditor.jsx — Real-time Editing
                </div>

                {/* Active collaborators with tooltips */}
                <div className="flex items-center space-x-3">
                  <motion.div
                    className="flex -space-x-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                  >
                    {/* First user with tooltip */}
                    <motion.div
                      className="relative"
                      whileHover={{ y: -3 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white font-medium border-2 border-slate-800">
                        S
                      </div>
                      <motion.div
                        className="absolute -bottom-8 left-50 transform -translate-x-1/2 bg-slate-700 px-2 py-1 rounded text-xs whitespace-nowrap"
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileHover={{ opacity: 1, scale: 1 }}
                      >
                        Sarah (editing line 12)
                      </motion.div>
                    </motion.div>

                    {/* Second user with tooltip */}
                    <motion.div
                      className="relative"
                      whileHover={{ y: -3 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs text-white font-medium border-2 border-slate-800">
                        A
                      </div>
                      <motion.div
                        className="absolute -bottom-8 left-50 transform -translate-x-1/2 bg-slate-700 px-2 py-1 rounded text-xs whitespace-nowrap"
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileHover={{ opacity: 1, scale: 1 }}
                      >
                        Alex (viewing)
                      </motion.div>
                    </motion.div>

                    <motion.div
                      className="relative"
                      whileHover={{ y: -3 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs text-white font-medium border-2 border-slate-800">
                        J
                      </div>
                      <motion.div
                        className="absolute -bottom-8 left-50 transform -translate-x-1/2 bg-slate-700 px-2 py-1 rounded text-xs whitespace-nowrap"
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileHover={{ opacity: 1, scale: 1 }}
                      >
                        James (idle)
                      </motion.div>
                    </motion.div>
                  </motion.div>
                </div>
              </div>

              {/* Code editor with overlaid animations */}
              <div className="relative">
                <Editor
                  height="380px"
                  defaultLanguage="javascript"
                  defaultValue={codeSnippet}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollbar: {
                      vertical: "hidden",
                      horizontal: "hidden",
                    },
                  }}
                />

                {/* User 1 cursor - Blue */}
                <motion.div
                  className="absolute top-[147px] h-[18px] w-[2px] bg-blue-500"
                  initial={{ left: 280 }}
                  animate={{
                    left: [280, 310, 310, 280],
                    opacity: [1, 1, 1, 1],
                  }}
                  transition={{
                    duration: 4,
                    times: [0, 0.3, 0.7, 1],
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "easeInOut",
                  }}
                >
                  {/* Cursor label */}
                  <div className="absolute -top-5 -left-10 text-xs bg-blue-500 px-1.5 py-0.5 rounded text-white whitespace-nowrap">
                    Sarah
                  </div>
                </motion.div>

                {/* User 2 cursor - Purple */}
                <motion.div
                  className="absolute top-[235px] h-[18px] w-[2px] bg-purple-500"
                  initial={{ left: 180 }}
                  animate={{
                    left: [180, 220, 220, 180],
                    opacity: [1, 1, 1, 1],
                  }}
                  transition={{
                    duration: 5,
                    times: [0, 0.4, 0.6, 1],
                    repeat: Infinity,
                    repeatType: "loop",
                    delay: 1,
                    ease: "easeInOut",
                  }}
                >
                  {/* Cursor label */}
                  <div className="absolute -top-5 -left-10 text-xs bg-purple-500 px-1.5 py-0.5 rounded text-white whitespace-nowrap">
                    Alex
                  </div>
                </motion.div>

                {/* Blue selection effect */}
                <motion.div
                  className="absolute top-[147px] left-[280px] h-[18px] bg-blue-500/30"
                  initial={{ width: 0 }}
                  animate={{
                    width: [0, 130, 130, 0],
                    opacity: [0.3, 0.3, 0.3, 0],
                  }}
                  transition={{
                    duration: 4,
                    times: [0, 0.3, 0.7, 1],
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "easeInOut",
                  }}
                />

                {/* Purple selection effect */}
                <motion.div
                  className="absolute top-[235px] left-[180px] h-[18px] bg-purple-500/30"
                  initial={{ width: 0 }}
                  animate={{
                    width: [0, 80, 80, 0],
                    opacity: [0.3, 0.3, 0.3, 0],
                  }}
                  transition={{
                    duration: 5,
                    times: [0, 0.4, 0.6, 1],
                    repeat: Infinity,
                    repeatType: "loop",
                    delay: 1,
                    ease: "easeInOut",
                  }}
                />

                {/* Typing indicator */}
                <motion.div
                  className="absolute top-[104px] left-[75px] px-2 py-0.5 bg-blue-500/20 border-l-2 border-blue-500 text-blue-200 text-xs rounded-r"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{
                    duration: 2,
                    times: [0, 0.1, 0.9, 1],
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                >
                  Sarah is typing...
                </motion.div>

                {/* Comment indicator */}
                <motion.div
                  className="absolute top-[193px] right-[20px] px-2 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs rounded-md flex items-center"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: [0, 1, 1, 0] }}
                  transition={{
                    duration: 4,
                    times: [0, 0.1, 0.9, 1],
                    repeat: Infinity,
                    repeatDelay: 5,
                    delay: 2,
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-purple-500 mr-1"></div>
                  Alex added a comment
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </div>
  );
}
