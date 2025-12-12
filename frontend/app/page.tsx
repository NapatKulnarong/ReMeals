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
  branch?: string;
  note: string;
  items: FoodItemForm[];
  createdAt: string;
};

type DonationFormState = {
  restaurantId: string;
  restaurantName: string;
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
  status: boolean;
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
   delivered_quantity?: number;
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
  branch: "",
  note: "",
  items: [createEmptyFoodItem()],
});

const generateDonationId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `DON${timestamp}${random}`;
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
  w-full rounded-2xl border border-[#E4DCCD] bg-white px-3 py-2 text-sm
  text-gray-800 outline-none transition focus:border-[#E3B261] focus:ring-2
  focus:ring-[#E3B261]/40
`.replace(/\s+/g, " ");

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
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
function HomePage() {
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

  const promises = [
    {
      icon: "🧊",
      title: "Food-safe handling",
      copy: "Temperature-friendly guidance and quick routes keep every dish safe to serve.",
    },
    {
      icon: "🛰️",
      title: "Smart matching",
      copy: "We prioritize the closest, best-fit requests to reduce travel and waste.",
    },
    {
      icon: "🤝",
      title: "Real partnership",
      copy: "Restaurants, drivers, and community leads stay in the loop with clear updates.",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <div className="relative overflow-hidden rounded-[32px] border border-[#E4E0D7] bg-gradient-to-br from-[#F8F7F3] via-white to-[#EEF3EE] p-10 shadow-xl">
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1F4D36] shadow-sm">
              <span aria-hidden className="text-lg">
                ✦
              </span>
              <span>Rescue more. Waste less.</span>
            </div>
            <h1 className="text-4xl leading-tight text-gray-900 sm:text-5xl sm:leading-tight">
              Rescue surplus meals.{" "}
              <span className="text-[#1F4D36]">Fuel local relief.</span>
            </h1>
            <p className="max-w-2xl text-lg text-gray-700">
              Re-Meals links restaurants, drivers, and community leaders so good food never sits idle.
              Share donations, request support, and move meals where they are needed most.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-[#1F4D36] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#1F4D36]/20">
                <span>Share a donation</span>
                <span aria-hidden className="text-lg">
                  →
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[#F2C14E] bg-white px-5 py-3 text-sm font-semibold text-[#8B5B1F] shadow-sm">
                <span>Request support</span>
                <span aria-hidden className="text-lg">
                  ❤
                </span>
              </div>
              <span className="text-sm text-gray-600">
                Use the sidebar to start — we guide both donors and recipients.
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-700">
              <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-sm">
                <span className="text-lg" aria-hidden>
                  🚚
                </span>
                <span>Coordinated pickups & drop-offs</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-sm">
                <span className="text-lg" aria-hidden>
                  🧊
                </span>
                <span>Freshness-first handling</span>
              </div>
            </div>
          </div>
          <div className="relative rounded-3xl border border-[#E4E0D7] bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2F855A]">
                  Impact snapshot
                </p>
                <h3 className="text-2xl font-bold text-gray-900">This week on Re-Meals</h3>
              </div>
              <div className="rounded-full bg-[#E9F7EF] px-3 py-1 text-xs font-semibold text-[#1F4D36]">
                Live
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#E4E0D7] bg-white px-4 py-3 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {item.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                  <p className="text-xs font-semibold text-[#1F4D36]">{item.helper}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-[#1F4D36] px-4 py-3 text-sm text-white shadow-md">
              <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                ✨
              </span>
              <p className="leading-tight">
                Tap "Donate" or "Get meals" from the sidebar to add your drop in minutes.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-[28px] border border-[#E4E0D7] bg-[#F8F7F3] p-7 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2F855A]">
                For restaurants
              </p>
              <h2 className="text-3xl font-semibold text-gray-900">Donate surplus easily</h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#2F855A] shadow-sm">
              Reduce waste
            </span>
          </div>
          <p className="mt-3 text-gray-700">
            Log extra meals with quantities, expiry, and packaging notes so our delivery team can pick up while everything stays fresh.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E4E0D7] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>
                  💚
                </span>
                <p className="text-sm font-semibold text-gray-900">Smart item logging</p>
              </div>
              <p className="mt-1 text-sm text-gray-700">
                Capture portions, units, and expiry in seconds so we know what to rescue first.
              </p>
            </div>
            <div className="rounded-2xl border border-[#E4E0D7] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>
                  🧭
                </span>
                <p className="text-sm font-semibold text-gray-900">Route-friendly pickups</p>
              </div>
              <p className="mt-1 text-sm text-gray-700">
                Drivers see your window and plan efficient routes to minimize food time in transit.
              </p>
            </div>
            <div className="rounded-2xl border border-[#E4E0D7] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>
                  📦
                </span>
                <p className="text-sm font-semibold text-gray-900">Packaging guidance</p>
              </div>
              <p className="mt-1 text-sm text-gray-700">
                Tips for sealing, labeling, and keeping items cool before pickup arrives.
              </p>
            </div>
            <div className="rounded-2xl border border-[#E4E0D7] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>
                  🎧
                </span>
                <p className="text-sm font-semibold text-gray-900">Concierge support</p>
              </div>
              <p className="mt-1 text-sm text-gray-700">
                Need help? Tag the admin team and we'll follow up before your shift ends.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#E4E0D7] bg-[#FFFAF1] p-7 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#D77B28]">
                For communities
              </p>
              <h2 className="text-3xl font-semibold text-gray-900">Request food support</h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#C46A24] shadow-sm">
              Right-sized aid
            </span>
          </div>
          <p className="mt-3 text-gray-700">
            Share what your neighbors need, when, and where. We align donations to your delivery window and capacity.
          </p>
          <div className="mt-5 space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-[#E4E0D7] bg-white p-4 shadow-sm">
              <span className="text-lg" aria-hidden>
                🍽️
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Structured needs list</p>
                <p className="text-sm text-gray-700">
                  Outline items, quantities, and urgency so matching stays accurate.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-[#E4E0D7] bg-white p-4 shadow-sm">
              <span className="text-lg" aria-hidden>
                🏠
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Clear drop-off details</p>
                <p className="text-sm text-gray-700">
                  Provide addresses, access notes, and an ideal delivery time for smooth arrivals.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-[#E4E0D7] bg-white p-4 shadow-sm">
              <span className="text-lg" aria-hidden>
                📱
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Stay updated</p>
                <p className="text-sm text-gray-700">
                  Track confirmations from our team and know when a delivery is on the way.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-[#E4E0D7] bg-white p-8 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#8B4C1F]">
              How Re-Meals works
            </p>
            <h2 className="text-3xl font-semibold text-gray-900">Three guided steps</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#FFF9EC] px-4 py-2 text-xs font-semibold text-[#8B4C1F]">
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
              className="rounded-2xl border border-[#E4E0D7] bg-[#FFFBF3] p-5 shadow-sm"
            >
              <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${item.accent}`}>
                <span>Step {item.step}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-700">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {promises.map((item) => (
          <div
            key={item.title}
            className="rounded-[24px] border border-[#E4E0D7] bg-gradient-to-br from-[#F7F4EE] via-white to-[#F0F2F0] p-6 shadow-md"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <span className="text-xl" aria-hidden>
                {item.icon}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
            <p className="mt-2 text-sm text-gray-700">{item.copy}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[32px] border border-[#E0E7DE] bg-gradient-to-br from-[#EEF3EE] via-white to-[#F8F7F3] p-10 shadow-xl">
        <div className="flex flex-col items-start gap-5 text-left sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Ready to keep good food moving?
            </h2>
            <p className="mt-2 text-lg text-gray-700">
              Use the sidebar to log a donation, request food, or manage deliveries.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-[#1F4D36] bg-[#1F4D36] px-6 py-3 text-sm font-semibold text-white shadow-sm">
              Donate surplus meals
            </div>
            <div className="rounded-2xl border border-[#F2C14E] bg-white px-6 py-3 text-sm font-semibold text-[#8B5B1F] shadow-sm">
              Request food support
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Content of each tab
function TabContent({ tab, currentUser }: { tab: number; currentUser: LoggedUser | null }) {
  if (tab === 0) {
    return <HomePage />;
  }
  if (tab === 1) {
    return <DonationSection />;
  }
  if (tab === 2) {
    return <DonationRequestSection />;
  }
  if (tab === 3) {
    if (currentUser?.isAdmin) {
      return <AdminDashboard />;
    }
    return <AccessDenied message="Admin access required." />;
  }
  if (tab === 4) {
    if (currentUser?.isAdmin || currentUser?.isDeliveryStaff) {
      return <DeliveryBoard currentUser={currentUser} />;
    }
    return <AccessDenied message="Delivery team access required." />;
  }

  return (
    <div className="rounded-xl bg-[#FBFBFE] p-10 shadow text-center">
    </div>
  );
}

function DonationSection() {
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
        branch: suggestion.restaurant.branch_name,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        restaurantName: suggestion.label,
        restaurantId: "",
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
      setNotification({ error: "Add at least one food item with a name." });
      return;
    }

    for (const item of normalizedItems) {
      const quantityValue = Number(item.quantity);
      if (Number.isNaN(quantityValue) || quantityValue <= 0) {
        setNotification({ error: "Item quantities must be greater than zero." });
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
        donationPayload.manual_restaurant_address = branchValue || trimmedRestaurantName;
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
        createdDonation.restaurant_address ?? (branchValue || trimmedRestaurantName);
      const existingRecord = previousId
        ? donations.find((donation) => donation.id === previousId)
        : null;

      const nextDonation: DonationRecord = {
        id: donationId,
        restaurantId: resolvedRestaurantId,
        restaurantName: resolvedRestaurantName,
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
        error:
          error instanceof Error
            ? error.message
            : "Unable to save donation. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (donation: DonationRecord) => {
    setForm({
      restaurantId: donation.restaurantId ?? "",
      restaurantName: donation.restaurantName,
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
    <div className="grid grid-cols-5 gap-6 h-full">
      <div className="col-span-3 flex flex-col rounded-[32px] border border-[#C7D2C0] bg-[#F6F2EC] p-8 shadow-2xl shadow-[#C7D2C0]/30">
        <div className="mb-6 flex items-center justify-between">
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

        <div className="space-y-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
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
                {selectedRestaurant && (
                  <p className="mt-2 text-xs text-gray-500">
                    {selectedRestaurant.address}
                  </p>
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

            <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-[#5E7A4A] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#4E653D] disabled:opacity-60"
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

      <div className="col-span-2 flex flex-col rounded-[32px] border border-[#C7D2C0] bg-[#F5F2EC] p-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#5E7A4A]">
              Pending donations
            </p>
            <h3 className="text-2xl font-semibold text-gray-900">Donation log</h3>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            {donations.length} total
          </span>
        </div>

        {donationsError && (
          <p className="text-sm font-semibold text-red-500 mb-4">{donationsError}</p>
        )}

        <div className="overflow-y-auto flex-1 pr-2">
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
                className="rounded-2xl border border-[#D7DCC7] bg-white/90 p-5 shadow"
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

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                  className="rounded-full border border-[#C7D2C0] px-4 py-2 text-xs font-semibold text-[#4B5F39] transition hover:bg-[#EEF2EA]"
                    onClick={() => handleEdit(donation)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-[#F7B0A0] px-4 py-2 text-xs font-semibold text-[#B42318] transition hover:bg-[#FFF1F0]"
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

function DonationRequestSection() {
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
    <div className="space-y-10">
      <div className="rounded-[32px] border border-[#E6B9A2] bg-[#F6F2EC] p-8 shadow-2xl shadow-[#E6B9A2]/35">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#B86A49]">
              Get meals
            </p>
            <h2 className="text-3xl font-semibold text-gray-900">
              {editingId ? "Update meal request" : "Request meals for your community"}
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            {new Date().toLocaleDateString()}
          </span>
        </div>

        <form className="space-y-8" onSubmit={handleSubmit}>
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

          <div className="space-y-4 rounded-2xl border border-[#E6B9A2] bg-white p-4">
            <p className="text-sm font-semibold text-gray-700">Community details</p>
            <div className="grid gap-4 md:grid-cols-2">
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
                  Number of people wanting food
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

          <div className="space-y-4 rounded-2xl border border-[#E6B9A2] bg-white p-4">
            <p className="text-sm font-semibold text-gray-700">Recipient details</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
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

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-[#B86A49] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#9F583C] disabled:opacity-60 transition"
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

      <div className="space-y-5 rounded-[32px] border border-[#E6B9A2] bg-[#F6F2EC] p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#B86A49]">
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
          <p className="text-sm font-semibold text-red-500">{requestsError}</p>
        )}

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

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                  className="rounded-full border border-[#E6B9A2] px-4 py-2 text-xs font-semibold text-[#8B5B1F] transition hover:bg-[#F8F3EE]"
                    onClick={() => handleEdit(request)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-[#F7B0A0] px-4 py-2 text-xs font-semibold text-[#B42318] transition hover:bg-[#FFF1F0]"
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

  const toggleStatus = async (donationId: string, nextStatus: boolean) => {
    setUpdatingId(donationId);
    try {
      await apiFetch(`/donations/${donationId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setDonations((prev) =>
        prev.map((donation) =>
          donation.donation_id === donationId ? { ...donation, status: nextStatus } : donation
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update donation status.");
    } finally {
      setUpdatingId(null);
    }
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
            {donations.filter((d) => !d.status).length} pending / {donations.length} total
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
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      donation.status
                        ? "bg-[#E6F7EE] text-[#1F4D36]"
                        : "bg-[#FFF1E3] text-[#C46A24]"
                    }`}
                  >
                    {donation.status ? "Completed" : "Pending"}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleStatus(donation.donation_id, !donation.status)}
                    disabled={updatingId === donation.donation_id}
                    className="rounded-full border border-[#F3C7A0] px-4 py-2 text-xs font-semibold text-[#8B4C1F] transition hover:bg-[#FFF1E3] disabled:opacity-60"
                  >
                    {donation.status ? "Mark pending" : "Mark completed"}
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

function DeliveryBoard({ currentUser }: { currentUser: LoggedUser | null }) {
  const [donations, setDonations] = useState<DonationApiRecord[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [staff, setStaff] = useState<DeliveryStaffInfo[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecordApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [staffInputs, setStaffInputs] = useState<Record<string, { deliveredQty: string; notes: string }>>({});

  const [pickupForm, setPickupForm] = useState({
    donationId: "",
    warehouseId: "",
    communityId: "",
    userId: "",
    pickupTime: "",
    dropoffTime: "02:00:00",
  });

  const [distributionForm, setDistributionForm] = useState({
    donationId: "",
    warehouseId: "",
    communityId: "",
    userId: "",
    pickupTime: "",
    dropoffTime: "03:00:00",
    deliveredQty: "",
  });

  const canEdit = currentUser?.isAdmin ?? false;
  const currentUserId = currentUser?.userId ?? "";

  const normalizeDuration = (value: string) => {
    if (!value) {
      return "01:00:00";
    }
    const parts = value.split(":");
    if (parts.length === 2) {
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:00`;
    }
    if (parts.length === 1) {
      return `${parts[0].padStart(2, "0")}:00:00`;
    }
    return value;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [donationData, warehouseData, communityData, staffData, deliveryData, restaurantData] =
        await Promise.all([
          apiFetch<DonationApiRecord[]>(API_PATHS.donations),
          apiFetch<Warehouse[]>(API_PATHS.warehouses),
          apiFetch<Community[]>(API_PATHS.communities),
          apiFetch<DeliveryStaffInfo[]>(API_PATHS.deliveryStaff),
          apiFetch<DeliveryRecordApi[]>(API_PATHS.deliveries, {
            headers: buildAuthHeaders(currentUser),
          }),
          apiFetch<Restaurant[]>(API_PATHS.restaurants),
        ]);
      setDonations(donationData);
      setWarehouses(warehouseData);
      setCommunities(communityData);
      setStaff(staffData);
      setDeliveries(deliveryData);
      setRestaurants(restaurantData);
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
    const next: Record<string, { deliveredQty: string; notes: string }> = {};
    deliveries.forEach((d) => {
      next[d.delivery_id] = {
        deliveredQty: d.delivered_quantity?.toString() ?? "",
        notes: d.notes ?? "",
      };
    });
    setStaffInputs(next);
  }, [deliveries]);

  const handleSubmitDelivery = async (
    form: typeof pickupForm,
    mode: "pickup" | "distribution"
  ) => {
    setSubmitting(true);
    setNotice(null);
    setError(null);
    try {
      if (!form.donationId || !form.warehouseId || !form.communityId || !form.userId) {
        throw new Error("Fill in donation, warehouse, community, and delivery staff.");
      }
      if (!form.pickupTime) {
        throw new Error("Pickup time is required.");
      }
      const payload: Record<string, unknown> = {
        delivery_type: mode === "pickup" ? "donation" : "distribution",
        pickup_time: new Date(form.pickupTime).toISOString(),
        dropoff_time: normalizeDuration(form.dropoffTime),
        pickup_location_type: mode === "pickup" ? "restaurant" : "warehouse",
        dropoff_location_type: mode === "pickup" ? "warehouse" : "community",
        warehouse_id: form.warehouseId,
        user_id: form.userId,
        donation_id: form.donationId,
        community_id: form.communityId,
      };
      if (mode === "distribution") {
        const distForm = form as typeof distributionForm;
        if (distForm.deliveredQty) {
          payload.delivered_quantity = Number(distForm.deliveredQty);
        }
      }

      await apiFetch(API_PATHS.deliveries, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: buildAuthHeaders(currentUser),
      });

      setNotice("Delivery assignment saved.");
      await loadData();
      if (mode === "pickup") {
        setPickupForm({
          donationId: "",
          warehouseId: "",
          communityId: "",
          userId: "",
          pickupTime: "",
          dropoffTime: "02:00:00",
        });
      } else {
        setDistributionForm({
          donationId: "",
          warehouseId: "",
          communityId: "",
          userId: "",
          pickupTime: "",
          dropoffTime: "03:00:00",
          deliveredQty: "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save delivery assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  const visibleDeliveries = canEdit
    ? deliveries
    : deliveries.filter((delivery) => delivery.user_id === currentUserId);

  const lookupRestaurantName = (donationId: string) => {
    const donation = donations.find((d) => d.donation_id === donationId);
    if (!donation) return donationId;
    const match = restaurants.find((r) => r.restaurant_id === donation.restaurant);
    return match ? `${match.name}${match.branch_name ? ` (${match.branch_name})` : ""}` : donationId;
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
      const staffInput = staffInputs[deliveryId] ?? { deliveredQty: "", notes: "" };
      const payload: Record<string, unknown> = { status: nextStatus };
      if (staffInput.deliveredQty) {
        payload.delivered_quantity = Number(staffInput.deliveredQty);
      }
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
      <div className="rounded-[28px] border border-[#F3C7A0] bg-[#FFF7EF] p-6 shadow-lg shadow-[#F2C08F]/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C46A24]">
              Delivery board
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">
              {canEdit ? "Assign pickups and drop-offs" : "My assigned deliveries"}
            </h2>
            <p className="text-sm text-gray-600">
              {canEdit
                ? "Link donations to warehouses and communities with a delivery staff contact."
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
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-[#F3C7A0] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Pickup to warehouse</p>
                <span className="text-xs text-gray-500">From restaurant</span>
              </div>
              <div className="grid gap-3">
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
                <select
                  className={INPUT_STYLES}
                  value={pickupForm.communityId}
                  onChange={(e) => setPickupForm((prev) => ({ ...prev, communityId: e.target.value }))}
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
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
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Transit duration (HH:MM)
                    </label>
                    <input
                      type="text"
                      className={INPUT_STYLES}
                      placeholder="02:00"
                      value={pickupForm.dropoffTime}
                      onChange={(e) =>
                        setPickupForm((prev) => ({ ...prev, dropoffTime: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmitDelivery(pickupForm, "pickup")}
                  className="mt-2 w-full rounded-xl bg-[#E48A3A] px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-[#D37623] disabled:opacity-60"
                >
                  Save pickup assignment
                </button>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-[#F3C7A0] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Deliver to community</p>
                <span className="text-xs text-gray-500">From warehouse</span>
              </div>
              <div className="grid gap-3">
                <select
                  className={INPUT_STYLES}
                  value={distributionForm.donationId}
                  onChange={(e) =>
                    setDistributionForm((prev) => ({ ...prev, donationId: e.target.value }))
                  }
                >
                  <option value="">Select donation</option>
                  {donations.map((donation) => (
                    <option key={donation.donation_id} value={donation.donation_id}>
                      {donation.donation_id} • {lookupRestaurantName(donation.donation_id)}
                    </option>
                  ))}
                </select>
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
                <div className="grid gap-3 sm:grid-cols-2">
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
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Transit duration (HH:MM)
                    </label>
                    <input
                      type="text"
                      className={INPUT_STYLES}
                      placeholder="03:00"
                      value={distributionForm.dropoffTime}
                      onChange={(e) =>
                        setDistributionForm((prev) => ({ ...prev, dropoffTime: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Delivered quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      className={INPUT_STYLES}
                      value={distributionForm.deliveredQty}
                      onChange={(e) =>
                        setDistributionForm((prev) => ({ ...prev, deliveredQty: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmitDelivery(distributionForm, "distribution")}
                  className="mt-2 w-full rounded-xl bg-[#E48A3A] px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-[#D37623] disabled:opacity-60"
                >
                  Save community delivery
                </button>
              </div>
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
              ? "No delivery tasks yet. Create assignments from the forms above."
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
                      {delivery.delivery_type === "donation"
                        ? "Pickup to warehouse"
                        : "Deliver to community"}
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
                  Donation: {lookupRestaurantName(delivery.donation_id)}
                </p>
                <p className="text-xs text-gray-500">
                  Warehouse: {delivery.warehouse_id} • Community: {delivery.community_id}
                </p>
                <p className="text-xs text-gray-500">
                  Staff: {delivery.user_id} • Pickup: {formatDisplayDate(delivery.pickup_time)}
                </p>
                <p className="text-xs text-gray-500">
                  Transit: {delivery.dropoff_time} • From {delivery.pickup_location_type} →{" "}
                  {delivery.dropoff_location_type}
                </p>
                {!canEdit && (
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-gray-700">
                          Delivered quantity
                        </label>
                        <input
                          type="number"
                          min="0"
                          className={INPUT_STYLES}
                          value={staffInputs[delivery.delivery_id]?.deliveredQty ?? ""}
                          onChange={(e) =>
                            setStaffInputs((prev) => ({
                              ...prev,
                              [delivery.delivery_id]: {
                                deliveredQty: e.target.value,
                                notes: prev[delivery.delivery_id]?.notes ?? "",
                              },
                            }))
                          }
                        />
                      </div>
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
                                deliveredQty: prev[delivery.delivery_id]?.deliveredQty ?? "",
                                notes: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
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
            <div className="space-y-3 rounded-2xl border border-[#FFE17E]/60 bg-[#FFF9EC] p-4 text-gray-700">
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#FFE17E] focus:ring-1 focus:ring-[#FFE17E] focus:bg-[#FFE17E]/30"
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#FFE17E] focus:ring-1 focus:ring-[#FFE17E] focus:bg-[#FFE17E]/30"
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
                value={signupData.bod}
                onChange={(e) =>
                  setSignupData((prev) => ({ ...prev, bod: e.target.value }))
                }
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
                  value={signupData.phone}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, phone: e.target.value }))
                  }
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
                  value={signupData.email}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, email: e.target.value }))
                  }
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
                value={signupData.password}
                onChange={(e) =>
                  setSignupData((prev) => ({ ...prev, password: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#FFE17E] focus:ring-1 focus:ring-[#FFE17E] focus:bg-[#FFE17E]/30"
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
              className="mt-2 w-full rounded-lg bg-[#FFE17E] px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#FFE17E] focus:ring-1 focus:ring-[#FFE17E] focus:bg-[#FFE17E]/30"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none focus:border-[#FFE17E] focus:ring-1 focus:ring-[#FFE17E] focus:bg-[#FFE17E]/30"
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
              className="mt-2 w-full rounded-lg bg-[#FFE17E] px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
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
        { id: 4, label: "Delivery", icon: <span aria-hidden>🚚</span> },
      ]
    : currentUser?.isDeliveryStaff
      ? [
          { id: 0, label: "Home", icon: <span aria-hidden>🏠</span> },
          { id: 4, label: "Delivery board", icon: <span aria-hidden>🚚</span> },
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
    <main className="relative flex min-h-screen items-start bg-white">
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
        <TabContent tab={normalizedActiveTab} currentUser={currentUser} />

        {currentUser && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-700 shadow-sm">
            Logged in as{" "}
            <span className="font-semibold text-gray-900">{currentUser.username}</span>{" "}
            <span className="text-xs text-gray-500 block">{currentUser.email}</span>
          </div>
        )}

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
