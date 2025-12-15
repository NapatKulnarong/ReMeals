"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import {
  HeartIcon,
  MapIcon,
  ArchiveBoxIcon,
  ShoppingBagIcon,
  HomeIcon,
  DevicePhoneMobileIcon,
  WrenchScrewdriverIcon,
  InboxIcon,
  TruckIcon,
  ChartBarIcon,
  UserIcon,
  ClockIcon,
  FireIcon,
  DocumentTextIcon,
  BellAlertIcon,
} from "@heroicons/react/24/solid";

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
  restaurant_id?: string;
  restaurant_name?: string;
  branch?: string;
  restaurant_address?: string;
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
  restaurantId?: string;
  restaurantName?: string;
  branch?: string;
  restaurantAddress?: string;
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
  ownerUserId?: string | null;
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

// Restaurant suggestion types removed — suggestion UI trimmed in this branch.

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
  ownerUserId?: string | null;
};

type DonationApiRecord = {
  donation_id: string;
  donated_at: string;
  status: "pending" | "accepted" | "declined";
  restaurant: string;
  restaurant_name?: string;
  restaurant_branch?: string;
  restaurant_address?: string;
  created_by_user_id?: string;
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
  category?: string | null;
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
  created_by_user_id?: string | null;
};

type Warehouse = {
  warehouse_id: string;
  address: string;
  capacity: number;
  stored_date: string;
  exp_date: string;
};

const BANGKOK_METRO_LOCATIONS = [
  "bangkok",
  "pathum thani",
  "nonthaburi",
  "samut prakan",
  "samut sakhon",
  "nakhon pathom",
  "ayutthaya",
];

const isBangkokMetroArea = (address: string) => {
  const normalized = address.toLowerCase();
  return BANGKOK_METRO_LOCATIONS.some((keyword) => normalized.includes(keyword));
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
  donation_id?: string | null;
  community_id?: string | null;
  status: "pending" | "in_transit" | "delivered" | "cancelled";
  notes?: string;
  food_item?: string | null;
  delivery_quantity?: string | null;
};

type ImpactRecord = {
  impact_id: string;
  meals_saved: number;
  weight_saved_kg: number;
  co2_reduced_kg: number;
  impact_date: string;
  food: string;
};

type LooseImpactRecord = {
  impact_id?: string;
  pk?: string;
  id?: string;
  meals_saved?: number | string;
  weight_saved_kg?: number | string;
  co2_reduced_kg?: number | string;
  impact_date?: string;
  food?: string;
};

// Interactive Weekly Meals Chart Component
function WeeklyMealsChart({ data }: { data: Array<{ weekKey: string; meals: number; co2: number; startDate: Date; endDate: Date }> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; week: string; meals: number } | null>(null);

  const maxMeals = Math.max(...data.map(d => d.meals), 1);
  const chartHeight = 280;
  const chartPadding = { top: 20, right: 20, bottom: 40, left: 90 };
  const barSpacing = 5;
  const availableWidth = 800;
  const barWidth = Math.max(32, Math.min(60, (availableWidth - chartPadding.left - chartPadding.right - (data.length - 1) * barSpacing) / data.length));
  const chartWidth = data.length * (barWidth + barSpacing) + chartPadding.left + chartPadding.right;

  const formatWeekLabel = (startDate: Date, endDate: Date) => {
    const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  const handleBarHover = (e: React.MouseEvent<SVGRectElement>, index: number, week: string, meals: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredIndex(index);
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 15,
      week,
      meals,
    });
  };

  const handleBarLeave = () => {
    setHoveredIndex(null);
    setTooltip(null);
  };

  return (
    <div className="relative">
      {tooltip && (
        <div
          className="fixed z-50 rounded-lg bg-white px-3 py-2 text-xs shadow-lg pointer-events-none border border-gray-200 h-[60px] flex flex-col justify-center"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-8px',
          }}
        >
          <div className="font-semibold mb-1 text-[#d48a68] text-sm leading-tight">{tooltip.week}</div>
          <div className="text-[#d48a68] opacity-75 text-xs leading-tight whitespace-nowrap">{tooltip.meals.toLocaleString()} meals saved</div>
        </div>
      )}

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-[280px]"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7BA061" stopOpacity="1" />
              <stop offset="100%" stopColor="#4E673E" stopOpacity="1" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - chartPadding.bottom - (chartHeight - chartPadding.top - chartPadding.bottom) * ratio;
            const value = Math.round(maxMeals * ratio);
            return (
              <g key={ratio}>
                <line
                  x1={chartPadding.left}
                  y1={y}
                  x2={chartWidth - chartPadding.right}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                <text
                  x={chartPadding.left - 25}
                  y={y + 4}
                  fontSize="12"
                  fill="#6B7280"
                  textAnchor="end"
                  style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}
                >
                  {value.toLocaleString()}
                </text>
              </g>
            );
          })}

          {data.map((week, index) => {
            const barHeight = ((week.meals / maxMeals) * (chartHeight - chartPadding.top - chartPadding.bottom));
            const x = chartPadding.left + index * (barWidth + barSpacing);
            const y = chartHeight - chartPadding.bottom - barHeight;
            const isHovered = hoveredIndex === index;

            return (
              <g key={week.weekKey}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={isHovered ? "#A8B99A" : "#d48a68"}
                  rx="4"
                  ry="4"
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    filter: isHovered ? "url(#glow)" : "none",
                    transform: isHovered ? "scale(1.05)" : "scale(1)",
                    transformOrigin: `${x + barWidth / 2}px ${chartHeight - chartPadding.bottom}px`,
                  }}
                  onMouseEnter={(e) => handleBarHover(e, index, formatWeekLabel(week.startDate, week.endDate), week.meals)}
                  onMouseLeave={handleBarLeave}
                />

                {barHeight > 20 && !isHovered && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    fontSize="11"
                    fill="#d48a68"
                    textAnchor="middle"
                    fontWeight="600"
                    className="pointer-events-none"
                  >
                    {week.meals.toLocaleString()}
                  </text>
                )}

                {index % Math.ceil(data.length / 8) === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - chartPadding.bottom + 20}
                    fontSize="10"
                    fill="#6B7280"
                    textAnchor="middle"
                    className="pointer-events-none"
                    style={{ letterSpacing: '0.02em' }}
                  >
                    {week.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </text>
                )}
              </g>
            );
          })}

          <line
            x1={chartPadding.left}
            y1={chartHeight - chartPadding.bottom}
            x2={chartWidth - chartPadding.right}
            y2={chartHeight - chartPadding.bottom}
            stroke="#D1D5DB"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
}

// Interactive Cumulative CO₂ Reduction Chart Component
function CO2TrendChart({ data }: { data: Array<{ weekKey: string; co2: number; startDate: Date; endDate: Date }> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; week: string; co2: number } | null>(null);
  const [animatedIndex, setAnimatedIndex] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [visiblePoint, setVisiblePoint] = useState<number | null>(null);

  // Calculate cumulative CO₂ values
  const cumulativeData = useMemo(() => {
    let cumulative = 0;
    return data.map((week) => {
      cumulative += week.co2;
      return {
        ...week,
        cumulativeCO2: cumulative,
      };
    });
  }, [data]);

  const maxCO2 = Math.max(...cumulativeData.map(d => d.cumulativeCO2), 1);
  const chartHeight = 280;
  const chartPadding = { top: 20, right: 5, bottom: 40, left: 0 };
  const containerLeftPadding = 24; // px-6 = 24px, matches title padding
  const yAxisLabelOffset = containerLeftPadding; // Align y-axis with title text start
  const chartWidth = Math.max(600, data.length * 50 + yAxisLabelOffset + chartPadding.right);

  const formatWeekLabel = (startDate: Date, endDate: Date) => {
    const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  const calculatePoints = () => {
    const step = (chartWidth - yAxisLabelOffset - chartPadding.right) / Math.max(cumulativeData.length - 1, 1);
    return cumulativeData.map((week, index) => {
      const x = yAxisLabelOffset + index * step;
      const y = chartHeight - chartPadding.bottom - ((week.cumulativeCO2 / maxCO2) * (chartHeight - chartPadding.top - chartPadding.bottom));
      return { x, y, ...week, index };
    });
  };

  const points = calculatePoints();

  // Animation effect
  useEffect(() => {
    if (!isAnimating || points.length === 0) {
      // When animation completes, show all points
      if (points.length > 0) {
        setAnimatedIndex(points.length - 1);
        setVisiblePoint(null);
      }
      return;
    }

    // const pointDelay = 200; // Time between each point in ms (unused)
    const pointShowDuration = 150; // Show point for 150ms
    const pointHideDuration = 50; // Hide point for 50ms before next

    let currentIndex = 0;
    let timeoutId: NodeJS.Timeout;

    const animateNext = () => {
      if (currentIndex >= points.length) {
        setIsAnimating(false);
        setAnimatedIndex(points.length - 1);
        setVisiblePoint(null);
        return;
      }

      // Show the point and update line
      setVisiblePoint(currentIndex);
      setAnimatedIndex(currentIndex);

      // Hide the point after showing it
      timeoutId = setTimeout(() => {
        setVisiblePoint(null);

        // Move to next point
        timeoutId = setTimeout(() => {
          currentIndex++;
          animateNext();
        }, pointHideDuration);
      }, pointShowDuration);
    };

    // Start animation after a brief delay
    timeoutId = setTimeout(animateNext, 300);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAnimating, points.length]);

  const handlePointHover = (e: React.MouseEvent<SVGElement>, point: typeof points[0]) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredIndex(point.index);
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      week: formatWeekLabel(point.startDate, point.endDate),
      co2: point.cumulativeCO2,
    });
  };

  const handlePointLeave = () => {
    setHoveredIndex(null);
    setTooltip(null);
  };

  // Create animated path that only shows up to animatedIndex
  const animatedPathData = points.length > 1 && animatedIndex >= 0
    ? `M ${points.slice(0, animatedIndex + 1).map(p => `${p.x},${p.y}`).join(' L ')}`
    : '';

  // const pathData = points.length > 1
  //   ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
  //   : ''; // unused

  // const areaPath = points.length > 1
  //   ? `M ${points[0].x} ${chartHeight - chartPadding.bottom} L ${pathData.replace('M ', '')} L ${points[points.length - 1].x} ${chartHeight - chartPadding.bottom} Z`
  //   : ''; // unused

  const animatedAreaPath = points.length > 1 && animatedIndex >= 0 && animatedPathData
    ? `M ${points[0].x} ${chartHeight - chartPadding.bottom} L ${animatedPathData.replace('M ', '')} L ${points[Math.min(animatedIndex, points.length - 1)].x} ${chartHeight - chartPadding.bottom} Z`
    : '';

  const xAxisStartX = yAxisLabelOffset;
  const xAxisEndX = chartWidth - chartPadding.right;

  return (
    <div className="relative">
      {tooltip && (
        <div
          className="fixed z-50 rounded-lg bg-white px-3 py-2 text-xs shadow-lg pointer-events-none border border-gray-200 h-[60px] flex flex-col justify-center"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold mb-1 text-[#d48a68] text-sm leading-tight">{tooltip.week}</div>
          <div className="text-[#d48a68] opacity-75 text-xs leading-tight whitespace-nowrap">{tooltip.co2.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg CO₂ reduced</div>
        </div>
      )}

      <div className="overflow-x-auto">
        <svg
          viewBox={`${-yAxisLabelOffset} 0 ${chartWidth + yAxisLabelOffset} ${chartHeight}`}
          className="w-full h-[280px]"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="co2AreaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="co2LineGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <filter id="co2Glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - chartPadding.bottom - (chartHeight - chartPadding.top - chartPadding.bottom) * ratio;
            const value = maxCO2 * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={yAxisLabelOffset}
                  y1={y}
                  x2={chartWidth - chartPadding.right}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                <text
                  x={yAxisLabelOffset - 10}
                  y={y + 4}
                  fontSize="12"
                  fill="#6B7280"
                  textAnchor="end"
                  style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}
                >
                  {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </text>
              </g>
            );
          })}

          {animatedAreaPath && (
            <path
              d={animatedAreaPath}
              fill="url(#co2AreaGradient)"
              className="transition-opacity duration-200"
              opacity={hoveredIndex !== null ? 0.5 : 0.3}
            />
          )}

          {animatedPathData && (
            <path
              d={animatedPathData}
              fill="none"
              stroke="url(#co2LineGradient)"
              strokeWidth="2.5"
              className="transition-all duration-200"
              style={{
                filter: hoveredIndex !== null ? "url(#co2Glow)" : "none",
                strokeDasharray: isAnimating ? 'none' : 'none',
              }}
            />
          )}

          {points.map((point, idx) => {
            const isHovered = hoveredIndex === point.index;
            // const isVisible = !isAnimating || (visiblePoint === idx) || (idx <= animatedIndex && !isAnimating); // unused
            // const shouldShow = idx <= animatedIndex && (visiblePoint === idx || !isAnimating); // unused

            return (
              <g key={point.weekKey}>
                {/* Invisible larger clickable area */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="30"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={(e) => handlePointHover(e, point)}
                  onMouseLeave={handlePointLeave}
                />
                {/* Visible data point circle - only show if animation reached this point */}
                {idx <= animatedIndex && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isHovered ? "5" : "4"}
                    fill={isHovered ? "#F59E0B" : "#D97706"}
                    stroke="white"
                    strokeWidth="2"
                    className="transition-all duration-200 pointer-events-none"
                    style={{
                      filter: isHovered ? "url(#co2Glow)" : "none",
                      opacity: visiblePoint === idx ? 1 : (isAnimating && idx < animatedIndex ? 0 : 1),
                    }}
                  />
                )}

                {idx % Math.ceil(cumulativeData.length / 8) === 0 && (
                  <text
                    x={point.x}
                    y={chartHeight - chartPadding.bottom + 20}
                    fontSize="10"
                    fill="#6B7280"
                    textAnchor="middle"
                    className="pointer-events-none"
                    style={{ letterSpacing: '0.02em' }}
                  >
                    {point.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </text>
                )}
              </g>
            );
          })}

          <line
            x1={xAxisStartX}
            y1={chartHeight - chartPadding.bottom}
            x2={xAxisEndX}
            y2={chartHeight - chartPadding.bottom}
            stroke="#D1D5DB"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
}

const normalizeImpactData = (raw: unknown): ImpactRecord[] => {
  // Handle paginated response
  let data: ImpactRecord[] = [];
  if (Array.isArray(raw)) {
    data = raw;
  } else if (raw && typeof raw === "object") {
    const obj = raw as { results?: unknown; data?: unknown };
    if (Array.isArray(obj.results)) {
      data = obj.results;
    } else if (Array.isArray(obj.data)) {
      data = obj.data;
    }
  }

  return data.map((record: LooseImpactRecord) => {
    // Handle both 'impact_id' and 'pk' field names
    const impactId = record.impact_id ?? record.pk ?? record.id ?? "";

    return {
      impact_id: typeof impactId === "string" ? impactId : "",
      meals_saved: Number(record.meals_saved ?? 0),
      weight_saved_kg: Number(record.weight_saved_kg ?? 0),
      co2_reduced_kg: Number(record.co2_reduced_kg ?? 0),
      impact_date: record.impact_date ?? "",
      food: typeof record.food === "string" ? record.food : "",
    };
  });
};

// Popular suggestions & label formatter removed since suggestion UI is not active here.

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
  impact: "/impact/",
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

// Animated Number Component
function AnimatedNumber({ 
  value, 
  duration = 2000, 
  suffix = "",
  className = "",
  decimals = 1 
}: { 
  value: number; 
  duration?: number; 
  suffix?: string;
  className?: string;
  decimals?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(value);

  useEffect(() => {
    // If value is 0, reset displayValue asynchronously to avoid setState in effect
    if (value === 0) {
      // Initialize display value
      if (displayValue !== 0) {
        setDisplayValue(0);
      }
      return;
    }

    prevValueRef.current = value;

    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = value * easeOutQuart;

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {displayValue.toLocaleString(undefined, { maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

// Community Impact Heat Map Component
function CommunityImpactHeatMap({
  impactRecords,
  foodItems,
  deliveries,
  communities,
  loading
}: {
  impactRecords: ImpactRecord[];
  foodItems: FoodItemApiRecord[];
  deliveries: DeliveryRecordApi[];
  communities: Community[];
  loading: boolean;
}) {
  const [hoveredCell, setHoveredCell] = useState<{ community: string; month: string } | null>(null);

  // Normalize food ID to match format (FOO0000001)
  const normalizeFoodId = (foodId: string | number | null | undefined): string => {
    if (!foodId) return "";
    const foodIdStr = String(foodId);
    if (foodIdStr.startsWith("FOO")) {
      const digits = foodIdStr.replace(/\D/g, '');
      return digits ? `FOO${digits.padStart(7, '0')}` : foodIdStr;
    }
    const digits = foodIdStr.replace(/\D/g, '');
    if (!digits) return foodIdStr;
    return `FOO${digits.padStart(7, '0')}`;
  };

  // Build data maps
  const communityMonthMap = useMemo(() => {
    const map = new Map<string, number>();

    const foodToDelivery = new Map<string, DeliveryRecordApi[]>();
    deliveries.forEach(delivery => {
      if (delivery.delivery_type === "distribution" && delivery.food_item && delivery.status === "delivered") {
        const normalizedFoodId = normalizeFoodId(delivery.food_item);
        if (!foodToDelivery.has(normalizedFoodId)) {
          foodToDelivery.set(normalizedFoodId, []);
        }
        foodToDelivery.get(normalizedFoodId)!.push(delivery);
      }
    });

    impactRecords.forEach(impact => {
      const normalizedFoodId = normalizeFoodId(impact.food);
      const distributionDeliveries = foodToDelivery.get(normalizedFoodId) || [];
      if (distributionDeliveries.length === 0) return;

      let totalQuantity = 0;
      const deliveryQuantities = new Map<string, number>();
      
      distributionDeliveries.forEach(delivery => {
        if (delivery.delivery_quantity) {
          const quantityMatch = delivery.delivery_quantity.match(/^(\d+(?:\.\d+)?)/);
          if (quantityMatch) {
            const qty = parseFloat(quantityMatch[1]);
            deliveryQuantities.set(delivery.delivery_id, qty);
            totalQuantity += qty;
          }
        }
      });

      const distributeEqually = totalQuantity === 0;
      const divisor = distributeEqually ? distributionDeliveries.length : totalQuantity;

      distributionDeliveries.forEach(delivery => {
        if (delivery.community_id && delivery.dropoff_time) {
          const deliveryDate = new Date(delivery.dropoff_time);
          const monthKey = `${deliveryDate.getFullYear()}-${String(deliveryDate.getMonth() + 1).padStart(2, '0')}`;
          
          const key = `${delivery.community_id}|${monthKey}`;
          const current = map.get(key) || 0;
          
          const deliveryQty = distributeEqually 
            ? 1 
            : (deliveryQuantities.get(delivery.delivery_id) || 0);
          const proportionalImpact = (impact.meals_saved || 0) * (deliveryQty / divisor);
          
          map.set(key, current + proportionalImpact);
        }
      });
    });

    return map;
  }, [impactRecords, deliveries]);

  const { uniqueCommunities, uniqueMonths } = useMemo(() => {
    const communitiesSet = new Set<string>();
    const monthsSet = new Set<string>();

    communityMonthMap.forEach((_, key) => {
      const [communityId, monthKey] = key.split('|');
      if (communityId) communitiesSet.add(communityId);
      if (monthKey) monthsSet.add(monthKey);
    });

    return {
      uniqueCommunities: Array.from(communitiesSet).sort(),
      uniqueMonths: Array.from(monthsSet).sort()
    };
  }, [communityMonthMap]);

  const { communityTotals, monthTotals, grandTotal } = useMemo(() => {
    const commTotals = new Map<string, number>();
    const monthTotalsMap = new Map<string, number>();
    let total = 0;

    communityMonthMap.forEach((value, key) => {
      const [communityId, monthKey] = key.split('|');
      total += value;
      
      if (communityId) {
        commTotals.set(communityId, (commTotals.get(communityId) || 0) + value);
      }
      if (monthKey) {
        monthTotalsMap.set(monthKey, (monthTotalsMap.get(monthKey) || 0) + value);
      }
    });

    return {
      communityTotals: commTotals,
      monthTotals: monthTotalsMap,
      grandTotal: total
    };
  }, [communityMonthMap]);

  const maxValue = useMemo(() => {
    if (communityMonthMap.size === 0) return 1;
    return Math.max(...Array.from(communityMonthMap.values()));
  }, [communityMonthMap]);

  const getColorIntensity = (value: number): string => {
    if (maxValue === 0) return 'bg-gray-100';
    const intensity = value / maxValue;
    if (intensity >= 0.8) return 'bg-[#d48a68]';
    if (intensity >= 0.6) return 'bg-[#E09A7A]';
    if (intensity >= 0.4) return 'bg-[#ECAA8C]';
    if (intensity >= 0.2) return 'bg-[#F8BA9E]';
    return 'bg-[#FFD4C0]';
  };

  const formatMonthLabel = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getCommunityName = (communityId: string): string => {
    const community = communities.find(c => c.community_id === communityId);
    return community?.name || communityId;
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-600">Loading community impact data...</p>
      </div>
    );
  }

  if (uniqueCommunities.length === 0 || uniqueMonths.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-600">No community impact data available yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-xs font-semibold text-gray-700 border-b border-gray-200">
                Community
              </th>
              {uniqueMonths.map(month => (
                <th
                  key={month}
                  className="px-3 py-3 text-center text-xs font-semibold text-gray-700 border-b border-gray-200 min-w-[80px]"
                >
                  {formatMonthLabel(month)}
                </th>
              ))}
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 border-b border-gray-200 bg-gray-50 min-w-[80px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {uniqueCommunities.map(communityId => {
              const communityName = getCommunityName(communityId);
              return (
                <tr key={communityId} className="hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-100">
                    {communityName}
                  </td>
                  {uniqueMonths.map(month => {
                    const key = `${communityId}|${month}`;
                    const value = communityMonthMap.get(key) || 0;
                    const isHovered = hoveredCell?.community === communityId && hoveredCell?.month === month;
                    
                    return (
                      <td
                        key={month}
                        className={`px-3 py-3 text-center text-xs border-b border-gray-100 transition-all cursor-pointer ${getColorIntensity(value)} ${isHovered ? 'ring-2 ring-[#d48a68] ring-offset-1' : ''}`}
                        onMouseEnter={() => setHoveredCell({ community: communityId, month })}
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${communityName} - ${formatMonthLabel(month)}: ${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} meals saved`}
                      >
                        {value > 0 ? (
                          <span className="font-semibold text-gray-900">
                            {value >= 1 
                              ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
                              : value.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center text-xs border-b border-gray-100 bg-gray-50 font-semibold">
                    {(() => {
                      const commTotal = communityTotals.get(communityId) || 0;
                      return commTotal > 0 ? (
                        <span className="text-gray-900">
                          {commTotal >= 1 
                            ? commTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })
                            : commTotal.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-50 font-semibold">
              <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 border-t-2 border-gray-300">
                Total
              </td>
              {uniqueMonths.map(month => {
                const monthTotal = monthTotals.get(month) || 0;
                return (
                  <td
                    key={month}
                    className="px-3 py-3 text-center text-xs border-t-2 border-gray-300 bg-gray-50"
                  >
                    {monthTotal > 0 ? (
                      <span className="font-bold text-gray-900">
                        {monthTotal >= 1 
                          ? monthTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })
                          : monthTotal.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-3 text-center text-xs border-t-2 border-gray-300 bg-gray-50">
                <span className="font-bold text-gray-900">
                  {grandTotal >= 1 
                    ? grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : grandTotal.toFixed(1)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <span>Intensity:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-[#FFD4C0] border border-gray-300"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-[#ECAA8C] border border-gray-300"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-[#d48a68] border border-gray-300"></div>
            <span>High</span>
          </div>
        </div>
        <span>Hover over cells for details</span>
      </div>
    </div>
  );
}

// Home Page Component
function HomePage({
  setShowAuthModal,
  setAuthMode,
  currentUser
}: {
  setShowAuthModal: (show: boolean) => void;
  setAuthMode: (mode: AuthMode) => void;
  currentUser: LoggedUser | null;
}) {
  const [impactRecords, setImpactRecords] = useState<ImpactRecord[]>([]);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [donations, setDonations] = useState<DonationApiRecord[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItemApiRecord[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecordApi[]>([]);
  const [heatMapLoading, setHeatMapLoading] = useState(false);

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

  useEffect(() => {
    let ignore = false;
    async function loadImpact() {
      setImpactLoading(true);
      setImpactError(null);
      try {
        const candidates = [
          API_PATHS.impact,
          "/impact/",
        ];

        let loaded: ImpactRecord[] = [];
        let lastError: unknown = null;

        for (const path of candidates) {
          try {
            const raw = await apiFetch<unknown>(path);
            loaded = normalizeImpactData(raw);
            if (loaded.length) break;
          } catch (err) {
            lastError = err;
          }
        }

        if (!ignore) {
          if (!loaded.length && lastError) {
            throw lastError;
          }
          setImpactRecords(loaded);
        }
      } catch (err) {
        if (!ignore) {
          setImpactError(
            err instanceof Error ? err.message : "Unable to load impact data."
          );
        }
      } finally {
        if (!ignore) {
          setImpactLoading(false);
        }
      }
    }
    loadImpact();
    return () => {
      ignore = true;
    };
  }, []);

  // Load restaurants, donations, and food items for leaderboard
  useEffect(() => {
    let ignore = false;
    async function loadLeaderboardData() {
      try {
        const [restaurantsData, donationsData, foodItemsData] = await Promise.all([
          apiFetch<Restaurant[]>("/restaurants/").catch(() => []),
          apiFetch<DonationApiRecord[]>("/donations/").catch(() => []),
          apiFetch<FoodItemApiRecord[]>("/fooditems/").catch(() => []),
        ]);

        if (!ignore) {
          setRestaurants(restaurantsData);
          setDonations(donationsData);
          setFoodItems(foodItemsData);
        }
      } catch {
        // Silently fail - leaderboard is optional
      }
    }
    loadLeaderboardData();
    return () => {
      ignore = true;
    };
  }, []);

  // Load communities and deliveries for heat map
  useEffect(() => {
    let ignore = false;
    async function loadHeatMapData() {
      setHeatMapLoading(true);
      try {
        const [communitiesData, deliveriesData] = await Promise.all([
          apiFetch<Community[]>(API_PATHS.communities).catch(() => []),
          apiFetch<DeliveryRecordApi[]>(API_PATHS.deliveries, {
            headers: buildAuthHeaders(currentUser),
          }).catch(() => []),
        ]);

        if (!ignore) {
          setCommunities(communitiesData);
          setDeliveries(deliveriesData);
        }
      } catch {
        // Silently fail - heat map is optional
      } finally {
        if (!ignore) {
          setHeatMapLoading(false);
        }
      }
    }
    loadHeatMapData();
    return () => {
      ignore = true;
    };
  }, [currentUser]);

  const impactTotals = useMemo(() => {
    return impactRecords.reduce(
      (acc, record) => ({
        meals: acc.meals + (record.meals_saved || 0),
        weight: acc.weight + (record.weight_saved_kg || 0),
        co2: acc.co2 + (record.co2_reduced_kg || 0),
      }),
      { meals: 0, weight: 0, co2: 0 }
    );
  }, [impactRecords]);

  // Calculate weekly meals saved
  const weeklyMealsData = useMemo(() => {
    const weeks = new Map<string, { meals: number; co2: number; startDate: Date; endDate: Date }>();

    impactRecords.forEach(record => {
      const date = new Date(record.impact_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekKey = weekStart.toISOString().split('T')[0];

      const current = weeks.get(weekKey) || {
        meals: 0,
        co2: 0,
        startDate: weekStart,
        endDate: weekEnd
      };
      current.meals += record.meals_saved || 0;
      current.co2 += record.co2_reduced_kg || 0;
      weeks.set(weekKey, current);
    });

    return Array.from(weeks.entries())
      .map(([key, data]) => ({
        weekKey: key,
        ...data,
      }))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(-12); // Last 12 weeks
  }, [impactRecords]);

  // Helper to normalize food IDs
  const normalizeFoodId = (foodId: string): string => {
    if (!foodId) return foodId;
    const digits = foodId.replace(/\D/g, '');
    if (!digits) return foodId;
    return `FOO${digits.padStart(7, '0')}`;
  };

  // Calculate restaurant leaderboard
  const restaurantLeaderboard = useMemo(() => {
    if (!impactRecords.length) {
      return [];
    }

    if (!restaurants.length || !donations.length || !foodItems.length) {
      return [];
    }

    const restaurantMap = new Map(restaurants.map(r => [r.restaurant_id, r]));
    const donationMap = new Map(donations.map(d => [d.donation_id, d]));

    const foodItemMap = new Map<string, FoodItemApiRecord>();
    foodItems.forEach(f => {
      const foodId = f.food_id;
      if (foodId) {
        const normalized = normalizeFoodId(foodId);
        foodItemMap.set(normalized, f);
        foodItemMap.set(foodId, f);
      }
    });

    const restaurantImpact = new Map<string, { restaurantId: string; meals: number; weight: number; co2: number; name: string }>();

    impactRecords.forEach(impact => {
      const normalizedFoodId = normalizeFoodId(impact.food);
      const foodItem = foodItemMap.get(normalizedFoodId) || foodItemMap.get(impact.food);

      if (!foodItem) return;

      const donationId = foodItem.donation;
      if (!donationId) return;

      const donation = donationMap.get(donationId);
      if (!donation) return;

      const restaurantId = donation.restaurant;
      if (!restaurantId) return;

      const restaurant = restaurantMap.get(restaurantId);
      if (!restaurant) return;

      const restaurantName = donation.restaurant_name || restaurant.name ||
        (restaurant.branch_name ? `${restaurant.name || ''} - ${restaurant.branch_name}`.trim() : '') ||
        restaurant.restaurant_id;

      // Use a unique key that includes both restaurant ID and name to handle branches separately
      // This ensures branches of the same chain are shown separately if they have different names
      const uniqueKey = `${restaurantId}-${restaurantName}`;

      const current = restaurantImpact.get(uniqueKey) || {
        restaurantId: restaurantId,
        meals: 0,
        weight: 0,
        co2: 0,
        name: restaurantName,
      };

      current.meals += impact.meals_saved || 0;
      current.weight += impact.weight_saved_kg || 0;
      current.co2 += impact.co2_reduced_kg || 0;

      restaurantImpact.set(uniqueKey, current);
    });

    return Array.from(restaurantImpact.values())
      .sort((a, b) => b.meals - a.meals)
      .slice(0, 5); // Top 5 only
  }, [impactRecords, restaurants, donations, foodItems]);

  return (
    <div className="mx-auto w-full max-w-8xl space-y-8 mb-1">
      <div className="relative overflow-hidden rounded-[40px] bg-[#e8ede3] p-8 shadow-[0_40px_120px_-45px rgba(59,31,16,0.6)] sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-8 top-6 hidden h-64 w-64 rounded-[40px] bg-[#DEF7EA]/60 blur-3xl lg:block" />
        <div aria-hidden className="pointer-events-none absolute bottom-8 left-4 h-24 w-24 rounded-full bg-[#F1FBF5]/70 blur-2xl" />
        
        <div className="relative space-y-6 text-[#2C1A10]">
          <div className="relative flex items-center gap-5">
            {/* Spinning Logo in front of the text */}
            <div className="flex-shrink-0">
              <Image
                src="/elements/logo_re-meals_2.png"
                alt="Re-Meals Logo"
                width={96}
                height={96}
                className="h-20 w-20 sm:h-24 sm:w-24 object-contain opacity-90"
                style={{
                  animation: 'spin 5s linear infinite',
                }}
              />
            </div>
            <h1 className="text-[2.65rem] leading-tight text-[#3a3a3a] sm:text-[3.25rem] sm:leading-[1.1]">
              Redirect surplus meals.
              <br />
              <span className="text-[#708A58]">Rebuild communities.</span>
            </h1>
          </div>
          <p className="max-w-3xl text-lg text-[#5a4f45]">
            Re-Meals brings together restaurants, drivers, and community hearts to ensure no good meal goes to waste—and no neighbor goes without. Share what you have, ask for what you need, and help nourish the people around you.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className="flex items-center gap-3 rounded-full bg-[#708A58] px-5 py-3 pr-3 text-sm font-semibold text-white shadow hover:bg-[#576c45] transition"
              onClick={() => {
                setAuthMode("signup");
                setShowAuthModal(true);
              }}
              type="button"
            >
              Login / Sign up to donate or request
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                <svg
                  className="h-6 w-6 text-[#d48a68]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-[32px] bg-[#e8ede3] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#4E673E]">
              Impact dashboard
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Food rescued at a glance</h2>
            <p className="text-sm text-gray-600">
              Live from impact records: meals saved, weight diverted, and CO₂ reduced.
            </p>
          </div>
          <span className="rounded-full border border-[#A8B99A] bg-white px-3 py-1 text-xs font-semibold text-[#365032] shadow-sm">
            {impactRecords.length} records
          </span>
        </div>

        {impactError && (
          <p className="mt-3 rounded-xl border border-[#FDECEA] bg-[#FFF1F0] px-4 py-3 text-sm font-semibold text-[#B42318]">
            {impactError}
          </p>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {[
            { label: "Meals saved", value: impactTotals.meals, suffix: "", classes: "text-[#365032]" },
            { label: "Weight saved (kg)", value: impactTotals.weight, suffix: " kg", classes: "text-[#365032]" },
            { label: "CO₂ reduced (kg)", value: impactTotals.co2, suffix: " kg", classes: "text-[#d48a68]" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-dashed border-[#A8B99A] bg-white p-4 shadow-sm"
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${card.label === "CO₂ reduced (kg)" ? "text-[#d48a68]" : "text-[#708A58]"}`}>
                {card.label}
              </p>
              <p className={`text-3xl font-bold ${card.classes}`}>
                {impactLoading ? "…" : (
                  <AnimatedNumber 
                    value={card.value} 
                    suffix={card.suffix}
                    className={card.classes}
                    decimals={card.label === "Meals saved" ? 0 : 1}
                  />
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Top Restaurants and CO₂ Chart Row */}
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          {/* Top Restaurants Leaderboard - First visualization */}
          <div className="lg:col-span-2 rounded-2xl border border-[#F3C7A0] bg-[#FFF8F0] p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Impact Leaders</h3>
                <p className="text-xs text-gray-500 mt-0.5">Top performing restaurants</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#d48a68] border border-[#F3C7A0]">
                Top 5
              </span>
            </div>
            {impactLoading ? (
              <p className="text-sm text-gray-600">Loading leaderboard...</p>
            ) : restaurantLeaderboard.length === 0 ? (
              <p className="text-sm text-gray-600">No restaurant data available yet.</p>
            ) : (
              <div className="space-y-2">
                {restaurantLeaderboard.map((restaurant, index) => (
                  <div
                    key={restaurant.restaurantId}
                    className="rounded-xl border border-dashed border-[#F3C7A0] bg-white p-3 hover:bg-[#f9fff4]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3C7A0] text-sm font-bold text-[#B25C23]">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {restaurant.name}
                        </p>
                        <div className="mt-1 flex gap-4 text-xs text-gray-600">
                          <span className="font-semibold text-[#365032]">
                            {restaurant.meals.toLocaleString(undefined, { maximumFractionDigits: 0 })} meals
                          </span>
                          <span className="text-[#708A58]">
                            {restaurant.weight.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                          </span>
                          <span className="text-[#B25C23]">
                            {restaurant.co2.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg CO₂
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CO₂ Reduction Trend Chart */}
          <div className="lg:col-span-3 rounded-2xl border border-[#F3C7A0] bg-white shadow-sm">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cumulative CO₂ Reduction</h3>
                <p className="text-xs text-gray-500 mt-1">Hover over points to see details</p>
              </div>
              <span className="rounded-full bg-[#FFF4E6] px-3 py-1 text-[11px] font-semibold text-[#D97706]">
                Last {weeklyMealsData.length} weeks
              </span>
            </div>
            <div className="px-6 pb-6">
            {impactLoading ? (
              <p className="text-sm text-gray-600 py-8 text-center">Loading CO₂ data...</p>
            ) : weeklyMealsData.length === 0 ? (
              <p className="text-sm text-gray-600 py-8 text-center">No CO₂ data available yet.</p>
            ) : (
              <CO2TrendChart
                data={weeklyMealsData.map(({ weekKey, co2, startDate, endDate }) => ({
                  weekKey,
                  co2,
                  startDate,
                  endDate,
                }))}
              />
            )}
            </div>
          </div>
        </div>

        {/* Weekly Meals Saved Chart - Full Width */}
        <div className="mt-6">
          <div className="rounded-2xl border border-[#F3C7A0] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Weekly Meals Saved</h3>
                <p className="text-xs text-gray-500 mt-1">Hover over bars to see details</p>
              </div>
              <span className="rounded-full bg-[#FFF4E6] px-3 py-1 text-[11px] font-semibold text-[#D97706]">
                Last {weeklyMealsData.length} weeks
              </span>
            </div>
            {impactLoading ? (
              <p className="text-sm text-gray-600 py-8 text-center">Loading weekly data...</p>
            ) : weeklyMealsData.length === 0 ? (
              <p className="text-sm text-gray-600 py-8 text-center">No weekly data available yet.</p>
            ) : (
              <WeeklyMealsChart data={weeklyMealsData} />
            )}
          </div>
        </div>

        {/* Community Impact Heat Map */}
        <div className="mt-6">
          <div className="rounded-2xl border border-[#F3C7A0] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Community Impact Heat Map</h3>
                <p className="text-xs text-gray-500 mt-1">Meals saved by community and month</p>
              </div>
              <span className="rounded-full bg-[#E6F7EE] px-3 py-1 text-[11px] font-semibold text-[#2F855A]">
                {communities.length} communities
              </span>
            </div>
            <CommunityImpactHeatMap
              impactRecords={impactRecords}
              foodItems={foodItems}
              deliveries={deliveries}
              communities={communities}
              loading={heatMapLoading || impactLoading}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        <div className="rounded-[32px] bg-[#fde5d6] p-7 flex flex-col h-full min-h-0">
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
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex items-start gap-4 rounded-2xl border-2 border-dashed border-[#d48a68] bg-white p-4 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group">
              <HeartIcon className="w-8 h-8 text-[#d96688] flex-shrink-0 transition-transform group-hover:scale-125 group-active:scale-110" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-black/70">Smart item logging</p>
                <p className="text-sm text-black/70">
                  Capture portions, units, and expiry in seconds so we know what to rescue first.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border-2 border-dashed border-[#d48a68] bg-white p-4 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group">
              <MapIcon className="w-8 h-8 text-[#57b378] flex-shrink-0 transition-transform group-hover:scale-125 group-active:scale-110" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-black/70">Route-friendly pickups</p>
                <p className="text-sm text-black/70">
                  Drivers see your window and plan efficient routes to minimize food time in transit.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border-2 border-dashed border-[#d48a68] bg-white p-4 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group">
              <ArchiveBoxIcon className="w-8 h-8 text-[#d5a562] flex-shrink-0 transition-transform group-hover:scale-125 group-active:scale-110" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-black/70">Packaging guidance</p>
                <p className="text-sm text-black/70">
                  Tips for sealing, labeling, and keeping items cool before pickup arrives.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] bg-[#fde5d6] p-7 flex flex-col h-full min-h-0">
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
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-[#d48a68] bg-white p-4 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group">
              <DocumentTextIcon className="w-8 h-8 text-[#63b2d6] flex-shrink-0 transition-transform group-hover:scale-125 group-active:scale-110" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-black/70">Structured needs list</p>
                <p className="text-sm text-black/70">
                  Outline items, quantities, and urgency so matching stays accurate.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-[#d48a68] bg-white p-4 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group">
              <HomeIcon className="w-8 h-8 text-[#95745e] flex-shrink-0 transition-transform group-hover:scale-125 group-active:scale-110" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-black/70">Clear drop-off details</p>
                <p className="text-sm text-black/70">
                  Provide addresses, access notes, and an ideal delivery time for smooth arrivals.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-[#d48a68] bg-white p-4 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group">
              <BellAlertIcon className="w-8 h-8 text-[#bd444a] flex-shrink-0 transition-transform group-hover:scale-125 group-active:scale-110" aria-hidden="true" />
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
            <MapIcon className="w-5 h-5 text-[#57b378]" aria-hidden="true" />
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
    return <HomePage setShowAuthModal={setShowAuthModal} setAuthMode={setAuthMode} currentUser={currentUser} />;
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
    if (currentUser?.isDeliveryStaff && !currentUser?.isAdmin) {
      return <DeliveryStaffDashboard currentUser={currentUser} />;
    }
    if (currentUser?.isAdmin || currentUser?.isDeliveryStaff) {
      return <PickupToWarehouse currentUser={currentUser} />;
    }
    return <AccessDenied message="Delivery team access required." />;
  }
  if (tab === 6) {
    if (currentUser?.isDeliveryStaff && !currentUser?.isAdmin) {
      return <DeliveryStaffDashboard currentUser={currentUser} />;
    }
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
  if (tab === 7) {
    return <StatusSection currentUser={currentUser} setShowAuthModal={setShowAuthModal} setAuthMode={setAuthMode} />;
  }

  return (
    <div className="rounded-xl bg-[#FBFBFE] p-10 shadow text-center">
    </div>
  );
}

function DonationSection(props: {
  currentUser: LoggedUser | null;
  setShowAuthModal: (show: boolean) => void;
  setAuthMode: (mode: AuthMode) => void;
}) {
  const { currentUser } = props;
  const [form, setForm] = useState<DonationFormState>(createDonationFormState());
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification>({});
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationsError, setDonationsError] = useState<string | null>(null);


  const [deliveries, setDeliveries] = useState<DeliveryRecordApi[]>([]);
  const [deletingDonationId, setDeletingDonationId] = useState<string | null>(null);

  const prioritizeDonations = useCallback(
    (list: DonationRecord[]) => {
      const userId = currentUser?.userId;
      if (!list.length) {
        return list;
      }
      return [...list].sort((a, b) => {
        const aOwned = Boolean(userId && a.ownerUserId === userId);
        const bOwned = Boolean(userId && b.ownerUserId === userId);
        if (aOwned !== bOwned) {
          return aOwned ? -1 : 1;
        }
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        const safeATime = Number.isNaN(aTime) ? 0 : aTime;
        const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
        return safeBTime - safeATime;
      });
    },
    [currentUser?.userId]
  );

  const updateDonations = useCallback(
    (updater: (prev: DonationRecord[]) => DonationRecord[]) => {
      setDonations((prev) => prioritizeDonations(updater(prev)));
    },
    [prioritizeDonations]
  );

  useEffect(() => {
    setDonations((prev) => prioritizeDonations(prev));
  }, [prioritizeDonations]);

  // Auto-populate restaurant info from user profile when user changes
  useEffect(() => {
    if (currentUser) {
      setForm((prev) => ({
        ...prev,
        restaurantId: currentUser.restaurantId ?? "",
        restaurantName: currentUser.restaurantName ?? "",
        branch: currentUser.branch ?? "",
        restaurantAddress: currentUser.restaurantAddress ?? "",
      }));
    }
  }, [currentUser]);

  const loadDonationsData = useCallback(async () => {
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
      setDonations(
        prioritizeDonations(
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
            ownerUserId: donation.created_by_user_id ?? null,
          }))
        )
      );
    } catch (error) {
      setDonationsError(
        error instanceof Error ? error.message : "Unable to load donations"
      );
    }
  }, [prioritizeDonations]);

  useEffect(() => {
    let ignore = false;
    async function loadDonations() {
      setDonationsLoading(true);
      setDonationsError(null);
      try {
        await loadDonationsData();
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
  }, [loadDonationsData]);

  useEffect(() => {
    let ignore = false;
    async function loadDeliveries() {
      try {
        const deliveryData = await apiFetch<DeliveryRecordApi[]>(API_PATHS.deliveries, {
          headers: buildAuthHeaders(currentUser),
        });
        if (!ignore) {
          setDeliveries(deliveryData);
        }
      } catch {
        // Silently fail - deliveries are optional for this check
      }
    }

    if (currentUser) {
      loadDeliveries();
    }
    return () => {
      ignore = true;
    };
  }, [currentUser]);



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

    updateDonations((prev) =>
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
  }, [restaurants, donations, updateDonations]);

  const resetForm = () => {
    setForm(createDonationFormState());
    setEditingId(null);
    setNotification({});
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

    // Validate restaurant info from user profile
    if (!currentUser) {
      setNotification({ error: "Please log in to create donations." });
      return;
    }

    if (!currentUser.restaurantName && !currentUser.restaurantId) {
      setNotification({
        error: "Please set your restaurant information in Settings before creating donations.",
      });
      return;
    }

    const trimmedRestaurantName = form.restaurantName.trim() || currentUser.restaurantName || "";
    const branchValue = form.branch.trim() || currentUser.branch || "";
    const restaurantAddress = form.restaurantAddress.trim() || currentUser.restaurantAddress || "";

    if (!trimmedRestaurantName) {
      setNotification({
        error: "Restaurant name is required to create a donation. Please fill in the restaurant information above.",
      });
      return;
    }

    if (!restaurantAddress) {
      setNotification({
        error: "Restaurant address is required to create a donation. Please fill in the restaurant information above.",
      });
      return;
    }

    // Determine if using existing restaurant or manual entry
    const restaurantId = currentUser.restaurantId || form.restaurantId;
    const selectedRestaurant = restaurantId ? restaurants.find(r => r.restaurant_id === restaurantId) : null;
    const manualEntry = !selectedRestaurant || !restaurantId;

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
        await apiFetch(`/donations/${previousId}/`, {
          method: "DELETE",
          headers: buildAuthHeaders(currentUser),
        });
      }
      const donationPayload: Record<string, unknown> = {};
      if (!manualEntry && selectedRestaurant) {
        donationPayload.restaurant = selectedRestaurant.restaurant_id;
      } else {
        donationPayload.manual_restaurant_name = trimmedRestaurantName;
        donationPayload.manual_branch_name = branchValue;
        donationPayload.manual_restaurant_address = restaurantAddress;
      }
      const createdDonation = await apiFetch<DonationApiRecord>("/donations/", {
        method: "POST",
        body: JSON.stringify(donationPayload),
        headers: buildAuthHeaders(currentUser),
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
            headers: buildAuthHeaders(currentUser),
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

      // If user doesn't have restaurant info but filled it in the form, save it to their profile
      const shouldUpdateProfile = !currentUser.restaurantName && !currentUser.restaurantId && 
        (form.restaurantName.trim() || form.restaurantAddress.trim());
      
      if (shouldUpdateProfile && currentUser) {
        try {
          await apiFetch<{
            restaurant_id?: string;
            restaurant_name?: string;
            branch?: string;
            restaurant_address?: string;
          }>("/users/profile/", {
            method: "PATCH",
            headers: buildAuthHeaders(currentUser),
            body: JSON.stringify({
              restaurant_id: resolvedRestaurantId || undefined,
              restaurant_name: resolvedRestaurantName || undefined,
              branch: resolvedBranch || undefined,
              restaurant_address: resolvedAddress || undefined,
            }),
          });
          // Update currentUser state if onAuthSuccess callback exists
          // This will be handled by the parent component refreshing user data
        } catch (error) {
          console.error("Failed to update user profile with restaurant info:", error);
          // Don't block donation creation if profile update fails
        }
      }

      const nextDonation: DonationRecord = {
        id: donationId,
        restaurantId: resolvedRestaurantId,
        restaurantName: resolvedRestaurantName,
        restaurantAddress: resolvedAddress,
        branch: resolvedBranch,
        note: form.note.trim(),
        items: normalizedItems,
        createdAt: existingRecord?.createdAt ?? timestamp,
        ownerUserId: currentUser?.userId ?? existingRecord?.ownerUserId ?? null,
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

      updateDonations((prev) => {
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

  // Check if a donation has been assigned to a pickup delivery
  const isDonationAssigned = (donationId: string) => {
    return deliveries.some(
      (delivery) =>
        delivery.delivery_type === "donation" &&
        delivery.donation_id &&
        delivery.donation_id === donationId
    );
  };

  const canManageDonation = (donation: DonationRecord) => {
    // Admin can always manage
    if (currentUser?.isAdmin) {
      return true;
    }
    // Must be logged in
    if (!currentUser) {
      return false;
    }
    // Cannot manage if already assigned to a pickup task
    if (isDonationAssigned(donation.id)) {
      return false;
    }
    // If ownerUserId is not set, allow management for logged-in users (for legacy donations)
    if (!donation.ownerUserId) {
      return true;
    }
    // Must own the donation
    if (donation.ownerUserId !== currentUser.userId) {
      return false;
    }
    return true;
  };

  const canShowEditDeleteButtons = () => {
    // Show buttons if user is logged in
    // The buttons will be disabled if canManageDonation returns false
    return Boolean(currentUser);
  };

  // Filter donations: exclude assigned ones from the log (they'll show in Status section)
  // Also filter to only show current user's donations (unless admin)
  const unassignedDonations = donations.filter((donation) => {
    // Exclude if already assigned
    if (isDonationAssigned(donation.id)) {
      return false;
    }
    // Admin can see all donations
    if (currentUser?.isAdmin) {
      return true;
    }
    // For non-admin users, only show their own donations
    // If ownerUserId is not set (legacy donations), show them for logged-in users
    if (!donation.ownerUserId) {
      return Boolean(currentUser);
    }
    // Must be the owner
    return donation.ownerUserId === currentUser?.userId;
  });

  const handleEdit = (donation: DonationRecord) => {
    if (!canManageDonation(donation)) {
      if (isDonationAssigned(donation.id)) {
        setNotification({
          error: "This donation cannot be edited because it has already been assigned to a pickup task by the admin.",
        });
      } else {
        setNotification({
          error: "You can only edit donations that you created.",
        });
      }
      return;
    }
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
    if (!currentUser) {
      setNotification({
        error: "Please log in to delete donations.",
      });
      return;
    }

    const target = donations.find((donation) => donation.id === donationId);
    if (!target) {
      setNotification({
        error: "Donation not found.",
      });
      return;
    }

    // Check if assigned - this is the main blocker
    if (isDonationAssigned(donationId)) {
      setNotification({
        error: "This donation cannot be deleted because it has already been assigned to a pickup task by the admin.",
      });
      return;
    }

    // Check ownership only if ownerUserId is set
    if (target.ownerUserId && target.ownerUserId !== currentUser.userId && !currentUser.isAdmin) {
      setNotification({
        error: "You can only delete donations that you created.",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this donation? This action cannot be undone.")) {
      return;
    }

    setDeletingDonationId(donationId);
    try {
      await apiFetch(`/donations/${donationId}/`, {
        method: "DELETE",
        headers: buildAuthHeaders(currentUser),
      });

      // Reload donations from server to ensure UI is in sync
      await loadDonationsData();

      if (editingId === donationId) {
        resetForm();
      }

      setNotification({ message: "Donation removed from the list." });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to delete donation. Please try again.";
      setNotification({
        error: errorMessage,
      });
      console.error("Delete error:", error);
    } finally {
      setDeletingDonationId(null);
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
            {/* Restaurant Information - Allow filling if not set */}
            {currentUser && (currentUser.restaurantName || currentUser.restaurantId) ? (
              <div className="space-y-3 rounded-2xl border border-[#D7DCC7] bg-[#F4F7EF] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5E7A4A]">
                  Restaurant Information
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      Restaurant name
                    </label>
                    <div className="rounded-lg border border-[#D7DCC7] bg-white px-3 py-2 text-sm font-semibold text-gray-900">
                      {form.restaurantName || currentUser.restaurantName || "Not set"}
                    </div>
                  </div>
                  {form.branch || currentUser.branch ? (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Branch / location
                      </label>
                      <div className="rounded-lg border border-[#D7DCC7] bg-white px-3 py-2 text-sm font-semibold text-gray-900">
                        {form.branch || currentUser.branch || "—"}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Restaurant address
                  </label>
                  <div className="rounded-lg border border-[#D7DCC7] bg-white px-3 py-2 text-sm font-semibold text-gray-900">
                    {form.restaurantAddress || currentUser.restaurantAddress || "Not set"}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Restaurant information is linked to your account. Update it in Settings if needed.
                </p>
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-[#F3C7A0] bg-[#FFF8F0] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#B25C23]">
                  Restaurant Information
                </p>
                <p className="text-xs text-gray-600 mb-3">
                  To donate food, please provide your restaurant information. This will be saved to your profile for future donations.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Restaurant Name *
                    </label>
                    <input
                      type="text"
                      value={form.restaurantName}
                      onChange={(e) => setForm((prev) => ({ ...prev, restaurantName: e.target.value }))}
                      required
                      placeholder="e.g. KFC, McDonald's"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#d48a68] focus:ring-2 focus:ring-[#d48a68]/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Branch (optional)
                    </label>
                    <input
                      type="text"
                      value={form.branch}
                      onChange={(e) => setForm((prev) => ({ ...prev, branch: e.target.value }))}
                      placeholder="e.g. Central World, Siam Paragon"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#d48a68] focus:ring-2 focus:ring-[#d48a68]/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Restaurant Address *
                  </label>
                  <input
                    type="text"
                    value={form.restaurantAddress}
                    onChange={(e) => setForm((prev) => ({ ...prev, restaurantAddress: e.target.value }))}
                    required
                    placeholder="e.g. 123 Main Street, Bangkok"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#d48a68] focus:ring-2 focus:ring-[#d48a68]/20"
                  />
                </div>
              </div>
            )}

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

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
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
              </div>
              <div className="flex flex-wrap items-center gap-3">
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
            {unassignedDonations.length} total
          </span>
        </div>

        {currentUser && !currentUser.isAdmin && (
          <div className="mb-4 flex-shrink-0 rounded-xl border border-[#D7DCC7] bg-[#F4F7EF] p-3">
            <p className="text-xs text-gray-700 leading-relaxed">
              <span className="font-semibold">Note:</span> You can edit or delete your donations only if they haven&apos;t been assigned to a pickup task yet. Once the admin assigns your donation to a delivery staff, it can no longer be modified.
            </p>
          </div>
        )}

        {donationsError && (
          <p className="text-sm font-semibold text-red-500 mb-4 flex-shrink-0">{donationsError}</p>
        )}

        <div className="overflow-y-auto flex-1 min-h-0 pr-2">
          {donationsLoading ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-6 text-sm text-gray-500">
              Loading donations...
            </p>
          ) : unassignedDonations.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-6 text-sm text-gray-500">
              Once you save a donation, it shows up here for editing or delivery planning.
            </p>
          ) : (
            <div className="space-y-4">
              {unassignedDonations.map((donation) => (
                <article
                  key={donation.id}
                  className="rounded-2xl border border-dashed border-[#4d673f] bg-white/90 p-5 "
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
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
                    <div className="flex flex-col items-end gap-2">
                      {canShowEditDeleteButtons() && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={!canManageDonation(donation)}
                            className="rounded-lg bg-[#E6F4FF] p-2 text-[#1D4ED8] hover:bg-[#D0E7FF] disabled:opacity-60 disabled:cursor-not-allowed transition"
                            title="Edit donation"
                            onClick={() => handleEdit(donation)}
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            disabled={!canManageDonation(donation) || deletingDonationId === donation.id}
                            className="rounded-lg bg-[#FDECEA] p-2 text-[#B42318] hover:bg-[#FCD7D2] disabled:opacity-60 disabled:cursor-not-allowed transition"
                            title="Delete donation"
                            onClick={() => handleDelete(donation.id)}
                          >
                            {deletingDonationId === donation.id ? (
                              <svg
                                className="h-4 w-4 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                      <div className="text-right text-xs text-gray-500">
                        <p>{formatDisplayDate(donation.createdAt)} • {donation.items.length} item(s)</p>
                      </div>
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
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DonationRequestSection(props: {
  currentUser: LoggedUser | null;
  setShowAuthModal: (show: boolean) => void;
  setAuthMode: (mode: AuthMode) => void;
}) {
  const { currentUser } = props;
  const [form, setForm] = useState<DonationRequestForm>(createDonationRequestForm());
  const [requests, setRequests] = useState<DonationRequestRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification>({});
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryRecordApi[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);

  // Auto-populate contact phone from user profile
  useEffect(() => {
    if (currentUser?.phone) {
      setForm((prev) => ({
        ...prev,
        contactPhone: currentUser.phone || "",
      }));
    }
  }, [currentUser?.phone]);

  const prioritizeRequests = useCallback(
    (list: DonationRequestRecord[]) => {
      const userId = currentUser?.userId;
      if (!list.length) {
        return list;
      }
      return [...list].sort((a, b) => {
        const aOwned = Boolean(userId && a.ownerUserId === userId);
        const bOwned = Boolean(userId && b.ownerUserId === userId);
        if (aOwned !== bOwned) {
          return aOwned ? -1 : 1;
        }
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        const safeATime = Number.isNaN(aTime) ? 0 : aTime;
        const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
        return safeBTime - safeATime;
      });
    },
    [currentUser?.userId]
  );

  const canManageRequest = useCallback(
    (request: DonationRequestRecord) => {
      if (!currentUser) {
        return false;
      }
      if (currentUser.isAdmin) {
        return true;
      }
      return request.ownerUserId === currentUser.userId;
    },
    [currentUser]
  );

  useEffect(() => {
    setRequests((prev) => prioritizeRequests(prev));
  }, [prioritizeRequests]);

  useEffect(() => {
    let ignore = false;
    async function loadRequests() {
      setLoadingRequests(true);
      setRequestsError(null);
      try {
        const [requestData, deliveryData, communityData] = await Promise.all([
          apiFetch<DonationRequestApiRecord[]>("/donation-requests/", {
            headers: buildAuthHeaders(currentUser),
          }),
          apiFetch<DeliveryRecordApi[]>(API_PATHS.deliveries, {
            headers: buildAuthHeaders(currentUser),
          }),
          apiFetch<Community[]>(API_PATHS.communities),
        ]);
        if (!ignore) {
          setDeliveries(deliveryData);
          setCommunities(communityData);
          setRequests(
            prioritizeRequests(
              requestData.map((record) => ({
                id: record.request_id,
                requestTitle: record.title,
                communityName: record.community_name,
                numberOfPeople: String(record.people_count),
                expectedDelivery: record.expected_delivery,
                recipientAddress: record.recipient_address,
                contactPhone: record.contact_phone ?? "",
                notes: record.notes ?? "",
                createdAt: record.created_at,
                ownerUserId: record.created_by_user_id ?? null,
              }))
            )
          );
        }
      } catch (error) {
        if (!ignore) {
          setRequestsError(
            error instanceof Error ? error.message : "Unable to load requests"
          );
          setRequests([]);
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
  }, [currentUser, prioritizeRequests]);

  // Check if a request has been accepted (has a distribution delivery to its community)
  const isRequestAccepted = useCallback((request: DonationRequestRecord) => {
    const community = communities.find((c) => c.name === request.communityName);
    if (!community) {
      return false;
    }
    return deliveries.some(
      (delivery) =>
        delivery.delivery_type === "distribution" && delivery.community_id === community.community_id
    );
  }, [deliveries, communities]);

  // Filter out accepted requests (they'll show in Status section)
  const unacceptedRequests = useMemo(() => {
    return requests.filter((request) => !isRequestAccepted(request));
  }, [requests, isRequestAccepted]);

  const resetForm = () => {
    setForm(createDonationRequestForm());
    setEditingId(null);
    setNotification({});
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotification({});

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

    if (!currentUser) {
      setNotification({ error: "Login required to submit requests." });
      return;
    }

    setIsSubmitting(true);

    const computedTitle =
      form.requestTitle.trim() ||
      (form.communityName.trim() ? `${form.communityName.trim()} request` : "Meal request");

    const payload = {
      title: computedTitle,
      community_name: form.communityName.trim(),
      recipient_address: form.recipientAddress.trim(),
      expected_delivery: new Date(form.expectedDelivery).toISOString(),
      people_count: numberOfPeopleValue,
      contact_phone: currentUser.phone?.trim() || form.contactPhone.trim(),
      notes: form.notes.trim(),
    };

    try {
      const requestOptions = {
        body: JSON.stringify(payload),
        headers: buildAuthHeaders(currentUser),
      };
      const result = editingId
        ? await apiFetch<DonationRequestApiRecord>(`/donation-requests/${editingId}/`, {
          ...requestOptions,
          method: "PATCH",
        })
        : await apiFetch<DonationRequestApiRecord>("/donation-requests/", {
          ...requestOptions,
          method: "POST",
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
        ownerUserId: result.created_by_user_id ?? currentUser.userId ?? null,
      };

      setRequests((prev) =>
        prioritizeRequests(
          editingId
            ? prev.map((request) => (request.id === mapped.id ? mapped : request))
            : [mapped, ...prev]
        )
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
    if (!canManageRequest(request)) {
      setNotification({
        error: "You can only edit requests that you created.",
      });
      return;
    }
    setForm({
      requestTitle: request.requestTitle,
      communityName: request.communityName,
      numberOfPeople: request.numberOfPeople,
      expectedDelivery: toDateTimeLocalValue(request.expectedDelivery),
      recipientAddress: request.recipientAddress,
      contactPhone: currentUser?.phone || request.contactPhone || "",
      notes: request.notes,
    });
    setEditingId(request.id);
    setNotification({
      message: "Editing recipient request. Save or cancel to exit editing mode.",
    });
  };

  const handleDelete = async (target: DonationRequestRecord) => {
    if (!currentUser) {
      setNotification({ error: "Login required to delete requests." });
      return;
    }
    if (!canManageRequest(target)) {
      setNotification({
        error: "You can only delete requests that you created.",
      });
      return;
    }
    try {
      await apiFetch(`/donation-requests/${target.id}/`, {
        method: "DELETE",
        headers: buildAuthHeaders(currentUser),
      });
      setRequests((prev) =>
        prioritizeRequests(prev.filter((request) => request.id !== target.id))
      );
      if (editingId === target.id) {
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

            {/* Contact Phone - Auto-populated from user profile */}
            {currentUser?.phone && (
              <div className="rounded-2xl border border-[#F3C7A0] bg-[#FFF8F0] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#B25C23] mb-2">
                  Contact Information
                </p>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#B25C23]">
                    Contact phone
                  </label>
                  <div className="rounded-lg border border-[#F3C7A0] bg-white px-3 py-2 text-sm font-semibold text-[#B25C23]">
                    {currentUser.phone}
                  </div>
                  <p className="mt-2 text-xs text-[#B25C23]/70">
                    Phone number is linked to your account. Update it in Settings if needed.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Recipient address
              </label>
              <textarea
                className={`${INPUT_STYLES} min-h-[120px] resize-y`}
                placeholder="Delivery location, landmarks, access notes..."
                value={form.recipientAddress}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, recipientAddress: event.target.value }))
                }
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Additional notes (optional)
              </label>
              <textarea
                className={`${INPUT_STYLES} min-h-[120px] resize-y`}
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
            {unacceptedRequests.length} total
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
          ) : unacceptedRequests.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-6 text-sm text-gray-500">
              Captured requests will appear here for dispatch review.
            </p>
          ) : (
            <div className="space-y-4">
              {unacceptedRequests.map((request) => (
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
                      {currentUser?.userId && request.ownerUserId === currentUser.userId && (
                        <span className="mt-1 inline-flex rounded-full bg-[#B86A49]/10 px-2 py-0.5 text-xs font-semibold text-[#8B4513]">
                          Your request
                        </span>
                      )}
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
                        {currentUser?.phone || request.contactPhone || "N/A"}
                      </p>
                    </div>
                  </div>

                  {request.notes && (
                    <p className="mt-4 text-xs italic text-gray-500">{request.notes}</p>
                  )}

                  {canManageRequest(request) && (
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
                        onClick={() => handleDelete(request)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
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
    restaurant_id: user.restaurantId ?? "",
    restaurant_name: user.restaurantName ?? "",
    branch: user.branch ?? "",
    restaurant_address: user.restaurantAddress ?? "",
  });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantSelectionMode, setRestaurantSelectionMode] = useState<"existing" | "manual">(
    user.restaurantId ? "existing" : "manual"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load restaurants for dropdown
  useEffect(() => {
    let ignore = false;
    async function loadRestaurants() {
      try {
        const data = await apiFetch<Restaurant[]>("/restaurants/");
        if (!ignore) {
          setRestaurants(data);
        }
      } catch (error) {
        console.error("Failed to load restaurants:", error);
      }
    }
    loadRestaurants();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiFetch<{
        message: string;
        username: string;
        email: string;
        fname: string;
        lname: string;
        phone: string;
        restaurant_id?: string;
        restaurant_name?: string;
        branch?: string;
        restaurant_address?: string;
      }>("/users/profile/", {
        method: "PATCH",
        headers: buildAuthHeaders(user),
        body: JSON.stringify(form),
      });

      // Update local state with saved data
      onSave({
        username: response.username,
        email: response.email,
        fname: response.fname,
        lname: response.lname,
        phone: response.phone,
        restaurantId: response.restaurant_id ?? undefined,
        restaurantName: response.restaurant_name ?? undefined,
        branch: response.branch ?? undefined,
        restaurantAddress: response.restaurant_address ?? undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="w-full max-w-xl rounded-2xl border border-[#F3C7A0] bg-[#FFF8F0] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#B25C23]">Edit Profile</h3>
            <p className="text-xs text-gray-600">Update your personal information.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-[#B25C23] hover:text-[#8B4C1F] transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
            Profile updated successfully!
          </div>
        )}

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">First name</label>
              <input
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#d48a68] focus:ring-2 focus:ring-[#d48a68]/20"
                value={form.fname}
                onChange={(e) => setForm((prev) => ({ ...prev, fname: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Last name</label>
              <input
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#d48a68] focus:ring-2 focus:ring-[#d48a68]/20"
                value={form.lname}
                onChange={(e) => setForm((prev) => ({ ...prev, lname: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Username</label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#d48a68] focus:ring-2 focus:ring-[#d48a68]/20"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#d48a68] focus:ring-2 focus:ring-[#d48a68]/20"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Phone</label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#d48a68] focus:ring-2 focus:ring-[#d48a68]/20"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
        </div>

        {/* Restaurant Information Section */}
        <div className="mt-4 space-y-3 rounded-xl border border-[#F3C7A0] bg-[#FFF8F0] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#B25C23]">Restaurant Information</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRestaurantSelectionMode("existing");
                  setForm((prev) => ({ ...prev, restaurant_name: "", branch: "", restaurant_address: "" }));
                }}
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${restaurantSelectionMode === "existing"
                  ? "bg-[#d48a68] text-white"
                  : "bg-white text-[#d48a68] border border-[#d48a68]"
                  }`}
              >
                Select
              </button>
              <button
                type="button"
                onClick={() => {
                  setRestaurantSelectionMode("manual");
                  setForm((prev) => ({ ...prev, restaurant_id: "" }));
                }}
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${restaurantSelectionMode === "manual"
                  ? "bg-[#d48a68] text-white"
                  : "bg-white text-[#d48a68] border border-[#d48a68]"
                  }`}
              >
                Manual
              </button>
            </div>
          </div>

          {restaurantSelectionMode === "existing" ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Restaurant</label>
              <select
                value={form.restaurant_id || ""}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selected = restaurants.find(r => r.restaurant_id === selectedId);
                  setForm((prev) => ({
                    ...prev,
                    restaurant_id: selectedId,
                    restaurant_name: selected?.name || "",
                    branch: selected?.branch_name || "",
                    restaurant_address: selected?.address || "",
                  }));
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#d48a68] focus:ring-2 focus:ring-[#d48a68]/20"
              >
                <option value="">Choose a restaurant...</option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.restaurant_id} value={restaurant.restaurant_id}>
                    {restaurant.name} {restaurant.branch_name ? `(${restaurant.branch_name})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Restaurant Name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#d48a68] focus:ring-2 focus:ring-[#d48a68]/20"
                  value={form.restaurant_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, restaurant_name: e.target.value }))}
                  placeholder="e.g. KFC, McDonald's"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Branch (optional)</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#d48a68] focus:ring-2 focus:ring-[#d48a68]/20"
                  value={form.branch}
                  onChange={(e) => setForm((prev) => ({ ...prev, branch: e.target.value }))}
                  placeholder="e.g. Central World"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Restaurant Address</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#d48a68] focus:ring-2 focus:ring-[#d48a68]/20"
                  value={form.restaurant_address}
                  onChange={(e) => setForm((prev) => ({ ...prev, restaurant_address: e.target.value }))}
                  placeholder="Full address"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[#F3C7A0] bg-white px-4 py-2 text-sm font-semibold text-[#B25C23] hover:bg-[#FFF8F0] transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#d48a68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c47958] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save changes"}
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

function StatusSection({
  currentUser,
  setShowAuthModal,
  setAuthMode
}: {
  currentUser: LoggedUser | null;
  setShowAuthModal: (show: boolean) => void;
  setAuthMode: (mode: AuthMode) => void;
}) {
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [requests, setRequests] = useState<DonationRequestRecord[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecordApi[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and sort states
  const [donationStatusFilter, setDonationStatusFilter] = useState<string>("all");
  const [requestCommunityFilter, setRequestCommunityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [donationSort, setDonationSort] = useState<string>("newest");
  const [requestSort, setRequestSort] = useState<string>("newest");

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // Load donations
        const donationData = await apiFetch<DonationApiRecord[]>("/donations/");
        const donationsWithItems = await Promise.all(
          donationData.map(async (donation) => {
            const items = await apiFetch<FoodItemApiRecord[]>(
              `/fooditems/?donation=${donation.donation_id}`
            );
            return { donation, items };
          })
        );
        const mappedDonations: DonationRecord[] = donationsWithItems.map(({ donation, items }) => ({
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
          ownerUserId: donation.created_by_user_id ?? null,
        }));

        // Load requests
        const requestData = await apiFetch<DonationRequestApiRecord[]>("/donation-requests/", {
          headers: buildAuthHeaders(currentUser),
        });
        const mappedRequests: DonationRequestRecord[] = requestData.map((record) => ({
          id: record.request_id,
          requestTitle: record.title,
          communityName: record.community_name,
          numberOfPeople: String(record.people_count),
          expectedDelivery: record.expected_delivery,
          recipientAddress: record.recipient_address,
          contactPhone: record.contact_phone ?? "",
          notes: record.notes ?? "",
          createdAt: record.created_at,
          ownerUserId: record.created_by_user_id ?? null,
        }));

        // Load deliveries and communities
        const [deliveryData, communityData] = await Promise.all([
          apiFetch<DeliveryRecordApi[]>(API_PATHS.deliveries, {
            headers: buildAuthHeaders(currentUser),
          }),
          apiFetch<Community[]>(API_PATHS.communities),
        ]);

        if (!ignore) {
          setDonations(mappedDonations);
          setRequests(mappedRequests);
          setDeliveries(deliveryData);
          setCommunities(communityData);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Unable to load status data.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (currentUser) {
      loadData();
    }
    return () => {
      ignore = true;
    };
  }, [currentUser]);

  // Get assigned donations (donations with pickup deliveries) with their delivery info
  const assignedDonations = useMemo(() => {
    // Create a map of donation_id -> delivery for quick lookup
    const donationToDelivery = new Map<string, DeliveryRecordApi>();
    deliveries
      .filter((d) => d.delivery_type === "donation" && d.donation_id)
      .forEach((d) => {
        if (d.donation_id) {
          donationToDelivery.set(d.donation_id, d);
        }
      });

    return donations
      .filter((d) => {
        // Show if user owns it OR if ownerUserId is not set (legacy donations)
        if (d.ownerUserId && d.ownerUserId !== currentUser?.userId) {
          return false;
        }
        return donationToDelivery.has(d.id);
      })
      .map((d) => ({
        donation: d,
        delivery: donationToDelivery.get(d.id)!,
      }));
  }, [donations, deliveries, currentUser?.userId]);

  // Filter and sort assigned donations
  const filteredAndSortedDonations = useMemo(() => {
    let filtered = [...assignedDonations];

    // Status filter
    if (donationStatusFilter !== "all") {
      filtered = filtered.filter(({ delivery }) => delivery.status === donationStatusFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      filtered = filtered.filter(({ donation }) => {
        const donationDate = new Date(donation.createdAt);
        switch (dateFilter) {
          case "today":
            return donationDate >= today;
          case "week":
            return donationDate >= weekAgo;
          case "month":
            return donationDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (donationSort) {
        case "newest":
          return new Date(b.donation.createdAt).getTime() - new Date(a.donation.createdAt).getTime();
        case "oldest":
          return new Date(a.donation.createdAt).getTime() - new Date(b.donation.createdAt).getTime();
        case "restaurant_az":
          return a.donation.restaurantName.localeCompare(b.donation.restaurantName);
        case "restaurant_za":
          return b.donation.restaurantName.localeCompare(a.donation.restaurantName);
        case "items_desc":
          return b.donation.items.length - a.donation.items.length;
        case "items_asc":
          return a.donation.items.length - b.donation.items.length;
        default:
          return 0;
      }
    });

    return filtered;
  }, [assignedDonations, donationStatusFilter, dateFilter, donationSort]);

  // Get accepted requests (requests with distribution deliveries to their community)
  const acceptedRequests = useMemo(() => {
    // Get community IDs that have distribution deliveries
    const acceptedCommunityIds = new Set(
      deliveries
        .filter((d) => d.delivery_type === "distribution" && d.community_id)
        .map((d) => d.community_id)
    );

    // Map community names to IDs
    const communityNameToId = new Map(
      communities.map((c) => [c.name, c.community_id])
    );

    return requests.filter((r) => {
      if (!r.ownerUserId || r.ownerUserId !== currentUser?.userId) {
        return false;
      }
      const communityId = communityNameToId.get(r.communityName);
      return communityId ? acceptedCommunityIds.has(communityId) : false;
    });
  }, [requests, deliveries, communities, currentUser?.userId]);

  // Filter and sort accepted requests
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = [...acceptedRequests];

    // Community filter
    if (requestCommunityFilter !== "all") {
      filtered = filtered.filter((request) => request.communityName === requestCommunityFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      filtered = filtered.filter((request) => {
        const requestDate = new Date(request.createdAt);
        switch (dateFilter) {
          case "today":
            return requestDate >= today;
          case "week":
            return requestDate >= weekAgo;
          case "month":
            return requestDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (requestSort) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "community_az":
          return a.communityName.localeCompare(b.communityName);
        case "community_za":
          return b.communityName.localeCompare(a.communityName);
        case "people_desc":
          return parseInt(b.numberOfPeople) - parseInt(a.numberOfPeople);
        case "people_asc":
          return parseInt(a.numberOfPeople) - parseInt(b.numberOfPeople);
        default:
          return 0;
      }
    });

    return filtered;
  }, [acceptedRequests, requestCommunityFilter, dateFilter, requestSort]);

  // Get unique communities for filter dropdown
  const uniqueCommunities = useMemo(() => {
    return Array.from(new Set(acceptedRequests.map(r => r.communityName))).sort();
  }, [acceptedRequests]);

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Status</h2>
          <p className="mt-1 text-sm text-gray-600">
            View your donations and requests that have been assigned or accepted by the admin.
          </p>
        </div>
        <div className="rounded-2xl border border-[#F3C7A0] bg-[#FFF8F0] p-8 shadow-sm">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F3C7A0]">
              <svg
                className="h-8 w-8 text-[#B25C23]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sign in to view your status
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Log in or create an account to see your donation history, request status, and delivery updates.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                className="rounded-lg bg-[#d48a68] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c47958] shadow-sm"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setShowAuthModal(true);
                }}
                className="rounded-lg border border-[#d48a68] bg-white px-6 py-2.5 text-sm font-semibold text-[#d48a68] transition hover:bg-[#FFF8F0] shadow-sm"
              >
                Sign up
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-[#FBFBFE] p-10 shadow text-center">
        <p className="text-gray-600">Loading status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-[#FBFBFE] p-10 shadow text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const clearFilters = () => {
    setDonationStatusFilter("all");
    setRequestCommunityFilter("all");
    setDateFilter("all");
    setDonationSort("newest");
    setRequestSort("newest");
  };

  const hasActiveFilters = donationStatusFilter !== "all" || requestCommunityFilter !== "all" || dateFilter !== "all";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Status</h2>
        <p className="mt-1 text-sm text-gray-600">
          View your donations and requests that have been assigned or accepted by the admin.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="rounded-3xl border border-[#C7D2C0] bg-white p-5 shadow-inner shadow-[#C7D2C0]/40">
        <div className="flex flex-wrap items-center gap-4">
          {/* Donation Status Filter */}
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#4E673E]">Status:</label>
            <select
              value={donationStatusFilter}
              onChange={(e) => setDonationStatusFilter(e.target.value)}
              className="rounded-lg border border-[#A8B99A] bg-white px-3 py-1.5 text-xs font-semibold text-[#365032] focus:outline-none focus:ring-2 focus:ring-[#708A58]/20"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Community Filter */}
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#4E673E]">Community:</label>
            <select
              value={requestCommunityFilter}
              onChange={(e) => setRequestCommunityFilter(e.target.value)}
              className="rounded-lg border border-[#A8B99A] bg-white px-3 py-1.5 text-xs font-semibold text-[#365032] focus:outline-none focus:ring-2 focus:ring-[#708A58]/20"
            >
              <option value="all">All Communities</option>
              {uniqueCommunities.map((community) => (
                <option key={community} value={community}>
                  {community}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#4E673E]">Date:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-lg border border-[#A8B99A] bg-white px-3 py-1.5 text-xs font-semibold text-[#365032] focus:outline-none focus:ring-2 focus:ring-[#708A58]/20"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto rounded-lg border border-[#A8B99A] bg-white px-3 py-1.5 text-xs font-semibold text-[#365032] transition hover:bg-[#E9F1E3] hover:border-[#708A58]"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:h-[calc(100vh-15rem)]">
        {/* Assigned Donations */}
        <section className="flex h-full flex-col rounded-3xl border border-[#C7D2C0] bg-[#F4F7EF] p-6 shadow-inner shadow-[#C7D2C0]/40">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#4E673E]">
                Assigned Donations
              </p>
              <h3 className="text-xl font-semibold text-gray-900">
                Pickup tasks
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#A8B99A] bg-white px-3 py-1 text-xs font-semibold text-[#365032] shadow-sm">
                {filteredAndSortedDonations.length} {filteredAndSortedDonations.length === 1 ? 'item' : 'items'}
              </span>
              <select
                value={donationSort}
                onChange={(e) => setDonationSort(e.target.value)}
                className="rounded-lg border border-[#A8B99A] bg-white px-2 py-1 text-xs font-semibold text-[#365032] focus:outline-none focus:ring-2 focus:ring-[#708A58]/20"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="restaurant_az">Restaurant A-Z</option>
                <option value="restaurant_za">Restaurant Z-A</option>
                <option value="items_desc">Most Items</option>
                <option value="items_asc">Fewest Items</option>
              </select>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            {filteredAndSortedDonations.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#C7D2C0] bg-white p-4 text-sm text-gray-600">
                {assignedDonations.length === 0
                  ? "No donations have been assigned to pickup tasks yet."
                  : "No donations match your filters."}
              </p>
            ) : (
              filteredAndSortedDonations.map(({ donation, delivery }) => {
                const statusLabel = (status: DeliveryRecordApi["status"]) => {
                  switch (status) {
                    case "pending":
                      return { text: "Pending", className: "bg-[#E9F1E3] text-[#4E673E]" };
                    case "in_transit":
                      return { text: "In transit", className: "bg-[#E6F4FF] text-[#1D4ED8]" };
                    case "delivered":
                      return { text: "Delivered", className: "bg-[#E6F7EE] text-[#1F4D36]" };
                    case "cancelled":
                    default:
                      return { text: "Cancelled", className: "bg-[#FDECEA] text-[#B42318]" };
                  }
                };
                const status = statusLabel(delivery.status);

                return (
                  <article
                    key={donation.id}
                    className="rounded-2xl border border-dashed border-[#4d673f] bg-white p-4 shadow-sm"
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
                      <div className="flex items-center gap-2">
                        <div className="text-right text-xs text-gray-500">
                          <p>{formatDisplayDate(donation.createdAt)}</p>
                          <p>{donation.items.length} item(s)</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.text}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg border border-[#D7DCC7] bg-[#F7FBF6] p-2.5">
                      <p className="text-xs font-medium text-[#4B5F39]">
                        ✓ Assigned to pickup. Status:{" "}
                        <span className="font-semibold">{status.text}</span>
                      </p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* Accepted Requests */}
        <section className="flex h-full flex-col rounded-3xl border border-[#F3C7A0] bg-[#FFF8F0] p-6 shadow-inner shadow-[#F3C7A0]/30">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#C46A24]">
                Accepted Requests
              </p>
              <h3 className="text-xl font-semibold text-gray-900">
                Community deliveries
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#E6B9A2] bg-white px-3 py-1 text-xs font-semibold text-[#B25C23] shadow-sm">
                {filteredAndSortedRequests.length} {filteredAndSortedRequests.length === 1 ? 'item' : 'items'}
              </span>
              <select
                value={requestSort}
                onChange={(e) => setRequestSort(e.target.value)}
                className="rounded-lg border border-[#E6B9A2] bg-white px-2 py-1 text-xs font-semibold text-[#B25C23] focus:outline-none focus:ring-2 focus:ring-[#d48a68]/20"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="community_az">Community A-Z</option>
                <option value="community_za">Community Z-A</option>
                <option value="people_desc">Most People</option>
                <option value="people_asc">Fewest People</option>
              </select>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            {filteredAndSortedRequests.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#F3C7A0] bg-white p-4 text-sm text-gray-600">
                {acceptedRequests.length === 0
                  ? "No meal requests have been accepted yet."
                  : "No requests match your filters."}
              </p>
            ) : (
              filteredAndSortedRequests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-2xl border border-dashed border-[#F3C7A0] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        {request.id}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {request.requestTitle}
                      </p>
                      <p className="text-sm text-gray-500">{request.communityName}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>{formatDisplayDate(request.createdAt)}</p>
                      <p>{request.numberOfPeople} people</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-[#F3C7A0] bg-[#FFF3E7] p-2.5">
                    <p className="text-xs font-medium text-[#8B4C1F]">
                      ✓ This request has been accepted and assigned for delivery.
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function DeliveryStaffDashboard({ currentUser }: { currentUser: LoggedUser | null }) {
  const [deliveries, setDeliveries] = useState<DeliveryRecordApi[]>([]);
  const [donations, setDonations] = useState<Record<string, DonationApiRecord>>({});
  const [foodItems, setFoodItems] = useState<Record<string, FoodItemApiRecord[]>>({});
  const [warehouses, setWarehouses] = useState<Record<string, Warehouse>>({});
  const [communities, setCommunities] = useState<Record<string, Community>>({});
  const [staff, setStaff] = useState<DeliveryStaffInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [staffInputs, setStaffInputs] = useState<Record<string, { notes: string }>>({});

  // Filter states
  const [statusFilter, setStatusFilter] = useState<DeliveryRecordApi["status"] | "all">("all");
  const [staffFilter, setStaffFilter] = useState<string>("all"); // "all", "unassigned", or user_id
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "tomorrow" | "week">("all");

  const statusLabel = (status: DeliveryRecordApi["status"]) => {
    switch (status) {
      case "pending":
        return { text: "Pending", className: "bg-[#FFF1E3] text-[#C46A24]" };
      case "in_transit":
        return { text: "In transit", className: "bg-[#E6F4FF] text-[#1D4ED8]" };
      case "delivered":
        return { text: "Delivered", className: "bg-[#E6F7EE] text-[#1F4D36]" };
      default:
        return { text: "Unknown", className: "bg-gray-100 text-gray-600" };
    }
  };

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const deliveryData = await apiFetch<DeliveryRecordApi[]>(API_PATHS.deliveries, {
        headers: buildAuthHeaders(currentUser),
      });
      const warehouseData = await apiFetch<Warehouse[]>(API_PATHS.warehouses);
      const communityData = await apiFetch<Community[]>(API_PATHS.communities);
      const staffData = await apiFetch<DeliveryStaffInfo[]>(API_PATHS.deliveryStaff);

      const donationIds = Array.from(
        new Set(
          deliveryData
            .map((d) => d.donation_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      const donationDetails = await Promise.all(
        donationIds.map((id) =>
          apiFetch<DonationApiRecord>(`/donations/${id}/`).catch(() => null)
        )
      );

      const itemsByDonation: Record<string, FoodItemApiRecord[]> = {};
      for (const donationId of donationIds) {
        try {
          const items = await apiFetch<FoodItemApiRecord[]>(
            `/fooditems/?donation=${donationId}`
          );
          itemsByDonation[donationId] = items;
        } catch {
          itemsByDonation[donationId] = [];
        }
      }

      const donationMap: Record<string, DonationApiRecord> = {};
      donationDetails.forEach((detail) => {
        if (detail?.donation_id) {
          donationMap[detail.donation_id] = detail;
        }
      });

      const warehouseMap: Record<string, Warehouse> = {};
      warehouseData.forEach((w) => {
        warehouseMap[w.warehouse_id] = w;
      });
      const communityMap: Record<string, Community> = {};
      communityData.forEach((c) => {
        communityMap[c.community_id] = c;
      });

      setDeliveries(deliveryData);
      setDonations(donationMap);
      setFoodItems(itemsByDonation);
      setWarehouses(warehouseMap);
      setCommunities(communityMap);
      setStaff(staffData);

      const nextInputs: Record<string, { notes: string }> = {};
      deliveryData.forEach((d) => {
        nextInputs[d.delivery_id] = { notes: d.notes ?? "" };
      });
      setStaffInputs(nextInputs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load deliveries.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  // Helper function to extract area from address
  const extractArea = (address: string): string => {
    const lowerAddress = address.toLowerCase();
    if (lowerAddress.includes("bangkok central") || lowerAddress.includes("central bangkok")) return "Bangkok Central";
    if (lowerAddress.includes("samut prakan")) return "Samut Prakan";
    if (lowerAddress.includes("pathum thani")) return "Pathum Thani";
    if (lowerAddress.includes("nonthaburi")) return "Nonthaburi";
    if (lowerAddress.includes("bangkok")) return "Bangkok";
    return "Other";
  };

  // Get area for a delivery
  const getDeliveryArea = (delivery: DeliveryRecordApi): string => {
    if (delivery.community_id && communities[delivery.community_id]) {
      return extractArea(communities[delivery.community_id].address);
    }
    if (delivery.warehouse_id && warehouses[delivery.warehouse_id]) {
      return extractArea(warehouses[delivery.warehouse_id].address);
    }
    return "Other";
  };

  // Get unique areas from deliveries
  const uniqueAreas = useMemo(() => {
    const areas = new Set<string>();
    deliveries.forEach(d => {
      areas.add(getDeliveryArea(d));
    });
    return Array.from(areas).sort();
  }, [deliveries, communities, warehouses]);

  // Filter function
  const applyFilters = (delivery: DeliveryRecordApi): boolean => {
    // Status filter
    if (statusFilter !== "all" && delivery.status !== statusFilter) return false;

    // Staff filter
    if (staffFilter === "unassigned" && delivery.user_id) return false;
    if (staffFilter !== "all" && staffFilter !== "unassigned" && delivery.user_id !== staffFilter) return false;

    // Area filter
    if (areaFilter !== "all" && getDeliveryArea(delivery) !== areaFilter) return false;

    // Date filter
    if (dateFilter !== "all") {
      const pickupDate = new Date(delivery.pickup_time);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);

      if (dateFilter === "today") {
        const pickupDay = new Date(pickupDate);
        pickupDay.setHours(0, 0, 0, 0);
        if (pickupDay.getTime() !== today.getTime()) return false;
      } else if (dateFilter === "tomorrow") {
        const pickupDay = new Date(pickupDate);
        pickupDay.setHours(0, 0, 0, 0);
        if (pickupDay.getTime() !== tomorrow.getTime()) return false;
      } else if (dateFilter === "week") {
        if (pickupDate < today || pickupDate >= weekEnd) return false;
      }
    }

    return true;
  };

  const pickupTasks = useMemo(
    () =>
      deliveries
        .filter((d) => d.delivery_type === "donation")
        .filter(applyFilters)
        .sort((a, b) => new Date(a.pickup_time).getTime() - new Date(b.pickup_time).getTime()),
    [deliveries, statusFilter, staffFilter, areaFilter, dateFilter, communities, warehouses]
  );
  const distributionTasks = useMemo(
    () =>
      deliveries
        .filter((d) => d.delivery_type === "distribution")
        .filter(applyFilters)
        .sort((a, b) => new Date(a.pickup_time).getTime() - new Date(b.pickup_time).getTime()),
    [deliveries, statusFilter, staffFilter, areaFilter, dateFilter, communities, warehouses]
  );

  const formatFoodAmount = (donationId?: string | null) => {
    if (!donationId) return "No items";
    const items = foodItems[donationId] ?? [];
    if (!items.length) return "No items";
    const total = items.reduce(
      (sum, item) =>
        sum +
        (typeof item.quantity === "number" ? item.quantity : parseFloat(String(item.quantity)) || 0),
      0
    );
    const units = items.map((item) => item.unit).filter(Boolean);
    const uniqueUnits = [...new Set(units)];
    if (uniqueUnits.length === 1) {
      return `${total} ${uniqueUnits[0]}`;
    }
    return `${items.length} item(s)`;
  };

  const locationLabel = (delivery: DeliveryRecordApi) => {
    if (delivery.delivery_type === "donation") {
      const donation = delivery.donation_id ? donations[delivery.donation_id] : null;
      const restaurant = donation?.restaurant_name ?? "Restaurant";
      const branch = donation?.restaurant_branch ? ` (${donation.restaurant_branch})` : "";
      const warehouseId = warehouses[delivery.warehouse_id]?.warehouse_id ?? delivery.warehouse_id;
      const shortenWarehouseId = (id: string) => {
        const digits = id.replace(/\D/g, "");
        if (!digits) return id;
        const num = parseInt(digits, 10);
        return `WH${num.toString().padStart(3, "0")}`;
      };
      return {
        from: `${restaurant}${branch}`,
        to: `Warehouse ${shortenWarehouseId(warehouseId)}`,
      };
    }
    const warehouseId = warehouses[delivery.warehouse_id]?.warehouse_id ?? delivery.warehouse_id;
    const shortenWarehouseId = (id: string) => {
      const digits = id.replace(/\D/g, "");
      if (!digits) return id;
      const num = parseInt(digits, 10);
      return `WH${num.toString().padStart(3, "0")}`;
    };
    const warehouseName = shortenWarehouseId(warehouseId);
    const communityName = delivery.community_id
      ? (communities[delivery.community_id]?.name ?? delivery.community_id)
      : "Unknown community";
    return {
      from: `Warehouse ${warehouseName}`,
      to: communityName,
    };
  };

  const updateStatus = async (
    deliveryId: string,
    nextStatus: DeliveryRecordApi["status"]
  ) => {
    setUpdatingStatusId(deliveryId);
    setError(null);
    setNotice(null);
    try {
      const payload: Record<string, unknown> = { status: nextStatus };
      const note = staffInputs[deliveryId]?.notes;
      if (note) {
        payload.notes = note;
      }
      await apiFetch(`${API_PATHS.deliveries}${deliveryId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: buildAuthHeaders(currentUser),
      });
      setDeliveries((prev) =>
        prev.map((d) => (d.delivery_id === deliveryId ? { ...d, status: nextStatus } : d))
      );
      setNotice(`Updated ${deliveryId} to ${nextStatus.replace("_", " ")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const renderTaskCard = (delivery: DeliveryRecordApi) => {
    const isPickup = delivery.delivery_type === "donation";
    const status = statusLabel(delivery.status);
    const loc = locationLabel(delivery);
    const donation = delivery.donation_id ? donations[delivery.donation_id] : null;
    const items = delivery.donation_id ? foodItems[delivery.donation_id] ?? [] : [];

    return (
      <article
        key={delivery.delivery_id}
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1CBB5] text-[#8B4C1F]">
              {isPickup ? <InboxIcon className="w-6 h-6" aria-hidden="true" /> : <TruckIcon className="w-6 h-6" aria-hidden="true" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {isPickup ? "Pickup to warehouse" : "Deliver to community"}
              </p>
              <p className="text-xs text-gray-500">{delivery.delivery_id}</p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${status.className}`}
          >
            {status.text}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-700">
          <div className="col-span-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Route</p>
            <p className="font-semibold text-gray-900">
              {loc.from} <span className="text-gray-400">→</span> {loc.to}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Pickup time</p>
            <p className="font-semibold text-gray-900">{formatDisplayDate(delivery.pickup_time)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Food amount</p>
            <p className="font-semibold text-gray-900">
              {formatFoodAmount(delivery.donation_id ?? undefined)}
            </p>
          </div>
          {/* Pickup Address */}
          {isPickup && donation?.restaurant_address && (
            <div className="col-span-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Pickup address</p>
              <p className="font-medium text-gray-800">{donation.restaurant_address}</p>
            </div>
          )}
          {!isPickup && delivery.warehouse_id && warehouses[delivery.warehouse_id] && (
            <div className="col-span-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Pickup address</p>
              <p className="font-medium text-gray-800">{warehouses[delivery.warehouse_id].address}</p>
            </div>
          )}
          {/* Dropoff Address */}
          {isPickup && delivery.warehouse_id && warehouses[delivery.warehouse_id] && (
            <div className="col-span-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Dropoff address</p>
              <p className="font-medium text-gray-800">{warehouses[delivery.warehouse_id].address}</p>
            </div>
          )}
          {!isPickup && delivery.community_id && communities[delivery.community_id] && (
            <div className="col-span-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Dropoff address</p>
              <p className="font-medium text-gray-800">{communities[delivery.community_id].address}</p>
            </div>
          )}
          {isPickup && items.length > 0 && (
            <div className="col-span-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Items</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {items.map((item) => (
                  <span
                    key={item.food_id}
                    className="rounded-full border border-dashed border-gray-200 bg-[#F6FBF7] px-3 py-1 text-[11px] font-semibold text-[#2F855A]"
                  >
                    {item.name} · {item.quantity} {item.unit}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!isPickup && delivery.community_id && (
            <div className="col-span-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Community</p>
              <p className="font-medium text-gray-800">
                {(() => {
                  const communityName = communities[delivery.community_id]?.name ?? delivery.community_id;
                  return communityName;
                })()}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 space-y-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-700">
              Notes (optional)
            </label>
            <input
              type="text"
              className={INPUT_STYLES}
              value={staffInputs[delivery.delivery_id]?.notes ?? ""}
              onChange={(e) =>
                setStaffInputs((prev) => ({
                  ...prev,
                  [delivery.delivery_id]: { notes: e.target.value },
                }))
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {delivery.status === "pending" && (
              <button
                type="button"
                disabled={updatingStatusId === delivery.delivery_id}
                onClick={() => updateStatus(delivery.delivery_id, "in_transit")}
                className="rounded-lg bg-[#1D4ED8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#153EAE] disabled:opacity-60"
              >
                Start
              </button>
            )}
            {delivery.status === "in_transit" && (
              <button
                type="button"
                disabled={updatingStatusId === delivery.delivery_id}
                onClick={() => updateStatus(delivery.delivery_id, "delivered")}
                className="rounded-lg bg-[#2F8A61] px-3 py-2 text-xs font-semibold text-white hover:bg-[#25724F] disabled:opacity-60"
              >
                Mark as Delivered
              </button>
            )}
            {delivery.status === "delivered" && (
              <span className="text-xs font-semibold text-[#2F8A61]">✓ Completed</span>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#E6B9A2] bg-[#FFF7EF] px-6 py-5 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#C46A24]">
            Delivery board
          </p>
          <h2 className="text-2xl font-semibold text-gray-900">My assigned pickups & deliveries</h2>
          <p className="text-sm text-gray-600">
            Update status for everything assigned to you — from restaurant pickups to community drops.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadData()}
            className="rounded-xl border border-[#E6B9A2] bg-white px-4 py-2 text-sm font-semibold text-[#8B4C1F] hover:bg-[#F1CBB5]"
          >
            Refresh
          </button>
          <span className="text-xs text-gray-500">{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {error && <p className="rounded-xl bg-[#FDECEA] px-4 py-3 text-sm font-semibold text-[#B42318]">{error}</p>}
      {notice && <p className="rounded-xl bg-[#E6F7EE] px-4 py-3 text-sm font-semibold text-[#1F4D36]">{notice}</p>}

      {/* Filters Section */}
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        {/* Status Filter Badges */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Filter by Status</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                statusFilter === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                statusFilter === "pending"
                  ? "bg-[#FFF1E3] text-[#C46A24] ring-2 ring-[#C46A24]"
                  : "bg-[#FFF1E3] text-[#C46A24] hover:ring-2 hover:ring-[#C46A24]"
              }`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("in_transit")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                statusFilter === "in_transit"
                  ? "bg-[#E6F4FF] text-[#1D4ED8] ring-2 ring-[#1D4ED8]"
                  : "bg-[#E6F4FF] text-[#1D4ED8] hover:ring-2 hover:ring-[#1D4ED8]"
              }`}
            >
              In Transit
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("delivered")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                statusFilter === "delivered"
                  ? "bg-[#E6F7EE] text-[#1F4D36] ring-2 ring-[#1F4D36]"
                  : "bg-[#E6F7EE] text-[#1F4D36] hover:ring-2 hover:ring-[#1F4D36]"
              }`}
            >
              Delivered
            </button>
          </div>
        </div>

        {/* Date, Staff, and Area Filters */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Date Filter */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#8B4C1F] focus:outline-none focus:ring-2 focus:ring-[#8B4C1F]/20"
            >
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="week">This week</option>
            </select>
          </div>

          {/* Staff Filter */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Staff Assignment
            </label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#8B4C1F] focus:outline-none focus:ring-2 focus:ring-[#8B4C1F]/20"
            >
              <option value="all">All staff</option>
              <option value="unassigned">Unassigned</option>
              {staff.map((s) => (
                <option key={s.user_id} value={s.user_id}>
                  {s.name} ({s.assigned_area})
                </option>
              ))}
            </select>
          </div>

          {/* Area Filter */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Delivery Area
            </label>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#8B4C1F] focus:outline-none focus:ring-2 focus:ring-[#8B4C1F]/20"
            >
              <option value="all">All areas</option>
              {uniqueAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Count */}
        {(statusFilter !== "all" || staffFilter !== "all" || areaFilter !== "all" || dateFilter !== "all") && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
            <p className="text-xs text-gray-600">
              <span className="font-semibold">
                {pickupTasks.length + distributionTasks.length}
              </span>{" "}
              task(s) match your filters
            </p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setStaffFilter("all");
                setAreaFilter("all");
                setDateFilter("all");
              }}
              className="text-xs font-semibold text-[#8B4C1F] hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col rounded-3xl border border-[#CFE6D8] bg-[#F6FBF7] p-6 shadow-inner">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2F855A]">
                Pickups
              </p>
              <h3 className="text-xl font-semibold text-gray-900">
                Restaurant → Warehouse
              </h3>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2F855A] shadow-sm">
              {pickupTasks.length} tasks
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {loading ? (
              <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-600">
                Loading your pickups...
              </p>
            ) : pickupTasks.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-600">
                No pickups assigned to you yet.
              </p>
            ) : (
              pickupTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-3xl border border-[#E6B9A2] bg-[#FFF7EF] p-6 shadow-inner">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#C46A24]">
                Deliveries
              </p>
              <h3 className="text-xl font-semibold text-gray-900">
                Warehouse → Community
              </h3>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#C46A24] shadow-sm">
              {distributionTasks.length} tasks
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {loading ? (
              <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-600">
                Loading your deliveries...
              </p>
            ) : distributionTasks.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-600">
                No community deliveries assigned to you yet.
              </p>
            ) : (
              distributionTasks.map(renderTaskCard)
            )}
          </div>
        </div>
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
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [deletingDeliveryId, setDeletingDeliveryId] = useState<string | null>(null);

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
        } catch {
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

  const pickupTodayString = useMemo(() => new Date().toISOString().split("T")[0], []);

  const isPickupItemExpired = useCallback(
    (item: FoodItemApiRecord) => {
      if (item.is_expired) {
        return true;
      }
      if (!item.expire_date) {
        return false;
      }
      const normalized = item.expire_date.split("T")[0];
      if (!normalized) {
        return false;
      }
      return normalized < pickupTodayString;
    },
    [pickupTodayString]
  );

  const donationHasFreshFood = useCallback(
    (donationId: string) =>
      foodItems.some((item) => item.donation === donationId && !isPickupItemExpired(item)),
    [foodItems, isPickupItemExpired]
  );

  // Helper function to extract province from address
  const extractProvince = useCallback((address: string): string => {
    const lowerAddress = address.toLowerCase();
    if (lowerAddress.includes("phra nakhon si ayutthaya") || lowerAddress.includes("ayutthaya")) return "Phra Nakhon Si Ayutthaya";
    if (lowerAddress.includes("nakhon pathom")) return "Nakhon Pathom";
    if (lowerAddress.includes("samut sakhon")) return "Samut Sakhon";
    if (lowerAddress.includes("samut prakan")) return "Samut Prakan";
    if (lowerAddress.includes("pathum thani")) return "Pathum Thani";
    if (lowerAddress.includes("nonthaburi")) return "Nonthaburi";
    if (lowerAddress.includes("bangkok")) return "Bangkok";
    return "Other";
  }, []);

  // Helper to parse time string (HH:MM:SS) to milliseconds
  const parseTimeToMs = useCallback((timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    return (parts[0] * 60 * 60 + parts[1] * 60 + (parts[2] || 0)) * 1000;
  }, []);

  // Check if driver is available at the given pickup time
  const isDriverAvailable = useCallback((driverId: string, pickupTime: string): { available: boolean; reason?: string } => {
    const selectedStaff = staff.find(s => s.user_id === driverId);
    if (!selectedStaff) {
      return { available: false, reason: "Driver not found" };
    }

    // Check is_available field
    if (!selectedStaff.is_available) {
      return { available: false, reason: "Driver is not available" };
    }

    // Check for overlapping deliveries
    const pickupDateTime = new Date(pickupTime);
    const dropoffDuration = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    const dropoffDateTime = new Date(pickupDateTime.getTime() + dropoffDuration);

    const conflictingDelivery = deliveries.find(d => {
      if (d.user_id !== driverId || d.delivery_id === editingDeliveryId) return false;
      
      const existingPickup = new Date(d.pickup_time);
      const existingDropoffDuration = d.dropoff_time 
        ? parseTimeToMs(d.dropoff_time)
        : 2 * 60 * 60 * 1000; // Default 2 hours
      const existingDropoff = new Date(existingPickup.getTime() + existingDropoffDuration);

      // Check if times overlap
      return !(dropoffDateTime <= existingPickup || pickupDateTime >= existingDropoff);
    });

    if (conflictingDelivery) {
      return { 
        available: false, 
        reason: `Driver has a conflicting delivery at ${new Date(conflictingDelivery.pickup_time).toLocaleString()}` 
      };
    }

    return { available: true };
  }, [staff, deliveries, editingDeliveryId, parseTimeToMs]);

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

  const handleEditDelivery = (delivery: DeliveryRecordApi) => {
    setEditingDeliveryId(delivery.delivery_id);
    setPickupForm({
      donationId: delivery.donation_id || "",
      warehouseId: delivery.warehouse_id || "",
      userId: delivery.user_id || "",
      pickupTime: delivery.pickup_time ? toDateTimeLocalValue(delivery.pickup_time) : "",
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingDeliveryId(null);
    setPickupForm({
      donationId: "",
      warehouseId: "",
      userId: "",
      pickupTime: "",
    });
  };

  const handleDeleteDelivery = async (deliveryId: string) => {
    if (!confirm("Are you sure you want to delete this pickup task? This action cannot be undone.")) {
      return;
    }
    setDeletingDeliveryId(deliveryId);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`${API_PATHS.deliveries}${deliveryId}/`, {
        method: "DELETE",
        headers: buildAuthHeaders(currentUser),
      });
      setNotice("Pickup task deleted successfully.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete pickup task.");
    } finally {
      setDeletingDeliveryId(null);
    }
  };

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

      // Check driver availability
      const availability = isDriverAvailable(pickupForm.userId, pickupForm.pickupTime);
      if (!availability.available) {
        throw new Error(`Driver is not available: ${availability.reason}`);
      }

      // Check province match for donation type
      const selectedDonation = donations.find(d => d.donation_id === pickupForm.donationId);
      const selectedWarehouse = warehouses.find(w => w.warehouse_id === pickupForm.warehouseId);
      const selectedStaff = staff.find(s => s.user_id === pickupForm.userId);
      
      if (selectedDonation && selectedWarehouse && selectedStaff) {
        const restaurant = restaurants.find(r => r.restaurant_id === selectedDonation.restaurant);
        if (restaurant) {
          const pickupProvince = extractProvince(restaurant.address);
          const dropoffProvince = extractProvince(selectedWarehouse.address);
          
          // Check if provinces match
          if (pickupProvince !== dropoffProvince) {
            throw new Error(`Pickup and dropoff must be in the same province. Pickup: ${pickupProvince}, Dropoff: ${dropoffProvince}`);
          }

          // Check if driver's assigned area matches
          const driverProvince = selectedStaff.assigned_area;
          if (driverProvince && driverProvince !== pickupProvince && driverProvince !== "Bangkok" && pickupProvince !== "Bangkok") {
            // Allow DEL0000005 to handle both Bangkok and Ayutthaya
            if (!(selectedStaff.user_id === "DEL0000005" && (pickupProvince === "Bangkok" || pickupProvince === "Ayutthaya"))) {
              throw new Error(`Driver is assigned to ${driverProvince}, but delivery is in ${pickupProvince}`);
            }
          }
        }
      }
      const payload: Record<string, unknown> = {
        delivery_type: "donation",
        pickup_time: new Date(pickupForm.pickupTime).toISOString(),
        dropoff_time: "02:00:00",
        pickup_location_type: "restaurant",
        dropoff_location_type: "warehouse",
        warehouse_id: pickupForm.warehouseId,
        user_id: pickupForm.userId,
        donation_id: pickupForm.donationId,
      };

      if (editingDeliveryId) {
        // Update existing delivery
        await apiFetch(`${API_PATHS.deliveries}${editingDeliveryId}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          headers: buildAuthHeaders(currentUser),
        });
        setNotice("Pickup assignment updated.");
      } else {
        // Create new delivery
        payload.delivery_id = generateDeliveryId();
        await apiFetch(API_PATHS.deliveries, {
          method: "POST",
          body: JSON.stringify(payload),
          headers: buildAuthHeaders(currentUser),
        });
        setNotice("Pickup assignment saved.");
      }

      await loadData();
      setPickupForm({
        donationId: "",
        warehouseId: "",
        userId: "",
        pickupTime: "",
      });
      setEditingDeliveryId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save pickup assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  const visibleDeliveries = (canEdit
    ? deliveries
    : deliveries.filter((delivery) => delivery.user_id === currentUserId)
  )
    .filter((delivery) => delivery.delivery_type === "donation")
    .sort((a, b) => {
      const timeA = new Date(a.pickup_time).getTime();
      const timeB = new Date(b.pickup_time).getTime();
      return timeA - timeB; // Sort ascending (earliest first)
    });

  // Get donation IDs that are already assigned to pickup deliveries
  const assignedDonationIds = new Set(
    deliveries
      .filter((delivery) => delivery.delivery_type === "donation" && delivery.donation_id)
      .map((delivery) => delivery.donation_id!)
      .filter((id): id is string => Boolean(id))
  );

  // Filter donations to exclude those already assigned, but include the one being edited
  const availableDonations = donations.filter((donation) => {
    if (editingDeliveryId) {
      const editingDelivery = deliveries.find((d) => d.delivery_id === editingDeliveryId);
      if (editingDelivery?.donation_id === donation.donation_id) {
        return true;
      }
    }

    if (assignedDonationIds.has(donation.donation_id)) {
      return false;
    }

    return donationHasFreshFood(donation.donation_id);
  });

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
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {editingDeliveryId ? "Edit pickup task" : "Pickup to warehouse"}
                    </p>
                    {editingDeliveryId && (
                      <p className="text-xs text-gray-500 mt-1">Editing: {editingDeliveryId}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">From restaurant</span>
                </div>
                <div className="grid gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Select donation
                    </label>
                    <p className="text-xs text-gray-500 mb-1">
                      Donations with only expired food are hidden from this list.
                    </p>
                    <select
                      className={INPUT_STYLES}
                      value={pickupForm.donationId}
                      onChange={(e) => setPickupForm((prev) => ({ ...prev, donationId: e.target.value }))}
                    >
                      <option value="">Select donation</option>
                      {availableDonations.map((donation) => (
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
                      {warehouses.map((warehouse) => {
                        // Helper to shorten warehouse ID: WAH0000004 -> WH001
                        const shortenId = (id: string) => {
                          const digits = id.replace(/\D/g, "");
                          if (!digits) return id;
                          const num = parseInt(digits, 10);
                          return `WH${num.toString().padStart(3, "0")}`;
                        };
                        // Helper to remove postal code from address
                        const removePostalCode = (addr: string) => {
                          if (!addr) return addr;
                          return addr.replace(/\s*[,，]?\s*\d{5}\s*$/, "").trim();
                        };
                        return (
                          <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                            {shortenId(warehouse.warehouse_id)} — {removePostalCode(warehouse.address)}
                          </option>
                        );
                      })}
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
                          {member.name || member.username} {member.assigned_area ? `(${member.assigned_area})` : ''}
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
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleSubmitPickup}
                      className="flex-1 rounded-2xl bg-[#E48A3A] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#D37623] disabled:opacity-60 disabled:cursor-not-allowed transition"
                    >
                      {submitting
                        ? "Saving..."
                        : editingDeliveryId
                          ? "Update pickup assignment"
                          : "Save pickup assignment"}
                    </button>
                    {editingDeliveryId && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleCancelEdit}
                        className="rounded-2xl border border-[#F3C7A0] px-6 py-3 text-sm font-semibold text-[#8B4C1F] hover:bg-[#FFF1E3] disabled:opacity-60 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
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
            <div className="space-y-3">
              {visibleDeliveries.map((delivery) => (
                <div
                  key={delivery.delivery_id}
                  className="rounded-2xl border border-[#CFE6D8] bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6F7EE]">
                          <InboxIcon className="w-4 h-4 text-[#2F855A]" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">
                            Pickup to warehouse
                          </p>
                          <span className="text-[11px] font-medium text-[#2F855A] leading-tight">
                            {delivery.delivery_id}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusLabel(delivery.status).className}`}
                      >
                        {statusLabel(delivery.status).text}
                      </span>
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditDelivery(delivery)}
                            disabled={deletingDeliveryId === delivery.delivery_id}
                            className="rounded-lg bg-[#E6F4FF] p-1.5 text-[#1D4ED8] hover:bg-[#D0E7FF] disabled:opacity-60 transition"
                            title="Edit pickup task"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDelivery(delivery.delivery_id)}
                            disabled={deletingDeliveryId === delivery.delivery_id}
                            className="rounded-lg bg-[#FDECEA] p-1.5 text-[#B42318] hover:bg-[#FCD7D2] disabled:opacity-60 transition"
                            title="Delete pickup task"
                          >
                            {deletingDeliveryId === delivery.delivery_id ? (
                              <svg
                                className="h-3.5 w-3.5 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-100 pt-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 pt-0.5">
                        <ShoppingBagIcon className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-gray-500 leading-tight">Donation</p>
                        <p className="text-xs font-semibold text-gray-900 leading-tight truncate">
                          {delivery.donation_id && typeof delivery.donation_id === "string"
                            ? lookupRestaurantName(delivery.donation_id)
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 pt-0.5">
                        <FireIcon className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-gray-500 leading-tight">Food Amount</p>
                        <p className="text-xs font-semibold text-gray-900 leading-tight">
                          {delivery.donation_id && typeof delivery.donation_id === "string"
                            ? formatFoodAmount(delivery.donation_id)
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 pt-0.5">
                        <UserIcon className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-gray-500 leading-tight">Assigned Staff</p>
                        <p className="text-xs font-semibold text-gray-900 leading-tight truncate">
                          {lookupStaffName(delivery.user_id)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 pt-0.5">
                        <ArchiveBoxIcon className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-gray-500 leading-tight">Warehouse</p>
                        <p className="text-xs font-semibold text-gray-900 leading-tight">
                          {(() => {
                            const digits = delivery.warehouse_id.replace(/\D/g, "");
                            if (!digits) return delivery.warehouse_id;
                            const num = parseInt(digits, 10);
                            return `WH${num.toString().padStart(3, "0")}`;
                          })()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 col-span-2">
                      <div className="flex-shrink-0 pt-0.5">
                        <ClockIcon className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-gray-500 leading-tight">Pickup Time</p>
                        <p className="text-xs font-semibold text-gray-900 leading-tight">
                          {formatDisplayDate(delivery.pickup_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {!canEdit && (
                    <div className="space-y-2 mt-3 border-t border-gray-100 pt-3">
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
  const [warehouseInventory, setWarehouseInventory] = useState<FoodItemApiRecord[]>([]);
  const [selectedFoodItem, setSelectedFoodItem] = useState<string>(""); // food_id
  const [deliveryQuantity, setDeliveryQuantity] = useState<string>(""); // e.g., "15 kg", "8 bucket"
  const [foodItems, setFoodItems] = useState<FoodItemApiRecord[]>([]);

  const canEdit = currentUser?.isAdmin ?? false;
  const currentUserId = currentUser?.userId ?? "";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [warehouseData, communityData, staffData, deliveryData, foodItemsData] =
        await Promise.all([
          apiFetch<Warehouse[]>(API_PATHS.warehouses),
          apiFetch<Community[]>(API_PATHS.communities),
          apiFetch<DeliveryStaffInfo[]>(API_PATHS.deliveryStaff),
          apiFetch<DeliveryRecordApi[]>(API_PATHS.deliveries, {
            headers: buildAuthHeaders(currentUser),
          }),
          apiFetch<FoodItemApiRecord[]>("/fooditems/").catch(() => []),
        ]);
      setWarehouses(warehouseData);
      setCommunities(communityData);
      setStaff(staffData);
      setDeliveries(deliveryData);
      setFoodItems(foodItemsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load delivery data.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load warehouse inventory when warehouse is selected
  useEffect(() => {
    const loadInventory = async () => {
      if (!distributionForm.warehouseId) {
        setWarehouseInventory([]);
        setSelectedFoodItem("");
        setDeliveryQuantity("");
        return;
      }
      try {
        const response = await apiFetch<{ inventory: FoodItemApiRecord[] }>(
          `${API_PATHS.warehouses}${distributionForm.warehouseId}/inventory/`
        );
        setWarehouseInventory(response.inventory || []);
        setSelectedFoodItem("");
        setDeliveryQuantity("");
      } catch (err) {
        console.error("Failed to load warehouse inventory:", err);
        setWarehouseInventory([]);
      }
    };
    loadInventory();
  }, [distributionForm.warehouseId]);

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

  // Helper function to extract province from address
  const extractProvince = useCallback((address: string): string => {
    const lowerAddress = address.toLowerCase();
    if (lowerAddress.includes("phra nakhon si ayutthaya") || lowerAddress.includes("ayutthaya")) return "Phra Nakhon Si Ayutthaya";
    if (lowerAddress.includes("nakhon pathom")) return "Nakhon Pathom";
    if (lowerAddress.includes("samut sakhon")) return "Samut Sakhon";
    if (lowerAddress.includes("samut prakan")) return "Samut Prakan";
    if (lowerAddress.includes("pathum thani")) return "Pathum Thani";
    if (lowerAddress.includes("nonthaburi")) return "Nonthaburi";
    if (lowerAddress.includes("bangkok")) return "Bangkok";
    return "Other";
  }, []);

  // Helper to parse time string (HH:MM:SS) to milliseconds
  const parseTimeToMs = useCallback((timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    return (parts[0] * 60 * 60 + parts[1] * 60 + (parts[2] || 0)) * 1000;
  }, []);

  // Check if driver is available at the given pickup time
  const isDriverAvailable = useCallback((driverId: string, pickupTime: string): { available: boolean; reason?: string } => {
    const selectedStaff = staff.find(s => s.user_id === driverId);
    if (!selectedStaff) {
      return { available: false, reason: "Driver not found" };
    }

    // Check is_available field
    if (!selectedStaff.is_available) {
      return { available: false, reason: "Driver is not available" };
    }

    // Check for overlapping deliveries
    const pickupDateTime = new Date(pickupTime);
    const dropoffDuration = 3 * 60 * 60 * 1000; // 3 hours in milliseconds (distribution default)
    const dropoffDateTime = new Date(pickupDateTime.getTime() + dropoffDuration);

    const conflictingDelivery = deliveries.find(d => {
      if (d.user_id !== driverId) return false;
      
      const existingPickup = new Date(d.pickup_time);
      const existingDropoffDuration = d.dropoff_time 
        ? parseTimeToMs(d.dropoff_time)
        : 3 * 60 * 60 * 1000; // Default 3 hours
      const existingDropoff = new Date(existingPickup.getTime() + existingDropoffDuration);

      // Check if times overlap
      return !(dropoffDateTime <= existingPickup || pickupDateTime >= existingDropoff);
    });

    if (conflictingDelivery) {
      return { 
        available: false, 
        reason: `Driver has a conflicting delivery at ${new Date(conflictingDelivery.pickup_time).toLocaleString()}` 
      };
    }

    return { available: true };
  }, [staff, deliveries, parseTimeToMs]);

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
      
      if (!selectedFoodItem) {
        throw new Error("Please select a food item to deliver.");
      }
      
      if (!deliveryQuantity || deliveryQuantity.trim() === "") {
        throw new Error("Please enter a delivery quantity.");
      }
      
      // Validate that the unit matches the selected food item's unit
      const selectedItem = warehouseInventory.find(item => item.food_id === selectedFoodItem);
      if (selectedItem && !deliveryQuantity.endsWith(` ${selectedItem.unit}`)) {
        throw new Error(`Quantity must be in ${selectedItem.unit} units.`);
      }
      
      // Calculate dropoff time (3 hours after pickup)
      const pickupDate = new Date(distributionForm.pickupTime);
      const dropoffDate = new Date(pickupDate.getTime() + 3 * 60 * 60 * 1000);
      
      // Convert food_id from API format (F0000014) back to database format (FOO0000014)
      // The API serializer formats FOO0000014 -> F0000014, but backend needs FOO0000014
      let foodIdForBackend = selectedFoodItem;
      if (selectedFoodItem.startsWith("F") && !selectedFoodItem.startsWith("FOO")) {
        // Extract digits from F0000014 -> 0000014
        const digits = selectedFoodItem.substring(1);
        // Convert to FOO0000014 (FOO prefix + 7 digits)
        foodIdForBackend = `FOO${digits.padStart(7, "0")}`;
      }
      

      // Check driver availability
      const availability = isDriverAvailable(distributionForm.userId, distributionForm.pickupTime);
      if (!availability.available) {
        throw new Error(`Driver is not available: ${availability.reason}`);
      }

      // Check province match for distribution type
      const selectedWarehouse = warehouses.find(w => w.warehouse_id === distributionForm.warehouseId);
      const selectedCommunity = communities.find(c => c.community_id === distributionForm.communityId);
      const selectedStaff = staff.find(s => s.user_id === distributionForm.userId);
      
      if (selectedWarehouse && selectedCommunity && selectedStaff) {
        const pickupProvince = extractProvince(selectedWarehouse.address);
        const dropoffProvince = extractProvince(selectedCommunity.address);
        
        // Check if provinces match
        if (pickupProvince !== dropoffProvince) {
          throw new Error(`Pickup and dropoff must be in the same province. Pickup: ${pickupProvince}, Dropoff: ${dropoffProvince}`);
        }

        // Check if driver's assigned area matches
        const driverProvince = selectedStaff.assigned_area;
        if (driverProvince && driverProvince !== pickupProvince && driverProvince !== "Bangkok" && pickupProvince !== "Bangkok") {
          // Allow DEL0000005 to handle both Bangkok and Ayutthaya
          if (!(selectedStaff.user_id === "DEL0000005" && (pickupProvince === "Bangkok" || pickupProvince === "Ayutthaya"))) {
            throw new Error(`Driver is assigned to ${driverProvince}, but delivery is in ${pickupProvince}`);
          }
        }
      }
      const payload: Record<string, unknown> = {
        delivery_type: "distribution",
        pickup_time: pickupDate.toISOString(),
        dropoff_time: dropoffDate.toISOString(),
        pickup_location_type: "warehouse",
        dropoff_location_type: "community",
        warehouse_id: distributionForm.warehouseId,
        user_id: distributionForm.userId,
        community_id: distributionForm.communityId,
        food_item: foodIdForBackend,
        delivery_quantity: deliveryQuantity,
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
      setSelectedFoodItem("");
      setDeliveryQuantity("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save distribution assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  const visibleDeliveries = (canEdit
    ? deliveries
    : deliveries.filter((delivery) => delivery.user_id === currentUserId)
  )
    .filter((delivery) => delivery.delivery_type === "distribution")
    .sort((a, b) => {
      const timeA = new Date(a.pickup_time).getTime();
      const timeB = new Date(b.pickup_time).getTime();
      return timeA - timeB; // Sort ascending (earliest first)
    });

  // Helper function to shorten warehouse ID: WAH0000004 -> WH001
  const shortenWarehouseId = (warehouseId: string): string => {
    if (!warehouseId) return warehouseId;
    // Extract digits from WAH0000004 -> 0000004 -> 4
    const digits = warehouseId.replace(/\D/g, "");
    if (!digits) return warehouseId;
    const num = parseInt(digits, 10);
    return `WH${num.toString().padStart(3, "0")}`;
  };

  // Helper function to shorten community ID: COM0000001 -> CM001
  const shortenCommunityId = (communityId: string): string => {
    if (!communityId) return communityId;
    // Extract digits from COM0000001 -> 0000001 -> 1
    const digits = communityId.replace(/\D/g, "");
    if (!digits) return communityId;
    const num = parseInt(digits, 10);
    return `CM${num.toString().padStart(3, "0")}`;
  };

  const lookupCommunityName = (communityId: string) => {
    const community = communities.find((c) => c.community_id === communityId);
    return community ? community.name : communityId;
  };

  const lookupStaffName = (userId: string) => {
    const member = staff.find((s) => s.user_id === userId);
    return member ? (member.name || member.username) : userId;
  };

  // Helper function to remove postal code from address
  const removePostalCode = (address: string): string => {
    if (!address) return address;
    // Remove 5-digit postal code at the end (Thai postal codes are 5 digits)
    // Pattern: space or comma followed by 5 digits at the end
    return address.replace(/\s*[,，]?\s*\d{5}\s*$/, "").trim();
  };

  const lookupWarehouseAddress = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.warehouse_id === warehouseId);
    if (!warehouse) return warehouseId;
    return removePostalCode(warehouse.address);
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
      <div className="col-span-3 flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-[#CFE6D8] bg-[#F6FBF7] p-8 shadow-2xl shadow-[#B6DEC8]/30">
        <div className="mb-6 flex flex-shrink-0 items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2F855A]">
              Deliver to community
            </p>
            <h2 className="text-3xl font-semibold text-gray-900">
              {canEdit ? "Assign community deliveries" : "My assigned deliveries"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {canEdit
                ? "Assign delivery staff to transport food from warehouses to communities."
                : "Update status for deliveries assigned to you."}
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
              <div className="space-y-4 rounded-2xl border border-[#CFE6D8] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-900">Deliver to community</p>
                  <span className="text-xs text-gray-500">From warehouse</span>
                </div>
                <div className="grid gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Select warehouse
                    </label>
                    <select
                      className={INPUT_STYLES}
                      value={distributionForm.warehouseId}
                      onChange={(e) =>
                        setDistributionForm((prev) => ({ ...prev, warehouseId: e.target.value }))
                      }
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map((warehouse) => {
                        // Helper to shorten warehouse ID: WAH0000004 -> WH001
                        const shortenId = (id: string) => {
                          const digits = id.replace(/\D/g, "");
                          if (!digits) return id;
                          const num = parseInt(digits, 10);
                          return `WH${num.toString().padStart(3, "0")}`;
                        };
                        // Helper to remove postal code from address
                        const removePostalCode = (addr: string) => {
                          if (!addr) return addr;
                          return addr.replace(/\s*[,，]?\s*\d{5}\s*$/, "").trim();
                        };
                        return (
                          <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                            {shortenId(warehouse.warehouse_id)} — {removePostalCode(warehouse.address)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Select community
                    </label>
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
                            {community.name} ({shortenCommunityId(community.community_id)})
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
                      value={distributionForm.userId}
                      onChange={(e) =>
                        setDistributionForm((prev) => ({ ...prev, userId: e.target.value }))
                      }
                    >
                      <option value="">Assign delivery staff</option>
                      {staff.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.name || member.username} {member.assigned_area ? `(${member.assigned_area})` : ''}
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
                      value={distributionForm.pickupTime}
                      onChange={(e) =>
                        setDistributionForm((prev) => ({ ...prev, pickupTime: e.target.value }))
                      }
                    />
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Select food item
                    </label>
                    {!distributionForm.warehouseId ? (
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <p className="text-sm text-gray-500 text-center">
                          Please select a warehouse first to view available food items
                        </p>
                      </div>
                    ) : warehouseInventory.length === 0 ? (
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <p className="text-sm text-gray-500 text-center">
                          Loading food items...
                        </p>
                      </div>
                    ) : (
                      <select
                        className={INPUT_STYLES}
                        value={selectedFoodItem}
                        onChange={(e) => {
                          setSelectedFoodItem(e.target.value);
                          setDeliveryQuantity("");
                        }}
                      >
                        <option value="">Select food item</option>
                        {warehouseInventory
                          .filter(item => item.quantity > 0 && !item.is_expired)
                          .map((item) => (
                            <option key={item.food_id} value={item.food_id}>
                              {item.name} - Available: {item.quantity} {item.unit}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                  
                  {selectedFoodItem && (
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">
                        Delivery quantity
                      </label>
                      {(() => {
                        const selectedItem = warehouseInventory.find(item => item.food_id === selectedFoodItem);
                        return selectedItem ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={selectedItem.quantity}
                                value={(() => {
                                  if (!deliveryQuantity) return "";
                                  // Extract number part (remove unit if present)
                                  const numPart = deliveryQuantity.replace(new RegExp(`\\s*${selectedItem.unit}\\s*$`), "");
                                  return numPart;
                                })()}
                                onChange={(e) => {
                                  const numValue = e.target.value;
                                  if (numValue === "" || numValue === "0" || numValue === "0.") {
                                    setDeliveryQuantity("");
                                  } else {
                                    const num = parseFloat(numValue);
                                    if (!isNaN(num) && num > 0) {
                                      // Always append the unit
                                      if (num <= selectedItem.quantity) {
                                        setDeliveryQuantity(`${numValue} ${selectedItem.unit}`);
                                      } else {
                                        // Still allow typing but will validate on submit
                                        setDeliveryQuantity(`${numValue} ${selectedItem.unit}`);
                                      }
                                    } else if (numValue.endsWith(".") || numValue === "") {
                                      // Allow typing decimal point
                                      setDeliveryQuantity(numValue);
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  const numValue = e.target.value;
                                  if (numValue && !isNaN(parseFloat(numValue))) {
                                    const num = parseFloat(numValue);
                                    if (num > 0) {
                                      setDeliveryQuantity(`${num} ${selectedItem.unit}`);
                                    } else {
                                      setDeliveryQuantity("");
                                    }
                                  } else if (!numValue) {
                                    setDeliveryQuantity("");
                                  }
                                }}
                                className={INPUT_STYLES}
                                placeholder="Enter quantity"
                              />
                              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                {selectedItem.unit}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Available: {selectedItem.quantity} {selectedItem.unit} | Example: &quot;15.5&quot; or &quot;25.67&quot; (unit will be added automatically)
                            </p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                  
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitDistribution}
                    className="mt-4 w-full rounded-2xl bg-[#2F8A61] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#25724F] disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {submitting ? "Saving..." : "Save delivery assignment"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#CFE6D8] bg-white p-6 text-sm text-gray-700">
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
              Delivery queue
            </p>
            <h3 className="text-2xl font-semibold text-gray-800">
              {canEdit ? "All delivery tasks" : "My assigned deliveries"}
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
                          <span className="text-lg">📤</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Deliver to community
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
                        <span className="text-gray-400">🏘️</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500">Community</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {lookupCommunityName(delivery.community_id || "")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <ArchiveBoxIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500">Warehouse</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {shortenWarehouseId(delivery.warehouse_id)} — {lookupWarehouseAddress(delivery.warehouse_id)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <UserIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
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
                        <ClockIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500">Pickup Time</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDisplayDate(delivery.pickup_time)}
                        </p>
                      </div>
                    </div>

                    {delivery.food_item && delivery.delivery_quantity ? (
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <FireIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500">Food Item</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {(() => {
                              const foodItem = foodItems.find(f => f.food_id === delivery.food_item);
                              if (foodItem) {
                                return `${foodItem.name} - ${delivery.delivery_quantity}`;
                              }
                              return `${delivery.food_item} - ${delivery.delivery_quantity}`;
                            })()}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <span className="text-gray-400">🥘</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500">Food Amount</p>
                          <p className="text-sm font-semibold text-gray-900">
                            Not specified
                          </p>
                        </div>
                      </div>
                    )}
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

function WarehouseManagement({ currentUser }: { currentUser: LoggedUser | null }) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItemApiRecord[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecordApi[]>([]);
  const [donations, setDonations] = useState<DonationApiRecord[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expiryFilter, setExpiryFilter] = useState<string>("all");
  // Grouping is enabled by default; allow toggling to flat list
  // grouping removed: show flat list filtered by category selection
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [warehouseData, deliveryData, donationData, restaurantData] = await Promise.all([
        apiFetch<Warehouse[]>(API_PATHS.warehouses),
        apiFetch<DeliveryRecordApi[]>(API_PATHS.deliveries, {
          headers: buildAuthHeaders(currentUser),
        }),
        apiFetch<DonationApiRecord[]>(API_PATHS.donations),
        apiFetch<Restaurant[]>(API_PATHS.restaurants),
      ]);

      const metroWarehouses = warehouseData.filter((warehouse) =>
        isBangkokMetroArea(`${warehouse.address} ${warehouse.warehouse_id}`)
      );
      setWarehouses(metroWarehouses);
      setDeliveries(deliveryData);
      setDonations(donationData);
      setRestaurants(restaurantData);

      const allFoodItems: FoodItemApiRecord[] = [];
      for (const donation of donationData) {
        try {
          const items = await apiFetch<FoodItemApiRecord[]>(`/fooditems/?donation=${donation.donation_id}`);
          allFoodItems.push(...items);
        } catch {
          // Ignore errors for individual donation food items
        }
      }
      setFoodItems(allFoodItems);

      setSelectedWarehouseId((prev) => {
        if (prev && metroWarehouses.some((w) => w.warehouse_id === prev)) {
          return prev;
        }
        return metroWarehouses[0]?.warehouse_id ?? "";
      });
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
    const warehouseDeliveries = deliveries.filter(
      (d) => d.delivery_type === "donation" && d.warehouse_id === warehouseId && d.status === "delivered"
    );
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
    let result = items.slice();

    // status filter
    if (filterStatus === "available") {
      result = result.filter((item) => !item.is_claimed && !item.is_distributed && !isItemExpired(item));
    } else if (filterStatus === "claimed") {
      result = result.filter((item) => item.is_claimed && !item.is_distributed && !isItemExpired(item));
    } else if (filterStatus === "distributed") {
      result = result.filter((item) => item.is_distributed);
    } else if (filterStatus === "expired") {
      result = result.filter((item) => isItemExpired(item));
    }

    // expiry filter
    if (expiryFilter === "within_3_days") {
      result = result.filter((item) => isExpiringWithinDays(item, 3));
    } else if (expiryFilter === "this_week") {
      result = result.filter((item) => isExpiringThisWeek(item));
    } else if (expiryFilter === "this_month") {
      result = result.filter((item) => isExpiringThisMonth(item));
    }

    // Apply category filter (display labels used in the UI)
    if (categoryFilter && categoryFilter !== "all") {
      result = result.filter((item) => displayCategoryLabel(getCategory(item)) === categoryFilter);
    }

    return result;
  };

  const handleRemoveItem = async (foodId: string) => {
    if (!foodId) return;
    const ok = window.confirm("Remove this food item from the warehouse? This will delete the item.");
    if (!ok) return;
    try {
      await apiFetch(`/fooditems/${foodId}/`, {
        method: "DELETE",
        headers: buildAuthHeaders(currentUser),
      });
      // Remove from local state so UI updates immediately
      setFoodItems((prev) => prev.filter((f) => f.food_id !== foodId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove item");
    }
  };

  const isExpiringWithinDays = (item: FoodItemApiRecord, days: number) => {
    if (!item.expire_date) return false;
    const today = new Date();
    const expire = new Date(item.expire_date.split("T")[0]);
    const diffMs = expire.getTime() - today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= days;
  };

  const isExpiringThisWeek = (item: FoodItemApiRecord) => {
    if (!item.expire_date) return false;
    const today = new Date();
    const day = today.getDay();
    const daysUntilEndOfWeek = 6 - day; // treat week as Sun-Sat
    return isExpiringWithinDays(item, daysUntilEndOfWeek);
  };

  const isExpiringThisMonth = (item: FoodItemApiRecord) => {
    if (!item.expire_date) return false;
    const today = new Date();
    const expire = new Date(item.expire_date.split("T")[0]);
    return today.getFullYear() === expire.getFullYear() && today.getMonth() === expire.getMonth();
  };

  const getCategory = (item: FoodItemApiRecord) => {
    // Prefer explicit category from API if present
    if (item.category) return item.category;

    // Heuristic: infer from name when category is not provided
    const name = (item.name || "").toLowerCase();
    if (name.includes("vegan")) return "Vegan";
    if (name.includes("vegetarian")) return "Vegan";
    if (name.includes("halal") || name.includes("islamic") || name.includes("muslim")) return "Islamic";

    // Default unspecified items to Islamic per user preference
    return "Islamic";
  };

  const displayCategoryLabel = (cat: string) => {
    if (!cat) return cat;
    // Internally we use "Vegan"; display as "Vegetarian" per request
    if (cat === "Vegan") return "Vegetarian";
    // Normalize casing for display (e.g. "islamic" -> "Islamic")
    return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
  };

  // Format a donation id into a human-friendly label (restaurant name + branch)
  const getDonationLabel = (donationId?: string | null) => {
    if (!donationId) return "";
    // Try to find the donation record from loaded donations
    const donation = donations.find((d) => d.donation_id === donationId);
    if (donation) {
      // Prefer the donation-provided restaurant_name if available
      const restaurantId = donation.restaurant;
      const restaurant = restaurants.find((r: Restaurant) => r.restaurant_id === restaurantId);
      const restaurantName = donation.restaurant_name || restaurant?.name || restaurant?.restaurant_id || "";
      const branchName = donation.restaurant_branch || restaurant?.branch_name || "";
      if (branchName) return `${restaurantName}${restaurantName ? " - " : ""}${branchName}`;
      return restaurantName || donation.donation_id;
    }

    // Fallback: show the raw id
    return donationId;
  };

  // const groupItemsByCategory = (items: FoodItemApiRecord[]) => {
  //   const groups: Record<string, FoodItemApiRecord[]> = {};
  //   for (const it of items) {
  //     const cat = getCategory(it);
  //     if (!groups[cat]) groups[cat] = [];
  //     groups[cat].push(it);
  //   }
  //   return groups;
  // }; // unused

  const visibleWarehouses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return warehouses;
    }
    return warehouses.filter((warehouse) => {
      const haystack = `${warehouse.warehouse_id} ${warehouse.address}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [warehouses, searchTerm]);

  useEffect(() => {
    if (!visibleWarehouses.length) {
      setSelectedWarehouseId("");
      return;
    }
    if (!selectedWarehouseId || !visibleWarehouses.some((w) => w.warehouse_id === selectedWarehouseId)) {
      setSelectedWarehouseId(visibleWarehouses[0].warehouse_id);
    }
  }, [visibleWarehouses, selectedWarehouseId]);

  const selectedWarehouse = warehouses.find((w) => w.warehouse_id === selectedWarehouseId) || null;
  const warehouseItems = selectedWarehouseId ? getWarehouseItems(selectedWarehouseId) : [];
  const filteredItems = filterItems(warehouseItems);
  const expiredItems = filteredItems.filter(isItemExpired);
  const visibleItems = filteredItems.filter((it) => !isItemExpired(it));

  return (
    <div className="grid h-[calc(100vh-4rem)] min-h-0 gap-6 lg:[grid-template-columns:320px_1fr]">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-[#CFE6D8] bg-white p-6 shadow-lg shadow-[#B6DEC8]/30">
        <div className="mb-4 flex flex-shrink-0 items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2F855A]">
              Bangkok metropolitan warehouses
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Browse warehouses</h2>
            <p className="text-sm text-gray-600">
              Search by warehouse ID or address to focus on a specific facility.
            </p>
          </div>
          <span className="text-xs text-gray-500">{visibleWarehouses.length} listed</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col space-y-3">
          <input
            className={INPUT_STYLES + " flex-shrink-0"}
            placeholder="Search by ID or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {loading ? (
              <p className="text-sm text-gray-600">Loading warehouse data...</p>
            ) : visibleWarehouses.length === 0 ? (
              <p className="text-sm text-gray-500">
                No warehouses found in the Bangkok metropolitan list.
              </p>
            ) : (
              visibleWarehouses.map((warehouse) => {
                const isSelected = warehouse.warehouse_id === selectedWarehouseId;
                const itemCount = getWarehouseItems(warehouse.warehouse_id).length;
                return (
                  <button
                    type="button"
                    key={warehouse.warehouse_id}
                    onClick={() => setSelectedWarehouseId(warehouse.warehouse_id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${isSelected
                      ? "border-[#2F855A] bg-[#F6FBF7] shadow-md"
                      : "border-[#D7E6DD] bg-white hover:border-[#2F855A]"
                      }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {(() => {
                        const digits = warehouse.warehouse_id.replace(/\D/g, "");
                        if (!digits) return warehouse.warehouse_id;
                        const num = parseInt(digits, 10);
                        return `WH${num.toString().padStart(3, "0")}`;
                      })()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(() => {
                        // Remove postal code from address
                        const addr = warehouse.address;
                        if (!addr) return addr;
                        return addr.replace(/\s*[,，]?\s*\d{5}\s*$/, "").trim();
                      })()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{itemCount} lot(s) stored</p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[28px] border border-[#CFE6D8] bg-[#F6FBF7] p-6 shadow-lg shadow-[#B6DEC8]/30">
        {/* header is sticky so controls don't shift when left column content changes */}
        <div className="sticky top-6 z-20 mb-4 bg-[#F6FBF7] py-2">
          <div className="flex flex-shrink-0 flex-col gap-4 md:flex-row md:items-start md:gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2F855A]">
                Warehouse management
              </p>
              <h2 className="text-2xl font-semibold text-gray-900">
                {selectedWarehouse ? selectedWarehouse.warehouse_id : "Select a warehouse"}
              </h2>
              {selectedWarehouse && (
                <p className="text-sm text-gray-600">{selectedWarehouse.address}</p>
              )}
            </div>
            <div className="flex w-full md:w-auto md:ml-auto gap-4 flex-wrap">
              <div className="w-full md:w-40">
                <label className="mb-1 block text-xs font-semibold text-gray-600">
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
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="w-full md:w-40">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Expiry filter</label>
                <select
                  className={INPUT_STYLES}
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="within_3_days">Expiring within 3 days</option>
                  <option value="this_week">Expiring this week</option>
                  <option value="this_month">Expiring this month</option>
                </select>
              </div>

              <div className="w-full md:w-40">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Category</label>
                <select
                  className={INPUT_STYLES}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Islamic">Islamic</option>
                </select>
              </div>
            </div>

            {/* grouping UI removed - category selection drives filtering */}
          </div>
        </div>

        {error && <p className="mb-4 flex-shrink-0 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-600">Loading inventory...</p>
        ) : !selectedWarehouse ? (
          <p className="text-sm text-gray-500">
            Use the search to choose a warehouse to inspect.
          </p>
        ) : filteredItems.length === 0 ? (
          <p className="mt-1.5 text-sm text-gray-500">
            No food items match the selected status for this warehouse.
          </p>
        ) : (
          <div className="min-h-0 min-w-0 flex-1 flex pr-1">
            <div className="flex gap-2 items-stretch w-full min-h-0">
              <div className="md:w-[65%] mt-3 w-full flex-1 flex flex-col space-y-3 min-h-0 overflow-y-auto">
                {visibleItems.map((item) => {
                  const expired = isItemExpired(item);
                  return (
                    <div
                      key={item.food_id}
                      className={`rounded-2xl p-4 shadow-sm transition hover:shadow-md ${expired ? 'border-2 border-dashed border-[#F5C6C1] bg-[#FFF5F5]' : 'border border-[#CFE6D8] bg-white'
                        }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6F7EE]">
                              <FireIcon className="w-4 h-4 text-[#2F855A]" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 leading-tight">{item.name}</p>
                              <span className="text-[11px] font-medium text-[#2F855A] leading-tight">{item.food_id}</span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${expired
                            ? "bg-[#FDECEA] text-[#B42318]"
                            : item.is_distributed
                              ? "bg-[#E6F7EE] text-[#1F4D36]"
                              : item.is_claimed
                                ? "bg-[#E6F4FF] text-[#1D4ED8]"
                                : "bg-[#FFF1E3] text-[#C46A24]"
                            }`}
                        >
                          {expired
                            ? "Expired"
                            : item.is_distributed
                              ? "Distributed"
                              : item.is_claimed
                                ? "Claimed"
                                : "Available"}
                        </span>
                      </div>

                      <div className="space-y-3 border-t border-gray-100 pt-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <ShoppingBagIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-500">Donation</p>
                            <p className="text-sm font-semibold text-gray-900">{getDonationLabel(item.donation)}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <ArchiveBoxIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-500">Quantity</p>
                            <p className="text-sm font-semibold text-gray-900">{item.quantity} {item.unit}</p>
                          </div>
                        </div>

                        {item.expire_date && (
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <span className="text-gray-400">📅</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-gray-500">Expires</p>
                              <p className="text-sm font-semibold text-gray-900">{formatDisplayDate(item.expire_date)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <aside className="md:w-[32%] mt-3 w-56 shrink-0 md:ml-auto rounded-lg border-2 border-dashed border-[#F5C6C1] bg-[#FFF5F5] p-3 space-y-3 min-h-0 h-full overflow-y-auto self-stretch">
                <h3 className="text-sm font-semibold text-[#B42318]">Expired food ({expiredItems.length})</h3>
                {expiredItems.length === 0 ? (
                  <p className="text-xs text-gray-500">No expired food</p>
                ) : (
                  expiredItems.map((ei) => (
                    <div key={ei.food_id} className="text-sm">
                      <p className="font-medium text-gray-900">{ei.name}</p>
                      <p className="text-xs text-[#7A1F1F]">{ei.expire_date ? formatDisplayDate(ei.expire_date) : 'No date'}</p>
                      <p className="text-xs text-gray-700">Qty: {ei.quantity} {ei.unit}</p>
                      <button
                        onClick={() => handleRemoveItem(ei.food_id)}
                        className="mt-2 w-full rounded-md bg-[#B42318] px-2 py-1 text-xs font-semibold text-white hover:bg-[#991b1b]"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </aside>
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
    restaurant_id: "",
    restaurant_name: "",
    branch: "",
    restaurant_address: "",
  });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantSelectionMode, setRestaurantSelectionMode] = useState<"existing" | "manual">("existing");
  const [, setRestaurantsLoading] = useState(false);

  // Load restaurants for dropdown
  useEffect(() => {
    let ignore = false;
    async function loadRestaurants() {
      setRestaurantsLoading(true);
      try {
        const data = await apiFetch<Restaurant[]>("/restaurants/");
        if (!ignore) {
          setRestaurants(data);
        }
      } catch (error) {
        console.error("Failed to load restaurants:", error);
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
        restaurant_id: "",
        restaurant_name: "",
        branch: "",
        restaurant_address: "",
      });

      // Automatically log the user in after successful signup
      if (payload.username && payload.email) {
        onAuthSuccess?.({
          username: payload.username,
          email: payload.email,
          userId: payload.user_id ?? "",
          isAdmin: Boolean(payload.is_admin),
          isDeliveryStaff: Boolean(payload.is_delivery_staff),
          restaurantId: payload.restaurant_id ?? undefined,
          restaurantName: payload.restaurant_name ?? undefined,
          branch: payload.branch ?? undefined,
          restaurantAddress: payload.restaurant_address ?? undefined,
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
          restaurantId: payload.restaurant_id ?? undefined,
          restaurantName: payload.restaurant_name ?? undefined,
          branch: payload.branch ?? undefined,
          restaurantAddress: payload.restaurant_address ?? undefined,
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
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-lg border-4 border-[#d48a68]/20 max-h-[90vh] overflow-y-auto">
        {/* Header row: title + close button */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className={[
            "text-lg font-bold",
            isSignup ? "text-[#d48a68]" : "text-[#708A58]"
          ].join(" ")}>
            {isSignup ? "Create your account" : "Welcome back"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl leading-none"
            aria-label="Close authentication dialog"
          >
            ✕
          </button>
        </div>

        {/* Tabs: Sign up | Login */}
        <div className="mb-4 flex gap-2 rounded-full bg-gray-100 p-1 text-sm font-bold">
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
            {/* Row 1: Username, Name, Last Name */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  value={signupData.username}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, username: e.target.value }))
                  }
                  required
                  placeholder="Choose a username"
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={signupData.fname}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, fname: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  value={signupData.lname}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, lname: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                />
              </div>
            </div>

            {/* Row 2: DOB, Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={signupData.bod}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, bod: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  value={signupData.phone}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                />
              </div>
            </div>

            {/* Row 3: Email, Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={signupData.email}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={signupData.password}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                />
              </div>
            </div>

            {/* Restaurant Selection Section - Optional */}
            <div className="rounded-xl border-2 border-[#d48a68] bg-[#fdf8f4] p-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-900 mb-0.5">Restaurant Info (Optional)</p>
                  <p className="text-[10px] text-gray-600">
                    Only for restaurants donating food. Skip if receiving only.
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRestaurantSelectionMode("existing");
                      setSignupData((prev) => ({ ...prev, restaurant_id: "", restaurant_name: "", branch: "", restaurant_address: "" }));
                    }}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                      restaurantSelectionMode === "existing"
                        ? "bg-[#d48a68] text-white"
                        : "bg-white text-[#d48a68] border border-[#d48a68]"
                    }`}
                  >
                    Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRestaurantSelectionMode("manual");
                      setSignupData((prev) => ({ ...prev, restaurant_id: "" }));
                    }}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                      restaurantSelectionMode === "manual"
                        ? "bg-[#d48a68] text-white"
                        : "bg-white text-[#d48a68] border border-[#d48a68]"
                    }`}
                  >
                    New
                  </button>
                </div>
              </div>

              {restaurantSelectionMode === "existing" ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Select Restaurant
                  </label>
                  <select
                    value={signupData.restaurant_id || ""}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selected = restaurants.find(r => r.restaurant_id === selectedId);
                      setSignupData((prev) => ({
                        ...prev,
                        restaurant_id: selectedId,
                        restaurant_name: selected?.name || "",
                        branch: selected?.branch_name || "",
                        restaurant_address: selected?.address || "",
                      }));
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                  >
                    <option value="">Choose restaurant (optional)...</option>
                    {restaurants.map((restaurant) => (
                      <option key={restaurant.restaurant_id} value={restaurant.restaurant_id}>
                        {restaurant.name} {restaurant.branch_name ? `(${restaurant.branch_name})` : ""}
                      </option>
                    ))}
                  </select>
                  {signupData.restaurant_id && (
                    <div className="mt-1.5 space-y-0.5 text-[10px] text-gray-600">
                      {signupData.branch && <p>Branch: {signupData.branch}</p>}
                      {signupData.restaurant_address && <p>Address: {signupData.restaurant_address}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Restaurant Name
                      </label>
                      <input
                        type="text"
                        value={signupData.restaurant_name || ""}
                        onChange={(e) =>
                          setSignupData((prev) => ({ ...prev, restaurant_name: e.target.value }))
                        }
                        placeholder="e.g. KFC"
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Branch
                      </label>
                      <input
                        type="text"
                        value={signupData.branch || ""}
                        onChange={(e) =>
                          setSignupData((prev) => ({ ...prev, branch: e.target.value }))
                        }
                        placeholder="e.g. Central World"
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Address *
                    </label>
                    <textarea
                      value={signupData.restaurant_address || ""}
                      onChange={(e) =>
                        setSignupData((prev) => ({ ...prev, restaurant_address: e.target.value }))
                      }
                      required
                      placeholder="Full address"
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:border-[#d48a68] focus:ring-1 focus:ring-[#d48a68] focus:bg-[#fef5f1] resize-y"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex-1">
                {signupStatus.error && (
                  <p className="text-xs text-red-500">{signupStatus.error}</p>
                )}
                {signupStatus.message && (
                  <p className="text-xs text-emerald-600">{signupStatus.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={signupStatus.loading}
                className="rounded-lg bg-[#d48a68] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#c47958] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
              >
                {signupStatus.loading ? "Creating..." : "Create account"}
              </button>
            </div>
          </form>
        ) : (
          // LOGIN FORM
          <form className="space-y-3" onSubmit={handleLoginSubmit}>
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

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex-1">
                {loginStatus.error && (
                  <p className="text-xs text-red-500">{loginStatus.error}</p>
                )}
                {loginStatus.message && (
                  <p className="text-xs text-emerald-600">{loginStatus.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loginStatus.loading}
                className="rounded-lg bg-[#708A58] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#5a6e47] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
              >
                {loginStatus.loading ? "Logging in..." : "Login"}
              </button>
            </div>
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
      { id: 0, label: "Home", icon: <HomeIcon className="w-5 h-5" aria-hidden="true" /> },
      { id: 3, label: "Dashboard", icon: <WrenchScrewdriverIcon className="w-5 h-5" aria-hidden="true" /> },
      { id: 5, label: "Warehouse", icon: <ArchiveBoxIcon className="w-5 h-5" aria-hidden="true" /> },
      { id: 4, label: "Pickup", icon: <InboxIcon className="w-5 h-5" aria-hidden="true" /> },
      { id: 6, label: "Deliver", icon: <TruckIcon className="w-5 h-5" aria-hidden="true" /> },
    ]
    : currentUser?.isDeliveryStaff
      ? [
        { id: 0, label: "Home", icon: <HomeIcon className="w-5 h-5" aria-hidden="true" /> },
        { id: 4, label: "Pickup", icon: <InboxIcon className="w-5 h-5" aria-hidden="true" /> },
        { id: 6, label: "Deliver", icon: <TruckIcon className="w-5 h-5" aria-hidden="true" /> },
      ]
      : [
        { id: 0, label: "Home", icon: <HomeIcon className="w-5 h-5" aria-hidden="true" /> },
        { id: 1, label: "Donate", icon: <HeartIcon className="w-5 h-5" aria-hidden="true" /> },
        { id: 2, label: "Get meals", icon: <ShoppingBagIcon className="w-5 h-5" aria-hidden="true" /> },
        { id: 7, label: "Status", icon: <ChartBarIcon className="w-5 h-5" aria-hidden="true" /> },
      ];

  const normalizedActiveTab = useMemo(() => {
    // Home page (0) is always accessible
    if (activeTab === 0) {
      return 0;
    }
    // Status tab (7) is accessible even when not logged in
    if (activeTab === 7) {
      return 7;
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
        onSettingsClick={() => setShowProfileModal(true)}
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
