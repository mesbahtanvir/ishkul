import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

export default function Copyright(props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const linkStyle = {
    textDecoration: "none",
    color: "inherit",
    transition: "color 0.3s",
    "&:hover": {
      color: theme.palette.primary.main,
      textDecoration: "underline",
    },
  };

  return (
    <Typography
      variant={isMobile ? "body2" : "body1"}
      color="text.secondary"
      align="center"
      {...props}
    >
      {"Copyright © "}
      <Link style={linkStyle} href="https://www.ishkul.org/">
        ishkul.org
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}
