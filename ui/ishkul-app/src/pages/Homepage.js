import ComingSoon from "../components/ComingSoon";
import { useAuth } from "../context/AuthContext";
import LoginFirst from "../components/LoginFirst";

export default function HomePage() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) {
    return <LoginFirst />;
  }
  return <ComingSoon />;
}
