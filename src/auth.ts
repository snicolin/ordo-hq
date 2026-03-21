import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { isEnvAdmin } from "@/lib/admin";

const ALLOWED_DOMAINS = ["ordoschools.com", "ordo.com"];

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const email = profile?.email;
        if (!email) return false;
        const domain = email.split("@")[1];
        if (!ALLOWED_DOMAINS.includes(domain)) return false;

        await prisma.user.upsert({
          where: { email },
          update: {
            name: profile.name ?? null,
            image: (profile.picture as string | undefined) ?? null,
            lastLogin: new Date(),
          },
          create: {
            email,
            name: profile.name ?? null,
            image: (profile.picture as string | undefined) ?? null,
          },
        });

        return true;
      }
      return false;
    },
    async jwt({ token, trigger }) {
      if (!token.email) return token;

      if (trigger === "signIn" || trigger === "signUp" || token.isAdmin === undefined) {
        try {
          const [user, homepageMode] = await Promise.all([
            prisma.user.findUnique({
              where: { email: token.email },
              include: { group: { include: { defaultPage: true } } },
            }),
            prisma.setting.findUnique({ where: { key: "homepage_mode" } }),
          ]);

          token.isAdmin = isEnvAdmin(token.email) || (user?.isAdmin ?? false);

          const mode = homepageMode?.value ?? "global";
          if (mode === "groups" && user?.group?.defaultPage) {
            token.defaultPageSlug = user.group.defaultPage.slug;
          } else {
            token.defaultPageSlug = null;
          }
        } catch {
          token.isAdmin = isEnvAdmin(token.email);
          token.defaultPageSlug = null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).isAdmin = token.isAdmin ?? false;
        (session.user as Record<string, unknown>).defaultPageSlug = token.defaultPageSlug ?? null;
      }
      return session;
    },
  },
});
