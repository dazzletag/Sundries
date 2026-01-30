import { useEffect, useMemo, useState } from "react";
import { Box, Button, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";

type Vendor = {
  id: string;
  name: string;
  accountRef: string;
  defNomCode?: string | null;
  tradeContact?: string | null;
  address1?: string | null;
  address2?: string | null;
  address3?: string | null;
  address4?: string | null;
  address5?: string | null;
  isActive: boolean;
};

const emptyVendor: Partial<Vendor> = {
  name: "",
  accountRef: "",
  defNomCode: "",
  tradeContact: "",
  address1: "",
  address2: "",
  address3: "",
  address4: "",
  address5: "",
  isActive: true
};

const VendorsPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Vendor>>(emptyVendor);
  const [saving, setSaving] = useState(false);

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedId),
    [vendors, selectedId]
  );

  const loadVendors = async () => {
    try {
      const response = await api.get("/vendors");
      setVendors(response.data ?? []);
    } catch {
      enqueueSnackbar("Failed to load vendors", { variant: "error" });
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      setForm(selectedVendor);
    } else {
      setForm(emptyVendor);
    }
  }, [selectedVendor]);

  const handleSave = async () => {
    if (!form.name || !form.accountRef) {
      enqueueSnackbar("Name and account ref are required", { variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      if (selectedId) {
        await api.patch(`/vendors/${selectedId}`, form);
      } else {
        await api.post("/vendors", form);
      }
      await loadVendors();
      enqueueSnackbar("Vendor saved", { variant: "success" });
      setSelectedId(null);
    } catch {
      enqueueSnackbar("Failed to save vendor", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <article>
      <Typography variant="h4" mb={2}>
        Vendors
      </Typography>
      <Box
        display="grid"
        gap={2}
        sx={{ gridTemplateColumns: { xs: "1fr", md: "320px 1fr" } }}
      >
        <Box>
          <Paper elevation={1}>
            <Box p={2} display="flex" flexDirection="column" gap={1}>
              <Typography variant="h6">Vendor List</Typography>
              <TextField
                select
                label="Select vendor"
                value={selectedId ?? ""}
                onChange={(event) => setSelectedId(event.target.value || null)}
              >
                <MenuItem value="">New vendor</MenuItem>
                {vendors.map((vendor) => (
                  <MenuItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Paper>
        </Box>
        <Box>
          <Paper elevation={1}>
            <Box p={2} display="flex" flexDirection="column" gap={2}>
              <Typography variant="h6">Details</Typography>
              <Box
                display="grid"
                gap={2}
                sx={{ gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}
              >
                <Box>
                  <TextField
                    label="Name"
                    value={form.name ?? ""}
                    fullWidth
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </Box>
                <Box>
                  <TextField
                    label="Account Ref"
                    value={form.accountRef ?? ""}
                    fullWidth
                    onChange={(event) => setForm((prev) => ({ ...prev, accountRef: event.target.value }))}
                  />
                </Box>
                <Box>
                  <TextField
                    label="Def Nom Code"
                    value={form.defNomCode ?? ""}
                    fullWidth
                    onChange={(event) => setForm((prev) => ({ ...prev, defNomCode: event.target.value }))}
                  />
                </Box>
                <Box>
                  <TextField
                    label="Trade Contact"
                    value={form.tradeContact ?? ""}
                    fullWidth
                    onChange={(event) => setForm((prev) => ({ ...prev, tradeContact: event.target.value }))}
                  />
                </Box>
                {["address1", "address2", "address3", "address4", "address5"].map((field) => (
                  <Box key={field}>
                    <TextField
                      label={field.replace("address", "Address ")}
                      value={(form as any)[field] ?? ""}
                      fullWidth
                      onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                    />
                  </Box>
                ))}
              </Box>
              <Box display="flex" gap={2}>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save vendor"}
                </Button>
                <Button variant="outlined" onClick={() => setSelectedId(null)}>
                  Clear
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </article>
  );
};

export default VendorsPage;
