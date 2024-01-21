import React, { useState, ChangeEvent } from "react";
import { Button, Grid, Paper, Container } from "@mui/material";
import { enqueueSnackbar } from "notistack";
import Papa from "papaparse";
import { Document } from "./../models/model";
import StagedDoc from "./StagedDoc";
import { useStoreContributeDocumentHandler } from "../hooks/hooks";

interface CSVRow {
  resource_url: string;
  institute: string;
  year: number;
  tags: string; // comma seperated
}

const UploadDoc = () => {
  const storeContributeDocument = useStoreContributeDocumentHandler();
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const handleCsvInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCsvFile(e.target.files[0]);
    }
  };

  const readCsvFile = (): Promise<Papa.ParseResult<CSVRow>> => {
    return new Promise((resolve, reject) => {
      if (csvFile) {
        Papa.parse<CSVRow>(csvFile, {
          header: true,
          complete: resolve,
          error: reject,
          transformHeader: (header) => header.trim(), // Optional: Ensures headers match exactly
          skipEmptyLines: true,
          dynamicTyping: true, // Automatically converts strings to numbers, etc.
        });
      } else {
        reject(new Error("No file selected"));
      }
    });
  };

  const validateCsvData = (data: CSVRow[]) => {
    return data.every(
      (doc) =>
        typeof doc.institute === "string" &&
        typeof doc.resource_url === "string" &&
        typeof doc.year === "number" &&
        doc.tags &&
        Array.isArray(doc.tags.split(",")) // Assuming tags are comma-separated
    );
  };

  const handleLoadCSV = async () => {
    try {
      const result = await readCsvFile();
      if (!validateCsvData(result.data)) {
        throw new Error("CSV file is not valid");
      }
      // Process the data to the expected format
      const processedData: Document[] = result.data.map((doc) => ({
        institute: doc.institute,
        resource_url: doc.resource_url,
        tags: doc.tags.split(","),
        year: doc.year,
      }));
      storeContributeDocument(processedData);
    } catch (error) {
      if (error instanceof Error) {
        enqueueSnackbar(error.message, { variant: "error" });
      }
    }
  };

  return (
    <Container maxWidth="lg">
      <Grid container spacing={2}>
        {/* Uploader section */}
        <Grid item xs={12} md={6}>
          <Paper style={{ padding: 16 }}>
            <input type="file" accept=".csv" onChange={handleCsvInput} />
            {csvFile && <p>File selected: {csvFile.name}</p>}
            <Button
              variant="contained"
              color="secondary"
              onClick={handleLoadCSV}
              disabled={!csvFile}
            >
              Load
            </Button>
          </Paper>
        </Grid>

        {/* Processed CSV Data section */}
        <Grid item xs={12} md={6}>
          <StagedDoc />
        </Grid>
      </Grid>
    </Container>
  );
};

export default UploadDoc;
