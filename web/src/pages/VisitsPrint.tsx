import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";
import logo from "../assets/bch-logo.svg";

type PrintPayload = {
  visitedAt: string;
  careHome: { id: string; name: string };
  vendor: { id: string; name: string; accountRef: string; tradeContact: string };
  consentField: string;
  status?: string;
  signedAt?: string | null;
  residents: {
    id: string;
    roomNumber: string | null;
    fullName: string | null;
    accountCode: string | null;
    careHqResidentId: string | null;
  }[];
  priceItems: { id: string; description: string; price: number; validFrom: string | null }[];
  selections?: { residentId: string; priceItemId: string }[];
};

const VisitsPrintPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<PrintPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  const visitId = searchParams.get("visitId") ?? "";
  const careHomeId = searchParams.get("careHomeId") ?? "";
  const vendorId = searchParams.get("vendorId") ?? "";
  const date = searchParams.get("date") ?? "";

  const formattedDate = useMemo(() => {
    if (!data?.visitedAt) return "";
    return new Date(data.visitedAt).toLocaleDateString();
  }, [data?.visitedAt]);

  useEffect(() => {
    if (!visitId && (!careHomeId || !vendorId)) return;
    const request = visitId
      ? api.get(`/visit-sheets/${visitId}`)
      : api.get("/visits/print", { params: { careHomeId, vendorId, date: date || undefined } });

    request
      .then((response) => {
        const payload = response.data ?? null;
        setData(payload);
        if (payload?.selections) {
          const next: Record<string, Set<string>> = {};
          payload.selections.forEach((item: { residentId: string; priceItemId: string }) => {
            if (!next[item.residentId]) next[item.residentId] = new Set();
            next[item.residentId].add(item.priceItemId);
          });
          setSelected(next);
        }
      })
      .catch(() => {
        enqueueSnackbar("Failed to load print data", { variant: "error" });
      });
  }, [api, careHomeId, vendorId, date, visitId, enqueueSnackbar]);

  const toggleSelection = (residentId: string, priceItemId: string) => {
    setSelected((prev) => {
      const existing = new Set(prev[residentId] ?? []);
      if (existing.has(priceItemId)) {
        existing.delete(priceItemId);
      } else {
        existing.add(priceItemId);
      }
      return { ...prev, [residentId]: existing };
    });
  };

  const handleSave = async () => {
    if (!data) return;
    const items = Object.entries(selected).flatMap(([residentConsentId, priceIds]) =>
      Array.from(priceIds).map((priceItemId) => ({
        residentConsentId,
        priceItemId
      }))
    );
    if (!items.length) {
      enqueueSnackbar("Select at least one service", { variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      await api.post("/sales/bulk", {
        careHomeId: data.careHome.id,
        vendorId: data.vendor.id,
        date: data.visitedAt,
        items
      });
      enqueueSnackbar("Visit items saved", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to save visit items", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleInvoice = async () => {
    if (!data) return;
    try {
      const response = await api.post(
        "/sales/invoice/preview",
        {
          careHomeId: data.careHome.id,
          vendorId: data.vendor.id,
          from: data.visitedAt.slice(0, 10),
          to: data.visitedAt.slice(0, 10)
        },
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      enqueueSnackbar("Failed to generate invoice", { variant: "error" });
    }
  };

  const handleSign = async () => {
    if (!data || !visitId) return;
    setSigning(true);
    try {
      await api.post(`/visit-sheets/${visitId}/sign`, { signed: true });
      enqueueSnackbar("Visit marked as signed", { variant: "success" });
      setData((prev) => (prev ? { ...prev, status: "Signed", signedAt: new Date().toISOString() } : prev));
    } catch {
      enqueueSnackbar("Failed to mark visit as signed", { variant: "error" });
    } finally {
      setSigning(false);
    }
  };

  return (
    <article>
      <Box display="flex" justifyContent="flex-end" gap={2} mb={2} sx={{ "@media print": { display: "none" } }}>
        <Button variant="outlined" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save visit items"}
        </Button>
        <Button variant="contained" onClick={handleInvoice}>
          Generate invoice
        </Button>
        <Button variant="outlined" onClick={handleSign} disabled={signing || data?.status === "Signed"}>
          {data?.status === "Signed" ? "Signed" : signing ? "Signing..." : "Mark signed"}
        </Button>
        <Button variant="contained" onClick={() => window.print()}>
          Print list
        </Button>
      </Box>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Box component="img" src={logo} alt="Bristol Care Homes" sx={{ height: 64 }} />
        <Box>
          <Typography variant="h4">Consent List</Typography>
          <Typography color="text.secondary">Bristol Care Homes</Typography>
        </Box>
      </Box>

      {data && (
        <Box display="flex" flexDirection="column" gap={2}>
          <Box>
            <Typography variant="subtitle1">
              Date: <strong>{formattedDate}</strong>
            </Typography>
            <Typography variant="subtitle1">
              Home: <strong>{data.careHome.name}</strong>
            </Typography>
            <Typography variant="subtitle1">
              Supplier: <strong>{data.vendor.name}</strong>
            </Typography>
            <Typography variant="subtitle1">
              Profession: <strong>{data.vendor.tradeContact || "Sundries"}</strong>
            </Typography>
            <Typography variant="subtitle1">
              Status: <strong>{data.status ?? "Draft"}</strong>
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" gutterBottom>
              Consenting Residents (room order)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Room</TableCell>
                  <TableCell>Resident</TableCell>
                  <TableCell>Account Code</TableCell>
                  <TableCell>Services (tick as used)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.residents.map((resident) => (
                  <TableRow key={resident.id}>
                    <TableCell>{resident.roomNumber ?? "-"}</TableCell>
                    <TableCell>{resident.fullName ?? "-"}</TableCell>
                    <TableCell>{resident.accountCode ?? "-"}</TableCell>
                    <TableCell>
                      <Box display="flex" flexWrap="wrap" gap={2}>
                        {data.priceItems.map((item) => (
                          <Box key={item.id} display="flex" alignItems="center" sx={{ whiteSpace: "nowrap" }}>
                            <Checkbox
                              size="small"
                              checked={selected[resident.id]?.has(item.id) ?? false}
                              onChange={() => toggleSelection(resident.id, item.id)}
                              disabled={!resident.careHqResidentId && !resident.accountCode}
                            />
                            <Typography variant="body2">
                              {item.description} (£{Number(item.price).toFixed(2)})
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}
    </article>
  );
};

export default VisitsPrintPage;
