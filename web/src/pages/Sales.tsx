import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Paper,
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
type Vendor = { id: string; name: string };
type PriceItem = { id: string; description: string; price: number };
type SaleItem = {
  id: string;
  description: string;
  price: number;
  date: string;
  careHqResident: Resident;
};

const SalesPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [homes, setHomes] = useState<CareHome[]>([]);
  const [careHomeId, setCareHomeId] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [residents, setResidents] = useState<Resident[]>([]);
  const [residentId, setResidentId] = useState("");
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [priceItemId, setPriceItemId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [invoiceEmail, setInvoiceEmail] = useState("");

  const selectedPrice = useMemo(
    () => priceItems.find((item) => item.id === priceItemId),
    [priceItems, priceItemId]
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
    const authUpn = response.data?.auth?.upn ?? response.data?.auth?.preferred_username;
    if (authUpn) setInvoiceEmail(authUpn);
  };

  const loadVendors = async () => {
    const response = await api.get("/vendors");
    setVendors(response.data ?? []);
    if (!vendorId && response.data?.length) {
      setVendorId(response.data[0].id);
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

  const loadPriceItems = async (vendor: string) => {
    if (!vendor) return;
    const response = await api.get("/price-items", { params: { vendorId: vendor } });
    setPriceItems(response.data ?? []);
  };

  const loadSales = async () => {
    if (!careHomeId || !vendorId) return;
    const response = await api.get("/sales", { params: { careHomeId, vendorId, invoiced: false } });
    setSales(response.data ?? []);
  };

  useEffect(() => {
    loadHomes().catch(() => enqueueSnackbar("Failed to load homes", { variant: "error" }));
    loadVendors().catch(() => enqueueSnackbar("Failed to load vendors", { variant: "error" }));
  }, []);

  useEffect(() => {
    loadResidents(careHomeId).catch(() => enqueueSnackbar("Failed to load residents", { variant: "error" }));
    loadSales().catch(() => enqueueSnackbar("Failed to load sales", { variant: "error" }));
  }, [careHomeId, vendorId]);

  useEffect(() => {
    loadPriceItems(vendorId).catch(() => enqueueSnackbar("Failed to load price items", { variant: "error" }));
  }, [vendorId]);

  const handleAdd = async () => {
    if (!careHomeId || !vendorId || !residentId || !priceItemId || !selectedPrice) {
      enqueueSnackbar("Select a home, vendor, resident, and item", { variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      await api.post("/sales", {
        careHomeId,
        careHqResidentId: residentId,
        vendorId,
        priceItemId,
        description: selectedPrice.description,
        price: selectedPrice.price,
        date
      });
      await loadSales();
      enqueueSnackbar("Item added", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to add item", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/sales/${id}`);
      await loadSales();
    } catch {
      enqueueSnackbar("Failed to delete item", { variant: "error" });
    }
  };

  const handleInvoice = async () => {
    if (!careHomeId || !vendorId || !invoiceEmail) {
      enqueueSnackbar("Care home, vendor, and email are required", { variant: "warning" });
      return;
    }
    try {
      await api.post("/sales/invoice", {
        careHomeId,
        vendorId,
        toEmail: invoiceEmail
      });
      await loadSales();
      enqueueSnackbar("Invoice sent", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to send invoice", { variant: "error" });
    }
  };

  return (
    <article>
      <Typography variant="h4" mb={2}>
        Service Billing
      </Typography>
      <Box display="grid" gap={2} sx={{ gridTemplateColumns: { xs: "1fr", md: "320px 1fr" } }}>
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
              <TextField select label="Vendor" value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
                {vendors.map((vendor) => (
                  <MenuItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
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
              <TextField
                select
                label="Price Item"
                value={priceItemId}
                onChange={(event) => setPriceItemId(event.target.value)}
              >
                {priceItems.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.description} (£{Number(item.price).toFixed(2)})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
              <Button variant="contained" onClick={handleAdd} disabled={saving}>
                {saving ? "Adding..." : "Add item"}
              </Button>
              <TextField
                label="Invoice email"
                value={invoiceEmail}
                onChange={(event) => setInvoiceEmail(event.target.value)}
              />
              <Button variant="outlined" onClick={handleInvoice}>
                Send invoice (Graph)
              </Button>
            </Box>
          </Paper>
        </Box>
        <Box>
          <Paper elevation={1}>
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                Uninvoiced Items
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Resident</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell align="right">Remove</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sales.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.date.slice(0, 10)}</TableCell>
                      <TableCell>{item.careHqResident?.fullName ?? "Resident"}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>£{Number(item.price).toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Button size="small" color="error" onClick={() => handleDelete(item.id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Box>
      </Box>
    </article>
  );
};

export default SalesPage;
