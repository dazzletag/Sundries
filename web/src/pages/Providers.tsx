import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";
import {
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";

const ProvidersPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [clientList, setClientList] = useState<any | null>(null);

  useEffect(() => {
    api
      .get("/suppliers")
      .then((response) => {
        setSuppliers(response.data ?? []);
        if (response.data?.[0]?.id) {
          setSelectedSupplier(response.data[0].id);
        }
      })
      .catch(() => enqueueSnackbar("Unable to load suppliers", { variant: "error" }));
  }, [api, enqueueSnackbar]);

  useEffect(() => {
    if (!selectedSupplier) return;
    api
      .get(`/providers/${selectedSupplier}/client-list`)
      .then((response) => setClientList(response.data))
      .catch(() => enqueueSnackbar("Unable to load provider client list", { variant: "error" }));
  }, [api, enqueueSnackbar, selectedSupplier]);

  const handleChange = (event: SelectChangeEvent<string>) => {
    setSelectedSupplier(event.target.value as string);
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Provider Client Lists</Typography>
      <FormControl sx={{ minWidth: 240 }}>
        <InputLabel id="supplier-select-label">Supplier</InputLabel>
        <Select labelId="supplier-select-label" value={selectedSupplier ?? ""} label="Supplier" onChange={handleChange}>
          {suppliers.map((supplier) => (
            <MenuItem key={supplier.id} value={supplier.id}>
              {supplier.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {clientList ? (
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Home</TableCell>
                <TableCell>Resident</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Qty</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clientList.visits?.flatMap((visit: any) =>
                visit.items.map((item: any) => (
                  <TableRow key={item.visitItemId ?? item.id} hover>
                    <TableCell>{visit.careHome?.name ?? "?"}</TableCell>
                    <TableCell>{item.resident?.firstName}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{Number(item.qty).toFixed(1)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">Select a supplier to preview the client list.</Alert>
      )}
    </Stack>
  );
};

export default ProvidersPage;



