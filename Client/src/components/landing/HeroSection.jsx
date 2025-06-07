import { motion } from "framer-motion";
import { Button } from "../ui/Button";
import { Container } from "../layout/Container";
import { Link } from "react-router-dom";
import Editor from "@monaco-editor/react";

export function HeroSection() {
  const codeSnippet = `import React from 'react';

// Collaborative editing in action
function App() {
  return (
    <div className="app">
      <header>Welcome to DevUnity</header>
      <p>Edit together in real-time</p>
    </div>
  );
}

export default App;`;

  return (
    <div className="relative overflow-hidden pt-24 sm:pt-32 lg:pt-40">
      <Container className="relative z-10">
        <div className="mx-auto max-w-2xl lg:max-w-4xl lg:px-12">
          <div className="text-center">
            <motion.h1
              className="text-4xl font-bold tracking-tight sm:text-6xl text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block relative">
                <span
                  className="relative bg-gradient-to-r from-blue-600 via-primary-500 to-blue-400 bg-clip-text text-transparent"
                  style={{
                    textShadow: `
                      0 0 5px rgba(96, 165, 250, 0.4),
                      0 0 10px rgba(96, 165, 250, 0.3),
                      0 0 15px rgba(96, 165, 250, 0.2)
                    `,
                  }}
                >
                  Code Together,
                </span>
              </span>{" "}
              <span className="inline-block mt-1 relative">
                <span
                  className="relative text-white"
                  style={{
                    textShadow: `
                      0 0 5px rgba(255, 255, 255, 0.4),
                      0 0 10px rgba(255, 255, 255, 0.3),
                      0 0 15px rgba(255, 255, 255, 0.2)
                    `,
                  }}
                >
                  Ship Faster
                </span>
              </span>
            </motion.h1>
            <motion.p
              className="mt-6 text-lg leading-8 text-slate-700 dark:text-slate-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              A powerful collaborative code editor for teams that streamlines
              development. Edit, review, and ship code together in real-time —
              all in one secure workspace.
            </motion.p>
            <motion.div
              className="mt-10 flex items-center justify-center gap-x-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link to="/register">
              <Button
                as={Link}
                to="/register"
                size="lg"
                variant="primary"
                className="shadow-lg px-8 py-2.5 bg-gradient-to-r from-blue-600 to-primary-500 hover:from-blue-700 hover:to-primary-600 transition-all duration-200"
              >
                Get started
              </Button>
              </Link>
              <Link>
              <Button
                as="a"
                href="#features"
                variant="ghost"
                size="lg"
                className="hover:text-primary-500 transition-colors duration-200"
              >
                Learn more →
              </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </Container>
      <motion.div
        className="relative z-10 mt-16 sm:mt-24 md:mt-20 w-full max-w-5xl mx-auto px-6 lg:px-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6 }}
      >
        <div className="relative rounded-2xl bg-slate-800/90 p-2 shadow-2xl shadow-black/20 ring-1 ring-slate-700/50 overflow-hidden">
          <div className="flex items-center h-10 bg-slate-900 rounded-t-lg px-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
            <div className="flex-1 text-center text-xs text-slate-400 font-mono">
              App.jsx - DevUnity
            </div>
            <div className="flex space-x-2">
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

          <div className="relative h-[350px]">
            <Editor
              height="350px"
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
            <motion.div
              className="absolute top-[115px] left-[220px] h-[18px] w-[1px] bg-primary-400"
              animate={{
                opacity: [1, 0.7, 1],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
            <motion.div
              className="absolute top-[147px] left-[180px] h-[18px] w-[1px] bg-accent-400"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 1, 0.7, 1],
              }}
              transition={{
                duration: 0.8,
                delay: 1.5,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          </div>
        </div>
      </motion.div>

      <div
        className="absolute inset-x-0 -top-40 transform-gpu overflow-hidden blur-3xl sm:-top-80 z-0"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary-200 to-accent-200 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>
    </div>
  );
}
