import { motion } from "framer-motion";
import { Container } from "../layout/Container";

const testimonials = [
  {
    content:
      "CodeCollab has transformed how our team collaborates on code. It's like Google Docs but for programming, and it's become an essential part of our workflow.",
    author: "Sarah Chen",
    role: "CTO, TechStart Inc.",
  },
  {
    content:
      "The real-time collaboration features are outstanding. Being able to work simultaneously with teammates across time zones has accelerated our development process.",
    author: "Miguel Rodriguez",
    role: "Senior Developer, Global Systems",
  },
  {
    content:
      "I love the version control features. Being able to see changes and revert when needed without leaving the editor saves us so much time.",
    author: "Alex Johnson",
    role: "Lead Engineer, DataFlow",
  },
];

export function TestimonialsSection() {
  return (
    <div id="testimonials" className="py-24 sm:py-32 relative">
      <Container>
        <div className="mx-auto max-w-2xl lg:text-center">
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Trusted by developers worldwide
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mt-24 lg:max-w-5xl lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="flex flex-col justify-between rounded-2xl bg-slate-800 p-6 shadow-md shadow-slate-900/5 ring-1 ring-slate-700"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div>
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="h-5 w-5 text-amber-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-base leading-relaxed text-slate-200">
                  "{testimonial.content}"
                </p>
              </div>
              <div className="mt-6">
                <p className="font-semibold text-white">{testimonial.author}</p>
                <p className="text-sm text-slate-400">{testimonial.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </div>
  );
}
