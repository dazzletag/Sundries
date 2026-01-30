import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";
import {
  Avatar,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";

const VisitBadge = ({ status }: { status: string }) => {
  const color = status === "Invoiced" ? "success" : status === "Confirmed" ? "info" : "warning";
  return <Chip label={status} color={color as "info" | "success" | "warning"} size="small" />;
};

const VisitsPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [visits, setVisits] = useState<any[]>([]);
  const [careHomes, setCareHomes] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [printCareHomeId, setPrintCareHomeId] = useState("");
  const [printVendorId, setPrintVendorId] = useState("");
  const [printDate, setPrintDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let active = true;
    api
      .get("/visit-sheets")
      .then((response) => {
        if (active) {
          setVisits(response.data ?? []);
        }
      })
      .catch(() => {
        enqueueSnackbar("Visits could not be loaded", { variant: "error" });
      });
    return () => {
      active = false;
    };
  }, [api, enqueueSnackbar]);

  useEffect(() => {
    api
      .get("/carehomes")
      .then((response) => {
        setCareHomes(response.data ?? []);
      })
      .catch(() => enqueueSnackbar("Care homes could not be loaded", { variant: "error" }));

    api
      .get("/vendors")
      .then((response) => {
        setVendors(response.data ?? []);
      })
      .catch(() => enqueueSnackbar("Vendors could not be loaded", { variant: "error" }));
  }, [api, enqueueSnackbar]);

  const handlePrint = () => {
    if (!printCareHomeId || !printVendorId) {
      enqueueSnackbar("Select a care home and supplier", { variant: "warning" });
      return;
    }
    api
      .post("/visit-sheets", {
        careHomeId: printCareHomeId,
        vendorId: printVendorId,
        visitDate: printDate
      })
      .then((response) => {
        const visitId = response.data?.id;
        if (!visitId) {
          enqueueSnackbar("Failed to create visit", { variant: "error" });
          return;
        }
        window.open(`/visits/print?visitId=${visitId}`, "_blank", "noopener,noreferrer");
      })
      .catch(() => enqueueSnackbar("Failed to create visit", { variant: "error" }));
  };

  return (
    <article>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Visits</Typography>
        <Chip label="Draft + Confirmed" color="primary" />
      </Stack>

      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
          <TextField
            select
            label="Care Home"
            value={printCareHomeId}
            onChange={(event) => setPrintCareHomeId(event.target.value)}
            sx={{ minWidth: 220 }}
          >
            {careHomes.map((home) => (
              <MenuItem key={home.id} value={home.id}>
                {home.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Supplier"
            value={printVendorId}
            onChange={(event) => setPrintVendorId(event.target.value)}
            sx={{ minWidth: 220 }}
          >
            {vendors.map((vendor) => (
              <MenuItem key={vendor.id} value={vendor.id}>
                {vendor.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Visit Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={printDate}
            onChange={(event) => setPrintDate(event.target.value)}
          />
          <Button variant="contained" onClick={handlePrint}>
            Print Consent List
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Care Home</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Open</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visits.map((visit) => (
              <TableRow key={visit.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 32, height: 32 }}>{(visit.careHome?.name ?? "?").substring(0, 1)}</Avatar>
                    <Typography>{visit.careHome?.name ?? "?"}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>{visit.vendor?.name ?? "?"}</TableCell>
                <TableCell>{new Date(visit.visitDate ?? visit.visitedAt).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => window.open(`/visits/print?visitId=${visit.id}`, "_blank")}>
                    Open
                  </Button>
                </TableCell>
                <TableCell>
                  <VisitBadge status={visit.status ?? "Draft"} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </article>
  );
};

export default VisitsPage;



