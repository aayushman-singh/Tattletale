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

  return (
    <>
  
      {/* <CursorFollower/> */}
      <GoogleOAuthProvider clientId="218022995131-pkv99vvugfmhr73ua600lg44q362bbsj.apps.googleusercontent.com">
      <Header />
      {/* Full screen height minus header with flex column */}
      <div className="w-full flex-grow flex flex-col  bg-gray-700">
        {routesElement}
      </div>
      <ChatbotAvatar />
      </GoogleOAuthProvider>
  
    </>
  );
}

export default App;
