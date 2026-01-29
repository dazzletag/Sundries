import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";
import {
  Paper,
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

  useEffect(() => {
    let active = true;
    api
      .get("/carehq/residents")
      .then((response) => {
        if (active) {
          setResidents(response.data ?? []);
        }
      })
      .catch(() => {
        enqueueSnackbar("Failed to load residents", { variant: "error" });
      });
    return () => {
      active = false;
    };
  }, [api, enqueueSnackbar]);

  return (
    <article>
      <Typography variant="h4" gutterBottom>
        Residents
      </Typography>
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
            {residents.map((resident) => (
              <TableRow key={resident.careHqRoomId ?? resident.id} hover>
                <TableCell>{resident.careHome?.name ?? "?"}</TableCell>
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



