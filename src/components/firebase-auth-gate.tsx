import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dataThunks, useAppDispatch } from "@/store";
import { createFirestoreDataModules } from "@/data/firestore";
import { resetToLocalDataModules, setDataModules } from "@/data";
import {
  firebaseAuth,
  firestoreDb,
  getFirebaseAnalytics,
} from "@/lib/firebase";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { useEffect, useState, type ReactNode } from "react";

export function FirebaseAuthGate({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCreateMode, setIsCreateMode] = useState(false);

  useEffect(() => {
    void getFirebaseAnalytics();

    void (async () => {
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);
      } catch {
        // Use Firebase default persistence if local persistence is unavailable.
      }

      void getRedirectResult(firebaseAuth).catch((error) => {
        setAuthError(
          error instanceof Error ? error.message : "Failed to complete sign in",
        );
      });
    })();

    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        resetToLocalDataModules();
        setIsLoading(false);
        return;
      }

      setDataModules(createFirestoreDataModules(firestoreDb, nextUser.uid));
      setIsLoading(false);

      void Promise.all([
        dispatch(dataThunks.projects.fetchAll()),
        dispatch(dataThunks.notes.fetchAll()),
        dispatch(dataThunks.tasks.fetchAll()),
        dispatch(dataThunks.meetings.fetchAll()),
        dispatch(dataThunks.companies.fetchAll()),
        dispatch(dataThunks.people.fetchAll()),
      ]);
    });

    return () => unsubscribe();
  }, [dispatch]);

  const loginWithGoogle = async () => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(firebaseAuth, provider);
      setIsLoading(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sign in";
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginWithEmailPassword = async () => {
    if (!email.trim() || !password) {
      setAuthError("Email and password are required.");
      return;
    }

    setAuthError(null);
    setIsSubmitting(true);

    try {
      if (isCreateMode) {
        await createUserWithEmailAndPassword(
          firebaseAuth,
          email.trim(),
          password,
        );
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      }

      setIsLoading(true);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Failed to sign in",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    await signOut(firebaseAuth);
    setUser(null);
  };

  if (isLoading) {
    return (
      <section className="flex h-svh items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-2 p-6">
            <h1 className="text-lg font-semibold">DailyFlow AI</h1>
            <p className="text-muted-foreground text-sm">
              Loading your workspace...
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="flex h-svh items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 p-6">
            <div>
              <h1 className="text-lg font-semibold">Sign in to DailyFlow AI</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                We use Firebase Auth and your user ID to scope your Firestore
                data.
              </p>
            </div>

            <div className="space-y-2">
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                type="email"
              />
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                type="password"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void loginWithEmailPassword();
                  }
                }}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => void loginWithEmailPassword()}
              disabled={isSubmitting}
            >
              {isCreateMode ? "Create account" : "Sign in"}
            </Button>

            <button
              type="button"
              className="text-primary text-xs hover:underline"
              onClick={() => setIsCreateMode((value) => !value)}
            >
              {isCreateMode
                ? "Already have an account? Sign in"
                : "Need an account? Create one"}
            </button>

            <div className="border-t pt-3">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => void loginWithGoogle()}
                disabled={isSubmitting}
              >
                Continue with Google
              </Button>
            </div>

            {authError ? (
              <p className="text-destructive text-xs">{authError}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <div className="h-svh">
      <div className="bg-muted/20 border-b px-4 py-2 text-xs">
        Signed in as {user.email ?? user.uid}
        <button
          type="button"
          onClick={() => void logout()}
          className="text-primary hover:underline ml-3"
        >
          Sign out
        </button>
      </div>
      <div className="h-[calc(100svh-33px)]">{children}</div>
    </div>
  );
}
