import { Button, Grid, Paper } from "@mui/material";
import { postDocuments } from "../services/apiClient";
import {
  useAppSelector,
  useClearContributeDocumentHandler,
} from "../hooks/hooks";
import {
  selectAccountState,
  selectContributeResourcesData,
} from "../store/selectors";
import { enqueueSnackbar } from "notistack";

const StagedDoc = () => {
  const account = useAppSelector(selectAccountState);
  const data = useAppSelector(selectContributeResourcesData).documents;
  const clearDocument = useClearContributeDocumentHandler();

  const handleSubmitAll = async () => {
    try {
      await postDocuments({ token: account.token, documents: data });
      clearDocument();
    } catch (error) {
      enqueueSnackbar((error as Error).message, { variant: "error" });
    }
  };

  return (
    <Paper style={{ padding: 16 }}>
      <h3>Staged</h3>
      {data.map((doc, index) => (
        <div key={index} style={{ marginBottom: 16 }}>
          <strong>{index + 1}:</strong>{" "}
          <span>Institute: {doc.institute}; </span>
          <span>
            Resource URL:{" "}
            <a
              href={doc.resource_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {doc.resource_url}
            </a>
            ;{" "}
          </span>
          <span>Year: {doc.year}; </span>
          <span>Tags: {doc.tags.join(", ")}</span>
        </div>
      ))}
      <Grid container spacing={2}>
        <Grid item>
          <Button
            variant="contained"
            color="warning"
            onClick={clearDocument}
            disabled={data.length === 0}
          >
            Clear
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitAll}
            disabled={data.length === 0}
          >
            Submit
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default StagedDoc;
