import Navbar from "../../components/layout/NavBar";
import { Footer } from "../../components/layout/Footer";
import { HeroSection } from "../../components/landing/HeroSection";
import { FeaturesSection } from "../../components/landing/FeaturesSection";
import { TestimonialsSection } from "../../components/landing/TestimonialsSection";
import { CtaSection } from "../../components/landing/CtaSection";
import heroVideo from "../../assets/Herovideo.mp4";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 w-full h-full overflow-hidden z-0">
        <div className="absolute inset-0 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute w-[100%] min-h-[120%] object-cover"
            style={{
              objectPosition: "center 20%",
              top: "-45%",
            }}
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
        </div>
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/70 to-slate-900/90 z-1"></div>
      </div>
      <Navbar
        title="DevUnity"
        actions={
          <div className="flex gap-2 ml-auto">
            <a
              href="/login"
              className="px-4 py-2 text-sm font-medium text-white hover:text-blue-200"
            >
              Login
            </a>
            <a
              href="/register"
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Get Started
            </a>
          </div>
        }
      />
      <main className="flex-grow relative z-10">
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
