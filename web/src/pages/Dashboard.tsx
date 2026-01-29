import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";
import {
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography
} from "@mui/material";

const statsLabels = [
  { label: "Residents", key: "residents" },
  { label: "Visits (confirmed)", key: "visits" },
  { label: "Invoices", key: "invoices" }
];

const DashboardPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ residents: 0, visits: 0, invoices: 0 });
  const [recentVisits, setRecentVisits] = useState<any[]>([]);

  useEffect(() => {
    let canceled = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const [residents, visits, invoices] = await Promise.all([
          api.get("/carehq/residents"),
          api.get("/visits", { params: { status: "Confirmed", from: new Date().toISOString(), to: new Date().toISOString() } }),
          api.get("/invoices")
        ]);
        if (canceled) return;
        setStats({ residents: residents?.data?.length ?? 0, visits: visits?.data?.length ?? 0, invoices: invoices?.data?.length ?? 0 });
        setRecentVisits(visits?.data?.slice(0, 5) ?? []);
      } catch (error) {
        enqueueSnackbar("Dashboard data failed to load", { variant: "error" });
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    loadData();
    return () => {
      canceled = true;
    };
  }, [api, enqueueSnackbar]);

  return (
    <Stack spacing={3}>
      {loading && <LinearProgress />}
      <Stack direction="row" spacing={2} flexWrap="wrap">
        {statsLabels.map((stat) => (
          <Card key={stat.key} elevation={2} sx={{ flex: "1 1 240px" }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                {stat.label}
              </Typography>
              <Typography variant="h4">{stats[stat.key as keyof typeof stats]}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Card elevation={1}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Confirmed Visits
          </Typography>
          <List>
            {recentVisits.length === 0 && <Typography>No visits queued yet.</Typography>}
            {recentVisits.map((visit) => (
              <ListItem key={visit.id} divider>
                <ListItemText
                  primary={`${visit.careHome?.name ?? "Home"} ? ${visit.supplier?.name ?? "Supplier"}`}
                  secondary={`Scheduled ${new Date(visit.visitedAt).toLocaleString()}`}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default DashboardPage;



