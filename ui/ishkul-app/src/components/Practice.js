import ComingSoon from "./ComingSoon";
import { useAuth } from "./AuthContext";
import LoginFirst from "./LoginFirst";

export default function HomePage() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) {
    return <LoginFirst />;
  }
  return <ComingSoon />;
}
