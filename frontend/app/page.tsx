"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

type AuthMode = "signup" | "login";

type SignupCredentials = {
  username: string;
  fname: string;
  lname: string;
  bod: string;
  phone: string;
  email: string;
  password: string;
};

type LoginCredentials = {
  identifier: string;
  password: string;
};

type FormStatus = {
  loading: boolean;
  message?: string;
  error?: string;
};

type LoggedUser = {
  username: string;
  email: string;
  userId: string;
  isAdmin: boolean;
  isDeliveryStaff: boolean;
  fname?: string;
  lname?: string;
  phone?: string;
};

type Restaurant = {
  restaurant_id: string;
  name: string;
  branch_name: string;
  address: string;
  is_chain: boolean;
};

type FoodItemForm = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  expiredDate: string;
};

type DonationRecord = {
  id: string;
  restaurantId?: string;
  restaurantName: string;
  restaurantAddress: string;
  branch?: string;
  note: string;
  items: FoodItemForm[];
  createdAt: string;
};

type DonationFormState = {
  restaurantId: string;
  restaurantName: string;
  restaurantAddress: string;
  branch: string;
  note: string;
  items: FoodItemForm[];
};

type Notification = {
  message?: string;
  error?: string;
};

type RestaurantSuggestion = {
  name: string;
  description: string;
  keywords: string[];
};

type RestaurantSearchOption = {
  kind: "restaurant";
  key: string;
  label: string;
  description?: string;
  restaurant: Restaurant;
};

type PopularSearchOption = {
  kind: "popular";
  key: string;
  label: string;
  description?: string;
};

type SearchSuggestionOption = RestaurantSearchOption | PopularSearchOption;

type NavItem = {
  id: number;
  label: string;
  icon?: ReactNode;
};

type DonationRequestForm = {
  requestTitle: string;
  communityName: string;
  numberOfPeople: string;
  expectedDelivery: string;
  recipientAddress: string;
  contactPhone: string;
  notes: string;
};

type DonationRequestRecord = DonationRequestForm & {
  id: string;
  createdAt: string;
};

type DonationApiRecord = {
  donation_id: string;
  donated_at: string;
  status: "pending" | "accepted" | "declined";
  restaurant: string;
  restaurant_name?: string;
  restaurant_branch?: string;
  restaurant_address?: string;
};

type FoodItemApiRecord = {
  food_id: string;
  name: string;
  quantity: number;
  unit: string;
  expire_date: string;
  is_expired?: boolean;
  is_claimed?: boolean;
  is_distributed?: boolean;
  donation?: string;
};

type DonationRequestApiRecord = {
  request_id: string;
  title: string;
  community_name: string;
  recipient_address: string;
  expected_delivery: string;
  people_count: number;
  contact_phone: string;
  notes: string;
  created_at: string;
};

type Warehouse = {
  warehouse_id: string;
  address: string;
  capacity: number;
  stored_date: string;
  exp_date: string;
};

type Community = {
  community_id: string;
  name: string;
  address: string;
  received_time: string;
  population: number;
  warehouse_id: string;
};

type DeliveryStaffInfo = {
  user_id: string;
  username: string;
  name: string;
  email: string;
  assigned_area: string;
  is_available: boolean;
};

type DeliveryRecordApi = {
  delivery_id: string;
  delivery_type: "donation" | "distribution";
  pickup_time: string;
  dropoff_time: string;
  pickup_location_type: "restaurant" | "warehouse";
  dropoff_location_type: "warehouse" | "community";
  warehouse_id: string;
  user_id: string;
  donation_id: string;
  community_id: string;
  status: "pending" | "in_transit" | "delivered" | "cancelled";
  notes?: string;
};

const POPULAR_RESTAURANT_SUGGESTIONS: RestaurantSuggestion[] = [
  {
    name: "KFC Thailand",
    description: "Fried chicken & rice bowls · 400+ branches",
    keywords: ["KFC franchise list", "KFC Thailand donation"],
  },
  {
    name: "McDonald's Thailand",
    description: "Drive-thru & delivery heavy locations",
    keywords: ["McDonald's Thailand stores", "McThai branches"],
  },
  {
    name: "MK Restaurants",
    description: "Sukiyaki restaurants inside major malls",
    keywords: ["MK Restaurants Thailand", "MK branch directory"],
  },
  {
    name: "Chester's Grill",
    description: "Thai fast-food brand in transit hubs",
    keywords: ["Chester's Grill Thailand", "Chester's donation"],
  },
  {
    name: "After You Dessert Café",
    description: "Dessert cafe chain with limited storage window",
    keywords: ["After You cafe list", "After You donation program"],
  },
];

const formatRestaurantLabel = (restaurant: Restaurant) =>
  `${restaurant.name}${restaurant.branch_name ? ` (${restaurant.branch_name})` : ""}`.trim();

const createFoodItemId = () => {
  const suffix = Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, "0");
  return `FOO${suffix}`;
};

const createEmptyFoodItem = (): FoodItemForm => ({
  id: createFoodItemId(),
  name: "",
  quantity: "1",
  unit: "portion",
  expiredDate: "",
});

const createDonationFormState = (): DonationFormState => ({
  restaurantId: "",
  restaurantName: "",
  restaurantAddress: "",
  branch: "",
  note: "",
  items: [createEmptyFoodItem()],
});

const generateDeliveryId = () => {
  const suffix = Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, "0");
  return `DLV${suffix}`;
};

const createDonationRequestForm = (): DonationRequestForm => ({
  requestTitle: "",
  communityName: "",
  numberOfPeople: "10",
  expectedDelivery: "",
  recipientAddress: "",
  contactPhone: "",
  notes: "",
});

const API_PATHS = {
  deliveries: "/delivery/deliveries/",
  warehouses: "/warehouse/warehouses/",
  communities: "/community/communities/",
  donations: "/donations/",
  restaurants: "/restaurants/",
  deliveryStaff: "/users/delivery-staff/",
  donationRequests: "/donation-requests/",
};

// Helper function to format API errors into user-friendly messages
const formatErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "Unable to save donation. Please try again.";
  }

  const message = error.message;

  // Check for specific validation errors
  if (message.includes("expire_date") && message.includes("wrong format")) {
    return "Please enter expiry dates in the correct format (YYYY-MM-DD). Example: 2024-12-25";
  }

  if (message.includes("is_expired") && message.includes("boolean")) {
    return "There was an issue with the expiry date validation. Please check your dates and try again.";
  }

  if (message.includes("quantity") || message.includes("must be greater than")) {
    return "Please ensure all quantities are valid numbers greater than zero.";
  }

  if (message.includes("restaurant") && message.includes("required")) {
    return "Please select or enter a restaurant name.";
  }

  // Return the original message if no specific pattern matches
  return message || "Unable to save donation. Please try again.";
};

const getCurrentTimestamp = () => new Date().toISOString();

const buildAuthHeaders = (user?: LoggedUser | null): Record<string, string> => {
  if (!user) {
    return {};
  }
  return {
    "X-USER-ID": user.userId,
    "X-USER-IS-ADMIN": String(user.isAdmin),
    "X-USER-IS-DELIVERY": String(user.isDeliveryStaff),
  };
};

const formatDisplayDate = (value: string) => {
  if (!value) {
    return "Not set";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const toDateTimeLocalValue = (value: string) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const tzOffset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - tzOffset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const INPUT_STYLES = `
  w-full rounded-lg border border-[#E4DCCD] bg-white px-3 py-2 text-sm
  text-gray-800 outline-none transition focus:border-[#E3B261] focus:ring-2
  focus:ring-[#E3B261]/40
`.replace(/\s+/g, " ");

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status} ${response.statusText})`;
    try {
      const data = await response.json();
      message =
        (typeof data === "string" && data) ||
        data?.detail ||
        data?.error ||
        JSON.stringify(data) ||
        message;
    } catch {
      // ignore json parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// Home Page Component
function HomePage({
  setShowAuthModal,
  setAuthMode
}: {
  setShowAuthModal: (show: boolean) => void;
  setAuthMode: (mode: AuthMode) => void;
}) {
  const stats = [
    { label: "Meals rescued", value: "2,340", helper: "+128 today" },
    { label: "Communities served", value: "48", helper: "active deliveries" },
    { label: "Avg. pickup", value: "22 mins", helper: "from restaurant ping" },
    { label: "Food saved", value: "3.8 tons", helper: "kept out of landfills" },
  ];

  const journey = [
    {
      step: "1",
      title: "Share what you have or need",
      copy:
        "Restaurants log surplus portions; communities outline what will feed their neighbors best.",
      accent: "bg-[#EAF1EA] text-[#1F4D36]",
    },
    {
      step: "2",
      title: "We match and schedule",
      copy:
        "Re-Meals pairs donations with nearby requests and coordinates pickup windows that protect freshness.",
      accent: "bg-[#EAF1EA] text-[#1F4D36]",
    },
    {
      step: "3",
      title: "Deliver with care",
      copy:
        "Delivery staff move meals to warehouses or directly to communities with cold-chain friendly steps.",
      accent: "bg-[#EAF1EA] text-[#1F4D36]",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-8xl space-y-8">
      <div className="relative overflow-hidden rounded-[40px] bg-[#e8ede3] p-8 shadow-[0_40px_120px_-45px rgba(59,31,16,0.6)] sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-8 top-6 hidden h-64 w-64 rounded-[40px] bg-[#DEF7EA]/60 blur-3xl lg:block" />
        <div aria-hidden className="pointer-events-none absolute bottom-8 left-4 h-24 w-24 rounded-full bg-[#F1FBF5]/70 blur-2xl" />
        <div className="relative grid items-start gap-10 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-6 text-[#2C1A10]">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#708A58] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-md">
              <span aria-hidden className="text-lg">✦</span>
              <span>Re-purpose every meal</span>
            </div>
            <h1 className="text-[2.65rem] leading-tight text-[#3a3a3a] sm:text-[3.25rem] sm:leading-[1.1]">
              Redirect surplus meals. <span className="text-[#d48a68]">Rebuild communities.</span>
            </h1>
            <p className="max-w-2xl text-lg text-[#5a4f45]">
              Re-Meals links restaurants, drivers, and community leaders so good food never sits idle.
              Share donations, request support, and move meals where they are needed most.
            </p>
            
          </div>
          <div className="relative rounded-[32px] border-2 border-dashed border-[#708958] bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#708A58]">
                  Impact snapshot
                </p>
                <h3 className="text-2xl font-bold text-[#3a3a3a]">This week on Re-Meals</h3>
              </div>
              <div className="rounded-full bg-[#D25D5D] px-3 py-1 text-sm font-semibold text-white">
                Live
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border-2 border-[#d48a68] bg-[#fdf8f4] px-4 py-3 shadow-sm hover:bg-[#d48a68] hover:text-white transition-all group"
                >
                  <p className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-[#7E6A57] group-hover:text-white">
                    {item.label}
                  </p>
                  <p className="text-2xl font-bold text-[#3a3a3a] group-hover:text-white">{item.value}</p>
                  <p className="text-xs font-semibold text-[#708A58] group-hover:text-white">{item.helper}</p>
                </div>
              ))}
            </div>
            
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <div className="rounded-[32px] bg-[#fde5d6] p-7 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#d48a68]">
                For restaurants
              </p>
              <h2 className="text-3xl font-semibold text-black/70">Donate surplus easily</h2>
            </div>
            <span className="-mt-4 rounded-full border-2 border-dashed border-[#d48a68] bg-white px-3 py-2 text-sm font-semibold text-[#d48a68]">
              Reduce waste
            </span>
          </div>
          <p className="mt-3 text-black/70 mb-5">
            Log extra meals with quantities, expiry, and packaging notes so our delivery team can pick up while everything stays fresh.
          </p>
          <div className="grid grid-cols-2 gap-3 flex-1">
            <div className="flex items-start gap-4 rounded-2xl border-2 border-dashed border-[#d48a68] bg-white p-4 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group">
              <span className="text-3xl flex-shrink-0 transition-transform group-hover:scale-125 group-active:scale-110" aria-hidden>
                💚
              </span>
              <div>
                <p className="text-sm font-semibold text-black/70">Smart item logging</p>
                <p className="text-sm text-black/70">
                  Capture portions, units, and expiry in seconds so we know what to rescue first.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border-2 border-dashed border-[#d48a68] bg-white p-4 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group">
              <span className="text-3xl flex-shrink-0 transition-transform group-hover:scale-125 group-active:scale-110" aria-hidden>
                🧭
              </span>
              <div>
                <p className="text-sm font-semibold text-black/70">Route-friendly pickups</p>
                <p className="text-sm text-black/70">
                  Drivers see your window and plan efficient routes to minimize food time in transit.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border-2 border-dashed border-[#d48a68] bg-white p-4 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group">
              <span className="text-3xl flex-shrink-0 transition-transform group-hover:scale-125 group-active:scale-110" aria-hidden>
                📦
              </span>
              <div>
                <p className="text-sm font-semibold text-black/70">Packaging guidance</p>
                <p className="text-sm text-black/70">
                  Tips for sealing, labeling, and keeping items cool before pickup arrives.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border-2 border-dashed border-[#d48a68] bg-white p-4 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group">
              <span className="text-3xl flex-shrink-0 transition-transform group-hover:scale-125 group-active:scale-110" aria-hidden>
                🎧
              </span>
              <div>
                <p className="text-sm font-semibold text-black/70">Concierge support</p>
                <p className="text-sm text-black/70">
                  Need help? Tag the admin team and we&apos;ll follow up before your shift ends.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] bg-[#fde5d6] p-7 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#d48a68]">
                For communities
              </p>
              <h2 className="text-3xl font-semibold text-black/70">Request food support</h2>
            </div>
            <span className="-mt-4 rounded-full border-2 border-dashed border-[#d48a68] bg-white px-3 py-2 text-sm font-semibold text-[#d48a68]">
              Right-sized aid
            </span>
          </div>
          <p className="mt-3 text-black/70 mb-5">
            Share what your neighbors need, when, and where. We align donations to your delivery window and capacity.
          </p>
          <div className="space-y-3 flex-1">
            <div className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-[#d48a68] bg-white p-4 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group">
              <span className="text-3xl flex-shrink-0 transition-transform group-hover:scale-125 group-active:scale-110" aria-hidden>
                🍽️
              </span>
              <div>
                <p className="text-sm font-semibold text-black/70">Structured needs list</p>
                <p className="text-sm text-black/70">
                  Outline items, quantities, and urgency so matching stays accurate.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-[#d48a68] bg-white p-4 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group">
              <span className="text-3xl flex-shrink-0 transition-transform group-hover:scale-125 group-active:scale-110" aria-hidden>
                🏠
              </span>
              <div>
                <p className="text-sm font-semibold text-black/70">Clear drop-off details</p>
                <p className="text-sm text-black/70">
                  Provide addresses, access notes, and an ideal delivery time for smooth arrivals.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-[#d48a68] bg-white p-4 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group">
              <span className="text-3xl flex-shrink-0 transition-transform group-hover:scale-125 group-active:scale-110" aria-hidden>
                📱
              </span>
              <div>
                <p className="text-sm font-semibold text-black/70">Stay updated</p>
                <p className="text-sm text-black/70">
                  Track confirmations from our team and know when a delivery is on the way.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[40px] bg-[#fde5d6] p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d48a68]">
              How Re-Meals works
            </p>
            <h2 className="text-3xl font-semibold text-black/70">Three guided steps</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border-2 border-dashed border-[#d48a68] bg-white px-4 py-2 text-xs font-semibold text-black/70">
            <span className="text-lg" aria-hidden>
              🧭
            </span>
            <span>We handle the routing</span>
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {journey.map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border-2 border-dashed border-[#d48a68] bg-white p-5 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]"
            >
              <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${item.accent}`}>
                <span>Step {item.step}</span>
              </div>
              <h3 className="text-lg font-semibold text-black/70">{item.title}</h3>
              <p className="mt-2 text-sm text-black/70">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[40px] bg-[#e8ede3] px-12 py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold text-[#3a3a3a]">
              Ready to make a difference?
            </h2>
            <p className="text-base text-[#5a4f45]">
              Join our community and help redirect surplus meals to those who need them most.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setAuthMode("signup");
                setShowAuthModal(true);
              }}
              className="group flex items-center justify-between rounded-2xl bg-white px-6 py-4 text-left text-base font-semibold text-[#70402B] shadow-sm transition-all duration-200 hover:border-[#B86A49] hover:bg-[#F1CBB5] hover:text-[#4B2415] hover:shadow-md active:border-[#B86A49] active:bg-[#F1CBB5] active:text-[#4B2415] active:shadow-md"
            >
              <span>Sign up</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3D6C3] text-[#9A5335] transition-all group-hover:bg-white group-hover:text-[#B86A49] group-active:bg-white group-active:text-[#B86A49]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                </svg>
              </span>
            </button>
            <p className="mt-1 text-sm text-[#5a4f45]">
              Already have an account?{" "}
              <button
                onClick={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                className="font-semibold text-[#d48a68] hover:underline"
              >
                Login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Content of each tab
function TabContent({
  tab,
  currentUser,
  setShowAuthModal,
  setAuthMode
}: {
  tab: number;
  currentUser: LoggedUser | null;
  setShowAuthModal: (show: boolean) => void;
  setAuthMode: (mode: AuthMode) => void;
}) {
  if (tab === 0) {
    return <HomePage setShowAuthModal={setShowAuthModal} setAuthMode={setAuthMode} />;
  }
  if (tab === 1) {
    return <DonationSection currentUser={currentUser} setShowAuthModal={setShowAuthModal} setAuthMode={setAuthMode} />;
  }
  if (tab === 2) {
    return <DonationRequestSection currentUser={currentUser} setShowAuthModal={setShowAuthModal} setAuthMode={setAuthMode} />;
  }
  if (tab === 3) {
    if (currentUser?.isAdmin) {
      return <AdminDashboard />;
    }
    return <AccessDenied message="Admin access required." />;
  }
  if (tab === 4) {
    if (currentUser?.isAdmin || currentUser?.isDeliveryStaff) {
      return <PickupToWarehouse currentUser={currentUser} />;
    }
    return <AccessDenied message="Delivery team access required." />;
  }
  if (tab === 6) {
    if (currentUser?.isAdmin || currentUser?.isDeliveryStaff) {
      return <DeliverToCommunity currentUser={currentUser} />;
    }
    return <AccessDenied message="Delivery team access required." />;
  }
  if (tab === 5) {
    if (currentUser?.isAdmin) {
      return <WarehouseManagement currentUser={currentUser} />;
    }
    return <AccessDenied message="Admin access required." />;
  }

  return (
    <div className="rounded-xl bg-[#FBFBFE] p-10 shadow text-center">
    </div>
  );
}

function DonationSection({
  currentUser,
  setShowAuthModal,
  setAuthMode
}: {
  currentUser: LoggedUser | null;
  setShowAuthModal: (show: boolean) => void;
  setAuthMode: (mode: AuthMode) => void;
}) {
  const [form, setForm] = useState<DonationFormState>(createDonationFormState());
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification>({});
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);
  const [restaurantLoadError, setRestaurantLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationsError, setDonationsError] = useState<string | null>(null);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const suggestionBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadRestaurants() {
      setRestaurantsLoading(true);
      setRestaurantLoadError(null);
      try {
        const data = await apiFetch<Restaurant[]>("/restaurants/");
        if (!ignore) {
          setRestaurants(data);
        }
      } catch (error) {
        if (!ignore) {
          setRestaurantLoadError(
            error instanceof Error ? error.message : "Unable to load restaurants"
          );
        }
      } finally {
        if (!ignore) {
          setRestaurantsLoading(false);
        }
      }
    }

    loadRestaurants();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadDonations() {
      setDonationsLoading(true);
      setDonationsError(null);
      try {
        const donationData = await apiFetch<DonationApiRecord[]>("/donations/");
        const donationsWithItems = await Promise.all(
          donationData.map(async (donation) => {
            const items = await apiFetch<FoodItemApiRecord[]>(
              `/fooditems/?donation=${donation.donation_id}`
            );
            return { donation, items };
          })
        );
        if (!ignore) {
          setDonations(
            donationsWithItems.map(({ donation, items }) => ({
              id: donation.donation_id,
              restaurantId: donation.restaurant,
              restaurantName: donation.restaurant_name ?? "",
              restaurantAddress: donation.restaurant_address ?? "",
              branch: donation.restaurant_branch ?? "",
              note: "",
              items: items.map((item) => ({
                id: item.food_id,
                name: item.name,
                quantity: item.quantity.toString(),
                unit: item.unit,
                expiredDate: item.expire_date,
              })),
              createdAt: donation.donated_at,
            }))
          );
        }
      } catch (error) {
        if (!ignore) {
          setDonationsError(
            error instanceof Error ? error.message : "Unable to load donations"
          );
        }
      } finally {
        if (!ignore) {
          setDonationsLoading(false);
        }
      }
    }

    loadDonations();
    return () => {
      ignore = true;
    };
  }, []);

  const selectedRestaurant = restaurants.find(
    (restaurant) => restaurant.restaurant_id === form.restaurantId
  );

  useEffect(() => {
    if (!restaurants.length || !donations.length) {
      return;
    }

    // Check if any donations need restaurant info
    const needsUpdate = donations.some(
      (d) => d.restaurantId && (!d.restaurantName || !d.restaurantName.trim())
    );

    if (!needsUpdate) {
      return;
    }

    setDonations((prev) =>
      prev.map((donation) => {
        if (!donation.restaurantId) {
          return donation;
        }
        // Only update if restaurant name is missing or empty
        if (donation.restaurantName && donation.restaurantName.trim()) {
          return donation;
        }
        const info = restaurants.find(
          (restaurant) => restaurant.restaurant_id === donation.restaurantId
        );
        if (!info) {
          return donation;
        }
        return {
          ...donation,
          restaurantName: info.name,
          branch: info.branch_name,
        };
      })
    );
  }, [restaurants, donations]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!suggestionBoxRef.current?.contains(event.target as Node)) {
        setIsSuggestionOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedRestaurantName = form.restaurantName.trim().toLowerCase();

  const visibleSuggestions = useMemo<SearchSuggestionOption[]>(() => {
    if (!normalizedRestaurantName) {
      return [];
    }

    const seen = new Set<string>();
    const suggestions: SearchSuggestionOption[] = [];

    restaurants.forEach((restaurant) => {
      const label = formatRestaurantLabel(restaurant);
      const descriptor = restaurant.address || restaurant.branch_name || "";
      const searchable = `${label} ${descriptor}`.toLowerCase();
      if (!searchable.includes(normalizedRestaurantName)) {
        return;
      }
      const uniqueKey = label.toLowerCase();
      if (seen.has(uniqueKey)) {
        return;
      }
      seen.add(uniqueKey);
      suggestions.push({
        kind: "restaurant",
        key: restaurant.restaurant_id,
        label,
        description: descriptor,
        restaurant,
      });
    });

    POPULAR_RESTAURANT_SUGGESTIONS.forEach((suggestion) => {
      const searchable = `${suggestion.name} ${suggestion.description} ${suggestion.keywords.join(
        " "
      )}`.toLowerCase();
      if (!searchable.includes(normalizedRestaurantName)) {
        return;
      }
      const uniqueKey = suggestion.name.toLowerCase();
      if (seen.has(uniqueKey)) {
        return;
      }
      seen.add(uniqueKey);
      suggestions.push({
        kind: "popular",
        key: `popular-${suggestion.name}`,
        label: suggestion.name,
        description: suggestion.description,
      });
    });

    return suggestions;
  }, [normalizedRestaurantName, restaurants]);

  const shouldShowSuggestions = isSuggestionOpen && visibleSuggestions.length > 0;

  const resetForm = () => {
    setForm(createDonationFormState());
    setEditingId(null);
    setNotification({});
  };

  const handleRestaurantNameChange = (name: string) => {
    const normalized = name.trim().toLowerCase();
    const matched = restaurants.find((restaurant) => {
      const label = formatRestaurantLabel(restaurant).toLowerCase();
      return label === normalized || restaurant.name.toLowerCase() === normalized;
    });

    setForm((prev) => ({
      ...prev,
      restaurantName: name,
      restaurantId: matched?.restaurant_id ?? "",
      branch: matched ? matched.branch_name ?? "" : prev.branch,
    }));
    setIsSuggestionOpen(name.trim().length > 0);
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestionOption) => {
    if (suggestion.kind === "restaurant") {
      setForm((prev) => ({
        ...prev,
        restaurantName: suggestion.label,
        restaurantId: suggestion.restaurant.restaurant_id,
        restaurantAddress: suggestion.restaurant.address,
        branch: suggestion.restaurant.branch_name,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        restaurantName: suggestion.label,
        restaurantId: "",
        restaurantAddress: "",
        branch: "",
      }));
    }
    setIsSuggestionOpen(false);
  };

  const handleItemChange = (
    index: number,
    field: keyof FoodItemForm,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleAddItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyFoodItem()],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setForm((prev) => {
      const nextItems = prev.items.filter((_, idx) => idx !== index);
      return {
        ...prev,
        items: nextItems.length ? nextItems : [createEmptyFoodItem()],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotification({});

    const trimmedRestaurantName = form.restaurantName.trim();
    const branchValue = form.branch.trim();
    const selectedLabel = selectedRestaurant ? formatRestaurantLabel(selectedRestaurant) : "";
    const nameMatchesSelected =
      Boolean(selectedRestaurant) &&
      (trimmedRestaurantName === selectedLabel ||
        trimmedRestaurantName === (selectedRestaurant?.name ?? ""));
    const branchMatchesSelected =
      Boolean(selectedRestaurant) &&
      branchValue === (selectedRestaurant?.branch_name ?? "");
    const manualEntry = !selectedRestaurant || !nameMatchesSelected || !branchMatchesSelected;

    if (manualEntry && !trimmedRestaurantName.length) {
      setNotification({
        error: "Enter the restaurant name or choose one from the suggestions.",
      });
      return;
    }

    const normalizedItems = form.items
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        unit: item.unit.trim(),
        quantity: item.quantity.trim(),
      }))
      .filter((item) => item.name);

    if (!normalizedItems.length) {
      setNotification({ error: "Please add at least one food item before saving the donation." });
      return;
    }

    for (const item of normalizedItems) {
      if (!item.name || !item.unit || !item.quantity) {
        setNotification({ error: "All food items must have a name, quantity, and unit." });
        return;
      }
      const quantityValue = Number(item.quantity);
      if (Number.isNaN(quantityValue) || quantityValue <= 0) {
        setNotification({ error: "All food item quantities must be valid numbers greater than zero." });
        return;
      }
      item.quantity = quantityValue.toString();
    }

    setIsSubmitting(true);

    try {
      const previousId = editingId;
      if (previousId) {
        await apiFetch(`/donations/${previousId}/`, { method: "DELETE" });
      }
      const donationPayload: Record<string, unknown> = {};
      if (!manualEntry && selectedRestaurant) {
        donationPayload.restaurant = selectedRestaurant.restaurant_id;
      } else {
        donationPayload.manual_restaurant_name = trimmedRestaurantName;
        donationPayload.manual_branch_name = branchValue;
        donationPayload.manual_restaurant_address = form.restaurantAddress.trim();
      }
      const createdDonation = await apiFetch<DonationApiRecord>("/donations/", {
        method: "POST",
        body: JSON.stringify(donationPayload),
      });
      const donationId = createdDonation.donation_id;

      await Promise.all(
        normalizedItems.map((item) =>
          apiFetch("/fooditems/", {
            method: "POST",
            body: JSON.stringify({
              food_id: item.id,
              name: item.name,
              quantity: Number(item.quantity),
              unit: item.unit,
              expire_date: item.expiredDate,
              is_expired:
                item.expiredDate &&
                new Date(item.expiredDate) < new Date() &&
                true,
              donation: donationId,
            }),
          })
        )
      );

      const timestamp = createdDonation.donated_at || getCurrentTimestamp();
      const resolvedRestaurantId = createdDonation.restaurant;
      const resolvedRestaurantName =
        createdDonation.restaurant_name ?? trimmedRestaurantName;
      const resolvedBranch = createdDonation.restaurant_branch ?? branchValue;
      const resolvedAddress =
        createdDonation.restaurant_address ?? form.restaurantAddress.trim();
      const existingRecord = previousId
        ? donations.find((donation) => donation.id === previousId)
        : null;

      const nextDonation: DonationRecord = {
        id: donationId,
        restaurantId: resolvedRestaurantId,
        restaurantName: resolvedRestaurantName,
        restaurantAddress: resolvedAddress,
        branch: resolvedBranch,
        note: form.note.trim(),
        items: normalizedItems,
        createdAt: existingRecord?.createdAt ?? timestamp,
      };

      if (manualEntry) {
        setRestaurants((prev) => {
          if (prev.some((r) => r.restaurant_id === resolvedRestaurantId)) {
            return prev;
          }
          return [
            ...prev,
            {
              restaurant_id: resolvedRestaurantId,
              name: resolvedRestaurantName,
              branch_name: resolvedBranch,
              address: resolvedAddress,
              is_chain: Boolean(resolvedBranch),
            },
          ];
        });
      }

      setDonations((prev) => {
        if (!previousId) {
          return [nextDonation, ...prev];
        }
        let replaced = false;
        const updated = prev.map((donation) => {
          if (donation.id === previousId) {
            replaced = true;
            return nextDonation;
          }
          return donation;
        });
        return replaced ? updated : [nextDonation, ...prev];
      });

      setNotification({
        message: previousId ? "Donation updated successfully." : "Donation saved.",
      });
      setForm(createDonationFormState());
      setEditingId(null);
    } catch (error) {
      setNotification({
        error: formatErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (donation: DonationRecord) => {
    setForm({
      restaurantId: donation.restaurantId ?? "",
      restaurantName: donation.restaurantName,
      restaurantAddress: donation.restaurantAddress,
      branch: donation.branch ?? "",
      note: donation.note,
      items: donation.items.map((item) => ({
        ...item,
        id: item.id ?? createFoodItemId(),
      })),
    });
    setEditingId(donation.id);
    setNotification({ message: "Editing donation. Changes will update the list." });
  };

  const handleDelete = async (donationId: string) => {
    try {
      await apiFetch(`/donations/${donationId}/`, {
        method: "DELETE",
      });
      setDonations((prev) => prev.filter((donation) => donation.id !== donationId));
      if (editingId === donationId) {
        resetForm();
      } else {
        setNotification({ message: "Donation removed from the list." });
      }
    } catch (error) {
      setNotification({
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete donation. Please try again.",
      });
    }
  };

  return (
    <div className="grid h-[calc(100vh-4rem)] min-h-0 grid-cols-5 gap-6">
      <div className="col-span-3 flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-[#C7D2C0] bg-[#f4f7ef] p-8 shadow-2xl shadow-[#C7D2C0]/30">
        <div className="mb-6 flex flex-shrink-0 items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#5E7A4A]">
              Food donation
            </p>
            <h2 className="text-3xl font-semibold text-gray-900">
              {editingId ? "Update donation" : "Create a donation"}
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            {new Date().toLocaleDateString()}
          </span>
        </div>

        <div className="flex-1 overflow-hidden">
          <form
            className="space-y-6 h-full overflow-y-auto pr-1 pb-4 sm:pr-3"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Restaurant name
                </label>
                <div ref={suggestionBoxRef} className="relative">
                  <input
                    type="text"
                    className={INPUT_STYLES}
                    placeholder="Type or paste the restaurant name"
                    value={form.restaurantName}
                    autoComplete="off"
                    onChange={(event) => handleRestaurantNameChange(event.target.value)}
                    onFocus={() =>
                      setIsSuggestionOpen(form.restaurantName.trim().length > 0)
                    }
                    required
                  />
                  {shouldShowSuggestions && (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[#D7DCC7] bg-white shadow-xl shadow-[#D7DCC7]/30">
                      <div className="max-h-72 overflow-y-auto">
                        {visibleSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.key}
                            type="button"
                            className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition hover:bg-[#F2F6EE]"
                            onClick={() => handleSelectSuggestion(suggestion)}
                          >
                            <div className="space-y-0.5">
                              <p className="text-sm font-semibold text-gray-900">
                                {suggestion.label}
                              </p>
                              {suggestion.description ? (
                                <p className="text-xs text-gray-500">
                                  {suggestion.description}
                                </p>
                              ) : null}
                            </div>
                            <span
                              className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ${
                                suggestion.kind === "restaurant"
                                  ? "bg-[#E9F1E3] text-[#5E7A4A]"
                                  : "bg-[#F7E3D6] text-[#B86A49]"
                              }`}
                            >
                              {suggestion.kind === "restaurant" ? "In network" : "Popular"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Type at least one letter to see in-line suggestions from the restaurant list.
                  {restaurantsLoading ? " Loading restaurants..." : ""}
                </p>
                {restaurantLoadError && (
                  <p className="mt-1 text-xs text-red-500">{restaurantLoadError}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Branch / location
                </label>
                <input
                  type="text"
                  className={INPUT_STYLES}
                  value={form.branch}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, branch: event.target.value }))
                  }
                  placeholder={
                    selectedRestaurant
                      ? "Branch is filled automatically. Adjust if needed."
                      : "Enter branch or location (optional)"
                  }
                />
                <p className="mt-2 text-xs text-gray-500">
                  Branch information is filled automatically when a restaurant is selected, or
                  you can type a custom branch/location.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Restaurant address
              </label>
              <input
                type="text"
                className={INPUT_STYLES}
                placeholder="Enter restaurant address"
                value={form.restaurantAddress}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, restaurantAddress: event.target.value }))
                }
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Address is filled automatically when a restaurant is selected, or you can type a
                custom address.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-[#D7DCC7] bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Food items</p>
                <button
                  type="button"
                  className="text-xs font-semibold uppercase tracking-wide text-[#5E7A4A]"
                  onClick={handleAddItem}
                >
                  + Add item
                </button>
              </div>

              {form.items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-2xl border border-dashed border-[#D7DCC7] bg-[#F4F7EF] p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">Item #{index + 1}</p>
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-500 underline-offset-2 hover:underline"
                      onClick={() => handleRemoveItem(index)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Food name
                      </label>
                      <input
                        type="text"
                        className={INPUT_STYLES}
                        placeholder="e.g. roasted vegetables"
                        value={item.name}
                        onChange={(event) =>
                          handleItemChange(index, "name", event.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        className={INPUT_STYLES}
                        value={item.quantity}
                        onChange={(event) =>
                          handleItemChange(index, "quantity", event.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Unit
                      </label>
                      <input
                        type="text"
                        className={INPUT_STYLES}
                        placeholder="kg / portions / boxes"
                        value={item.unit}
                        onChange={(event) =>
                          handleItemChange(index, "unit", event.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Expired date
                      </label>
                      <input
                        type="date"
                        className={INPUT_STYLES}
                        value={item.expiredDate}
                        onChange={(event) =>
                          handleItemChange(index, "expiredDate", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Packaging notes (optional)
              </label>
              <textarea
                className={`${INPUT_STYLES} h-24`}
                placeholder="Mention if items are chilled, packed in crates, etc."
                value={form.note}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, note: event.target.value }))
                }
              />
            </div>

            {notification.error && (
              <p className="text-sm font-semibold text-[#C2410C]">
                {notification.error}
              </p>
            )}
            {notification.message && (
              <p className="text-sm font-semibold text-[#2F8A61]">
                {notification.message}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !currentUser}
              className="rounded-2xl bg-[#7ba061] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#4E653D] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Saving..."
                : editingId
                  ? "Update donation"
                  : "Save donation"}
            </button>
              {editingId && (
                <button
                  type="button"
                  className="rounded-2xl border border-[#D7DCC7] px-6 py-3 text-sm font-semibold text-[#4B3525] transition hover:border-[#B86A49] hover:text-[#3A2617]"
                  onClick={resetForm}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="col-span-2 flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-[#4d673f]/40 bg-[#ccdab2] p-7">
        <div className="mb-5 flex flex-shrink-0 items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#4e673e]">
              Pending donations
            </p>
            <h3 className="text-2xl font-semibold text-gray-800">Donation log</h3>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            {donations.length} total
          </span>
        </div>

        {donationsError && (
          <p className="text-sm font-semibold text-red-500 mb-4 flex-shrink-0">{donationsError}</p>
        )}

        <div className="overflow-y-auto flex-1 min-h-0 pr-2">
          {donationsLoading ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-6 text-sm text-gray-500">
              Loading donations...
            </p>
          ) : donations.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-6 text-sm text-gray-500">
              Once you save a donation, it shows up here for editing or delivery planning.
            </p>
          ) : (
            <div className="space-y-4">
            {donations.map((donation) => (
              <article
                key={donation.id}
                className="rounded-2xl border border-dashed border-[#4d673f] bg-white/90 p-5 "
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      {donation.restaurantId ?? "Manual entry"}
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {donation.restaurantName}
                    </p>
                    {donation.branch && (
                      <p className="text-sm text-gray-500">{donation.branch}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>{formatDisplayDate(donation.createdAt)}</p>
                    <p>{donation.items.length} item(s)</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {donation.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-1 rounded-2xl border border-[#D7DCC7] bg-[#F4F7EF] p-3 text-sm text-gray-700"
                    >
                      <div className="flex items-center justify-between text-xs uppercase text-gray-500">
                        <span>Item {index + 1}</span>
                        <span>
                          Qty {item.quantity} {item.unit}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-gray-900">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Expired:{" "}
                        {item.expiredDate ? formatDisplayDate(item.expiredDate) : "n/a"}
                      </p>
                    </div>
                  ))}
                </div>

                {donation.note && (
                  <p className="mt-4 text-xs italic text-gray-500">
                    {donation.note}
                  </p>
                )}

                <div className="mt-5 flex gap-3 justify-end">
                  <button
                    type="button"
                    className="rounded-full border-2 border-[#C7D2C0] bg-white px-5 py-2 text-sm font-semibold text-[#4B5F39] shadow-sm transition-all duration-200 hover:border-[#5E7A4A] hover:bg-[#EEF2EA] hover:shadow-md active:scale-95"
                    onClick={() => handleEdit(donation)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-full border-2 border-[#F7B0A0] bg-white px-5 py-2 text-sm font-semibold text-[#B42318] shadow-sm transition-all duration-200 hover:border-[#E63946] hover:bg-[#FFF1F0] hover:shadow-md active:scale-95"
                    onClick={() => handleDelete(donation.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

function DonationRequestSection({
  currentUser,
  setShowAuthModal,
  setAuthMode
}: {
  currentUser: LoggedUser | null;
  setShowAuthModal: (show: boolean) => void;
  setAuthMode: (mode: AuthMode) => void;
}) {
  const [form, setForm] = useState<DonationRequestForm>(createDonationRequestForm());
  const [requests, setRequests] = useState<DonationRequestRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification>({});
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadRequests() {
      setLoadingRequests(true);
      setRequestsError(null);
      try {
        const data = await apiFetch<DonationRequestApiRecord[]>("/donation-requests/");
        if (!ignore) {
          setRequests(
            data.map((record) => ({
              id: record.request_id,
              requestTitle: record.title,
              communityName: record.community_name,
              numberOfPeople: String(record.people_count),
              expectedDelivery: record.expected_delivery,
              recipientAddress: record.recipient_address,
              contactPhone: record.contact_phone ?? "",
              notes: record.notes ?? "",
              createdAt: record.created_at,
            }))
          );
        }
      } catch (error) {
        if (!ignore) {
          setRequestsError(
            error instanceof Error ? error.message : "Unable to load requests"
          );
        }
      } finally {
        if (!ignore) {
          setLoadingRequests(false);
        }
      }
    }

    loadRequests();
    return () => {
      ignore = true;
    };
  }, []);

  const resetForm = () => {
    setForm(createDonationRequestForm());
    setEditingId(null);
    setNotification({});
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotification({});

    if (!form.requestTitle.trim()) {
      setNotification({ error: "Please provide a request title." });
      return;
    }

    if (!form.expectedDelivery) {
      setNotification({ error: "Please provide the requested delivery time." });
      return;
    }

    if (!form.communityName.trim()) {
      setNotification({ error: "Community name is required." });
      return;
    }

    if (!form.recipientAddress.trim()) {
      setNotification({ error: "Recipient address is required." });
      return;
    }

    const numberOfPeopleValue = Number(form.numberOfPeople);
    if (Number.isNaN(numberOfPeopleValue) || numberOfPeopleValue <= 0) {
      setNotification({ error: "Number of people must be greater than zero." });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: form.requestTitle.trim(),
      community_name: form.communityName.trim(),
      recipient_address: form.recipientAddress.trim(),
      expected_delivery: new Date(form.expectedDelivery).toISOString(),
      people_count: numberOfPeopleValue,
      contact_phone: form.contactPhone.trim(),
      notes: form.notes.trim(),
    };

    try {
      const result = editingId
        ? await apiFetch<DonationRequestApiRecord>(`/donation-requests/${editingId}/`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiFetch<DonationRequestApiRecord>("/donation-requests/", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      const mapped: DonationRequestRecord = {
        id: result.request_id,
        requestTitle: result.title,
        communityName: result.community_name,
        numberOfPeople: String(result.people_count),
        expectedDelivery: result.expected_delivery,
        recipientAddress: result.recipient_address,
        contactPhone: result.contact_phone ?? "",
        notes: result.notes ?? "",
        createdAt: result.created_at,
      };

      setRequests((prev) =>
        editingId
          ? prev.map((request) => (request.id === mapped.id ? mapped : request))
          : [mapped, ...prev]
      );

      setNotification({
        message: editingId ? "Request updated successfully." : "Request captured.",
      });

      resetForm();
    } catch (error) {
      setNotification({
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit request right now.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (request: DonationRequestRecord) => {
    setForm({
      requestTitle: request.requestTitle,
      communityName: request.communityName,
      numberOfPeople: request.numberOfPeople,
      expectedDelivery: toDateTimeLocalValue(request.expectedDelivery),
      recipientAddress: request.recipientAddress,
      contactPhone: request.contactPhone,
      notes: request.notes,
    });
    setEditingId(request.id);
    setNotification({
      message: "Editing recipient request. Save or cancel to exit editing mode.",
    });
  };

  const handleDelete = async (requestId: string) => {
    try {
      await apiFetch(`/donation-requests/${requestId}/`, {
        method: "DELETE",
      });
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
      if (editingId === requestId) {
        resetForm();
      } else {
        setNotification({ message: "Request removed." });
      }
    } catch (error) {
      setNotification({
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete request right now.",
      });
    }
  };

  return (
    <div className="grid h-[calc(100vh-4rem)] min-h-0 grid-cols-5 gap-6">
      <div className="col-span-3 flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-[#E6B9A2] bg-[#F6F2EC] p-8 shadow-2xl shadow-[#E6B9A2]/30">
        <div className="mb-6 flex flex-shrink-0 items-start justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#B86A49]">
              Meal requests
            </p>
            <h2 className="text-3xl font-semibold text-gray-900">
              {editingId ? "Update meal request" : (
                <>
                  Request meals<br />for your community
                </>
              )}
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            {new Date().toLocaleDateString()}
          </span>
        </div>

        <div className="flex-1 overflow-hidden">
          <form
            className="space-y-6 h-full overflow-y-auto pr-1 pb-4 sm:pr-3"
            onSubmit={handleSubmit}
          >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Request title
              </label>
              <input
                type="text"
                className={INPUT_STYLES}
                placeholder="e.g. Fresh produce for Ban Klang"
                value={form.requestTitle}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, requestTitle: event.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Expected delivery window
              </label>
              <input
                type="datetime-local"
                className={INPUT_STYLES}
                value={form.expectedDelivery}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, expectedDelivery: event.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-4 text-sm font-semibold text-gray-700">Community details</p>
              <div className="rounded-2xl border border-[#E6B9A2] bg-[#f2d6c3] p-4">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Community name
                    </label>
                    <input
                      type="text"
                      className={INPUT_STYLES}
                      value={form.communityName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, communityName: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Number of people to serve
                    </label>
                    <input
                      type="number"
                      min="1"
                      className={INPUT_STYLES}
                      value={form.numberOfPeople}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, numberOfPeople: event.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-4 text-sm font-semibold text-gray-700">Recipient details</p>
              <div className="rounded-2xl border border-[#E6B9A2] bg-[#f2d6c3] p-4">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Recipient address
                    </label>
                    <input
                      type="text"
                      className={INPUT_STYLES}
                      value={form.recipientAddress}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, recipientAddress: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Contact phone (optional)
                    </label>
                    <input
                      type="tel"
                      className={INPUT_STYLES}
                      value={form.contactPhone}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, contactPhone: event.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Additional notes (optional)
            </label>
            <textarea
              className={`${INPUT_STYLES} h-24`}
              placeholder="Distribution plan, vulnerable households, delivery constraints..."
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
          </div>

          {notification.error && (
            <p className="text-sm font-semibold text-[#C2410C]">
              {notification.error}
            </p>
          )}
          {notification.message && (
            <p className="text-sm font-semibold text-[#B86A49]">
              {notification.message}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !currentUser}
              className="rounded-2xl bg-[#B86A49] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#9F583C] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isSubmitting
                ? "Saving..."
                : editingId
                  ? "Update request"
                  : "Save request"}
            </button>
            {editingId && (
              <button
                type="button"
                className="rounded-2xl border border-[#E6B9A2] px-6 py-3 text-sm font-semibold text-[#4B3525] transition hover:border-[#B86A49] hover:text-[#3A2617]"
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
          </div>
          </form>
        </div>
      </div>

      <div className="col-span-2 flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-[#E6B9A2] bg-[#e2baab] p-8">
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#9f5b3f]">
              Get meals log
            </p>
            <h3 className="text-2xl font-semibold text-gray-900">
              Recipient request log
            </h3>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            {requests.length} total
          </span>
        </div>

        {requestsError && (
          <p className="text-sm font-semibold text-red-500 mb-4 flex-shrink-0">{requestsError}</p>
        )}

        <div className="overflow-y-auto flex-1 min-h-0 pr-2">
          {loadingRequests ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-6 text-sm text-gray-500">
              Loading requests...
            </p>
          ) : requests.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-6 text-sm text-gray-500">
              Captured requests will appear here for dispatch review.
            </p>
          ) : (
            <div className="space-y-4">
            {requests.map((request) => (
              <article
                key={request.id}
                className="rounded-2xl border border-[#E6B9A2] bg-[#F8F3EE] p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#B86A49]">
                      {request.communityName || "Community representative"}
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {request.requestTitle}
                    </p>
                    <p className="text-sm text-gray-600">
                      {request.numberOfPeople} people waiting for food
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>{formatDisplayDate(request.createdAt)}</p>
                    {request.expectedDelivery && (
                      <p>
                        Due{" "}
                        {formatDisplayDate(request.expectedDelivery)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-[#F8F3EE] p-3 text-sm text-gray-700">
                    <p className="text-xs uppercase tracking-wide text-[#B86A49]">
                      Recipient address
                    </p>
                    <p className="font-semibold">
                      {request.recipientAddress || "Not provided"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F8F3EE] p-3 text-sm text-gray-700">
                    <p className="text-xs uppercase tracking-wide text-[#B86A49]">
                      Contact phone
                    </p>
                    <p className="font-semibold">
                      {request.contactPhone || "N/A"}
                    </p>
                  </div>
                </div>

                {request.notes && (
                  <p className="mt-4 text-xs italic text-gray-500">{request.notes}</p>
                )}

                <div className="mt-5 flex gap-3 justify-end">
                  <button
                    type="button"
                    className="rounded-full border-2 border-[#E6B9A2] bg-white px-5 py-2 text-sm font-semibold text-[#8B5B1F] shadow-sm transition-all duration-200 hover:border-[#B86A49] hover:bg-[#F8F3EE] hover:shadow-md active:scale-95"
                    onClick={() => handleEdit(request)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-full border-2 border-[#F7B0A0] bg-white px-5 py-2 text-sm font-semibold text-[#B42318] shadow-sm transition-all duration-200 hover:border-[#E63946] hover:bg-[#FFF1F0] hover:shadow-md active:scale-95"
                    onClick={() => handleDelete(request.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

function AccessDenied({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      {message}
    </div>
  );
}

function ProfileModal({
  user,
  onClose,
  onSave,
}: {
  user: LoggedUser;
  onClose: () => void;
  onSave: (user: Partial<LoggedUser>) => void;
}) {
  const [form, setForm] = useState({
    username: user.username,
    email: user.email,
    fname: user.fname ?? "",
    lname: user.lname ?? "",
    phone: user.phone ?? "",
  });

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit profile</h3>
            <p className="text-xs text-gray-500">Update your personal information.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">First name</label>
              <input
                className={INPUT_STYLES}
                value={form.fname}
                onChange={(e) => setForm((prev) => ({ ...prev, fname: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Last name</label>
              <input
                className={INPUT_STYLES}
                value={form.lname}
                onChange={(e) => setForm((prev) => ({ ...prev, lname: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Username</label>
            <input
              className={INPUT_STYLES}
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Email</label>
            <input
              className={INPUT_STYLES}
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Phone</label>
            <input
              className={INPUT_STYLES}
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            className="rounded-lg bg-[#111828] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f1628]"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [donations, setDonations] = useState<DonationApiRecord[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [donationData, restaurantData] = await Promise.all([
          apiFetch<DonationApiRecord[]>("/donations/"),
          apiFetch<Restaurant[]>("/restaurants/"),
        ]);
        if (!ignore) {
          setDonations(donationData);
          setRestaurants(restaurantData);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Unable to load admin data.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const restaurantName = (id: string) => {
    const match = restaurants.find((r) => r.restaurant_id === id);
    return match ? `${match.name}${match.branch_name ? ` (${match.branch_name})` : ""}` : id;
  };

  const isCompleted = (status: DonationApiRecord["status"]) => status === "accepted";

  const toggleStatus = async (
    donationId: string,
    nextStatus: DonationApiRecord["status"],
  ) => {
    setUpdatingId(donationId);
    try {
      await apiFetch(`/donations/${donationId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setDonations((prev) =>
        prev.map((donation) =>
          donation.donation_id === donationId ? { ...donation, status: nextStatus } : donation,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update donation status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const donationStatusPill = (status: DonationApiRecord["status"]) => {
    if (status === "accepted") {
      return { text: "Completed", className: "bg-[#E6F7EE] text-[#1F4D36]" };
    }
    if (status === "declined") {
      return { text: "Declined", className: "bg-[#FDECEA] text-[#B42318]" };
    }
    return { text: "Pending", className: "bg-[#FFF1E3] text-[#C46A24]" };
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-[#F3C7A0] bg-[#FFF7EF] p-6 shadow-lg shadow-[#F2C08F]/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C46A24]">
              Admin console
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Manage donations</h2>
            <p className="text-sm text-gray-600">
              Mark donations as completed when pickup is finished to keep the queue tidy.
            </p>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow">
            {donations.filter((d) => !isCompleted(d.status)).length} pending / {donations.length} total
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Loading donations...</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {donations.map((donation) => (
              <div
                key={donation.donation_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F3C7A0] bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {restaurantName(donation.restaurant)}
                  </p>
                  <p className="text-xs text-gray-500">
                    ID: {donation.donation_id} • Created {formatDisplayDate(donation.donated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${donationStatusPill(donation.status).className}`}
                  >
                    {donationStatusPill(donation.status).text}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      toggleStatus(
                        donation.donation_id,
                        isCompleted(donation.status) ? "pending" : "accepted",
                      )
                    }
                    disabled={updatingId === donation.donation_id}
                    className="rounded-full border border-[#F3C7A0] px-4 py-2 text-xs font-semibold text-[#8B4C1F] transition hover:bg-[#FFF1E3] disabled:opacity-60"
                  >
                    {isCompleted(donation.status) ? "Mark pending" : "Mark completed"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PickupToWarehouse({ currentUser }: { currentUser: LoggedUser | null }) {
  const [donations, setDonations] = useState<DonationApiRecord[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [staff, setStaff] = useState<DeliveryStaffInfo[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecordApi[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItemApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [staffInputs, setStaffInputs] = useState<Record<string, { notes: string }>>({});

  const [pickupForm, setPickupForm] = useState({
    donationId: "",
    warehouseId: "",
    userId: "",
    pickupTime: "",
  });

  const canEdit = currentUser?.isAdmin ?? false;
  const currentUserId = currentUser?.userId ?? "";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [donationData, warehouseData, staffData, deliveryData, restaurantData] =
        await Promise.all([
          apiFetch<DonationApiRecord[]>(API_PATHS.donations),
          apiFetch<Warehouse[]>(API_PATHS.warehouses),
          apiFetch<DeliveryStaffInfo[]>(API_PATHS.deliveryStaff),
          apiFetch<DeliveryRecordApi[]>(API_PATHS.deliveries, {
            headers: buildAuthHeaders(currentUser),
          }),
          apiFetch<Restaurant[]>(API_PATHS.restaurants),
        ]);
      setDonations(donationData);
      setWarehouses(warehouseData);
      setStaff(staffData);
      setDeliveries(deliveryData);
      setRestaurants(restaurantData);

      // Load food items for all donations
      const allFoodItems: FoodItemApiRecord[] = [];
      for (const donation of donationData) {
        try {
          const items = await apiFetch<FoodItemApiRecord[]>(`/fooditems/?donation=${donation.donation_id}`);
          allFoodItems.push(...items);
        } catch (err) {
          // Ignore errors for individual donation food items
        }
      }
      setFoodItems(allFoodItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load delivery data.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const next: Record<string, { notes: string }> = {};
    deliveries.forEach((d) => {
      if (d.delivery_type === "donation") {
        next[d.delivery_id] = {
          notes: d.notes ?? "",
        };
      }
    });
    setStaffInputs(next);
  }, [deliveries]);

  const handleSubmitPickup = async () => {
    setSubmitting(true);
    setNotice(null);
    setError(null);
    try {
      if (!pickupForm.donationId || !pickupForm.warehouseId || !pickupForm.userId) {
        throw new Error("Select donation, warehouse, and delivery staff first.");
      }
      if (!pickupForm.pickupTime) {
        throw new Error("Pickup time is required.");
      }
      const payload: Record<string, unknown> = {
        delivery_id: generateDeliveryId(),
        delivery_type: "donation",
        pickup_time: new Date(pickupForm.pickupTime).toISOString(),
        dropoff_time: "02:00:00",
        pickup_location_type: "restaurant",
        dropoff_location_type: "warehouse",
        warehouse_id: pickupForm.warehouseId,
        user_id: pickupForm.userId,
        donation_id: pickupForm.donationId,
      };

      await apiFetch(API_PATHS.deliveries, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: buildAuthHeaders(currentUser),
      });

      setNotice("Pickup assignment saved.");
      await loadData();
      setPickupForm({
        donationId: "",
        warehouseId: "",
        userId: "",
        pickupTime: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save pickup assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  const visibleDeliveries = (canEdit
    ? deliveries
    : deliveries.filter((delivery) => delivery.user_id === currentUserId)
  ).filter((delivery) => delivery.delivery_type === "donation");

  const lookupRestaurantName = (donationId: string) => {
    const donation = donations.find((d) => d.donation_id === donationId);
    if (!donation) return donationId;
    const match = restaurants.find((r) => r.restaurant_id === donation.restaurant);
    return match ? `${match.name}${match.branch_name ? ` (${match.branch_name})` : ""}` : donationId;
  };

  const lookupStaffName = (userId: string) => {
    const member = staff.find((s) => s.user_id === userId);
    return member ? (member.name || member.username) : userId;
  };

  const lookupWarehouseAddress = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.warehouse_id === warehouseId);
    return warehouse ? warehouse.address : warehouseId;
  };

  const getFoodItemsForDelivery = (donationId: string) => {
    return foodItems.filter((item) => item.donation === donationId);
  };

  const formatFoodAmount = (donationId: string) => {
    const items = getFoodItemsForDelivery(donationId);
    if (items.length === 0) return "No items";
    const total = items.reduce((sum, item) => sum + (typeof item.quantity === "number" ? item.quantity : parseFloat(String(item.quantity)) || 0), 0);
    const units = items.map((item) => item.unit).filter(Boolean);
    const uniqueUnits = [...new Set(units)];
    if (uniqueUnits.length === 1) {
      return `${total} ${uniqueUnits[0]}`;
    }
    return `${items.length} item(s)`;
  };

  const statusLabel = (status: DeliveryRecordApi["status"]) => {
    switch (status) {
      case "pending":
        return { text: "Pending", className: "bg-[#FFF1E3] text-[#C46A24]" };
      case "in_transit":
        return { text: "In transit", className: "bg-[#E6F4FF] text-[#1D4ED8]" };
      case "delivered":
        return { text: "Delivered", className: "bg-[#E6F7EE] text-[#1F4D36]" };
      case "cancelled":
      default:
        return { text: "Cancelled", className: "bg-[#FDECEA] text-[#B42318]" };
    }
  };

  const updateStatus = async (deliveryId: string, nextStatus: DeliveryRecordApi["status"]) => {
    setUpdatingStatusId(deliveryId);
    setError(null);
    setNotice(null);
    try {
      const staffInput = staffInputs[deliveryId] ?? { notes: "" };
      const payload: Record<string, unknown> = { status: nextStatus };
      if (staffInput.notes) {
        payload.notes = staffInput.notes;
      }

      await apiFetch(`${API_PATHS.deliveries}${deliveryId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: buildAuthHeaders(currentUser),
      });
      setDeliveries((prev) =>
        prev.map((d) => (d.delivery_id === deliveryId ? { ...d, status: nextStatus } : d))
      );
      setNotice(`Updated delivery ${deliveryId} to ${nextStatus.replace("_", " ")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <div className="grid h-[calc(100vh-4rem)] min-h-0 grid-cols-5 gap-6">
      {/* Left side: Form */}
      <div className="col-span-3 flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-[#F3C7A0] bg-[#FFF7EF] p-8 shadow-2xl shadow-[#F2C08F]/30">
        <div className="mb-6 flex flex-shrink-0 items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#C46A24]">
              Pickup to warehouse
            </p>
            <h2 className="text-3xl font-semibold text-gray-900">
              {canEdit ? "Assign restaurant pickups" : "My assigned pickups"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {canEdit
                ? "Assign delivery staff to pick up donated food from restaurants and transport to warehouses."
                : "Update status for pickup deliveries assigned to you."}
            </p>
          </div>
          <span className="text-xs text-gray-500">
            {new Date().toLocaleDateString()}
          </span>
        </div>

        {error && <p className="mb-4 text-sm text-red-600 flex-shrink-0">{error}</p>}
        {notice && <p className="mb-4 text-sm text-emerald-600 flex-shrink-0">{notice}</p>}

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-600">Loading delivery data...</p>
          ) : canEdit ? (
            <div className="h-full overflow-y-auto pr-1 pb-4 sm:pr-3">
              <div className="space-y-4 rounded-2xl border border-[#F3C7A0] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-900">Pickup to warehouse</p>
                  <span className="text-xs text-gray-500">From restaurant</span>
                </div>
                <div className="grid gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Select donation
                    </label>
                    <select
                      className={INPUT_STYLES}
                      value={pickupForm.donationId}
                      onChange={(e) => setPickupForm((prev) => ({ ...prev, donationId: e.target.value }))}
                    >
                      <option value="">Select donation</option>
                      {donations.map((donation) => (
                        <option key={donation.donation_id} value={donation.donation_id}>
                          {donation.donation_id} • {lookupRestaurantName(donation.donation_id)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Select warehouse
                    </label>
                    <select
                      className={INPUT_STYLES}
                      value={pickupForm.warehouseId}
                      onChange={(e) => setPickupForm((prev) => ({ ...prev, warehouseId: e.target.value }))}
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                          {warehouse.warehouse_id} — {warehouse.address}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Assign delivery staff
                    </label>
                    <select
                      className={INPUT_STYLES}
                      value={pickupForm.userId}
                      onChange={(e) => setPickupForm((prev) => ({ ...prev, userId: e.target.value }))}
                    >
                      <option value="">Assign delivery staff</option>
                      {staff.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.name || member.username} ({member.assigned_area || "area n/a"})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Pickup time
                    </label>
                    <input
                      type="datetime-local"
                      className={INPUT_STYLES}
                      value={pickupForm.pickupTime}
                      onChange={(e) =>
                        setPickupForm((prev) => ({ ...prev, pickupTime: e.target.value }))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitPickup}
                    className="mt-4 w-full rounded-2xl bg-[#E48A3A] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#D37623] disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {submitting ? "Saving..." : "Save pickup assignment"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#CFE6D8] bg-[#F6FBF7] p-6 text-sm text-gray-700">
              View your assigned deliveries in the queue on the right. Status updates will notify the admin of progress.
            </div>
          )}
        </div>
      </div>

      {/* Right side: Queue */}
      <div className="col-span-2 flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-[#CFE6D8]/40 bg-[#F6FBF7] p-7 shadow-2xl shadow-[#B6DEC8]/30">
        <div className="mb-5 flex flex-shrink-0 items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2F855A]">
              Pickup queue
            </p>
            <h3 className="text-2xl font-semibold text-gray-800">
              {canEdit ? "All pickup tasks" : "My assigned pickups"}
            </h3>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            {visibleDeliveries.length} total
          </span>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 pr-2">
          {loading ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-6 text-sm text-gray-500">
              Loading tasks...
            </p>
          ) : visibleDeliveries.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-6 text-sm text-gray-500">
              {canEdit
                ? "No delivery tasks yet. Create assignments from the form on the left."
                : "No tasks assigned to you yet."}
            </p>
          ) : (
            <div className="space-y-4">
              {visibleDeliveries.map((delivery) => (
                <div
                  key={delivery.delivery_id}
                  className="rounded-2xl border border-[#CFE6D8] bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6F7EE]">
                          <span className="text-lg">📥</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Pickup to warehouse
                          </p>
                          <span className="text-xs font-medium text-[#2F855A]">
                            {delivery.delivery_id}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusLabel(delivery.status).className}`}
                    >
                      {statusLabel(delivery.status).text}
                    </span>
                  </div>

                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <span className="text-gray-400">🍽️</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500">Donation</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {lookupRestaurantName(delivery.donation_id)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <span className="text-gray-400">🥘</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500">Food Amount</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatFoodAmount(delivery.donation_id)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <span className="text-gray-400">📦</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500">Warehouse</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {delivery.warehouse_id} — {lookupWarehouseAddress(delivery.warehouse_id)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <span className="text-gray-400">👤</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500">Assigned Staff</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {lookupStaffName(delivery.user_id)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <span className="text-gray-400">🕐</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500">Pickup Time</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDisplayDate(delivery.pickup_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {!canEdit && (
                    <div className="space-y-3 mt-4 border-t border-gray-100 pt-4">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-gray-700">
                          Notes
                        </label>
                        <input
                          type="text"
                          className={INPUT_STYLES}
                          value={staffInputs[delivery.delivery_id]?.notes ?? ""}
                          onChange={(e) =>
                            setStaffInputs((prev) => ({
                              ...prev,
                              [delivery.delivery_id]: {
                                notes: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {delivery.status === "pending" && (
                          <>
                            <button
                              type="button"
                              disabled={updatingStatusId === delivery.delivery_id}
                              onClick={() => updateStatus(delivery.delivery_id, "in_transit")}
                              className="rounded-lg bg-[#1D4ED8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#153EAE] disabled:opacity-60"
                            >
                              Start
                            </button>
                            <button
                              type="button"
                              disabled={updatingStatusId === delivery.delivery_id}
                              onClick={() => updateStatus(delivery.delivery_id, "cancelled")}
                              className="rounded-lg bg-[#FDECEA] px-3 py-2 text-xs font-semibold text-[#B42318] hover:bg-[#FCD7D2] disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {delivery.status === "in_transit" && (
                          <>
                            <button
                              type="button"
                              disabled={updatingStatusId === delivery.delivery_id}
                              onClick={() => updateStatus(delivery.delivery_id, "delivered")}
                              className="rounded-lg bg-[#2F8A61] px-3 py-2 text-xs font-semibold text-white hover:bg-[#25724F] disabled:opacity-60"
                            >
                              Delivered
                            </button>
                            <button
                              type="button"
                              disabled={updatingStatusId === delivery.delivery_id}
                              onClick={() => updateStatus(delivery.delivery_id, "cancelled")}
                              className="rounded-lg bg-[#FDECEA] px-3 py-2 text-xs font-semibold text-[#B42318] hover:bg-[#FCD7D2] disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeliverToCommunity({ currentUser }: { currentUser: LoggedUser | null }) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [staff, setStaff] = useState<DeliveryStaffInfo[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecordApi[]>([]);
  const [donationRequests, setDonationRequests] = useState<DonationRequestApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [staffInputs, setStaffInputs] = useState<Record<string, { notes: string }>>({});

  const [distributionForm, setDistributionForm] = useState({
    warehouseId: "",
    communityId: "",
    userId: "",
    pickupTime: "",
  });

  const canEdit = currentUser?.isAdmin ?? false;
  const currentUserId = currentUser?.userId ?? "";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [warehouseData, communityData, staffData, deliveryData, requestData] =
        await Promise.all([
          apiFetch<Warehouse[]>(API_PATHS.warehouses),
          apiFetch<Community[]>(API_PATHS.communities),
          apiFetch<DeliveryStaffInfo[]>(API_PATHS.deliveryStaff),
          apiFetch<DeliveryRecordApi[]>(API_PATHS.deliveries, {
            headers: buildAuthHeaders(currentUser),
          }),
          apiFetch<DonationRequestApiRecord[]>(API_PATHS.donationRequests),
        ]);
      setWarehouses(warehouseData);
      setCommunities(communityData);
      setStaff(staffData);
      setDeliveries(deliveryData);
      setDonationRequests(requestData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load delivery data.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const next: Record<string, { notes: string }> = {};
    deliveries.forEach((d) => {
      if (d.delivery_type === "distribution") {
        next[d.delivery_id] = {
          notes: d.notes ?? "",
        };
      }
    });
    setStaffInputs(next);
  }, [deliveries]);

  const handleSubmitDistribution = async () => {
    setSubmitting(true);
    setNotice(null);
    setError(null);
    try {
      if (!distributionForm.warehouseId || !distributionForm.communityId || !distributionForm.userId) {
        throw new Error("Select warehouse, community, and delivery staff first.");
      }
      if (!distributionForm.pickupTime) {
        throw new Error("Pickup time is required.");
      }
      const payload: Record<string, unknown> = {
        delivery_id: generateDeliveryId(),
        delivery_type: "distribution",
        pickup_time: new Date(distributionForm.pickupTime).toISOString(),
        dropoff_time: "03:00:00",
        pickup_location_type: "warehouse",
        dropoff_location_type: "community",
        warehouse_id: distributionForm.warehouseId,
        user_id: distributionForm.userId,
        community_id: distributionForm.communityId,
      };

      await apiFetch(API_PATHS.deliveries, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: buildAuthHeaders(currentUser),
      });

      setNotice("Distribution assignment saved.");
      await loadData();
      setDistributionForm({
        warehouseId: "",
        communityId: "",
        userId: "",
        pickupTime: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save distribution assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  const visibleDeliveries = (canEdit
    ? deliveries
    : deliveries.filter((delivery) => delivery.user_id === currentUserId)
  ).filter((delivery) => delivery.delivery_type === "distribution");

  const lookupCommunityName = (communityId: string) => {
    const community = communities.find((c) => c.community_id === communityId);
    return community ? community.name : communityId;
  };

  const lookupStaffName = (userId: string) => {
    const member = staff.find((s) => s.user_id === userId);
    return member ? (member.name || member.username) : userId;
  };

  const lookupWarehouseAddress = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.warehouse_id === warehouseId);
    return warehouse ? warehouse.address : warehouseId;
  };

  const statusLabel = (status: DeliveryRecordApi["status"]) => {
    switch (status) {
      case "pending":
        return { text: "Pending", className: "bg-[#FFF1E3] text-[#C46A24]" };
      case "in_transit":
        return { text: "In transit", className: "bg-[#E6F4FF] text-[#1D4ED8]" };
      case "delivered":
        return { text: "Delivered", className: "bg-[#E6F7EE] text-[#1F4D36]" };
      case "cancelled":
      default:
        return { text: "Cancelled", className: "bg-[#FDECEA] text-[#B42318]" };
    }
  };

  const updateStatus = async (deliveryId: string, nextStatus: DeliveryRecordApi["status"]) => {
    setUpdatingStatusId(deliveryId);
    setError(null);
    setNotice(null);
    try {
      const staffInput = staffInputs[deliveryId] ?? { notes: "" };
      const payload: Record<string, unknown> = { status: nextStatus };
      if (staffInput.notes) {
        payload.notes = staffInput.notes;
      }

      await apiFetch(`${API_PATHS.deliveries}${deliveryId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: buildAuthHeaders(currentUser),
      });
      setDeliveries((prev) =>
        prev.map((d) => (d.delivery_id === deliveryId ? { ...d, status: nextStatus } : d))
      );
      setNotice(`Updated delivery ${deliveryId} to ${nextStatus.replace("_", " ")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-[#CFE6D8] bg-[#F6FBF7] p-6 shadow-lg shadow-[#B6DEC8]/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2F855A]">
              Deliver to community
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">
              {canEdit ? "Assign community deliveries" : "My assigned deliveries"}
            </h2>
            <p className="text-sm text-gray-600">
              {canEdit
                ? "Assign delivery staff to transport food from warehouses to communities."
                : "Update status for deliveries assigned to you."}
            </p>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow">
            {visibleDeliveries.length} task(s)
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {notice && <p className="mt-4 text-sm text-emerald-600">{notice}</p>}

        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Loading delivery data...</p>
        ) : canEdit ? (
          <div className="mt-6 space-y-3 rounded-2xl border border-[#CFE6D8] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Deliver to community</p>
              <span className="text-xs text-gray-500">From warehouse</span>
            </div>
            <div className="grid gap-3">
              <select
                className={INPUT_STYLES}
                value={distributionForm.warehouseId}
                onChange={(e) =>
                  setDistributionForm((prev) => ({ ...prev, warehouseId: e.target.value }))
                }
              >
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                    {warehouse.warehouse_id} — {warehouse.address}
                  </option>
                ))}
              </select>
              <select
                className={INPUT_STYLES}
                value={distributionForm.communityId}
                onChange={(e) =>
                  setDistributionForm((prev) => ({ ...prev, communityId: e.target.value }))
                }
              >
                <option value="">Select community</option>
                {communities.map((community) => (
                  <option key={community.community_id} value={community.community_id}>
                    {community.name} ({community.community_id})
                  </option>
                ))}
              </select>
              <select
                className={INPUT_STYLES}
                value={distributionForm.userId}
                onChange={(e) =>
                  setDistributionForm((prev) => ({ ...prev, userId: e.target.value }))
                }
              >
                <option value="">Assign delivery staff</option>
                {staff.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.name || member.username} ({member.assigned_area || "area n/a"})
                  </option>
                ))}
              </select>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Pickup time
                </label>
                <input
                  type="datetime-local"
                  className={INPUT_STYLES}
                  value={distributionForm.pickupTime}
                  onChange={(e) =>
                    setDistributionForm((prev) => ({ ...prev, pickupTime: e.target.value }))
                  }
                />
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitDistribution}
                className="mt-2 w-full rounded-xl bg-[#2F8A61] px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-[#25724F] disabled:opacity-60"
              >
                Save community delivery
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-[#CFE6D8] bg-[#F6FBF7] p-4 text-sm text-gray-700">
            View your assigned deliveries below. Status updates will notify the admin of progress.
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-[28px] border border-[#CFE6D8] bg-[#F6FBF7] p-6 shadow-lg shadow-[#B6DEC8]/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2F855A]">
              Delivery queue
            </p>
            <h3 className="text-xl font-semibold text-gray-900">
              {canEdit ? "All tasks" : "My assigned tasks"}
            </h3>
          </div>
          <span className="text-xs text-gray-500">{visibleDeliveries.length} active</span>
        </div>
        {loading ? (
          <p className="text-sm text-gray-600">Loading tasks...</p>
        ) : visibleDeliveries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white/70 p-4 text-sm text-gray-600">
            {canEdit
              ? "No delivery tasks yet. Create assignments from the form above."
              : "No tasks assigned to you yet."}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleDeliveries.map((delivery) => (
              <div
                key={delivery.delivery_id}
                className="space-y-2 rounded-2xl border border-[#CFE6D8] bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Deliver to community
                    </p>
                    <span className="text-xs font-semibold text-[#2F855A]">
                      {delivery.delivery_id}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusLabel(delivery.status).className}`}
                  >
                    {statusLabel(delivery.status).text}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Community: {lookupCommunityName(delivery.community_id || "")}
                </p>
                <p className="text-xs text-gray-500">
                  Warehouse: {delivery.warehouse_id} — {lookupWarehouseAddress(delivery.warehouse_id)}
                </p>
                <p className="text-xs text-gray-500">
                  Staff: {lookupStaffName(delivery.user_id)} • Pickup: {formatDisplayDate(delivery.pickup_time)}
                </p>
                <p className="text-xs text-gray-500">
                  Food Amount: Based on community request
                </p>
                {!canEdit && (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-gray-700">
                        Notes
                      </label>
                      <input
                        type="text"
                        className={INPUT_STYLES}
                        value={staffInputs[delivery.delivery_id]?.notes ?? ""}
                        onChange={(e) =>
                          setStaffInputs((prev) => ({
                            ...prev,
                            [delivery.delivery_id]: {
                              notes: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {delivery.status === "pending" && (
                        <>
                          <button
                            type="button"
                            disabled={updatingStatusId === delivery.delivery_id}
                            onClick={() => updateStatus(delivery.delivery_id, "in_transit")}
                            className="rounded-lg bg-[#1D4ED8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#153EAE] disabled:opacity-60"
                          >
                            Start
                          </button>
                          <button
                            type="button"
                            disabled={updatingStatusId === delivery.delivery_id}
                            onClick={() => updateStatus(delivery.delivery_id, "cancelled")}
                            className="rounded-lg bg-[#FDECEA] px-3 py-2 text-xs font-semibold text-[#B42318] hover:bg-[#FCD7D2] disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {delivery.status === "in_transit" && (
                        <>
                          <button
                            type="button"
                            disabled={updatingStatusId === delivery.delivery_id}
                            onClick={() => updateStatus(delivery.delivery_id, "delivered")}
                            className="rounded-lg bg-[#2F8A61] px-3 py-2 text-xs font-semibold text-white hover:bg-[#25724F] disabled:opacity-60"
                          >
                            Delivered
                          </button>
                          <button
                            type="button"
                            disabled={updatingStatusId === delivery.delivery_id}
                            onClick={() => updateStatus(delivery.delivery_id, "cancelled")}
                            className="rounded-lg bg-[#FDECEA] px-3 py-2 text-xs font-semibold text-[#B42318] hover:bg-[#FCD7D2] disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WarehouseManagement({ currentUser }: { currentUser: LoggedUser | null }) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItemApiRecord[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecordApi[]>([]);
  const [donations, setDonations] = useState<DonationApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [warehouseData, deliveryData, donationData] = await Promise.all([
        apiFetch<Warehouse[]>(API_PATHS.warehouses),
        apiFetch<DeliveryRecordApi[]>(API_PATHS.deliveries, {
          headers: buildAuthHeaders(currentUser),
        }),
        apiFetch<DonationApiRecord[]>(API_PATHS.donations),
      ]);
      setWarehouses(warehouseData);
      setDeliveries(deliveryData);
      setDonations(donationData);

      // Load food items for all donations
      const allFoodItems: FoodItemApiRecord[] = [];
      for (const donation of donationData) {
        try {
          const items = await apiFetch<FoodItemApiRecord[]>(`/fooditems/?donation=${donation.donation_id}`);
          allFoodItems.push(...items);
        } catch (err) {
          // Ignore errors for individual donation food items
        }
      }
      setFoodItems(allFoodItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load warehouse data.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todayString = useMemo(() => new Date().toISOString().split("T")[0], []);

  const getWarehouseItems = (warehouseId: string) => {
    // Get deliveries to this warehouse
    const warehouseDeliveries = deliveries.filter(
      (d) => d.delivery_type === "donation" && d.warehouse_id === warehouseId && d.status === "delivered"
    );
    // Get food items from those donations
    const donationIds = warehouseDeliveries.map((d) => d.donation_id);
    return foodItems.filter((item) => donationIds.includes(item.donation || ""));
  };

  const isItemExpired = useCallback(
    (item: FoodItemApiRecord) => {
      if (item.is_expired) return true;
      if (!item.expire_date) return false;
      const normalizedDate = item.expire_date.split("T")[0];
      if (!normalizedDate) return false;
      return normalizedDate < todayString;
    },
    [todayString]
  );

  const filterItems = (items: FoodItemApiRecord[]) => {
    if (filterStatus === "distributed") {
      return items.filter((item) => item.is_distributed);
    }

    const activeInventory = items.filter(
      (item) => !isItemExpired(item) && !item.is_distributed
    );

    if (filterStatus === "available") {
      return activeInventory.filter((item) => !item.is_claimed);
    }

    if (filterStatus === "claimed") {
      return activeInventory.filter((item) => item.is_claimed);
    }

    return activeInventory;
  };

  const displayWarehouses = warehouses.map((warehouse) => {
    const items = getWarehouseItems(warehouse.warehouse_id);
    return { warehouse, items: filterItems(items) };
  });

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-[#CFE6D8] bg-[#F6FBF7] p-6 shadow-lg shadow-[#B6DEC8]/30">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2F855A]">
              Warehouse management
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Manage warehouse inventory</h2>
            <p className="text-sm text-gray-600">
              View and manage food items stored in warehouses.
            </p>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-600">Loading warehouse data...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Filter by warehouse
              </label>
              <select
                className={INPUT_STYLES}
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                <option value="">All warehouses</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                    {warehouse.warehouse_id} — {warehouse.address}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Filter by status
              </label>
              <select
                className={INPUT_STYLES}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All items</option>
                <option value="available">Available</option>
                <option value="claimed">Claimed</option>
                <option value="distributed">Distributed</option>
              </select>
            </div>

            <div className="space-y-4">
              {displayWarehouses
                .filter((w) => !selectedWarehouse || w.warehouse.warehouse_id === selectedWarehouse)
                .map(({ warehouse, items }) => (
                  <div
                    key={warehouse.warehouse_id}
                    className="rounded-2xl border border-[#CFE6D8] bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{warehouse.warehouse_id}</h3>
                      <p className="text-sm text-gray-600">{warehouse.address}</p>
                      <p className="text-xs text-gray-500 mt-1">{items.length} item(s)</p>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-sm text-gray-500">No items in this warehouse.</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.food_id}
                            className="flex items-center justify-between rounded-lg border border-[#CFE6D8] bg-[#F6FBF7] p-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-500">
                                {item.quantity} {item.unit}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.is_distributed && (
                                <span className="rounded-full bg-[#E6F7EE] px-2 py-1 text-xs font-semibold text-[#1F4D36]">
                                  Distributed
                                </span>
                              )}
                              {item.is_claimed && !item.is_distributed && (
                                <span className="rounded-full bg-[#E6F4FF] px-2 py-1 text-xs font-semibold text-[#1D4ED8]">
                                  Claimed
                                </span>
                              )}
                              {!item.is_claimed && !item.is_distributed && (
                                <span className="rounded-full bg-[#FFF1E3] px-2 py-1 text-xs font-semibold text-[#C46A24]">
                                  Available
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Modal (popup) component

function extractErrorMessage(responseBody: unknown) {
  if (!responseBody) {
    return "Request failed";
  }

  if (typeof responseBody === "string") {
    return responseBody;
  }

  if (typeof responseBody === "object" && responseBody !== null) {
    const typedResponse = responseBody as Record<string, unknown>;

    if (typedResponse.error) {
      return String(typedResponse.error);
    }

    if (typedResponse.detail) {
      return String(typedResponse.detail);
    }

    const firstValue = Object.values(typedResponse).find(Boolean);
    if (Array.isArray(firstValue) && firstValue.length) {
      return String(firstValue[0]);
    }

    if (typeof firstValue === "string") {
      return firstValue;
    }
  }

  return "Request failed";
}

function AuthModal({
  mode,
  onModeChange,
  onClose,
  onAuthSuccess,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  onAuthSuccess?: (user: LoggedUser) => void;
}) {
  const isSignup = mode === "signup";

  const [signupData, setSignupData] = useState<SignupCredentials>({
    username: "",
    fname: "",
    lname: "",
    bod: "",
    phone: "",
    email: "",
    password: "",
  });
  const [loginData, setLoginData] = useState<LoginCredentials>({
    identifier: "",
    password: "",
  });
  const [signupStatus, setSignupStatus] = useState<FormStatus>({
    loading: false,
  });
  const [loginStatus, setLoginStatus] = useState<FormStatus>({
    loading: false,
  });

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignupStatus({ loading: true });

    try {
      const response = await fetch(`${API_BASE_URL}/users/signup/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signupData),
      });
      const payload = await response
        .json()
        .catch(() => ({ error: "Unexpected response" }));

      if (!response.ok) {
        setSignupStatus({
          loading: false,
          error: extractErrorMessage(payload),
        });
        return;
      }

      setSignupStatus({
        loading: false,
        message: payload.message ?? "Account created",
      });
      setSignupData({
        username: "",
        fname: "",
        lname: "",
        bod: "",
        phone: "",
        email: "",
        password: "",
      });

      // Automatically log the user in after successful signup
      if (payload.username && payload.email) {
        onAuthSuccess?.({
          username: payload.username,
          email: payload.email,
          userId: payload.user_id ?? "",
          isAdmin: Boolean(payload.is_admin),
          isDeliveryStaff: Boolean(payload.is_delivery_staff),
        });
        onClose();
      }
    } catch (error) {
      console.error("Signup error", error);
      setSignupStatus({
        loading: false,
        error: "Unable to reach authentication server",
      });
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginStatus({ loading: true });

    try {
      const response = await fetch(`${API_BASE_URL}/users/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });
      const payload = await response
        .json()
        .catch(() => ({ error: "Unexpected response" }));

      if (!response.ok) {
        setLoginStatus({
          loading: false,
          error: extractErrorMessage(payload),
        });
        return;
      }

      setLoginStatus({
        loading: false,
        message: payload.message ?? "Login successful",
      });
      setLoginData({ identifier: "", password: "" });
      if (payload.username && payload.email) {
        onAuthSuccess?.({
          username: payload.username,
          email: payload.email,
          userId: payload.user_id ?? "",
          isAdmin: Boolean(payload.is_admin),
          isDeliveryStaff: Boolean(payload.is_delivery_staff),
        });
        onClose();
      }
    } catch (error) {
      console.error("Login error", error);
      setLoginStatus({
        loading: false,
        error: "Unable to reach authentication server",
      });
    }
  };

  return (
    // overlay over the entire viewport
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg border-4 border-[#d48a68]/20">
        {/* Header row: title + close button */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className={[
            "text-xl font-bold",
            isSignup ? "text-[#d48a68]" : "text-[#708A58]"
          ].join(" ")}>
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
                ? "bg-[#d48a68] text-white"
                : "text-gray-600 hover:bg-[#d48a68]/30 hover:text-gray-900",
            ].join(" ")}
          >
            Sign up
          </button>
          <button
            onClick={() => onModeChange("login")}
            className={[
              "flex-1 rounded-full py-2 transition-colors",
              !isSignup
                ? "bg-[#708A58] text-white"
                : "text-gray-600 hover:bg-[#708A58]/30 hover:text-gray-900",
            ].join(" ")}
          >
            Login
          </button>
        </div>

        {/* Forms area */}
        {isSignup ? (
          // SIGN UP FORM
          <form className="space-y-4" onSubmit={handleSignupSubmit}>
            <div className="space-y-3 rounded-2xl border-2 border-[#d48a68] bg-[#fdf8f4] p-4 text-gray-700">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-gray-900">Username settings</p>
                <span className="text-xs text-gray-500">
                  Choose a unique handle people can use to mention you.
                </span>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Preferred username
                </label>
                <input
                  type="text"
                  value={signupData.username}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, username: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                />
              </div>
              <p className="text-xs text-gray-500">
                You can edit this later from your profile settings.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={signupData.fname}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, fname: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Surname
                </label>
                <input
                  type="text"
                  value={signupData.lname}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, lname: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                BOD
              </label>
              <input
                type="date"
                value={signupData.bod}
                onChange={(e) =>
                  setSignupData((prev) => ({ ...prev, bod: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Phone number
                </label>
                <input
                  type="tel"
                  value={signupData.phone}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={signupData.email}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                value={signupData.password}
                onChange={(e) =>
                  setSignupData((prev) => ({ ...prev, password: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
              />
            </div>

            {signupStatus.error && (
              <p className="text-xs text-red-500">{signupStatus.error}</p>
            )}
            {signupStatus.message && (
              <p className="text-xs text-emerald-600">{signupStatus.message}</p>
            )}

            <button
              type="submit"
              disabled={signupStatus.loading}
              className="mt-2 w-full rounded-lg bg-[#d48a68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c47958] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signupStatus.loading ? "Creating account..." : "Create account"}
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
                value={loginData.identifier}
                onChange={(e) =>
                  setLoginData((prev) => ({ ...prev, identifier: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#708A58] focus:ring-1 focus:ring-[#708A58] focus:bg-[#e8ede3]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData((prev) => ({ ...prev, password: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#708A58] focus:ring-1 focus:ring-[#708A58] focus:bg-[#e8ede3]"
              />
            </div>

            {loginStatus.error && (
              <p className="text-xs text-red-500">{loginStatus.error}</p>
            )}
            {loginStatus.message && (
              <p className="text-xs text-emerald-600">{loginStatus.message}</p>
            )}

            <button
              type="submit"
              disabled={loginStatus.loading}
              className="mt-2 w-full rounded-lg bg-[#708A58] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5a6e47] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loginStatus.loading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState(0); // Start with home page
  const [showAuthModal, setShowAuthModal] = useState(false); // whether popup is visible
  const [authMode, setAuthMode] = useState<AuthMode>("signup"); // current auth tab
  const [currentUser, setCurrentUser] = useState<LoggedUser | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const navItems: NavItem[] = currentUser?.isAdmin
    ? [
        { id: 0, label: "Home", icon: <span aria-hidden>🏠</span> },
        { id: 3, label: "Dashboard", icon: <span aria-hidden>🛠️</span> },
        { id: 4, label: "Pickup", icon: <span aria-hidden>📥</span> },
        { id: 6, label: "Deliver", icon: <span aria-hidden>🚚</span> },
        { id: 5, label: "Warehouse", icon: <span aria-hidden>📦</span> },
      ]
    : currentUser?.isDeliveryStaff
      ? [
          { id: 0, label: "Home", icon: <span aria-hidden>🏠</span> },
          { id: 4, label: "Pickup", icon: <span aria-hidden>📥</span> },
          { id: 6, label: "Deliver", icon: <span aria-hidden>🚚</span> },
        ]
      : [
          { id: 0, label: "Home", icon: <span aria-hidden>🏠</span> },
          { id: 1, label: "Donate", icon: <span aria-hidden>💚</span> },
          { id: 2, label: "Get meals", icon: <span aria-hidden>🍽️</span> },
        ];

  const normalizedActiveTab = useMemo(() => {
    // Home page (0) is always accessible
    if (activeTab === 0) {
      return 0;
    }
    if (!currentUser && activeTab > 2) {
      return 0; // Redirect to home if not logged in
    }
    if (currentUser?.isAdmin && activeTab > 0 && activeTab < 3) {
      return 3;
    }
    if (!currentUser?.isAdmin && currentUser?.isDeliveryStaff && activeTab > 0 && activeTab < 4) {
      return 4;
    }
    return activeTab;
  }, [activeTab, currentUser]);

  return (
    <main className="relative flex min-h-screen items-start bg-[#f5f1ed]">
      {/* Sidebar on the left */}
      <Sidebar
        activeTab={normalizedActiveTab}
        onTabChange={setActiveTab}
        onAuthClick={() => {
          setAuthMode("signup"); // open with Sign up tab active
          setShowAuthModal(true); // show popup
        }}
        tabs={navItems}
        isAdmin={currentUser?.isAdmin}
        isDriver={currentUser?.isDeliveryStaff}
        currentUser={currentUser ? { username: currentUser.username, email: currentUser.email } : undefined}
        onProfileClick={() => setShowProfileModal(true)}
        onLogout={() => {
          setCurrentUser(null);
          setActiveTab(0); // Redirect to home after logout
        }}
      />
      {/* Right side: content area */}
      {/* relative is IMPORTANT so the modal overlay stays inside this area only */}
      <section className="relative flex-1 h-screen overflow-y-auto p-8">
        <TabContent tab={normalizedActiveTab} currentUser={currentUser} setShowAuthModal={setShowAuthModal} setAuthMode={setAuthMode} />

        {/* Conditionally render modal */}
        {showAuthModal && (
          <AuthModal
            mode={authMode}
            onModeChange={setAuthMode}
            onClose={() => setShowAuthModal(false)}
            onAuthSuccess={(user) => {
              setCurrentUser(user);
              if (user.isAdmin) {
                setActiveTab(3);
              } else if (user.isDeliveryStaff) {
                setActiveTab(4);
              } else {
                setActiveTab(1);
              }
              setShowAuthModal(false);
            }}
          />
        )}

        {showProfileModal && currentUser && (
          <ProfileModal
            user={currentUser}
            onClose={() => setShowProfileModal(false)}
            onSave={(updated) => {
              setCurrentUser((prev) =>
                prev ? { ...prev, ...updated } : prev
              );
              setShowProfileModal(false);
            }}
          />
        )}
      </section>
    </main>
  );
}
