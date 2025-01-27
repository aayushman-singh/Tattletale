import React, { useEffect } from "react"
import { Link } from "react-router-dom"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useLocation } from "react-router-dom"
import { scroller } from "react-scroll"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  BarChart3,
  Users,
  Target,
  PieChart,
  LineChart,
  Database,
  Shield,
  Globe,
  Zap,
  Lock,
  Search,
  FileText,
  Check,
  CheckCircle,
} from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

const FeatureCard = ({ icon: Icon, title, description }) => (
  <Card className="bg-gray-800 bg-opacity-50 backdrop-blur-sm border-gray-700 hover:border-gray-600 transition-all duration-300 group">
    <CardContent className="p-6">
      <div className="mb-4 p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 w-fit group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-white">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </CardContent>
  </Card>
)

const StatCard = ({ number, label }) => (
  <Card className="bg-gray-800 bg-opacity-50 backdrop-blur-sm border-gray-700">
    <CardContent className="p-6 text-center">
      <div className="text-3xl font-bold text-white mb-2">{number}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </CardContent>
  </Card>
)

const Home = () => {
  const location = useLocation()

  useEffect(() => {
    if (location.state?.scrollTo) {
      scroller.scrollTo(location.state.scrollTo, {
        smooth: true,
        duration: 500,
      })
    }
  }, [location])
  useEffect(() => {
    gsap.from(".hero-title", {
      opacity: 0,
      y: -50,
      duration: 1.5,
      ease: "power4.out",
    })

    gsap.utils.toArray(".fade-in").forEach((element) => {
      gsap.from(element, {
        opacity: 0,
        y: 50,
        duration: 1,
        scrollTrigger: {
          trigger: element,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
      })
    })
  }, [])

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Gradient Backgrounds */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-800/20 via-transparent to-transparent" />

      <div className="relative pt-16">
        {/* Hero Section */}
        <section className="min-h-[90vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left hero-title">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-white">
                Advanced analytics for{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
                  digital investigations
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0">
                Streamline your social media investigations with powerful analytics and automated documentation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                >
                  <Link to="/services">Start Investigation</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-gray-600 text-white bg-gray-800">
                  <Link to="/servicesMain">Explore Other Services</Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-gray-700 bg-gray-800 bg-opacity-50 backdrop-blur-sm">
                <img
                  src="/images/post/lp1.jpeg"
                  alt="Analytics Dashboard"
                  className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-300"
                />
              </div>

            </div>
          </div>
        </section>

        {/* Stats Section
        <section className="py-20 px-4 sm:px-6 lg:px-8 fade-in">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard number="10M+" label="Data Points Analyzed" />
            <StatCard number="50k+" label="Active Users" />
            <StatCard number="99.9%" label="Uptime" />
            <StatCard number="24/7" label="Support" />
          </div>
        </section> */}

        {/* Features Section */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 fade-in">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">Cutting-edge features</h2>
              <p className="text-xl text-gray-300">Powerful tools for advanced analytics and investigation</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={Shield}
                title="Advanced Security"
                description="Enterprise-grade security with end-to-end encryption"
              />
              <FeatureCard
                icon={Globe}
                title="Global Coverage"
                description="Monitor and analyze data from multiple regions"
              />
              <FeatureCard
                icon={Zap}
                title="Real-time Analytics"
                description="Get instant insights with real-time data processing"
              />
              <FeatureCard
                icon={Lock}
                title="Access Control"
                description="Granular permissions and role-based access"
              />
              <FeatureCard
                icon={Search}
                title="Smart Search"
                description="Advanced search with natural language processing"
              />
              <FeatureCard
                icon={FileText}
                title="Custom Reports"
                description="Generate detailed reports with custom templates"
              />
            </div>
          </div>
        </section>

        {/* About Section */}
        <section
          id="about"
          className="py-20 px-4 sm:px-6 lg:px-8 fade-in bg-gradient-to-b from-transparent to-gray-800"
        >
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">Why choose our platform?</h2>
                <p className="text-gray-300 mb-8">
                  Our platform combines advanced analytics with intuitive design to provide investigators with powerful
                  tools for digital forensics and social media analysis.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10">
                      <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-white">Enterprise Security</h3>
                      <p className="text-gray-400">
                        Bank-grade security with advanced encryption and compliance features.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10">
                      <Zap className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-white">Lightning Fast</h3>
                      <p className="text-gray-400">
                        Process millions of data points in seconds with our optimized engine.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-lg transform rotate-3"></div>
                <div className="relative rounded-lg overflow-hidden border border-gray-700">
                  <img src="/images/post/lp.jpeg" alt="Platform Features" className="w-full aspect-video object-cover" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section
        <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 fade-in">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">Simple, transparent pricing</h2>
              <p className="text-xl text-gray-300">Choose the perfect plan for your needs</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  name: "Starter",
                  price: "$49",
                  description: "Perfect for small teams",
                  features: ["Up to 5 users", "Basic analytics", "24/7 support", "API access"],
                },
                {
                  name: "Professional",
                  price: "$99",
                  description: "For growing businesses",
                  features: ["Up to 20 users", "Advanced analytics", "Priority support", "Custom reports"],
                },
                {
                  name: "Enterprise",
                  price: "Custom",
                  description: "For large organizations",
                  features: ["Unlimited users", "Custom solutions", "Dedicated support", "On-premise option"],
                },
              ].map((plan) => (
                <Card
                  key={plan.name}
                  className="bg-gray-800 bg-opacity-50 backdrop-blur-sm border-gray-700 hover:border-gray-600 transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-white">{plan.name}</h3>
                    <div className="text-3xl font-bold mb-2 text-white">{plan.price}</div>
                    <p className="text-gray-400 mb-6">{plan.description}</p>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center text-gray-300">
                          <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section> */}

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 fade-in">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
              Ready to start your investigation?
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                Use our powerful investigation tool
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8">Begin your digital investigation with our advanced platform.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                <Link to="/services">Start Investigation</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-gray-600 text-white bg-gray-800">
                <Link to="/servicesMain">Explore Other Services</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Home

