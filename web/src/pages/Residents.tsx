import { useEffect, useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";

const ResidentsPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [residents, setResidents] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [homeFilter, setHomeFilter] = useState("All");

  const homeOptions = useMemo(() => {
    const names = new Set<string>();
    residents.forEach((resident) => {
      if (resident?.careHomeName) names.add(resident.careHomeName);
    });
    return ["All", ...Array.from(names).sort((a, b) => a.localeCompare(b))];
  }, [residents]);

  const filteredResidents = useMemo(() => {
    if (homeFilter === "All") return residents;
    return residents.filter((resident) => resident.careHomeName === homeFilter);
  }, [homeFilter, residents]);

  useEffect(() => {
    let active = true;
    const loadResidents = async () => {
      try {
        const response = await api.get("/carehq/residents");
        if (active) {
          setResidents(response.data ?? []);
        }
      } catch {
        enqueueSnackbar("Failed to load residents", { variant: "error" });
      }
    };
    loadResidents();
    return () => {
      active = false;
    };
  }, [api, enqueueSnackbar]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post("/carehq/residents/sync");
      const response = await api.get("/carehq/residents");
      setResidents(response.data ?? []);
      enqueueSnackbar("Residents synced", { variant: "success" });
    } catch {
      enqueueSnackbar("Resident sync failed", { variant: "error" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <article>
      <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Residents</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="home-filter-label">Care Home</InputLabel>
            <Select
              labelId="home-filter-label"
              value={homeFilter}
              label="Care Home"
              onChange={(event) => setHomeFilter(String(event.target.value))}
            >
              {homeOptions.map((home) => (
                <MenuItem key={home} value={home}>
                  {home}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleSync} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync now"}
          </Button>
        </Box>
      </Box>
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Care Home</TableCell>
              <TableCell>Room Number</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Account Code</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredResidents.map((resident) => (
              <TableRow key={resident.careHqRoomId ?? resident.id} hover>
                <TableCell>{resident.careHomeName ?? "?"}</TableCell>
                <TableCell>{resident.roomNumber ?? "?"}</TableCell>
                <TableCell>{resident.fullName ?? "*VACANT*"}</TableCell>
                <TableCell>{resident.accountCode ?? "-"}</TableCell>
                <TableCell>{resident.isVacant ? "Vacant" : "Occupied"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </article>
  );
};

export default ResidentsPage;



