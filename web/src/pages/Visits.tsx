import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";
import {
  Avatar,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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

  useEffect(() => {
    let active = true;
    api
      .get("/visits")
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

  return (
    <article>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Visits</Typography>
        <Chip label="Draft + Confirmed" color="primary" />
      </Stack>

      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Care Home</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Date</TableCell>
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
                <TableCell>{visit.supplier?.name ?? "?"}</TableCell>
                <TableCell>{new Date(visit.visitedAt).toLocaleString()}</TableCell>
                <TableCell>
                  <VisitBadge status={visit.status} />
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



