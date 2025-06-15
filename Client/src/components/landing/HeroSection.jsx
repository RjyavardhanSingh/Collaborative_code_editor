import { motion } from "framer-motion";
import { Container } from "../layout/Container";
import Editor from "@monaco-editor/react";

export function HeroSection() {
  const codeSnippet = `import React, { useState, useEffect } from 'react';

// Collaborative Code Editor - Live Demo
function DevUnityEditor() {
  const [collaborators, setCollaborators] = useState([
    { id: 1, name: "Sarah", color: "#3b82f6" },
    { id: 2, name: "Alex", color: "#8b5cf6" },
  ]);
  
  return (
    <div className="editor-container">
      <header className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Document.jsx</h1>
        <div className="collaborators-avatars">
          {/* Real-time collaboration happening here */}
        </div>
      </header>
      
      {/* Your code goes here... */}
    </div>
  );
}

export default DevUnityEditor;`;

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
                  DevUnityEditor.jsx — Collaborative Editing
                </div>
                <div className="flex items-center space-x-3">
                  <motion.div
                    className="flex -space-x-2"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white font-medium border-2 border-slate-800">
                      S
                    </div>
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs text-white font-medium border-2 border-slate-800">
                      A
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-medium border-2 border-slate-800">
                      +2
                    </div>
                  </motion.div>
                  <div className="text-slate-400">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Code editor */}
              <div className="relative">
                <Editor
                  height="380px"
                  defaultLanguage="javascript"
                  defaultValue={codeSnippet}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    renderLineHighlight: "all",
                    lineNumbers: "on",
                    scrollbar: {
                      vertical: "hidden",
                      horizontal: "hidden",
                    },
                  }}
                />

                {/* Animated cursors to simulate collaboration */}
                <motion.div
                  className="absolute top-[145px] left-[280px] h-[18px] w-[1px] bg-blue-500"
                  animate={{
                    opacity: [1, 0.7, 1],
                    x: [0, 3, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                />
                <motion.div
                  className="absolute top-[235px] left-[180px] h-[18px] w-[1px] bg-purple-500"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 1, 0.7, 1],
                    x: [0, 5, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.8,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                />

                {/* Selection effect */}
                <motion.div
                  className="absolute top-[200px] left-[120px] h-[18px] w-0 bg-blue-500/30"
                  initial={{ width: 0 }}
                  animate={{ width: [0, 130, 130, 0] }}
                  transition={{
                    duration: 4,
                    times: [0, 0.4, 0.8, 1],
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                />

                {/* Purple selection effect */}
                <motion.div
                  className="absolute top-[288px] left-[150px] h-[18px] w-0 bg-purple-500/30"
                  initial={{ width: 0 }}
                  animate={{ width: [0, 80, 80, 0] }}
                  transition={{
                    duration: 3,
                    times: [0, 0.3, 0.7, 1],
                    repeat: Infinity,
                    repeatDelay: 4,
                    delay: 2,
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </Container>

      {/* Background gradient effects */}
      <div
        className="absolute inset-x-0 -top-40 transform-gpu overflow-hidden blur-3xl sm:-top-80 z-0"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-600 to-purple-600 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div
        className="absolute inset-x-0 bottom-0 transform-gpu overflow-hidden blur-3xl -z-10"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-purple-800 to-blue-700 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>
    </div>
  );
}
