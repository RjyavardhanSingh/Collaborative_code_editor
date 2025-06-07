import { Link } from "react-router-dom";
import { Container } from "./Container";

export function Footer() {
  return (
    <footer className="border-t border-slate-800/50 relative z-10">
      <Container className="py-12">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="md:w-1/3 mb-8 md:mb-0">
            <div className="flex items-center mb-4">
              <div className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-accent-400 text-transparent bg-clip-text">
                CodeCollab
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              A powerful collaborative code editor for teams who want to write
              code together in real time.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-slate-500 hover:text-primary-500 dark:text-slate-400 dark:hover:text-primary-400"
              >
                <span className="sr-only">Twitter</span>
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a
                href="#"
                className="text-slate-500 hover:text-primary-500 dark:text-slate-400 dark:hover:text-primary-400"
              >
                <span className="sr-only">GitHub</span>
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Product
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#features"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#testimonials"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400"
                  >
                    Testimonials
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400"
                  >
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Company
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div className="col-span-2 md:col-span-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Legal
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400"
                  >
                    Privacy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400"
                  >
                    Terms
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400"
                  >
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200 dark:border-slate-700 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} CodeCollab. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0">
            <a
              href="#"
              className="text-xs text-slate-500 hover:text-primary-500 dark:text-slate-400 dark:hover:text-primary-400"
            >
              Made with ♥ for developers
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
