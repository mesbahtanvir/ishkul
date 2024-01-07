import React, { useState } from "react";
import { TextField, Button, Grid, Paper, Chip, Container } from "@mui/material";
import { postDocuments } from "../service/apiClient";
import { useAuth } from "../context/AuthContext";
import { Snackbar } from "@mui/material";
import Alert from "./Alert";

const DocumentForm = () => {
  const { email, loggedInToken } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [inputTags, setInputTags] = useState([]);
  const [currentDocument, setCurrentDocument] = useState({
    resource_url: "",
    institute: "",
    year: new Date().getFullYear(),
    tags: [],
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

  const handleTagDelete = (tagToDelete) => () => {
    setInputTags((tags) => tags.filter((tag) => tag !== tagToDelete));
  };

  const handleTagInput = (e) => {
    if (e.key === "Enter" && e.target.value) {
      e.preventDefault(); // Prevent the default form submit action
      setInputTags([...inputTags, e.target.value]);
      e.target.value = "";
    }
  };

  const handleAddDocument = (e) => {
    e.preventDefault();
    if (isFormValid()) {
      setDocuments([
        ...documents,
        {
          ...currentDocument,
          tags: [
            ...inputTags,
            currentDocument.institute,
            currentDocument.year.toString(),
          ],
        },
      ]);

      setCurrentDocument({
        resource_url: "",
        institute: "",
        year: new Date().getFullYear(),
        tags: [],
      });

      setInputTags([]);
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
            <form>
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
              <TextField
                label="Tags"
                onKeyDown={handleTagInput}
                fullWidth
                margin="normal"
              />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {inputTags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={handleTagDelete(tag)}
                  />
                ))}
              </div>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                onClick={handleAddDocument}
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
