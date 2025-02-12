
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const AuthCheck = ({ children }) => {
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = () => {
            const storedUser = JSON.parse(localStorage.getItem('userInfo'));

            if (!storedUser || !storedUser.token) {
                localStorage.removeItem('userInfo'); // Clear invalid or missing user data
                navigate('/login');
                return;
            }

            try {
                const decoded = jwtDecode(storedUser.token); // Decode the token
                const currentTime = Date.now() / 1000; // Current time in seconds


                if (decoded.exp < currentTime) {
                    localStorage.removeItem('userInfo'); // Clear expired token
                    navigate('/login');
                }
            } catch (error) {

                localStorage.removeItem('userInfo'); // Clear invalid token
                navigate('/login');
            }
        };

        checkAuth();


        const interval = setInterval(checkAuth, 1000); // Check every second
        return () => clearInterval(interval); // Cleanup interval on unmount
    }, [navigate]);


    const storedUser = JSON.parse(localStorage.getItem('userInfo'));


    return storedUser ? children : null;
};

export default AuthCheck;