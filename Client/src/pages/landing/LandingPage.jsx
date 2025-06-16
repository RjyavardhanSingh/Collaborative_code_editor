import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowRight } from "react-icons/fi";
import Navbar from "../../components/layout/NavBar";
import { HeroSection } from "../../components/landing/HeroSection";
import { FeaturesSection } from "../../components/landing/FeaturesSection";
import GlobeDemo from "../../components/ui/globe-demo";

export default function LandingPage() {
  return (
    <div className="bg-black min-h-screen flex flex-col relative overflow-hidden">
      {/* Background gradient effects with improved blending */}
      <div
        className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15), rgba(0, 0, 0, 0) 70%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15), rgba(0, 0, 0, 0) 70%)",
          zIndex: 0,
        }}
        aria-hidden="true"
      ></div>

      <div
        className="fixed inset-x-0 top-0 transform-gpu overflow-hidden blur-3xl z-0 pointer-events-none opacity-40"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-600 to-purple-600 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div
        className="fixed inset-x-0 bottom-0 transform-gpu overflow-hidden blur-3xl z-0 pointer-events-none opacity-40"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-purple-800 to-blue-700 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      {/* The rest of your code remains the same... */}
      <Navbar>
        <div className="flex items-center justify-between w-full relative z-10">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8" />
            <span className="font-bold text-xl text-white">DevUnity</span>
          </Link>
          <div className="hidden md:flex gap-6">
            <Link to="#features" className="text-slate-300 hover:text-white">
              Features
            </Link>
            <Link to="#pricing" className="text-slate-300 hover:text-white">
              Pricing
            </Link>
            <Link to="/about" className="text-slate-300 hover:text-white">
              About
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="hidden md:block text-slate-300 hover:text-white"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-md transition-all"
            >
              Sign up
            </Link>
          </div>
        </div>
      </Navbar>

      <main className="flex-1 relative z-10">
        {/* Globe Demo Section at the top */}
        <div className="flex flex-col-reverse md:flex-row items-center justify-between py-16 md:py-24 px-6 md:px-12 lg:px-24 relative z-10">
          <div className="md:w-1/2 mt-12 md:mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="max-w-lg"
            >
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Connecting Developers{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                  Worldwide
                </span>
              </h1>
              <p className="text-lg text-gray-300 mb-8">
                Collaborate on code in real-time with developers from across the
                globe. Our platform brings teams together, no matter where
                they're located.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium px-6 py-3 rounded-md transition-all"
                >
                  Start Collaborating
                </Link>
                <Link
                  to="#features"
                  className="bg-transparent border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-medium px-6 py-3 rounded-md transition-all flex items-center"
                >
                  Learn More <FiArrowRight className="ml-2" />
                </Link>
              </div>
            </motion.div>
          </div>
          <div className="md:w-1/2 h-[500px] relative">
            <div className="w-full h-full bg-transparent">
              <GlobeDemo />
            </div>
          </div>
        </div>

        {/* Other Content Below */}
        <div className="mt-12">
          <HeroSection />
        </div>

        <FeaturesSection />
      </main>

      <footer className="bg-black/50 backdrop-blur-sm border-t border-slate-800/60 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-semibold mb-4">DevUnity</h3>
              <p className="text-slate-400 text-sm">
                Bringing developers together through collaborative coding.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link to="#features">Features</Link>
                </li>
                <li>
                  <Link to="#pricing">Pricing</Link>
                </li>
                <li>
                  <Link to="/security">Security</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link to="/docs">Documentation</Link>
                </li>
                <li>
                  <Link to="/guides">Guides</Link>
                </li>
                <li>
                  <Link to="/support">Support</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link to="/about">About</Link>
                </li>
                <li>
                  <Link to="/blog">Blog</Link>
                </li>
                <li>
                  <Link to="/careers">Careers</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-800/60 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} DevUnity. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/terms" className="text-slate-500 text-sm">
                Terms
              </Link>
              <Link to="/privacy" className="text-slate-500 text-sm">
                Privacy
              </Link>
              <Link to="/cookies" className="text-slate-500 text-sm">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
