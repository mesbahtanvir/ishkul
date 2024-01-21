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
  ListItemText,
  CardContent,
  Container,
  CssBaseline,
} from "@mui/material";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { StyledBox } from "../components/ProfileComponents";
import { getDocuments, getDocument } from "../services/apiClient";
import {
  useAppSelector,
  useSetCurrentPageHandler,
  useStoreDocumentsHandler,
  useStoreDocumentHandler,
} from "../hooks/hooks";
import { selectAccountState, selectResources } from "../store/selectors";
import { enqueueSnackbar } from "notistack";
import { DocumentNoUrl, GetDocumentResponse } from "../models/model";

const ResourcesPage = () => {
  const resources = useAppSelector(selectResources);
  const token = useAppSelector(selectAccountState).token;
  const storeDocuments = useStoreDocumentsHandler();
  const storeDocument = useStoreDocumentHandler();
  const setCurrentPage = useSetCurrentPageHandler();

  const emptyDocument = {
    id: "",
    resource_url: "",
    institute: "",
    year: 0,
    tags: [],
  };

  const onSearchQueryChange = async (search: string) => {
    try {
      const resp = await getDocuments({ token: token, query: search });
      storeDocuments(resp.documents || []);
    } catch (error) {
      enqueueSnackbar((error as Error).message, { variant: "error" });
    }
  };

  useEffect(() => {
    const loadFirstTime = async () => {
      try {
        const resp = await getDocuments({ token: token, query: "" });
        storeDocuments(resp.documents || []);
      } catch (error) {
        enqueueSnackbar((error as Error).message, { variant: "error" });
      }
    };
    loadFirstTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  interface handleClickProps {
    id: string;
  }
  const handleClick = async (props: handleClickProps) => {
    if (resources.current.document.id === props.id) {
      storeDocument(emptyDocument);
    } else {
      try {
        const resp = await getDocument({ token: token, id: props.id });
        storeDocument({
          id: resp.id,
          resource_url: resp.resource_url,
          institute: resp.institute,
          year: resp.year,
          tags: resp.tags || [],
        });
      } catch (error) {
        enqueueSnackbar((error as Error).message, { variant: "error" });
      }
    }
  };

  interface PaginationComponentProps {
    pageCount: number;
    onPageChange: (currentPage: number) => void;
  }
  const PaginationComponent = (props: PaginationComponentProps) => {
    return (
      <Pagination
        count={props.pageCount}
        onChange={(event, page) => props.onPageChange(page)}
      />
    );
  };

  interface SearchComponentProps {
    onSearchChange: (search: string) => void;
  }
  const SearchComponent = (props: SearchComponentProps) => {
    const handleKeyDown = (e: any) => {
      if (e.key === "Enter") {
        props.onSearchChange(e.target.value);
      }
    };

    return (
      <TextField label="Search" variant="outlined" onKeyDown={handleKeyDown} />
    );
  };

  interface DetailCardProps {
    document: GetDocumentResponse;
  }

  const DetailCard = (props: DetailCardProps) => {
    return (
      <Card>
        <CardContent>
          <Typography variant="body1">
            <Box component="span" fontWeight="fontWeightMedium">
              Institute:{" "}
            </Box>
            {props.document.institute}
          </Typography>
          <Typography variant="body1">
            <Box component="span" fontWeight="fontWeightMedium">
              Resource:{" "}
            </Box>
            <Link
              href={props.document.resource_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {props.document.resource_url}
            </Link>
          </Typography>
          <Typography variant="body1">
            <Box component="span" fontWeight="fontWeightMedium">
              ID:{" "}
            </Box>
            {props.document.id}
          </Typography>
          <Typography variant="body1">
            <Box component="span" fontWeight="fontWeightMedium">
              Year:{" "}
            </Box>
            {props.document.year}
          </Typography>
          <Typography variant="body1">
            <Box component="span" fontWeight="fontWeightMedium">
              Tags:{" "}
            </Box>
            {props.document.tags.map((tag, index) => (
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

  interface ListComponentProps {
    documents: DocumentNoUrl[];
  }
  const ListComponent = (props: ListComponentProps) => {
    const [hoveredItemId, setHoveredItemId] = useState<string>("");
    const theme = useTheme();

    const handleMouseEnter = (id: string) => {
      setHoveredItemId(id);
    };

    const handleMouseLeave = () => {
      setHoveredItemId("");
    };

    const hoverBackgroundColor =
      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#f5f5f5";

    return (
      <Paper
        elevation={3}
        style={{ margin: "20px", padding: "10px", width: "80%" }}
      >
        <List>
          {props.documents.map(({ id, institute, year }) => (
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
              {resources.current.document.id === id && (
                <DetailCard document={resources.current.document} />
              )}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    );
  };

  return (
    <Container component="main" maxWidth="lg">
      <CssBaseline />
      <StyledBox>
        <SearchComponent onSearchChange={onSearchQueryChange} />
        <ListComponent documents={resources.data.documentsInView} />
        <PaginationComponent
          pageCount={resources.data.pageCount}
          onPageChange={setCurrentPage}
        />
      </StyledBox>
    </Container>
  );
};

export default ResourcesPage;
