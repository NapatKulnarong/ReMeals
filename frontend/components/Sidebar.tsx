"use client";

import Image from "next/image";
import { ReactNode } from "react";
import { Squares2X2Icon, TruckIcon, CubeIcon, Cog6ToothIcon } from "@heroicons/react/24/solid";
import { InboxStackIcon } from "@heroicons/react/24/solid";

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
  onSettingsClick?: () => void;       // callback for settings button
  currentUser?: { username: string; email: string };
  tabs: SidebarTab[];
  isAdmin?: boolean;
  isDriver?: boolean;
};

const renderSidebarIcon = (id: number, className?: string) => {
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
    return <Squares2X2Icon className={className} />;
  }
  if (id === 4) {
    // Pickup icon - TruckIcon from Heroicons
    return <TruckIcon className={className} />;
  }
  if (id === 5) {
    // Warehouse icon - InboxStackIcon from Heroicons
    return <InboxStackIcon className={className} />;
  }
  if (id === 6) {
    // Deliver icon - CubeIcon from Heroicons
    return <CubeIcon className={className} />;
  }
  if (id === 7) {
    // Status icon - ChartBarIcon from Heroicons
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
};

export default function Sidebar({
  activeTab,
  onTabChange,
  onAuthClick,
  onLogout,
  onProfileClick,
  onSettingsClick,
  currentUser,
  tabs,
  isAdmin = false,
  isDriver = false,
}: SidebarProps) {
  const homeTab = tabs.find(tab => tab.id === 0);
  const primaryTabs = tabs.filter(tab => tab.id === 1 || tab.id === 2);
  const secondaryTabs = tabs.filter(tab => tab.id > 2);

  return (
    // Sidebar container: flex-col + justify-between lets us push the auth button to the bottom
    <aside
        className="
            sticky top-0            /* lock sidebar position */
            z-10
            flex h-screen w-64 flex-col justify-between
            bg-[#D48B68]
            px-4 pb-6
            shadow-2xl shadow-black/15
            border border-[#B86A49]
            "
    >
      <div>
      {/* LOGO + WEBSITE NAME SECTION */}
      <div className="mb-6 -mx-4 -mr-[17px]">
        <div className="flex items-center gap-1 bg-white/85 px-4 py-3">
          <div className="flex h-16 w-16 items-center justify-center">
            <Image
              src="/elements/logo_re-meals_2.png"
              alt="Re-Meals logo"
              width={48}
              height={48}
              priority
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[26px] font-semibold text-[#d48a68]">Re-Meals</span>
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
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTabChange(homeTab.id);
            }}
            className={[
              "flex items-center justify-between rounded-2xl border px-4 py-4 text-left text-base font-semibold shadow-sm transition duration-200",
              activeTab === homeTab.id
                ? "border-[#B86A49] bg-[#F1CBB5] text-[#4B2415] shadow-md"
                : "border-[#E6B9A2] bg-white text-[#70402B] hover:border-[#B86A49] hover:shadow",
            ].join(" ")}
          >
            <span>{homeTab.label}</span>
            <span
              aria-hidden
              className={[
                "flex h-10 w-10 items-center justify-center rounded-full transition",
                activeTab === homeTab.id
                  ? "bg-white text-[#B86A49]"
                  : "bg-[#F3D6C3] text-[#9A5335]",
              ].join(" ")}
            >
              {renderSidebarIcon(homeTab.id, "h-5 w-5")}
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
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTabChange(tab.id);
                }}
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
                    {renderSidebarIcon(tab.id, "h-5 w-5")}
                  </span>
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
          </div>
        )}

        {secondaryTabs.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {secondaryTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const palette = {
                activeBg: "bg-[#E9B79C]",
                activeBorder: "border-[#B86A49]",
                activeText: "text-[#3F1C10]",
                inactiveBorder: "border-[#E6B9A2]",
                inactiveText: "text-[#70402B]",
                iconActive: "bg-white text-[#B86A49]",
                iconInactive: "bg-[#F3D6C3] text-[#9A5335]",
              };

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onTabChange(tab.id);
                  }}
                  className={[
                    "aspect-square w-full rounded-2xl border text-sm font-semibold shadow-sm transition duration-200",
                    isActive
                      ? `${palette.activeBorder} ${palette.activeBg} ${palette.activeText} shadow-md`
                      : `${palette.inactiveBorder} bg-white ${palette.inactiveText} hover:border-[#B86A49] hover:shadow`,
                  ].join(" ")}
                >
                  <div className="flex h-full flex-col items-center justify-center gap-2">
                    <span
                      className={[
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        isActive ? palette.iconActive : palette.iconInactive,
                      ].join(" ")}
                    aria-hidden
                  >
                    {renderSidebarIcon(tab.id, "h-5 w-5")}
                    </span>
                    <span className="text-base">{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </nav>
      </div>

      {/* Account notice - only shown when not logged in, above the white line */}
      {!currentUser && (
        <div className="mt-auto mb-0 pt-8 px-1.5">
          <div className="flex flex-col items-start gap-3">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.0} stroke="white" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-relaxed text-left">
                Please sign up or log in to use all features on this website.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom section: Sign up / Login button */}
      <div className="mt-6 border-t border-gray-300 pt-4">
        {currentUser ? (
          <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#B86A49] bg-[#F2D6C3] pl-4 pr-3 py-3 text-sm font-semibold text-[#4B2415] transition hover:border-[#9F583C] hover:text-[#3A1A0F]">
            <span className="flex-1 text-left">
              {currentUser.username}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSettingsClick?.();
              }}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#B86A49] transition hover:bg-gray-100"
              type="button"
              aria-label="Settings"
            >
              <Cog6ToothIcon className="h-6 w-6" />
            </button>
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
