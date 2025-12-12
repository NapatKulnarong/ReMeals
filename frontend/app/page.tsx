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

type RequestNeed = {
  id: string;
  item: string;
  quantity: string;
  urgency: string;
};

type DonationRequestForm = {
  requestTitle: string;
  communityName: string;
  numberOfPeople: string;
  expectedDelivery: string;
  recipientAddress: string;
  contactPhone: string;
  notes: string;
  needs: RequestNeed[];
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
  items: Array<{
    need_id: string;
    item: string;
    quantity: number;
    urgency: string;
  }>;
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

const createFoodItemId = (() => {
  let counter = 1;
  return () => {
    const id = `food-${counter.toString().padStart(3, "0")}`;
    counter += 1;
    return id;
  };
})();

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

const generateDonationId = (() => {
  let counter = 1;
  return () => {
    const id = `don-${counter.toString().padStart(3, "0")}`;
    counter += 1;
    return id;
  };
})();

const createRequestNeedId = (() => {
  let counter = 1;
  return () => {
    const id = `need-${counter.toString().padStart(3, "0")}`;
    counter += 1;
    return id;
  };
})();

const createEmptyRequestNeed = (): RequestNeed => ({
  id: createRequestNeedId(),
  item: "",
  quantity: "1",
  urgency: "Normal",
});

const createDonationRequestForm = (): DonationRequestForm => ({
  requestTitle: "",
  communityName: "",
  numberOfPeople: "10",
  expectedDelivery: "",
  recipientAddress: "",
  contactPhone: "",
  notes: "",
  needs: [createEmptyRequestNeed()],
});

const generateRequestId = (() => {
  let counter = 1;
  return () => {
    const id = `req-${counter.toString().padStart(3, "0")}`;
    counter += 1;
    return id;
  };
})();

const generateDeliveryId = (() => {
  let counter = 1;
  return () => {
    const id = `dlv-${counter.toString().padStart(3, "0")}`;
    counter += 1;
    return id;
  };
})();

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
    let message = "Request failed";
    try {
      const data = await response.json();
      message =
        (typeof data === "string" && data) ||
        data?.detail ||
        data?.error ||
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

// Content of each tab
function TabContent({ tab, currentUser }: { tab: number; currentUser: LoggedUser | null }) {
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
              restaurantName: donation.restaurant,
              branch: "",
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
    if (!restaurants.length) {
      return;
    }
    setDonations((prev) =>
      prev.map((donation) => {
        if (!donation.restaurantId) {
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
  }, [restaurants]);

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
      branch: matched?.branch_name ?? "",
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

    if (!selectedRestaurant) {
      setNotification({
        error: "Please select a restaurant from the suggestions.",
      });
      return;
    }

    const trimmedRestaurantName = form.restaurantName.trim();

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
      const donationId = editingId ?? generateDonationId();
      if (editingId) {
        await apiFetch(`/donations/${editingId}/`, { method: "DELETE" });
      }
      await apiFetch("/donations/", {
        method: "POST",
        body: JSON.stringify({
          donation_id: donationId,
          restaurant: selectedRestaurant.restaurant_id,
          status: false,
        }),
      });

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

      const timestamp = getCurrentTimestamp();
      const existingRecord = editingId
        ? donations.find((donation) => donation.id === editingId)
        : null;

      const nextDonation: DonationRecord = {
        id: donationId,
        restaurantId: selectedRestaurant.restaurant_id,
        restaurantName: trimmedRestaurantName,
        branch: selectedRestaurant.branch_name,
        note: form.note.trim(),
        items: normalizedItems,
        createdAt: existingRecord?.createdAt ?? timestamp,
      };

      setDonations((prev) =>
        editingId
          ? prev.map((donation) =>
              donation.id === donationId ? nextDonation : donation
            )
          : [nextDonation, ...prev]
      );

      setNotification({
        message: editingId ? "Donation updated successfully." : "Donation saved.",
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
    <div className="space-y-10">
      <div className="rounded-[32px] border border-[#CFE6D8] bg-[#F6FBF7] p-8 shadow-2xl shadow-[#B6DEC8]/30">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2F855A]">
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
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[#CFE4D7] bg-white shadow-xl shadow-[#B6DEC8]/30">
                      <div className="max-h-72 overflow-y-auto">
                        {visibleSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.key}
                            type="button"
                            className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition hover:bg-[#ECF7EF]"
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
                                  ? "bg-[#E4F4EB] text-[#2F855A]"
                                  : "bg-[#FFE8D6] text-[#B45B1F]"
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
                  value={selectedRestaurant?.branch_name ?? form.branch}
                  readOnly
                  placeholder="Select a restaurant to populate branch"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Branch information is filled automatically when a restaurant is selected.
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-[#D8ECDF] bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Food items</p>
                <button
                  type="button"
                  className="text-xs font-semibold uppercase tracking-wide text-[#2F855A]"
                  onClick={handleAddItem}
                >
                  + Add item
                </button>
              </div>

              {form.items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-2xl border border-dashed border-[#CBE4D8] bg-[#F7FBF8] p-4"
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
              className="rounded-2xl bg-[#2F8A61] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#25724F] disabled:opacity-60"
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
                  className="rounded-2xl border border-[#BBDCC9] px-6 py-3 text-sm font-semibold text-gray-600 transition hover:border-[#7BBF9C]"
                  onClick={resetForm}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="space-y-5 rounded-[32px] border border-[#CFE6D8] bg-[#F4FBF7] p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2F855A]">
              Pending donations
            </p>
            <h3 className="text-2xl font-semibold text-gray-900">Donation log</h3>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            {donations.length} total
          </span>
        </div>

        {donationsError && (
          <p className="text-sm font-semibold text-red-500">{donationsError}</p>
        )}

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
                className="rounded-2xl border border-[#CDE5D7] bg-white/90 p-5 shadow"
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
                      className="flex flex-col gap-1 rounded-2xl border border-[#CBE4D8] bg-[#F7FBF8] p-3 text-sm text-gray-700"
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
                  className="rounded-full border border-[#7BBF9C] px-4 py-2 text-xs font-semibold text-[#1F5B3F] transition hover:bg-[#E7F6EE]"
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
              needs: record.items.map((item) => ({
                id: item.need_id,
                item: item.item,
                quantity: item.quantity.toString(),
                urgency: item.urgency,
              })),
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

  const handleNeedChange = (
    index: number,
    field: keyof RequestNeed,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      needs: prev.needs.map((need, needIndex) =>
        needIndex === index ? { ...need, [field]: value } : need
      ),
    }));
  };

  const handleAddNeed = () => {
    setForm((prev) => ({
      ...prev,
      needs: [...prev.needs, createEmptyRequestNeed()],
    }));
  };

  const handleRemoveNeed = (index: number) => {
    setForm((prev) => {
      const nextNeeds = prev.needs.filter((_, idx) => idx !== index);
      return {
        ...prev,
        needs: nextNeeds.length ? nextNeeds : [createEmptyRequestNeed()],
      };
    });
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

    const normalizedNeeds = form.needs
      .map((need) => ({
        ...need,
        item: need.item.trim(),
        quantity: need.quantity.trim(),
        urgency: need.urgency || "Normal",
      }))
      .filter((need) => need.item);

    if (!normalizedNeeds.length) {
      setNotification({ error: "List at least one requested item." });
      return;
    }

    for (const need of normalizedNeeds) {
      const qtyValue = Number(need.quantity);
      if (Number.isNaN(qtyValue) || qtyValue <= 0) {
        setNotification({ error: "Requested quantities must be greater than zero." });
        return;
      }
      need.quantity = qtyValue.toString();
    }

    const numberOfPeopleValue = Number(form.numberOfPeople);
    if (Number.isNaN(numberOfPeopleValue) || numberOfPeopleValue <= 0) {
      setNotification({ error: "Number of people must be greater than zero." });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      request_id: editingId ?? generateRequestId(),
      title: form.requestTitle.trim(),
      community_name: form.communityName.trim(),
      recipient_address: form.recipientAddress.trim(),
      expected_delivery: new Date(form.expectedDelivery).toISOString(),
      people_count: numberOfPeopleValue,
      contact_phone: form.contactPhone.trim(),
      notes: form.notes.trim(),
      items: normalizedNeeds.map((need) => ({
        need_id: need.id,
        item: need.item,
        quantity: Number(need.quantity),
        urgency: need.urgency,
      })),
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
        needs: result.items.map((item) => ({
          id: item.need_id,
          item: item.item,
          quantity: item.quantity.toString(),
          urgency: item.urgency,
        })),
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
      needs: request.needs.map((need) => ({
        ...need,
        id: need.id ?? createRequestNeedId(),
      })),
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
      <div className="rounded-[32px] border border-[#F3C7A0] bg-[#FFF6EE] p-8 shadow-2xl shadow-[#F2C08F]/35">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#D77B28]">
              Recipient request
            </p>
            <h2 className="text-3xl font-semibold text-gray-900">
              {editingId ? "Update donation request" : "Manual request for support"}
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

          <div className="space-y-4 rounded-2xl border border-[#F4D8C0] bg-white p-4">
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

          <div className="space-y-4 rounded-2xl border border-[#F4D8C0] bg-white p-4">
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

          <div className="space-y-4 rounded-2xl border border-[#F4D8C0] bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Requested items</p>
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-wide text-[#C46A24]"
                onClick={handleAddNeed}
              >
                + Add need
              </button>
            </div>

            {form.needs.map((need, index) => (
              <div
                key={need.id}
                className="grid gap-3 rounded-2xl border border-dashed border-[#F3C7A0] bg-[#FFF8F4] p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Need #{index + 1}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-500 underline-offset-2 hover:underline"
                    onClick={() => handleRemoveNeed(index)}
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      Item description
                    </label>
                    <input
                      type="text"
                      className={INPUT_STYLES}
                      placeholder="e.g. ready-to-eat meals"
                      value={need.item}
                      onChange={(event) =>
                        handleNeedChange(index, "item", event.target.value)
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
                      className={INPUT_STYLES}
                      value={need.quantity}
                      onChange={(event) =>
                        handleNeedChange(index, "quantity", event.target.value)
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      Urgency
                    </label>
                    <select
                      className={INPUT_STYLES}
                      value={need.urgency}
                      onChange={(event) =>
                        handleNeedChange(index, "urgency", event.target.value)
                      }
                    >
                      <option>Normal</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
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
            <p className="text-sm font-semibold text-[#D77B28]">
              {notification.message}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-[#E48A3A] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#D37623] disabled:opacity-60 transition"
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
                className="rounded-2xl border border-[#F4C7A0] px-6 py-3 text-sm font-semibold text-gray-600 transition hover:border-[#E48A3A]"
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-5 rounded-[32px] border border-[#F3C7A0] bg-white p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#D77B28]">
              Manual requests
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
                className="rounded-2xl border border-[#F3C7A0] bg-[#FFF7EF] p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#D77B28]">
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
                  <div className="rounded-2xl bg-white/80 p-3 text-sm text-gray-700">
                    <p className="text-xs uppercase tracking-wide text-[#C46A24]">
                      Recipient address
                    </p>
                    <p className="font-semibold">
                      {request.recipientAddress || "Not provided"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3 text-sm text-gray-700">
                    <p className="text-xs uppercase tracking-wide text-[#C46A24]">
                      Contact phone
                    </p>
                    <p className="font-semibold">
                      {request.contactPhone || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {request.needs.map((need) => (
                    <div
                      key={need.id}
                      className="flex flex-wrap items-center justify-between rounded-2xl border border-[#F3C7A0] bg-white/90 px-4 py-2 text-sm text-gray-700"
                    >
                      <div>
                        <p className="font-semibold">{need.item}</p>
                        <p className="text-xs text-gray-500">
                          {need.quantity} unit(s)
                        </p>
                      </div>
                      <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      need.urgency === "Critical"
                        ? "bg-[#FDECEA] text-[#B42318]"
                        : need.urgency === "High"
                          ? "bg-[#FFEAD1] text-[#B45B1F]"
                          : "bg-[#FFF3E6] text-[#C25D16]",
                    ].join(" ")}
                  >
                    {need.urgency}
                  </span>
                    </div>
                  ))}
                </div>

                {request.notes && (
                  <p className="mt-4 text-xs italic text-gray-500">{request.notes}</p>
                )}

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                  className="rounded-full border border-[#F3C7A0] px-4 py-2 text-xs font-semibold text-[#C46A24] transition hover:bg-[#FFF1E3]"
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
  const [requests, setRequests] = useState<DonationRequestApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [staffInputs, setStaffInputs] = useState<Record<string, { deliveredQty: string; notes: string }>>({});

  const [pickupForm, setPickupForm] = useState({
    deliveryId: generateDeliveryId(),
    donationId: "",
    warehouseId: "",
    communityId: "",
    userId: "",
    pickupTime: "",
    dropoffTime: "02:00:00",
  });

  const [distributionForm, setDistributionForm] = useState({
    deliveryId: generateDeliveryId(),
    donationId: "",
    warehouseId: "",
    communityId: "",
    userId: "",
    pickupTime: "",
    dropoffTime: "03:00:00",
    requestItemId: "",
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
      const requestData = await apiFetch<DonationRequestApiRecord[]>(API_PATHS.donationRequests);
      setRequests(requestData);
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
        delivery_id: form.deliveryId || generateDeliveryId(),
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
        if (distForm.requestItemId) {
          payload.request_item = distForm.requestItemId;
        }
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
          deliveryId: generateDeliveryId(),
          donationId: "",
          warehouseId: "",
          communityId: "",
          userId: "",
          pickupTime: "",
          dropoffTime: "02:00:00",
        });
      } else {
        setDistributionForm({
          deliveryId: generateDeliveryId(),
          donationId: "",
          warehouseId: "",
          communityId: "",
          userId: "",
          pickupTime: "",
          dropoffTime: "03:00:00",
          requestItemId: "",
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
                  value={distributionForm.requestItemId}
                  onChange={(e) =>
                    setDistributionForm((prev) => ({ ...prev, requestItemId: e.target.value }))
                  }
                >
                  <option value="">Select request item (optional)</option>
                  {requests.flatMap((req) =>
                    req.items.map((item) => (
                      <option key={item.need_id} value={item.need_id}>
                        {req.community_name} • {item.item} ({item.quantity})
                      </option>
                    ))
                  )}
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
      onModeChange("login");
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
  const [activeTab, setActiveTab] = useState(1); // which Part is active
  const [showAuthModal, setShowAuthModal] = useState(false); // whether popup is visible
  const [authMode, setAuthMode] = useState<AuthMode>("signup"); // current auth tab
  const [currentUser, setCurrentUser] = useState<LoggedUser | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const navItems: NavItem[] = currentUser?.isAdmin
    ? [
        { id: 3, label: "Dashboard", icon: <span aria-hidden>🛠️</span> },
        { id: 4, label: "Delivery", icon: <span aria-hidden>🚚</span> },
      ]
    : currentUser?.isDeliveryStaff
      ? [{ id: 4, label: "Delivery board", icon: <span aria-hidden>🚚</span> }]
      : [
          { id: 1, label: "Donate", icon: <span aria-hidden>💚</span> },
          { id: 2, label: "Request food", icon: <span aria-hidden>🍽️</span> },
        ];

  const normalizedActiveTab = useMemo(() => {
    if (!currentUser && activeTab > 2) {
      return 1;
    }
    if (currentUser?.isAdmin && activeTab < 3) {
      return 3;
    }
    if (!currentUser?.isAdmin && currentUser?.isDeliveryStaff && activeTab < 4) {
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
          setActiveTab(1);
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
