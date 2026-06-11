import React, { useState, useEffect } from "react";
import {
  InstagramLogo,
  WhatsappLogo,
  FacebookLogo,
  TelegramLogo,
  TwitterLogo,
  FileCsv,
  FilePdf,
  CloudArrowUp,
  Coins,
  X,
} from "phosphor-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import { CalendarIcon } from 'lucide-react';
import { FaGoogle, FaDiscord as DiscordLogo } from "react-icons/fa";
import { ChevronDown, ChevronUp } from "lucide-react";
import "./style.css";
import { SocialIcon } from 'react-social-icons';
import FacebookData from "./FacebookSection";
import RenderInstagramData from "../services/Instagram";
import FacebookDataViewer from "./FacebookSection";
import WhatsAppChatsViewer from "./WhatsAppSection";
import TelegramChatsDisplay from "./TelegramSection";
import XTweetsDisplay from "./TwitterSection"
import InstagramUsersViewer from "./InstagramSection"
import DiscordChatsDisplay from "./disocrdSection";
import MastodonPostsDisplay from "./mastodonSection";
import DriveDisplay from "./driveSection";
import GoogleDriveDisplay from "./driveSection";
import GoogleUsersDisplay from "./googleSection";
import GmailOutUsers from "./gmailout";
import GmailInUsers from "./gmailIn";
import GoogleDriveUsers from "./gdrive";
import TimelineDataViewer from "./timeline";
const PastData = () => {
  const [activeSection, setActiveSection] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
    const [gmailInData, setGmailInData] = useState(null);
    const [gmailOutData, setGmailOutData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [instagramData, setInstagramData] = useState(null);
  const [telegramData, setTelegramData] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [mastodonData, setMastodonData] = useState(null);
   const [googleData, setGoogleData] = useState(null);
    const [youtubeData, setYoutubeData] = useState(null);
  const [alert, setAlert] = useState({
    visible: false,
    message: "",
    type: "info",
  });
  const [whatsappData, setWhatsappData] = useState(null);
  const [xData, setXData] = useState(null);
  const [facebookData, setFacebookData] = useState(null);
    const [googleDriveData, setGoogleDriveData] = useState(null);
  const [email, setEmail] = useState("");

    const [discordData, setDiscordData] = useState(null);
 
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const handleSectionClick = (section) => {
    setActiveSection((prev) => (prev === section ? "" : section));
  };

  const showAlert = (message, type = "info") => {
    setAlert({ visible: true, message, type });
    setTimeout(
      () => setAlert({ visible: false, message: "", type: "info" }),
      3000,
    );
  };
  const handleShowDetails = async (platform, requiresPassword = false) => {
    const platformConfig = {
      whatsapp: 3004,
      facebook: 3002,
      x: 3003,
      telegram: 3005,
      instagram: 3001,
      drive: 3009,
      google: 3007,
      youtube: 3008,
      discord: 3011,
      timeline: 3010,
      mastodon: 3012
    };

    const port = platformConfig[platform];
    if (!port) {
      console.error("Unknown platform or port not configured");
      return;
    }

    // const username = document.getElementById(`${platform}Input`).value;
    // const password = requiresPassword
    //   ? document.getElementById(`${platform}Password`).value
    //   : null;

    setIsLoading(true);

    try {
      const queryParams =
        requiresPassword && password
          ? `?password=${encodeURIComponent(password)}`
          : "";

      const response = await fetch(
        `http://localhost:${port}/${platform}/users`,
      );

      if (!response.ok) {
        throw new Error("User not found");
      }

      const data = await response.json();

      // Dynamically set the state based on the platform
      switch (platform) {
        case "whatsapp":
          setWhatsappData(data);
          break;
        case "facebook":
          setFacebookData(data);
          break;
        case "x":
          setXData(data);
          break;
        case "telegram":
          setTelegramData(data);
          break;
        case "instagram":
          setInstagramData(data);
          break;
        case "gmail":
          setGmailData(data);
          break;
        case "drive":
          setGoogleDriveData(data);
          break;
        case "google":
          setGoogleData(data);
          break;
        case "youtube":
          setYoutubeData(data);
          break;
        case "discord":
          setDiscordData(data);
          break;
        case "timeline":
          setTimelineData(data);
          break;
        case "mastodon":
          setMastodonData(data);

        default:
          console.error("Unknown platform");
      }

      setShowDetails(true);
      showAlert("Data fetched successfully", "success");
    } catch (error) {
      showAlert("Failed to fetch data. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };



 const handleGmailShowDetails = async (type) => {
    const port = 3006; // Fixed port for Gmail
    const platformConfig = {
      gmailIn: "/gmailIn/users/",
      gmailOut: "/gmailOut/users/",
    };

    // Validate email input
    



    // Determine the correct endpoint based on the type
    const endpoint = platformConfig[type];
    if (!endpoint) {
      console.error(`Unsupported Gmail type: ${type}`);
      showAlert("Invalid Gmail type selected", "error");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `http://localhost:${port}${endpoint}`
      );

      if (!response.ok) {
        const errorDetails = await response.text();
        console.error(`Failed to fetch Gmail ${type} data:`, errorDetails);
        throw new Error(`Failed to fetch Gmail ${type} data: ${errorDetails}`);
      }

      const data = await response.json();

      // Update state based on the Gmail type
      if (type === "gmailIn") {
        setGmailInData(data);
      } else if (type === "gmailOut") {
        setGmailOutData(data);
      }

      setShowDetails(true);
      showAlert(`${type} data fetched successfully`, "success");
    } catch (error) {
      console.error(`Error fetching ${type} data:`, error);
      showAlert("Failed to fetch Gmail data. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-ink-900 text-paper-50 p-8 pt-20 relative">
      {alert.visible && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg bg-ink-820 transition-all duration-300 ease-in-out transform ${alert.visible
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0"
            } ${alert.type === "success"
              ? "text-signal-ok border-l-4 border-signal-ok"
              : alert.type === "error"
                ? "text-signal-err border-l-4 border-signal-err"
                : "text-signal-info border-l-4 border-signal-info"
            }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {alert.type === "success" && (
                  <svg
                    className="h-5 w-5 text-signal-ok"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {alert.type === "error" && (
                  <svg
                    className="h-5 w-5 text-signal-err"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {alert.type === "info" && (
                  <svg
                    className="h-5 w-5 text-signal-info"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <p className="ml-3 text-sm font-medium">{alert.message}</p>
            </div>
            <button
              onClick={() => setAlert({ ...alert, visible: false })}
              className="ml-auto -mx-1.5 -my-1.5 bg-ink-780 text-mute rounded-lg focus:ring-2 focus:ring-rust-500/40 p-1.5 hover:bg-ink-740 inline-flex h-8 w-8 items-center justify-center"
            >
              <span className="sr-only">Close</span>
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-ink-900 bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-ink-820 border border-ink-700 p-6 rounded-lg shadow-xl text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-rust-500 mx-auto mb-4"></div>
            <p className="text-paper-300 font-semibold font-mono">
              Processing your request...
            </p>
          </div>
        </div>
      )}
      <h1 className="text-3xl font-bold mb-8 text-center font-serif text-paper-50">
        Past Data
      </h1>

      <div className="flex justify-center space-x-8 mb-8">
        <button
          onClick={() => handleSectionClick("instagram")}
          className="flex items-center space-x-2"
        >
          <InstagramLogo
            size={32}
            color={activeSection === "instagram" ? "#E1306C" : "#ccc"}
          />
          <span
            className={`text-lg font-mono ${activeSection === "instagram" ? "text-pf-instagram" : "text-mute"}`}
          >
            Instagram
          </span>
        </button>

        <button
          onClick={() => handleSectionClick("facebook")}
          className="flex items-center space-x-2"
        >
          <FacebookLogo
            size={32}
            color={activeSection === "facebook" ? "#3b5998" : "#ccc"}
          />
          <span
            className={`text-lg font-mono ${activeSection === "facebook" ? "text-pf-facebook" : "text-mute"}`}
          >
            Facebook
          </span>
        </button>

        <button
          onClick={() => handleSectionClick("x")}
          className="flex items-center space-x-2"
        >
          <TwitterLogo
            size={32}
            color={activeSection === "x" ? "#1DA1F2" : "#ccc"}
          />
          <span
            className={`text-lg font-mono ${activeSection === "x" ? "text-pf-x" : "text-mute"}`}
          >
            X
          </span>
        </button>

        <button
          onClick={() => handleSectionClick("telegram")}
          className="flex items-center space-x-2"
        >
          <TelegramLogo
            size={32}
            color={activeSection === "telegram" ? "#0088cc" : "#ccc"}
          />
          <span
            className={`text-lg font-mono ${activeSection === "telegram" ? "text-pf-telegram" : "text-mute"}`}
          >
            Telegram
          </span>
        </button>
        <button
          onClick={() => handleSectionClick("google")}
          className="flex items-center space-x-2 mb-4 md:mb-0"
        >
          <FaGoogle
            size={32}
            color={activeSection === "google" ? "#4285F4" : "#ccc"}
          />
          <span
            className={`text-lg font-mono ${activeSection === "google" ? "text-pf-google" : "text-mute"
              }`}
          >
            Google
          </span>
        </button>

        <button
          onClick={() => handleSectionClick("whatsapp")}
          className="flex items-center space-x-2 mb-4 md:mb-0"
        >
          <WhatsappLogo
            size={32}
            color={activeSection === "whatsapp" ? "#25D366" : "#ccc"}
          />
          <span
            className={`text-lg font-mono ${activeSection === "whatsapp" ? "text-pf-whatsapp" : "text-mute"
              }`}
          >
            WhatsApp
          </span>
        </button>

        <button
          onClick={() => handleSectionClick("discord")}
          className="flex items-center space-x-2 mb-4 md:mb-0"
        >
          <DiscordLogo
            size={32}
            color={activeSection === "discord" ? "#5865F2" : "#ccc"}
          />
          <span
            className={`text-lg font-mono ${activeSection === "discord" ? "text-pf-discord" : "text-mute"
              }`}
          >
            Discord
          </span>
        </button>

        <button
          onClick={() => handleSectionClick("mastodon")}
          className="flex items-center space-x-2 mb-4 md:mb-0"
        >
          <SocialIcon
            network="mastodon"
            style={{ height: 32, width: 32 }}
            bgColor={activeSection === "mastodon" ? "#6364FF" : "#ccc"}
          />
          <span
            className={`text-lg font-mono ${activeSection === "mastodon" ? "text-pf-mastodon" : "text-mute"
              }`}
          >
            Mastodon
          </span>
        </button>

      </div>

      {activeSection === "instagram" && (
        <div className="bg-ink-820 border border-ink-700 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold font-serif text-pf-instagram">Instagram</h2>

          <div className="flex space-x-4 mt-4">

            <button
              onClick={() => handleShowDetails("instagram")}
              className="bg-rust-500 text-[#fdf3ee] px-6 py-2 rounded-md hover:bg-rust-400"
            >
              Show Details
            </button>
          </div>
          {showDetails && instagramData && (
            <div className="mt-8">
              <InstagramUsersViewer apiData={instagramData} />

              <div className="flex mt-12 space-x-2">
                <button className="flex items-center space-x-2 text-signal-ok border border-signal-ok/40 bg-signal-ok/10 px-4 py-2 rounded-md transition-colors">
                  <FileCsv size={24} weight="bold" />
                  <span className="text-md font-semibold">Export to CSV</span>
                </button>
                <button className="flex items-center space-x-2 text-signal-err border border-signal-err/40 bg-signal-err/10 px-4 py-2 rounded-md transition-colors">
                  <FilePdf size={24} weight="bold" />
                  <span className="text-md font-semibold">Export to PDF</span>
                </button>
                <button className="flex items-center space-x-2 text-signal-info border border-signal-info/40 bg-signal-info/10 px-4 py-2 rounded-md transition-colors">
                  <CloudArrowUp size={24} weight="bold" />
                  <span className="text-md font-semibold">Export to Drive</span>
                </button>
                <button className="flex items-center space-x-2 text-signal-warn border border-signal-warn/40 bg-signal-warn/10 px-4 py-2 rounded-md transition-colors">
                  <Coins size={24} weight="bold" />
                  <span className="text-md font-semibold">
                    Export to Blockchain
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === "whatsapp" && (
        <div className="bg-ink-820 border border-ink-700 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold font-serif text-pf-whatsapp">WhatsApp</h2>

          <div className="flex space-x-4 mt-4">


            <button
              onClick={() => handleShowDetails("whatsapp")}
              className=" bg-pf-whatsapp text-[#fdf3ee] px-6 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
              disabled={isLoading}
            >
              Show Details
            </button>
          </div>
          {whatsappData && showDetails && (
            <div className="mt-6">
              <h3 className="text-xl font-bold font-serif text-paper-50">User Chats</h3>
              <WhatsAppChatsViewer apiData={whatsappData} />

            </div>
          )}


        </div>
      )}
       
      {activeSection === "x" && (
        <div className="bg-ink-820 border border-ink-700 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold font-serif text-pf-x">
            X (formerly Twitter)
          </h2>



          <div className="flex space-x-4 mt-4">

            <button
              onClick={() => handleShowDetails("x")}
              className="bg-rust-500 text-[#fdf3ee] px-6 py-2 rounded-md hover:bg-rust-400"
            >
              Show Details
            </button>
          </div>
          {showDetails && (
            <div className="mt-6">
              <h3 className="text-xl font-bold font-serif text-pf-x mb-4">Tweets</h3>

              <XTweetsDisplay apiData={xData} />


            </div>
          )}


        </div>
      )}

      {activeSection === "telegram" && (
        <div className="bg-ink-820 border border-ink-700 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold font-serif text-pf-telegram">Telegram</h2>

          <div className="flex space-x-4 mt-4">

            <button
              onClick={() => handleShowDetails("telegram")}
              className="bg-rust-500 text-[#fdf3ee] px-6 py-2 rounded-md hover:bg-rust-400"
            >
              Show Details
            </button>
          </div>
          {telegramData && showDetails && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold font-serif text-rust-300 mb-4">
                Chats
              </h3>
              <TelegramChatsDisplay apiData={telegramData} />
            </div>
          )}
        </div>
      )}

      {activeSection === "facebook" && (
        <div className="bg-ink-820 border border-ink-700 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold font-serif text-pf-facebook">Facebook</h2>


          <div className="flex space-x-4 mt-4">

            <button
              onClick={() => handleShowDetails("facebook")}
              className="bg-rust-500 text-[#fdf3ee] px-6 py-2 rounded-md hover:bg-rust-400"
            >
              Show Details
            </button>
          </div>
          <div className="mt-8">
            {facebookData ? (
              <div>
                <FacebookDataViewer apiData={facebookData} />;
              </div>
            ) : (
              <p className="text-mute">No Facebook data loaded yet.</p>
            )}
          </div>
        </div>
      )}
       {activeSection === "google" && (
              <div className="bg-ink-820 border border-ink-700 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold font-serif text-pf-google mb-5 text-center">
                  Google Services
                </h2>
                <Tabs defaultValue="search" className="w-full">
                  <TabsList className="grid w-full grid-cols-5 mb-5">
                    <TabsTrigger
                      value="search"
                      className="text-paper-50 bg-ink-780 hover:bg-ink-740"
                    >
                      Google Search
                    </TabsTrigger>
                    <TabsTrigger
                      value="youtube"
                      className="text-paper-50 bg-ink-780 hover:bg-ink-740"
                    >
                      YouTube History
                    </TabsTrigger>
                    <TabsTrigger
                      value="gmail"
                      className="text-paper-50 bg-ink-780 hover:bg-ink-740"
                    >
                      Gmail
                    </TabsTrigger>
                    <TabsTrigger
                      value="drive"
                      className="text-paper-50 bg-ink-780 hover:bg-ink-740"
                    >
                      Google Drive
                    </TabsTrigger>
                    <TabsTrigger
                      value="timeline"
                      className="text-paper-50 bg-ink-780 hover:bg-ink-740"
                    >
                      Timeline
                    </TabsTrigger>
                  </TabsList>
      
      
      
                  {/* Google Search Tab */}
                  <TabsContent value="search" className="space-y-4">
                    <div className="bg-ink-820 border border-ink-700 p-6 rounded-lg shadow-lg">
                      <h2 className="text-2xl font-bold font-serif text-pf-google mb-4">Google Search</h2>
                      <div className="mt-4">
                        <label className="text-mute text-sm font-mono">Google Search Email</label>

                      </div>





                      <div className="flex space-x-4 mt-4">

                        <button
                          onClick={() => handleShowDetails("google")}
                          className="flex-1 bg-rust-500 text-[#fdf3ee] px-6 py-2 rounded-md hover:bg-rust-400 disabled:opacity-50"
                          disabled={isLoading}
                        >
                          Show Details
                        </button>
                      </div>

                      {googleData && showDetails && (
                        <div className="mt-6">
                          <h3 className="text-xl font-semibold font-serif text-rust-300 mb-4">Search History</h3>
                          <GoogleUsersDisplay apiData={googleData} />
                        </div>
                      )}
                    </div>
                  </TabsContent>
      
                  {/* YouTube History Tab */}
                  <TabsContent value="youtube" className="space-y-4">
                    <div className="bg-ink-820 border border-ink-700 p-6 rounded-lg shadow-lg">
                      <h2 className="text-2xl font-bold font-serif text-pf-google mb-4">YouTube History</h2>

                      <div className="mt-4">
                        <label className="text-mute text-sm font-mono">YouTube Email</label>

                      </div>





                      <div className="flex space-x-4 mt-4">
                        <button
                          onClick={() => handleShowDetails("youtube")}
                          className="flex-1 bg-rust-500 text-[#fdf3ee] px-6 py-2 rounded-md hover:bg-rust-400 disabled:opacity-50"
                          disabled={isLoading}
                        >
                          Show Details
                        </button>
                      </div>

                      {youtubeData && showDetails && (
                        <div className="mt-6">
                          <h3 className="text-xl font-semibold font-serif text-rust-300 mb-4">YouTube History</h3>
                          <GoogleInfo data={youtubeData} />
                        </div>
                      )}
                    </div>
                  </TabsContent>
      
                  {/* Gmail Tab */}
                  <TabsContent value="gmail">
                    <div className="bg-ink-820 border border-ink-700 p-6 rounded-lg shadow-lg">
                      <h2 className="text-2xl font-bold font-serif text-pf-google">Gmail</h2>
                      <div className="mt-4">



                      </div>
                      <div className="flex space-x-4 mt-4">
                        <button
                          onClick={() => handleGmailShowDetails("gmailIn")}
                          className="bg-rust-500 text-[#fdf3ee] px-6 py-2 rounded-md hover:bg-rust-400"
                        >
                          Show Gmail Inbox
                        </button>
                        <button
                          onClick={() => handleGmailShowDetails("gmailOut")}
                          className="bg-rust-500 text-[#fdf3ee] px-6 py-2 rounded-md hover:bg-rust-400"
                        >
                          Show Gmail Sent
                        </button>

                      </div>
                      {gmailInData && Array.isArray(gmailInData) && gmailInData.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-xl font-semibold font-serif text-rust-300 mb-4">Inbox Chats</h3>
                          <GmailInUsers users={gmailInData} />
                        </div>
                      )}
                    {gmailOutData && Array.isArray(gmailOutData) && gmailOutData.length > 0 && (
  <div className="mt-6">
    <h3 className="text-xl font-semibold font-serif text-rust-300 mb-4">Sent Chats</h3>
    <GmailOutUsers users={gmailOutData} />
  </div>
)}



                    </div>
                  </TabsContent>
                  <TabsContent value="drive">
                    <div className="bg-ink-820 border border-ink-700 p-6 rounded-lg shadow-lg">
                      <h2 className="text-2xl font-bold font-serif text-pf-google">Google Drive</h2>
                      <div className="mt-4">
                        <label className="text-mute text-sm font-mono">Email Address</label>
                      </div>
                      <div className="flex space-x-4 mt-4">
                        <button
                          onClick={() => {
                            console.log("Email:", email); // Debugging
                            handleShowDetails("drive");
                          }}
                          className="bg-rust-500 text-[#fdf3ee] px-6 py-2 rounded-md hover:bg-rust-400"
                        >
                          Show Details
                        </button>
                      </div>
                      {googleDriveData && showDetails && (
                        <div className="mt-6">
                          <h3 className="text-xl font-semibold font-serif text-rust-300 mb-4">Google Drive Data</h3>
                          <GoogleDriveUsers users={googleDriveData} />
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="timeline" className="space-y-4">
                    <div className="bg-ink-820 border border-ink-700 p-6 rounded-lg shadow-lg">
                      <h2 className="text-2xl font-bold font-serif text-pf-google mb-4">Timeline</h2>
                      <div className="mt-4">
                        <label className="text-mute text-sm font-mono">Google Account Email</label>
                      </div>



                      <div className="flex space-x-4 mt-4">
                        <button
                          onClick={() => handleShowDetails("timeline")}
                          className="flex-1 bg-rust-500 text-[#fdf3ee] px-6 py-2 rounded-md hover:bg-rust-400 disabled:opacity-50"
                          disabled={isLoading}
                        >
                          Show Details
                        </button>
                      </div>

           {timelineData && timelineData.length > 0 && showDetails && (
  <div className="mt-6 space-y-8">
    <h3 className="text-xl font-semibold font-serif text-rust-300 mb-4">Timeline Data</h3>
    {timelineData.map((user, index) => (
      <TimelineDataViewer key={index} timelineData={user} />
    ))}
  </div>
)}
                    </div>
                  </TabsContent>
      
                </Tabs>
              </div>
            )}
   {activeSection === "discord" && (
        <div className="bg-ink-820 border border-ink-700 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold font-serif text-pf-discord">Discord</h2>


          <div className="flex space-x-4 mt-4">

            <button
              onClick={() => handleShowDetails("discord")}
              className="bg-pf-discord text-[#fdf3ee] px-6 py-2 rounded-md hover:opacity-90"
            >
              Show Details
            </button>
          </div>
          <div className="mt-8">
            {discordData ? (
              <div>
                <DiscordChatsDisplay apiData={discordData} />
              </div>
            ) : (
              <p className="text-mute">No Discord data loaded yet.</p>
            )}
          </div>
        </div>
      )}
      {activeSection === "mastodon" && (
        <div className="bg-ink-820 border border-ink-700 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold font-serif text-pf-mastodon">Discord</h2>


          <div className="flex space-x-4 mt-4">

            <button
              onClick={() => handleShowDetails("mastodon")}
              className="bg-rust-500 text-[#fdf3ee] px-6 py-2 rounded-md hover:bg-rust-400"
            >
              Show Details
            </button>
          </div>
          <div className="mt-8">
            {mastodonData ? (
              <div>
                <MastodonPostsDisplay apiData={mastodonData} />
              </div>
            ) : (
              <p className="text-mute">No Mastodon data loaded yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PastData;
