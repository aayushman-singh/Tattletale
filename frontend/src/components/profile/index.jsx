'use client'
import { SiInstagram, SiX, SiWhatsapp, SiTelegram } from "react-icons/si"
import React, { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Calendar, Edit, Mail, User, Save, X } from 'lucide-react'
import { toast, Toaster } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ProfilePage = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [searchHistoryLimit, setSearchHistoryLimit] = useState(5) // Default to showing 5 entries

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userInfoString = localStorage.getItem('userInfo')
        
        if (!userInfoString) {
          throw new Error("No user information found in local storage")
        }
        
        const userInfo = JSON.parse(userInfoString)

        if (!userInfo.token) {
          throw new Error("No authentication token found")
        }

        const response = await axios.get(`http://localhost:5001/api/users/`, {
          headers: {
            Authorization: `Bearer ${userInfo.token}`
          }
        })

        setUser(response.data)
        setEditName(response.data.name)
        setEditEmail(response.data.email)
      } catch (err) {
        setError(
          err.response?.data?.message || 
          err.message || 
          "Failed to fetch user data"
        )
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const handleUpdateUser = async () => {
    try {
      const userInfoString = localStorage.getItem('userInfo')
      const userInfo = JSON.parse(userInfoString)

      const response = await axios.put(
        'http://localhost:5001/api/users/userInfo', 
        { name: editName, email: editEmail },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`
          }
        }
      )

      // Update user in state and local storage
      setUser(response.data)
      userInfo.name = response.data.name
      userInfo.email = response.data.email
      localStorage.setItem('userInfo', JSON.stringify(userInfo))

      // Update edit state
      setIsEditing(false)
      
      // Show success toast
      toast.success("Profile updated successfully!", {
        description: `Name: ${response.data.name}, Email: ${response.data.email}`
      })
    } catch (err) {
      // Show error toast
      toast.error("Failed to update profile", {
        description: err.response?.data?.message || err.message
      })
    }
  }

  const platformData = {
    Instagram: {
      icon: <SiInstagram className="text-pink-500 h-6 w-6" />,
      color: "bg-gradient-to-r from-purple-500 to-pink-500",
      textColor: "text-white",
    },
    X: {
      icon: <SiX className="text-blue-500 h-6 w-6" />,
      color: "bg-blue-500",
      textColor: "text-white",
    },
    WhatsApp: {
      icon: <SiWhatsapp className="text-green-500 h-6 w-6" />,
      color: "bg-green-500",
      textColor: "text-white",
    },
    Telegram: {
      icon: <SiTelegram className="text-blue-400 h-6 w-6" />,
      color: "bg-blue-400",
      textColor: "text-white",
    },
  }
  
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900">
      <div className="text-center space-y-4">
        <Skeleton className="h-12 w-12 rounded-full bg-ink-780 mx-auto" />
        <Skeleton className="h-4 w-48 bg-ink-780 mx-auto" />
        <Skeleton className="h-4 w-32 bg-ink-780 mx-auto" />
      </div>
    </div>
  )

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 p-6">
      <Card className="max-w-md w-full bg-ink-820 text-paper-50 border-signal-err">
        <CardHeader>
          <CardTitle className="flex items-center font-serif text-signal-err">
            <AlertCircle className="mr-2" />
            Profile Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-paper-300 mb-4">{error}</p>
          <p className="text-sm text-mute">Please check your connection or try again later.</p>
        </CardContent>
      </Card>
    </div>
  )

  // Sort search history by timestamp in descending order
  const sortedSearchHistory = user.searchHistory?.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  // Slice the search history based on the selected limit
  const displayedSearchHistory = sortedSearchHistory?.slice(0, searchHistoryLimit)

  return (
    <div className="min-h-screen pt-20 bg-ink-900 text-paper-50 py-12 px-4 sm:px-6 lg:px-8">
      <Toaster richColors />
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Header */}
        <Card className="bg-ink-820 border-ink-700">
          <CardHeader className="pb-0">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20 border-2 border-rust-500">
                <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${user.name}`} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold font-serif tracking-tight text-paper-50">
                    {user.name}
                  </h1>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-paper-300 bg-ink-820 border-ink-700 hover:text-paper-50 hover:bg-ink-740"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                  </Button>
                </div>
                <p className="text-mute mt-1">Joined on {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 grid md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-2">
              <Mail className="text-rust-300" />
              <div>
                <p className="text-sm text-mute">Email Address</p>
                <p className="font-medium text-paper-50">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <User className="text-[#b39bd6]" />
              <div>
                <p className="text-sm text-mute">Account Type</p>
                <p className="font-medium text-paper-50">{user.isAdmin ? "Administrator" : "Standard User"}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="text-signal-ok" />
              <div>
                <p className="text-sm text-mute">Member Since</p>
                <p className="font-medium text-paper-50">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Modal */}
        {isEditing && (
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent className="sm:max-w-[425px] bg-ink-820 border-ink-700 shadow-2xl rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold font-serif text-paper-50">
                  Edit Profile
                </DialogTitle>
                <p className="text-sm text-mute">Update your personal information</p>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right text-paper-300 font-medium">Name</Label>
                  <Input
                    id="name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="col-span-3 bg-ink-850 border-ink-700 text-paper-50 focus:ring-rust-500/40 focus:border-rust-500 transition-all duration-300"
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right text-paper-300 font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="col-span-3 bg-ink-850 border-ink-700 text-paper-50 focus:ring-rust-500/40 focus:border-rust-500 transition-all duration-300"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="text-paper-300 hover:text-paper-50 hover:bg-ink-740 bg-ink-820 border-ink-700 transition-all duration-300"
                >
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button
                  onClick={handleUpdateUser}
                  className="bg-rust-500 hover:bg-rust-400 text-[#fdf3ee] shadow-md hover:shadow-xl transition-all duration-300"
                >
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

       {/* Search History */}
<Card className="bg-ink-820 border-ink-700">
  <CardHeader>
    <CardTitle className="text-2xl font-bold font-serif tracking-tight text-paper-50">
      Search History
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-center justify-between mb-4">
      <p className="text-mute">Show recent searches:</p>
      <Select
        value={searchHistoryLimit === Infinity ? "all" : searchHistoryLimit.toString()}
        onValueChange={(value) => {
          if (value === "all") {
            setSearchHistoryLimit(Infinity);
          } else {
            setSearchHistoryLimit(Number(value));
          }
        }}
      >
        <SelectTrigger className="w-[120px] bg-ink-850 border-ink-700 text-paper-50">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent className="bg-ink-820 text-paper-50 border-ink-700">
          <SelectItem value="5">5</SelectItem>
          <SelectItem value="10">10</SelectItem>
          <SelectItem value="15">15</SelectItem>
          <SelectItem value="20">20</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
    </div>
    {displayedSearchHistory && displayedSearchHistory.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-ink-850">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-mono font-semibold text-mute uppercase tracking-wider border-b border-ink-700">Platform</th>
              <th className="px-6 py-3 text-left text-xs font-mono font-semibold text-mute uppercase tracking-wider border-b border-ink-700">Username</th>
              <th className="px-6 py-3 text-left text-xs font-mono font-semibold text-mute uppercase tracking-wider border-b border-ink-700">Date</th>
            </tr>
          </thead>
          <tbody>
            {displayedSearchHistory.map((history, index) => (
              <tr key={index} className="border-b border-ink-700 hover:bg-ink-820 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Badge variant="outline" className="bg-signal-info/10 text-signal-info border-signal-info/40 font-mono">
                    {history.platform}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-paper-100">{history.identifier}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-mute">
                  {new Date(history.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="text-center py-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p className="text-lg font-semibold text-mute">No search history available</p>
        <p className="text-sm text-faint">Your recent searches will appear here</p>
      </div>
    )}
  </CardContent>
</Card>
      </div>
    </div>
  )
}

export default ProfilePage