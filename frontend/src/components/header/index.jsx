import React, { useState, useEffect, useCallback } from "react";
import { animateScroll, scroller } from "react-scroll";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, Database, Clock, UserCheck, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const checkUserAuth = useCallback(() => {
    const storedUserInfo = localStorage.getItem("userInfo");
    if (storedUserInfo) {
      setUser(JSON.parse(storedUserInfo));
    } else {
      setUser(null);
    }
  }, []);

  // Check auth on mount and storage events
  useEffect(() => {
    checkUserAuth();
    window.addEventListener("storage", checkUserAuth);
    return () => {
      window.removeEventListener("storage", checkUserAuth);
    };
  }, [checkUserAuth]);

  // Additional check on route changes
  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("userInfo");
    setUser(null);
    navigate("/");
  };

  const handleNavigation = (target) => {
    if (location.pathname === "/home") {
      scroller.scrollTo(target, {
        duration: 500,
        delay: 0,
        smooth: "easeInOutQuart",
        offset: -80,
      });
    } else {
      navigate("/home");
      setTimeout(() => {
        scroller.scrollTo(target, {
          duration: 500,
          delay: 0,
          smooth: "easeInOutQuart",
          offset: -80,
        });
      }, 200);
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-gray-900 bg-opacity-90 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600 hover:opacity-80 transition-opacity">
                tattletale
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link
                  to="profilePage"
                  className="text-sm font-medium text-gray-100 hover:text-white transition-colors relative group cursor-pointer"
                >
                  {user.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>

                <span
                  onClick={() => handleNavigation("features")}
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors relative group cursor-pointer"
                >
                  Features
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 group-hover:w-full"></span>
                </span>
                <span
                  onClick={() => handleNavigation("about")}
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors relative group cursor-pointer"
                >
                  About
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 group-hover:w-full"></span>
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span className="text-sm font-medium text-gray-300 hover:text-white transition-colors relative group cursor-pointer">
                      Services
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 group-hover:w-full"></span>
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-gray-800 border border-gray-700">
                    <DropdownMenuItem
                      className="text-gray-300 hover:text-white focus:text-white focus:bg-gray-700"
                      onClick={() => navigate("/services")}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      <span>Social Media Investigation</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-gray-300 hover:text-white focus:text-white focus:bg-gray-700"
                      onClick={() => navigate("/osint")}
                    >
                      <Database className="mr-2 h-4 w-4" />
                      <span>OSINT Tools</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem
                      className="text-gray-300 hover:text-white focus:text-white focus:bg-gray-700"
                      onClick={() => navigate("/pastData")}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      <span>Past Data</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-gray-300 hover:text-white focus:text-white focus:bg-gray-700"
                      onClick={() => navigate("/profileAnalysis")}
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      <span>Profile Analysis</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                  asChild
                >
                  <Link to="/login">Login</Link>
                </Button>
                <Button variant="outline" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white" asChild>
                  <Link to="/register">Register</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-300 hover:text-white focus:outline-none"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {menuOpen && (
          <div className="md:hidden mt-2 space-y-2 bg-gray-800 rounded-lg p-4">
            <Link
              to="/services"
              className="block text-sm text-gray-300 hover:text-white"
            >
              Social Media Investigation
            </Link>
            <Link to="/osint" className="block text-sm text-gray-300 hover:text-white">
              OSINT Tools
            </Link>
            <Link
              to="/pastData"
              className="block text-sm text-gray-300 hover:text-white"
            >
              Past Data
            </Link>
            <Link
              to="/profileAnalysis"
              className="block text-sm text-gray-300 hover:text-white"
            >
              Profile Analysis
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Header;