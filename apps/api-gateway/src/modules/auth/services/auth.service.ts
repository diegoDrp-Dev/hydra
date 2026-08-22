import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma.js";
import { env, requireJwtSecret } from "../../../config/env.js";

export class AuthService {
  async register(email: string, password: string) {
    email = email.trim().toLowerCase();
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

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, password: hashedPassword, role: "ADMIN" },
      });
      const tenant = await tx.tenant.create({
        data: { name: `${created.email} workspace`, slug: `personal-${created.id}` },
      });
      await tx.tenantMembership.create({
        data: { tenantId: tenant.id, userId: created.id, role: "ADMIN" },
      });
      return created;
    });

    return {
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async login(email: string, password: string) {
    email = email.trim().toLowerCase();
    let user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
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

    if (user.memberships.length === 0) {
      const legacyUser = user;
      await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { name: `${legacyUser.email} workspace`, slug: `personal-${legacyUser.id}` },
        });
        await tx.tenantMembership.create({
          data: { tenantId: tenant.id, userId: legacyUser.id, role: legacyUser.role },
        });
      });
      user = (await prisma.user.findUnique({
        where: { id: user.id },
        include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
      }))!;
    }

    const membership = user.memberships[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: membership.role, tenantId: membership.tenantId },
      requireJwtSecret(),
      { algorithm: "HS256", expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] }
    );

    return { token };
  }
}
