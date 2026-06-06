import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET as string;

export class AuthService {
  async register(email: string, password: string) {
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return {
        error: "User already exists",
        statusCode: 409,
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        error: "Invalid credentials",
        statusCode: 401,
      };
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return {
        error: "Invalid credentials",
        statusCode: 401,
      };
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return { token };
  }
}