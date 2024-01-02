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
import {
  ListItemText,
  TextField,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";

import { makeStyles } from "@mui/styles";

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
      const data = [
        { id: "1", institute: "1", year: 2103, subject: "bangla" },
        { id: "2", institute: "2", year: 2103, subject: "bangla" },
        { id: "3", institute: "3", year: 2103, subject: "bangla" },
        { id: "4", institute: "4", year: 2103, subject: "bangla" },
        { id: "5", institute: "5", year: 2103, subject: "bangla" },
        { id: "6", institute: "6", year: 2103, subject: "bangla" },
        { id: "7", institute: "7", year: 2103, subject: "bangla" },
        { id: "8", institute: "8", year: 2103, subject: "bangla" },
        { id: "9", institute: "9", year: 2103, subject: "bangla" },
        { id: "10", institute: "Dhaka", year: 2103, subject: "bangla" },
        { id: "12", institute: "Dhaka", year: 2103, subject: "bangla" },
        { id: "13", institute: "Dhaka", year: 2103, subject: "bangla" },
        { id: "14", institute: "Dhaka", year: 2103, subject: "bangla" },
        { id: "15", institute: "15", year: 2103, subject: "bangla" },
        { id: "16", institute: "Dhaka", year: 2103, subject: "bangla" },
        { id: "17", institute: "Dhaka", year: 2103, subject: "bangla" },
        { id: "18", institute: "Dhaka", year: 2103, subject: "bangla" },
        { id: "19", institute: "20", year: 2103, subject: "bangla" },
        { id: "20", institute: "Dhaka", year: 2103, subject: "bangla" },
      ];
      setInitialData(data);
      //setInitialData(resp?.data?.documents);
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

  const useStyles = makeStyles((theme) => ({
    roundedTextField: {
      "& .MuiOutlinedInput-root": {
        borderRadius: 25, // Adjust the border radius for rounder corners
        "& fieldset": {
          borderColor:
            theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.23)"
              : "rgba(0, 0, 0, 0.23)", // Adjusting for dark mode
        },
        "&:hover fieldset": {
          borderColor:
            theme.palette.mode === "dark" ? theme.palette.grey[500] : "black", // Border color on hover for dark mode
        },
        "&.Mui-focused fieldset": {
          borderColor:
            theme.palette.mode === "dark"
              ? theme.palette.primary.main
              : theme.palette.primary.main, // Border color when focused
        },
      },
    },
  }));

  const SearchComponent = ({ onSearchChange }) => {
    const classes = useStyles();

    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        console.log(e.target.value);
        onSearchChange(e.target.value);
      }
    };

    return (
      <TextField
        label="Search"
        variant="outlined"
        onKeyDown={handleKeyDown}
        className={classes.roundedTextField} // Apply custom styles
        // You can add more styling here if needed
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
    if (!initialData?.length) {
      return 1;
    }
    var len = Math.floor(initialData.length / 10);
    if (initialData.length % 10 !== 0) {
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
