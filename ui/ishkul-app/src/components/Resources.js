import * as React from "react";
import { DataGrid, GridToolbarQuickFilter } from "@mui/x-data-grid";
import { Box, Button, Pagination, Container } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { StyledBox } from "./ProfileComponents";
import DownloadIcon from "@mui/icons-material/Download";
import { getDocuments } from "../service/apiClient";
import { useAuth } from "./AuthContext";
import { Snackbar } from "@mui/material";
import Alert from "./Alert";
import { useState } from "react";

const columns = [
  { field: "institute", headerName: "Institute", width: 200 },
  { field: "year", headerName: "Year" },
  { field: "subject", headerName: "Subject" },
  {
    field: "action",
    headerName: "Action",
    sortable: false,
    renderCell: (params) => {
      const onClick = (e) => {
        console.log(params);
      };

      return (
        <Button onClick={onClick}>
          {" "}
          <DownloadIcon />
        </Button>
      );
    },
  },
];

export default function Resources() {
  const { email, loggedInToken } = useAuth();
  const [queryOptions, setQueryOptions] = React.useState({});
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const onFilterChange = React.useCallback(
    (filterModel) => {
      // Here you save the data you need from the filter model
      setQueryOptions({ filterModel: { ...filterModel } });
      async function fetchDocuments(options) {
        try {
          const resp = await getDocuments(email, loggedInToken, options);
          setRows(resp?.data?.documents);
        } catch (e) {
          setIsOpen(true);
          setMessage("Please log in first");
          console.log(e);
        }
      }
      fetchDocuments(queryOptions);
    },
    [setQueryOptions, queryOptions, email, loggedInToken]
  );

  const handleClose = () => {
    // setIsOpen(false);
  };

  function CustomToolbar() {
    return (
      <div style={{ textAlign: "center", padding: "8px" }}>
        <GridToolbarQuickFilter debounceMs={4} />
      </div>
    );
  }

  return (
    <Container maxWidth="sm" style={{ textAlign: "left" }}>
      <CssBaseline />
      <StyledBox>
        <Box sx={{ width: 1 }}>
          <DataGrid
            columns={columns}
            rows={rows}
            slots={{ toolbar: CustomToolbar }}
            onFilterModelChange={onFilterChange}
          />
        </Box>
        <Pagination
          count={10}
          page={rows}
          onChange={(event, val) => setPage(val)}
        />

        <Snackbar
          open={isOpen}
          autoHideDuration={10000}
          onClose={handleClose}
          severity="error"
        >
          <Alert onClose={handleClose} severity="info" sx={{ width: "100%" }}>
            {message}
          </Alert>
        </Snackbar>
      </StyledBox>
    </Container>
  );
}
