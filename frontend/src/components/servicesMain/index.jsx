import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, UserCheck, Clock } from "lucide-react";

const ServiceCard = ({ icon: Icon, title, description, buttonText, buttonLink }) => (
  <Card className="bg-gray-800 bg-opacity-70 backdrop-blur-sm border-gray-700 hover:border-blue-400 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex flex-col justify-between p-4">
    <CardHeader>
      <CardTitle className="flex items-center text-white">
        <Icon className="mr-2 h-6 w-6 text-blue-400" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col justify-between flex-grow">
      <p className="text-gray-300 mb-6">{description}</p>
      <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
        <Link to={buttonLink}>{buttonText}</Link>
      </Button>
    </CardContent>
  </Card>
);

const ServicesMain = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
      <div className="relative pt-10 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Gradient Backgrounds */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-800/20 via-transparent to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center mb-12">
            Choose Your{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
              Investigation Path
            </span>
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <ServiceCard
              icon={Database}
              title="OSINT Tools"
              description="Utilize Open Source Intelligence (OSINT) tools to gather and analyze publicly available information."
              buttonText="Discover OSINT Tools"
              buttonLink="/osint"
            />
            <ServiceCard
              icon={UserCheck}
              title="Profile Analysis"
              description="Analyze social media profiles with advanced tools. Gain insights into user activity, engagement, and follower growth."
              buttonText="Start Profile Analysis"
              buttonLink="/profileAnalysis"
            />
            <ServiceCard
              icon={Clock}
              title="Data Exploration"
              description="Explore user profiles and posts through comprehensive data collection. Gain a deeper understanding of user interactions and content trends."
              buttonText="Explore Past Data"
              buttonLink="/pastdata"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesMain;
