import * as React from "react";
import { useState } from "react";
import { styled } from "@mui/material/styles";
import Button from "@mui/material/Button";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import Chip from "@mui/material/Chip";
import { Typography } from "@mui/material";
import { Snackbar } from "@mui/material";
import Alert from "./Alert";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

export default function InputFileUpload() {
  const [fileName, setFileName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
    }

    setIsOpen(true);
    setMessage("Stay Tuned! Coming Soon");
  };

  // Function to close the Snackbar
  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      <Button
        component="label"
        variant="contained"
        color="primary"
        startIcon={<CloudUploadIcon />}
      >
        Upload
        <VisuallyHiddenInput type="file" onChange={handleFileChange} />
      </Button>
      {fileName && (
        <Typography>
          <Chip
            label={fileName}
            color="secondary"
            variant="outlined"
            onDelete={() => setFileName("")}
          />
        </Typography>
      )}
      <Snackbar open={isOpen} autoHideDuration={6000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="info" sx={{ width: "100%" }}>
          {message}
        </Alert>
      </Snackbar>
    </div>
  );
}
