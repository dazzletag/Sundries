import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";

type CareHome = {
  id: string;
  name: string;
};

type CareHqResident = {
  id: string;
  roomNumber?: string | null;
  fullName?: string | null;
};

type ResidentConsent = {
  id: string;
  careHomeId: string;
  roomNumber?: string | null;
  fullName?: string | null;
  currentResident: boolean;
  sundryConsentReceived: boolean;
  newspapersConsent: boolean;
  chiropodyConsent: boolean;
  hairdressersConsent: boolean;
  shopConsent: boolean;
  otherConsent: boolean;
  careHqResident?: CareHqResident | null;
};

const ConsentsPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [homes, setHomes] = useState<CareHome[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState("");
  const [consents, setConsents] = useState<ResidentConsent[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    const loadHomes = async () => {
      try {
        const response = await api.get("/me");
        const roles = response.data?.roles ?? [];
        const uniqueHomes = new Map<string, CareHome>();
        roles.forEach((role: { careHome?: CareHome }) => {
          if (role.careHome?.id) {
            uniqueHomes.set(role.careHome.id, role.careHome);
          }
        });
        const nextHomes = Array.from(uniqueHomes.values()).sort((a, b) => a.name.localeCompare(b.name));
        if (active) {
          setHomes(nextHomes);
          if (!selectedHomeId && nextHomes.length) {
            setSelectedHomeId(nextHomes[0].id);
          }
        }
      } catch {
        enqueueSnackbar("Failed to load care homes", { variant: "error" });
      }
    };
    loadHomes();
    return () => {
      active = false;
    };
  }, [api, enqueueSnackbar, selectedHomeId]);

  const visibleConsents = useMemo(() => {
    if (showInactive) return consents;
    return consents.filter((consent) => consent.currentResident);
  }, [consents, showInactive]);

  useEffect(() => {
    if (!selectedHomeId) return;
    let active = true;
    const loadConsents = async () => {
      setLoading(true);
      try {
        const response = await api.get("/resident-consents", { params: { careHomeId: selectedHomeId } });
        if (active) {
          setConsents(response.data ?? []);
        }
      } catch {
        enqueueSnackbar("Failed to load resident consents", { variant: "error" });
      } finally {
        if (active) setLoading(false);
      }
    };
    loadConsents();
    return () => {
      active = false;
    };
  }, [api, enqueueSnackbar, selectedHomeId]);

  const updateConsent = async (id: string, patch: Partial<ResidentConsent>) => {
    const prev = consents.find((item) => item.id === id);
    setConsents((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setSavingIds((items) => new Set(items).add(id));
    try {
      await api.patch(`/resident-consents/${id}`, patch);
    } catch {
      if (prev) {
        setConsents((items) => items.map((item) => (item.id === id ? prev : item)));
      }
      enqueueSnackbar("Failed to update consent", { variant: "error" });
    } finally {
      setSavingIds((items) => {
        const next = new Set(items);
        next.delete(id);
        return next;
      });
    }
  };

  const handleBootstrap = async () => {
    if (!selectedHomeId) return;
    setBootstrapping(true);
    try {
      await api.post("/resident-consents/bootstrap", { careHomeId: selectedHomeId });
      const response = await api.get("/resident-consents", { params: { careHomeId: selectedHomeId } });
      setConsents(response.data ?? []);
      enqueueSnackbar("Consent list refreshed", { variant: "success" });
    } catch {
      enqueueSnackbar("Consent bootstrap failed", { variant: "error" });
    } finally {
      setBootstrapping(false);
    }
  };

  return (
    <article>
      <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Consent Records</Typography>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="consent-home-label">Care Home</InputLabel>
            <Select
              labelId="consent-home-label"
              value={selectedHomeId}
              label="Care Home"
              onChange={(event) => setSelectedHomeId(String(event.target.value))}
            >
              {homes.map((home) => (
                <MenuItem key={home.id} value={home.id}>
                  {home.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />}
            label="Show inactive"
          />
          <Button variant="outlined" onClick={handleBootstrap} disabled={bootstrapping || !selectedHomeId}>
            {bootstrapping ? "Refreshing..." : "Refresh list"}
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Room</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="center">Sundry</TableCell>
              <TableCell align="center">Newspapers</TableCell>
              <TableCell align="center">Chiropody</TableCell>
              <TableCell align="center">Hairdressing</TableCell>
              <TableCell align="center">Shop</TableCell>
              <TableCell align="center">Other</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : (
              visibleConsents.map((consent) => (
                <TableRow key={consent.id} hover>
                  <TableCell>{consent.roomNumber ?? consent.careHqResident?.roomNumber ?? "-"}</TableCell>
                  <TableCell>{consent.fullName ?? consent.careHqResident?.fullName ?? "-"}</TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={consent.sundryConsentReceived}
                      disabled={savingIds.has(consent.id)}
                      onChange={(event) => updateConsent(consent.id, { sundryConsentReceived: event.target.checked })}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={consent.newspapersConsent}
                      disabled={savingIds.has(consent.id)}
                      onChange={(event) => updateConsent(consent.id, { newspapersConsent: event.target.checked })}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={consent.chiropodyConsent}
                      disabled={savingIds.has(consent.id)}
                      onChange={(event) => updateConsent(consent.id, { chiropodyConsent: event.target.checked })}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={consent.hairdressersConsent}
                      disabled={savingIds.has(consent.id)}
                      onChange={(event) => updateConsent(consent.id, { hairdressersConsent: event.target.checked })}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={consent.shopConsent}
                      disabled={savingIds.has(consent.id)}
                      onChange={(event) => updateConsent(consent.id, { shopConsent: event.target.checked })}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={consent.otherConsent}
                      disabled={savingIds.has(consent.id)}
                      onChange={(event) => updateConsent(consent.id, { otherConsent: event.target.checked })}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </article>
  );
};

export default ConsentsPage;
