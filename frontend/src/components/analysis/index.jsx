"use client";

import React, { useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { 
  Instagram, 
  TrendingUp, 
  Users, 
  Eye, 
  Heart, 
  MessageCircle 
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function DataAnalysisPage() {
  const [username, setUsername] = useState("");
  const [chartData, setChartData] = useState(null);
  const [userDetails, setUserDetails] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3001/instagram/users");
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const apiData = await response.json();
  
      const userData = apiData.find(
        (user) => user.username === username.trim()
      );
  
      if (userData && userData.profile.length > 0) {
        const profile = userData.profile[0];
        const posts = userData.posts || [];
  
        // Calculate total likes, comments, and views
        const totalLikes = posts.reduce(
          (sum, post) => sum + (post.likesCount || 0),
          0
        );
        const totalComments = posts.reduce(
          (sum, post) => sum + (post.commentsCount || 0),
          0
        );
        const totalViews = posts.reduce(
          (sum, post) => sum + (post.videoViewCount || 0),
          0
        );
  
        // Chart Data
        const labels = [
          "Followers",
          "Following",
          "Total Likes",
          "Total Comments",
          "Total Views",
        ];
        const data = [
          profile.followersCount || 0,
          profile.followsCount || 0,
          totalLikes,
          totalComments,
          totalViews,
        ];
  
        setChartData({
          labels,
          datasets: [
            {
              label: `${userData.fullName || username}'s Data`,
              data,
              backgroundColor: [
                "rgba(192, 73, 46, 0.55)",
                "rgba(90, 134, 192, 0.55)",
                "rgba(217, 154, 50, 0.55)",
                "rgba(63, 154, 160, 0.55)",
                "rgba(155, 123, 192, 0.55)",
              ],
              borderColor: [
                "#c0492e",
                "#5a86c0",
                "#d99a32",
                "#3f9aa0",
                "#9b7bc0",
              ],
              borderWidth: 1,
            },
          ],
        });

        // Set user details
        setUserDetails({
          fullName: userData.fullName,
          username: userData.username,
          profilePic: profile.profilePicUrl,
          postsCount: posts.length,
          avgLikesPerPost: (totalLikes / posts.length).toFixed(2),
          avgCommentsPerPost: (totalComments / posts.length).toFixed(2)
        });
      } else {
        alert("User not found or data is incomplete.");
        setChartData(null);
        setUserDetails(null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert(`Error fetching data: ${error.message}`);
    }
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#c5bba8",
        }
      },
      title: {
        display: true,
        text: "User Instagram Performance Breakdown",
        color: "#f1e9da",
        font: {
          size: 18,
          family: "Spectral",
          weight: "600",
        }
      },
      tooltip: {
        backgroundColor: '#1a1611',
        titleColor: '#f1e9da',
        bodyColor: '#c5bba8',
        borderColor: 'rgba(230,214,186,.16)',
        borderWidth: 1,
      }
    },
    scales: {
      y: {
        ticks: {
          color: "#998f7e",
          beginAtZero: true,
        },
        grid: {
          color: "rgba(230, 214, 186, 0.06)",
          drawBorder: false,
        },
      },
      x: {
        ticks: { color: "#998f7e" },
        grid: {
          color: "rgba(230, 214, 186, 0.06)",
          drawBorder: false,
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-ink-900 text-paper-50 pt-20 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="bg-ink-820 border border-ink-700 rounded-2xl shadow-2xl p-8 mb-8">
          <div className="flex items-center justify-center mb-6">
            <Instagram className="w-12 h-12 text-pink-500 mr-4" />
            <h1 className="text-4xl font-bold font-serif text-paper-50">
              Instagram Analytics
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Instagram username"
                className="w-full px-4 py-3 bg-ink-850 border border-ink-700 rounded-lg focus:outline-none focus:ring-rust-500/40 focus:border-rust-500 text-paper-50 placeholder-faint transition-all duration-300"
              />
              <button
                type="submit"
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 rounded-md transition duration-300 ${
                  username.trim()
                    ? "bg-rust-500 hover:bg-rust-400 text-[#fdf3ee]"
                    : "bg-ink-740 text-faint cursor-not-allowed"
                }`}
                disabled={!username.trim()}
              >
                Analyze
              </button>
            </div>
          </form>
        </div>

        {chartData && userDetails && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-ink-820 border border-ink-700 rounded-2xl shadow-2xl p-6">
              <Bar options={options} data={chartData} />
            </div>

            <div className="bg-ink-820 border border-ink-700 rounded-2xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center space-x-4 border-b border-ink-700 pb-4">
                <img
                  src={userDetails.profilePic}
                  alt={userDetails.fullName}
                  className="w-20 h-20 rounded-full border-4 border-pink-500"
                />
                <div>
                  <h2 className="text-2xl font-bold font-serif text-paper-50">
                    {userDetails.fullName}
                  </h2>
                  <p className="text-mute font-mono">@{userDetails.username}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 bg-ink-820 border border-ink-700 p-3 rounded-lg">
                  <Users className="text-[#b39bd6]" />
                  <div>
                    <p className="text-sm text-mute">Total Posts</p>
                    <p className="font-bold font-mono">{userDetails.postsCount}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 bg-ink-820 border border-ink-700 p-3 rounded-lg">
                  <Heart className="text-pink-500" />
                  <div>
                    <p className="text-sm text-mute">Avg Likes/Post</p>
                    <p className="font-bold font-mono">{userDetails.avgLikesPerPost}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 bg-ink-820 border border-ink-700 p-3 rounded-lg">
                  <MessageCircle className="text-signal-info" />
                  <div>
                    <p className="text-sm text-mute">Avg Comments/Post</p>
                    <p className="font-bold font-mono">{userDetails.avgCommentsPerPost}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 bg-ink-820 border border-ink-700 p-3 rounded-lg">
                  <TrendingUp className="text-signal-ok" />
                  <div>
                    <p className="text-sm text-mute">Engagement Rate</p>
                    <p className="font-bold font-mono">
                      {((parseFloat(userDetails.avgLikesPerPost) / 100) * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}