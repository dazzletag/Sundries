import type { ReactNode } from "react";
import { useMsal } from "@azure/msal-react";
import { NavLink } from "react-router-dom";
import { getApiScopes } from "../api/scopes";
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ReceiptIcon from "@mui/icons-material/Receipt";
import StorefrontIcon from "@mui/icons-material/Storefront";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import SettingsIcon from "@mui/icons-material/Settings";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";

const drawerWidth = 280;

const navItems = [
  { label: "Residents", path: "/residents", icon: <PeopleIcon /> },
  { label: "Consents", path: "/consents", icon: <FactCheckIcon /> },
  { label: "Vendors", path: "/vendors", icon: <StorefrontIcon /> },
  { label: "Prices", path: "/prices", icon: <LocalOfferIcon /> },
  { label: "Misc Expenses", path: "/misc-expenses", icon: <ShoppingCartIcon /> },
  { label: "Visits", path: "/visits", icon: <CalendarMonthIcon /> },
  { label: "Invoices", path: "/invoices", icon: <ReceiptIcon /> },
  { label: "Admin", path: "/admin", icon: <SettingsIcon /> }
];

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const scopes = getApiScopes();

  const handleLogin = () => {
    instance.loginRedirect({
      scopes,
      redirectUri: import.meta.env.VITE_AAD_REDIRECT_URI ?? window.location.origin
    });
  };

  const handleLogout = () => {
    instance.logoutRedirect();
  };

  return (
    <Box sx={{ display: "flex", "@media print": { display: "block" } }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, "@media print": { display: "none" } }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Sundries Portal
          </Typography>
          <Box flexGrow={1} />
          {account ? (
            <Button color="inherit" onClick={handleLogout}>
              Sign out
            </Button>
          ) : (
            <Button color="inherit" onClick={handleLogin}>
              Sign in
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
          "@media print": { display: "none" }
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
          <Typography variant="subtitle1">Sundries</Typography>
        </Toolbar>
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItem component={NavLink} to={item.path} disablePadding key={item.label} sx={{ color: "inherit" }}>
              <ListItemButton sx={{ pl: 3 }}>
                <ListItemIcon sx={{ color: "inherit" }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, ml: `${drawerWidth}px`, "@media print": { ml: 0, p: 0 } }}
      >
        <Toolbar sx={{ "@media print": { display: "none" } }} />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;



