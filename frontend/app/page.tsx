"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

// Content of each tab
function TabContent({ tab }: { tab: number }) {
  return (
    <div className="rounded-xl bg-[#FBFBFE] p-10 shadow text-center">
      <h1 className="text-3xl font-bold text-gray-900">Part {tab}</h1>
      <p className="mt-3 text-gray-600">
        จับฉ่าย จับฉ่าย จับฉ่าย จับฉ่าย จับฉ่าย จับฉ่าย จับฉ่าย
      </p>
    </div>
  );
}

// Modal (popup) component
type AuthMode = "signup" | "login";

function AuthModal({
  mode,
  onModeChange,
  onClose,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
}) {
  const isSignup = mode === "signup";

  // simple submit handlers (just prevent page reload for now)
  const handleSignupSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: send data to backend later
    console.log("Signup submitted");
  };

  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Login submitted");
  };

  return (
    // overlay only over the content area (section is relative)
    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        {/* Header row: title + close button */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isSignup ? "Create your account" : "Welcome back"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
            aria-label="Close authentication dialog"
          >
            ✕
          </button>
        </div>

        {/* Tabs: Sign up | Login */}
        <div className="mb-6 flex gap-2 rounded-full bg-gray-100 p-1 text-sm font-bold">
          <button
            onClick={() => onModeChange("signup")}
            className={[
              "flex-1 rounded-full py-2 transition-colors",
              isSignup
                ? "bg-[#FFE17E] text-gray-900"
                : "text-gray-600 hover:bg-[#FFE17E]/50 hover:text-gray-900",
            ].join(" ")}
          >
            Sign up
          </button>
          <button
            onClick={() => onModeChange("login")}
            className={[
              "flex-1 rounded-full py-2 transition-colors",
              !isSignup
                ? "bg-[#FFE17E] text-gray-900"
                : "text-gray-600 hover:[#FFE17E]/50 hover:text-gray-900",
            ].join(" ")}
          >
            Login
          </button>
        </div>

        {/* Forms area */}
        {isSignup ? (
          // SIGN UP FORM
          <form className="space-y-4" onSubmit={handleSignupSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#FFE17E] focus:ring-1 focus:ring-[#FFE17E] focus:bg-[#FFE17E]/30"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Surname
                </label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#FFE17E] focus:ring-1 focus:ring-[#FFE17E] focus:bg-[#FFE17E]/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                BOD
              </label>
              <input
                type="date"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#FFE17E] focus:ring-1 focus:ring-[#FFE17E] focus:bg-[#FFE17E]/30"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Phone number
                </label>
                <input
                  type="tel"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#FFE17E] focus:ring-1 focus:ring-[#FFE17E] focus:bg-[#FFE17E]/30"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#FFE17E] focus:ring-1 focus:ring-[#FFE17E] focus:bg-[#FFE17E]/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#FFE17E] focus:ring-1 focus:ring-[#FFE17E] focus:bg-[#FFE17E]/30"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-[#FFE17E] px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-yellow-400"
            >
              Create account
            </button>
          </form>
        ) : (
          // LOGIN FORM
          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Username / Email
              </label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#FFE17E] focus:ring-1 focus:ring-[#FFE17E] focus:bg-[#FFE17E]/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm  text-gray-500 outline-none focus:border-[#FFE17E] focus:ring-1 focus:ring-[#FFE17E] focus:bg-[#FFE17E]/30"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-[#FFE17E] px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-800"
            >
              Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState(1);          // which Part is active
  const [showAuthModal, setShowAuthModal] = useState(false); // whether popup is visible
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup"); // current auth tab

  return (
    <main className="relative flex min-h-screen bg-[#EEE3D2]">
      {/* Sidebar on the left */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAuthClick={() => {
          setAuthMode("signup");      // open with Sign up tab active
          setShowAuthModal(true);     // show popup
       }}
      />
      {/* Right side: content area */}
      {/* relative is IMPORTANT so the modal overlay stays inside this area only */}
      <section className="relative flex-1 p-8">
        <TabContent tab={activeTab} />

        {/* Conditionally render modal */}
        {showAuthModal && (
          <AuthModal
            mode={authMode}
            onModeChange={setAuthMode}
            onClose={() => setShowAuthModal(false)}
          />
        )}
      </section>
    </main>
  );
}