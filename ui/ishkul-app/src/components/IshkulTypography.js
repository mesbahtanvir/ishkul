import Typography from "@mui/material/Typography";
import { Link } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

export default function IshkulTypography() {
  const theme = useTheme();

  const linkStyle = {
    textDecoration: "none",
    color: theme.palette.mode === "light" ? "white" : "white",
    "&:hover": {
      textDecoration: "underline",
    },
  };

  return (
    <Link to="/" style={linkStyle}>
      <Typography
        variant="overline"
        noWrap
        component="div"
        sx={{
          fontWeight: "bold",
          fontSize: "1.2rem",
        }}
      >
        ISHKUL
      </Typography>
    </Link>
  );
}
