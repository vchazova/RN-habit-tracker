import { createContext, useContext } from "react";
import { ID } from "react-native-appwrite";
import { account } from "./appwrite";

type AuthContextType = {
  //   user: Models.User<Models.Preferences> | null;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  //   const user = null;
  const signUp = async (email: string, password: string) => {
    try {
      await account.create(ID.unique(), email, password);
      await signIn(email, password);
      return null;
    } catch (err) {
      if (err instanceof Error) {
        return err.message;
      }
      return "An error occured during sign up";
    }
  };
  const signIn = async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession(email, password);
      return null;
    } catch (err) {
      if (err instanceof Error) {
        return err.message;
      }
      return "An error occured during sign in";
    }
  };

  return (
    <AuthContext.Provider value={{ signIn, signUp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be inside of the AuthProvider");
  }

  return context;
}
