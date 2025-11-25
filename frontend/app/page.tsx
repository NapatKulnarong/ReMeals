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
function AuthModal({ onClose }: { onClose: () => void }) {
  return (
    // absolute + inset-0 inside a relative parent (the content section)
    // -> overlay only covers the content area, NOT the sidebar
    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        {/* Header row */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Sign up / Login</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
            aria-label="Close authentication dialog"
          >
            ✕
          </button>
        </div>

        {/* Placeholder content for now */}
        <p className="mb-4 text-sm text-gray-600">
          This is where your sign-up / login form will go. For now, it's just a
          placeholder popup.
        </p>

        <div className="flex gap-3">
          <button className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            Sign up
          </button>
          <button className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100">
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState(1);          // which Part is active
  const [showAuthModal, setShowAuthModal] = useState(false); // whether popup is visible

  return (
    <main className="relative flex min-h-screen bg-[#EEE3D2]">
      {/* Sidebar on the left */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAuthClick={() => setShowAuthModal(true)} // open popup when clicked
      />

      {/* Right side: content area */}
      {/* relative is IMPORTANT so the modal overlay stays inside this area only */}
      <section className="relative flex-1 p-8">
        <TabContent tab={activeTab} />

        {/* Conditionally render modal */}
        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} />
        )}
      </section>
    </main>
  );
}