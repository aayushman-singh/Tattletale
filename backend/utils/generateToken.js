import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

export const generateToken = (id)=> {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not set. Copy .env.example to .env and set it.");
    }
    return jwt.sign({id} , secret , {
        expiresIn: "12d"
    })
}

export default generateToken

