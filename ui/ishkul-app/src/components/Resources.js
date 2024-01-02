import TextField from "@mui/material/TextField";
import Pagination from "@mui/material/Pagination";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import React, { useState, useEffect } from "react";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import { StyledBox } from "./ProfileComponents";
import { useAuth } from "./AuthContext";
import { getDocuments } from "../service/apiClient";
import { Snackbar } from "@mui/material";
import Alert from "./Alert";
import { ListItemText, Paper, Typography, useTheme } from "@mui/material";

const ParentComponent = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dataToShow, setDataToShow] = useState([]);
  const [initialData, setInitialData] = useState([]);
  const { email, loggedInToken } = useAuth();
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const onSearchQueryChange = async (search) => {
    setSearchQuery(search);
    console.log(search);
    try {
      const resp = await getDocuments(email, loggedInToken, search);
      setInitialData(resp?.data?.documents);
      setCurrentPage(1);
    } catch (e) {
      setIsOpen(true);
      setMessage("Please log in first");
      console.log(e);
    }
  };

  const PaginationComponent = ({ pageCount, onPageChange }) => {
    return (
      <Pagination
        count={pageCount}
        onChange={(event, page) => onPageChange(page)}
      />
    );
  };

  const SearchComponent = ({ onSearchChange }) => {
    return (
      <TextField
        label="Search"
        variant="outlined"
        onChange={(e) => onSearchChange(e.target.value)}
      />
    );
  };

  const handleClose = () => {
    // setIsOpen(false);
  };

  const ListComponent = ({ data }) => {
    const [hoveredItemId, setHoveredItemId] = useState(null);

    // Correctly import and use the useTheme hook
    const theme = useTheme();

    const handleMouseEnter = (id) => {
      setHoveredItemId(id);
    };

    const handleMouseLeave = () => {
      setHoveredItemId(null);
    };

    // Define hover background color based on the theme mode
    const hoverBackgroundColor =
      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#f5f5f5";

    return (
      <Paper
        elevation={3}
        style={{ margin: "20px", padding: "10px", width: "80%" }}
      >
        <List>
          {data.map(({ id, institute, year, subject }) => (
            <ListItem
              key={id}
              divider
              onMouseEnter={() => handleMouseEnter(id)}
              onMouseLeave={handleMouseLeave}
              style={{
                backgroundColor:
                  hoveredItemId === id ? hoverBackgroundColor : "transparent",
                transition: "background-color 0.3s",
              }}
            >
              <ListItemText
                primary={
                  <Typography variant="h6" color="primary">
                    {institute}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography
                      component="span"
                      variant="body2"
                      color="textSecondary"
                    >
                      Year: {year}
                    </Typography>
                    <Typography
                      component="span"
                      variant="body2"
                      style={{ float: "right" }}
                    >
                      Subject: {subject}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  };

  const GetPageCount = ({ data }) => {
    if (!data?.length) {
      return 1;
    }
    var len = data.length / 10;
    if (data.length % 10 !== 0) {
      len = len + 1;
    }
    return len;
  };

  useEffect(() => {
    const startIndex = (currentPage - 1) * 10;
    const subArray = initialData.slice(startIndex, startIndex + 10);

    setDataToShow(subArray);
  }, [searchQuery, currentPage, initialData]);

  return (
    <Container component="main" maxWidth="lg">
      <CssBaseline />
      <StyledBox>
        <SearchComponent onSearchChange={onSearchQueryChange} />
        <ListComponent data={dataToShow} />
        <PaginationComponent
          pageCount={GetPageCount(initialData)}
          onPageChange={setCurrentPage}
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
};

export default ParentComponent;
