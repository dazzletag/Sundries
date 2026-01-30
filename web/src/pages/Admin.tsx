import { useEffect, useMemo, useState } from "react";
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
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";

type CareHome = { id: string; name: string };
type UserHomeRole = { careHomeId: string; role: string; careHome: CareHome };
type AppUser = {
  id: string;
  upn?: string | null;
  oid: string;
  homeRoles: UserHomeRole[];
};

const AdminPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [homes, setHomes] = useState<CareHome[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedHomes, setSelectedHomes] = useState<Record<string, string[]>>({});
  const [selectedRole, setSelectedRole] = useState<Record<string, string>>({});

  const loadData = async () => {
    try {
      const [usersResponse, homesResponse] = await Promise.all([api.get("/admin/users"), api.get("/admin/homes")]);
      const loadedUsers = usersResponse.data ?? [];
      const loadedHomes = homesResponse.data ?? [];
      setUsers(loadedUsers);
      setHomes(loadedHomes);

      const homeSelections: Record<string, string[]> = {};
      const roleSelections: Record<string, string> = {};
      loadedUsers.forEach((user: AppUser) => {
        homeSelections[user.id] = user.homeRoles.map((role) => role.careHomeId);
        roleSelections[user.id] = user.homeRoles[0]?.role ?? "User";
      });
      setSelectedHomes(homeSelections);
      setSelectedRole(roleSelections);
    } catch {
      enqueueSnackbar("Failed to load admin data", { variant: "error" });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const homeOptions = useMemo(() => homes, [homes]);

  const handleSave = async (userId: string) => {
    setSaving(userId);
    try {
      const assignments = (selectedHomes[userId] ?? []).map((careHomeId) => ({
        careHomeId,
        role: selectedRole[userId] ?? "User"
      }));
      await api.patch(`/admin/users/${userId}/homes`, { assignments });
      await loadData();
      enqueueSnackbar("Assignments updated", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to update assignments", { variant: "error" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <article>
      <Box mb={2}>
        <Typography variant="h4">Admin Settings</Typography>
      </Box>

      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Homes</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.upn ?? user.oid}</TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 260 }}>
                    <InputLabel id={`homes-${user.id}`}>Homes</InputLabel>
                    <Select
                      labelId={`homes-${user.id}`}
                      multiple
                      value={selectedHomes[user.id] ?? []}
                      label="Homes"
                      onChange={(event) =>
                        setSelectedHomes((prev) => ({
                          ...prev,
                          [user.id]: event.target.value as string[]
                        }))
                      }
                      renderValue={(selected) =>
                        (selected as string[])
                          .map((id) => homeOptions.find((home) => home.id === id)?.name ?? id)
                          .join(", ")
                      }
                    >
                      {homeOptions.map((home) => (
                        <MenuItem key={home.id} value={home.id}>
                          {home.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel id={`role-${user.id}`}>Role</InputLabel>
                    <Select
                      labelId={`role-${user.id}`}
                      value={selectedRole[user.id] ?? "User"}
                      label="Role"
                      onChange={(event) =>
                        setSelectedRole((prev) => ({
                          ...prev,
                          [user.id]: String(event.target.value)
                        }))
                      }
                    >
                      <MenuItem value="User">User</MenuItem>
                      <MenuItem value="Admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell align="right">
                  <Button variant="contained" onClick={() => handleSave(user.id)} disabled={saving === user.id}>
                    {saving === user.id ? "Saving..." : "Save"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </article>
  );
};

export default AdminPage;
