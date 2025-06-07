import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthProvider";
import logo from "../../assets/newlogo.png";

const programmingLanguages = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C#",
  "PHP",
  "Ruby",
  "Go",
  "Rust",
  "Swift",
  "Kotlin",
  "C++",
  "HTML/CSS",
];

export default function OnboardingPage() {
  const { currentuser, completeUserOnboarding } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [preferences, setPreferences] = useState({
    avatar: currentuser?.avatar || "",
    bio: currentuser?.bio || "",
    preferredLanguages: currentuser?.preferredLanguages || [],
    theme: currentuser?.theme || "dark",
  });

  const handleNextStep = () => setStep(step + 1);
  const handlePrevStep = () => setStep(step - 1);

  const handleLanguageToggle = (language) => {
    setPreferences((prev) => {
      const languages = [...prev.preferredLanguages];
      if (languages.includes(language)) {
        return {
          ...prev,
          preferredLanguages: languages.filter((lang) => lang !== language),
        };
      } else {
        return {
          ...prev,
          preferredLanguages: [...languages, language],
        };
      }
    });
  };

  const handleThemeChange = (theme) => {
    setPreferences((prev) => ({ ...prev, theme }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) {
        setError("Avatar image too large (max 5mb)");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 150;
          const MAX_HEIGHT = 150;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          setPreferences((prev) => ({
            ...prev,
            avatar: canvas.toDataURL("image/jpeg", 0.7),
          }));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBioChange = (e) => {
    setPreferences((prev) => ({ ...prev, bio: e.target.value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");
    try {
      await completeUserOnboarding(preferences);
      navigate("/dashboard");
    } catch (error) {
      setError(error.message || "Failed to save preferences");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
      {/* Header with logo */}
      <div className="w-full bg-slate-900/80 border-b border-slate-700/50 py-4">
        <div className="container mx-auto px-4">
          <Link to="/">
            <img className="h-10" src={logo} alt="DevUnity" />
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background gradient effect */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 opacity-10 rounded-full filter blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 opacity-10 rounded-full filter blur-3xl"></div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-white mb-2">
              Welcome to DevUnity
            </h1>
            <p className="text-slate-400">Let's set up your workspace</p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
          <motion.div
            className="bg-slate-800/80 backdrop-blur-sm py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-slate-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Progress indicator */}
            <div className="mb-8">
              <div className="relative">
                <div className="absolute top-2 left-0 w-full h-0.5 bg-slate-600">
                  <div
                    className="h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${(step / 2) * 100}%` }}
                  ></div>
                </div>
                <div className="relative flex justify-between">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        step >= 1
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                          : "bg-slate-600 text-slate-300"
                      }`}
                    >
                      1
                    </div>
                    <div className="mt-2 text-xs text-slate-400">Profile</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        step >= 2
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                          : "bg-slate-600 text-slate-300"
                      }`}
                    >
                      2
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Preferences
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-md p-3">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {/* Step 1: Profile */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold text-white">
                  Personalize your profile
                </h2>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Profile picture
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="relative flex-shrink-0">
                      <div className="h-20 w-20 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center border-2 border-slate-600">
                        {preferences.avatar ? (
                          <img
                            src={preferences.avatar}
                            alt="Avatar preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl text-slate-300">
                            {currentuser?.username?.charAt(0).toUpperCase() ||
                              "U"}
                          </span>
                        )}
                      </div>
                      <input
                        type="file"
                        id="avatar"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                    </div>
                    <label
                      htmlFor="avatar"
                      className="px-3 py-2 text-sm font-medium rounded-md bg-slate-700 text-white hover:bg-slate-600 cursor-pointer border border-slate-600 transition-colors"
                    >
                      Choose image
                    </label>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="bio"
                    className="block text-sm font-medium text-slate-300 mb-2"
                  >
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    rows={4}
                    value={preferences.bio}
                    onChange={handleBioChange}
                    placeholder="Tell us a bit about yourself..."
                    className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-slate-700 text-white text-sm"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Preferences */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold text-white">
                  Select your preferences
                </h2>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Preferred programming languages
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                    {programmingLanguages.map((language) => (
                      <button
                        key={language}
                        type="button"
                        onClick={() => handleLanguageToggle(language)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          preferences.preferredLanguages.includes(language)
                            ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500 text-white"
                            : "bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        {language}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Theme preference
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleThemeChange("dark")}
                      className={`flex flex-col items-center justify-center p-4 border rounded-lg ${
                        preferences.theme === "dark"
                          ? "border-blue-500 bg-gradient-to-r from-blue-500/10 to-purple-500/10"
                          : "border-slate-600 bg-slate-700"
                      }`}
                    >
                      <div className="h-12 w-12 rounded-full bg-slate-900 mb-2 flex items-center justify-center">
                        <svg
                          className="h-6 w-6 text-slate-300"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                      </div>
                      <div className="text-sm font-medium text-white">Dark</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleThemeChange("light")}
                      className={`flex flex-col items-center justify-center p-4 border rounded-lg ${
                        preferences.theme === "light"
                          ? "border-blue-500 bg-gradient-to-r from-blue-500/10 to-purple-500/10"
                          : "border-slate-600 bg-slate-700"
                      }`}
                    >
                      <div className="h-12 w-12 rounded-full bg-slate-200 mb-2 flex items-center justify-center">
                        <svg
                          className="h-6 w-6 text-slate-700"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="text-sm font-medium text-white">
                        Light
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2 text-sm font-medium rounded-md border border-slate-600 text-white hover:bg-slate-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-70"
                  >
                    {isLoading ? "Saving..." : "Finish Setup"}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
