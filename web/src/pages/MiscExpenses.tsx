import { useEffect, useMemo, useState } from "react";
import { Box, Button, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";

type CareHome = { id: string; name: string };
type ResidentOption = {
  id: string;
  roomNumber: string | null;
  fullName: string | null;
  accountCode: string | null;
  careHqResidentId: string | null;
};

const MiscExpensesPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [careHomes, setCareHomes] = useState<CareHome[]>([]);
  const [careHomeId, setCareHomeId] = useState("");
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [residentId, setResidentId] = useState("");
  const [type, setType] = useState<"Escort" | "Other">("Escort");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/carehomes")
      .then((response) => {
        const homes = response.data ?? [];
        setCareHomes(homes);
        if (!careHomeId && homes.length) {
          setCareHomeId(homes[0].id);
        }
      })
      .catch(() => enqueueSnackbar("Failed to load care homes", { variant: "error" }));
  }, []);

  useEffect(() => {
    if (!careHomeId) return;
    api
      .get("/misc-expenses/residents", { params: { careHomeId } })
      .then((response) => setResidents(response.data ?? []))
      .catch(() => enqueueSnackbar("Failed to load residents", { variant: "error" }));
  }, [careHomeId, api, enqueueSnackbar]);

  const residentOptions = useMemo(
    () =>
      residents.map((resident) => ({
        ...resident,
        label: `${resident.roomNumber ?? ""} ${resident.fullName ?? ""} ${resident.accountCode ?? ""}`.trim()
      })),
    [residents]
  );

  const handleSave = async () => {
    if (!careHomeId || !residentId || !description || amount === "" || Number(amount) <= 0) {
      enqueueSnackbar("Complete all fields", { variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      const response = await api.post("/misc-expenses", {
        careHomeId,
        residentConsentId: residentId,
        type,
        date,
        description,
        amount: Number(amount)
      });
      const invoiceNo = response.data?.invoiceNo;
      if (invoiceNo) {
        const pdf = await api.get(`/invoices/${invoiceNo}/pdf`, { responseType: "blob" });
        const blob = new Blob([pdf.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
      }
      enqueueSnackbar("Expense saved", { variant: "success" });
      setDescription("");
      setAmount("");
    } catch {
      enqueueSnackbar("Failed to save expense", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <article>
      <Typography variant="h4" mb={2}>
        Escort & Other Expenses
      </Typography>
      <Paper elevation={1} sx={{ p: 2 }}>
        <Box display="grid" gap={2} sx={{ gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <TextField
            select
            label="Care Home"
            value={careHomeId}
            onChange={(event) => setCareHomeId(event.target.value)}
          >
            {careHomes.map((home) => (
              <MenuItem key={home.id} value={home.id}>
                {home.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Resident (Other consent)"
            value={residentId}
            onChange={(event) => setResidentId(event.target.value)}
          >
            {residentOptions.map((resident) => (
              <MenuItem key={resident.id} value={resident.id}>
                {resident.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Type" value={type} onChange={(event) => setType(event.target.value as "Escort" | "Other")}>
            <MenuItem value="Escort">Escort</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </TextField>
          <TextField
            label="Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <TextField
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            multiline
            minRows={2}
          />
          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value === "" ? "" : Number(event.target.value))}
          />
        </Box>
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save & Generate Invoice"}
          </Button>
        </Box>
      </Paper>
    </article>
  );
};

export default MiscExpensesPage;
