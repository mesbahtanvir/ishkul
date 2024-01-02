import React, { useState } from "react";
import {
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Grid,
  Paper,
  Container,
} from "@mui/material";
import { postDocuments } from "../service/apiClient";
import { useAuth } from "./AuthContext";
import { Snackbar } from "@mui/material";
import Alert from "./Alert";

const DocumentForm = () => {
  const { email, loggedInToken } = useAuth();
  const [documents, setDocuments] = useState([]);

  const [currentDocument, setCurrentDocument] = useState({
    resource_url: "",
    institute: "",
    year: new Date().getFullYear(),
    subject: "",
    uploader_uid: "",
  });

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setCurrentDocument({ ...currentDocument, [e.target.name]: e.target.value });
  };

  const isFormValid = () => {
    return (
      currentDocument.resource_url &&
      currentDocument.institute &&
      currentDocument.year
    );
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleAddDocument = (e) => {
    e.preventDefault();
    if (isFormValid()) {
      setDocuments([...documents, currentDocument]);
      setCurrentDocument({
        resource_url: "",
        institute: "",
        year: new Date().getFullYear(),
        subject: "",
        uploader_uid: "",
      });
    }
  };

  const handleSubmitAll = async () => {
    try {
      await postDocuments(email, loggedInToken, documents);
      setDocuments([]);
    } catch (error) {
      console.log(documents);
      setIsOpen(true);
      setMessage(error.toString());
      setDocuments([]);
      console.log(error);
    }
  };

  return (
    <Container maxWidth="lg">
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper style={{ padding: 16 }}>
            <form onSubmit={handleAddDocument}>
              <TextField
                label="Resource URL"
                name="resource_url"
                value={currentDocument.resource_url}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
              />
              <TextField
                label="Institute"
                name="institute"
                value={currentDocument.institute}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
              />
              <TextField
                label="Year"
                name="year"
                type="number"
                value={currentDocument.year}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Subject</InputLabel>
                <Select
                  label="Subject"
                  name="subject"
                  value={currentDocument.subject}
                  onChange={handleChange}
                >
                  {/* Replace with actual subject options */}
                  <MenuItem value="Bangla">Bangla</MenuItem>
                  <MenuItem value="English">English</MenuItem>
                  <MenuItem value="Mathematics">Mathematics</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Uploader UID"
                name="uploader_uid"
                value={currentDocument.uploader_uid}
                onChange={handleChange}
                fullWidth
                margin="normal"
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!isFormValid()}
              >
                Add Document
              </Button>
            </form>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper style={{ padding: 16, maxHeight: 400, overflow: "auto" }}>
            <h3>Added Documents</h3>
            <ul>
              {documents.map((doc, index) => (
                <li key={index}>
                  {doc.institute} - {doc.subject} ({doc.year})
                </li>
              ))}
            </ul>
          </Paper>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Button
              variant="contained"
              color="secondary"
              onClick={handleSubmitAll}
            >
              Submit All Documents
            </Button>
          </div>
        </Grid>
      </Grid>
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
    </Container>
  );
};

export default DocumentForm;
