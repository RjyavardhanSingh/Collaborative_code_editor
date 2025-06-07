import { motion } from "framer-motion";
import { Button } from "../ui/Button";
import { Container } from "../layout/Container";
import { Link } from "react-router-dom";

export function CtaSection() {
  return (
    <div className="py-16 sm:py-24 relative">
      <Container>
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Start coding together today
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Join thousands of developers who are already collaborating in
            real-time. Try our collaborative code editor for free.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link to="/register">
            <Button
              as={Link}
              to="/register"
              variant="primary"
              size="lg"
              className="shadow-lg px-8 py-2.5 bg-gradient-to-r from-blue-600 to-primary-500 hover:from-blue-700 hover:to-primary-600 transition-all duration-200"
            >
              Get started for free
            </Button>
            </Link>
            <Button
              as="a"
              href="#learn-more"
              variant="outline"
              size="lg"
              className="text-white border-white hover:bg-slate-800"
            >
              Learn more
            </Button>
          </div>
        </motion.div>
      </Container>
    </div>
  );
}
