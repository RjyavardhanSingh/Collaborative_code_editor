import { motion } from "framer-motion";
import { Container } from "../layout/Container";
import { Tabs } from "../ui/tabs";

const features = [
  {
    title: "Real-time Collaboration",
    value: "collaboration",
    content: (
      <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1">
            <h3 className="text-xl md:text-3xl font-bold mb-4">
              Real-time Collaboration
            </h3>
            <p className="text-base md:text-lg font-normal opacity-80 mb-8">
              Write code with your team simultaneously. See changes as they
              happen with multi-cursor support and watch your teammates edit in
              real-time.
            </p>
            <div className="flex items-center text-sm text-blue-300 hover:text-blue-200 transition cursor-pointer">
              Learn more
              <svg
                className="ml-1 h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 relative h-64 md:h-80">
            <img
              src="/images/collab-demo.webp"
              alt="Collaboration Demo"
              className="object-cover rounded-xl shadow-lg h-full w-full"
              onError={(e) => {
                e.target.src =
                  "https://placehold.co/600x400/082f49/e0f2fe?text=Real-time+Collaboration";
              }}
            />
          </div>
        </div>
      </div>
    ),
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
  },
  {
    title: "Syntax Highlighting",
    value: "syntax",
    content: (
      <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1">
            <h3 className="text-xl md:text-3xl font-bold mb-4">
              Syntax Highlighting
            </h3>
            <p className="text-base md:text-lg font-normal opacity-80 mb-8">
              Support for over 30 programming languages with beautiful syntax
              highlighting. Make your code readable and easier to understand at
              a glance.
            </p>
            <div className="flex items-center text-sm text-blue-300 hover:text-blue-200 transition cursor-pointer">
              Learn more
              <svg
                className="ml-1 h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 relative h-64 md:h-80">
            <img
              src="/images/syntax-demo.webp"
              alt="Syntax Highlighting"
              className="object-cover rounded-xl shadow-lg h-full w-full"
              onError={(e) => {
                e.target.src =
                  "https://placehold.co/600x400/082f49/e0f2fe?text=Syntax+Highlighting";
              }}
            />
          </div>
        </div>
      </div>
    ),
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"
        />
      </svg>
    ),
  },
  {
    title: "Version Control",
    value: "version-control",
    content: (
      <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1">
            <h3 className="text-xl md:text-3xl font-bold mb-4">
              Version Control
            </h3>
            <p className="text-base md:text-lg font-normal opacity-80 mb-8">
              Keep track of changes with automatic versioning. Compare and
              restore previous versions easily without leaving your workspace.
            </p>
            <div className="flex items-center text-sm text-blue-300 hover:text-blue-200 transition cursor-pointer">
              Learn more
              <svg
                className="ml-1 h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 relative h-64 md:h-80">
            <img
              src="/images/version-control.webp"
              alt="Version Control"
              className="object-cover rounded-xl shadow-lg h-full w-full"
              onError={(e) => {
                e.target.src =
                  "https://placehold.co/600x400/082f49/e0f2fe?text=Version+Control";
              }}
            />
          </div>
        </div>
      </div>
    ),
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
        />
      </svg>
    ),
  },
  {
    title: "Built-in Chat",
    value: "chat",
    content: (
      <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1">
            <h3 className="text-xl md:text-3xl font-bold mb-4">
              Built-in Chat
            </h3>
            <p className="text-base md:text-lg font-normal opacity-80 mb-8">
              Discuss code changes without leaving the editor. Share code
              snippets and ideas in context with your team members in real-time.
            </p>
            <div className="flex items-center text-sm text-blue-300 hover:text-blue-200 transition cursor-pointer">
              Learn more
              <svg
                className="ml-1 h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 relative h-64 md:h-80">
            <img
              src="/images/chat-demo.webp"
              alt="Built-in Chat"
              className="object-cover rounded-xl shadow-lg h-full w-full"
              onError={(e) => {
                e.target.src =
                  "https://placehold.co/600x400/082f49/e0f2fe?text=Built-in+Chat";
              }}
            />
          </div>
        </div>
      </div>
    ),
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6"
        />
      </svg>
    ),
  },
  {
    title: "Security",
    value: "security",
    content: (
      <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1">
            <h3 className="text-xl md:text-3xl font-bold mb-4">
              Enterprise-Grade Security
            </h3>
            <p className="text-base md:text-lg font-normal opacity-80 mb-8">
              Keep your code secure with end-to-end encryption, role-based
              access controls, and audit logs. Your intellectual property stays
              protected.
            </p>
            <div className="flex items-center text-sm text-blue-300 hover:text-blue-200 transition cursor-pointer">
              Learn more
              <svg
                className="ml-1 h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 relative h-64 md:h-80">
            <img
              src="/images/security.webp"
              alt="Security Features"
              className="object-cover rounded-xl shadow-lg h-full w-full"
              onError={(e) => {
                e.target.src =
                  "https://placehold.co/600x400/082f49/e0f2fe?text=Security";
              }}
            />
          </div>
        </div>
      </div>
    ),
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
        />
      </svg>
    ),
  },
];

export function FeaturesSection() {
  return (
    <div id="features" className="py-24 sm:py-32 relative">
      <Container>
        <div className="mx-auto max-w-2xl lg:text-center mb-16">
          <motion.p
            className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Everything you need for collaborative coding
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="h-[30rem] md:h-[40rem] [perspective:1000px] relative flex flex-col max-w-5xl mx-auto w-full"
        >
          <Tabs
            tabs={features}
            activeTabClassName="bg-gradient-to-r from-blue-500 to-purple-600"
            tabClassName="text-white hover:text-blue-300 transition"
            containerClassName="justify-center"
          />
        </motion.div>
      </Container>
    </div>
  );
}
