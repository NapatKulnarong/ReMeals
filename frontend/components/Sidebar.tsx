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
  isDriver?: boolean;
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
  isDriver = false,
}: SidebarProps) {
  const homeTab = tabs.find(tab => tab.id === 0);
  const primaryTabs = tabs.filter(tab => tab.id === 1 || tab.id === 2);
  const secondaryTabs = tabs.filter(tab => tab.id > 2);

  const Icon = ({ id, className }: { id: number; className?: string }) => {
    if (id === 0) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M3 10.25 12 3l9 7.25V21a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75v-4.5h-4.5V21A.75.75 0 0 1 9 21.75H3.75A.75.75 0 0 1 3 21Z" />
        </svg>
      );
    }
    if (id === 1) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 21s-6.5-4.4-9-9a5.25 5.25 0 0 1 9-5 5.25 5.25 0 0 1 9 5c-2.5 4.6-9 9-9 9Z" />
        </svg>
      );
    }
    if (id === 2) {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <path d="M7 6h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4.4l-2.6 2.6a.75.75 0 0 1-1.28-.53V16H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
          <path d="M10.25 10.25h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1 0-1.5Z" />
          <path d="M10.25 12.75h2a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5Z" />
        </svg>
      );
    }
    if (id === 3) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="m14.97 4.97 4.06 4.06a3.5 3.5 0 0 1-3.9 5.7l-1.47 1.47a2 2 0 0 1-2.83 0l-.56-.56-3.09 3.1a1 1 0 0 1-1.42 0l-1.53-1.54a1 1 0 0 1 0-1.41l3.1-3.09-.57-.57a2 2 0 0 1 0-2.83l1.47-1.47a3.5 3.5 0 0 1 5.7-3.92Z" />
        </svg>
      );
    }
    if (id === 4) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M2.25 5.25A.75.75 0 0 1 3 4.5h10.5a.75.75 0 0 1 .75.75v4.5h2.42a.75.75 0 0 1 .59.28l2.09 2.54a.75.75 0 0 1 .18.48v3.95H19.5a2 2 0 1 1-4 0h-5a2 2 0 1 1-4 0H2.25Zm13.5 6v2.5h3v-1.4l-1.15-1.1Z" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <circle cx="12" cy="12" r="4" />
      </svg>
    );
  };

  return (
    // Sidebar container: flex-col + justify-between lets us push the auth button to the bottom
    <aside
        className="
            sticky top-0            /* lock sidebar position */
            z-10
            flex h-screen w-64 flex-col justify-between
            bg-[#D48B68]
            px-4 py-6
            shadow-2xl shadow-black/15
            border border-[#B86A49]
            "
    >
      <div>
      {/* LOGO + WEBSITE NAME SECTION */}
      <div className="mb-6 px-0.5 pt-2">
        <div className="flex items-center gap-1 rounded-2xl bg-white px-2 py-2">
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
                For admin
              </span>
            )}
            {isDriver && !isAdmin && (
              <span className="text-xs font-semibold uppercase tracking-wide text-[#2F855A]">
                for Driver
              </span>
            )}
          </div>
        </div>
      </div>


      {/* NAVIGATION BUTTONS */}
      <nav className="flex flex-col gap-4 mt-2">
        {/* Home Button */}
        {homeTab && (
          <button
            onClick={() => onTabChange(homeTab.id)}
            className={[
              "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold shadow-sm transition duration-200",
              activeTab === homeTab.id
                ? "border-[#B86A49] bg-[#F1CBB5] text-[#4B2415] shadow-md"
                : "border-[#E6B9A2] bg-white text-[#70402B] hover:border-[#B86A49] hover:shadow",
            ].join(" ")}
          >
            <span>{homeTab.label}</span>
            <span aria-hidden className="h-5 w-5 text-[#B86A49]">
              <Icon id={homeTab.id} className="h-5 w-5" />
            </span>
          </button>
        )}

        {primaryTabs.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {primaryTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const palette =
              tab.id === 1
                ? {
                    activeBg: "bg-[#F1CBB5]",
                    activeBorder: "border-[#B86A49]",
                    activeText: "text-[#4B2415]",
                    inactiveBorder: "border-[#E6B9A2]",
                    inactiveText: "text-[#70402B]",
                    iconActive: "bg-white text-[#B86A49]",
                    iconInactive: "bg-[#F3D6C3] text-[#9A5335]",
                    hoverBorder: "hover:border-[#B86A49]",
                  }
                : {
                    activeBg: "bg-[#E9B79C]",
                    activeBorder: "border-[#B86A49]",
                    activeText: "text-[#4B2415]",
                    inactiveBorder: "border-[#E6B9A2]",
                    inactiveText: "text-[#70402B]",
                    iconActive: "bg-white text-[#A95B3C]",
                    iconInactive: "bg-[#F3D6C3] text-[#9A5335]",
                    hoverBorder: "hover:border-[#B86A49]",
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
                      "flex h-10 w-10 items-center justify-center rounded-full transition",
                      isActive ? palette.iconActive : palette.iconInactive,
                    ].join(" ")}
                    aria-hidden
                  >
                    <Icon id={tab.id} className="h-5 w-5" />
                  </span>
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
          </div>
        )}

        {secondaryTabs.length > 0 && (
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
                    ? "bg-[#E9B79C] text-[#3F1C10]"
                    : "text-[#70402B] hover:bg-[#F1CBB5] hover:text-[#3F1C10]",
                ].join(" ")}
              >
                <span>{tab.label}</span>
                <span aria-hidden className="h-5 w-5 text-[#B86A49]">
                  <Icon id={tab.id} className="h-5 w-5" />
                </span>
              </button>
            );
          })}
          </div>
        )}
      </nav>
      </div>

      {/* Bottom section: Sign up / Login button */}
      <div className="mt-6 border-t border-gray-300 pt-4">
        {currentUser ? (
          <div className="space-y-2">
            <button
              onClick={onProfileClick}
              className="w-full rounded-xl border border-[#B86A49] bg-[#F2D6C3] px-4 py-3 text-center text-sm font-semibold text-[#4B2415] transition hover:border-[#9F583C] hover:text-[#3A1A0F]"
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
              className="w-full rounded-xl border border-[#B86A49] bg-[#F2D6C3] px-4 py-3 text-center text-sm font-semibold text-[#4B2415] transition hover:border-[#9F583C] hover:text-[#3A1A0F]"
          >
              Sign up / Login
          </button>
        )}

      </div>

    </aside>
  );
}
