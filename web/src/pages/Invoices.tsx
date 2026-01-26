import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { useApi } from "../hooks/useApi";
import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";

const InvoicesPage = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    api
      .get("/invoices")
      .then((response) => setInvoices(response.data ?? []))
      .catch(() => enqueueSnackbar("Invoices could not be loaded", { variant: "error" }));
  }, [api, enqueueSnackbar]);

  const downloadPdf = async (id: string, invoiceNo: string) => {
    try {
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoiceNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      enqueueSnackbar("PDF download failed", { variant: "error" });
    }
  };

  return (
    <article>
      <Typography variant="h4" gutterBottom>
        Invoices
      </Typography>
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Care Home</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id} hover>
                <TableCell>{invoice.invoiceNo}</TableCell>
                <TableCell>{invoice.supplier?.name ?? "?"}</TableCell>
                <TableCell>{invoice.careHome?.name ?? "?"}</TableCell>
                <TableCell>?{Number(invoice.total).toFixed(2)}</TableCell>
                <TableCell>{invoice.status}</TableCell>
                <TableCell align="right">
                  <Button size="small" variant="outlined" onClick={() => downloadPdf(invoice.id, invoice.invoiceNo)}>
                    Download PDF
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

export default InvoicesPage;



