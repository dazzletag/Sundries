type CareHqPage<T> = { items?: T[] };

type CareHqLocation = {
  _id: string;
  name: string;
};

type CareHqRoom = {
  _id: string;
  name_no: string;
  location: string;
};

type CareHqServiceUser = {
  _id: string;
  first_name?: string;
  last_name?: string;
  account_code?: string;
};

type CareHqBooking = {
  _id: string;
  service_user?: string;
  room?: string;
};

export type CareHqResidentItem = {
  careHqRoomId: string;
  careHqLocationId: string;
  careHomeName: string;
  roomNumber: string;
  fullName: string | null;
  accountCode: string | null;
  serviceUserId: string | null;
  isVacant: boolean;
};

const getEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
};

const createClient = async () => {
  const accountId = getEnv("CAREHQ_ACCOUNT_ID");
  const apiKey = getEnv("CAREHQ_API_KEY");
  const apiSecret = getEnv("CAREHQ_API_SECRET");
  const { APIClient } = await import("@carehq/carehq-js");
  return new APIClient(accountId, apiKey, apiSecret, { timeoutMs: 30_000 });
};

const fetchAllPages = async <T>(
  client: {
    request: (method: "GET", path: string, options?: { params?: Record<string, unknown> }) => Promise<CareHqPage<T>>;
  },
  resource: string,
  params: Record<string, unknown>
) => {
  const items: T[] = [];
  let page = 1;
  while (true) {
    const response = await client.request("GET", resource, {
      params: {
        ...params,
        per_page: 100,
        page
      }
    });
    const pageItems = response?.items ?? [];
    if (!pageItems.length) break;
    items.push(...pageItems);
    page += 1;
  }
  return items;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const buildFullName = (user?: CareHqServiceUser) => {
  if (!user) return null;
  const first = user.first_name?.trim() ?? "";
  const last = user.last_name?.trim() ?? "";
  const name = `${first} ${last}`.trim();
  return name.length ? name : null;
};

export const fetchCareHqResidents = async (): Promise<CareHqResidentItem[]> => {
  const client = await createClient();
  const [locations, rooms, serviceUsers, bookings] = await Promise.all([
    fetchAllPages<CareHqLocation>(client, "locations", { attributes: ["_id", "name"] }),
    fetchAllPages<CareHqRoom>(client, "rooms", { attributes: ["_id", "name_no", "location"] }),
    fetchAllPages<CareHqServiceUser>(client, "service-users", {
      attributes: ["_id", "first_name", "last_name", "account_code"],
      "filters-status": "active"
    }),
    fetchAllPages<CareHqBooking>(client, "bookings", {
      attributes: ["_id", "service_user", "room"],
      "filters-cancelled": "no",
      "filters-booking_type": "service_user",
      "filters-start_date": formatDate(new Date())
    })
  ]);

  const locationById = new Map(locations.map((loc) => [loc._id, loc.name]));
  const serviceUserById = new Map(serviceUsers.map((user) => [user._id, user]));
  const bookingByRoom = new Map<string, CareHqBooking>();

  for (const booking of bookings) {
    if (!booking.room) continue;
    if (!bookingByRoom.has(booking.room)) {
      bookingByRoom.set(booking.room, booking);
    }
  }

  const residents = rooms.map((room) => {
    const booking = bookingByRoom.get(room._id);
    const serviceUser = booking?.service_user ? serviceUserById.get(booking.service_user) : undefined;
    const fullName = buildFullName(serviceUser);
    return {
      careHqRoomId: room._id,
      careHqLocationId: room.location,
      careHomeName: locationById.get(room.location) ?? "Unknown",
      roomNumber: room.name_no,
      fullName,
      accountCode: serviceUser?.account_code ?? null,
      serviceUserId: serviceUser?._id ?? null,
      isVacant: !fullName
    };
  });

  residents.sort((a, b) => {
    if (a.careHomeName !== b.careHomeName) {
      return a.careHomeName.localeCompare(b.careHomeName);
    }
    return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
  });

  return residents;
};
