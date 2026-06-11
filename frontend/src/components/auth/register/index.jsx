import  React ,{useState } from "react";
import {  Link, useNavigate } from "react-router-dom";
import {  useDispatch } from "react-redux";
import { setUserInfo } from "../../../features/userSlice";
import axios from "axios";

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    termsAccepted: false,
  });

  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [id]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.termsAccepted) {
      setErrorMessage("You must accept the terms and conditions");
      return;
    }

    setIsRegistering(true);
    setErrorMessage("");

    try {
      const { data } = await axios.post(
        "http://localhost:5001/api/users/signup",
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        },
        { headers: { "Content-Type": "application/json" } },
      );

      dispatch(setUserInfo(data));
      localStorage.setItem("userInfo", JSON.stringify(data));
      navigate("/home");
    } catch (error) {
      const message = error.response?.data?.message || "Registration failed. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <main className="w-full h-screen bg-ink-900 text-paper-50 flex justify-center items-center">
      <div className="w-96 bg-ink-820 text-paper-300 space-y-5 p-6 shadow-2xl border border-ink-700 rounded-xl">
        <h3 className="text-paper-50 text-xl font-serif font-semibold text-center">
          Create a New Account
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm text-mute font-bold font-mono">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full mt-2 px-3 py-2 text-paper-50 bg-ink-850 border border-ink-700 focus:ring-rust-500/40 focus:border-rust-500 outline-none rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm text-mute font-bold font-mono">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full mt-2 px-3 py-2 text-paper-50 bg-ink-850 border border-ink-700 focus:ring-rust-500/40 focus:border-rust-500 outline-none rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm text-mute font-bold font-mono">Password</label>
            <input
              id="password"
              type="password"
              value={formData.password}
              placeholder="Create a new password"
              onChange={handleChange}
              required
              className="w-full mt-2 px-3 py-2 text-paper-50 bg-ink-850 border border-ink-700 focus:ring-rust-500/40 focus:border-rust-500 outline-none rounded-lg"
            />
          </div>

          <div className="flex items-center">
            <input
              id="termsAccepted"
              type="checkbox"
              checked={formData.termsAccepted}
              onChange={handleChange}
              className="mr-2 accent-rust-500"
            />
            <label htmlFor="termsAccepted" className="text-sm text-mute">
              I accept the terms and conditions
            </label>
          </div>

          {errorMessage && (
            <span className="text-signal-err font-bold">{errorMessage}</span>
          )}

          <button
            type="submit"
            disabled={isRegistering}
            className={`w-full px-4 py-2 text-[#fdf3ee] font-medium rounded-lg ${
              isRegistering
                ? "bg-ink-740"
                : "bg-rust-500 hover:bg-rust-400"
            }`}
          >
            {isRegistering ? "Signing Up..." : "Sign Up"}
          </button>

          <div className="text-sm text-center">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-rust-300 hover:underline font-bold"
            >
              Continue
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
};

export default Register;
