import * as React from "react";
import { DataGrid, GridToolbarQuickFilter } from "@mui/x-data-grid";
import { Box, Button } from "@mui/material";
import { Container } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { StyledBox } from "./ProfileComponents";
import DownloadIcon from "@mui/icons-material/Download";
import { getDocuments } from "../service/apiClient";
import { useAuth } from "./AuthContext";

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
        e.stopPropagation(); // don't select this row after clicking
        const api = params.api;
        const thisRow = {};
        api
          .getAllColumns()
          .filter((c) => c.field !== "__check__" && !!c)
          .forEach(
            (c) => (thisRow[c.field] = params.getValue(params.id, c.field))
          );

        alert(JSON.stringify(thisRow, null, 4));
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
  const { email, token } = useAuth();

  const [queryOptions, setQueryOptions] = React.useState({});

  const onFilterChange = React.useCallback((filterModel) => {
    // Here you save the data you need from the filter model
    setQueryOptions({ filterModel: { ...filterModel } });
  }, []);
  var rows = [];

  try {
    const resp = getDocuments(email, token, queryOptions);
    rows = resp?.data?.documents ?? [];
  } catch (e) {
    console.log(e);
  }

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
      </StyledBox>
    </Container>
  );
}
