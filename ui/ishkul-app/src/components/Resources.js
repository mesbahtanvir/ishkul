import React, { useState, useEffect } from "react";
import {
  Pagination,
  List,
  ListItem,
  TextField,
  Paper,
  Typography,
  Card,
  Box,
  Link,
  useTheme,
  Snackbar,
  ListItemText,
  CardContent,
  Container,
  CssBaseline,
} from "@mui/material";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { styled } from "@mui/material/styles";
import { StyledBox } from "./ProfileComponents";
import { useAuth } from "./AuthContext";
import { getDocuments, getDocument } from "../service/apiClient";
import Alert from "./Alert";

const ParentComponent = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dataToShow, setDataToShow] = useState([]);
  const [initialData, setInitialData] = useState([]);
  const { email, loggedInToken } = useAuth();
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);

  const onSearchQueryChange = async (search) => {
    setSearchQuery(search);
    try {
      const resp = await getDocuments(email, loggedInToken, search);
      setInitialData(resp?.data?.documents || []);
      setCurrentPage(1);
    } catch (e) {
      setIsOpen(true);
      setMessage("Please log in first");
    }
  };

  useEffect(() => {
    const loadFirstTime = async () => {
      try {
        const resp = await getDocuments(email, loggedInToken, "");
        setInitialData(resp?.data?.documents || []);
        setCurrentPage(1);
      } catch (e) {
        setIsOpen(true);
        setMessage("Please log in first");
      }
    };
    loadFirstTime();
  }, [email, loggedInToken]);

  const handleClick = async ({ id }) => {
    if (selectedItemDetails && selectedItemDetails.id === id) {
      setSelectedItemDetails(null); // Hide details if the same item is clicked
    } else {
      try {
        const doc = await getDocument(email, loggedInToken, id);
        setSelectedItemDetails({
          id: doc?.data?.id,
          resourceUrl: doc?.data?.resource_url,
          institute: doc?.data?.institute,
          year: doc?.data?.year,
          tags: doc?.data?.tags || [],
        });
      } catch (error) {
        setIsOpen(true);
        setMessage("Please log in first");
      }
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

  const RoundedTextField = styled(TextField)(({ theme }) => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: 25,
      "& fieldset": {
        borderColor:
          theme.palette.mode === "dark"
            ? "rgba(255, 255, 255, 0.23)"
            : "rgba(0, 0, 0, 0.23)",
      },
      "&:hover fieldset": {
        borderColor:
          theme.palette.mode === "dark" ? theme.palette.grey[500] : "black",
      },
      "&.Mui-focused fieldset": {
        borderColor: theme.palette.primary.main,
      },
    },
  }));

  const SearchComponent = ({ onSearchChange }) => {
    const classes = RoundedTextField();
    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        onSearchChange(e.target.value);
      }
    };

    return (
      <TextField
        label="Search"
        variant="outlined"
        onKeyDown={handleKeyDown}
        className={classes.roundedTextField}
      />
    );
  };

  const DetailCard = ({ details }) => {
    const classes = RoundedTextField();
    return (
      <Card className={classes.card}>
        <CardContent>
          <Typography variant="body1">
            <Box component="span" fontWeight="fontWeightMedium">
              Institute:{" "}
            </Box>
            {details.institute}
          </Typography>
          <Typography variant="body1">
            <Box component="span" fontWeight="fontWeightMedium">
              Resource:{" "}
            </Box>
            <Link
              href={details.resourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={classes.resourceLink}
            >
              {details.resourceUrl}
            </Link>
          </Typography>
          <Typography variant="body1">
            <Box component="span" fontWeight="fontWeightMedium">
              ID:{" "}
            </Box>
            {details.id}
          </Typography>
          <Typography variant="body1">
            <Box component="span" fontWeight="fontWeightMedium">
              Year:{" "}
            </Box>
            {details.year}
          </Typography>
          <Typography variant="body1">
            <Box component="span" fontWeight="fontWeightMedium">
              Tags:{" "}
            </Box>
            {details.tags.map((tag, index) => (
              <Box
                component="span"
                key={index}
                style={{
                  marginRight: 8,
                  display: "inline-flex", // Changed from 'flex' to 'inline-flex'
                  alignItems: "center",
                }}
              >
                <LocalOfferIcon style={{ fontSize: "small", marginRight: 4 }} />
                {tag}
              </Box>
            ))}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  const ListComponent = ({ data }) => {
    const [hoveredItemId, setHoveredItemId] = useState(null);
    const theme = useTheme();

    const handleMouseEnter = (id) => {
      setHoveredItemId(id);
    };

    const handleMouseLeave = () => {
      setHoveredItemId(null);
    };

    const hoverBackgroundColor =
      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#f5f5f5";

    return (
      <Paper
        elevation={3}
        style={{ margin: "20px", padding: "10px", width: "80%" }}
      >
        <List>
          {data.map(({ id, institute, year }) => (
            <React.Fragment key={id}>
              <ListItem
                divider
                onMouseEnter={() => handleMouseEnter(id)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleClick({ id })}
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
                    </>
                  }
                />
              </ListItem>
              {selectedItemDetails && selectedItemDetails.id === id && (
                <DetailCard details={selectedItemDetails} />
              )}
            </React.Fragment>
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
          onClose={() => setIsOpen(false)}
          severity="error"
        >
          <Alert
            onClose={() => setIsOpen(false)}
            severity="info"
            sx={{ width: "100%" }}
          >
            {message}
          </Alert>
        </Snackbar>
      </StyledBox>
    </Container>
  );
};

export default ParentComponent;
