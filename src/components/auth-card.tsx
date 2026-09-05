"use client";
import { SignIn, SignUp } from "@clerk/nextjs";

const appearance={variables:{colorPrimary:"#1C4A44",colorBackground:"#E6DFCF",colorText:"#23201A",colorTextSecondary:"#6B6459",borderRadius:"2px",fontFamily:'"Hanken Grotesk", system-ui, sans-serif'},elements:{cardBox:"shadow-none",card:"shadow-none border border-[#23201a29]",headerTitle:"font-serif",formButtonPrimary:"rounded-sm auth-touch-target",socialButtonsBlockButton:"auth-touch-target",formFieldInput:"auth-touch-target",formFieldInputShowPasswordButton:"auth-icon-touch-target",footerActionLink:"text-[#1C4A44] auth-touch-target",formFieldAction:"auth-touch-target"}};

export function AuthCard({mode}:{mode:"sign-in"|"sign-up"}){
  if(!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)return <div className="auth-missing"><h1>Connect email sign-in.</h1><p>Add the Clerk publishable and secret keys to finish authentication.</p></div>;
  return mode==="sign-up"?<SignUp appearance={appearance} routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/onboarding" fallbackRedirectUrl="/onboarding"/>:<SignIn appearance={appearance} routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/journal" signUpFallbackRedirectUrl="/onboarding"/>;
}
