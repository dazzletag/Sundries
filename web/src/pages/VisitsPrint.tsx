import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Button, Divider, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";
import logo from "../assets/bch-logo.svg";

type PrintPayload = {
  visitedAt: string;
  careHome: { id: string; name: string };
  vendor: { id: string; name: string; accountRef: string; tradeContact: string };
  consentField: string;
  residents: { id: string; roomNumber: string | null; fullName: string | null; accountCode: string | null }[];
  priceItems: { id: string; description: string; price: number; validFrom: string | null }[];
};

const VisitsPrintPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<PrintPayload | null>(null);

  const careHomeId = searchParams.get("careHomeId") ?? "";
  const vendorId = searchParams.get("vendorId") ?? "";
  const date = searchParams.get("date") ?? "";

  const formattedDate = useMemo(() => {
    if (!data?.visitedAt) return "";
    return new Date(data.visitedAt).toLocaleDateString();
  }, [data?.visitedAt]);

  useEffect(() => {
    if (!careHomeId || !vendorId) return;
    api
      .get("/visits/print", { params: { careHomeId, vendorId, date: date || undefined } })
      .then((response) => {
        setData(response.data ?? null);
      })
      .catch(() => {
        enqueueSnackbar("Failed to load print data", { variant: "error" });
      });
  }, [api, careHomeId, vendorId, date, enqueueSnackbar]);

  return (
    <article>
      <Box display="flex" justifyContent="flex-end" mb={2} sx={{ "@media print": { display: "none" } }}>
        <Button variant="contained" onClick={() => window.print()}>
          Print
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
                          <Typography key={item.id} variant="body2" sx={{ whiteSpace: "nowrap" }}>
                            □ {item.description} (£{Number(item.price).toFixed(2)})
                          </Typography>
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
