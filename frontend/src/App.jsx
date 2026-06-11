import Login from "./components/auth/login";
import Register from "./components/auth/register";
import Services from "./components/services";
import Header from "./components/header";
import Home from "./components/home";
import ServicesMain from "./components/servicesMain";
import SearchPage from "./components/servicesOsint";
import { GoogleOAuthProvider } from '@react-oauth/google';
import InstagramDataDisplay from "./components/pastData";
import DataAnalysisPage from "./components/analysis";
import AuthCheck from "./components/protectedRoute";
// import CursorFollower from "./components/cursor";
import { AuthProvider } from "./contexts/authContext";
import GoogleDriveFileExplorer from "./components/services/GoogleDrive"
import { useRoutes } from "react-router-dom";
import ProfilePage from "./components/profile";
import ChatbotAvatar from "./components/chatbot/chatbotAvatar"
import UserActivity from "./components/UserActivity";
import DemoCase from "./components/demo";
function App() {
  const routesArray = [
    {
      path: "*",
      element: <Login />,
    },
    {
      path: "/login",
      element: <Login />,
    },
    {
      path: "/register",
      element: <Register />,
    },
    {
      // Replay-mode demo: intentionally NOT behind AuthCheck so a recruiter can
      // run the synthetic pipeline with no login on a keyless public deploy.
      path: "/demo",
      element: <DemoCase />,
    },

    {
      path: "/services",
      element: <AuthCheck><Services /></AuthCheck>,
    },
    {
      path: "/home",
      element: <AuthCheck><Home /></AuthCheck>,
    },
    {
      path: "/servicesMain",
      element: <AuthCheck><ServicesMain /></AuthCheck>,
    },
    {
      path: "/osint",
      element: <AuthCheck><SearchPage /></AuthCheck>,
    },
    {
      path: "/pastData",
      element: <AuthCheck><InstagramDataDisplay /></AuthCheck>,
    },
    {
      path: "/profileAnalysis",
      element: <AuthCheck><DataAnalysisPage /></AuthCheck>,
    },
    {
      path: "/profilePage",
      element: <AuthCheck><ProfilePage /></AuthCheck>,
    },
    {
      path: "/google",
      element: <AuthCheck><GoogleDriveFileExplorer /></AuthCheck>,
    },
    {
      path: "/activity",
      element: <AuthCheck><UserActivity /></AuthCheck>,
    },
  ];
  let routesElement = useRoutes(routesArray);

  const googleClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
  if (!googleClientId) {
    // Explicit demo/replay mode: the public deploy ships without a Google OAuth
    // client so a recruiter can run the replay demo with no logins. Google
    // sign-in is disabled and we say so loudly — this is an intended alternative,
    // not a silent fallback.
    console.warn(
      "VITE_GOOGLE_OAUTH_CLIENT_ID is not set — Google sign-in is disabled (demo/replay mode).",
    );
  }

  const appBody = (
    <>
      <Header />
      {/* Full screen height minus header with flex column */}
      <div className="w-full flex-grow flex flex-col  bg-ink-900">
        {routesElement}
      </div>
      <ChatbotAvatar />
    </>
  );

  return (
    <>
      {/* <CursorFollower/> */}
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>{appBody}</GoogleOAuthProvider>
      ) : (
        appBody
      )}
    </>
  );
}

export default App;
