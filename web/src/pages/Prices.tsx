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

type Vendor = { id: string; name: string };
type PriceItem = {
  id: string;
  vendorId: string;
  description: string;
  price: number;
  validFrom?: string | null;
  isActive: boolean;
};

const PricesPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [items, setItems] = useState<PriceItem[]>([]);
  const [form, setForm] = useState<Partial<PriceItem>>({ description: "", price: 0 });
  const [saving, setSaving] = useState(false);

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === vendorId),
    [vendors, vendorId]
  );

  const loadVendors = async () => {
    const response = await api.get("/vendors");
    setVendors(response.data ?? []);
    if (vendorId === null && response.data?.length) {
      setVendorId("all");
    }
  };

  const loadItems = async (targetVendorId: string | null) => {
    if (!targetVendorId) return;
    const response =
      targetVendorId === "all"
        ? await api.get("/price-items")
        : await api.get("/price-items", { params: { vendorId: targetVendorId } });
    setItems(response.data ?? []);
  };

  useEffect(() => {
    loadVendors().catch(() => enqueueSnackbar("Failed to load vendors", { variant: "error" }));
  }, []);

  useEffect(() => {
    loadItems(vendorId).catch(() => enqueueSnackbar("Failed to load price items", { variant: "error" }));
  }, [vendorId]);

  const handleSave = async () => {
    if (!vendorId || vendorId === "all" || !form.description) {
      enqueueSnackbar("Select a vendor and enter a description", { variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await api.patch(`/price-items/${form.id}`, {
          description: form.description,
          price: Number(form.price ?? 0),
          validFrom: form.validFrom ?? null
        });
      } else {
        await api.post("/price-items", {
          vendorId,
          description: form.description,
          price: Number(form.price ?? 0),
          validFrom: form.validFrom ?? null
        });
      }
      await loadItems(vendorId);
      setForm({ description: "", price: 0 });
      enqueueSnackbar("Price saved", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to save price", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <article>
      <Typography variant="h4" mb={2}>
        Prices
      </Typography>
      <Box display="grid" gap={2} sx={{ gridTemplateColumns: { xs: "1fr", md: "320px 1fr" } }}>
        <Box>
          <Paper elevation={1}>
            <Box p={2} display="flex" flexDirection="column" gap={2}>
      <TextField
        select
        label="Vendor"
        value={vendorId ?? ""}
        onChange={(event) => setVendorId(event.target.value)}
      >
        <MenuItem value="all">All vendors</MenuItem>
        {vendors.map((vendor) => (
          <MenuItem key={vendor.id} value={vendor.id}>
            {vendor.name}
          </MenuItem>
        ))}
      </TextField>
              <TextField
                label="Item description"
                value={form.description ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <TextField
                label="Price"
                type="number"
                value={form.price ?? 0}
                onChange={(event) => setForm((prev) => ({ ...prev, price: Number(event.target.value) }))}
              />
              <TextField
                label="Valid from"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={form.validFrom ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, validFrom: event.target.value }))}
              />
              <Box display="flex" gap={2}>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outlined" onClick={() => setForm({ description: "", price: 0 })}>
                  Clear
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
        <Box>
          <Paper elevation={1}>
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                {vendorId === "all" ? "All Prices" : selectedVendor ? `${selectedVendor.name} Prices` : "Prices"}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Valid From</TableCell>
                    <TableCell align="right">Edit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>£{Number(item.price).toFixed(2)}</TableCell>
                      <TableCell>{item.validFrom ? item.validFrom.slice(0, 10) : "-"}</TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => setForm(item)}>
                          Edit
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

export default PricesPage;
