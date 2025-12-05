"use client";

import Image from "next/image";
import { ReactNode } from "react";

// This marks the component as a Client Component (required because we use state + event handlers)

// Props definition: Sidebar receives the active tab number and a function to change tabs
type SidebarTab = {
  id: number;
  label: string;
  icon?: ReactNode;
};

type SidebarProps = {
  activeTab: number;                  // Which tab is currently selected
  onTabChange: (tab: number) => void; // Function to update the selected tab
  onAuthClick: () => void;            // callback for auth button
  onLogout?: () => void;
  onProfileClick?: () => void;
  currentUser?: { username: string; email: string };
  tabs: SidebarTab[];
  isAdmin?: boolean;
};

export default function Sidebar({
  activeTab,
  onTabChange,
  onAuthClick,
  onLogout,
  onProfileClick,
  currentUser,
  tabs,
  isAdmin = false,
}: SidebarProps) {
  const primaryTabs = tabs.slice(0, 2);
  const secondaryTabs = tabs.slice(2);

  return (
    // Sidebar container: flex-col + justify-between lets us push the auth button to the bottom
    <aside
        className="
            sticky top-0            /* lock sidebar position */
            z-10
            flex h-screen w-64 flex-col justify-between
            bg-[#F9F6F3]
            px-4 py-6
            shadow-2xl shadow-black/15 
            border border-black/5    
            "
    >
      <div>
      {/* LOGO + WEBSITE NAME SECTION */}
      <div className="mb-6 px-0.5 pt-2">
        <div className="flex items-center gap-2 rounded-2xl bg-white px-2 py-2">
          <div className="flex h-16 w-16 items-center justify-center">
            <Image
              src="/elements/logo_re-meals.png"
              alt="Re-Meals logo"
              width={48}
              height={48}
              priority
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[25px] font-semibold text-[#111828]">Re-Meals</span>
            {isAdmin && (
              <span className="text-xs font-semibold uppercase tracking-wide text-[#C46A24]">
                Admin
              </span>
            )}
          </div>
        </div>
      </div>


      {/* NAVIGATION BUTTONS */}
      <nav className="flex flex-col gap-4 mt-2">
        <div className="grid grid-cols-2 gap-3">
          {primaryTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const palette =
              tab.id === 1
                ? {
                    activeBg: "bg-[#E9F7EF]",
                    activeBorder: "border-[#A7D6B6]",
                    activeText: "text-[#1F4D36]",
                    inactiveBorder: "border-[#DCE9E1]",
                    inactiveText: "text-[#2F4F3A]",
                    iconActive: "bg-white text-[#1F4D36]",
                    iconInactive: "bg-[#F0F7F2] text-[#3C6E52]",
                    hoverBorder: "hover:border-[#A7D6B6]",
                  }
                : {
                    activeBg: "bg-[#FFF3E6]",
                    activeBorder: "border-[#F3C7A0]",
                    activeText: "text-[#8B4C1F]",
                    inactiveBorder: "border-[#F2E3D6]",
                    inactiveText: "text-[#6B4A2A]",
                    iconActive: "bg-white text-[#C4641A]",
                    iconInactive: "bg-[#FFF5EC] text-[#C4641A]",
                    hoverBorder: "hover:border-[#F3C7A0]",
                  };
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={[
                  "aspect-square w-full rounded-2xl border text-sm font-semibold shadow-sm transition duration-200",
                  isActive
                    ? `${palette.activeBorder} ${palette.activeBg} ${palette.activeText} shadow-md`
                    : `${palette.inactiveBorder} bg-white ${palette.inactiveText} ${palette.hoverBorder} hover:shadow`,
                ].join(" ")}
              >
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <span
                    className={[
                      "flex h-10 w-10 items-center justify-center rounded-full text-lg transition",
                      isActive ? palette.iconActive : palette.iconInactive,
                    ].join(" ")}
                  >
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-1">
          {secondaryTabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={[
                  "flex items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-[#F9DE84] text-gray-900"
                    : "text-gray-700 hover:bg-[#F9DE84]/50 hover:text-gray-900",
                ].join(" ")}
              >
                <span>{tab.label}</span>
                {tab.icon ? (
                  <span className="text-lg" aria-hidden>
                    {tab.icon}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>
      </div>

      {/* Bottom section: Sign up / Login button */}
      <div className="mt-6 border-t border-gray-300 pt-4">
        {currentUser ? (
          <div className="space-y-2">
            <button
              onClick={onProfileClick}
              className="w-full rounded-xl bg-gray-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              {currentUser.username}
            </button>
            <div className="flex justify-between text-xs text-gray-600">
              <span className="truncate">{currentUser.email}</span>
              <button
                onClick={onLogout}
                className="font-semibold text-[#C46A24] hover:underline"
                type="button"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <button
              onClick={onAuthClick}
              className="w-full rounded-xl bg-gray-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-gray-800"
          >
              Sign up / Login
          </button>
        )}

      </div>

    </aside>
  );
}
