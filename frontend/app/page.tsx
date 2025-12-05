"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const getCurrentTimestamp = () => new Date().toISOString();

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
function TabContent({ tab }: { tab: number }) {
  if (tab === 1) {
    return <DonationSection />;
  }
  if (tab === 2) {
    return <DonationRequestSection />;
  }

  return (
    <div className="rounded-xl bg-[#FBFBFE] p-10 shadow text-center">
      <h1 className="text-3xl font-bold text-gray-900">Part {tab}</h1>
      <p className="mt-3 text-gray-600">
        จับฉ่าย จับฉ่าย จับฉ่าย จับฉ่าย จับฉ่าย จับฉ่าย จับฉ่าย
      </p>
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

          <div className="rounded-2xl border border-[#F3C7A0] bg-[#FFF7EF] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C46A24]">
              Community details
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
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

          <div className="rounded-2xl border border-[#F3C7A0] bg-[#FFF7EF] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C46A24]">
              Recipient details
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
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

          <div className="space-y-4 rounded-2xl border border-[#F4C7A0] bg-[#FFF7EF] p-4">
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
                className="grid gap-3 rounded-2xl border border-dashed border-[#F3C7A0] bg-[#FFF9F2] p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#C46A24]">
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
              className="rounded-2xl bg-[#E48A3A] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#D37623] disabled:opacity-60"
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
                className="rounded-2xl border border-[#F4C7A0] px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E48A3A]"
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
  const [activeTab, setActiveTab] = useState(1);          // which Part is active
  const [showAuthModal, setShowAuthModal] = useState(false); // whether popup is visible
  const [authMode, setAuthMode] = useState<AuthMode>("signup"); // current auth tab
  const [currentUser, setCurrentUser] = useState<LoggedUser | null>(null);

  return (
    <main className="relative flex min-h-screen items-start bg-[#EEE3D2]">
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
      <section className="relative flex-1 h-screen overflow-y-auto p-8">
        <TabContent tab={activeTab} />

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
            onAuthSuccess={setCurrentUser}
          />
        )}
      </section>
    </main>
  );
}
