import { useEffect, useMemo, useState } from "react";
import {
  Box,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";

type CareHome = { id: string; name: string };
type Resident = { id: string; fullName?: string | null; roomNumber?: string | null };
type Newspaper = { id: string; title: string; price: number };
type NewspaperOrder = {
  id: string;
  careHqResidentId: string;
  newspaperId: string;
  itemTitle: string;
  price: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
};

const NewspapersPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [homes, setHomes] = useState<CareHome[]>([]);
  const [careHomeId, setCareHomeId] = useState("");
  const [residents, setResidents] = useState<Resident[]>([]);
  const [residentId, setResidentId] = useState("");
  const [newspapers, setNewspapers] = useState<Newspaper[]>([]);
  const [orders, setOrders] = useState<NewspaperOrder[]>([]);
  const [todaysOrders, setTodaysOrders] = useState<NewspaperOrder[]>([]);

  const residentOrders = useMemo(
    () => orders.filter((order) => order.careHqResidentId === residentId),
    [orders, residentId]
  );

  const loadHomes = async () => {
    const response = await api.get("/me");
    const roles = response.data?.roles ?? [];
    const uniqueHomes = new Map<string, CareHome>();
    roles.forEach((role: { careHome?: CareHome }) => {
      if (role.careHome?.id) uniqueHomes.set(role.careHome.id, role.careHome);
    });
    const list = Array.from(uniqueHomes.values()).sort((a, b) => a.name.localeCompare(b.name));
    setHomes(list);
    if (!careHomeId && list.length) {
      setCareHomeId(list[0].id);
    }
  };

  const loadResidents = async (homeId: string) => {
    if (!homeId) return;
    const response = await api.get("/carehq/residents", { params: { careHomeId: homeId } });
    setResidents(response.data ?? []);
    if (!residentId && response.data?.length) {
      setResidentId(response.data[0].id);
    }
  };

  const loadNewspapers = async () => {
    const response = await api.get("/newspapers");
    setNewspapers(response.data ?? []);
  };

  const loadOrders = async () => {
    if (!careHomeId) return;
    const response = await api.get("/newspaper-orders", { params: { careHomeId } });
    setOrders(response.data ?? []);
  };

  const loadToday = async () => {
    if (!careHomeId) return;
    const response = await api.get("/newspaper-orders/today", { params: { careHomeId } });
    setTodaysOrders(response.data ?? []);
  };

  useEffect(() => {
    loadHomes().catch(() => enqueueSnackbar("Failed to load homes", { variant: "error" }));
    loadNewspapers().catch(() => enqueueSnackbar("Failed to load newspapers", { variant: "error" }));
  }, []);

  useEffect(() => {
    loadResidents(careHomeId).catch(() => enqueueSnackbar("Failed to load residents", { variant: "error" }));
    loadOrders().catch(() => enqueueSnackbar("Failed to load orders", { variant: "error" }));
    loadToday().catch(() => enqueueSnackbar("Failed to load today's list", { variant: "error" }));
  }, [careHomeId]);

  const upsertOrder = async (newspaper: Newspaper, patch: Partial<NewspaperOrder>) => {
    if (!careHomeId || !residentId) return;
    try {
      await api.post("/newspaper-orders", {
        careHomeId,
        careHqResidentId: residentId,
        newspaperId: newspaper.id,
        itemTitle: newspaper.title,
        price: newspaper.price,
        ...patch
      });
      await loadOrders();
      await loadToday();
    } catch {
      enqueueSnackbar("Failed to update order", { variant: "error" });
    }
  };

  const getOrderFor = (paperId: string) =>
    residentOrders.find((order) => order.newspaperId === paperId);

  const toggleDay = (paper: Newspaper, day: keyof NewspaperOrder, value: boolean) => {
    upsertOrder(paper, { [day]: value } as Partial<NewspaperOrder>);
  };

  return (
    <article>
      <Typography variant="h4" mb={2}>
        Newspapers
      </Typography>
      <Box display="grid" gap={2} sx={{ gridTemplateColumns: { xs: "1fr", md: "280px 1fr" } }}>
        <Box>
          <Paper elevation={1}>
            <Box p={2} display="flex" flexDirection="column" gap={2}>
              <TextField select label="Care Home" value={careHomeId} onChange={(event) => setCareHomeId(event.target.value)}>
                {homes.map((home) => (
                  <MenuItem key={home.id} value={home.id}>
                    {home.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select label="Resident" value={residentId} onChange={(event) => setResidentId(event.target.value)}>
                {residents.map((resident) => (
                  <MenuItem key={resident.id} value={resident.id}>
                    {resident.roomNumber ? `${resident.roomNumber} - ` : ""}
                    {resident.fullName ?? "Resident"}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Paper>
        </Box>
        <Box>
          <Paper elevation={1}>
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                Orders for selected resident
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell align="center">Mon</TableCell>
                    <TableCell align="center">Tue</TableCell>
                    <TableCell align="center">Wed</TableCell>
                    <TableCell align="center">Thu</TableCell>
                    <TableCell align="center">Fri</TableCell>
                    <TableCell align="center">Sat</TableCell>
                    <TableCell align="center">Sun</TableCell>
                    <TableCell align="right">Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {newspapers.map((paper) => {
                    const order = getOrderFor(paper.id);
                    return (
                      <TableRow key={paper.id}>
                        <TableCell>{paper.title}</TableCell>
                        {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map(
                          (day) => (
                            <TableCell align="center" key={day}>
                              <Switch
                                checked={order ? order[day] : false}
                                onChange={(event) => toggleDay(paper, day, event.target.checked)}
                              />
                            </TableCell>
                          )
                        )}
                        <TableCell align="right">£{Number(paper.price).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Paper>
          <Box mt={2}>
            <Paper elevation={1}>
              <Box p={2}>
                <Typography variant="h6" gutterBottom>
                  Today's Orders
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Resident</TableCell>
                      <TableCell>Paper</TableCell>
                      <TableCell>Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {todaysOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          {residents.find((res) => res.id === order.careHqResidentId)?.fullName ?? "Resident"}
                        </TableCell>
                        <TableCell>{order.itemTitle}</TableCell>
                        <TableCell>£{Number(order.price).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Box>
    </article>
  );
};

export default NewspapersPage;
