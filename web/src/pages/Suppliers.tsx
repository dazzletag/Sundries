import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";
import { Card, CardContent, Stack, Typography } from "@mui/material";

const SuppliersPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    api
      .get("/suppliers")
      .then((response) => setSuppliers(response.data ?? []))
      .catch(() => enqueueSnackbar("Suppliers could not be loaded", { variant: "error" }));
  }, [api, enqueueSnackbar]);

  return (
    <article>
      <Typography variant="h4" gutterBottom>
        Suppliers
      </Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        {suppliers.map((supplier) => (
          <Card key={supplier.id} elevation={1} sx={{ flex: "1 1 320px" }}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="h6">{supplier.name}</Typography>
                <Typography variant="body2">{supplier.serviceType}</Typography>
                <Typography variant="body2">Rate: ?{Number(supplier.defaultRate).toFixed(2)}</Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </article>
  );
};

export default SuppliersPage;


